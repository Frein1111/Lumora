// SettingsForm.cs: главное окно Lumora — интерфейс на HTML внутри WebView2 (папка ui), связь с приложением через сообщения.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace LiveWall
{
    class SettingsForm : Form
    {
        // Цвета окна под тему интерфейса (чтобы не было белой вспышки и заголовок сливался с фоном)
        static readonly Color[] ChromeBg = { Color.FromArgb(11, 11, 14), Color.FromArgb(22, 22, 24), Color.FromArgb(0, 0, 0), Color.FromArgb(238, 238, 242) };

        readonly LiveWallContext app;
        WebView2 web = new WebView2();
        LoadingBox loading;
        readonly Timer revealTimer = new Timer();
        readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 32 * 1024 * 1024 };
        readonly string startPage;
        bool ready;
        readonly Timer npTimer = new Timer();
        string npKey; bool npCover, npBusy;
        DateTime npLast = DateTime.MinValue;
        TrackInfo npInfo;
        [System.Runtime.InteropServices.DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, int flags, IntPtr extra);

        public SettingsForm(LiveWallContext app, string page)
        {
            this.app = app;
            startPage = page;
            AutoScaleMode = AutoScaleMode.None;
            Text = "Lumora";
            Icon = app.AppIcon;
            Rectangle wa = Screen.PrimaryScreen.WorkingArea;
            Size = new Size(Math.Min(Ui.S(1360), wa.Width - Ui.S(60)), Math.Min(Ui.S(860), wa.Height - Ui.S(50)));
            MinimumSize = new Size(Math.Min(Ui.S(980), wa.Width), Math.Min(Ui.S(620), wa.Height));
            StartPosition = FormStartPosition.CenterScreen;
            Color bg = ChromeBg[Config.Theme];
            BackColor = bg;
            web.Dock = DockStyle.Fill;
            web.DefaultBackgroundColor = bg;
            Controls.Add(web);
            // Пока интерфейс загружается (пара секунд), вместо пустого окна — маленькое окошко с полосой загрузки
            Opacity = 0;
            loading = new LoadingBox(Config.Theme == 3);
            loading.Show();
            revealTimer.Interval = 9000;
            revealTimer.Tick += delegate { Reveal(); };
            revealTimer.Start();
            npTimer.Interval = 1200;
            npTimer.Tick += delegate { NpTick(); };
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            npTimer.Stop(); revealTimer.Stop();
            if (loading != null) { loading.Stop(); loading.Close(); loading = null; }
            base.OnFormClosed(e);
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            ApplyChrome();
        }

        // Заголовок окна в цвет темы
        public void ApplyChrome()
        {
            Color bg = ChromeBg[Config.Theme];
            BackColor = bg;
            try { web.DefaultBackgroundColor = bg; } catch { }
            if (IsHandleCreated) Native.DarkTitleBar(Handle, bg, Config.Theme != 3);
        }

        protected override async void OnShown(EventArgs e)
        {
            base.OnShown(e);
            // Сначала общий браузерный процесс с обоями (экономит память); если он в плохом состоянии — отдельный профиль
            // Окно управления работает в своём профиле браузера: общий с обоями иногда не даёт запустить второе окно
            string[] folders = { Path.Combine(Program.DataDir, "WebView2UI") };
            Exception last = null;
            for (int attempt = 0; attempt < 3; attempt++)
            {
                try
                {
                    await StartWeb(folders[0]);
                    return;
                }
                catch (Exception ex)
                {
                    last = ex;
                    Program.Log("ui (попытка " + (attempt + 1) + "): " + ex.Message);
                    ReplaceWeb();
                }
                await System.Threading.Tasks.Task.Delay(500);
            }
            Program.Log("ui: " + last);
            MessageBox.Show("Не удалось запустить интерфейс:\n" + last.Message + "\n\nПерезапустите Lumora. Если не помогает — установите «Microsoft Edge WebView2 Runtime».", "Lumora", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }

        // Интерфейс готов: показываем окно, убираем окошко загрузки
        void Reveal()
        {
            revealTimer.Stop();
            if (Opacity < 1) { Opacity = 1; try { Activate(); } catch { } }
            if (loading != null) { loading.Stop(); loading.Close(); loading.Dispose(); loading = null; }
        }

        // Новый пустой элемент WebView2 (после неудачной попытки старый непригоден)
        void ReplaceWeb()
        {
            try { Controls.Remove(web); web.Dispose(); } catch { }
            web = new WebView2();
            web.Dock = DockStyle.Fill;
            try { web.DefaultBackgroundColor = ChromeBg[Config.Theme]; } catch { }
            Controls.Add(web);
        }

        async System.Threading.Tasks.Task StartWeb(string folder)
        {
            // Параметры те же, что у окна обоев — тогда у них общий браузерный процесс
            CoreWebView2Environment env = folder == null ? await Program.WebEnv() : await CoreWebView2Environment.CreateAsync(null, folder, new CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required"));
            await web.EnsureCoreWebView2Async(env);
            CoreWebView2Settings s = web.CoreWebView2.Settings;
            s.AreDefaultContextMenusEnabled = false;
            s.AreDevToolsEnabled = Environment.GetEnvironmentVariable("LUMORA_DEBUG") == "1";
            s.IsStatusBarEnabled = false;
            s.IsZoomControlEnabled = false;
            s.IsBuiltInErrorPageEnabled = false;
            s.IsPasswordAutosaveEnabled = false;
            s.IsGeneralAutofillEnabled = false;
            s.AreBrowserAcceleratorKeysEnabled = false;
            web.CoreWebView2.IsMuted = true;
            web.CoreWebView2.SetVirtualHostNameToFolderMapping("app.livewall", Program.AppDir, CoreWebView2HostResourceAccessKind.Allow);
            web.CoreWebView2.SetVirtualHostNameToFolderMapping("lib.livewall", Program.LibraryDir, CoreWebView2HostResourceAccessKind.Allow);
            web.CoreWebView2.WebMessageReceived += OnMessage;
            web.CoreWebView2.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs a) { a.Handled = true; };
            web.CoreWebView2.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs a)
            {
                // Перетащенный файл не должен открываться как страница
                if (!a.Uri.StartsWith("https://app.livewall/ui/")) a.Cancel = true;
            };
            web.CoreWebView2.Navigate("https://app.livewall/ui/index.html");
        }

        // ---------- обмен с интерфейсом ----------
        void Post(Dictionary<string, object> msg)
        {
            if (!ready || web.CoreWebView2 == null) return;
            try { web.CoreWebView2.PostWebMessageAsJson(json.Serialize(msg)); }
            catch (Exception ex) { Program.Log("ui post: " + ex.Message); }
        }

        void PostRaw(string rawJson)
        {
            if (web.CoreWebView2 == null) return;
            try { web.CoreWebView2.PostWebMessageAsJson(rawJson); }
            catch (Exception ex) { Program.Log("ui post: " + ex.Message); }
        }

        static Dictionary<string, object> Msg(string type) { Dictionary<string, object> m = new Dictionary<string, object>(); m["t"] = type; return m; }

        public void SendState(string page)
        {
            PostRaw(Studio.StateJson(app, page));
        }

        // Текущие обои или пауза изменились
        public void RefreshState()
        {
            Dictionary<string, object> m = Msg("current");
            m["id"] = app.CurrentWallpaper == null ? null : Path.GetFileName(app.CurrentWallpaper);
            m["paused"] = app.IsPaused;
            m["recent"] = Store.Recent.ToArray();
            Post(m);
        }

        public void RefreshPause()
        {
            Dictionary<string, object> m = Msg("paused");
            m["paused"] = app.IsPaused;
            Post(m);
        }

        public void ShowPage(string page)
        {
            Dictionary<string, object> m = Msg("page");
            m["page"] = page;
            Post(m);
        }

        // Что сейчас играет — для мини-плеера в левой панели
        async void NpTick()
        {
            if (npBusy || !ready || web.CoreWebView2 == null || !Visible || WindowState == FormWindowState.Minimized) return;
            npBusy = true;
            try
            {
                TrackInfo t = await MediaWatcher.Poll(true);
                bool has = t.Title.Length > 0 || t.Artist.Length > 0;
                // при переключении трека плеер на мгновение пропадает — держим прошлое название
                if (has) { npLast = DateTime.Now; npInfo = t; }
                else if ((DateTime.Now - npLast).TotalSeconds < 6 && npInfo != null) t = npInfo;
                Dictionary<string, object> m = Msg("track");
                bool show = t.Title.Length > 0 || t.Artist.Length > 0;
                m["has"] = show;
                m["title"] = t.Title; m["artist"] = t.Artist; m["playing"] = t.Playing;
                m["pos"] = t.NowPos(); m["dur"] = t.DurSec;
                if (t.Key != npKey || (!npCover && t.Cover != null)) { npKey = t.Key; npCover = t.Cover != null; m["cover"] = t.Cover ?? ""; }
                Post(m);
            }
            catch (Exception ex) { Program.Log("np: " + ex.Message); }
            finally { npBusy = false; }
        }

        async void Media(string action, double sec)
        {
            switch (action)
            {
                case "prev": MediaKey(0xB1); break;
                case "next": MediaKey(0xB0); break;
                case "play": MediaKey(0xB3); break;
                case "seek": await MediaWatcher.Seek(sec); break;
            }
            Timer t = new Timer(); t.Interval = 650; t.Tick += delegate { t.Stop(); t.Dispose(); NpTick(); }; t.Start();
        }

        static void MediaKey(byte vk) { keybd_event(vk, 0, 0, IntPtr.Zero); keybd_event(vk, 0, 2, IntPtr.Zero); }

        public void PostClockStatus(string status)
        {
            Dictionary<string, object> m = Msg("clock");
            m["status"] = status;
            Post(m);
        }

        public void PostDiscordStatus(string status)
        {
            Dictionary<string, object> m = Msg("discord");
            m["status"] = status;
            Post(m);
        }

        public void Toast(string text, string icon)
        {
            Dictionary<string, object> m = Msg("toast");
            m["msg"] = text; m["icon"] = icon;
            Post(m);
        }

        static string Str(Dictionary<string, object> d, string k) { object o; return d.TryGetValue(k, out o) && o != null ? Convert.ToString(o) : ""; }
        static bool Bool(Dictionary<string, object> d, string k) { object o; return d.TryGetValue(k, out o) && o != null && (o is bool ? (bool)o : Convert.ToString(o) == "1" || Convert.ToString(o).ToLowerInvariant() == "true"); }

        string PathOf(string id)
        {
            if (string.IsNullOrEmpty(id) || id.IndexOfAny(new[] { '\\', '/' }) >= 0) return null;
            string p = Path.Combine(Program.LibraryDir, id);
            return File.Exists(p) || Directory.Exists(p) ? p : null;
        }

        void OnMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            Dictionary<string, object> m;
            try
            {
                string text = e.TryGetWebMessageAsString();
                m = json.DeserializeObject(text) as Dictionary<string, object>;
                if (m == null) return;
                // Перетащенные в окно файлы приходят отдельным списком
                if (Str(m, "c") == "drop")
                {
                    List<string> files = new List<string>();
                    foreach (object o in e.AdditionalObjects) { CoreWebView2File f = o as CoreWebView2File; if (f != null) files.Add(f.Path); }
                    if (files.Count > 0) Import(files.ToArray());
                    return;
                }
            }
            catch (Exception ex) { Program.Log("ui msg: " + ex.Message); return; }

            try { Dispatch(m); }
            catch (Exception ex) { Program.Log("ui cmd " + Str(m, "c") + ": " + ex); }
        }

        void Dispatch(Dictionary<string, object> m)
        {
            string id = Str(m, "id");
            switch (Str(m, "c"))
            {
                case "shown": Reveal(); break;
                case "ready":
                    ready = true;
                    npKey = null; npCover = false; npTimer.Start(); NpTick();
                    SendState(startPage);
                    break;
                case "apply": { string p = PathOf(id); if (p != null) app.Apply(p); break; }
                case "off": app.TurnOff(); break;
                case "pause": app.TogglePause(); break;
                case "next": app.Next(Bool(m, "random")); break;
                case "fav":
                    Store.SetFav(id, Bool(m, "on"));
                    break;
                case "music":
                    {
                        string p = PathOf(id);
                        if (p != null)
                        {
                            bool on = Bool(m, "on");
                            if (on) app.MusicWallpaper = p; else if (string.Equals(Path.GetFileName(app.MusicWallpaper ?? ""), id, StringComparison.OrdinalIgnoreCase)) Config.MusicWallpaperName = "";
                            Dictionary<string, object> r = Msg("music"); r["id"] = on ? id : null; Post(r);
                            Toast(on ? "Будет играть вместе с музыкой" : "Убрано из музыкальных", "note");
                        }
                        break;
                    }
                case "del": Delete(id); break;
                case "add": AddFiles(); break;
                case "reveal":
                    {
                        string p = PathOf(id);
                        if (p != null) Process.Start("explorer.exe", "/select,\"" + p + "\"");
                        break;
                    }
                case "media":
                    {
                        double sec = 0; double.TryParse(Str(m, "sec"), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out sec);
                        Media(Str(m, "a"), sec);
                        break;
                    }
                case "openurl":
                    {
                        string u = Str(m, "url");
                        if (u.StartsWith("https://discord.com/")) Process.Start(u);
                        break;
                    }
                case "openlib": Process.Start("explorer.exe", "\"" + Program.LibraryDir + "\""); break;
                case "restore":
                    try { Program.CopyBuiltins(true); } catch (Exception ex) { Program.Log("restore: " + ex.Message); }
                    SendState(null);
                    break;
                case "look":
                    {
                        Dictionary<string, object> look = m.ContainsKey("look") ? m["look"] as Dictionary<string, object> : null;
                        Store.SetLook(id, look);
                        app.ApplyLook();
                        break;
                    }
                case "cfg": ApplyCfg(Str(m, "k"), m.ContainsKey("v") ? m["v"] : null); break;
            }
        }

        // Настройка из интерфейса. Значения оформления только запоминаем — их применяет сама страница.
        void ApplyCfg(string k, object v)
        {
            string sv = v is bool ? ((bool)v ? "1" : "0") : Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture);
            bool on = sv == "1" || sv.ToLowerInvariant() == "true";
            int n; int.TryParse(sv, out n);
            switch (k)
            {
                case "theme": Config.Theme = n; Ui.Apply(Config.Theme, Config.AccentColor); app.RestyleWidget(); ApplyChrome(); break;
                case "accent":
                    try
                    {
                        string h = sv.TrimStart('#');
                        Config.AccentColor = Color.FromArgb(Convert.ToInt32(h.Substring(0, 2), 16), Convert.ToInt32(h.Substring(2, 2), 16), Convert.ToInt32(h.Substring(4, 2), 16));
                        Ui.Apply(Config.Theme, Config.AccentColor); app.RestyleWidget();
                    }
                    catch { }
                    break;
                case "radius": Config.Set("uiradius", sv); break;
                case "tile": Config.Set("uitile", sv); break;
                case "zoom": Config.Set("uizoom", sv); break;
                case "anim": Config.SetBool("uianim", on); break;
                case "ss": Config.SetBool("ss", on); app.ConfigureSlideshow(); break;
                case "ssmin": Config.Set("ssmin", sv); app.ConfigureSlideshow(); break;
                case "sssrc": Config.Set("sssrc", sv); break;
                case "ssshuf": Config.SetBool("ssshuf", on); break;
                case "quality": Config.Quality = Math.Max(0, Math.Min(2, n)); app.ScheduleReload(); break;
                case "fps": Config.Set("fps", sv); app.ScheduleReload(); break;
                case "scalepct": Config.Set("scalepct", sv); app.ScheduleReload(); break;
                case "pausecovered": Config.PauseWhenCovered = on; break;
                case "pausebattery": Config.PauseOnBattery = on; break;
                case "lowprio": Config.LowPriority = on; Program.SetPriority(); break;
                case "autostart": try { Autostart.Enabled = on; } catch (Exception ex) { Program.Log("autostart: " + ex.Message); } break;
                case "taskbar": app.SetTaskbar(on); break;
                case "music": app.MusicMode = on; break;
                case "showwin": Config.ShowWindowOnStart = on; break;
                case "widget": app.SetWidget(on); break;
                case "wpos": Config.Set("wpos", sv); app.RestyleWidget(); break;
                case "wartist": Config.SetBool("wartist", on); app.RestyleWidget(); break;
                case "hotkeys": Config.SetBool("hotkeys", on); app.SetHotkeys(on); break;
                case "clock": app.SetClock(on); break;
                case "cpos": Config.Set("cpos", sv); app.RestyleClock(); break;
                case "cstyle": case "cfont": case "ccolor": case "chex": case "cbg": case "cbgcolor": case "cdatefmt": case "cwhere": case "cunits": case "ccity": case "csize": case "calpha": case "cbgalpha": case "cradius": case "cpad": case "cox": case "coy":
                    Config.Set(k, sv); app.RestyleClock(); break;
                case "cshadow": case "c24": case "csec": case "cblink": case "cdate": case "cweek": case "cbat": case "cweather": case "clocked":
                    Config.SetBool(k, on); app.RestyleClock(); break;
                case "discord": Config.SetBool("discord", on); app.ConfigureDiscord(); break;
                case "discordid": Config.Set("discordid", sv.Trim()); app.ConfigureDiscord(); break;
                case "discordprog": Config.SetBool("discordprog", on); break;
                case "discordartist": Config.SetBool("discordartist", on); break;
                case "discordcover": Config.SetBool("discordcover", on); break;
                case "discordcredit": Config.SetBool("discordcredit", on); break;
                case "discordalbum": Config.SetBool("discordalbum", on); break;
                case "discordbtn": Config.SetBool("discordbtn", on); break;
                // виджет музыки
                case "wstyle": case "wbg": case "wcolor": case "wsize": case "wopacity": case "wactive": case "wox": case "woy": case "wwidth": case "wcorner":
                    Config.Set(k, sv); app.RestyleWidget(); break;
                case "wcover": case "wbuttons": case "wprogress": case "wpaused": case "wfull": case "wtaskbar": case "wwheel":
                    Config.SetBool(k, on); app.RestyleWidget(); break;
            }
        }

        // ---------- файлы ----------
        void AddFiles()
        {
            using (OpenFileDialog dlg = new OpenFileDialog())
            {
                dlg.Title = "Выберите обои";
                dlg.Multiselect = true;
                dlg.Filter = "Обои (картинки, GIF, видео, HTML)|*.jpg;*.jpeg;*.png;*.bmp;*.gif;*.webp;*.mp4;*.webm;*.m4v;*.html;*.htm|Все файлы|*.*";
                if (dlg.ShowDialog(this) == DialogResult.OK) Import(dlg.FileNames);
            }
        }

        void Import(string[] files)
        {
            int count = 0;
            foreach (string file in files)
            {
                try
                {
                    if (Directory.Exists(file) && Program.IsSupported(file))
                    {
                        // Папка с обоями Lively — копируем целиком
                        string dir = Path.Combine(Program.LibraryDir, Path.GetFileName(file));
                        if (!Directory.Exists(dir)) CopyDirectory(file, dir);
                        count++;
                        continue;
                    }
                    if (!File.Exists(file) || !Program.IsSupported(file)) continue;
                    string target = Path.Combine(Program.LibraryDir, Path.GetFileName(file));
                    int n = 2;
                    while (File.Exists(target))
                        target = Path.Combine(Program.LibraryDir, Path.GetFileNameWithoutExtension(file) + " (" + n++ + ")" + Path.GetExtension(file));
                    File.Copy(file, target);
                    count++;
                }
                catch (Exception ex) { Program.Log("import: " + ex.Message); }
            }
            SendState(null);
            Toast(count > 0 ? "Добавлено: " + count : "Не удалось добавить файлы", count > 0 ? "check" : "x");
        }

        void Delete(string id)
        {
            string p = PathOf(id);
            if (p == null) return;
            if (string.Equals(p, app.CurrentWallpaper, StringComparison.OrdinalIgnoreCase)) app.TurnOff();
            try
            {
                if (Directory.Exists(p)) Directory.Delete(p, true); else File.Delete(p);
                if (Catalog.Get(id) != null) Program.RememberRemoved(id);
                string thumb = VideoMeta.Thumb(id);
                if (File.Exists(thumb)) File.Delete(thumb);
                Store.SetFav(id, false);
            }
            catch (Exception ex) { Program.Log("delete: " + ex.Message); Toast("Не удалось удалить файл", "x"); return; }
            SendState(null);
            Toast("Удалено из библиотеки", "trash");
        }

        static void CopyDirectory(string source, string target)
        {
            Directory.CreateDirectory(target);
            foreach (string f in Directory.GetFiles(source)) File.Copy(f, Path.Combine(target, Path.GetFileName(f)));
            foreach (string d in Directory.GetDirectories(source)) CopyDirectory(d, Path.Combine(target, Path.GetFileName(d)));
        }
    }

    // Маленькое окошко «Lumora — твой помощник» с полосой загрузки на время запуска
    class LoadingBox : Form
    {
        [System.Runtime.InteropServices.DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);
        readonly Timer timer = new Timer();
        readonly bool light;
        readonly DateTime start = DateTime.Now;

        public LoadingBox(bool light)
        {
            this.light = light;
            AutoScaleMode = AutoScaleMode.None;
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(Ui.S(400), Ui.S(116));
            DoubleBuffered = true;
            // цвета те же, что у окна: тема и акцент из настроек (по умолчанию Обсидиан и #8136f2)
            int th = Config.Theme;
            BackColor = th == 3 ? Color.FromArgb(250, 250, 253) : th == 2 ? Color.FromArgb(6, 6, 8) : th == 1 ? Color.FromArgb(26, 26, 29) : Color.FromArgb(15, 15, 19);
            timer.Interval = 30;
            timer.Tick += delegate { Invalidate(); };
            timer.Start();
        }

        protected override bool ShowWithoutActivation { get { return true; } }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            try { int round = 2; DwmSetWindowAttribute(Handle, 33, ref round, 4); int dark = light ? 0 : 1; DwmSetWindowAttribute(Handle, 20, ref dark, 4); } catch { }
        }

        public void Stop() { timer.Stop(); }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
            g.Clear(BackColor);
            double t = (DateTime.Now - start).TotalSeconds;
            Color fg = light ? Color.FromArgb(24, 26, 38) : Color.FromArgb(240, 241, 248);
            Color mu = light ? Color.FromArgb(110, 114, 134) : Color.FromArgb(150, 156, 182);
            Color ac = Config.AccentColor;

            // «Lumora — твой помощник»
            using (Font fb = new Font("Segoe UI Variable Display", Ui.S(17f), FontStyle.Bold, GraphicsUnit.Pixel))
            using (Font fr = new Font("Segoe UI Variable Text", Ui.S(17f), FontStyle.Regular, GraphicsUnit.Pixel))
            {
                StringFormat sf = StringFormat.GenericTypographic;
                string a = "Lumora", b = "  —  твой помощник";
                float wa = g.MeasureString(a, fb, 1000, sf).Width, wb = g.MeasureString(b, fr, 1000, sf).Width;
                float starW = Ui.S(26), x = (Width - wa - wb - starW) / 2f + starW, y = Ui.S(26);
                // звезда-логотип слева от названия
                float scx = x - starW * 0.55f, scy = y + Ui.S(10), sr = Ui.S(10.5f);
                PointF[] star = new PointF[8];
                for (int i = 0; i < 8; i++) { double ang = i * Math.PI / 4 - Math.PI / 2; float rr = i % 2 == 0 ? sr : sr * 0.24f; star[i] = new PointF(scx + (float)Math.Cos(ang) * rr, scy + (float)Math.Sin(ang) * rr); }
                using (SolidBrush sb = new SolidBrush(ac)) g.FillPolygon(sb, star);
                using (SolidBrush br = new SolidBrush(fg)) g.DrawString(a, fb, br, x, y, sf);
                using (SolidBrush br = new SolidBrush(mu)) g.DrawString(b, fr, br, x + wa, y, sf);
            }

            // полоса из чёрточек «============»: по ней бежит светлая волна
            int n = 26;
            float bw = Ui.S(300), seg = bw / n, gap = Ui.S(3), bh = Ui.S(8), bx = (Width - bw) / 2f, by = Ui.S(72);
            double pos = (t * 1.5) % 1.6 * (n + 6) - 4;
            for (int i = 0; i < n; i++)
            {
                double d = Math.Abs(i - pos);
                double k = Math.Max(0, 1 - d / 5.0);
                Color c = Color.FromArgb((int)(60 + 195 * k), (int)(mu.R + (ac.R - mu.R) * k), (int)(mu.G + (ac.G - mu.G) * k), (int)(mu.B + (ac.B - mu.B) * k));
                using (SolidBrush br = new SolidBrush(c))
                using (GraphicsPath p = Ui.Round(new RectangleF(bx + i * seg, by, seg - gap, bh), Ui.S(2f))) g.FillPath(br, p);
            }
            using (Font fs = new Font("Segoe UI", Ui.S(11f), FontStyle.Regular, GraphicsUnit.Pixel))
            {
                string txt = "Загрузка" + new string('.', (int)(t * 2.5) % 4);
                SizeF sz = g.MeasureString(txt, fs);
                using (SolidBrush br = new SolidBrush(mu)) g.DrawString(txt, fs, br, (Width - 54) / 2f, by + bh + Ui.S(8));
            }
            using (Pen pen = new Pen(Color.FromArgb(light ? 30 : 40, light ? 0 : 255, light ? 0 : 255, light ? 0 : 255))) g.DrawRectangle(pen, 0, 0, Width - 1, Height - 1);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) timer.Dispose();
            base.Dispose(disposing);
        }
    }
}
