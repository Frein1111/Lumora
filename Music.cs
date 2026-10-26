// Музыкальный режим: что сейчас играет (через панель медиа Windows)
// и спектр звука для эквалайзера (через WASAPI loopback — то, что слышно в колонках).

using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Windows.Foundation;
using Windows.Media.Control;
using Windows.Storage.Streams;

namespace LiveWall
{
    class TrackInfo
    {
        public bool Playing;
        public string Title = "", Artist = "", Cover;
        public byte[] CoverBytes;
        // Длительность и позиция в секундах (-1, если плеер их не сообщает); PolledAt — момент замера
        public double PosSec = -1, DurSec;
        public DateTime PolledAt = DateTime.Now;

        // Текущая позиция с учётом времени, прошедшего с последнего замера
        public double NowPos()
        {
            if (PosSec < 0) return -1;
            double p = PosSec + (Playing ? (DateTime.Now - PolledAt).TotalSeconds : 0);
            return DurSec > 0 ? Math.Min(p, DurSec) : p;
        }

        public string Key { get { return Title + "\n" + Artist; } }

        public string ToJson()
        {
            return "{\"type\":\"track\",\"title\":" + Json.Str(Title) + ",\"artist\":" + Json.Str(Artist) +
                   ",\"cover\":" + (Cover == null ? "null" : Json.Str(Cover)) + "}";
        }
    }

    static class Json
    {
        public static string Str(string s)
        {
            StringBuilder sb = new StringBuilder("\"");
            foreach (char c in s ?? "")
            {
                if (c == '"' || c == '\\') sb.Append('\\').Append(c);
                else if (c < ' ') sb.Append("\\u").Append(((int)c).ToString("x4"));
                else sb.Append(c);
            }
            return sb.Append('"').ToString();
        }
    }

    // ---------- Что сейчас играет ----------
    static class MediaWatcher
    {
        static GlobalSystemMediaTransportControlsSessionManager manager;
        static string coverKey;
        static string cover;
        static byte[] coverBytes;
        static GlobalSystemMediaTransportControlsSession lastSession;

        // Ожидание WinRT-операции без System.Runtime.WindowsRuntime
        static async Task<T> Await<T>(IAsyncOperation<T> op)
        {
            while (op.Status == AsyncStatus.Started) await Task.Delay(15);
            if (op.Status != AsyncStatus.Completed) throw new InvalidOperationException("WinRT: " + op.Status);
            return op.GetResults();
        }

        // Перемотка на заданную секунду (если плеер это умеет)
        public static async Task<bool> Seek(double seconds)
        {
            try
            {
                GlobalSystemMediaTransportControlsSession s = lastSession;
                if (s == null) return false;
                return await Await(s.TryChangePlaybackPositionAsync((long)(seconds * 10000000)));
            }
            catch { return false; }
        }

