// LiveWall — живые обои для Windows 10/11.
// Core.cs: точка входа, настройки, каталог обоев, автозагрузка, WinAPI.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace LiveWall
{
    static class Program
    {
        // Версия набора встроенных обоев: при смене они заново копируются в библиотеку
        public static readonly string AppDir = Path.GetDirectoryName(Application.ExecutablePath);
        public static readonly string DataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LiveWall");
        public static readonly string LibraryDir = Path.Combine(DataDir, "Library");
        public static readonly string CurrentPath = Path.Combine(DataDir, "current.txt");
        public static readonly string[] Extensions = { ".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp", ".mp4", ".webm", ".m4v", ".html", ".htm" };

        [STAThread]
        static void Main(string[] args)
        {
            bool firstInstance;
            using (Mutex mutex = new Mutex(true, "Local\\LiveWallApp", out firstInstance))
            using (EventWaitHandle showSignal = new EventWaitHandle(false, EventResetMode.AutoReset, "Local\\LiveWallShow"))
            {
                // Программа уже запущена — просто открываем её окно
                if (!firstInstance) { showSignal.Set(); return; }

                // Чёткая картинка на экранах с масштабом 125–200%
                Native.EnableDpiAwareness();

                Directory.CreateDirectory(LibraryDir);
                try { CopyBuiltins(false); } catch (Exception ex) { Log("builtins: " + ex.Message); }
                SetPriority();

                Ui.Apply(Config.Theme, Config.AccentColor);
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                // Ошибки пишем в лог, а не показываем окном поверх всего
                Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                Application.ThreadException += delegate(object s, ThreadExceptionEventArgs e) { Log(e.Exception.ToString()); };
                AppDomain.CurrentDomain.UnhandledException += delegate(object s, UnhandledExceptionEventArgs e) { Log("fatal: " + e.ExceptionObject); };
                bool background = args.Contains("--background");
                Application.Run(new LiveWallContext(!background || Config.ShowWindowOnStart, showSignal));
            }
        }

        // Одна общая среда WebView2 на всё приложение (обои и окно управления) — так они делят браузерный процесс
        static System.Threading.Tasks.Task<Microsoft.Web.WebView2.Core.CoreWebView2Environment> sharedEnv;
        public static System.Threading.Tasks.Task<Microsoft.Web.WebView2.Core.CoreWebView2Environment> WebEnv()
        {
            if (sharedEnv == null || sharedEnv.IsFaulted || sharedEnv.IsCanceled)
                sharedEnv = Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(null, Path.Combine(DataDir, "WebView2"),
                    new Microsoft.Web.WebView2.Core.CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required --disable-features=Translate,msSmartScreenProtection"));
            return sharedEnv;
        }

        public static void SetPriority()
        {
            try { Process.GetCurrentProcess().PriorityClass = Config.LowPriority ? ProcessPriorityClass.BelowNormal : ProcessPriorityClass.Normal; } catch { }
        }

        static string RemovedPath { get { return Path.Combine(DataDir, "removed.txt"); } }

        public static List<string> RemovedBuiltins()
        {
            try { if (File.Exists(RemovedPath)) return File.ReadAllLines(RemovedPath).Where(l => l.Trim().Length > 0).ToList(); }
            catch { }
            return new List<string>();
        }

        public static void RememberRemoved(string fileName)
        {
            List<string> list = RemovedBuiltins();
            if (!list.Contains(fileName, StringComparer.OrdinalIgnoreCase)) list.Add(fileName);
            try { File.WriteAllLines(RemovedPath, list.ToArray()); } catch { }
        }

        // Встроенные обои копируются в библиотеку, чтобы их можно было удалять.
        // При обновлении программы (новая версия набора) файлы обновляются, удалённые пользователем не возвращаются.
        public static void CopyBuiltins(bool force)
        {
            string source = Path.Combine(AppDir, "builtin");
            string marker = Path.Combine(DataDir, "builtins.done");
            if (!Directory.Exists(source)) return;
            string versionFile = Path.Combine(source, "version.txt");
            string version = File.Exists(versionFile) ? File.ReadAllText(versionFile).Trim() : "0";
            if (!force && File.Exists(marker) && File.ReadAllText(marker).Trim() == version) return;
            if (force) { try { File.Delete(RemovedPath); } catch { } }
            List<string> removed = RemovedBuiltins();
            foreach (string file in Directory.GetFiles(source))
            {
                string ext = Path.GetExtension(file).ToLowerInvariant();
                if (ext != ".html" && ext != ".htm") continue;
                string name = Path.GetFileName(file);
                if (removed.Contains(name, StringComparer.OrdinalIgnoreCase)) continue;
                File.Copy(file, Path.Combine(LibraryDir, name), true);
            }
            // Картинки для «живых артов» лежат в подпапке art (обоями сами не считаются)
            string art = Path.Combine(source, "art");
            if (Directory.Exists(art))
            {
                string target = Path.Combine(LibraryDir, "art");
                Directory.CreateDirectory(target);
                foreach (string file in Directory.GetFiles(art))
                {
                    string to = Path.Combine(target, Path.GetFileName(file));
                    if (force || !File.Exists(to)) File.Copy(file, to, true);
                }
            }
            File.WriteAllText(marker, version);
        }

        public static void Log(string text)
        {
            try
            {
                string path = Path.Combine(DataDir, "error.log");
                // Лог не должен разрастаться
                if (File.Exists(path) && new FileInfo(path).Length > 512 * 1024) File.Delete(path);
                File.AppendAllText(path, DateTime.Now.ToString("s") + "  " + text + Environment.NewLine);
            }
            catch { }
        }

        public static bool IsSupported(string path)
        {
            if (Directory.Exists(path))
                return File.Exists(Path.Combine(path, "LivelyInfo.json")) || File.Exists(Path.Combine(path, "index.html"));
            return Extensions.Contains(Path.GetExtension(path).ToLowerInvariant());
        }

        // Все обои библиотеки: файлы и папки в формате Lively
        public static List<string> LibraryItems()
        {
            return Directory.GetFileSystemEntries(LibraryDir)
                .Where(IsSupported)
                .OrderBy(p => DisplayName(p), StringComparer.CurrentCultureIgnoreCase)
                .ToList();
        }

        // LivelyInfo.json из папки обоев Lively (или пустой словарь)
        public static Dictionary<string, object> LivelyInfo(string dir)
        {
            string file = Path.Combine(dir, "LivelyInfo.json");
            try
            {
                if (File.Exists(file))
                    return new System.Web.Script.Serialization.JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(file));
            }
            catch { }
            return new Dictionary<string, object>();
        }

        public static string InfoString(Dictionary<string, object> info, string key)
        {
            object v;
            return info.TryGetValue(key, out v) && v != null ? v.ToString() : "";
        }

        public static string DisplayName(string path)
        {
            if (Directory.Exists(path))
            {
                string title = InfoString(LivelyInfo(path), "Title");
                return title.Length > 0 ? title : Path.GetFileName(path);
            }
            return Path.GetFileNameWithoutExtension(path);
        }

        // Главный файл обоев: для папки Lively — её FileName, для обычного файла — он сам
        public static string EntryFile(string path)
        {
            if (!Directory.Exists(path)) return path;
            string name = InfoString(LivelyInfo(path), "FileName");
            return Path.Combine(path, name.Length > 0 ? name : "index.html");
        }

        public static string KindOf(string path)
        {
            if (Directory.Exists(path))
            {
                string args = InfoString(LivelyInfo(path), "Arguments");
                return args.Contains("nowplaying") || args.Contains("--audio") ? "Lively · музыка" : "Lively";
            }
            string ext = Path.GetExtension(path).ToLowerInvariant();
            if (ext == ".gif") return "GIF";
            if (ext == ".mp4" || ext == ".webm" || ext == ".m4v") return "Видео";
            if (ext == ".html" || ext == ".htm") return "Анимация";
            return "Картинка";
        }
    }

    // ---------- Настройки (простой файл settings.ini) ----------
    static class Config
    {
        static readonly string FilePath = Path.Combine(Program.DataDir, "settings.ini");
        static Dictionary<string, string> values;

        static void Load()
        {
            if (values != null) return;
            values = new Dictionary<string, string>();
            try
            {
                if (File.Exists(FilePath))
                    foreach (string line in File.ReadAllLines(FilePath))
                    {
                        int i = line.IndexOf('=');
                        if (i > 0) values[line.Substring(0, i).Trim()] = line.Substring(i + 1).Trim();
                    }
            }
            catch { }
        }

        public static string Get(string key, string def)
        {
            Load();
            string v;
            return values.TryGetValue(key, out v) ? v : def;
        }

        public static void Set(string key, string value)
        {
            Load();
            values[key] = value;
            try { File.WriteAllLines(FilePath, values.Select(p => p.Key + "=" + p.Value).ToArray()); } catch { }
        }

        public static int GetInt(string key, int def) { int v; return int.TryParse(Get(key, ""), out v) ? v : def; }
        public static bool GetBool(string key, bool def) { return Get(key, def ? "1" : "0") == "1"; }
        public static void SetBool(string key, bool value) { Set(key, value ? "1" : "0"); }

        // 0 — экономный, 1 — обычный, 2 — максимальный
        public static int Quality
        {
            get { int q; return int.TryParse(Get("quality", "1"), out q) && q >= 0 && q <= 2 ? q : 1; }
            set { Set("quality", value.ToString()); }
        }

        public static int Fps
        {
            get
            {
                int f;
                if (int.TryParse(Get("fps", ""), out f) && f >= 5 && f <= 144) return f;
                return Quality == 0 ? 24 : Quality == 2 ? 60 : 30;
            }
        }
        public static string QualityScale
        {
            get
            {
                int p;
                if (int.TryParse(Get("scalepct", ""), out p) && p >= 40 && p <= 200) return (p / 100.0).ToString("0.##", System.Globalization.CultureInfo.InvariantCulture);
                return Quality == 0 ? "0.75" : Quality == 2 ? "1.5" : "1";
            }
        }

        public static bool LowPriority
        {
            get { return GetBool("lowprio", true); }
            set { SetBool("lowprio", value); }
        }

        public static bool ShowWindowOnStart
        {
            get { return GetBool("showwin", false); }
            set { SetBool("showwin", value); }
        }

        public static bool PauseWhenCovered
        {
            get { return GetBool("pausecovered", true); }
            set { SetBool("pausecovered", value); }
        }

        public static int Theme
        {
            get { int v; return int.TryParse(Get("theme", "0"), out v) && v >= 0 && v < Ui.Themes.Length ? v : 0; }
            set { Set("theme", value.ToString()); }
        }

        public static Color AccentColor
        {
            get
            {
                try { string h = Get("accent", ""); if (h.Length == 6) return Color.FromArgb(Convert.ToInt32(h.Substring(0, 2), 16), Convert.ToInt32(h.Substring(2, 2), 16), Convert.ToInt32(h.Substring(4, 2), 16)); }
                catch { }
                return Color.FromArgb(129, 54, 242);
            }
            set { Set("accent", value.R.ToString("X2") + value.G.ToString("X2") + value.B.ToString("X2")); }
        }

        public static bool MediaWidget
        {
            get { return GetBool("widget", true); }
            set { SetBool("widget", value); }
        }

        public static bool TransparentTaskbar
        {
            get { return GetBool("taskbar", false); }
            set { SetBool("taskbar", value); }
        }

        public static bool PauseOnBattery
        {
            get { return GetBool("pausebattery", false); }
            set { SetBool("pausebattery", value); }
        }

        // Музыкальный режим: во время музыки включать обои, помеченные как музыкальные
        public static bool MusicMode
        {
            get
            {
                string old = Path.Combine(Program.DataDir, "music.txt");
                string v = Get("music", File.Exists(old) ? (File.ReadAllText(old).Trim() == "0" ? "0" : "1") : "1");
                return v != "0";
            }
            set { SetBool("music", value); }
        }

        public static string MusicWallpaperName
        {
            get
            {
                string old = Path.Combine(Program.DataDir, "music-wallpaper.txt");
                return Get("musicwall", File.Exists(old) ? File.ReadAllText(old).Trim() : "");
            }
            set { Set("musicwall", value); }
        }
    }

    // ---------- Каталог встроенных обоев (категории, описания, превью) ----------
    class CatalogItem
    {
        public string File, Name, Cat, Desc;
        public bool Audio, Mouse, Clock;
        public string[] Tags = new string[0];
    }

    static class Catalog
    {
        static Dictionary<string, CatalogItem> map;
        static List<string> categories;

        static void Load()
        {
            if (map != null) return;
            map = new Dictionary<string, CatalogItem>(StringComparer.OrdinalIgnoreCase);
            categories = new List<string>();
            // основной каталог и каталоги дополнений (Library_packs*.json)
            List<string> files = new List<string> { Path.Combine(Program.AppDir, "builtin", "catalog.json") };
            try { string packs = Path.Combine(Program.LibraryDir, "_packs"); if (Directory.Exists(packs)) files.AddRange(Directory.GetFiles(packs, "*.json")); } catch { }
            foreach (string file in files)
            try
            {
                if (!File.Exists(file) || !File.ReadAllText(file).StartsWith("[")) continue;
                object data = new System.Web.Script.Serialization.JavaScriptSerializer { MaxJsonLength = 8 * 1024 * 1024 }.DeserializeObject(File.ReadAllText(file));
                foreach (object o in (System.Collections.IEnumerable)data)
                {
                    Dictionary<string, object> d = (Dictionary<string, object>)o;
                    CatalogItem it = new CatalogItem();
                    it.File = Program.InfoString(d, "file"); it.Name = Program.InfoString(d, "name"); it.Cat = Program.InfoString(d, "cat"); it.Desc = Program.InfoString(d, "desc");
                    object tg; if (d.TryGetValue("tags", out tg) && tg is System.Collections.IEnumerable && !(tg is string)) it.Tags = ((System.Collections.IEnumerable)tg).Cast<object>().Select(x => Convert.ToString(x)).ToArray();
                    it.Audio = Program.InfoString(d, "audio") == "True"; it.Mouse = Program.InfoString(d, "mouse") == "True"; it.Clock = Program.InfoString(d, "clock") == "True";
                    map[it.File] = it;
                    if (!categories.Contains(it.Cat)) categories.Add(it.Cat);
                }
            }
            catch (Exception ex) { Program.Log("catalog: " + ex.Message); }
        }

        public static CatalogItem Get(string fileName) { Load(); CatalogItem it; return map.TryGetValue(fileName, out it) ? it : null; }
        public static List<string> Categories { get { Load(); return categories; } }
        public static string ThumbPath(string fileName)
        {
            return Path.Combine(Program.AppDir, "builtin", "thumbs", Path.GetFileNameWithoutExtension(fileName) + ".jpg");
        }

        public static string PackThumbPath(string fileName)
        {
            return Path.Combine(Program.LibraryDir, "_packs", "thumbs", Path.GetFileNameWithoutExtension(fileName) + ".jpg");
        }
    }

    // ---------- Автозагрузка ----------
    // Прозрачная панель задач: на Windows 11 её фон рисует XAML, обычными средствами он не меняется,
    // поэтому используем бесплатную программу TranslucentTB (ставится через winget, по умолчанию делает панель прозрачной)
    static class Taskbar
    {
        const string Package = "28017CharlesMilette.TranslucentTB_";
        const string Aumid = "28017CharlesMilette.TranslucentTB_v826wp6bftszj!TranslucentTB";
        static int tick;
        static bool installing;

        static bool Installed()
        {
            try
            {
                using (RegistryKey k = Registry.CurrentUser.OpenSubKey(@"Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppModel\Repository\Packages"))
                    return k != null && k.GetSubKeyNames().Any(n => n.StartsWith(Package, StringComparison.OrdinalIgnoreCase));
            }
            catch { return false; }
        }

        static bool Running() { return Process.GetProcessesByName("TranslucentTB").Length > 0; }

        // on=true — включить (и следить, чтобы работало), false — выключить
        public static void Apply(bool on)
        {
            try
            {
                if (!on)
                {
                    foreach (Process p in Process.GetProcessesByName("TranslucentTB")) { try { p.Kill(); } catch { } }
                    return;
                }
                if (Running() || installing) return;
                lastAccent = null; SetCovered(false);
                if (Installed())
                {
                    Process.Start(new ProcessStartInfo("explorer.exe", "shell:AppsFolder\\" + Aumid) { UseShellExecute = true });
                    return;
                }
                installing = true;
                ThreadPool.QueueUserWorkItem(delegate
                {
                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo("winget", "install --id CharlesMilette.TranslucentTB -e --source winget --silent --accept-package-agreements --accept-source-agreements");
                        psi.CreateNoWindow = true; psi.UseShellExecute = false;
                        using (Process p = Process.Start(psi)) p.WaitForExit(300000);
                    }
                    catch (Exception ex) { Program.Log("taskbar install: " + ex.Message); }
                    installing = false;
                });
            }
            catch (Exception ex) { Program.Log("taskbar: " + ex.Message); }
        }

        static string lastAccent;

        // TranslucentTB сам перечитывает settings.json: «normal» — обычная панель (когда обои не видно), «clear» — прозрачная
        public static void SetCovered(bool covered)
        {
            string want = covered ? "normal" : "clear";
            if (want == lastAccent) return;
            try
            {
                string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Packages");
                foreach (string dir in Directory.GetDirectories(root, Package + "*"))
                {
                    string file = Path.Combine(dir, "RoamingState", "settings.json");
                    if (!File.Exists(file)) continue;
                    string text = File.ReadAllText(file, Encoding.UTF8);
                    string changed = System.Text.RegularExpressions.Regex.Replace(text, @"(""desktop_appearance""\s*:\s*\{\s*""accent""\s*:\s*"")[a-z-]+", "${1}" + want);
                    if (changed != text) File.WriteAllText(file, changed, new UTF8Encoding(true));
                }
                lastAccent = want;
            }
            catch (Exception ex) { Program.Log("taskbar accent: " + ex.Message); }
        }

        // Вызывается раз в секунду: раз в 10 секунд проверяет, что программа ещё запущена
        public static void Keep() { if (++tick % 10 == 0) Apply(true); }
    }

    // Скачанные видео-обои: группа и превью лежат в Library_video
    static class VideoMeta
    {
        static Dictionary<string, string> groups, tags;
        static string Dir { get { return Path.Combine(Program.LibraryDir, "_video"); } }

        static void Load()
        {
            groups = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            tags = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            try
            {
                if (!Directory.Exists(Dir)) return;
                foreach (string file in Directory.GetFiles(Dir, "index*.json"))
                foreach (KeyValuePair<string, object> kv in new System.Web.Script.Serialization.JavaScriptSerializer { MaxJsonLength = 16 * 1024 * 1024 }.Deserialize<Dictionary<string, object>>(File.ReadAllText(file, Encoding.UTF8)))
                {
                    Dictionary<string, object> v = kv.Value as Dictionary<string, object>;
                    if (v != null && v.ContainsKey("group")) groups[kv.Key] = Convert.ToString(v["group"]);
                    if (v != null && v.ContainsKey("tag")) tags[kv.Key] = Convert.ToString(v["tag"]);
                }
            }
            catch (Exception ex) { Program.Log("videometa: " + ex.Message); }
        }

        public static void Reload() { groups = null; tags = null; }
        public static string Tag(string fileName) { if (groups == null) Load(); string g; return tags.TryGetValue(fileName, out g) ? g : null; }
        public static string Group(string fileName) { if (groups == null) Load(); string g; return groups.TryGetValue(fileName, out g) ? g : null; }
        public static string Thumb(string fileName) { return Path.Combine(Dir, "thumbs", Path.GetFileNameWithoutExtension(fileName) + ".jpg"); }
    }

    static class Autostart
    {
        const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        const string Name = "LiveWall";

        public static string Command { get { return "\"" + Application.ExecutablePath + "\" --background"; } }

        public static bool Enabled
        {
            get
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKey))
                    return key != null && key.GetValue(Name) != null;
            }
            set
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(RunKey))
                {
                    if (value) key.SetValue(Name, Command);
                    else key.DeleteValue(Name, false);
                }
            }
        }

        // Если программу переместили — путь в автозагрузке обновляем
        public static void Repair()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKey, true))
                {
                    object v = key == null ? null : key.GetValue(Name);
                    if (v != null && v.ToString() != Command) key.SetValue(Name, Command);
                }
            }
            catch { }
        }
    }

    // ---------- WinAPI ----------
    static class Native
    {
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindow(string cls, string title);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string cls, string title);
        [DllImport("user32.dll")] public static extern IntPtr SendMessageTimeout(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
        [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr lParam);
        [DllImport("user32.dll")] public static extern IntPtr SetParent(IntPtr child, IntPtr parent);
        [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hwnd, int index);
        [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hwnd, int index, int value);
        [DllImport("user32.dll")] public static extern bool SetLayeredWindowAttributes(IntPtr hwnd, uint key, byte alpha, uint flags);
        [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
        [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hwnd);
        [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
        [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
        [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
        [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
        [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT p);
        [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);
        [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder sb, int max);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern bool SystemParametersInfo(int action, int param, string value, int flags);
        [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
        [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
        [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hwnd, int attr, out int value, int size);
        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

        public delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
        [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
        [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }

        public const int GWL_STYLE = -16, GWL_EXSTYLE = -20;
        public const int WS_CHILD = 0x40000000, WS_VISIBLE = 0x10000000;
        public const int WS_EX_LAYERED = 0x80000, WS_EX_TOOLWINDOW = 0x80, WS_EX_NOACTIVATE = 0x08000000, WS_EX_TRANSPARENT = 0x20;
        public const uint SWP_NOSIZE = 0x1, SWP_NOMOVE = 0x2, SWP_NOZORDER = 0x4, SWP_NOACTIVATE = 0x10, SWP_SHOWWINDOW = 0x40;
        public static readonly IntPtr HWND_BOTTOM = new IntPtr(1);

        public static void EnableDpiAwareness()
        {
            try { if (SetProcessDpiAwarenessContext(new IntPtr(-2))) return; } catch { }   // System aware
            try { SetProcessDPIAware(); } catch { }
        }

        public static string ClassOf(IntPtr hwnd)
        {
            StringBuilder sb = new StringBuilder(64);
            GetClassName(hwnd, sb, 64);
            return sb.ToString();
        }

        // Тёмный заголовок окна (Windows 10 1809+ / 11)
        public static void DarkTitleBar(IntPtr hwnd, System.Drawing.Color bg, bool dark)
        {
            try { int on = dark ? 1 : 0; if (DwmSetWindowAttribute(hwnd, 20, ref on, 4) != 0) DwmSetWindowAttribute(hwnd, 19, ref on, 4); }
            catch { }
            // Windows 11: скруглённые углы, рамка и заголовок в цвет окна (без белой обводки)
            try
            {
                int round = 2; DwmSetWindowAttribute(hwnd, 33, ref round, 4);
                int rgb = bg.R | (bg.G << 8) | (bg.B << 16);
                DwmSetWindowAttribute(hwnd, 34, ref rgb, 4);
                DwmSetWindowAttribute(hwnd, 35, ref rgb, 4);
            }
            catch { }
        }

        public static bool IsCloaked(IntPtr hwnd)
        {
            try { int v; return DwmGetWindowAttribute(hwnd, 14, out v, 4) == 0 && v != 0; }
            catch { return false; }
        }

        // Перерисовать обычные обои, когда живые выключены
        public static void RefreshDesktop()
        {
            string wallpaper = null;
            using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Control Panel\Desktop"))
                if (key != null) wallpaper = key.GetValue("WallPaper") as string;
            SystemParametersInfo(20, 0, wallpaper, 0);
        }

        // Курсор сейчас над рабочим столом (а не над окном программы)?
        public static bool CursorOnDesktop(out Point pos)
        {
            POINT p;
            pos = Point.Empty;
            if (!GetCursorPos(out p)) return false;
            pos = new Point(p.X, p.Y);
            IntPtr hwnd = WindowFromPoint(p);
            if (hwnd == IntPtr.Zero) return false;
            IntPtr root = GetAncestor(hwnd, 2);
            string cls = ClassOf(root == IntPtr.Zero ? hwnd : root);
            return cls == "Progman" || cls == "WorkerW";
        }

        // Все ли мониторы закрыты развёрнутыми окнами (тогда обои не видно и их можно усыпить)
        public static bool AllScreensCovered()
        {
            Screen[] screens = Screen.AllScreens;
            bool[] covered = new bool[screens.Length];
            Rectangle[] work = screens.Select(s => s.WorkingArea).ToArray();
            IntPtr self = IntPtr.Zero;
            EnumWindows(delegate(IntPtr hwnd, IntPtr l)
            {
                if (!IsWindowVisible(hwnd) || IsIconic(hwnd)) return true;
                int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
                // Прозрачные оверлеи (например, оверлей видеокарты) и служебные окна не в счёт
                if ((ex & WS_EX_TRANSPARENT) != 0 || (ex & WS_EX_TOOLWINDOW) != 0) return true;
                string cls = ClassOf(hwnd);
                if (cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd" || cls == "Shell_SecondaryTrayWnd" || cls == "Windows.UI.Core.CoreWindow") return true;
                if (IsCloaked(hwnd)) return true;
                RECT r;
                if (!GetWindowRect(hwnd, out r)) return true;
                for (int i = 0; i < work.Length; i++)
                {
                    if (covered[i]) continue;
                    Rectangle w = work[i];
                    if (r.Left <= w.Left + 4 && r.Top <= w.Top + 4 && r.Right >= w.Right - 4 && r.Bottom >= w.Bottom - 4) covered[i] = true;
                }
                return true;
            }, IntPtr.Zero);
            return covered.Length > 0 && covered.All(c => c);
        }
    }
}
