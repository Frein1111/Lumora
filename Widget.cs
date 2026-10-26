// Widget.cs: плавающий музыкальный виджет (трек, прогресс, пауза / назад / дальше). Вид и положение настраиваются.

using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace LiveWall
{
    class MediaWidget : Form
    {
        [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, int flags, IntPtr extra);
        [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
        [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd, out Native.RECT rect);
        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

        const byte VK_NEXT = 0xB0, VK_PREV = 0xB1, VK_PLAY = 0xB3, VK_VOL_DOWN = 0xAE, VK_VOL_UP = 0xAF;

        // ----- настройки (читаются из Config в ApplySettings) -----
        string style = "bar", pos = "bl", bg = "theme";
        float k = 1f;
        double idle = 0.5, active = 0.96;
        int offX = 10, offY = 8, baseW = 290, corner = 2;
        bool showCover = true, showArtist = true, showButtons = true, showProgress = false, showPaused = true, hideFull = true, onTaskbar = true, wheelVolume = true;
        Color customBg = Color.FromArgb(24, 27, 40);

        readonly Timer timer = new Timer(), tick = new Timer();
        TrackInfo info = new TrackInfo();
        Bitmap cover;
        string coverKey;
        Rectangle rPrev, rPlay, rNext, rBar;
        int hot = -1;
        bool polling, want, inside;
        DateTime lastHas = DateTime.MinValue;

        public MediaWidget()
        {
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.Manual;
            TopMost = true;
            DoubleBuffered = true;
            ApplySettings();
            timer.Interval = 1200;
            timer.Tick += delegate { Poll(); };
            // Плавное движение прогресса между опросами плеера
            tick.Interval = 500;
            tick.Tick += delegate { if (Visible && showProgress && info.Playing && info.PosSec >= 0) Invalidate(); };
        }

        protected override bool ShowWithoutActivation { get { return true; } }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= 0x08000000 | 0x80; // NOACTIVATE | TOOLWINDOW (нет в Alt+Tab)
                return cp;
            }
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            ApplyCorners();
            try { int none = unchecked((int)0xFFFFFFFE); DwmSetWindowAttribute(Handle, 34, ref none, 4); } catch { }
        }

        void ApplyCorners()
        {
            // Windows 11: 1 — прямые углы, 2 — скруглённые, 3 — слегка скруглённые
            if (!IsHandleCreated) return;
            try { int c = corner == 0 ? 1 : corner == 1 ? 3 : 2; DwmSetWindowAttribute(Handle, 33, ref c, 4); } catch { }
        }

        // ---------- настройки ----------
        int DefaultWidth(string st) { return st == "card" ? 340 : st == "mini" ? 230 : 290; }
        int BaseHeight() { return style == "card" ? (showProgress ? 100 : 80) : style == "mini" ? 36 : (showProgress ? 50 : 46); }

        Color BackFor()
        {
            switch (bg)
            {
                case "dark": return Color.FromArgb(18, 18, 22);
                case "light": return Color.FromArgb(246, 246, 250);
                case "accent": return Ui.Accent;
                case "custom": return customBg;
                default: return Ui.Panel;
            }
        }

        static bool IsLight(Color c) { return (c.R * 299 + c.G * 587 + c.B * 114) / 1000 > 150; }
        Color Fg { get { return IsLight(BackColor) ? Color.FromArgb(24, 26, 38) : Color.FromArgb(240, 241, 248); } }
        Color Muted { get { return IsLight(BackColor) ? Color.FromArgb(100, 104, 124) : Color.FromArgb(150, 156, 182); } }
        Color Chip { get { return IsLight(BackColor) ? Color.FromArgb(40, 0, 0, 0) : Color.FromArgb(46, 255, 255, 255); } }

        void ApplySettings()
        {
            style = Config.Get("wstyle", "bar"); if (style != "card" && style != "mini") style = "bar";
            pos = Config.Get("wpos", "bl");
            if (pos.Length != 2) pos = "bl";
            bg = Config.Get("wbg", "theme");
            k = Math.Max(0.6f, Math.Min(2f, Config.GetInt("wsize", 100) / 100f));
            idle = Math.Max(0.1, Math.Min(1.0, Config.GetInt("wopacity", 50) / 100.0));
            active = Math.Max(idle, Math.Min(1.0, Config.GetInt("wactive", 96) / 100.0));
            offX = Config.GetInt("wox", 10); offY = Config.GetInt("woy", 8);
            baseW = Config.GetInt("wwidth", DefaultWidth(style));
            corner = Config.GetInt("wcorner", 2);
            showCover = Config.GetBool("wcover", true); showArtist = Config.GetBool("wartist", true); showButtons = Config.GetBool("wbuttons", true);
            showProgress = Config.GetBool("wprogress", false); showPaused = Config.GetBool("wpaused", true); hideFull = Config.GetBool("wfull", true);
            onTaskbar = Config.GetBool("wtaskbar", true); wheelVolume = Config.GetBool("wwheel", true);
            try { string h = Config.Get("wcolor", "").TrimStart('#'); if (h.Length == 6) customBg = Color.FromArgb(Convert.ToInt32(h.Substring(0, 2), 16), Convert.ToInt32(h.Substring(2, 2), 16), Convert.ToInt32(h.Substring(4, 2), 16)); } catch { }
            BackColor = BackFor();
            Size = new Size((int)Math.Round(Ui.S(baseW) * k), (int)Math.Round(Ui.S(BaseHeight()) * k));
            Opacity = inside ? active : idle;
            ApplyCorners();
            tick.Enabled = showProgress && timer.Enabled;
        }

        public void Restyle()
        {
            ApplySettings();
            if (Visible) UpdateVisibility();
            Invalidate();
        }

        public void Enable(bool on)
        {
            if (on == timer.Enabled) return;
            if (on) { timer.Start(); tick.Enabled = showProgress; Poll(); }
            else { timer.Stop(); tick.Stop(); want = false; Hide(); }
        }

        // ---------- данные о треке ----------
        async void Poll()
        {
            if (polling) return;
            polling = true;
            try
            {
                TrackInfo t = await MediaWatcher.Poll(true);
                bool has = t.Title.Length > 0 || t.Artist.Length > 0;
                // При переключении трека плеер на мгновение «пропадает» — не прячем виджет и не стираем название
                if (has) lastHas = DateTime.Now;
                else if ((DateTime.Now - lastHas).TotalSeconds < 7 && (info.Title.Length > 0 || info.Artist.Length > 0)) { UpdateVisibility(); return; }
                bool changed = t.Key != info.Key || t.Playing != info.Playing || t.CoverBytes != info.CoverBytes || (showProgress && t.PosSec >= 0);
                if (t.Key != coverKey || (cover == null && t.CoverBytes != null))
                {
                    coverKey = t.Key;
                    if (cover != null) { cover.Dispose(); cover = null; }
                    if (t.CoverBytes != null)
                        try { using (Image img = Image.FromStream(new MemoryStream(t.CoverBytes))) cover = new Bitmap(img, 160, 160); } catch { }
                    changed = true;
                }
                info = t;
                want = has && (t.Playing || showPaused);
                if (changed) Invalidate();
                UpdateVisibility();
            }
            catch (Exception ex) { Program.Log("Widget: " + ex.Message); }
            finally { polling = false; }
        }

        // ---------- положение ----------
        void UpdateVisibility()
        {
            bool show = want && !(hideFull && ForegroundIsFullscreen());
            if (show)
            {
                Rectangle b = Screen.PrimaryScreen.Bounds, wa = Screen.PrimaryScreen.WorkingArea;
                int mx = Ui.S(offX), my = Ui.S(offY);
                string v = pos.Substring(0, 1), h = pos.Substring(1, 1);   // t/m/b и l/c/r
                int x = h == "l" ? b.Left + mx : h == "r" ? b.Right - Width - mx : b.Left + (b.Width - Width) / 2;
                int y;
                if (v == "t") y = wa.Top + my;
                else if (v == "m") y = b.Top + (b.Height - Height) / 2;
                else
                {
                    int bar = b.Bottom - wa.Bottom;
                    y = onTaskbar && bar > 0 && Height <= bar ? b.Bottom - bar + (bar - Height) / 2 : (onTaskbar && bar > 0 ? b.Bottom - Height - Ui.S(2) : b.Bottom - Height - my);
                }
                Point p = new Point(x, y);
                if (Location != p) Location = p;
                if (!Visible) Show();
                SetWindowPos(Handle, new IntPtr(-1), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0010);
            }
            else if (Visible) Hide();
        }

        static bool ForegroundIsFullscreen()
        {
            try
            {
                IntPtr fg = GetForegroundWindow();
                if (fg == IntPtr.Zero) return false;
                Native.RECT r;
                if (!GetWindowRect(fg, out r)) return false;
                Rectangle b = Screen.FromHandle(fg).Bounds;
                if (r.Left > b.Left || r.Top > b.Top || r.Right < b.Right || r.Bottom < b.Bottom) return false;
                // обычное развёрнутое окно не закрывает панель задач; полноэкранное — закрывает
                Rectangle wa = Screen.FromHandle(fg).WorkingArea;
                return wa.Height == b.Height || r.Bottom - r.Top >= b.Height;
            }
            catch { return false; }
        }

        static void Key(byte vk)
        {
            keybd_event(vk, 0, 0, IntPtr.Zero);
            keybd_event(vk, 0, 2, IntPtr.Zero);
        }

        static string Time(double sec)
        {
            if (sec < 0) sec = 0;
            int s = (int)sec;
            return s >= 3600 ? string.Format("{0}:{1:00}:{2:00}", s / 3600, s / 60 % 60, s % 60) : string.Format("{0}:{1:00}", s / 60, s % 60);
        }

        // ---------- рисование (координаты логические, масштаб k) ----------
        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(BackColor);
            g.ScaleTransform(k, k);
            int W = (int)Math.Round(Width / k), H = (int)Math.Round(Height / k);
            bool card = style == "card", mini = style == "mini";
            int pad = card ? Ui.S(10) : Ui.S(7);
            int cs = card ? Ui.S(60) : mini ? Ui.S(22) : Ui.S(32);
            int shift = showProgress && !mini && !card ? Ui.S(2) : 0;
            Rectangle cr = new Rectangle(pad, card ? pad : (H - cs) / 2 - shift, cs, cs);
            int tx = pad;
            if (showCover)
            {
                using (GraphicsPath p = Ui.Round(cr, Ui.S(card ? 10 : 7)))
                {
                    if (cover != null) { g.SetClip(p); g.DrawImage(cover, cr); g.ResetClip(); }
                    else
                    {
                        using (LinearGradientBrush b = new LinearGradientBrush(cr, Color.FromArgb(124, 58, 237), Color.FromArgb(255, 96, 170), 50f)) g.FillPath(b, p);
                        using (Font f = new Font("Segoe UI Symbol", Ui.S(card ? 20f : 11f), GraphicsUnit.Pixel)) TextRenderer.DrawText(g, "♫", f, cr, Color.White, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);
                    }
                }
                tx = cr.Right + Ui.S(card ? 12 : 9);
            }

            int bw = card ? Ui.S(30) : mini ? Ui.S(26) : Ui.S(28);
            int nBtn = showButtons ? (mini ? 1 : 3) : 0;
            string title = info.Title.Length > 0 ? info.Title : "Ничего не играет";
            Color fg = Fg, muted = Muted;

            if (card)
            {
                int tw = W - tx - pad;
                using (Font tf = Ui.Font(10.5f, true)) TextRenderer.DrawText(g, title, tf, new Rectangle(tx, pad - Ui.S(1), tw, Ui.S(22)), fg, TextFormatFlags.EndEllipsis | TextFormatFlags.NoPadding | TextFormatFlags.Left | TextFormatFlags.NoPrefix);
                if (showArtist) using (Font af = Ui.Font(9f, false)) TextRenderer.DrawText(g, info.Artist, af, new Rectangle(tx, pad + Ui.S(21), tw, Ui.S(18)), muted, TextFormatFlags.EndEllipsis | TextFormatFlags.NoPadding | TextFormatFlags.Left | TextFormatFlags.NoPrefix);
                int by = H - pad - bw + Ui.S(2);
                if (showProgress)
                {
                    rBar = new Rectangle(pad, pad + Ui.S(66), W - pad * 2, Ui.S(8));
                    DrawProgress(g, rBar);
                    if (info.PosSec >= 0)
                        using (Font tfn = Ui.Font(7.5f, false))
                            TextRenderer.DrawText(g, Time(info.NowPos()) + " / " + Time(info.DurSec), tfn, new Rectangle(tx, pad + Ui.S(40), W - tx - pad, Ui.S(14)), muted, TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);
                    by = H - pad - bw + Ui.S(2);
                }
                else rBar = Rectangle.Empty;
                LayoutButtons(W - pad - nBtn * bw, showProgress ? pad + Ui.S(28) - Ui.S(2) : by, bw, nBtn);
                if (showProgress) { rPrev.Y = rPlay.Y = rNext.Y = pad + Ui.S(32) - Ui.S(2); }
            }
            else
            {
                int btnW = nBtn * bw;
                int right = W - pad - btnW;
                int tw = Math.Max(10, right - tx - Ui.S(4));
                bool two = showArtist && !mini;
                using (Font tf = Ui.Font(8.5f, true))
                    TextRenderer.DrawText(g, title, tf, new Rectangle(tx, two ? H / 2 - Ui.S(16) - shift : H / 2 - Ui.S(9) - shift, tw, Ui.S(18)), fg, TextFormatFlags.EndEllipsis | TextFormatFlags.NoPadding | TextFormatFlags.Left | TextFormatFlags.NoPrefix);
                if (two) using (Font af = Ui.Font(7.5f, false)) TextRenderer.DrawText(g, info.Artist, af, new Rectangle(tx, H / 2 + Ui.S(1) - shift, tw, Ui.S(16)), muted, TextFormatFlags.EndEllipsis | TextFormatFlags.NoPadding | TextFormatFlags.Left | TextFormatFlags.NoPrefix);
                if (showProgress && !mini) { rBar = new Rectangle(pad, H - Ui.S(10), W - pad * 2, Ui.S(6)); DrawProgress(g, rBar); }
                else rBar = Rectangle.Empty;
                LayoutButtons(right, (H - bw) / 2 - shift, bw, nBtn);
            }
            if (nBtn > 0)
            {
                if (nBtn == 3) { DrawButton(g, rPrev, 0); DrawButton(g, rNext, 2); }
                DrawButton(g, rPlay, 1);
            }
            else rPrev = rPlay = rNext = Rectangle.Empty;
        }

        void LayoutButtons(int x, int y, int bw, int n)
        {
            if (n == 0) return;
            if (n == 1) { rPlay = new Rectangle(x, y, bw, bw); rPrev = rNext = Rectangle.Empty; return; }
            rPrev = new Rectangle(x, y, bw, bw);
            rPlay = new Rectangle(x + bw, y, bw, bw);
            rNext = new Rectangle(x + bw * 2, y, bw, bw);
        }

        void DrawProgress(Graphics g, Rectangle r)
        {
            int th = Math.Max(3, r.Height / 2), y = r.Y + (r.Height - th) / 2;
            Rectangle track = new Rectangle(r.X, y, r.Width, th);
            using (GraphicsPath p = Ui.Round(track, th / 2f)) using (SolidBrush b = new SolidBrush(Chip)) g.FillPath(b, p);
            double pos2 = info.NowPos();
            if (pos2 < 0 || info.DurSec <= 0) return;
            int w = (int)(track.Width * Math.Min(1.0, pos2 / info.DurSec));
            if (w < th) w = th;
            Rectangle fill = new Rectangle(track.X, y, w, th);
            Color c = bg == "accent" ? Fg : Ui.Accent;
            using (GraphicsPath p = Ui.Round(fill, th / 2f)) using (SolidBrush b = new SolidBrush(c)) g.FillPath(b, p);
            if (hot == 3) using (SolidBrush b = new SolidBrush(c)) g.FillEllipse(b, fill.Right - th, y - 1, th + 2, th + 2);
        }

        void DrawButton(Graphics g, Rectangle r, int kind)
        {
            bool h = hot == kind;
            bool onAccent = bg == "accent";
            Color circle = onAccent ? Fg : Ui.Accent, glyph = kind == 1 ? (onAccent ? BackColor : Ui.OnAccent) : Fg;
            if (kind == 1)
            {
                Rectangle c = Rectangle.Inflate(r, -Ui.S(1), -Ui.S(1));
                using (SolidBrush b = new SolidBrush(h && !onAccent ? Ui.AccentHover : circle)) g.FillEllipse(b, c);
            }
            else if (h) using (SolidBrush b = new SolidBrush(Chip)) g.FillEllipse(b, r);
            float cx = r.X + r.Width / 2f, cy = r.Y + r.Height / 2f, s = r.Width * 0.18f;
            using (SolidBrush b = new SolidBrush(glyph))
            {
                if (kind == 1)
                {
                    if (info.Playing)
                    {
                        float w = Math.Max(2f, s * 0.46f), hh = s * 1.15f;
                        g.FillRectangle(b, cx - s * 0.7f - w / 2, cy - hh, w, hh * 2);
                        g.FillRectangle(b, cx + s * 0.7f - w / 2, cy - hh, w, hh * 2);
                    }
                    else g.FillPolygon(b, new PointF[] { new PointF(cx - s * 0.7f, cy - s * 1.15f), new PointF(cx + s * 1.1f, cy), new PointF(cx - s * 0.7f, cy + s * 1.15f) });
                }
                else
                {
                    float w = Math.Max(1.6f, s * 0.36f);
                    if (kind == 2)
                    {
                        g.FillPolygon(b, new PointF[] { new PointF(cx - s * 0.9f, cy - s), new PointF(cx + s * 0.5f, cy), new PointF(cx - s * 0.9f, cy + s) });
                        g.FillRectangle(b, cx + s * 0.6f, cy - s, w, s * 2);
                    }
                    else
                    {
                        g.FillPolygon(b, new PointF[] { new PointF(cx + s * 0.9f, cy - s), new PointF(cx - s * 0.5f, cy), new PointF(cx + s * 0.9f, cy + s) });
                        g.FillRectangle(b, cx - s * 0.6f - w, cy - s, w, s * 2);
                    }
                }
            }
        }

        // ---------- мышь ----------
        Point Logical(Point pt) { return new Point((int)(pt.X / k), (int)(pt.Y / k)); }

        int HitTest(Point pt)
        {
            Point p = Logical(pt);
            if (rPrev.Contains(p)) return 0;
            if (rPlay.Contains(p)) return 1;
            if (rNext.Contains(p)) return 2;
            if (!rBar.IsEmpty && Rectangle.Inflate(rBar, 0, Ui.S(5)).Contains(p) && info.DurSec > 0) return 3;
            return -1;
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            int h = HitTest(e.Location);
            if (h != hot) { hot = h; Cursor = h >= 0 ? Cursors.Hand : Cursors.Default; Invalidate(); }
        }

        protected override void OnMouseEnter(EventArgs e) { base.OnMouseEnter(e); inside = true; Opacity = active; }

        protected override void OnMouseLeave(EventArgs e) { base.OnMouseLeave(e); inside = false; Opacity = idle; if (hot != -1) { hot = -1; Invalidate(); } }

        protected override void OnMouseWheel(MouseEventArgs e)
        {
            base.OnMouseWheel(e);
            if (!wheelVolume) return;
            for (int i = 0; i < 2; i++) Key(e.Delta > 0 ? VK_VOL_UP : VK_VOL_DOWN);
        }

        protected override async void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            if (e.Button != MouseButtons.Left) return;
            int h = HitTest(e.Location);
            if (h < 0) return;
            if (h == 3)
            {
                // перемотка по клику на полосе прогресса
                Point p = Logical(e.Location);
                double f = Math.Max(0, Math.Min(1, (p.X - rBar.X) / (double)rBar.Width));
                if (await MediaWatcher.Seek(f * info.DurSec)) { info.PosSec = f * info.DurSec; info.PolledAt = DateTime.Now; Invalidate(); }
                return;
            }
            Key(h == 0 ? VK_PREV : h == 1 ? VK_PLAY : VK_NEXT);
            if (h == 1) info.Playing = !info.Playing;
            Invalidate();
            // быстро обновим название после переключения
            Timer t = new Timer(); t.Interval = 700; t.Tick += delegate { t.Stop(); t.Dispose(); Poll(); }; t.Start();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) { timer.Stop(); timer.Dispose(); tick.Dispose(); if (cover != null) cover.Dispose(); }
            base.Dispose(disposing);
        }
    }
}
