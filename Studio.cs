// Studio.cs: данные для интерфейса — список обоев, избранное, недавние, «вид обоев» (яркость, цвет и т.д.).

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Web.Script.Serialization;

namespace LiveWall
{
    // Избранное, недавние и настройки вида обоев (хранятся рядом с настройками)
    static class Store
    {
        static readonly string FavPath = Path.Combine(Program.DataDir, "favs.txt");
        static readonly string RecentPath = Path.Combine(Program.DataDir, "recent.txt");
        static readonly string LooksPath = Path.Combine(Program.DataDir, "looks.json");
        static HashSet<string> favs;
        static List<string> recent;
        static Dictionary<string, object> looks;   // "" — общие, остальное — по имени файла

        static JavaScriptSerializer Json() { return new JavaScriptSerializer { MaxJsonLength = 32 * 1024 * 1024 }; }

        static List<string> ReadLines(string path)
        {
            try { if (File.Exists(path)) return File.ReadAllLines(path, Encoding.UTF8).Where(l => l.Trim().Length > 0).ToList(); }
            catch { }
            return new List<string>();
        }

        public static HashSet<string> Favs
        {
            get { if (favs == null) favs = new HashSet<string>(ReadLines(FavPath), StringComparer.OrdinalIgnoreCase); return favs; }
        }

        public static void SetFav(string id, bool on)
        {
            if (on) Favs.Add(id); else Favs.Remove(id);
            try { File.WriteAllLines(FavPath, Favs.ToArray(), Encoding.UTF8); } catch { }
        }

        public static List<string> Recent
        {
            get { if (recent == null) recent = ReadLines(RecentPath); return recent; }
        }

        public static void AddRecent(string id)
        {
            List<string> r = Recent;
            r.RemoveAll(x => string.Equals(x, id, StringComparison.OrdinalIgnoreCase));
            r.Insert(0, id);
            if (r.Count > 24) r.RemoveRange(24, r.Count - 24);
            try { File.WriteAllLines(RecentPath, r.ToArray(), Encoding.UTF8); } catch { }
        }

        static Dictionary<string, object> Looks
        {
            get
            {
                if (looks != null) return looks;
                looks = new Dictionary<string, object>();
                try
                {
                    if (File.Exists(LooksPath))
                    {
                        Dictionary<string, object> d = Json().Deserialize<Dictionary<string, object>>(File.ReadAllText(LooksPath, Encoding.UTF8));
                        if (d != null) looks = d;
                    }
                }
                catch (Exception ex) { Program.Log("looks: " + ex.Message); }
                return looks;
            }
        }

        static void SaveLooks() { try { File.WriteAllText(LooksPath, Json().Serialize(Looks), new UTF8Encoding(false)); } catch { } }

        // look == null — сбросить
        public static void SetLook(string id, Dictionary<string, object> look)
        {
            if (look == null || look.Count == 0) Looks.Remove(id ?? ""); else Looks[id ?? ""] = look;
            SaveLooks();
        }

        public static Dictionary<string, object> GetLook(string id)
        {
            object o;
            return Looks.TryGetValue(id ?? "", out o) ? o as Dictionary<string, object> : null;
        }

        public static Dictionary<string, object> AllPerWallpaper()
        {
            Dictionary<string, object> r = new Dictionary<string, object>();
            foreach (KeyValuePair<string, object> kv in Looks) if (kv.Key.Length > 0) r[kv.Key] = kv.Value;
            return r;
        }

        static double Num(Dictionary<string, object> a, Dictionary<string, object> b, string key, double def)
        {
            foreach (Dictionary<string, object> d in new[] { b, a })
                if (d != null && d.ContainsKey(key)) try { return Convert.ToDouble(d[key], CultureInfo.InvariantCulture); } catch { }
            return def;
        }

