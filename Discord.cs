// Discord.cs: показывает в профиле Discord, какой трек сейчас играет (Rich Presence через локальный канал Discord).
// Нужен «Application ID» своего приложения из discord.com/developers — его название и видно в профиле: «Слушает <название>».

using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace LiveWall
{
    class DiscordPresence : IDisposable
    {
        readonly object sync = new object();
        readonly JavaScriptSerializer json = new JavaScriptSerializer();
        Thread thread;
        volatile bool running = true;
        NamedPipeClientStream pipe;
        string connectedId;
        DateTime nextTry = DateTime.MinValue;

        // желаемое состояние (меняется из основного потока)
        string wantId = "", wantKey = "";
        Dictionary<string, object> wantActivity;
        string sentKey = "";
        int version, sentVersion;

        public string Status = "Выключено";
        public event Action StatusChanged;

        public DiscordPresence()
        {
            thread = new Thread(Loop) { IsBackground = true, Name = "discord-rpc" };
            thread.Start();
        }

        void SetStatus(string s)
        {
            if (Status == s) return;
            Status = s;
            Action h = StatusChanged;
            if (h != null) try { h(); } catch { }
        }

        // activity == null — убрать статус
        public void Update(string clientId, TrackInfoLite track, bool showProgress, bool showArtist, bool showAlbum = true, bool buttons = true)
        {
            lock (sync)
            {
                wantId = (clientId ?? "").Trim();
                Dictionary<string, object> act = null;
                string key = "";
                if (track != null && track.Playing && wantId.Length > 0)
                {
                    act = new Dictionary<string, object>();
                    act["type"] = 2;                                   // «Слушает»
                    // В строке статуса (список участников и профиль) показывается «Название - Исполнитель»
                    act["details"] = Cut(showArtist && track.Artist.Length > 0 ? track.Title + " - " + track.Artist : track.Title, 128);
                    act["status_display_type"] = 2;
                    // Вторая строка: подпись автора; без неё — альбом (только если он не совпадает с названием, иначе строка дублируется)
                    bool credit = Config.GetBool("discordcredit", true);
                    if (credit) act["state"] = "Создал Frein <3";
                    else if (showAlbum && !string.IsNullOrEmpty(track.Album) && !string.Equals(track.Album.Trim(), track.Title.Trim(), StringComparison.OrdinalIgnoreCase))
                        act["state"] = Cut(track.Album, 128);
                    if (showProgress && track.PosSec >= 0 && track.DurSec > 0)
                    {
                        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                        long start = now - (long)track.PosSec;
                        Dictionary<string, object> ts = new Dictionary<string, object>();
                        ts["start"] = start; ts["end"] = start + (long)track.DurSec;
                        act["timestamps"] = ts;
                    }
                    if (!string.IsNullOrEmpty(track.Cover) && track.Cover.Length <= 250)
                    {
                        Dictionary<string, object> assets = new Dictionary<string, object>();
                        assets["large_image"] = track.Cover;
                        assets["large_text"] = Cut(!string.IsNullOrEmpty(track.Album) ? track.Album : (track.Artist.Length > 0 ? track.Title + " — " + track.Artist : track.Title), 128);
                        act["assets"] = assets;
                    }
                    if (buttons)
                    {
                        string q = Uri.EscapeDataString((track.Artist + " " + track.Title).Trim());
                        List<object> btns = new List<object>();
                        Dictionary<string, object> b1 = new Dictionary<string, object>(); b1["label"] = "Яндекс Музыка"; b1["url"] = "https://music.yandex.ru/search?text=" + q;
                        Dictionary<string, object> b2 = new Dictionary<string, object>();
                        if (credit) { b2["label"] = "Создал Frein <3"; b2["url"] = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; }
                        else { b2["label"] = "YouTube"; b2["url"] = "https://www.youtube.com/results?search_query=" + q; }
                        if (b1["url"].ToString().Length <= 512) { btns.Add(b1); btns.Add(b2); act["buttons"] = btns; }
                    }
                    key = track.Title + "|" + track.Artist + "|" + (track.Album ?? "") + "|" + showAlbum + "|" + buttons + "|" + Config.GetBool("discordcredit", true) + "|" + showArtist + "|" + track.Playing + "|" + (act.ContainsKey("timestamps") ? "t" : "") + "|" + (track.Cover ?? "");
                }
                // Позиция идёт сама; обновляем только при смене трека, паузе или перемотке
                if (key != wantKey || (act != null && act.ContainsKey("timestamps") && Seeked(track)))
                {
                    wantKey = key; wantActivity = act; version++;
                    lastStart = track != null && track.PosSec >= 0 ? DateTimeOffset.UtcNow.ToUnixTimeSeconds() - (long)track.PosSec : 0;
                }
                else if (wantId != connectedId) version++;
            }
        }

        long lastStart;
        bool Seeked(TrackInfoLite t)
        {
            if (t == null || t.PosSec < 0) return false;
            long start = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - (long)t.PosSec;
            return Math.Abs(start - lastStart) > 4;
        }

        static string Cut(string s, int n) { s = (s ?? "").Trim(); if (s.Length < 2) s = s + "  "; return s.Length > n ? s.Substring(0, n) : s; }

        // ---------- рабочий поток ----------
        void Loop()
        {
            while (running)
            {
                try
                {
                    string id; Dictionary<string, object> act; int ver;
                    lock (sync) { id = wantId; act = wantActivity; ver = version; }
                    if (id.Length == 0) { Close(); SetStatus("Выключено"); }
                    else
                    {
                        if (pipe == null || connectedId != id) Connect(id);
                        if (pipe != null && ver != sentVersion)
                        {
                            SendActivity(act);
                            sentVersion = ver;
                            SetStatus(act == null ? "Подключено — ничего не играет" : "Показывается в Discord");
                        }
                        else if (pipe != null) Drain();
                    }
                }
                catch (Exception ex)
                {
                    Program.Log("discord: " + ex.Message);
                    Close();
                    sentVersion = -1;
                    SetStatus("Нет связи с Discord");
                    nextTry = DateTime.Now.AddSeconds(8);
                }
                Thread.Sleep(700);
            }
            Close();
        }

        void Connect(string id)
        {
            Close();
            if (DateTime.Now < nextTry) return;
            nextTry = DateTime.Now.AddSeconds(6);
            for (int i = 0; i < 10; i++)
            {
                NamedPipeClientStream p = null;
                try
                {
                    p = new NamedPipeClientStream(".", "discord-ipc-" + i, PipeDirection.InOut, PipeOptions.None);
                    p.Connect(250);
                }
                catch { if (p != null) p.Dispose(); continue; }

                pipe = p;
                Dictionary<string, object> hello = new Dictionary<string, object>();
                hello["v"] = 1; hello["client_id"] = id;
                Write(0, json.Serialize(hello));
                string reply = ReadFrame(3000);
                if (reply != null && reply.Contains("\"READY\"")) { connectedId = id; sentVersion = -1; SetStatus("Подключено"); return; }
                bool badId = reply != null && (reply.Contains("Invalid Client ID") || reply.Contains("4000") || reply.Contains("ERROR"));
                Close();
                SetStatus(badId ? "Неверный Application ID" : "Discord не ответил");
                return;
            }
            SetStatus("Discord не запущен");
        }

        void SendActivity(Dictionary<string, object> activity)
        {
            Dictionary<string, object> args = new Dictionary<string, object>();
            args["pid"] = System.Diagnostics.Process.GetCurrentProcess().Id;
            args["activity"] = activity;
            Dictionary<string, object> cmd = new Dictionary<string, object>();
            cmd["cmd"] = "SET_ACTIVITY"; cmd["args"] = args; cmd["nonce"] = Guid.NewGuid().ToString();
            Write(1, json.Serialize(cmd));
            string reply = ReadFrame(3000);
            if (reply != null && reply.Contains("\"ERROR\"")) Program.Log("discord: " + reply);
        }

        // Ответы на пинги и прочее, что присылает Discord
        void Drain()
        {
            while (pipe != null && PipeHasData())
            {
                string s = ReadFrame(500);
                if (s == null) break;
            }
        }

        bool PipeHasData()
        {
            try { return pipe.IsConnected && NativePeek(); } catch { return false; }
        }

        bool NativePeek()
        {
            // NamedPipeClientStream не умеет Peek — читаем только после отправки, а обрыв ловим при записи
            return false;
        }

        void Write(int opcode, string payload)
        {
            byte[] body = Encoding.UTF8.GetBytes(payload);
            byte[] frame = new byte[8 + body.Length];
            BitConverter.GetBytes(opcode).CopyTo(frame, 0);
            BitConverter.GetBytes(body.Length).CopyTo(frame, 4);
            body.CopyTo(frame, 8);
            pipe.Write(frame, 0, frame.Length);
            pipe.Flush();
        }

        string ReadFrame(int timeoutMs)
        {
            byte[] head = ReadExact(8, timeoutMs);
            if (head == null) return null;
            int op = BitConverter.ToInt32(head, 0), len = BitConverter.ToInt32(head, 4);
            if (len < 0 || len > 1 << 20) return null;
            byte[] body = len == 0 ? new byte[0] : ReadExact(len, timeoutMs);
            if (body == null) return null;
            string text = Encoding.UTF8.GetString(body);
            if (op == 3) { Write(4, text); return ReadFrame(timeoutMs); }   // ping -> pong
            return text;
        }

        byte[] ReadExact(int n, int timeoutMs)
        {
            byte[] buf = new byte[n];
            int got = 0;
            while (got < n)
            {
                IAsyncResult ar = pipe.BeginRead(buf, got, n - got, null, null);
                if (!ar.AsyncWaitHandle.WaitOne(timeoutMs)) throw new IOException("Discord не отвечает");
                int r = pipe.EndRead(ar);
                if (r <= 0) throw new IOException("Discord закрыл соединение");
                got += r;
            }
            return buf;
        }

        void Close()
        {
            try
            {
                if (pipe != null) { pipe.Dispose(); }
            }
            catch { }
            pipe = null; connectedId = null;
        }

        public void Dispose()
        {
            running = false;
            try { thread.Join(1500); } catch { }
        }
    }

    // Минимум данных о треке для Discord
    class TrackInfoLite
    {
        public string Title = "", Artist = "";
        public bool Playing;
        public double PosSec = -1, DurSec;
        public string Album;
        public string Cover;   // https-адрес обложки (для Discord нужна ссылка, а не файл)
    }

    // Поиск обложки трека в открытых каталогах (iTunes, затем Deezer): Discord принимает только ссылку на картинку
    static class CoverFinder
    {
        static readonly Dictionary<string, string> cache = new Dictionary<string, string>();
        static readonly Dictionary<string, string> albums = new Dictionary<string, string>();
        static readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 4 * 1024 * 1024 };

        [ThreadStatic] static string lastAlbum;

        // null — ещё не искали; "" — не нашли
        public static string Cached(string artist, string title)
        {
            string v;
            lock (cache) return cache.TryGetValue(artist + "|" + title, out v) ? v : null;
        }

        public static string CachedAlbum(string artist, string title) { string v; lock (cache) return albums.TryGetValue(artist + "|" + title, out v) ? v : null; }

        public static void Mark(string artist, string title) { lock (cache) cache[artist + "|" + title] = ""; }

        public static string Find(string artist, string title)
        {
            string url = null; lastAlbum = null;
            try { url = FromItunes(artist, title); } catch (Exception ex) { Program.Log("itunes: " + ex.Message); }
            if (url == null) try { url = FromDeezer(artist, title); } catch (Exception ex) { Program.Log("deezer: " + ex.Message); }
            lock (cache) { cache[artist + "|" + title] = url ?? ""; if (lastAlbum != null) albums[artist + "|" + title] = lastAlbum; }
            return url;
        }

        static string Get(string url)
        {
            // .NET 4 по умолчанию не включает TLS 1.2, без него iTunes и Deezer не открываются
            System.Net.ServicePointManager.SecurityProtocol = (System.Net.SecurityProtocolType)3072 | (System.Net.SecurityProtocolType)768;
            System.Net.HttpWebRequest rq = (System.Net.HttpWebRequest)System.Net.WebRequest.Create(url);
            rq.Timeout = 5000; rq.ReadWriteTimeout = 5000; rq.UserAgent = "Lumora/1.0";
            using (System.Net.WebResponse rs = rq.GetResponse())
            using (StreamReader sr = new StreamReader(rs.GetResponseStream(), Encoding.UTF8)) return sr.ReadToEnd();
        }

        static string Clean(string s)
        {
            s = (s ?? "").ToLowerInvariant();
            s = System.Text.RegularExpressions.Regex.Replace(s, @"[\(\[].*?[\)\]]", " ");                                  // (speed up), [Remix]
            s = System.Text.RegularExpressions.Regex.Replace(s, @"\b(feat\.?|ft\.?|prod\.?)\b.*$", " ");
            s = System.Text.RegularExpressions.Regex.Replace(s, @"[^\p{L}\p{N}]+", " ");
            return s.Trim();
        }

        static bool Similar(string a, string b)
        {
            a = Clean(a); b = Clean(b);
            if (a.Length == 0 || b.Length == 0) return false;
            return a == b || a.Contains(b) || b.Contains(a);
        }

        static string FromItunes(string artist, string title)
        {
            string q = Uri.EscapeDataString((artist + " " + Clean(title)).Trim());
            Dictionary<string, object> d = json.Deserialize<Dictionary<string, object>>(Get("https://itunes.apple.com/search?media=music&entity=song&limit=6&term=" + q));
            System.Collections.IEnumerable list = d.ContainsKey("results") ? d["results"] as System.Collections.IEnumerable : null;
            if (list == null) return null;
            foreach (object o in list)
            {
                Dictionary<string, object> t = o as Dictionary<string, object>;
                if (t == null || !t.ContainsKey("artworkUrl100")) continue;
                if (!Similar(Convert.ToString(t.ContainsKey("trackName") ? t["trackName"] : ""), title)) continue;
                if (artist.Length > 0 && !Similar(Convert.ToString(t.ContainsKey("artistName") ? t["artistName"] : ""), artist) && !Similar(artist, Convert.ToString(t.ContainsKey("artistName") ? t["artistName"] : ""))) continue;
                lastAlbum = Convert.ToString(t.ContainsKey("collectionName") ? t["collectionName"] : "");
                return Convert.ToString(t["artworkUrl100"]).Replace("100x100bb", "512x512bb");
            }
            return null;
        }

        static string FromDeezer(string artist, string title)
        {
            string q = Uri.EscapeDataString((artist + " " + Clean(title)).Trim());
            Dictionary<string, object> d = json.Deserialize<Dictionary<string, object>>(Get("https://api.deezer.com/search?limit=6&q=" + q));
            System.Collections.IEnumerable list = d.ContainsKey("data") ? d["data"] as System.Collections.IEnumerable : null;
            if (list == null) return null;
            foreach (object o in list)
            {
                Dictionary<string, object> t = o as Dictionary<string, object>;
                if (t == null) continue;
                Dictionary<string, object> al = t.ContainsKey("album") ? t["album"] as Dictionary<string, object> : null;
                Dictionary<string, object> ar = t.ContainsKey("artist") ? t["artist"] as Dictionary<string, object> : null;
                if (al == null || !al.ContainsKey("cover_big")) continue;
                if (!Similar(Convert.ToString(t.ContainsKey("title") ? t["title"] : ""), title)) continue;
                string an = ar != null && ar.ContainsKey("name") ? Convert.ToString(ar["name"]) : "";
                if (artist.Length > 0 && !Similar(an, artist) && !Similar(artist, an)) continue;
                lastAlbum = Convert.ToString(al.ContainsKey("title") ? al["title"] : "");
                return Convert.ToString(al["cover_big"]);
            }
            return null;
        }
    }
}
