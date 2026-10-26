// Setup.cs: установщик Lumora. Внутри лежит архив payload.zip (ресурс), он распаковывается в выбранную папку.
// Запуск с ключом --uninstall удаляет программу (этот же файл копируется как Uninstall.exe).

using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace LumoraSetup
{
    static class Program
    {
        public const string AppName = "Lumora", Version = "1.0", Exe = "LiveWall.exe";
        public const string UninstKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\Lumora";
        public const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            if (Assembly.GetExecutingAssembly().GetManifestResourceStream("pack.zip") != null) { Application.Run(new PackForm(args.Any(a => a.Equals("/S", StringComparison.OrdinalIgnoreCase)))); return; }
            bool un = args.Any(a => a.Equals("--uninstall", StringComparison.OrdinalIgnoreCase));
            bool silent = args.Any(a => a.Equals("/S", StringComparison.OrdinalIgnoreCase) || a.Equals("--silent", StringComparison.OrdinalIgnoreCase));
            if (un) { Application.Run(new UninstallForm(silent)); return; }
            Application.Run(new SetupForm(silent));
        }

        public static string DefaultDir { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", AppName); } }

        public static void KillRunning()
        {
            foreach (Process p in Process.GetProcessesByName("LiveWall")) { try { p.Kill(); p.WaitForExit(3000); } catch { } }
            Thread.Sleep(400);
        }

        public static string Shortcut(string dir) { return Path.Combine(dir, AppName + ".lnk"); }

        public static void MakeShortcut(string lnk, string target, string workDir, string icon)
        {
            Type t = Type.GetTypeFromProgID("WScript.Shell");
            object sh = Activator.CreateInstance(t);
            object sc = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, sh, new object[] { lnk });
            Type st = sc.GetType();
            st.InvokeMember("TargetPath", BindingFlags.SetProperty, null, sc, new object[] { target });
            st.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, sc, new object[] { workDir });
            st.InvokeMember("IconLocation", BindingFlags.SetProperty, null, sc, new object[] { icon + ",0" });
            st.InvokeMember("Description", BindingFlags.SetProperty, null, sc, new object[] { "Lumora — живые обои рабочего стола" });
            st.InvokeMember("Save", BindingFlags.InvokeMethod, null, sc, null);
        }
    }

    static class Theme
    {
        public static readonly Color Bg = Color.FromArgb(15, 15, 19), Panel = Color.FromArgb(24, 24, 29), Line = Color.FromArgb(44, 44, 52),
            Fg = Color.FromArgb(240, 240, 246), Muted = Color.FromArgb(140, 140, 156), Accent = Color.FromArgb(129, 54, 242);

        public static GraphicsPath Round(Rectangle r, int rad)
        {
            GraphicsPath p = new GraphicsPath(); int d = rad * 2;
            p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90); p.CloseFigure();
            return p;
        }

        public static void Star(Graphics g, float cx, float cy, float r, Color c)
        {
            PointF[] pts = new PointF[8];
            for (int i = 0; i < 8; i++) { double a = i * Math.PI / 4 - Math.PI / 2; float rr = i % 2 == 0 ? r : r * 0.24f; pts[i] = new PointF(cx + (float)Math.Cos(a) * rr, cy + (float)Math.Sin(a) * rr); }
            using (SolidBrush b = new SolidBrush(c)) g.FillPolygon(b, pts);
        }
    }

    // Скруглённая кнопка
    class Btn : Control
    {
        readonly bool primary; bool hot;
        public Btn(string text, bool primary) { Text = text; this.primary = primary; Cursor = Cursors.Hand; Size = new Size(150, 40); SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true); }
        protected override void OnMouseEnter(EventArgs e) { hot = true; Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { hot = false; Invalidate(); base.OnMouseLeave(e); }
        protected override void OnEnabledChanged(EventArgs e) { Invalidate(); base.OnEnabledChanged(e); }
        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias; g.Clear(Parent.BackColor);
            Color c = !Enabled ? Color.FromArgb(40, 40, 48) : primary ? (hot ? Color.FromArgb(150, 84, 248) : Theme.Accent) : (hot ? Color.FromArgb(46, 46, 56) : Color.FromArgb(34, 34, 42));
            using (GraphicsPath p = Theme.Round(new Rectangle(0, 0, Width - 1, Height - 1), 11)) using (SolidBrush b = new SolidBrush(c)) g.FillPath(b, p);
            TextRenderer.DrawText(g, Text, new Font("Segoe UI Semibold", 10f), new Rectangle(0, 0, Width, Height), Enabled ? Color.White : Theme.Muted, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }
    }

    // Переключатель-галочка
    class Check : Control
    {
        public bool Checked = true;
        public Check(string text) { Text = text; Cursor = Cursors.Hand; Size = new Size(380, 30); SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true); }
        protected override void OnClick(EventArgs e) { Checked = !Checked; Invalidate(); base.OnClick(e); }
        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias; g.Clear(Parent.BackColor);
            Rectangle box = new Rectangle(0, 4, 22, 22);
            using (GraphicsPath p = Theme.Round(box, 7)) using (SolidBrush b = new SolidBrush(Checked ? Theme.Accent : Color.FromArgb(38, 38, 46))) g.FillPath(b, p);
            if (Checked) using (Pen pen = new Pen(Color.White, 2.2f) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round }) g.DrawLines(pen, new[] { new PointF(5.5f, 15.5f), new PointF(10, 20), new PointF(17, 10.5f) });
            TextRenderer.DrawText(g, Text, new Font("Segoe UI", 10f), new Rectangle(32, 0, Width - 32, Height), Theme.Fg, TextFormatFlags.VerticalCenter | TextFormatFlags.Left);
        }
    }

    class BaseForm : Form
    {
        protected int progress = -1;
        protected string status = "";

        [System.Runtime.InteropServices.DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h, int a, ref int v, int s);

        public BaseForm(string title, int h)
        {
            Text = title; FormBorderStyle = FormBorderStyle.FixedDialog; MaximizeBox = false; MinimizeBox = true;
            StartPosition = FormStartPosition.CenterScreen; ClientSize = new Size(560, h); BackColor = Theme.Bg; DoubleBuffered = true;
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            try { int on = 1; DwmSetWindowAttribute(Handle, 20, ref on, 4); int rgb = Theme.Bg.R | (Theme.Bg.G << 8) | (Theme.Bg.B << 16); DwmSetWindowAttribute(Handle, 35, ref rgb, 4); } catch { }
        }

        protected void Header(Graphics g, string sub)
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (GraphicsPath p = Theme.Round(new Rectangle(32, 28, 56, 56), 16))
            using (LinearGradientBrush b = new LinearGradientBrush(new Rectangle(32, 28, 56, 56), Color.FromArgb(129, 54, 242), Color.FromArgb(200, 90, 240), 50f)) g.FillPath(b, p);
            Theme.Star(g, 60, 56, 17, Color.White); Theme.Star(g, 77, 41, 5.5f, Color.FromArgb(220, 255, 255, 255));
            TextRenderer.DrawText(g, "Lumora", new Font("Segoe UI Semibold", 22f, FontStyle.Bold), new Point(102, 26), Theme.Fg);
            TextRenderer.DrawText(g, sub, new Font("Segoe UI", 10f), new Point(105, 66), Theme.Muted);
        }

        protected void Bar(Graphics g, int y)
        {
            if (progress < 0) return;
            Rectangle track = new Rectangle(32, y, ClientSize.Width - 64, 8);
            using (GraphicsPath p = Theme.Round(track, 4)) using (SolidBrush b = new SolidBrush(Color.FromArgb(40, 40, 48))) g.FillPath(b, p);
            int w = Math.Max(8, track.Width * progress / 100);
            using (GraphicsPath p = Theme.Round(new Rectangle(track.X, track.Y, w, track.Height), 4)) using (SolidBrush b = new SolidBrush(Theme.Accent)) g.FillPath(b, p);
            TextRenderer.DrawText(g, status, new Font("Segoe UI", 9f), new Point(32, y + 14), Theme.Muted);
        }

        protected void SetProgress(int p, string s) { progress = p; status = s; Invalidate(); Application.DoEvents(); }
    }

    class SetupForm : BaseForm
    {
        readonly Btn install = new Btn("Установить", true), cancel = new Btn("Отмена", false), browse = new Btn("Обзор…", false);
        readonly TextBox path = new TextBox();
        readonly Check cDesk = new Check("Ярлык на рабочем столе"), cAuto = new Check("Запускать вместе с Windows"), cRun = new Check("Запустить Lumora после установки");
        bool working, quiet;

        public SetupForm(bool silent) : base("Установка Lumora", 420)
        {
            quiet = silent;
            path.Text = Program.DefaultDir; path.Location = new Point(32, 142); path.Size = new Size(396, 28);
            path.BorderStyle = BorderStyle.FixedSingle; path.BackColor = Theme.Panel; path.ForeColor = Theme.Fg; path.Font = new Font("Segoe UI", 10f);
            browse.Size = new Size(96, 30); browse.Location = new Point(436, 141);
            browse.Click += delegate { using (FolderBrowserDialog d = new FolderBrowserDialog()) { d.Description = "Папка для Lumora"; if (d.ShowDialog(this) == DialogResult.OK) path.Text = Path.Combine(d.SelectedPath, Program.AppName); } };
            cDesk.Location = new Point(32, 192); cAuto.Location = new Point(32, 224); cRun.Location = new Point(32, 256);
            install.Location = new Point(ClientSize.Width - 32 - 150, ClientSize.Height - 40 - 28); cancel.Size = new Size(110, 40); cancel.Location = new Point(install.Left - 120, install.Top);
            install.Click += delegate { Install(); }; cancel.Click += delegate { if (!working) Close(); };
            Controls.AddRange(new Control[] { path, browse, cDesk, cAuto, cRun, install, cancel });
            if (silent) Shown += delegate { Install(); };
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Header(e.Graphics, "Живые обои для рабочего стола · версия " + Program.Version);
            TextRenderer.DrawText(e.Graphics, "Папка установки", new Font("Segoe UI Semibold", 9.5f), new Point(32, 118), Theme.Muted);
            Bar(e.Graphics, 300);
        }

        void Install()
        {
            if (working) return;
            working = true; install.Enabled = cancel.Enabled = browse.Enabled = false; path.Enabled = false;
            string dir = path.Text.Trim();
            try
            {
                SetProgress(2, "Закрываю запущенную Lumora…");
                Program.KillRunning();
                Directory.CreateDirectory(dir);
                SetProgress(5, "Копирую файлы…");
                using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
                using (ZipArchive zip = new ZipArchive(s, ZipArchiveMode.Read))
                {
                    int n = zip.Entries.Count, i = 0;
                    foreach (ZipArchiveEntry en in zip.Entries)
                    {
                        string target = Path.GetFullPath(Path.Combine(dir, en.FullName.Replace('/', Path.DirectorySeparatorChar)));
                        if (!target.StartsWith(Path.GetFullPath(dir), StringComparison.OrdinalIgnoreCase)) continue;   // защита от выхода за пределы папки
                        if (en.FullName.EndsWith("/")) { Directory.CreateDirectory(target); }
                        else
                        {
                            Directory.CreateDirectory(Path.GetDirectoryName(target));
                            en.ExtractToFile(target, true);
                        }
                        if (++i % 12 == 0) SetProgress(5 + 85 * i / n, "Копирую файлы…");
                    }
                }
                SetProgress(92, "Создаю ярлыки…");
                string exe = Path.Combine(dir, Program.Exe), ico = Path.Combine(dir, "Lumora.ico");
                // деинсталлятор — копия этого файла
                string un = Path.Combine(dir, "Uninstall.exe");
                File.Copy(Application.ExecutablePath, un, true);
                Program.MakeShortcut(Program.Shortcut(Environment.GetFolderPath(Environment.SpecialFolder.Programs)), exe, dir, ico);
                if (cDesk.Checked) Program.MakeShortcut(Program.Shortcut(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory)), exe, dir, ico);
                using (RegistryKey k = Registry.CurrentUser.CreateSubKey(Program.RunKey))
                    if (cAuto.Checked) k.SetValue("LiveWall", "\"" + exe + "\" --background"); else k.DeleteValue("LiveWall", false);
                using (RegistryKey k = Registry.CurrentUser.CreateSubKey(Program.UninstKey))
                {
                    k.SetValue("DisplayName", Program.AppName); k.SetValue("DisplayVersion", Program.Version); k.SetValue("Publisher", "Frein");
                    k.SetValue("InstallLocation", dir); k.SetValue("DisplayIcon", ico); k.SetValue("UninstallString", "\"" + un + "\" --uninstall");
                    k.SetValue("NoModify", 1, RegistryValueKind.DWord); k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                }
                SetProgress(100, "Готово");
                if (cRun.Checked) Process.Start(new ProcessStartInfo(exe) { WorkingDirectory = dir });
                if (!quiet) MessageBox.Show(this, "Lumora установлена.\n\n" + dir, "Установка завершена", MessageBoxButtons.OK, MessageBoxIcon.Information);
                Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "Не удалось установить:\n" + ex.Message, "Установка Lumora", MessageBoxButtons.OK, MessageBoxIcon.Error);
                working = false; install.Enabled = cancel.Enabled = browse.Enabled = true; path.Enabled = true; progress = -1; Invalidate();
            }
        }
    }

    class UninstallForm : BaseForm
    {
        readonly Check cData = new Check("Удалить также мою библиотеку и настройки");
        readonly Btn go = new Btn("Удалить", true), cancel = new Btn("Отмена", false);

        bool quiet;

        public UninstallForm(bool silent) : base("Удаление Lumora", 300)
        {
            quiet = silent;
            cData.Checked = false; cData.Location = new Point(32, 130);
            go.Location = new Point(ClientSize.Width - 32 - 150, ClientSize.Height - 40 - 28); cancel.Size = new Size(110, 40); cancel.Location = new Point(go.Left - 120, go.Top);
            go.Click += delegate { Remove(); }; cancel.Click += delegate { Close(); };
            Controls.AddRange(new Control[] { cData, go, cancel });
            if (silent) Shown += delegate { Remove(); };
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Header(e.Graphics, "Удаление программы");
            TextRenderer.DrawText(e.Graphics, "Программа будет удалена с компьютера.", new Font("Segoe UI", 10f), new Point(32, 104), Theme.Fg);
            Bar(e.Graphics, 190);
        }

        void Remove()
        {
            go.Enabled = cancel.Enabled = false;
            string dir = Path.GetDirectoryName(Application.ExecutablePath);
            try
            {
                SetProgress(10, "Закрываю Lumora…");
                Program.KillRunning();
                SetProgress(40, "Удаляю ярлыки и записи…");
                foreach (string d in new[] { Environment.GetFolderPath(Environment.SpecialFolder.Programs), Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) })
                    try { File.Delete(Program.Shortcut(d)); } catch { }
                using (RegistryKey k = Registry.CurrentUser.CreateSubKey(Program.RunKey)) k.DeleteValue("LiveWall", false);
                try { Registry.CurrentUser.DeleteSubKeyTree(Program.UninstKey, false); } catch { }
                if (cData.Checked)
                {
                    SetProgress(60, "Удаляю библиотеку и настройки…");
                    try { Directory.Delete(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LiveWall"), true); } catch { }
                }
                SetProgress(80, "Удаляю файлы программы…");
                foreach (string f in Directory.GetFiles(dir, "*", SearchOption.AllDirectories))
                    if (!f.Equals(Application.ExecutablePath, StringComparison.OrdinalIgnoreCase)) try { File.Delete(f); } catch { }
                foreach (string d in Directory.GetDirectories(dir).OrderByDescending(x => x.Length)) try { Directory.Delete(d, true); } catch { }
                SetProgress(100, "Готово");
                // сам файл удалится после выхода
                Process.Start(new ProcessStartInfo("cmd.exe", "/c ping 127.0.0.1 -n 3 >nul & del /f /q \"" + Application.ExecutablePath + "\" & rmdir \"" + dir + "\"") { CreateNoWindow = true, UseShellExecute = false, WindowStyle = ProcessWindowStyle.Hidden });
                if (!quiet) MessageBox.Show(this, "Lumora удалена.", "Удаление завершено", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex) { MessageBox.Show(this, "Не удалось удалить:\n" + ex.Message, "Удаление Lumora", MessageBoxButtons.OK, MessageBoxIcon.Error); }
            Close();
        }
    }

    // Установщик дополнения: аниме-арты кладутся в библиотеку Lumora (картинки, обои, превью и каталог)
    class PackForm : BaseForm
    {
        readonly Btn install = new Btn("Добавить", true), cancel = new Btn("Отмена", false), browse = new Btn("Обзор…", false);
        readonly TextBox path = new TextBox();
        bool working, quiet;

        readonly string[] info;

        static string[] ReadInfo()
        {
            try { using (Stream st = Assembly.GetExecutingAssembly().GetManifestResourceStream("pack.txt")) using (StreamReader sr = new StreamReader(st, System.Text.Encoding.UTF8)) return sr.ReadToEnd().Replace("\r", "").Split('\n'); }
            catch { return new[] { "Lumora — дополнение", "Дополнение для Lumora", "Добавит в Lumora новые обои." }; }
        }

        public PackForm(bool silent) : base(ReadInfo()[0], 340)
        {
            info = ReadInfo();
            quiet = silent;
            path.Text = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LiveWall", "Library");
            path.Location = new Point(32, 168); path.Size = new Size(396, 28);
            path.BorderStyle = BorderStyle.FixedSingle; path.BackColor = Theme.Panel; path.ForeColor = Theme.Fg; path.Font = new Font("Segoe UI", 10f);
            browse.Size = new Size(96, 30); browse.Location = new Point(436, 167);
            browse.Click += delegate { using (FolderBrowserDialog d = new FolderBrowserDialog()) { d.Description = "Папка Library из Lumora"; d.SelectedPath = path.Text; if (d.ShowDialog(this) == DialogResult.OK) path.Text = d.SelectedPath; } };
            install.Size = new Size(170, 40); install.Location = new Point(ClientSize.Width - 32 - 170, ClientSize.Height - 40 - 28); cancel.Size = new Size(110, 40); cancel.Location = new Point(install.Left - 120, install.Top);
            install.Click += delegate { Run(); }; cancel.Click += delegate { if (!working) Close(); };
            Controls.AddRange(new Control[] { path, browse, install, cancel });
            if (silent) Shown += delegate { Run(); };
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Header(e.Graphics, info[1]);
            TextRenderer.DrawText(e.Graphics, info[2] + " Папка библиотеки:", new Font("Segoe UI", 10f), new Point(32, 112), Theme.Fg);
            TextRenderer.DrawText(e.Graphics, "Lumora должна быть уже установлена. После установки откройте её заново.", new Font("Segoe UI", 9f), new Point(32, 138), Theme.Muted);
            Bar(e.Graphics, 224);
        }

        void Run()
        {
            if (working) return;
            working = true; install.Enabled = cancel.Enabled = browse.Enabled = path.Enabled = false;
            string dir = path.Text.Trim();
            try
            {
                SetProgress(3, "Закрываю Lumora…");
                Program.KillRunning();
                Directory.CreateDirectory(dir);
                using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("pack.zip"))
                using (ZipArchive zip = new ZipArchive(s, ZipArchiveMode.Read))
                {
                    int n = zip.Entries.Count, i = 0;
                    foreach (ZipArchiveEntry en in zip.Entries)
                    {
                        string target = Path.GetFullPath(Path.Combine(dir, en.FullName.Replace('/', Path.DirectorySeparatorChar)));
                        if (!target.StartsWith(Path.GetFullPath(dir), StringComparison.OrdinalIgnoreCase)) continue;
                        if (en.FullName.EndsWith("/")) Directory.CreateDirectory(target);
                        else { Directory.CreateDirectory(Path.GetDirectoryName(target)); en.ExtractToFile(target, true); }
                        if (++i % 5 == 0) SetProgress(5 + 92 * i / n, "Копирую файлы…");
                    }
                }
                SetProgress(100, "Готово");
                string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string exe = Path.Combine(local, "Programs", "Lumora", Program.Exe);
                if (!File.Exists(exe)) exe = Path.Combine(local, "LiveWall", "app", Program.Exe);
                if (File.Exists(exe)) try { Process.Start(new ProcessStartInfo(exe, "--background") { WorkingDirectory = Path.GetDirectoryName(exe) }); } catch { }
                if (!quiet) MessageBox.Show(this, "Готово. Откройте Lumora — новые обои уже в библиотеке.", "Готово", MessageBoxButtons.OK, MessageBoxIcon.Information);
                Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "Не удалось добавить:\n" + ex.Message, "Lumora", MessageBoxButtons.OK, MessageBoxIcon.Error);
                working = false; install.Enabled = cancel.Enabled = browse.Enabled = path.Enabled = true; progress = -1; Invalidate();
            }
        }
    }
}