        // any=true: берём текущую сессию даже на паузе (для виджета)
        public static async Task<TrackInfo> Poll(bool any = false)
        {
            if (manager == null)
                manager = await Await(GlobalSystemMediaTransportControlsSessionManager.RequestAsync());

            TrackInfo info = new TrackInfo();
            GlobalSystemMediaTransportControlsSession session = null;
            foreach (GlobalSystemMediaTransportControlsSession s in manager.GetSessions())
            {
                GlobalSystemMediaTransportControlsSessionPlaybackInfo playback = s.GetPlaybackInfo();
                if (playback != null && playback.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
                {
                    session = s;
                    break;
                }
            }
            if (session == null && any) session = manager.GetCurrentSession();
            if (session == null) return info;

            lastSession = session;
            GlobalSystemMediaTransportControlsSessionPlaybackInfo pb = session.GetPlaybackInfo();
            info.Playing = !any || (pb != null && pb.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing);
            GlobalSystemMediaTransportControlsSessionMediaProperties props = await Await(session.TryGetMediaPropertiesAsync());
            info.Title = props.Title ?? "";
            info.Artist = props.Artist ?? "";

            // Обложку читаем заново только при смене трека (или если её ещё не было)
            if (info.Key != coverKey || cover == null)
            {
                coverKey = info.Key;
                cover = null; coverBytes = null;
                if (props.Thumbnail != null)
                {
                    try
                    {
                        IRandomAccessStreamWithContentType stream = await Await(props.Thumbnail.OpenReadAsync());
                        using (DataReader reader = new DataReader(stream.GetInputStreamAt(0)))
                        {
                            uint size = (uint)stream.Size;
                            await Await(reader.LoadAsync(size));
                            byte[] bytes = new byte[size];
                            reader.ReadBytes(bytes);
                            string type = string.IsNullOrEmpty(stream.ContentType) ? "image/png" : stream.ContentType;
                            cover = "data:" + type + ";base64," + Convert.ToBase64String(bytes);
                            coverBytes = bytes;
                        }
                        stream.Dispose();
                    }
                    catch { }
                }
            }
            // Длительность и позиция (нужны виджету и Discord)
            try
            {
                GlobalSystemMediaTransportControlsSessionTimelineProperties tl = session.GetTimelineProperties();
                if (tl != null)
                {
                    double dur = (tl.EndTime - tl.StartTime).TotalSeconds;
                    if (dur > 1)
                    {
                        double pos = (tl.Position - tl.StartTime).TotalSeconds;
                        if (info.Playing) pos += (DateTimeOffset.Now - tl.LastUpdatedTime).TotalSeconds;
                        info.DurSec = dur;
                        info.PosSec = Math.Max(0, Math.Min(dur, pos));
                    }
                }
            }
            catch { }
            info.PolledAt = DateTime.Now;
            info.Cover = cover; info.CoverBytes = coverBytes;
            return info;
        }
    }

    // ---------- Спектр звука ----------
    class AudioAnalyzer : IDisposable
    {
        public const int Bands = 64;
        const int FftSize = 2048;

        readonly Thread thread;
        volatile bool running = true;

        // Вызывается ~30 раз в секунду из фонового потока
        public event Action<float[]> Spectrum;

        public AudioAnalyzer()
        {
            thread = new Thread(Run);
            thread.IsBackground = true;
            thread.Start();
        }

        public void Dispose()
        {
            running = false;
        }

        void Run()
        {
            while (running)
            {
                try { Capture(); }
                catch { Thread.Sleep(2000); } // нет устройства или оно сменилось — пробуем снова
            }
        }