        // Скрипт, который накладывает «вид» на страницу обоев (фильтры, затемнение, параметры видео)
        public static string LookScript(string fileName, out bool wantsSound)
        {
            Dictionary<string, object> g = GetLook(""), p = fileName == null ? null : GetLook(fileName);
            double b = Num(g, p, "b", 100), c = Num(g, p, "c", 100), s = Num(g, p, "s", 100), h = Num(g, p, "h", 0), bl = Num(g, p, "bl", 0),
                dim = Num(g, p, "dim", 0), sp = Num(g, p, "sp", 100), vol = Num(g, p, "vol", 0);
            string fit = "cover";
            foreach (Dictionary<string, object> d in new[] { p, g }) if (d != null && d.ContainsKey("fit")) { fit = Convert.ToString(d["fit"]); break; }
            if (fit != "contain" && fit != "fill") fit = "cover";
            wantsSound = vol > 0;
            Func<double, string> f = v => v.ToString("0.###", CultureInfo.InvariantCulture);
            return "(function(){var d=document.documentElement,f=[];" +
                "if(" + f(b) + "!=100)f.push('brightness(" + f(b / 100) + ")');" +
                "if(" + f(c) + "!=100)f.push('contrast(" + f(c / 100) + ")');" +
                "if(" + f(s) + "!=100)f.push('saturate(" + f(s / 100) + ")');" +
                "if(" + f(h) + "!=0)f.push('hue-rotate(" + f(h) + "deg)');" +
                "if(" + f(bl) + ">0)f.push('blur(" + f(bl) + "px)');" +
                "d.style.filter=f.join(' ');d.style.transform=" + (bl > 0 ? "'scale(" + f(1 + bl / 120) + ")'" : "''") + ";" +
                "var m=document.getElementById('lw-dim');" +
                (dim > 0 ? "if(!m){m=document.createElement('div');m.id='lw-dim';m.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;background:#000;pointer-events:none;z-index:2147483647';(document.body||d).appendChild(m);}m.style.opacity='" + f(dim / 100) + "';" : "if(m)m.remove();") +
                "var v=document.querySelector('video');if(v){v.playbackRate=" + f(sp / 100) + ";v.volume=" + f(vol / 100) + ";v.muted=" + (vol > 0 ? "false" : "true") + ";v.style.objectFit='" + fit + "';}" +
                "})();";
        }
    }

    // Описание обоев для интерфейса
    static class Studio
    {
        public const string Version = "1.0";

        public static string TypeOf(string path)
        {
            if (Directory.Exists(path)) return "lively";
            string ext = Path.GetExtension(path).ToLowerInvariant();
            if (ext == ".mp4" || ext == ".webm" || ext == ".m4v") return "video";
            if (ext == ".gif") return "gif";
            if (ext == ".html" || ext == ".htm") return Path.GetFileName(path).StartsWith("Живой арт", StringComparison.OrdinalIgnoreCase) ? "art" : "html";
            return "image";
        }

        static string Esc(string s) { return Uri.EscapeDataString(s); }

        static string SizeText(string path)
        {
            try
            {
                if (Directory.Exists(path)) return null;
                double mb = new FileInfo(path).Length / 1048576.0;
                return mb >= 10 ? ((int)mb) + " МБ" : mb.ToString("0.#", CultureInfo.InvariantCulture) + " МБ";
            }
            catch { return null; }
        }

