// App.cs: приложение в трее — управляет обоями, паузой, музыкой и курсором.

using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace LiveWall
{
    class LiveWallContext : ApplicationContext
    {
        public readonly Icon AppIcon;
        readonly NotifyIcon tray = new NotifyIcon();
        readonly System.Windows.Forms.Timer watchdog = new System.Windows.Forms.Timer();
        readonly System.Windows.Forms.Timer mediaTimer = new System.Windows.Forms.Timer();
        readonly System.Windows.Forms.Timer mouseTimer = new System.Windows.Forms.Timer();
        readonly System.Windows.Forms.Timer displayTimer = new System.Windows.Forms.Timer();
        readonly Control invoker = new Control();
        readonly ToolStripMenuItem pauseItem, offItem, autoItem, taskItem, widgetItem;
        MediaWidget widget;
        HotKeys hotkeys;
        ClockWidget clock;
        DiscordPresence discord;
        readonly System.Windows.Forms.Timer discordTimer = new System.Windows.Forms.Timer();
        bool discordPolling;
        readonly System.Windows.Forms.Timer slideTimer = new System.Windows.Forms.Timer(), reloadTimer = new System.Windows.Forms.Timer();
        DateTime lastChange = DateTime.Now, uiBusyUntil = DateTime.MinValue;
        readonly Random random = new Random();
        WallpaperHost host;
        SettingsForm settings;
        bool userPaused, locked, polling, musicShowing, musicSuppressed;
        int coveredTicks;
        DateTime lastPlaying;
        TrackInfo track;
        AudioAnalyzer audio;
        // последнее отправленное состояние курсора
        bool lastInside, lastDown;
        double lastX = -1, lastY = -1;

        public string CurrentWallpaper { get; private set; }
        public bool IsPaused { get { return userPaused; } }

        // Обои, которые включаются во время музыки
        public string MusicWallpaper
        {
            get
            {
                string name = Config.MusicWallpaperName;
                foreach (string candidate in new[] { name, "Music TV (LQ)", "Обложка и эквалайзер.html" })
                {
                    if (string.IsNullOrEmpty(candidate)) continue;
                    string path = Path.Combine(Program.LibraryDir, candidate);
                    if (File.Exists(path) || Directory.Exists(path)) return path;
                }
                return null;
            }
            set
            {
                Config.MusicWallpaperName = Path.GetFileName(value);
                if (musicShowing && host != null && value != null) host.SetWallpaper(value);
            }
        }

        public bool MusicMode
        {
            get { return Config.MusicMode; }
            set
            {
                Config.MusicMode = value;
                if (!value && musicShowing) StopMusic();
            }
        }

        public LiveWallContext(bool showSettings, EventWaitHandle showSignal)
        {
            AppIcon = LoadIcon();
            invoker.CreateControl();

            ContextMenuStrip menu = new ContextMenuStrip();
            ToolStripMenuItem open = new ToolStripMenuItem("Открыть Lumora", null, delegate { ShowSettings(null); });
            open.Font = new Font(open.Font, FontStyle.Bold);
            menu.Items.Add(open);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Следующие обои", null, delegate { Next(false); });
            menu.Items.Add("Случайные обои", null, delegate { Next(true); });
            pauseItem = new ToolStripMenuItem("Пауза", null, delegate { TogglePause(); });
            menu.Items.Add(pauseItem);
            offItem = new ToolStripMenuItem("Выключить обои", null, delegate { if (CurrentWallpaper == null) RestoreLast(); else TurnOff(); });
            menu.Items.Add(offItem);
            menu.Items.Add(new ToolStripSeparator());
            autoItem = new ToolStripMenuItem("Запускать вместе с Windows", null, delegate { try { Autostart.Enabled = !Autostart.Enabled; } catch (Exception ex) { Program.Log("autostart: " + ex.Message); } });
            menu.Items.Add(autoItem);
            taskItem = new ToolStripMenuItem("Прозрачная панель задач", null, delegate { SetTaskbar(!Config.TransparentTaskbar); });
            menu.Items.Add(taskItem);
            widgetItem = new ToolStripMenuItem("Виджет музыки", null, delegate { SetWidget(!Config.MediaWidget); });
            menu.Items.Add(widgetItem);
            menu.Items.Add("Выход", null, delegate { ExitApp(); });
            menu.Opening += delegate
            {
                autoItem.Checked = Autostart.Enabled;
                taskItem.Checked = Config.TransparentTaskbar;
                widgetItem.Checked = Config.MediaWidget;
                offItem.Text = CurrentWallpaper == null ? "Включить обои" : "Выключить обои";
            };
            tray.ContextMenuStrip = menu;
            tray.Icon = AppIcon;
            tray.Text = "Lumora";
            tray.Visible = true;
            tray.MouseClick += delegate(object s, MouseEventArgs e) { if (e.Button == MouseButtons.Left) ShowSettings(null); };

            // Повторный запуск программы открывает окно настроек
            ThreadPool.RegisterWaitForSingleObject(showSignal, delegate { try { invoker.BeginInvoke((MethodInvoker)delegate { ShowSettings(null); }); } catch { } }, null, -1, false);

            // Блокировка экрана и сон — обои замирают
            SystemEvents.SessionSwitch += OnSessionSwitch;
            SystemEvents.PowerModeChanged += OnPowerMode;
            SystemEvents.DisplaySettingsChanged += OnDisplayChanged;
            displayTimer.Interval = 1200;
            displayTimer.Tick += delegate { displayTimer.Stop(); if (host != null && host.IsAlive) host.Fit(); };

            Autostart.Repair();
            if (Config.MediaWidget) SetWidget(true);
            if (Config.GetBool("clock", false)) SetClock(true);
            if (Config.GetBool("hotkeys", true)) SetHotkeys(true);
            slideTimer.Interval = 20000; slideTimer.Tick += delegate { SlideTick(); };
            ConfigureSlideshow();
            discordTimer.Interval = 4000; discordTimer.Tick += delegate { DiscordTick(); };
            ConfigureDiscord();
            reloadTimer.Interval = 450; reloadTimer.Tick += delegate { reloadTimer.Stop(); ReloadWallpaper(); };
            if (Config.TransparentTaskbar) Taskbar.Apply(true);
            RestoreLast();

            watchdog.Interval = 1000;
            watchdog.Tick += delegate { Watch(); };
            watchdog.Start();

            mediaTimer.Interval = 2000;
            mediaTimer.Tick += delegate { PollMedia(); };

            mouseTimer.Interval = 40;
            mouseTimer.Tick += delegate { MouseTick(); };

            if (showSettings) ShowSettings(null);
        }

        static Icon LoadIcon()
        {
            try { Icon i = Icon.ExtractAssociatedIcon(Application.ExecutablePath); if (i != null) return i; } catch { }
            return CreateIcon();
        }

        static Icon CreateIcon()
        {
            using (Bitmap bmp = new Bitmap(32, 32))
            {
                using (Graphics g = Graphics.FromImage(bmp))
                using (LinearGradientBrush brush = new LinearGradientBrush(new Rectangle(0, 0, 32, 32), Color.FromArgb(90, 140, 255), Color.FromArgb(200, 90, 230), 45f))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.FillEllipse(brush, 2, 2, 28, 28);
                    g.FillEllipse(Brushes.White, 11, 9, 10, 10);
                }
                return Icon.FromHandle(bmp.GetHicon());
            }
        }

        void OnSessionSwitch(object sender, SessionSwitchEventArgs e)
        {
            if (e.Reason == SessionSwitchReason.SessionLock || e.Reason == SessionSwitchReason.ConsoleDisconnect || e.Reason == SessionSwitchReason.RemoteDisconnect) locked = true;
            else if (e.Reason == SessionSwitchReason.SessionUnlock || e.Reason == SessionSwitchReason.ConsoleConnect || e.Reason == SessionSwitchReason.RemoteConnect) locked = false;
            else return;
            try { invoker.BeginInvoke((MethodInvoker)UpdatePause); } catch { }
        }

        void OnDisplayChanged(object sender, EventArgs e)
        {
            try { invoker.BeginInvoke((MethodInvoker)delegate { displayTimer.Stop(); displayTimer.Start(); }); } catch { }
        }

        void OnPowerMode(object sender, PowerModeChangedEventArgs e)
        {
            if (e.Mode == PowerModes.Suspend) locked = true;
            else if (e.Mode == PowerModes.Resume) locked = false;
            else return;
            try { invoker.BeginInvoke((MethodInvoker)UpdatePause); } catch { }
        }

        // ---------- обои ----------
        void RestoreLast()
        {
            string saved = File.Exists(Program.CurrentPath) ? File.ReadAllText(Program.CurrentPath).Trim() : "";
            string path = saved.Length > 0 ? Path.Combine(Program.LibraryDir, saved) : null;
            if (path != null && (File.Exists(path) || Directory.Exists(path))) { Apply(path); return; }
            if (!File.Exists(Program.CurrentPath))
            {
                // Первый запуск — красивые обои по умолчанию
                foreach (string name in new[] { "Lumora — частицы.html", "Закат над океаном.html", "Туманность.html", "Созвездие.html" })
                {
                    string def = Path.Combine(Program.LibraryDir, name);
                    if (File.Exists(def)) { Apply(def); return; }
                }
            }
        }

        public void Apply(string path)
        {
            if (!File.Exists(path) && !Directory.Exists(path)) return;
            CurrentWallpaper = path;
            lastChange = DateTime.Now;
            Store.AddRecent(Path.GetFileName(path));
            try { File.WriteAllText(Program.CurrentPath, Path.GetFileName(path)); } catch { }
            // Выбрали обои вручную во время музыки — показываем их, музыка вернётся со следующим запуском плеера
            if (musicShowing) { musicShowing = false; musicSuppressed = true; }
            ShowOnDesktop(path);
            NotifyChanged();
        }

        void ShowOnDesktop(string path)
        {
            if (host == null || !host.IsAlive)
            {
                if (Native.FindWindow("Progman", null) == IntPtr.Zero) return; // рабочий стол ещё не готов — Watch() повторит попытку
                CreateHost();
            }
            host.SetWallpaper(path);
            ApplyLook();
            UpdateServices();
        }

        // Накладывает «вид» (яркость, цвет, размытие…) на то, что сейчас показано
        public void ApplyLook()
        {
            if (host == null) return;
            string shown = musicShowing && MusicWallpaper != null ? MusicWallpaper : CurrentWallpaper;
            bool sound;
            string script = Store.LookScript(shown == null ? null : Path.GetFileName(shown), out sound);
            host.SetLook(script, sound);
        }

        void NotifyChanged() { if (settings != null && !settings.IsDisposed) settings.RefreshState(); }

        // Несколько настроек качества подряд — перезагружаем обои один раз
        public void ScheduleReload() { reloadTimer.Stop(); reloadTimer.Start(); }

        public void ReloadWallpaper() { if (host != null) host.Reload(); }

        public void TurnOff()
        {
            CurrentWallpaper = null;
            try { File.WriteAllText(Program.CurrentPath, ""); } catch { }
            if (musicShowing) { musicShowing = false; musicSuppressed = true; }
            DestroyHost();
            Native.RefreshDesktop();
            NotifyChanged();
        }

        public void Next(bool randomPick) { Step(randomPick ? 0 : 1, null); }
        public void Prev() { Step(-1, null); }

        // Следующие обои из списка: dir = 1 вперёд, -1 назад, 0 случайные. pool — из чего выбирать (null — вся библиотека)
        void Step(int dir, List<string> pool)
        {
            List<string> items = pool ?? Program.LibraryItems();
            if (items.Count == 0) return;
            int i = items.FindIndex(p => string.Equals(p, CurrentWallpaper, StringComparison.OrdinalIgnoreCase));
            int n;
            if (dir == 0)
            {
                n = random.Next(items.Count);
                if (items.Count > 1 && n == i) n = (n + 1) % items.Count;
            }
            else n = i < 0 ? 0 : ((i + dir) % items.Count + items.Count) % items.Count;
            Apply(items[n]);
        }

        public void TogglePause()
        {
            userPaused = !userPaused;
            pauseItem.Checked = userPaused;
            UpdatePause();
            if (settings != null && !settings.IsDisposed) settings.RefreshPause();
        }

        // ---------- автоматическая смена обоев ----------
        public void ConfigureSlideshow()
        {
            lastChange = DateTime.Now;
            if (Config.GetBool("ss", false)) slideTimer.Start(); else slideTimer.Stop();
        }

        List<string> SlidePool()
        {
            string src = Config.Get("sssrc", "all");
            IEnumerable<string> q = Program.LibraryItems();
            if (src == "favs") q = q.Where(p => Store.Favs.Contains(Path.GetFileName(p)));
            else if (src == "video" || src == "html" || src == "art") q = q.Where(p => Studio.TypeOf(p) == src);
            return q.ToList();
        }

        void SlideTick()
        {
            if (!Config.GetBool("ss", false) || userPaused || locked || musicShowing || CurrentWallpaper == null) return;
            if ((DateTime.Now - lastChange).TotalMinutes < Math.Max(1, Config.GetInt("ssmin", 15))) return;
            List<string> pool = SlidePool();
            if (pool.Count < 2) { lastChange = DateTime.Now; return; }
            Step(Config.GetBool("ssshuf", true) ? 0 : 1, pool);
        }

        // ---------- горячие клавиши ----------
        public void SetHotkeys(bool on)
        {
            if (on && hotkeys == null)
            {
                hotkeys = new HotKeys();
                hotkeys.Pressed += delegate(int id)
                {
                    switch (id)
                    {
                        case 1: Next(false); break;
                        case 2: Prev(); break;
                        case 3: Next(true); break;
                        case 4: TogglePause(); break;
                        case 5: ShowSettings(null); break;
                    }
                };
            }
            else if (!on && hotkeys != null) { hotkeys.Dispose(); hotkeys = null; }
        }

        // ---------- Discord: «Слушает …» ----------
        public string DiscordStatus { get { return discord == null ? "Выключено" : discord.Status; } }

        public void ConfigureDiscord()
        {
            string id = Config.Get("discordid", "").Trim();
            bool on = Config.GetBool("discord", false) && id.Length > 0;
            if (on)
            {
                if (discord == null)
                {
                    discord = new DiscordPresence();
                    discord.StatusChanged += delegate { try { invoker.BeginInvoke((MethodInvoker)delegate { if (settings != null && !settings.IsDisposed) settings.PostDiscordStatus(DiscordStatus); }); } catch { } };
                }
                discordTimer.Start();
                DiscordTick();
            }
            else
            {
                discordTimer.Stop();
                if (discord != null) discord.Update("", null, false, false);
                if (settings != null && !settings.IsDisposed) settings.PostDiscordStatus(Config.GetBool("discord", false) ? "Введите Application ID" : "Выключено");
            }
        }

        async void DiscordTick()
        {
            if (discordPolling || discord == null) return;
            discordPolling = true;
            try
            {
                TrackInfo t = await MediaWatcher.Poll(true);
                TrackInfoLite lite = null;
                if (t.Title.Length > 0)
                {
                    lite = new TrackInfoLite { Title = t.Title, Artist = t.Artist, Playing = t.Playing, PosSec = t.NowPos(), DurSec = t.DurSec };
                    // Обложка: ищем в iTunes / Deezer (один раз на трек), в фоне
                    if (Config.GetBool("discordcover", true))
                    {
                        string cached = CoverFinder.Cached(t.Artist, t.Title);
                        if (cached == null)
                        {
                            CoverFinder.Mark(t.Artist, t.Title);
                            string a = t.Artist, ti = t.Title;
                            System.Threading.ThreadPool.QueueUserWorkItem(delegate
                            {
                                CoverFinder.Find(a, ti);
                                try { invoker.BeginInvoke((MethodInvoker)DiscordTick); } catch { }
                            });
                        }
                        else if (cached.Length > 0) { lite.Cover = cached; lite.Album = CoverFinder.CachedAlbum(t.Artist, t.Title); }
                    }
                }
                if (discord != null) discord.Update(Config.Get("discordid", ""), lite, Config.GetBool("discordprog", true), Config.GetBool("discordartist", true), Config.GetBool("discordalbum", true), Config.GetBool("discordbtn", true));
            }
            catch (Exception ex) { Program.Log("discord tick: " + ex.Message); }
            finally { discordPolling = false; }
        }

        // ---------- виджет времени ----------
        public string ClockStatus { get { return clock == null ? "" : clock.Status; } }

        public void SetClock(bool on)
        {
            Config.SetBool("clock", on);
            if (on && clock == null)
            {
                clock = new ClockWidget();
                clock.CreateControl();
                clock.StatusChanged += delegate { try { invoker.BeginInvoke((MethodInvoker)delegate { if (settings != null && !settings.IsDisposed) settings.PostClockStatus(ClockStatus); }); } catch { } };
            }
            if (clock != null) clock.Enable(on);
        }

        public void RestyleClock() { if (clock != null) clock.Restyle(); }

        public void RestyleWidget() { if (widget != null) widget.Restyle(); if (clock != null) clock.Restyle(); }

        void CreateHost()
        {
            DestroyHost();
            host = new WallpaperHost();
            host.PageReady += delegate { if (track != null && (musicShowing || host.WantsAudio)) host.Post(track.ToJson()); };
            host.CapsChanged += delegate { UpdateServices(); };
            host.Show();
        }

        void DestroyHost()
        {
            StopAudio();
            mediaTimer.Stop(); mouseTimer.Stop();
            if (host == null) return;
            try { host.Close(); host.Dispose(); } catch { }
            host = null;
        }

        // ---------- слежение за состоянием ----------
        public void SetWidget(bool on)
        {
            Config.MediaWidget = on;
            if (on && widget == null) { widget = new MediaWidget(); widget.CreateControl(); }
            if (widget != null) widget.Enable(on);
        }

        public void SetTaskbar(bool on)
        {
            Config.TransparentTaskbar = on;
            Taskbar.Apply(on);
        }

        void Watch()
        {
            if (Config.TransparentTaskbar) Taskbar.Keep();
            if (CurrentWallpaper == null && !musicShowing) return;
            if (host == null || !host.IsAlive)
            {
                // Explorer перезапустился (или ещё не запустился) — встраиваемся заново
                if (Native.FindWindow("Progman", null) == IntPtr.Zero) return;
                CreateHost();
                string path = musicShowing && MusicWallpaper != null ? MusicWallpaper : CurrentWallpaper;
                if (path != null) host.SetWallpaper(path);
                UpdateServices();
                return;
            }
            UpdatePause();
        }

        void UpdatePause()
        {
            if (host == null) return;
            PauseMode mode = PauseMode.None;
            if (userPaused || locked) mode = PauseMode.Freeze;
            else if (Config.PauseOnBattery && SystemInformation.PowerStatus.PowerLineStatus == PowerLineStatus.Offline) mode = PauseMode.Freeze;
            else if (Config.PauseWhenCovered || Config.TransparentTaskbar)
            {
                // Усыпляем, только если окна закрывают рабочий стол две проверки подряд (без миганий)
                coveredTicks = Native.AllScreensCovered() && DateTime.Now >= uiBusyUntil ? coveredTicks + 1 : 0;
                if (coveredTicks >= 2 && Config.PauseWhenCovered) mode = PauseMode.Hide;
            }
            else coveredTicks = 0;
            if (Config.TransparentTaskbar) Taskbar.SetCovered(coveredTicks >= 2);
            host.SetPause(mode);
            UpdateServices();
        }

        // Звук, медиа-опрос и курсор работают только когда обоям это действительно нужно
        void UpdateServices()
        {
            bool visible = host != null && !host.Paused;
            bool wantAudio = visible && (musicShowing || host.WantsAudio);
            if (wantAudio) EnsureAudio(); else StopAudio();
            bool wantMedia = host != null && !userPaused && !locked && host.Pause != PauseMode.Hide && (Config.MusicMode || host.WantsAudio);
            if (wantMedia && !mediaTimer.Enabled) { mediaTimer.Start(); PollMedia(); }
            else if (!wantMedia && mediaTimer.Enabled) mediaTimer.Stop();
            bool wantMouse = visible && host.WantsMouse;
            if (wantMouse && !mouseTimer.Enabled) mouseTimer.Start();
            else if (!wantMouse && mouseTimer.Enabled) { mouseTimer.Stop(); lastInside = false; }
        }

        // ---------- курсор на рабочем столе ----------
        void MouseTick()
        {
            if (host == null || !host.WantsMouse || host.Paused) return;
            Point p;
            bool inside = Native.CursorOnDesktop(out p);
            bool down = inside && (Native.GetAsyncKeyState(0x01) & 0x8000) != 0;
            Rectangle a = SystemInformation.VirtualScreen;
            double nx = (p.X - a.Left) / (double)Math.Max(1, a.Width), ny = (p.Y - a.Top) / (double)Math.Max(1, a.Height);
            if (inside == lastInside && down == lastDown && (!inside || (Math.Abs(nx - lastX) < 0.0004 && Math.Abs(ny - lastY) < 0.0004))) return;
            lastInside = inside; lastDown = down; lastX = nx; lastY = ny;
            host.Post("{\"type\":\"mouse\",\"x\":" + nx.ToString("0.####", CultureInfo.InvariantCulture) + ",\"y\":" + ny.ToString("0.####", CultureInfo.InvariantCulture) +
                      ",\"down\":" + (down ? "true" : "false") + ",\"inside\":" + (inside ? "true" : "false") + "}");
        }

        // ---------- музыка ----------
        async void PollMedia()
        {
            if (polling || host == null) return;
            polling = true;
            try
            {
                TrackInfo info = await MediaWatcher.Poll();
                if (host == null) return;
                bool reactive = host.WantsAudio && !musicShowing;
                if (info.Playing)
                {
                    lastPlaying = DateTime.Now;
                    if (!reactive && Config.MusicMode && !musicShowing && !musicSuppressed) StartMusic();
                    bool changed = track == null || track.Key != info.Key || (track.Cover == null && info.Cover != null);
                    track = info;
                    if ((musicShowing || host.WantsAudio) && changed && host != null) host.Post(track.ToJson());
                }
                else if ((DateTime.Now - lastPlaying).TotalSeconds > 4)
                {
                    musicSuppressed = false;
                    if (track != null)
                    {
                        track = null;
                        if (host != null && host.WantsAudio) host.Post(new TrackInfo().ToJson());
                    }
                    if (musicShowing) StopMusic();
                }
            }
            catch (Exception ex) { Program.Log("Media: " + ex.Message); }
            finally { polling = false; }
        }

        void StartMusic()
        {
            string music = MusicWallpaper;
            if (music == null) return;
            musicShowing = true;
            if (host == null || !host.IsAlive) CreateHost();
            host.SetWallpaper(music);
            ApplyLook();
            UpdateServices();
        }

        void StopMusic()
        {
            musicShowing = false;
            if (CurrentWallpaper != null)
            {
                if (host == null || !host.IsAlive) CreateHost();
                host.SetWallpaper(CurrentWallpaper);
                ApplyLook();
                UpdateServices();
            }
            else
            {
                DestroyHost();
                Native.RefreshDesktop();
            }
        }

        void EnsureAudio()
        {
            if (audio != null) return;
            audio = new AudioAnalyzer();
            audio.Spectrum += delegate(float[] bands)
            {
                string json = AudioAnalyzer.ToJson(bands);
                try { invoker.BeginInvoke((MethodInvoker)delegate { if (host != null && !host.Paused) host.Post(json); }); }
                catch { }
            };
        }

        void StopAudio()
        {
            if (audio != null) { audio.Dispose(); audio = null; }
        }

        // ---------- окно настроек ----------
        public void ShowSettings(string page)
        {
            if (settings == null || settings.IsDisposed)
            {
                // Пока окно создаётся, обои не должны быть «спящими»: у спящего движка новое окно браузера не запускается
                uiBusyUntil = DateTime.Now.AddSeconds(12);
                if (host != null && host.Pause == PauseMode.Hide) host.SetPause(PauseMode.None);
                coveredTicks = 0;
                SettingsForm f = new SettingsForm(this, page);
                // Закрытое окно освобождает память целиком — в трее программа почти ничего не занимает
                f.FormClosed += delegate { if (settings == f) settings = null; GC.Collect(); };
                settings = f;
            }
            else if (page != null) settings.ShowPage(page);
            settings.Show();
            if (settings.WindowState == FormWindowState.Minimized) settings.WindowState = FormWindowState.Normal;
            settings.Activate();
        }

        void ExitApp()
        {
            watchdog.Stop(); mediaTimer.Stop(); mouseTimer.Stop();
            SystemEvents.SessionSwitch -= OnSessionSwitch;
            SystemEvents.PowerModeChanged -= OnPowerMode;
            SystemEvents.DisplaySettingsChanged -= OnDisplayChanged;
            StopAudio();
            if (widget != null) { widget.Enable(false); widget.Dispose(); }
            if (clock != null) { clock.Enable(false); clock.Dispose(); }
            if (hotkeys != null) { hotkeys.Dispose(); hotkeys = null; }
            slideTimer.Stop(); reloadTimer.Stop(); discordTimer.Stop();
            if (discord != null) { discord.Update("", null, false, false); discord.Dispose(); discord = null; }
            tray.Visible = false;
            if (settings != null && !settings.IsDisposed) settings.Dispose();
            DestroyHost();
            Native.RefreshDesktop();
            ExitThread();
        }
    }

    // Глобальные горячие клавиши Ctrl+Alt+…
    class HotKeys : NativeWindow, IDisposable
    {
        [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr hwnd, int id, uint modifiers, uint vk);
        [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool UnregisterHotKey(IntPtr hwnd, int id);
        const uint MOD_ALT = 1, MOD_CONTROL = 2, MOD_NOREPEAT = 0x4000;
        static readonly uint[] Keys = { 0x27 /* → */, 0x25 /* ← */, 0x52 /* R */, 0x50 /* P */, 0x4C /* L */ };

        public event Action<int> Pressed;

        public HotKeys()
        {
            CreateHandle(new CreateParams());
            for (int i = 0; i < Keys.Length; i++)
                if (!RegisterHotKey(Handle, i + 1, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, Keys[i])) Program.Log("hotkey " + (i + 1) + " занята другой программой");
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == 0x0312)
            {
                Action<int> h = Pressed;
                if (h != null) h(m.WParam.ToInt32());
            }
            base.WndProc(ref m);
        }

        public void Dispose()
        {
            for (int i = 0; i < Keys.Length; i++) UnregisterHotKey(Handle, i + 1);
            DestroyHandle();
        }
    }
}