        void Capture()
        {
            IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
            IMMDevice device;
            Check(enumerator.GetDefaultAudioEndpoint(0, 1, out device)); // eRender, eMultimedia
            string deviceId;
            Check(device.GetId(out deviceId));

            Guid audioClientId = typeof(IAudioClient).GUID;
            object o;
            Check(device.Activate(ref audioClientId, 23, IntPtr.Zero, out o));
            IAudioClient client = (IAudioClient)o;

            IntPtr formatPtr;
            Check(client.GetMixFormat(out formatPtr));
            WaveFormat format = (WaveFormat)Marshal.PtrToStructure(formatPtr, typeof(WaveFormat));
            Check(client.Initialize(0, 0x00020000, 10000000, 0, formatPtr, IntPtr.Zero)); // shared, LOOPBACK, буфер 1 с

            Guid captureId = typeof(IAudioCaptureClient).GUID;
            object co;
            Check(client.GetService(ref captureId, out co));
            IAudioCaptureClient capture = (IAudioCaptureClient)co;
            Check(client.Start());

            int channels = format.Channels;
            bool isFloat = format.BitsPerSample == 32;
            float[] ring = new float[FftSize];
            int ringPos = 0;
            float[] buffer = new float[0];
            Stopwatch clock = Stopwatch.StartNew();
            long lastSend = 0, lastDeviceCheck = 0, lastSound = -100000;
            bool sounding = false;

            try
            {
                while (running)
                {
                    // Когда ничего не играет, просыпаемся реже — почти нулевая нагрузка
                    Thread.Sleep(sounding ? 10 : 40);
                    int packet;
                    Check(capture.GetNextPacketSize(out packet));
                    while (packet > 0)
                    {
                        IntPtr data;
                        int frames, flags;
                        long devicePos, qpcPos;
                        Check(capture.GetBuffer(out data, out frames, out flags, out devicePos, out qpcPos));
                        bool silent = (flags & 0x2) != 0 || !isFloat;
                        int count = frames * channels;
                        if (!silent)
                        {
                            if (buffer.Length < count) buffer = new float[count];
                            Marshal.Copy(data, buffer, 0, count);
                            lastSound = clock.ElapsedMilliseconds;
                        }
                        for (int f = 0; f < frames; f++)
                        {
                            float sum = 0;
                            if (!silent) for (int c = 0; c < channels; c++) sum += buffer[f * channels + c];
                            ring[ringPos] = silent ? 0 : sum / channels;
                            ringPos = (ringPos + 1) % FftSize;
                        }
                        capture.ReleaseBuffer(frames);
                        Check(capture.GetNextPacketSize(out packet));
                    }

                    long now = clock.ElapsedMilliseconds;
                    bool nowSounding = now - lastSound < 700;
                    if (sounding && !nowSounding) Array.Clear(ring, 0, ring.Length);
                    sounding = nowSounding;
                    if (sounding)
                    {
                        if (now - lastSend >= 33)
                        {
                            lastSend = now;
                            Action<float[]> handler = Spectrum;
                            if (handler != null) handler(Analyze(ring, ringPos, format.SamplesPerSec));
                        }
                    }
                    else if (now - lastSend >= 500)
                    {
                        // Тишина: изредка отправляем нули, чтобы обои «успокоились»
                        lastSend = now;
                        Action<float[]> handler2 = Spectrum;
                        if (handler2 != null) handler2(new float[Bands]);
                    }

                    // Сменили колонки на наушники — переподключаемся к новому устройству
                    if (now - lastDeviceCheck > 3000)
                    {
                        lastDeviceCheck = now;
                        IMMDevice current;
                        string currentId = null;
                        if (enumerator.GetDefaultAudioEndpoint(0, 1, out current) == 0)
                        {
                            current.GetId(out currentId);
                            Marshal.ReleaseComObject(current);
                        }
                        if (currentId != deviceId) break;
                    }
                }
            }
            finally
            {
                client.Stop();
                Marshal.FreeCoTaskMem(formatPtr);
                Marshal.ReleaseComObject(capture);
                Marshal.ReleaseComObject(client);
                Marshal.ReleaseComObject(device);
                Marshal.ReleaseComObject(enumerator);
            }
        }

        // БПФ последних FftSize сэмплов -> 64 полосы от 40 Гц до 14 кГц (логарифмически), 0..1
        static float[] Analyze(float[] ring, int start, int sampleRate)
        {
            double[] re = new double[FftSize], im = new double[FftSize];
            for (int i = 0; i < FftSize; i++)
            {
                double window = 0.5 - 0.5 * Math.Cos(2 * Math.PI * i / (FftSize - 1));
                re[i] = ring[(start + i) % FftSize] * window;
            }
            Fft(re, im);

            float[] bands = new float[Bands];
            double binHz = (double)sampleRate / FftSize;
            for (int b = 0; b < Bands; b++)
            {
                double f0 = 40 * Math.Pow(14000.0 / 40, (double)b / Bands);
                double f1 = 40 * Math.Pow(14000.0 / 40, (double)(b + 1) / Bands);
                int i0 = Math.Max(1, (int)(f0 / binHz));
                int i1 = Math.Max(i0 + 1, (int)(f1 / binHz));
                double peak = 0;
                for (int i = i0; i < i1 && i < FftSize / 2; i++)
                    peak = Math.Max(peak, Math.Sqrt(re[i] * re[i] + im[i] * im[i]) * 4 / FftSize);
                double db = 20 * Math.Log10(peak + 1e-9);
                bands[b] = (float)Math.Max(0, Math.Min(1, (db + 65) / 55));
            }
            return bands;
        }