        public static Dictionary<string, object> Describe(string path)
        {
            string file = Path.GetFileName(path), noExt = Path.GetFileNameWithoutExtension(path);
            CatalogItem ci = Catalog.Get(file);
            string type = TypeOf(path);
            Dictionary<string, object> d = new Dictionary<string, object>();
            d["id"] = file;
            d["type"] = type;
            d["name"] = ci != null ? ci.Name : Program.DisplayName(path);
            string genre = ci != null ? ci.Cat : null, desc = ci != null ? ci.Desc : null, thumb = null, video = null;
            if (ci != null && File.Exists(Catalog.ThumbPath(file))) thumb = "https://app.livewall/builtin/thumbs/" + Esc(noExt) + ".jpg";
            else if (ci != null && File.Exists(Catalog.PackThumbPath(file))) thumb = "https://lib.livewall/_packs/thumbs/" + Esc(noExt) + ".jpg";
            if (ci == null)
            {
                string vg = type == "video" ? VideoMeta.Group(file) : null;
                if (type == "video")
                {
                    genre = vg ?? "Мои";
                    if (vg != null) desc = "Видео-обои в хорошем качестве (1080p). Играют по кругу и засыпают, когда рабочий стол закрыт окнами.";
                    if (File.Exists(VideoMeta.Thumb(file))) thumb = "https://lib.livewall/_video/thumbs/" + Esc(noExt) + ".jpg";
                    video = "https://lib.livewall/" + Esc(file);
                }
                else if (type == "image" || type == "gif")
                {
                    genre = "Мои";
                    thumb = "https://lib.livewall/" + Esc(file);
                }
                else if (type == "lively")
                {
                    genre = "Мои";
                    Dictionary<string, object> li = Program.LivelyInfo(path);
                    desc = Program.InfoString(li, "Desc");
                    string pic = Program.InfoString(li, "Thumbnail");
                    if (pic.Length == 0) pic = Program.InfoString(li, "Preview");
                    if (pic.Length > 0 && File.Exists(Path.Combine(path, pic))) thumb = "https://lib.livewall/" + Esc(file) + "/" + string.Join("/", pic.Replace('\\', '/').Split('/').Select(Esc));
                }
                else { genre = "Мои"; }
                if (type == "html" || type == "art") genre = "Мои";
            }
            d["genre"] = genre ?? "Мои";
            if (ci != null && ci.Tags.Length > 0) d["tags"] = ci.Tags;
            else if (type == "video") { string vt = VideoMeta.Tag(file); if (vt != null) d["tags"] = new[] { vt }; }
            if (!string.IsNullOrEmpty(desc)) d["desc"] = desc;
            if (thumb != null) d["thumb"] = thumb;
            if (video != null) d["video"] = video;
            if (ci != null) { d["audio"] = ci.Audio; d["mouse"] = ci.Mouse; d["clock"] = ci.Clock; }
            string size = SizeText(path);
            if (size != null && type != "html" && type != "art") d["size"] = size;
            try { d["added"] = (long)(Directory.GetCreationTimeUtc(path) - new DateTime(2020, 1, 1)).TotalSeconds; } catch { d["added"] = 0L; }
            return d;
        }

        public static List<Dictionary<string, object>> Items()
        {
            VideoMeta.Reload();
            return Program.LibraryItems().Select(Describe).ToList();
        }

