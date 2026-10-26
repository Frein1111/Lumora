// Wallpaper.cs: окно с обоями, встроенное под иконки рабочего стола (WebView2).

using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace LiveWall
{
    enum PauseMode { None, Freeze, Hide }

    class WallpaperHost : Form
    {
        readonly WebView2 web;
        bool ready, suspended;
        string pendingUrl, currentUrl, pendingFolder, currentFolder, lastPath;
        PauseMode pause = PauseMode.None;

        public IntPtr Progman { get; private set; }
        public PauseMode Pause { get { return pause; } }
        public bool Paused { get { return pause != PauseMode.None; } }
        // Что нужно текущим обоям: звук и/или курсор
        public bool WantsAudio { get; private set; }
        public bool WantsMouse { get; private set; }

        // Страница загрузилась и прислала "ready" — ей можно отправлять данные
        public event EventHandler PageReady;
        public event EventHandler CapsChanged;

        public WallpaperHost()
        {
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.Manual;
            BackColor = Color.FromArgb(12, 12, 18);
            Text = "LiveWall";
            Rectangle area = SystemInformation.VirtualScreen;
            Bounds = new Rectangle(area.Left, area.Top, area.Width, area.Height);

            web = new WebView2();
            web.Dock = DockStyle.Fill;
            web.DefaultBackgroundColor = Color.FromArgb(12, 12, 18);
            Controls.Add(web);
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= Native.WS_EX_TOOLWINDOW | Native.WS_EX_NOACTIVATE;
                return cp;
            }
        }

        protected override bool ShowWithoutActivation { get { return true; } }

        protected override async void OnShown(EventArgs e)
        {
            base.OnShown(e);
            AttachToDesktop();
            try
            {
                CoreWebView2Environment env = await Program.WebEnv();
                await web.EnsureCoreWebView2Async(env);
                CoreWebView2Settings s = web.CoreWebView2.Settings;
                s.AreDefaultContextMenusEnabled = false;
                s.AreDevToolsEnabled = false;
                s.IsStatusBarEnabled = false;
                s.IsZoomControlEnabled = false;
                s.IsBuiltInErrorPageEnabled = false;
                s.IsPasswordAutosaveEnabled = false;
                s.IsGeneralAutofillEnabled = false;
                web.CoreWebView2.IsMuted = true;
                web.CoreWebView2.SetVirtualHostNameToFolderMapping("app.livewall", Program.AppDir, CoreWebView2HostResourceAccessKind.Allow);
                web.CoreWebView2.SetVirtualHostNameToFolderMapping("lib.livewall", Program.LibraryDir, CoreWebView2HostResourceAccessKind.Allow);
                await web.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(LivelyBridge);
                web.CoreWebView2.NavigationStarting += delegate { SetCaps(false, false); };
                web.CoreWebView2.NavigationCompleted += delegate { if (pause == PauseMode.Hide) SuspendLater(); RunLook(); };
                web.CoreWebView2.WebMessageReceived += OnMessage;
                web.CoreWebView2.ProcessFailed += delegate(object sender, CoreWebView2ProcessFailedEventArgs a)
                {
                    Program.Log("WebView2 процесс: " + a.ProcessFailedKind);
                    if (a.ProcessFailedKind == CoreWebView2ProcessFailedKind.BrowserProcessExited || a.ProcessFailedKind == CoreWebView2ProcessFailedKind.RenderProcessExited) dead = true;
                };
                ready = true;
                if (pendingUrl != null) SetUrl(pendingUrl);
            }
            catch (Exception ex)
            {
                Program.Log("WebView2: " + ex);
                MessageBox.Show("Не удалось запустить WebView2:\n" + ex.Message + "\n\nУстановите «Microsoft Edge WebView2 Runtime».", "Lumora", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        // «Вид» обоев: яркость, цвет, размытие, затемнение и параметры видео накладываются скриптом поверх страницы
        // Браузерный процесс упал или был закрыт — окно обоев нужно создать заново (это делает таймер приложения)
        volatile bool dead;
        string lookScript;
        bool lookSound;

        public void SetLook(string script, bool sound)
        {
            lookScript = script; lookSound = sound;
            RunLook();
        }

        async void RunLook()
        {
            if (!ready || web.CoreWebView2 == null) return;
            try
            {
                web.CoreWebView2.IsMuted = !lookSound;
                if (lookScript != null && !suspended) await web.CoreWebView2.ExecuteScriptAsync(lookScript);
            }
            catch (Exception ex) { Program.Log("look: " + ex.Message); }
        }

        void OnMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            string msg;
            try { msg = e.TryGetWebMessageAsString(); }
            catch { return; }
            if (msg == null) return;
            if (msg.StartsWith("caps:")) SetCaps(msg.Contains("audio"), msg.Contains("mouse"));
            else if (msg == "ready")
            {
                EventHandler handler = PageReady;
                if (handler != null) handler(this, EventArgs.Empty);
            }
        }

        void SetCaps(bool audio, bool mouse)
        {
            if (WantsAudio == audio && WantsMouse == mouse) return;
            WantsAudio = audio; WantsMouse = mouse;
            EventHandler handler = CapsChanged;
            if (handler != null) handler(this, EventArgs.Empty);
        }

        // Встраиваем окно между картинкой рабочего стола и иконками
        void AttachToDesktop()
        {
            IntPtr progman = Native.FindWindow("Progman", null);
            IntPtr ignored;
            // Просим Explorer создать слой WorkerW за иконками
            Native.SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), new IntPtr(1), 0, 1000, out ignored);

            IntPtr defView = Native.FindWindowEx(progman, IntPtr.Zero, "SHELLDLL_DefView", null);
            IntPtr innerWorker = Native.FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);
            bool raisedDesktop = (Native.GetWindowLong(progman, Native.GWL_EXSTYLE) & 0x00200000) != 0; // WS_EX_NOREDIRECTIONBITMAP

            Native.SetWindowLong(Handle, Native.GWL_STYLE, Native.WS_CHILD | Native.WS_VISIBLE);
            Rectangle area = SystemInformation.VirtualScreen;

            if (raisedDesktop && defView != IntPtr.Zero && innerWorker != IntPtr.Zero)
            {
                // Windows 11 24H2 и новее: WorkerW внутри Progman, окно должно быть слоистым
                Native.SetWindowLong(Handle, Native.GWL_EXSTYLE, Native.GetWindowLong(Handle, Native.GWL_EXSTYLE) | Native.WS_EX_LAYERED);
                Native.SetLayeredWindowAttributes(Handle, 0, 255, 0x2);
                Native.SetParent(Handle, progman);
                Native.SetWindowPos(Handle, defView, 0, 0, 0, 0, Native.SWP_NOMOVE | Native.SWP_NOSIZE | Native.SWP_NOACTIVATE);
                Native.SetWindowPos(innerWorker, Native.HWND_BOTTOM, 0, 0, 0, 0, Native.SWP_NOMOVE | Native.SWP_NOSIZE | Native.SWP_NOACTIVATE);
            }
            else
            {
                // Старые версии Windows: WorkerW идёт следом за окном с иконками
                IntPtr worker = IntPtr.Zero;
                Native.EnumWindows(delegate(IntPtr top, IntPtr l)
                {
                    if (Native.FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null) != IntPtr.Zero)
                        worker = Native.FindWindowEx(IntPtr.Zero, top, "WorkerW", null);
                    return true;
                }, IntPtr.Zero);
                Native.SetParent(Handle, worker != IntPtr.Zero ? worker : progman);
            }

            Native.SetWindowPos(Handle, IntPtr.Zero, 0, 0, area.Width, area.Height, Native.SWP_NOZORDER | Native.SWP_NOACTIVATE | Native.SWP_SHOWWINDOW);
            Progman = progman;
        }

        // Сменилось разрешение или набор мониторов — растягиваем окно на новую площадь
        public void Fit()
        {
            try
            {
                Rectangle area = SystemInformation.VirtualScreen;
                Native.SetWindowPos(Handle, IntPtr.Zero, 0, 0, area.Width, area.Height, Native.SWP_NOZORDER | Native.SWP_NOACTIVATE | Native.SWP_SHOWWINDOW);
            }
            catch (Exception ex) { Program.Log("Fit: " + ex.Message); }
        }

        // Explorer перезапускался — окно нужно создать заново
        public bool IsAlive
        {
            get { return !dead && !IsDisposed && Progman != IntPtr.Zero && Native.FindWindow("Progman", null) == Progman && Native.IsWindow(Handle); }
        }

        public void SetWallpaper(string path)
        {
            // Папка Lively открывается как корень отдельного сайта: её страницы ссылаются на "/js/..." и т.п.
            lastPath = path;
            bool folder = Directory.Exists(path);
            string root = folder ? path : Program.LibraryDir;
            string hostName = folder ? "wall.livewall" : "lib.livewall";
            string entry = Program.EntryFile(path);
            string relative = entry.Substring(root.Length).TrimStart('\\');
            string url = "https://" + hostName + "/" + string.Join("/", relative.Split('\\').Select(Uri.EscapeDataString));
            string ext = Path.GetExtension(entry).ToLowerInvariant();
            pendingFolder = folder ? path : null;
            if (ext == ".html" || ext == ".htm")
            {
                // Встроенные обои получают настройки качества через адрес страницы
                if (!folder) url += "?fps=" + Config.Fps + "&q=" + Config.QualityScale;
                SetUrl(url);
            }
            else
                SetUrl("https://app.livewall/player.html?src=" + Uri.EscapeDataString(url));
        }

        // Перезагрузка страницы (например, после смены качества)
        public void Reload() { currentUrl = null; if (lastPath != null) SetWallpaper(lastPath); }

        void SetUrl(string url)
        {
            pendingUrl = url;
            if (!ready || (url == currentUrl && pendingFolder == currentFolder)) return;
            currentUrl = url;
            currentFolder = pendingFolder;
            try
            {
                Wake();
                web.CoreWebView2.ClearVirtualHostNameToFolderMapping("wall.livewall");
                if (currentFolder != null)
                    web.CoreWebView2.SetVirtualHostNameToFolderMapping("wall.livewall", currentFolder, CoreWebView2HostResourceAccessKind.Allow);
                web.CoreWebView2.Navigate(url);
            }
            catch (Exception ex) { Program.Log("Navigate: " + ex.Message); }
        }

        // Отправить данные странице обоев (трек, спектр, курсор)
        public void Post(string json)
        {
            if (!ready || pause == PauseMode.Hide || web.CoreWebView2 == null) return;
            try { web.CoreWebView2.PostWebMessageAsJson(json); }
            catch (Exception ex) { Program.Log("Post: " + ex.Message); }
        }

        // Выводим движок из спячки перед любой работой со страницей
        void Wake()
        {
            if (!suspended) return;
            suspended = false;
            try { web.CoreWebView2.Resume(); } catch { }
            RunLook();
        }

        async void SuspendLater()
        {
            try
            {
                await Task.Delay(500);
                if (pause != PauseMode.Hide || !ready) return;
                bool ok = await web.CoreWebView2.TrySuspendAsync();
                suspended = ok && pause == PauseMode.Hide;
                if (ok && pause != PauseMode.Hide) { web.CoreWebView2.Resume(); suspended = false; }
            }
            catch (Exception ex) { Program.Log("Suspend: " + ex.Message); }
        }

        // Freeze — застыть на последнем кадре (рабочий стол остаётся красивым);
        // Hide — обои не видны (закрыты окнами): прячем и усыпляем движок, нагрузка почти нулевая.
        public void SetPause(PauseMode mode)
        {
            if (pause == mode || !ready || web.CoreWebView2 == null) return;
            PauseMode old = pause;
            pause = mode;
            try
            {
                if (mode == PauseMode.None)
                {
                    Wake();
                    web.Visible = true;
                    try { web.CoreWebView2.MemoryUsageTargetLevel = CoreWebView2MemoryUsageTargetLevel.Normal; } catch { }
                    web.CoreWebView2.ExecuteScriptAsync("window.lwPaused=false;document.querySelectorAll('video').forEach(function(v){v.play()});");
                    return;
                }
                if (old == PauseMode.Hide && mode == PauseMode.Freeze) { Wake(); web.Visible = true; }
                web.CoreWebView2.ExecuteScriptAsync("window.lwPaused=true;document.querySelectorAll('video').forEach(function(v){v.pause()});");
                if (mode == PauseMode.Hide)
                {
                    web.Visible = false;
                    try { web.CoreWebView2.MemoryUsageTargetLevel = CoreWebView2MemoryUsageTargetLevel.Low; } catch { }
                    SuspendLater();
                }
            }
            catch (Exception ex) { Program.Log("Pause: " + ex.Message); }
        }

        // Мост для обоев: звук, трек, курсор и стандартные настройки Lively
        const string LivelyBridge = @"(function () {
  function call(name, arg) { try { if (typeof window[name] === 'function') window[name](arg); } catch (e) { } }
  window.chrome.webview.addEventListener('message', function (e) {
    var m = e.data;
    if (m.type === 'spectrum') {
      var a = [];
      for (var i = 0; i < m.bins.length; i++) a.push(m.bins[i], m.bins[i]);
      call('livelyAudioListener', a);
    } else if (m.type === 'mouse') {
      call('livelyMouse', m);
    } else if (m.type === 'track') {
      var thumb = m.cover ? m.cover.substring(m.cover.indexOf(',') + 1) : null;
      call('livelyCurrentTrack', JSON.stringify({ Title: m.title, Artist: m.artist, AlbumTitle: '', AlbumArtist: m.artist,
        Subtitle: '', Genres: [], TrackNumber: 0, AlbumTrackCount: 0, PlaybackType: 1, Thumbnail: thumb }));
    }
  });
  window.addEventListener('load', function () {
    fetch('LivelyProperties.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (p) {
      if (!p || typeof window.livelyPropertyListener !== 'function') return;
      for (var k in p) {
        if (p[k].type === 'label' || p[k].type === 'button') continue;
        try { window.livelyPropertyListener(k, p[k].value); } catch (e) { }
      }
    }).catch(function () { }).then(function () { window.chrome.webview.postMessage('ready'); });
  });
})();";
    }
}