        static void Fft(double[] re, double[] im)
        {
            int n = re.Length;
            for (int i = 1, j = 0; i < n; i++)
            {
                int bit = n >> 1;
                for (; (j & bit) != 0; bit >>= 1) j ^= bit;
                j ^= bit;
                if (i < j)
                {
                    double t = re[i]; re[i] = re[j]; re[j] = t;
                    t = im[i]; im[i] = im[j]; im[j] = t;
                }
            }
            for (int len = 2; len <= n; len <<= 1)
            {
                double ang = -2 * Math.PI / len;
                double wr = Math.Cos(ang), wi = Math.Sin(ang);
                for (int i = 0; i < n; i += len)
                {
                    double cr = 1, ci = 0;
                    for (int k = 0; k < len / 2; k++)
                    {
                        int a = i + k, b = i + k + len / 2;
                        double xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
                        re[b] = re[a] - xr; im[b] = im[a] - xi;
                        re[a] += xr; im[a] += xi;
                        double ncr = cr * wr - ci * wi;
                        ci = cr * wi + ci * wr;
                        cr = ncr;
                    }
                }
            }
        }

        public static string ToJson(float[] bands)
        {
            StringBuilder sb = new StringBuilder("{\"type\":\"spectrum\",\"bins\":[");
            for (int i = 0; i < bands.Length; i++)
            {
                if (i > 0) sb.Append(',');
                // Точка, а не запятая — иначе на русской Windows получится неверный JSON
                sb.Append((bands[i]).ToString("0.###", System.Globalization.CultureInfo.InvariantCulture));
            }
            return sb.Append("]}").ToString();
        }

        static void Check(int hr)
        {
            if (hr != 0) Marshal.ThrowExceptionForHR(hr);
        }

        // ---------- COM-интерфейсы Core Audio ----------
        [StructLayout(LayoutKind.Sequential, Pack = 2)]
        struct WaveFormat
        {
            public ushort FormatTag, Channels;
            public int SamplesPerSec, AvgBytesPerSec;
            public ushort BlockAlign, BitsPerSample, Size;
        }

        [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
        class MMDeviceEnumeratorComObject { }

        [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IMMDeviceEnumerator
        {
            [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr devices);
            [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
            [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
            [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr client);
            [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr client);
        }

        [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IMMDevice
        {
            [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
            [PreserveSig] int OpenPropertyStore(int access, out IntPtr properties);
            [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
            [PreserveSig] int GetState(out int state);
        }

        [ComImport, Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IAudioClient
        {
            [PreserveSig] int Initialize(int shareMode, int streamFlags, long bufferDuration, long periodicity, IntPtr format, IntPtr sessionGuid);
            [PreserveSig] int GetBufferSize(out uint frames);
            [PreserveSig] int GetStreamLatency(out long latency);
            [PreserveSig] int GetCurrentPadding(out int padding);
            [PreserveSig] int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closest);
            [PreserveSig] int GetMixFormat(out IntPtr format);
            [PreserveSig] int GetDevicePeriod(out long defaultPeriod, out long minimumPeriod);
            [PreserveSig] int Start();
            [PreserveSig] int Stop();
            [PreserveSig] int Reset();
            [PreserveSig] int SetEventHandle(IntPtr handle);
            [PreserveSig] int GetService(ref Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
        }

        [ComImport, Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IAudioCaptureClient
        {
            [PreserveSig] int GetBuffer(out IntPtr data, out int frames, out int flags, out long devicePosition, out long qpcPosition);
            [PreserveSig] int ReleaseBuffer(int frames);
            [PreserveSig] int GetNextPacketSize(out int frames);
        }
    }
}