        public static Dictionary<string, object> CfgSnapshot()
        {
            Dictionary<string, object> c = new Dictionary<string, object>();
            c["theme"] = Config.Theme;
            System.Drawing.Color a = Config.AccentColor;
            c["accent"] = "#" + a.R.ToString("x2") + a.G.ToString("x2") + a.B.ToString("x2");
            c["radius"] = Config.GetInt("uiradius", 1);
            c["tile"] = Config.GetInt("uitile", 262);
            c["zoom"] = Config.GetInt("uizoom", 100);
            c["anim"] = Config.GetBool("uianim", true) ? 1 : 0;
            c["ss"] = Config.GetBool("ss", false) ? 1 : 0;
            c["ssmin"] = Config.GetInt("ssmin", 15);
            c["sssrc"] = Config.Get("sssrc", "all");
            c["ssshuf"] = Config.GetBool("ssshuf", true) ? 1 : 0;
            c["quality"] = Config.Quality;
            c["fps"] = Config.Fps;
            c["scalepct"] = (int)Math.Round(double.Parse(Config.QualityScale, CultureInfo.InvariantCulture) * 100);
            c["pausecovered"] = Config.PauseWhenCovered ? 1 : 0;
            c["pausebattery"] = Config.PauseOnBattery ? 1 : 0;
            c["lowprio"] = Config.LowPriority ? 1 : 0;
            c["autostart"] = Autostart.Enabled ? 1 : 0;
            c["taskbar"] = Config.TransparentTaskbar ? 1 : 0;
            c["music"] = Config.MusicMode ? 1 : 0;
            c["showwin"] = Config.ShowWindowOnStart ? 1 : 0;
            c["widget"] = Config.MediaWidget ? 1 : 0;
            c["wpos"] = Config.Get("wpos", "bl");
            c["wsize"] = Config.GetInt("wsize", 100);
            c["wopacity"] = Config.GetInt("wopacity", 50);
            c["wartist"] = Config.GetBool("wartist", true) ? 1 : 0;
            c["hotkeys"] = Config.GetBool("hotkeys", true) ? 1 : 0;
            c["clock"] = Config.GetBool("clock", false) ? 1 : 0;
            c["cstyle"] = Config.Get("cstyle", "digital"); c["cpos"] = Config.Get("cpos", "tr"); c["cfont"] = Config.Get("cfont", "light"); c["ccolor"] = Config.Get("ccolor", "white");
            c["chex"] = Config.Get("chex", "#ffffff"); c["cbg"] = Config.Get("cbg", "none"); c["cbgcolor"] = Config.Get("cbgcolor", "#000000"); c["cdatefmt"] = Config.Get("cdatefmt", "long");
            c["cwhere"] = Config.Get("cwhere", "desktop"); c["cunits"] = Config.Get("cunits", "c"); c["ccity"] = Config.Get("ccity", "");
            c["csize"] = Config.GetInt("csize", 100); c["calpha"] = Config.GetInt("calpha", 100); c["cbgalpha"] = Config.GetInt("cbgalpha", 55); c["cradius"] = Config.GetInt("cradius", 20); c["cpad"] = Config.GetInt("cpad", 18);
            c["cox"] = Config.GetInt("cox", 24); c["coy"] = Config.GetInt("coy", 24);
            c["cshadow"] = Config.GetBool("cshadow", true) ? 1 : 0; c["c24"] = Config.GetBool("c24", true) ? 1 : 0; c["csec"] = Config.GetBool("csec", false) ? 1 : 0; c["cblink"] = Config.GetBool("cblink", true) ? 1 : 0;
            c["cdate"] = Config.GetBool("cdate", true) ? 1 : 0; c["cweek"] = Config.GetBool("cweek", false) ? 1 : 0; c["cbat"] = Config.GetBool("cbat", false) ? 1 : 0; c["cweather"] = Config.GetBool("cweather", false) ? 1 : 0;
            c["clocked"] = Config.GetBool("clocked", true) ? 1 : 0;
            c["discord"] = Config.GetBool("discord", false) ? 1 : 0;
            c["discordid"] = Config.Get("discordid", "");
            c["discordprog"] = Config.GetBool("discordprog", true) ? 1 : 0;
            c["discordartist"] = Config.GetBool("discordartist", true) ? 1 : 0;
            c["discordcover"] = Config.GetBool("discordcover", true) ? 1 : 0;
            c["discordcredit"] = Config.GetBool("discordcredit", true) ? 1 : 0;
            c["discordalbum"] = Config.GetBool("discordalbum", true) ? 1 : 0;
            c["discordbtn"] = Config.GetBool("discordbtn", true) ? 1 : 0;
            c["wstyle"] = Config.Get("wstyle", "bar");
            c["wbg"] = Config.Get("wbg", "theme");
            c["wcolor"] = Config.Get("wcolor", "#1b1d28");
            c["wactive"] = Config.GetInt("wactive", 96);
            c["wox"] = Config.GetInt("wox", 10);
            c["woy"] = Config.GetInt("woy", 8);
            c["wwidth"] = Config.GetInt("wwidth", 0);
            c["wcorner"] = Config.GetInt("wcorner", 2);
            c["wcover"] = Config.GetBool("wcover", true) ? 1 : 0;
            c["wbuttons"] = Config.GetBool("wbuttons", true) ? 1 : 0;
            c["wprogress"] = Config.GetBool("wprogress", false) ? 1 : 0;
            c["wpaused"] = Config.GetBool("wpaused", true) ? 1 : 0;
            c["wfull"] = Config.GetBool("wfull", true) ? 1 : 0;
            c["wtaskbar"] = Config.GetBool("wtaskbar", true) ? 1 : 0;
            c["wwheel"] = Config.GetBool("wwheel", true) ? 1 : 0;
            return c;
        }

        public static string StateJson(LiveWallContext app, string page)
        {
            Dictionary<string, object> s = new Dictionary<string, object>();
            s["t"] = "state";
            s["items"] = Items();
            s["current"] = app.CurrentWallpaper == null ? null : Path.GetFileName(app.CurrentWallpaper);
            s["paused"] = app.IsPaused;
            s["musicWall"] = app.MusicWallpaper == null ? null : Path.GetFileName(app.MusicWallpaper);
            s["version"] = Version;
            s["favs"] = Store.Favs.ToArray();
            s["recent"] = Store.Recent.ToArray();
            s["cfg"] = CfgSnapshot();
            s["per"] = Store.AllPerWallpaper();
            Dictionary<string, object> g = Store.GetLook("");
            s["global"] = g ?? new Dictionary<string, object>();
            s["discordStatus"] = app.DiscordStatus;
            s["clockStatus"] = app.ClockStatus;
            if (page != null) s["page"] = page;
            return new JavaScriptSerializer { MaxJsonLength = 32 * 1024 * 1024 }.Serialize(s);
        }
    }
}
