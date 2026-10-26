// Тестовые данные для интерфейса ui/index.html в обычном Chrome: node tools/mock.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const lib = path.join(process.env.LOCALAPPDATA, 'LiveWall', 'Library');
const cat = JSON.parse(fs.readFileSync(path.join(root, 'builtin', 'catalog.json'), 'utf8'));
const url = (p) => 'file:///' + p.split(path.sep).join('/').split('/').map(encodeURIComponent).join('/').replace('%3A', ':');
const items = [];
let t = 1000;
for (const c of cat) {
  const name = c.file.replace(/\.html$/, '');
  items.push({ id: c.file, name: c.name, genre: c.cat, type: /^Живой арт/.test(c.name) ? 'art' : 'html', desc: c.desc, audio: c.audio, mouse: c.mouse, clock: c.clock, tags: c.tags,
    thumb: url(path.join(root, 'builtin', 'thumbs', name + '.jpg')), added: t++ });
}
const idx = JSON.parse(fs.readFileSync(path.join(lib, '_video', 'index.json'), 'utf8'));
for (const [file, v] of Object.entries(idx)) {
  const name = file.replace(/\.mp4$/, '');
  items.push({ id: file, name, genre: v.group, tags: [v.tag], type: 'video', desc: 'Видео-обои в хорошем качестве (1080p). Играют по кругу без звука.', size: '11 МБ',
    thumb: url(path.join(lib, '_video', 'thumbs', name + '.jpg')), video: url(path.join(lib, file)), added: t++ });
}
const state = { t: 'state', items, current: 'Закат над океаном.html', paused: false, version: '1.0', musicWall: 'Пульсар.html',
  favs: ['Туманность.html', 'Сакура и луна.html'], recent: ['Закат над океаном.html', 'Туманность.html', 'Сакура и луна.html'],
  cfg: { theme: 0, accent: '#8136f2', radius: 1, tile: 262, zoom: 100, anim: 1, ss: 0, ssmin: 15, sssrc: 'all', ssshuf: 1, quality: 1, fps: 30, scalepct: 100, pausecovered: 1, pausebattery: 0, lowprio: 1,
    autostart: 1, taskbar: 1, music: 0, showwin: 0, widget: 1, wpos: 'bl', wsize: 100, wopacity: 50, wartist: 1, hotkeys: 1, clock: 0, cstyle: "digital", cpos: "tr", cfont: "light", ccolor: "white", chex: "#ffffff", cbg: "none", cbgcolor: "#000000", cdatefmt: "long", cwhere: "desktop", cunits: "c", ccity: "", csize: 100, calpha: 100, cbgalpha: 55, cradius: 20, cpad: 18, cox: 24, coy: 24, cshadow: 1, c24: 1, csec: 0, cblink: 1, cdate: 1, cweek: 0, cbat: 0, cweather: 0, clocked: 1 },
  per: {}, global: {} };
fs.writeFileSync(path.join(__dirname, 'mock-data.js'), 'window.MOCK = ' + JSON.stringify(state) + ';');
console.log('элементов:', items.length);
