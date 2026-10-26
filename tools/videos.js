// Скачивает популярные живые видео-обои (1080p) с motionbgs.com для личного использования.
// node tools/videos.js   -> файлы в %LOCALAPPDATA%\LiveWall\Library, превью и индекс в Library\_video
const fs = require('fs'), path = require('path');
const lib = path.join(process.env.LOCALAPPDATA, 'LiveWall', 'Library');
const vdir = path.join(lib, '_video'), tdir = path.join(vdir, 'thumbs');
fs.mkdirSync(tdir, { recursive: true });
const idxFile = path.join(vdir, 'index.json');
const index = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, 'utf8')) : {};
const UA = { 'User-Agent': 'Mozilla/5.0', Referer: 'https://motionbgs.com/' };
const MAX = 32e6;

// [тег, сколько, группа]
const more = process.argv[2] === "more";
const plan = more ? [
  ["girl", 30, "Аниме", 4], ["anime", 24, "Аниме", 4], ["goddess-of-victory-nikke", 8, "Аниме", 2], ["blue-archive", 8, "Аниме", 2],
  ["zenless-zone-zero", 6, "Аниме", 2], ["hatsune-miku", 6, "Аниме", 2], ["genshin-impact", 6, "Аниме", 2], ["honkai-star-rail", 6, "Аниме", 2], ["wuthering-waves", 5, "Аниме", 2],
] : [
  ['anime', 14, 'Аниме'], ['demon-slayer', 3, 'Аниме'], ['jujutsu-kaisen', 3, 'Аниме'], ['naruto-art', 3, 'Аниме'], ['one-piece', 3, 'Аниме'],
  ['chainsaw-man', 2, 'Аниме'], ['frieren', 2, 'Аниме'], ['solo-leveling', 2, 'Аниме'], ['attack-on-titan', 2, 'Аниме'], ['dragon-ball', 2, 'Аниме'],
  ['your-name', 2, 'Аниме'], ['ghibli', 2, 'Аниме'], ['hatsune-miku', 2, 'Аниме'], ['dandadan', 2, 'Аниме'], ['spy-x-family', 2, 'Аниме'],
  ['bleach', 2, 'Аниме'], ['blue-lock', 1, 'Аниме'], ['my-hero-academia', 2, 'Аниме'], ['girl', 4, 'Аниме'],
  ['genshin-impact', 3, 'Игры'], ['honkai-star-rail', 2, 'Игры'], ['zenless-zone-zero', 2, 'Игры'], ['wuthering-waves', 2, 'Игры'], ['minecraft', 3, 'Игры'],
  ['cyberpunk-2077', 3, 'Игры'], ['valorant', 2, 'Игры'], ['elden-ring', 2, 'Игры'], ['gta', 2, 'Игры'], ['pokemon', 2, 'Игры'], ['hollow-knight', 1, 'Игры'],
  ['rick-and-morty', 2, 'Кино и мемы'], ['spongebob', 2, 'Кино и мемы'], ['squid-game', 2, 'Кино и мемы'], ['joker', 2, 'Кино и мемы'], ['gravity-falls', 2, 'Кино и мемы'],
  ['sonic', 2, 'Кино и мемы'], ['hello-kitty', 2, 'Кино и мемы'], ['wednesday', 1, 'Кино и мемы'], ['star-wars', 2, 'Кино и мемы'], ['arcane', 2, 'Кино и мемы'],
  ['cat', 2, 'Кино и мемы'], ['dog', 1, 'Кино и мемы'],
  ['jdm', 3, 'Авто'], ['lamborghini', 2, 'Авто'], ['porsche', 2, 'Авто'], ['bmw', 2, 'Авто'], ['nissan', 1, 'Авто'],
  ['rain', 3, 'Природа и космос'], ['sunset', 3, 'Природа и космос'], ['space', 3, 'Природа и космос'], ['winter', 2, 'Природа и космос'], ['forest', 2, 'Природа и космос'], ['black-hole', 1, 'Природа и космос'],
];
const extras = more ? [] : [['among us', 'Кино и мемы', 2], ['capybara', 'Кино и мемы', 1]]; // поиск

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ent = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
async function get(url, bin) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(r.status); return bin ? Buffer.from(await r.arrayBuffer()) : await r.text(); }
    catch (e) { await sleep(800); }
  }
  return null;
}
const links = (html) => [...html.matchAll(/<a title="([^"]*?) live wallpaper" href=(\/[^ >]+)>/g)].map((m) => ({ title: ent(m[1]), href: m[2] }));

(async () => {
  const seen = new Set(Object.values(index).map((v) => v.href));
  const jobs = [];
  const gather = async (url, n, group, tag) => {
    const html = await get(url); if (!html) return;
    let got = 0;
    for (const l of links(html)) {
      if (got >= n) break;
      if (seen.has(l.href)) continue;
      seen.add(l.href); jobs.push({ ...l, group, tag }); got++;
    }
  };
  for (const [tag, n, group, pages] of plan) { for (let p = 1; p <= (pages || 1); p++) { await gather('https://motionbgs.com/tag:' + tag + '/' + (p > 1 ? p + '/' : ''), Math.ceil(n / (pages || 1)), group, tag); await sleep(250); } }
  for (const [q, group, n] of extras) { await gather('https://motionbgs.com/search?q=' + q.replace(/ /g, '+'), n, group, q); await sleep(250); }
  console.log('к загрузке:', jobs.length);
  let ok = 0, skip = 0, i = 0;
  async function worker() {
    while (i < jobs.length) {
      const j = jobs[i++];
      const name = j.title.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70);
      const file = name + '.mp4';
      if (fs.existsSync(path.join(lib, file))) { skip++; continue; }
      const page = await get('https://motionbgs.com' + j.href); if (!page) { skip++; continue; }
      const dl = page.match(/href=(\/dl\/hd\/\d+)/), poster = page.match(/poster=(\/i\/c\/960x540\/media\/[^ >]+)/);
      if (!dl) { skip++; continue; }
      const head = await fetch('https://motionbgs.com' + dl[1], { headers: UA, redirect: 'follow' });
      const len = +head.headers.get('content-length') || 0;
      if (!head.ok || (len && len > MAX)) { try { await head.body.cancel(); } catch { } skip++; console.log('пропуск (большой):', name, len); continue; }
      const buf = Buffer.from(await head.arrayBuffer());
      if (buf.length < 100000) { skip++; continue; }
      fs.writeFileSync(path.join(lib, file), buf);
      if (poster) { const t = await get('https://motionbgs.com' + poster[1], true); if (t) fs.writeFileSync(path.join(tdir, name + '.jpg'), t); }
      index[file] = { group: j.group, tag: j.tag, href: j.href };
      ok++; console.log(ok + '/' + jobs.length, j.group, name, (buf.length / 1e6).toFixed(1) + ' МБ');
      fs.writeFileSync(idxFile, JSON.stringify(index, null, 1), 'utf8');
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  console.log('готово: скачано', ok, 'пропущено', skip);
})();
