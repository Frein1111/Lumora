// ClockWidget.cs: виджет времени и даты на рабочем столе — цифровой, крупный, компактный или аналоговый; шрифт, цвет, фон, погода и положение настраиваются.
// Окно рисуется с попиксельной прозрачностью (UpdateLayeredWindow), поэтому может быть полностью без фона.

using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace LiveWall
{
    class ClockWidget : Form
    {
        [StructLayout(LayoutKind.Sequential)] struct BLENDFUNCTION { public byte BlendOp, BlendFlags, SourceConstantAlpha, AlphaFormat; }
        [DllImport("user32.dll", ExactSpelling = true, SetLastError = true)] static extern bool UpdateLayeredWindow(IntPtr hwnd, IntPtr hdcDst, ref Point pptDst, ref Size psize, IntPtr hdcSrc, ref Point pprSrc, int crKey, ref BLENDFUNCTION pblend, int dwFlags);
        [DllImport("user32.dll", ExactSpelling = true)] static extern IntPtr GetDC(IntPtr hwnd);
        [DllImport("user32.dll", ExactSpelling = true)] static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);
        [DllImport("gdi32.dll", ExactSpelling = true)] static extern IntPtr CreateCompatibleDC(IntPtr hdc);
        [DllImport("gdi32.dll", ExactSpelling = true)] static extern bool DeleteDC(IntPtr hdc);
        [DllImport("gdi32.dll", ExactSpelling = true)] static extern IntPtr SelectObject(IntPtr hdc, IntPtr obj);
        [DllImport("gdi32.dll", ExactSpelling = true)] static extern bool DeleteObject(IntPtr obj);
        [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string cls, string title);

        static readonly CultureInfo Ru = new CultureInfo("ru-RU");

        // ----- настройки -----
        string style = "digital", pos = "tr", font = "light", color = "white", bgMode = "none", dateFmt = "long", where = "desktop", units = "c", city = "";
        float k = 1f, textAlpha = 1f, bgAlpha = 0.5f, radius = 20, pad = 18;
        int offX = 24, offY = 24, freeX = 100, freeY = 100;
        bool shadow = true, h24 = true, seconds = false, blink = true, showDate = true, showWeek = false, showBat = false, weather = false, locked = true;
        Color customColor = Color.White, customBg = Color.Black;

        readonly System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
        Size lastSize = Size.Empty;
        string weatherText = ""; int weatherKind = -1; double weatherTemp = double.NaN;
        DateTime weatherAt = DateTime.MinValue; volatile bool weatherBusy;
        double lat = double.NaN, lon = double.NaN; string geoFor = "";
        public string Status = "";
        public event Action StatusChanged;

        public ClockWidget()
        {
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.Manual;
            Size = new Size(10, 10);
            timer.Interval = 500;
            timer.Tick += delegate { Tick(); };
            ApplySettings();
        }

        protected override bool ShowWithoutActivation { get { return true; } }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= 0x80000 | 0x80 | 0x08000000;     // LAYERED | TOOLWINDOW | NOACTIVATE
                if (locked) cp.ExStyle |= 0x20;                // TRANSPARENT: клики проходят насквозь
                return cp;
            }
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == 0x84 && !locked) { m.Result = (IntPtr)2; return; }      // WM_NCHITTEST -> заголовок: окно можно таскать мышью
            if (m.Msg == 0x232 && !locked)                                          // WM_EXITSIZEMOVE: запоминаем новое место
            {
                Config.Set("cpos", "free"); Config.Set("cfx", Left.ToString()); Config.Set("cfy", Top.ToString());
                pos = "free"; freeX = Left; freeY = Top;
            }
            base.WndProc(ref m);
        }

        void SetStatus(string s) { if (Status == s) return; Status = s; Action h = StatusChanged; if (h != null) h(); }

        // ---------- настройки ----------
        static Color Hex(string h, Color def)
        {
            try { h = (h ?? "").TrimStart('#'); if (h.Length == 6) return Color.FromArgb(Convert.ToInt32(h.Substring(0, 2), 16), Convert.ToInt32(h.Substring(2, 2), 16), Convert.ToInt32(h.Substring(4, 2), 16)); } catch { }
            return def;
        }

        void ApplySettings()
        {
            style = Config.Get("cstyle", "digital");
            pos = Config.Get("cpos", "tr");
            font = Config.Get("cfont", "light");
            color = Config.Get("ccolor", "white");
            bgMode = Config.Get("cbg", "none");
            dateFmt = Config.Get("cdatefmt", "long");
            where = Config.Get("cwhere", "desktop");
            units = Config.Get("cunits", "c");
            k = Math.Max(0.4f, Math.Min(4f, Config.GetInt("csize", 100) / 100f));
            textAlpha = Math.Max(0.1f, Math.Min(1f, Config.GetInt("calpha", 100) / 100f));
            bgAlpha = Math.Max(0f, Math.Min(1f, Config.GetInt("cbgalpha", 55) / 100f));
            radius = Config.GetInt("cradius", 20); pad = Config.GetInt("cpad", 18);
            offX = Config.GetInt("cox", 24); offY = Config.GetInt("coy", 24);
            freeX = Config.GetInt("cfx", 100); freeY = Config.GetInt("cfy", 100);
            shadow = Config.GetBool("cshadow", true); h24 = Config.GetBool("c24", true); seconds = Config.GetBool("csec", false);
            blink = Config.GetBool("cblink", true); showDate = Config.GetBool("cdate", true); showWeek = Config.GetBool("cweek", false);
            showBat = Config.GetBool("cbat", false); weather = Config.GetBool("cweather", false);
            bool newLocked = Config.GetBool("clocked", true);
            customColor = Hex(Config.Get("chex", "#ffffff"), Color.White); customBg = Hex(Config.Get("cbgcolor", "#000000"), Color.Black);
            string newCity = Config.Get("ccity", "").Trim();
            if (newCity != city) { city = newCity; lat = lon = double.NaN; weatherAt = DateTime.MinValue; weatherText = ""; weatherKind = -1; }
            if (newLocked != locked) { locked = newLocked; if (IsHandleCreated) RecreateHandle(); }
        }

        public void Restyle()
        {
            ApplySettings();
            if (timer.Enabled) Render();
        }

        public void Enable(bool on)
        {
            if (on == timer.Enabled) return;
            if (on) { if (!Visible) Show(); timer.Start(); Render(); }
            else { timer.Stop(); Hide(); }
        }

        int tickCount;
        void Tick()
        {
            tickCount++;
            Render();
            if (tickCount % 4 == 0) PlaceZ();
            if (weather && city.Length > 0 && !weatherBusy && (DateTime.Now - weatherAt).TotalMinutes > 20) { weatherBusy = true; weatherAt = DateTime.Now; ThreadPool.QueueUserWorkItem(delegate { try { LoadWeather(); } finally { weatherBusy = false; } }); }
        }

        // «На рабочем столе»: окно лежит прямо над рабочим столом и под всеми программами; «Поверх всех» — всегда сверху
        void PlaceZ()
        {
            if (!IsHandleCreated) return;
            IntPtr after = new IntPtr(-1);   // HWND_TOPMOST
            if (where != "top")
            {
                IntPtr prog = FindWindow("Progman", null);
                after = prog != IntPtr.Zero ? prog : new IntPtr(1);   // HWND_BOTTOM, если рабочий стол не найден
                if (!Visible) return;
            }
            SetWindowPos(Handle, after, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0010);   // NOSIZE | NOMOVE | NOACTIVATE
        }

        // ---------- шрифты и цвета ----------
        Font MakeFont(float px, bool bold = false)
        {
            string name; FontStyle st = FontStyle.Regular;
            switch (font)
            {
                case "bold": name = "Segoe UI Semibold"; break;
                case "black": name = "Segoe UI Black"; break;
                case "bahn": name = "Bahnschrift"; break;
                case "mono": name = "Consolas"; break;
                case "serif": name = "Georgia"; break;
                case "thin": name = "Segoe UI Light"; break;
                default: name = "Segoe UI Light"; break;
            }
            if (bold && (font == "light" || font == "thin")) name = "Segoe UI Semibold";
            return new Font(name, px, st, GraphicsUnit.Pixel);
        }

        Color TextColor()
        {
            Color c = color == "black" ? Color.FromArgb(18, 18, 22) : color == "accent" ? Ui.Accent : color == "custom" ? customColor : Color.White;
            return Color.FromArgb((int)(255 * textAlpha), c);
        }

        Color BgColor()
        {
            Color c = bgMode == "light" ? Color.FromArgb(248, 248, 252) : bgMode == "accent" ? Ui.Accent : bgMode == "custom" ? customBg : Color.FromArgb(14, 14, 20);
            return Color.FromArgb((int)(255 * bgAlpha), c);
        }

        // ---------- содержимое ----------
        string TimeText(DateTime now)
        {
            string f = h24 ? "HH:mm" : "h:mm";
            if (seconds) f += ":ss";
            return now.ToString(f, CultureInfo.InvariantCulture);
        }

        static string Cap(string s) { return s.Length > 0 ? char.ToUpper(s[0], Ru) + s.Substring(1) : s; }

        string DateText(DateTime now)
        {
            switch (dateFmt)
            {
                case "full": return Cap(now.ToString("dddd, d MMMM yyyy 'г.'", Ru));
                case "short": return Cap(now.ToString("ddd, d MMM", Ru)).Replace(".", "");
                case "num": return now.ToString("dd.MM.yyyy", Ru);
                case "day": return Cap(now.ToString("dddd", Ru));
                default: return Cap(now.ToString("dddd, d MMMM", Ru));
            }
        }

        List<string> ExtraParts(DateTime now)
        {
            List<string> parts = new List<string>();
            if (showWeek) parts.Add("Неделя " + Ru.Calendar.GetWeekOfYear(now, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday));
            if (showBat)
            {
                try
                {
                    PowerStatus ps = SystemInformation.PowerStatus;
                    if (ps.BatteryChargeStatus != BatteryChargeStatus.NoSystemBattery)
                        parts.Add((ps.PowerLineStatus == PowerLineStatus.Online ? "⚡ " : "") + (int)Math.Round(ps.BatteryLifePercent * 100) + "%");
                }
                catch { }
            }
            return parts;
        }

        // ---------- рисование ----------
        void Render()
        {
            if (!IsHandleCreated) return;
            DateTime now = DateTime.Now;
            using (Bitmap scratch = new Bitmap(1, 1))
            using (Graphics sg = Graphics.FromImage(scratch))
            {
                sg.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
                Layout lay = BuildLayout(sg, now);
                int w = (int)Math.Ceiling(lay.W + lay.Pad * 2 + 6), h = (int)Math.Ceiling(lay.H + lay.Pad * 2 + 6);
                using (Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb))
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.Clear(Color.Transparent);
                    Draw(g, lay, now, w, h);
                    if (Environment.GetEnvironmentVariable("LUMORA_DUMP") == "1") { try { bmp.Save(Path.Combine(Path.GetTempPath(), "clock_dump.png"), ImageFormat.Png); } catch { } }
                    Present(bmp, w, h);
                }
            }
        }

        class Layout
        {
            public float W, H, Pad;
            public string Time, Date, Extra;
            public Font TimeF, DateF, ExtraF, Time2F;
            public SizeF TimeS, DateS, ExtraS;
            public float Dial;
        }

        Layout BuildLayout(Graphics g, DateTime now)
        {
            Layout L = new Layout();
            L.Pad = bgMode == "none" ? 8 * k : pad * k;
            StringFormat sf = StringFormat.GenericTypographic;
            L.Time = TimeText(now);
            L.Date = showDate ? DateText(now) : "";
            List<string> ex = ExtraParts(now);
            string wtxt = weather && weatherText.Length > 0 ? weatherText : "";
            L.Extra = string.Join("   ·   ", ex.ToArray());
            float gap = 6 * k;
            if (style == "compact")
            {
                L.TimeF = MakeFont(30 * k, true); L.DateF = MakeFont(22 * k);
                string line = L.Time + (L.Date.Length > 0 ? "   ·   " + L.Date : "") + (wtxt.Length > 0 ? "   ·   " + wtxt : "") + (L.Extra.Length > 0 ? "   ·   " + L.Extra : "");
                L.Date = line; L.TimeS = g.MeasureString(L.Time, L.TimeF, 10000, sf);
                SizeF s = g.MeasureString(line, L.TimeF, 10000, sf);
                L.W = s.Width; L.H = s.Height;
                return L;
            }
            if (style == "analog")
            {
                L.Dial = 190 * k; L.DateF = MakeFont(20 * k); L.ExtraF = MakeFont(15 * k);
                L.DateS = L.Date.Length > 0 ? g.MeasureString(L.Date, L.DateF, 10000, sf) : SizeF.Empty;
                string ext = (wtxt.Length > 0 ? wtxt : "") + (wtxt.Length > 0 && L.Extra.Length > 0 ? "   ·   " : "") + L.Extra; L.Extra = ext;
                L.ExtraS = ext.Length > 0 ? g.MeasureString(ext, L.ExtraF, 10000, sf) : SizeF.Empty;
                L.W = Math.Max(L.Dial, Math.Max(L.DateS.Width, L.ExtraS.Width + (weatherKind >= 0 && weather ? 24 * k : 0)));
                L.H = L.Dial + (L.DateS.Height > 0 ? gap + L.DateS.Height : 0) + (L.ExtraS.Height > 0 ? gap * 0.6f + L.ExtraS.Height : 0);
                return L;
            }
            float tpx = style == "stacked" ? 92 * k : 74 * k;
            L.TimeF = MakeFont(tpx); L.DateF = MakeFont(22 * k); L.ExtraF = MakeFont(16 * k);
            if (style == "stacked")
            {
                string[] hm = L.Time.Split(':');
                float w1 = g.MeasureString(hm[0], L.TimeF, 10000, sf).Width, w2 = g.MeasureString(hm.Length > 1 ? hm[1] : "", L.TimeF, 10000, sf).Width;
                float lh = g.MeasureString("00", L.TimeF, 10000, sf).Height * 0.86f;
                L.TimeS = new SizeF(Math.Max(w1, w2), lh * (hm.Length > 1 ? 2 : 1));
            }
            else L.TimeS = g.MeasureString(L.Time, L.TimeF, 10000, sf);
            L.DateS = L.Date.Length > 0 ? g.MeasureString(L.Date, L.DateF, 10000, sf) : SizeF.Empty;
            string ext2 = (wtxt.Length > 0 ? wtxt : "") + (wtxt.Length > 0 && L.Extra.Length > 0 ? "   ·   " : "") + L.Extra; L.Extra = ext2;
            L.ExtraS = ext2.Length > 0 ? g.MeasureString(ext2, L.ExtraF, 10000, sf) : SizeF.Empty;
            L.W = Math.Max(L.TimeS.Width, Math.Max(L.DateS.Width, L.ExtraS.Width + (weatherKind >= 0 && weather ? 26 * k : 0)));
            L.H = L.TimeS.Height + (L.DateS.Height > 0 ? gap * 0.4f + L.DateS.Height : 0) + (L.ExtraS.Height > 0 ? gap * 0.6f + L.ExtraS.Height : 0);
            return L;
        }

        string HAlign() { string h = pos.Length == 2 ? pos.Substring(1, 1) : "l"; return pos == "free" ? "l" : h; }

        void Draw(Graphics g, Layout L, DateTime now, int w, int h)
        {
            StringFormat sf = StringFormat.GenericTypographic;
            Color tc = TextColor();
            // подложка
            if (bgMode != "none")
            {
                RectangleF r = new RectangleF(1, 1, w - 3, h - 3);
                using (GraphicsPath p = RoundPath(r, Math.Min(radius * k, Math.Min(r.Width, r.Height) / 2)))
                using (SolidBrush b = new SolidBrush(BgColor())) g.FillPath(b, p);
            }
            float x0 = L.Pad + 3, y = L.Pad + 3, cw = L.W;
            string al = HAlign();
            Func<float, float> ax = (tw) => al == "r" ? x0 + cw - tw : al == "c" ? x0 + (cw - tw) / 2 : x0;

            if (style == "compact")
            {
                DrawText(g, L.Date, L.TimeF, tc, ax(L.W), y, sf, false);
                return;
            }
            if (style == "analog")
            {
                float cx = x0 + cw / 2, cy = y + L.Dial / 2;
                DrawDial(g, cx, cy, L.Dial / 2, now, tc);
                float yy = y + L.Dial;
                if (L.DateS.Height > 0) { yy += 6 * k; DrawText(g, L.Date, L.DateF, tc, x0 + (cw - L.DateS.Width) / 2, yy, sf, false); yy += L.DateS.Height; }
                if (L.ExtraS.Height > 0) { yy += 4 * k; float iw = weather && weatherKind >= 0 ? 24 * k : 0, xs = x0 + (cw - L.ExtraS.Width - iw) / 2; if (iw > 0) DrawWeatherIcon(g, weatherKind, xs + 9 * k, yy + L.ExtraS.Height / 2, 9 * k, Color.FromArgb((int)(tc.A * 0.9), tc)); DrawText(g, L.Extra, L.ExtraF, Color.FromArgb((int)(tc.A * 0.75), tc), xs + iw, yy, sf, false); }
                return;
            }
            // время
            bool dim = blink && (now.Second % 2 == 1);
            if (style == "stacked")
            {
                string[] hm = L.Time.Split(':');
                float lh = L.TimeS.Height / (hm.Length > 1 ? 2 : 1);
                for (int i = 0; i < hm.Length; i++)
                {
                    float tw = g.MeasureString(hm[i], L.TimeF, 10000, sf).Width;
                    DrawText(g, hm[i], L.TimeF, i == 0 ? tc : Color.FromArgb((int)(tc.A * 0.62), tc), ax(tw), y + i * lh - lh * 0.08f, sf, false);
                }
                y += L.TimeS.Height;
            }
            else
            {
                DrawTimeParts(g, L.Time, L.TimeF, tc, ax(L.TimeS.Width), y, sf, dim);
                y += L.TimeS.Height;
            }
            if (L.DateS.Height > 0)
            {
                y += 2 * k;
                DrawText(g, L.Date, L.DateF, Color.FromArgb((int)(tc.A * 0.92), tc), ax(L.DateS.Width), y, sf, false);
                y += L.DateS.Height;
            }
            if (L.ExtraS.Height > 0 || (weather && weatherKind >= 0))
            {
                y += 4 * k;
                float iconW = weather && weatherKind >= 0 ? 26 * k : 0;
                float xx = ax(L.ExtraS.Width + iconW);
                if (iconW > 0) DrawWeatherIcon(g, weatherKind, xx + 9 * k, y + L.ExtraS.Height / 2, 10 * k, Color.FromArgb((int)(tc.A * 0.9), tc));
                DrawText(g, L.Extra, L.ExtraF, Color.FromArgb((int)(tc.A * 0.75), tc), xx + iconW, y, sf, false);
            }
        }

        void DrawText(Graphics g, string s, Font f, Color c, float x, float y, StringFormat sf, bool noShadow)
        {
            if (s.Length == 0) return;
            if (shadow && !noShadow)
                using (SolidBrush sb = new SolidBrush(Color.FromArgb((int)(110 * (c.A / 255f)), 0, 0, 0))) g.DrawString(s, f, sb, x + 1.6f * k, y + 2f * k, sf);
            using (SolidBrush b = new SolidBrush(c)) g.DrawString(s, f, b, x, y, sf);
        }

        // Время по частям, чтобы двоеточие могло мигать
        void DrawTimeParts(Graphics g, string time, Font f, Color c, float x, float y, StringFormat sf, bool dimColon)
        {
            string[] parts = System.Text.RegularExpressions.Regex.Split(time, "(:)");
            foreach (string p in parts)
            {
                if (p.Length == 0) continue;
                float tw = g.MeasureString(p, f, 10000, sf).Width;
                Color cc = p == ":" && dimColon ? Color.FromArgb((int)(c.A * 0.18), c) : c;
                DrawText(g, p, f, cc, x, y, sf, false);
                x += tw;
            }
        }

        void DrawDial(Graphics g, float cx, float cy, float r, DateTime now, Color tc)
        {
            if (bgMode == "none" || true)
                using (Pen ring = new Pen(Color.FromArgb((int)(tc.A * 0.35), tc), Math.Max(1.5f, 2 * k))) g.DrawEllipse(ring, cx - r, cy - r, r * 2, r * 2);
            for (int i = 0; i < 60; i++)
            {
                double a = i * Math.PI / 30 - Math.PI / 2; bool big = i % 5 == 0;
                float r1 = r - (big ? 14 : 7) * k, r2 = r - 3 * k;
                using (Pen p = new Pen(Color.FromArgb((int)(tc.A * (big ? 0.9 : 0.4)), tc), (big ? 2.4f : 1.2f) * k) { StartCap = LineCap.Round, EndCap = LineCap.Round })
                    g.DrawLine(p, cx + (float)Math.Cos(a) * r1, cy + (float)Math.Sin(a) * r1, cx + (float)Math.Cos(a) * r2, cy + (float)Math.Sin(a) * r2);
            }
            double sec = now.Second + now.Millisecond / 1000.0, min = now.Minute + sec / 60.0, hr = now.Hour % 12 + min / 60.0;
            Hand(g, cx, cy, hr * Math.PI / 6 - Math.PI / 2, r * 0.5f, 5.5f * k, tc);
            Hand(g, cx, cy, min * Math.PI / 30 - Math.PI / 2, r * 0.78f, 3.6f * k, tc);
            if (seconds || true) Hand(g, cx, cy, sec * Math.PI / 30 - Math.PI / 2, r * 0.86f, 1.8f * k, Color.FromArgb(tc.A, Ui.Accent));
            using (SolidBrush b = new SolidBrush(Ui.Accent)) g.FillEllipse(b, cx - 5 * k, cy - 5 * k, 10 * k, 10 * k);
        }

        void Hand(Graphics g, float cx, float cy, double a, float len, float width, Color c)
        {
            using (Pen p = new Pen(c, width) { StartCap = LineCap.Round, EndCap = LineCap.Round })
                g.DrawLine(p, cx - (float)Math.Cos(a) * len * 0.12f, cy - (float)Math.Sin(a) * len * 0.12f, cx + (float)Math.Cos(a) * len, cy + (float)Math.Sin(a) * len);
        }

        static GraphicsPath RoundPath(RectangleF r, float rad)
        {
            GraphicsPath p = new GraphicsPath(); float d = Math.Max(0.01f, rad * 2);
            p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90); p.CloseFigure();
            return p;
        }

        // 0 солнце, 1 облачно, 2 дождь, 3 снег, 4 гроза, 5 туман, 6 переменная облачность
        void DrawWeatherIcon(Graphics g, int kind, float cx, float cy, float r, Color c)
        {
            using (Pen p = new Pen(c, Math.Max(1.4f, r * 0.16f)) { StartCap = LineCap.Round, EndCap = LineCap.Round })
            using (SolidBrush b = new SolidBrush(c))
            {
                if (kind == 0 || kind == 6)
                {
                    float sx = kind == 6 ? cx - r * 0.35f : cx, sy = kind == 6 ? cy - r * 0.35f : cy, sr = kind == 6 ? r * 0.5f : r * 0.5f;
                    g.DrawEllipse(p, sx - sr, sy - sr, sr * 2, sr * 2);
                    for (int i = 0; i < 8; i++) { double a = i * Math.PI / 4; g.DrawLine(p, sx + (float)Math.Cos(a) * sr * 1.5f, sy + (float)Math.Sin(a) * sr * 1.5f, sx + (float)Math.Cos(a) * sr * 2f, sy + (float)Math.Sin(a) * sr * 2f); }
                    if (kind == 0) return;
                }
                RectangleF cl = new RectangleF(cx - r * 0.95f, cy - r * 0.35f, r * 1.9f, r * 1.0f);
                using (GraphicsPath cp = new GraphicsPath())
                {
                    cp.AddEllipse(cl.X + cl.Width * 0.08f, cl.Y + cl.Height * 0.2f, cl.Width * 0.5f, cl.Height * 0.8f);
                    cp.AddEllipse(cl.X + cl.Width * 0.3f, cl.Y - cl.Height * 0.15f, cl.Width * 0.5f, cl.Height * 0.95f);
                    cp.AddEllipse(cl.X + cl.Width * 0.52f, cl.Y + cl.Height * 0.15f, cl.Width * 0.45f, cl.Height * 0.8f);
                    g.FillPath(b, cp);
                }
                if (kind == 2 || kind == 4)
                    for (int i = -1; i <= 1; i++) g.DrawLine(p, cx + i * r * 0.55f, cy + r * 0.75f, cx + i * r * 0.55f - r * 0.18f, cy + r * 1.15f);
                if (kind == 3)
                    for (int i = -1; i <= 1; i++) g.FillEllipse(b, cx + i * r * 0.55f - 1.5f, cy + r * 0.95f - 1.5f, 3.4f, 3.4f);
                if (kind == 4) g.DrawLines(p, new[] { new PointF(cx + r * 0.1f, cy + r * 0.5f), new PointF(cx - r * 0.2f, cy + r * 0.95f), new PointF(cx + r * 0.1f, cy + r * 0.95f), new PointF(cx - r * 0.15f, cy + r * 1.4f) });
                if (kind == 5) for (int i = 0; i < 2; i++) g.DrawLine(p, cx - r * 0.9f, cy + r * (0.85f + i * 0.35f), cx + r * 0.9f, cy + r * (0.85f + i * 0.35f));
            }
        }

        // ---------- вывод окна ----------
        void Present(Bitmap bmp, int w, int h)
        {
            Rectangle b = Screen.PrimaryScreen.Bounds, wa = Screen.PrimaryScreen.WorkingArea;
            string p = pos.Length == 2 ? pos : "tr";
            int mx = (int)(offX * Ui.Scale), my = (int)(offY * Ui.Scale);
            int x, y;
            if (pos == "free") { x = freeX; y = freeY; }
            else
            {
                string v = p.Substring(0, 1), hh = p.Substring(1, 1);
                x = hh == "l" ? b.Left + mx : hh == "r" ? b.Right - w - mx : b.Left + (b.Width - w) / 2;
                y = v == "t" ? wa.Top + my : v == "b" ? wa.Bottom - h - my : b.Top + (b.Height - h) / 2;
            }
            Point dst = new Point(x, y), src = Point.Empty; Size size = new Size(w, h);
            IntPtr screenDc = GetDC(IntPtr.Zero), memDc = CreateCompatibleDC(screenDc), hBmp = IntPtr.Zero, old = IntPtr.Zero;
            try
            {
                hBmp = bmp.GetHbitmap(Color.FromArgb(0));
                old = SelectObject(memDc, hBmp);
                BLENDFUNCTION bf = new BLENDFUNCTION { BlendOp = 0, BlendFlags = 0, SourceConstantAlpha = 255, AlphaFormat = 1 };
                UpdateLayeredWindow(Handle, screenDc, ref dst, ref size, memDc, ref src, 0, ref bf, 2);
            }
            finally
            {
                ReleaseDC(IntPtr.Zero, screenDc);
                if (hBmp != IntPtr.Zero) { SelectObject(memDc, old); DeleteObject(hBmp); }
                DeleteDC(memDc);
            }
        }

        // ---------- погода (Open-Meteo, без ключей) ----------
        static string Get(string url)
        {
            System.Net.ServicePointManager.SecurityProtocol = (System.Net.SecurityProtocolType)3072 | (System.Net.SecurityProtocolType)768;
            System.Net.HttpWebRequest rq = (System.Net.HttpWebRequest)System.Net.WebRequest.Create(url);
            rq.Timeout = 8000; rq.UserAgent = "Lumora/1.0";
            using (System.Net.WebResponse rs = rq.GetResponse())
            using (StreamReader sr = new StreamReader(rs.GetResponseStream(), Encoding.UTF8)) return sr.ReadToEnd();
        }

        void LoadWeather()
        {
            try
            {
                JavaScriptSerializer js = new JavaScriptSerializer();
                if (double.IsNaN(lat) || geoFor != city)
                {
                    Dictionary<string, object> g = js.Deserialize<Dictionary<string, object>>(Get("https://geocoding-api.open-meteo.com/v1/search?count=1&language=ru&format=json&name=" + Uri.EscapeDataString(city)));
                    System.Collections.IList res = g.ContainsKey("results") ? g["results"] as System.Collections.IList : null;
                    if (res == null || res.Count == 0) { SetStatus("Город не найден"); return; }
                    Dictionary<string, object> r0 = (Dictionary<string, object>)res[0];
                    lat = Convert.ToDouble(r0["latitude"], CultureInfo.InvariantCulture); lon = Convert.ToDouble(r0["longitude"], CultureInfo.InvariantCulture); geoFor = city;
                    SetStatus("Найден: " + Convert.ToString(r0["name"]));
                }
                string u = "https://api.open-meteo.com/v1/forecast?current=temperature_2m,apparent_temperature,weather_code&timezone=auto&temperature_unit=" + (units == "f" ? "fahrenheit" : "celsius") +
                    "&latitude=" + lat.ToString(CultureInfo.InvariantCulture) + "&longitude=" + lon.ToString(CultureInfo.InvariantCulture);
                Dictionary<string, object> d = js.Deserialize<Dictionary<string, object>>(Get(u));
                Dictionary<string, object> cur = (Dictionary<string, object>)d["current"];
                double t = Convert.ToDouble(cur["temperature_2m"], CultureInfo.InvariantCulture);
                int code = Convert.ToInt32(cur["weather_code"], CultureInfo.InvariantCulture);
                string desc; int kind = Describe(code, out desc);
                weatherKind = kind; weatherTemp = t;
                weatherText = Math.Round(t).ToString("0", CultureInfo.InvariantCulture).Replace("-", "−") + "°" + (units == "f" ? "F" : "") + "  " + desc;
                SetStatus("Погода: " + city);
            }
            catch (Exception ex) { Program.Log("weather: " + ex.Message); SetStatus("Нет связи с сервисом погоды"); }
        }

        static int Describe(int c, out string text)
        {
            if (c == 0) { text = "Ясно"; return 0; }
            if (c == 1 || c == 2) { text = c == 1 ? "Малооблачно" : "Переменная облачность"; return 6; }
            if (c == 3) { text = "Пасмурно"; return 1; }
            if (c == 45 || c == 48) { text = "Туман"; return 5; }
            if (c >= 51 && c <= 57) { text = "Морось"; return 2; }
            if (c >= 61 && c <= 67 || c >= 80 && c <= 82) { text = "Дождь"; return 2; }
            if (c >= 71 && c <= 77 || c == 85 || c == 86) { text = "Снег"; return 3; }
            if (c >= 95) { text = "Гроза"; return 4; }
            text = "Облачно"; return 1;
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) { timer.Stop(); timer.Dispose(); }
            base.Dispose(disposing);
        }
    }
}
