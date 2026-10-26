// Gallery.cs: цвета и помощники для окон на WinForms (виджет музыки). Основной интерфейс — в папке ui.

using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace LiveWall
{
    class Theme
    {
        public string Name; public bool Light;
        public Color Bg, Panel, Card, Line, Fg, Muted;
        public Theme(string name, bool light, Color bg, Color panel, Color card, Color line, Color fg, Color muted)
        { Name = name; Light = light; Bg = bg; Panel = panel; Card = card; Line = line; Fg = fg; Muted = muted; }
    }

    static class Ui
    {
        // Оформление: тема (фон) и акцентный цвет настраиваются пользователем
        public static readonly Theme[] Themes = new Theme[]
        {
            new Theme("Полночь", false, Color.FromArgb(15, 17, 26), Color.FromArgb(22, 25, 37), Color.FromArgb(32, 36, 53), Color.FromArgb(44, 49, 72), Color.FromArgb(236, 238, 248), Color.FromArgb(148, 155, 183)),
            new Theme("Графит", false, Color.FromArgb(20, 20, 22), Color.FromArgb(28, 28, 31), Color.FromArgb(40, 40, 44), Color.FromArgb(56, 56, 62), Color.FromArgb(238, 238, 242), Color.FromArgb(150, 150, 160)),
            new Theme("Чёрная", false, Color.FromArgb(0, 0, 0), Color.FromArgb(12, 12, 14), Color.FromArgb(24, 24, 28), Color.FromArgb(40, 40, 46), Color.FromArgb(240, 240, 244), Color.FromArgb(140, 140, 150)),
            new Theme("Светлая", true, Color.FromArgb(243, 244, 249), Color.FromArgb(255, 255, 255), Color.FromArgb(232, 234, 243), Color.FromArgb(216, 219, 232), Color.FromArgb(28, 31, 46), Color.FromArgb(104, 110, 134)),
        };
        public static readonly Color[] Accents = new Color[]
        {
            Color.FromArgb(129, 54, 242), Color.FromArgb(167, 112, 255), Color.FromArgb(255, 110, 170), Color.FromArgb(255, 95, 95),
            Color.FromArgb(255, 150, 70), Color.FromArgb(235, 190, 60), Color.FromArgb(70, 210, 140), Color.FromArgb(50, 200, 210), Color.FromArgb(80, 170, 255)
        };

        public static Color Bg, Panel, Card, Line, Fg, Muted, Accent, AccentHover;
        public static readonly Color Green = Color.FromArgb(60, 200, 130);
        public static readonly Color Danger = Color.FromArgb(255, 100, 120);
        public static bool Light;

        static Ui() { Apply(0, Accents[0]); }

        public static void Apply(int theme, Color accent)
        {
            Theme t = Themes[Math.Max(0, Math.Min(Themes.Length - 1, theme))];
            Bg = t.Bg; Panel = t.Panel; Card = t.Card; Line = t.Line; Fg = t.Fg; Muted = t.Muted; Light = t.Light;
            Accent = accent;
            AccentHover = Color.FromArgb(Math.Min(255, accent.R + 24), Math.Min(255, accent.G + 24), Math.Min(255, accent.B + 24));
        }

        // Цвет текста поверх акцентной заливки
        public static Color OnAccent
        {
            get { return (Accent.R * 299 + Accent.G * 587 + Accent.B * 114) / 1000 > 175 ? Color.FromArgb(24, 26, 38) : Color.White; }
        }

        static float scale;
        public static float Scale
        {
            get
            {
                if (scale == 0)
                    using (Graphics g = Graphics.FromHwnd(IntPtr.Zero)) scale = g.DpiX / 96f;
                return scale;
            }
        }
        public static int S(int v) { return (int)Math.Round(v * Scale); }
        public static float S(float v) { return v * Scale; }

        public static GraphicsPath Round(RectangleF r, float radius)
        {
            GraphicsPath p = new GraphicsPath();
            float d = Math.Min(radius * 2, Math.Min(r.Width, r.Height));
            if (d <= 0) { p.AddRectangle(r); return p; }
            p.AddArc(r.X, r.Y, d, d, 180, 90);
            p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            p.CloseFigure();
            return p;
        }

        public static Font Font(float size, bool bold)
        {
            return new Font(bold ? "Segoe UI Semibold" : "Segoe UI", size, GraphicsUnit.Point);
        }

        [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr SendMessage(IntPtr hwnd, int msg, IntPtr wParam, string lParam);
        public static void SetCue(TextBox box, string text) { SendMessage(box.Handle, 0x1501, new IntPtr(1), text); }
    }
}
