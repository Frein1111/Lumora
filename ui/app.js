// Lumora — интерфейс управления обоями. Работает внутри WebView2 приложения, команды уходят в C# через postMessage.
(function () {
  'use strict';
  var $ = function (s, e) { return (e || document).querySelector(s); };
  var $$ = function (s, e) { return Array.prototype.slice.call((e || document).querySelectorAll(s)); };

  // ---------- иконки ----------
  var P = {
    grid: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
    heart: 'M12 20.2s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 7.5 2.7c0 5.5-7.5 10-7.5 10z',
    recent: 'M12 7v5l3.2 1.9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9.5h4M16 9.5h4M4 14.5h4M16 14.5h4',
    spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
    image: 'M4 5h16v14H4zM4 16l4.5-4.5L13 16l3-3 4 4M15.5 9.5h.01',
    folder: 'M3.5 6.5h6l2 2.2h9v9.8h-17z',
    sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
    plus: 'M12 5v14M5 12h14',
    play: 'M8 5.5v13l11-6.5z',
    pause: 'M8.5 5.5v13M15.5 5.5v13',
    next: 'M6 5.5v13l9-6.5zM18 5.5v13',
    shuffle: 'M3 7h3c5 0 5 10 10 10h5m0 0l-3-3m3 3l-3 3M3 17h3c1.5 0 2.6-.7 3.6-1.8M21 7h-5c-1.4 0-2.5.6-3.4 1.6M21 7l-3-3m3 3l-3 3',
    power: 'M12 3v9M6.8 6.8a7.5 7.5 0 1 0 10.4 0',
    trash: 'M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7',
    note: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
    cursor: 'M5 3.5l6 16 2.3-6.7L20 10.5z',
    clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    x: 'M6 6l12 12M18 6L6 18',
    palette: 'M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.4-1.9-.4-1 .3-2.1 1.4-2.1H17a3.5 3.5 0 0 0 3.5-3.5C20.5 7 16.7 3.5 12 3.5zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01',
    bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6z',
    cycle: 'M20 11a8 8 0 0 0-14.5-3.5M4 4v4h4M4 13a8 8 0 0 0 14.5 3.5M20 20v-4h-4',
    monitor: 'M3.5 5h17v11h-17zM8 20h8M12 16v4',
    keyboard: 'M3 7h18v10H3zM7 11h.01M10.5 11h.01M14 11h.01M17 11h.01M7.5 14h9',
    info: 'M12 11v5.5M12 7.8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z',
    planet: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM3.8 14c4.5-1.4 12.8-4.6 16.4-1.2',
    leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19l7-7',
    gamepad: 'M7 9h10a4 4 0 0 1 4 4.4l-.5 3a2.2 2.2 0 0 1-3.8 1L15 16H9l-1.7 1.4a2.2 2.2 0 0 1-3.8-1l-.5-3A4 4 0 0 1 7 9zM8 11.5v3M6.5 13h3M16 12h.01M18 14h.01',
    smile: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14c1 1.5 2.2 2 3.5 2s2.5-.5 3.5-2M9 9.5h.01M15 9.5h.01',
    car: 'M4 15.5v-3l2-4.5h12l2 4.5v3M3 15.5h18M7 18.5v-3M17 18.5v-3M7.5 12.5h.01M16.5 12.5h.01',
    zoomS: 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
    zoomL: 'M5 5h14v14H5z',
    volume: 'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
    reset: 'M4 12a8 8 0 1 1 2.5 5.8M4 18v-4.5h4.5',
    moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
    prev: 'M18 5.5v13l-9-6.5zM6 5.5v13',
    dots: 'M5 12h.01M12 12h.01M19 12h.01',
    list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
    chat: 'M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5zM8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'
  };
  function ic(n, extra) { return '<svg class="i' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24"><path d="' + (P[n] || P.spark) + '"/></svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  $('#logo').innerHTML = '<path fill="currentColor" d="M11 2.6l2.3 6.4 6.4 2.3-6.4 2.3L11 20l-2.3-6.4L2.3 11.3 8.7 9z"/><path fill="currentColor" opacity=".7" d="M19 2.6l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/>';

  var FEAT_FILTER = [['any', 'Любые'], ['audio', 'С музыкой'], ['clock', 'С временем'], ['mouse', 'С курсором']];
  var GENRE_ICON = { 'Интерактив': 'cursor', 'Космос': 'planet', 'Природа': 'leaf', 'Аниме': 'spark', 'Музыка': 'note', 'Часы': 'clock', 'Интерактив': 'cursor', 'Игры': 'gamepad', 'Кино и мемы': 'smile', 'Авто': 'car', 'Природа и космос': 'leaf', 'Мои': 'folder' };
  var TYPE_LABEL = { html: 'Анимация', art: 'Живой арт', video: 'Видео', image: 'Картинка', gif: 'GIF', lively: 'Lively' };
  var TYPE_FILTER = [['all', 'Всё'], ['html', 'Анимации'], ['art', 'Арты'], ['video', 'Видео'], ['file', 'Файлы']];
  var LOOK_DEF = { b: 100, c: 100, s: 100, h: 0, bl: 0, dim: 0, sp: 100, vol: 0, fit: 'cover' };

  // ---------- состояние ----------
  var S = {
    items: [], byId: {}, current: null, paused: false, favs: {}, recent: [], cfg: {}, per: {}, global: {}, musicWall: null,
    page: 'library', sub: 'appearance', f: { q: '', type: 'all', nav: 'all', sort: 'top', feat: 'any', tag: '' }, sel: null, view: [], version: '', seed: Math.random(), cols: 4
  };
  var bridge = window.chrome && window.chrome.webview;
  function send(c, d) {
    var m = d || {}; m.c = c;
    if (bridge) bridge.postMessage(JSON.stringify(m));
    else if (window.MOCK_SEND) window.MOCK_SEND(m);
  }

  // ---------- оформление ----------
  var THEMES = [['obsidian', 'Обсидиан', ['#0b0b0e', '#15151a', '#1c1c23']], ['graphite', 'Графит', ['#161618', '#202024', '#27272c']], ['black', 'Чёрная', ['#000', '#0d0d10', '#141418']], ['light', 'Светлая', ['#eeeef2', '#fff', '#e5e5eb']]];
  var ACCENTS = ['#8136f2', '#4d8dff', '#2ec4d6', '#3ddc84', '#c8f23d', '#ffb02e', '#ff6a3d', '#ff5fa2', '#c264ff', '#f2f2f4'];
  function hexRgb(h) { h = (h || '#8136f2').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hsl2hex(h, s, l) { s /= 100; l /= 100; var a = s * Math.min(l, 1 - l), f = function (n) { var k = (n + h / 30) % 12, c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }
  function rgb2hue(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return Math.round(h); }
  function applyLook() {
    var c = S.cfg, root = document.documentElement;
    var th = c.theme == null ? 0 : +c.theme;
    root.setAttribute('data-theme', (THEMES[th] || THEMES[0])[0]);
    var hex = c.accent || '#8136f2', rgb = hexRgb(hex);
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-rgb', rgb.join(','));
    var lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    root.style.setProperty('--accent-ink', lum > 0.56 ? '#15110a' : '#ffffff');
    root.setAttribute('data-r', c.radius == null ? 1 : c.radius);
    root.setAttribute('data-anim', c.anim == null || +c.anim ? 1 : 0);
    root.style.setProperty('--tile', (c.tile || 262) + 'px');
    document.body.style.zoom = ((c.zoom || 100) / 100);
  }
  function setCfg(k, v, silent) {
    S.cfg[k] = v;
    send('cfg', { k: k, v: v });
    if (/^discord/.test(k)) setTimeout(function () { var dp = document.getElementById('dprev'); if (dp) dp.innerHTML = discordPreview(); }, 0);
    if (/^c[a-z0-9]/.test(k) && k !== 'clock') setTimeout(function () { var q = document.getElementById('cprev'); if (q) q.innerHTML = clockPreview(); var sh = function (id, v) { var e = document.getElementById(id); if (e) e.hidden = !v; }; sh('cbgr1', S.cfg.cbg !== 'none'); sh('cbgr2', S.cfg.cbg !== 'none'); sh('cbgr3', S.cfg.cbg !== 'none'); sh('cwr1', +S.cfg.cweather); sh('cwr2', +S.cfg.cweather); var ch = document.getElementById('chex'); if (ch) ch.style.display = S.cfg.ccolor === 'custom' ? '' : 'none'; var cb = document.getElementById('cbgcolor'); if (cb) cb.style.display = S.cfg.cbg === 'custom' ? '' : 'none'; }, 0);
    if (/^w/.test(k) && k !== 'widget') setTimeout(function () { var p = document.getElementById('wprev'); if (p) p.innerHTML = widgetPreview(); var cr = document.getElementById('wcolorRow'); if (cr) cr.hidden = S.cfg.wbg !== 'custom'; }, 0);
    if (['theme', 'accent', 'radius', 'anim', 'tile', 'zoom'].indexOf(k) >= 0) applyLook();
  }

  // ---------- вспомогательное ----------
  function effLook(id) { var o = {}, k; for (k in LOOK_DEF) o[k] = LOOK_DEF[k]; for (k in S.global) o[k] = S.global[k]; var p = S.per[id]; if (p) for (k in p) o[k] = p[k]; return o; }
  function hue(name) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360; return h; }
  function thumbHtml(it) {
    if (it.thumb) return '<img loading="lazy" decoding="async" draggable="false" src="' + esc(it.thumb) + '" alt="">';
    var h = hue(it.name);
    return '<div style="position:absolute;inset:0;background:linear-gradient(135deg,hsl(' + h + ' 55% 34%),hsl(' + (h + 50) % 360 + ' 60% 16%))"></div>';
  }
  var toastT;
  function toast(msg, icon) {
    var t = $('#toast'); t.innerHTML = ic(icon || 'check') + '<span>' + esc(msg) + '</span>'; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2300);
  }
  // Мелкие жанры сливаются в крупные коллекции — в боковой панели их всего шесть
  var GENRE_MAP = { 'Космос': 'Природа и космос', 'Природа': 'Природа и космос', 'Музыка': 'Интерактив', 'Часы': 'Интерактив' };
  var COLLECTIONS = ['Аниме', 'Игры', 'Кино и мемы', 'Природа и космос', 'Авто', 'Интерактив'];
  var TAG_RU = {
    'anime': 'Другое', 'girl': 'Девушки', 'demon-slayer': 'Клинок, рассекающий демонов', 'jujutsu-kaisen': 'Магическая битва', 'naruto-art': 'Наруто', 'one-piece': 'Ван-Пис', 'chainsaw-man': 'Человек-бензопила',
    'frieren': 'Фрирен', 'solo-leveling': 'Solo Leveling', 'attack-on-titan': 'Атака титанов', 'dragon-ball': 'Драгонболл', 'your-name': 'Твоё имя', 'ghibli': 'Гибли', 'hatsune-miku': 'Хацунэ Мику',
    'dandadan': 'Дандадан', 'spy-x-family': 'Семья шпиона', 'bleach': 'Блич', 'blue-lock': 'Синяя тюрьма', 'my-hero-academia': 'Моя геройская академия', 'goddess-of-victory-nikke': 'NIKKE', 'blue-archive': 'Blue Archive',
    'genshin-impact': 'Genshin Impact', 'honkai-star-rail': 'Honkai: Star Rail', 'zenless-zone-zero': 'Zenless Zone Zero', 'wuthering-waves': 'Wuthering Waves', 'minecraft': 'Minecraft', 'cyberpunk-2077': 'Cyberpunk 2077',
    'valorant': 'Valorant', 'elden-ring': 'Elden Ring', 'gta': 'GTA', 'pokemon': 'Pokémon', 'hollow-knight': 'Hollow Knight', 'rick-and-morty': 'Рик и Морти', 'spongebob': 'Губка Боб', 'squid-game': 'Игра в кальмара',
    'joker': 'Джокер', 'gravity-falls': 'Гравити Фолз', 'sonic': 'Соник', 'hello-kitty': 'Hello Kitty', 'wednesday': 'Уэнсдей', 'star-wars': 'Звёздные войны', 'arcane': 'Arcane', 'cat': 'Коты', 'dog': 'Собаки',
    'among us': 'Among Us', 'capybara': 'Капибара', 'jdm': 'JDM', 'lamborghini': 'Lamborghini', 'porsche': 'Porsche', 'bmw': 'BMW', 'nissan': 'Nissan', 'rain': 'Дождь', 'sunset': 'Закаты', 'space': 'Космос',
    'winter': 'Зима', 'forest': 'Лес', 'black-hole': 'Чёрные дыры'
  };
  function tagLabel(t) { return TAG_RU[t] || (t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ')); }
  function genreOf(it) { var g = it.genre || 'Разное'; return GENRE_MAP[g] || g; }
  function typeKey(it) { return it.type === 'image' || it.type === 'gif' || it.type === 'lively' ? 'file' : it.type; }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
  function pct(el) { var mn = +el.min, mx = +el.max; el.style.setProperty('--p', ((+el.value - mn) / (mx - mn) * 100) + '%'); }

  // ---------- левая панель ----------
  function genres() {
    var m = {};
    S.items.forEach(function (it) { var g = genreOf(it); m[g] = (m[g] || 0) + 1; });
    var out = [];
    COLLECTIONS.forEach(function (c) { if (m[c]) { out.push([c, m[c]]); delete m[c]; } });
    var mine = m['Мои']; delete m['Мои'];
    Object.keys(m).sort().forEach(function (g) { out.push([g, m[g]]); });
    if (mine) out.push(['Мои', mine]);
    return out;
  }
  function favCount() { var n = 0; S.items.forEach(function (i) { if (S.favs[i.id]) n++; }); return n; }
  function renderNav() {
    var h = '<h6>Библиотека</h6>';
    function nv(key, icon, label, n) { var on = S.page === 'library' && S.f.nav === key; return '<button class="nv' + (on ? ' on' : '') + '" data-nav="' + esc(key) + '">' + ic(icon) + '<span>' + esc(label) + '</span>' + (n != null ? '<span class="n">' + n + '</span>' : '') + '</button>'; }
    h += nv('all', 'grid', 'Все обои', S.items.length);
    h += nv('fav', 'heart', 'Избранное', favCount());
    h += nv('recent', 'recent', 'Недавние', S.recent.filter(function (id) { return S.byId[id]; }).length);
    h += '<h6>Коллекции</h6>';
    genres().forEach(function (g) { h += nv('g:' + g[0], GENRE_ICON[g[0]] || 'spark', g[0] === 'Мои' ? 'Мои файлы' : g[0], g[1]); });
    $('#nav').innerHTML = h;
    $('#navSet').innerHTML = ic('sliders') + '<span>Настройки</span>';
    $('#navSet').classList.toggle('on', S.page === 'settings');
  }

  // ---------- фильтрация ----------
  function computeView() {
    var f = S.f, a = S.items.slice(), q = f.q.trim().toLowerCase();
    if (f.nav === 'fav') a = a.filter(function (i) { return S.favs[i.id]; });
    else if (f.nav === 'recent') { var rank = {}; S.recent.forEach(function (id, n) { rank[id] = n; }); a = a.filter(function (i) { return rank[i.id] != null; }).sort(function (x, y) { return rank[x.id] - rank[y.id]; }); }
    else if (f.nav.indexOf('g:') === 0) { var g = f.nav.slice(2); a = a.filter(function (i) { return genreOf(i) === g; }); }
    if (f.type !== 'all') a = a.filter(function (i) { return typeKey(i) === f.type; });
    if (f.feat !== 'any') a = a.filter(function (i) { return !!i[f.feat]; });
    if (q) a = a.filter(function (i) { return (i.name + ' ' + genreOf(i) + ' ' + (i.desc || '') + ' ' + (TYPE_LABEL[i.type] || '')).toLowerCase().indexOf(q) >= 0; });
    // подборка тегов для текущего набора (до выбора самого тега)
    var tc = {}; a.forEach(function (i) { (i.tags || []).forEach(function (t) { tc[t] = (tc[t] || 0) + 1; }); });
    var HIDE = ['аниме', 'арт', 'параллакс', 'частицы', 'шейдер', 'интерактив', 'неон', 'lumora', 'текст'];
    S.tagList = Object.keys(tc).filter(function (t) { return tc[t] >= 2 && HIDE.indexOf(t) < 0; }).sort(function (x, y) { return tc[y] - tc[x]; }).slice(0, 10).map(function (t) { return [t, tc[t]]; });
    if (f.tag) a = a.filter(function (i) { return (i.tags || []).indexOf(f.tag) >= 0; });
    if (f.nav !== 'recent') {
      if (f.sort === 'top') { var tr = {}; a.forEach(function (i) { tr[i.id] = topRank(i); }); a.sort(function (x, y) { return tr[x.id] - tr[y.id]; }); }
      else if (f.sort === 'name') a.sort(function (x, y) { return x.name.localeCompare(y.name, 'ru', { numeric: true }); });
      else if (f.sort === 'new') a.sort(function (x, y) { return (y.added || 0) - (x.added || 0); });
      else if (f.sort === 'fav') a.sort(function (x, y) { return (S.favs[y.id] ? 1 : 0) - (S.favs[x.id] ? 1 : 0) || x.name.localeCompare(y.name, 'ru', { numeric: true }); });
      else if (f.sort === 'rand') { var sd = S.seed; a.sort(function (x, y) { return frac(hash(x.id) + sd) - frac(hash(y.id) + sd); }); }
    }
    S.view = a; return a;
  }
  // «Подборка»: сначала отобранные красивые обои, затем по оценке, а самые мрачные — в конце
  var FEAT = null;
  function topRank(it) {
    if (!FEAT) { FEAT = {}; (window.FEATURED || []).forEach(function (id, n) { FEAT[id] = n; }); }
    if (FEAT[it.id] != null) return FEAT[it.id];
    var sc = (window.SCORES || {})[it.id]; if (sc == null) sc = 55;
    var n = it.name.toLowerCase(), ugly = (window.UGLY || []).some(function (w) { return n.indexOf(w) >= 0; });
    return 1000 + (ugly ? 600 : 0) + (100 - sc);
  }
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) % 1000003; return h; }
  function frac(x) { return (Math.sin(x) * 10000) % 1; }

  // ---------- шапка ----------
  function pageTitle() {
    if (S.page === 'settings') return 'Настройки';
    var n = S.f.nav;
    return n === 'all' ? 'Все обои' : n === 'fav' ? 'Избранное' : n === 'recent' ? 'Недавние' : n.slice(2);
  }
  function renderTop() {
    var t = $('#top'), b = $('#bar');
    if (S.page === 'settings') {
      t.innerHTML = '<h1>Настройки</h1>'; b.style.display = 'none'; return;
    }
    b.style.display = '';
    var v = S.view.length;
    var q = $('#q'), hadFocus = q && document.activeElement === q, qv = S.f.q;
    t.innerHTML = '<h1>' + esc(pageTitle()) + '<small id="cnt">' + v + '</small></h1>' +
      '<label class="search">' + ic('search') + '<input id="q" type="text" placeholder="Поиск обоев" autocomplete="off" spellcheck="false"><kbd>Ctrl K</kbd></label>' +
      '<button class="btn pri" data-a="add">' + ic('plus') + 'Добавить</button>';
    $('#q').value = qv; if (hadFocus) { $('#q').focus(); var l = qv.length; $('#q').setSelectionRange(l, l); }
    var seg = '<div class="seg" id="tseg">' + TYPE_FILTER.map(function (x) { return '<button data-type="' + x[0] + '" class="' + (S.f.type === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var sort = '<div class="sel"><select id="sort">' + [['top', 'Подборка'], ['name', 'По названию'], ['new', 'Сначала новые'], ['fav', 'Избранные выше'], ['rand', 'Вперемешку']].map(function (x) { return '<option value="' + x[0] + '"' + (S.f.sort === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>';
    var tags = '';
    var list = S.tagList || [];
    if (list.length && S.f.nav !== 'all' && S.f.nav !== 'fav' && S.f.nav !== 'recent') tags = '<div class="tagrow"><button data-tag="" class="' + (S.f.tag ? '' : 'on') + '">Все</button>' + list.map(function (t) { return '<button data-tag="' + esc(t[0]) + '" class="' + (S.f.tag === t[0] ? 'on' : '') + '">' + esc(tagLabel(t[0])) + '<i>' + t[1] + '</i></button>'; }).join('') + '</div>';
    b.innerHTML = seg + '<span class="grow"></span>' + sort + tags;
  }

  // ---------- главная область ----------
  function heroHtml() {
    var cur = S.current && S.byId[S.current];
    if (!cur) return '<div class="hero lite empty"><div class="hl"><span class="eyebrow">Обои выключены</span><h2>Выберите обои для рабочего стола</h2><div class="acts"><button class="btn pri" data-a="random">' + ic('shuffle') + 'Случайные</button></div></div></div>';
    return '<div class="hero lite' + (S.paused ? ' paused' : '') + '"><div class="bg" style="background-image:url(\'' + esc(cur.thumb || '') + '\')"></div><div class="hl">' +
      '<span class="eyebrow"><i></i>' + (S.paused ? 'На паузе' : 'Сейчас на рабочем столе') + '</span><h2>' + esc(cur.name) + '</h2>' +
      '<div class="acts"><button class="btn pri" data-a="pause">' + ic(S.paused ? 'play' : 'pause') + (S.paused ? 'Продолжить' : 'Пауза') + '</button>' +
      '<button class="ib-l" data-a="next" title="Следующие обои">' + ic('next') + '</button><button class="ib-l" data-a="random" title="Случайные обои">' + ic('shuffle') + '</button>' +
      '<button class="ib-l" data-a="off" title="Выключить обои">' + ic('power') + '</button></div></div></div>';
  }
  function cardHtml(it, idx) {
    var tags = '';
    if (it.audio) tags += '<span class="tg" title="Реагирует на музыку">' + ic('note') + '</span>';
    if (it.mouse) tags += '<span class="tg" title="Реагирует на курсор">' + ic('cursor') + '</span>';
    if (it.clock) tags += '<span class="tg" title="Показывает время">' + ic('clock') + '</span>';
    if (it.type === 'video') tags += '<span class="tg" title="Видео">' + ic('film') + '</span>';
    var cur = it.id === S.current, fav = !!S.favs[it.id];
    return '<div class="card' + (cur ? ' cur' : '') + (S.sel === it.id ? ' sel' : '') + '" data-id="' + esc(it.id) + '" tabindex="0" style="--i:' + Math.min(idx, 22) + '">' +
      '<div class="m">' + thumbHtml(it) + '<div class="shade"></div>' +
      (cur ? '<div class="live"><span class="live-tag">СЕЙЧАС</span></div>' : '') +
      (fav && !cur ? '<span class="fvmark">' + ic('heart') + '</span>' : '') +
      '<div class="act"><button class="ib fv' + (fav ? ' on' : '') + '" data-a="fav" title="' + (fav ? 'Убрать из избранного' : 'В избранное') + '">' + ic('heart') + '</button><button class="ib" data-a="apply" title="Установить">' + ic('play') + '</button></div>' +
      '<div class="tags">' + tags + '</div></div>' +
      '<div class="cap"><b>' + esc(it.name) + '</b><small>' + esc(genreOf(it)) + '</small></div></div>';
  }
  function renderLibrary() {
    var v = computeView(), h = '', sc = $('#scroll');
    var showHero = S.f.nav === 'all' && !S.f.q && S.f.type === 'all' && !S.f.tag;
    if (showHero) h += heroHtml();
    if (!v.length) {
      h += '<div class="empty-s"><div>' + ic('search') + '<b>Ничего не найдено</b>Попробуйте другой запрос или фильтр</div></div>';
    } else {
      if (showHero) h += '<div class="sec"><h3>' + (S.f.sort === 'top' ? 'Подборка Lumora' : 'Все обои') + '</h3><span>' + v.length + '</span></div>';
      h += '<div class="grid" id="grid">' + v.map(cardHtml).join('') + '</div>';
    }
    var top = sc.scrollTop; sc.innerHTML = h; sc.scrollTop = top;
    $$('input[type=range]', sc).forEach(pct);
    var c = $('#cnt'); if (c) c.textContent = v.length;
    measureCols();
  }
  function measureCols() {
    var g = $('#grid'); if (!g) return;
    var cols = getComputedStyle(g).gridTemplateColumns.split(' ').length; S.cols = Math.max(1, cols);
  }

  // ---------- панель сведений ----------
  var LOOK_ROWS = [['b', 'Яркость', 40, 160, '%'], ['c', 'Контраст', 60, 160, '%'], ['s', 'Насыщенность', 0, 200, '%'], ['h', 'Оттенок', -180, 180, '°'], ['bl', 'Размытие', 0, 20, 'px'], ['dim', 'Затемнение', 0, 80, '%']];
  function lookSliders(L, isVideo, scope) {
    var h = LOOK_ROWS.map(function (r) { return '<div class="sl"><span class="l">' + r[1] + '</span><span class="v" data-v="' + r[0] + '">' + L[r[0]] + r[4] + '</span><input type="range" data-look="' + r[0] + '" min="' + r[2] + '" max="' + r[3] + '" value="' + L[r[0]] + '"></div>'; }).join('');
    if (isVideo) {
      h += '<div class="sl"><span class="l">Скорость видео</span><span class="v" data-v="sp">' + (L.sp / 100).toFixed(2).replace(/0$/, '') + '×</span><input type="range" data-look="sp" min="25" max="200" step="5" value="' + L.sp + '"></div>';
      h += '<div class="sl"><span class="l">Громкость видео</span><span class="v" data-v="vol">' + L.vol + '%</span><input type="range" data-look="vol" min="0" max="100" value="' + L.vol + '"></div>';
      h += '<div style="padding:8px 0"><div class="seg" data-fit>' + [['cover', 'Заполнить'], ['contain', 'Вписать'], ['fill', 'Растянуть']].map(function (x) { return '<button data-fit="' + x[0] + '" class="' + (L.fit === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div>';
    }
    return h;
  }
  function renderDrawer() {
    var d = $('#drawer'), it = S.sel && S.byId[S.sel];
    if (!it) { d.classList.remove('open'); $('.main').classList.remove('dr'); return; }
    var cur = it.id === S.current, fav = !!S.favs[it.id], music = S.musicWall === it.id, L = effLook(it.id);
    var chips = '';
    if (it.audio) chips += '<span class="chip">' + ic('note') + 'Реагирует на музыку</span>';
    if (it.mouse) chips += '<span class="chip">' + ic('cursor') + 'Следит за курсором</span>';
    if (it.clock) chips += '<span class="chip">' + ic('clock') + 'Показывает время</span>';
    if (it.type === 'video') chips += '<span class="chip">' + ic('film') + 'Видео 1080p</span>';
    if (music) chips += '<span class="chip">' + ic('note') + 'Для музыки</span>';
    var pv = it.video ? '<video src="' + esc(it.video) + '" autoplay loop muted playsinline></video>' : thumbHtml(it);
    d.innerHTML = '<button class="ib x" data-a="close" style="background:rgba(0,0,0,.5)">' + ic('x') + '</button>' +
      '<div class="pv">' + pv + '</div><div class="body" data-for="' + esc(it.id) + '">' +
      '<h2>' + esc(it.name) + '</h2><div class="sub">' + esc(genreOf(it)) + ' · ' + esc(TYPE_LABEL[it.type] || '') + (it.size ? ' · ' + it.size : '') + '</div>' +
      (it.desc ? '<p class="desc">' + esc(it.desc) + '</p>' : '') + (chips ? '<div class="chips">' + chips + '</div>' : '') +
      '<div class="cta"><button class="btn pri lg" data-a="apply"' + (cur ? ' disabled' : '') + '>' + (cur ? ic('check') + 'Установлено' : ic('play') + 'Установить') + '</button>' +
      '<button class="btn lg sq' + (fav ? ' favon' : '') + '" data-a="fav" title="Избранное">' + ic('heart') + '</button>' +
      '<div class="menu-wrap"><button class="btn lg sq" data-a="menu" title="Ещё">' + ic('dots') + '</button><div class="menu" id="dmenu" hidden>' +
      '<button data-a="music">' + ic('note') + (music ? 'Убрать из музыкальных' : 'Включать с музыкой') + '</button><button data-a="reveal">' + ic('folder') + 'Показать в папке</button><button data-a="del" class="danger">' + ic('trash') + 'Удалить</button></div></div></div>' +
      '<details class="more look"><summary><span>Вид обоев</span></summary><div class="lk"><div class="look-h"><span>Яркость, цвет, размытие</span><button data-a="resetlook">Сбросить</button></div>' + lookSliders(L, it.type === 'video', 'item') + '</div></details></div>';
    $$('input[type=range]', d).forEach(pct);
    d.classList.add('open'); $('.main').classList.add('dr'); measureCols();
  }
  function closeDrawer() { S.sel = null; $('#drawer').classList.remove('open'); $('.main').classList.remove('dr'); measureCols(); $$('.card.sel').forEach(function (c) { c.classList.remove('sel'); }); var v = $('#drawer video'); if (v) v.pause(); }

  // ---------- настройки ----------
  function sw(k) { return '<label class="sw"><input type="checkbox" data-k="' + k + '"' + (+S.cfg[k] ? ' checked' : '') + '><i></i></label>'; }
  function segc(k, opts) { var cur = String(S.cfg[k]); return '<div class="seg" data-seg="' + k + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '" class="' + (String(o[0]) === cur ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function rng(k, mn, mx, st, fmt, w) { var v = S.cfg[k] == null ? mn : S.cfg[k]; return '<div class="ctl w" style="width:' + (w || 230) + 'px"><input type="range" data-r="' + k + '" min="' + mn + '" max="' + mx + '" step="' + (st || 1) + '" value="' + v + '" data-fmt="' + (fmt || '') + '"><span class="v" style="min-width:48px;text-align:right;color:var(--mute);font-variant-numeric:tabular-nums" data-rv="' + k + '">' + fmtv(v, fmt) + '</span></div>'; }
  function fmtv(v, f) { return f === '%' ? v + '%' : f === 'min' ? v + ' мин' : f === 'px' ? v + ' px' : f === 'fps' ? v + ' к/с' : f === 'x' ? (v / 100).toFixed(2) + '×' : v; }
  function row(t, d, ctl, extra) { return '<div class="row' + (extra && extra.col ? ' col' : '') + '"' + (extra && extra.hide ? ' hidden' : '') + (extra && extra.id ? ' id="' + extra.id + '"' : '') + '><div class="lab"><b>' + t + '</b>' + (d ? '<small>' + d + '</small>' : '') + '</div>' + (ctl ? '<div class="ctl">' + ctl + '</div>' : '') + '</div>'; }
  // Миниатюры из библиотеки для оформления настроек
  var _topList = null;
  function topList() { if (!_topList) _topList = S.items.filter(function (i) { return i.thumb; }).sort(function (x, y) { return topRank(x) - topRank(y); }); return _topList; }
  function thumbsOf(n, type) { var out = []; topList().forEach(function (i) { if (out.length < n && (!type || i.type === type)) out.push(i.thumb); }); return out; }
  function bgi(u) { return u ? 'background-image:url(\'' + esc(u) + '\')' : ''; }
  // ряд карточек с картинкой для выбора значения (работает как переключатель data-seg)
  function optcards(k, opts, cls) {
    var cur = String(S.cfg[k]);
    return '<div class="optcards ' + (cls || '') + '" data-seg="' + k + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '" class="opt' + (String(o[0]) === cur ? ' on' : '') + '"><span class="pic">' + o[2] + '</span><span class="oc"><b>' + o[1] + '</b>' + (o[3] ? '<small>' + o[3] + '</small>' : '') + '</span></button>'; }).join('') + '</div>';
  }
  function crow(title, desc, inner, extra) { return '<div class="row col"' + (extra && extra.hide ? ' hidden' : '') + (extra && extra.id ? ' id="' + extra.id + '"' : '') + '><div class="lab"><b>' + title + '</b>' + (desc ? '<small>' + desc + '</small>' : '') + '</div>' + inner + '</div>'; }
  function rowi(icon, title, desc, ctl) { return '<div class="row"><span class="ri">' + ic(icon) + '</span><div class="lab"><b>' + title + '</b>' + (desc ? '<small>' + desc + '</small>' : '') + '</div>' + (ctl ? '<div class="ctl">' + ctl + '</div>' : '') + '</div>'; }
  function lookCss(L) {
    var f = []; if (L.b != 100) f.push('brightness(' + L.b / 100 + ')'); if (L.c != 100) f.push('contrast(' + L.c / 100 + ')'); if (L.s != 100) f.push('saturate(' + L.s / 100 + ')');
    if (L.h) f.push('hue-rotate(' + L.h + 'deg)'); if (L.bl > 0) f.push('blur(' + L.bl * 0.5 + 'px)'); return f.join(' ');
  }
  function fxUpdate() {
    var img = document.getElementById('fxImg'); if (!img) return; var L = Object.assign({}, LOOK_DEF, S.global);
    img.style.filter = lookCss(L); var d = document.getElementById('fxDim'); if (d) d.style.opacity = L.dim / 100;
  }
  function wmini(st) {
    var cv = '<i class="wp-cv"></i>', b = '<span class="wp-b"></span><span class="wp-b play"></span><span class="wp-b"></span>', base = 'background:var(--surf3);color:var(--fg);--mu:var(--mute);';
    if (st === 'card') return '<div class="wp wp-card mk" style="' + base + 'width:176px;border-radius:12px">' + cv + '<div class="wp-t"><b>Smack That</b><small>R n B Allstars</small></div><div class="wp-pr"><i style="width:42%"></i></div></div>';
    if (st === 'mini') return '<div class="wp wp-mini mk" style="' + base + 'width:150px;border-radius:10px">' + cv + '<div class="wp-t"><b>Smack That</b></div><span class="wp-b play"></span></div>';
    return '<div class="wp wp-bar mk" style="' + base + 'width:190px;border-radius:10px">' + cv + '<div class="wp-t"><b>Smack That</b><small>R n B Allstars</small></div>' + b + '</div>';
  }
  function cmini(st) {
    if (st === 'stacked') return '<div class="cm" style="text-align:center"><div class="cm-t" style="font-size:40px;line-height:.9">12</div><div class="cm-t" style="font-size:40px;line-height:.9;opacity:.6">34</div></div>';
    if (st === 'compact') return '<div class="cm"><div style="font-size:15px;white-space:nowrap">12:34 &nbsp;·&nbsp; Вт, 27 окт</div></div>';
    if (st === 'analog') { var R = 34, ticks = ''; for (var i = 0; i < 12; i++) { var a = i * 30 * Math.PI / 180; ticks += '<line x1="' + (38 + Math.sin(a) * 30) + '" y1="' + (38 - Math.cos(a) * 30) + '" x2="' + (38 + Math.sin(a) * 34) + '" y2="' + (38 - Math.cos(a) * 34) + '" stroke="currentColor" stroke-width="' + (i % 3 ? 1 : 2) + '"/>'; } return '<svg width="76" height="76" style="display:block"><circle cx="38" cy="38" r="36" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-width="1.6"/>' + ticks + '<line x1="38" y1="38" x2="38" y2="16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="38" y1="38" x2="56" y2="46" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="38" cy="38" r="3" fill="var(--accent)"/></svg>'; }
    return '<div class="cm"><div class="cm-t" style="font-size:34px;line-height:1">12:34</div><div style="font-size:11px;opacity:.8;margin-top:3px">Вторник, 27 октября</div></div>';
  }

  // всё после <!--MORE--> прячется в раскрывающийся блок «Дополнительно»
  function group(id, title, desc, rows, o) {
    o = o || {};
    var p = rows.split('<!--MORE-->');
    return '<section class="group" id="g-' + id + '"><div class="sechead">' + (o.icon ? '<span class="badge">' + ic(o.icon) + '</span>' : '') + '<div><h3>' + title + '</h3>' + (desc ? '<p>' + desc + '</p>' : '') + '</div>' + (o.illus ? '<div class="illus">' + o.illus + '</div>' : '') + '</div>' + '<div class="box">' + p[0] + '</div>' + (p[1] ? '<details class="more adv"' + (S.open && S.open[id] ? ' open' : '') + ' data-open="' + id + '"><summary><span>Дополнительные настройки</span></summary><div class="box">' + p[1] + '</div></details>' : '') + '</section>';
  }

  var SUBS = [['appearance', 'palette', 'Оформление'], ['wall', 'eye', 'Обои'], ['perf', 'bolt', 'Производительность'], ['widgets', 'note', 'Виджеты'], ['discord', 'chat', 'Discord'], ['system', 'monitor', 'Система']];

  function sectionAppearance() {
    var c = S.cfg, th = +(c.theme || 0), ac = (c.accent || '#8136f2').toLowerCase();
    var themes = '<div class="themes">' + THEMES.map(function (t, i) { return '<button class="th' + (i === th ? ' on' : '') + '" data-theme="' + i + '" style="--ac:' + ac + '"><div class="pic" style="background:' + t[2][0] + '"><i style="background:' + t[2][1] + '"></i><div><i style="background:' + t[2][2] + '"></i><i style="background:' + t[2][2] + '"></i><i></i></div></div><span style="background:var(--surf)">' + t[1] + ic('check') + '</span></button>'; }).join('') + '</div>';
    var rgb = hexRgb(ac), hu = rgb2hue(rgb[0], rgb[1], rgb[2]);
    var sws = '<div class="swatches">' + ACCENTS.map(function (a) { return '<button class="swatch' + (a === ac ? ' on' : '') + '" data-accent="' + a + '" style="background:' + a + '" title="' + a + '"></button>'; }).join('') + '</div>';
    var custom = '<div style="display:flex;align-items:center;gap:14px;margin-top:4px"><input class="hue" type="range" id="hue" min="0" max="360" value="' + hu + '"><input class="hexin" id="hex" value="' + ac + '" maxlength="7" spellcheck="false"></div>';
    var rows = '<div class="row col"><div class="lab"><b>Тема</b><small>Цвет фона и поверхностей</small></div>' + themes + '</div>' +
      '<div class="row col"><div class="lab"><b>Акцентный цвет</b><small>Кнопки, переключатели, выделение. Выберите из набора или настройте оттенок</small></div>' + sws + custom + '</div>' +
      crow('Скругление углов', 'Форма карточек, кнопок и панелей', optcards('radius', [[0, 'Острые', '<i class="rsq" style="border-radius:3px"></i><i class="rsq" style="border-radius:3px"></i>'], [1, 'Средние', '<i class="rsq" style="border-radius:9px"></i><i class="rsq" style="border-radius:9px"></i>'], [2, 'Крупные', '<i class="rsq" style="border-radius:17px"></i><i class="rsq" style="border-radius:17px"></i>']], 'three')) +
      row('Размер плиток', 'Сколько обоев помещается в ряд', rng('tile', 170, 420, 10, '', 220)) +
      '<!--MORE-->' + row('Масштаб интерфейса', 'Если шрифт слишком мелкий или крупный', rng('zoom', 85, 140, 5, '%', 220)) +
      row('Анимации интерфейса', 'Плавное появление плиток и панелей', sw('anim'));
    return group('appearance', 'Оформление', 'Внешний вид приложения. Изменения применяются сразу.', rows, { icon: 'palette', illus: ACCENTS.slice(0, 5).map(function (a) { return '<i class="dot" style="background:' + a + '"></i>'; }).join('') });
  }
  function rowsEffects() {
    var L = Object.assign({}, LOOK_DEF, S.global), t = thumbsOf(1)[0];
    var sliders = LOOK_ROWS.map(function (r) { return '<div class="sl"><span class="l">' + r[1] + '</span><span class="v" data-v="' + r[0] + '">' + L[r[0]] + r[4] + '</span><input type="range" data-glook="' + r[0] + '" min="' + r[2] + '" max="' + r[3] + '" value="' + L[r[0]] + '"></div>'; }).join('');
    return crow('Эффекты по умолчанию', 'Применяются ко всем обоям, у которых нет своих настроек. Для отдельных обоев — «Вид обоев» в их карточке. Картинка показывает результат сразу.',
      '<div class="fxwrap"><div class="fxprev"><div class="fxbox"><div id="fxImg" style="' + bgi(t) + ';filter:' + lookCss(L) + '"></div><div id="fxDim" style="opacity:' + (L.dim / 100) + '"></div></div><button class="btn" data-a="resetglobal">' + ic('reset') + 'Сбросить</button></div><div class="fxsl">' + sliders + '</div></div>');
  }
  function rowsCycle() {
    var on = +S.cfg.ss, favT = S.items.filter(function (i) { return S.favs[i.id] && i.thumb; }).map(function (i) { return i.thumb; });
    var all4 = thumbsOf(4), collage = '<span class="col4">' + all4.map(function (u) { return '<i style="' + bgi(u) + '"></i>'; }).join('') + '</span>';
    var one = function (u, icon) { return u ? '<span class="one" style="' + bgi(u) + '"></span>' : '<span class="one ph">' + ic(icon || 'image') + '</span>'; };
    var src = optcards('sssrc', [['all', 'Все', collage, 'Вся библиотека'], ['favs', 'Избранные', favT.length ? one(favT[0]) : '<span class="one ph">' + ic('heart') + '</span>', 'С сердечком'], ['video', 'Видео', one(thumbsOf(1, 'video')[0], 'film'), '1080p'], ['html', 'Анимации', one(thumbsOf(1, 'html')[0], 'spark'), 'Встроенные'], ['art', 'Арты', one(thumbsOf(1, 'art')[0], 'image'), 'Живые арты']]);
    var rows = row('Автоматическая смена', 'Lumora сама будет менять обои через заданное время', sw('ss')) +
      crow('Как часто', '', segc('ssmin', [[1, '1 мин'], [5, '5 мин'], [15, '15 мин'], [30, '30 мин'], [60, '1 час'], [180, '3 часа']]), { hide: !on, id: 'ssr1' }) +
      crow('Откуда брать', 'Из каких обоев выбирать следующие', src, { hide: !on, id: 'ssr2' }) +
      row('Вперемешку', 'Выключите, чтобы обои шли по порядку', sw('ssshuf'), { hide: !on, id: 'ssr3' });
    return rows;
  }
  function sectionPerf() {
    var q = +(S.cfg.quality == null ? 1 : S.cfg.quality);
    var bigIc = function (n, cls) { return '<span class="bigic ' + cls + '">' + ic(n) + '</span>'; };
    var rows = crow('Пресет', 'Быстрый выбор баланса между плавностью и нагрузкой', optcards('quality', [[0, 'Экономный', bigIc('leaf', 'eco'), '24 кадра · минимум нагрузки'], [1, 'Обычный', bigIc('check', 'norm'), '30 кадров · баланс'], [2, 'Максимум', bigIc('bolt', 'max'), '60 кадров · высокая чёткость']], 'three')) +
      '<!--MORE-->' + row('Частота кадров', 'Меньше — ниже нагрузка на процессор и видеокарту', segc('fps', [[15, '15'], [24, '24'], [30, '30'], [45, '45'], [60, '60']])) +
      row('Чёткость картинки', 'Внутреннее разрешение анимаций. 100% — родное', rng('scalepct', 50, 150, 5, '%', 220)) +
      row('Останавливать, когда не видно', 'Если рабочий стол закрыт окнами, обои засыпают и ничего не потребляют', sw('pausecovered')) +
      row('Экономить на батарее', 'Замораживать обои, когда ноутбук работает от аккумулятора', sw('pausebattery')) +
      row('Низкий приоритет процесса', 'Обои не мешают играм и работе других программ', sw('lowprio'));
    return group('perf', 'Производительность', 'Приложение не нагружает компьютер, пока вы им не пользуетесь.', rows, { icon: 'bolt', illus: '<span class="gauge"><i></i><i></i><i></i><i></i><i></i></span>' });
  }
  function sectionSystem() {
    function k(a) { return '<span>' + a.map(function (x) { return '<kbd>' + x + '</kbd>'; }).join('') + '</span>'; }
    var main = rowi('power', 'Запускать вместе с Windows', 'Обои появятся сразу после входа в систему, окно не откроется', sw('autostart')) +
      rowi('monitor', 'Прозрачная панель задач', 'Через бесплатную программу TranslucentTB. Пока вы работаете в окне на весь экран, панель становится обычной', sw('taskbar')) +
      rowi('note', 'Музыкальный режим', 'Когда играет музыка, показывать «музыкальные» обои с эквалайзером и обложкой', sw('music')) +
      rowi('keyboard', 'Горячие клавиши', 'Ctrl + Alt + стрелки, R, P, L — работают из любой программы', sw('hotkeys'));
    var more = row('Показывать окно при запуске', 'По умолчанию программа живёт в трее и не мешает', sw('showwin')) +
      '<div class="keys">' + [['Следующие обои', ['Ctrl', 'Alt', '→']], ['Предыдущие обои', ['Ctrl', 'Alt', '←']], ['Случайные обои', ['Ctrl', 'Alt', 'R']], ['Пауза / продолжить', ['Ctrl', 'Alt', 'P']], ['Открыть Lumora', ['Ctrl', 'Alt', 'L']]].map(function (r) { return '<div>' + r[0] + k(r[1]) + '</div>'; }).join('') + '</div>' +
      '<div class="row"><div class="lab"><b>Папка с обоями</b><small>Сюда можно класть свои файлы: картинки, GIF, видео, HTML</small></div><div class="ctl"><button class="btn" data-a="openlib">' + ic('folder') + 'Открыть</button></div></div>' +
      '<div class="row"><div class="lab"><b>Вернуть встроенные обои</b><small>Восстановит удалённые встроенные обои и обновит их</small></div><div class="ctl"><button class="btn" data-a="restore">' + ic('reset') + 'Вернуть</button></div></div>' +
      '<div class="row"><div class="lab"><b>Lumora ' + esc(S.version || '1.0') + '</b><small>Обоев в библиотеке: ' + S.items.length + '. Создал Frein</small></div></div>';
    return group('system', 'Система', 'Запуск, панель задач и горячие клавиши.', main + '<!--MORE-->' + more, { icon: 'monitor' });
  }
  function sectionWall() { return group('wall', 'Обои', 'Автоматическая смена и общий вид.', rowsCycle() + '<!--MORE-->' + rowsEffects(), { icon: 'eye', illus: thumbsOf(3).map(function (u) { return '<i style="' + bgi(u) + '"></i>'; }).join('') }); }
  function sectionWidgets() {
    var tab = S.wtab || 'music';
    var seg = '<div class="seg wtabs">' + [['music', 'Музыка'], ['clock', 'Время и дата']].map(function (x) { return '<button data-wtab="' + x[0] + '" class="' + (tab === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    return group('widgets', 'Виджеты', 'Небольшие плашки поверх рабочего стола.', '<div class="row">' + seg + '</div>' + (tab === 'clock' ? rowsClock() : rowsWidget()), { icon: 'note', illus: '<span class="illw">' + wmini('mini') + '</span>' });
  }
  function wBg() {
    var c = S.cfg, m = c.wbg || 'theme', col = m === 'dark' ? '#121216' : m === 'light' ? '#f6f6fa' : m === 'accent' ? (c.accent || '#8136f2') : m === 'custom' ? (c.wcolor || '#1b1d28') : null;
    return col;
  }
  function lumOf(hex) { var v = hexRgb(hex); return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255; }
  function widgetPreview() {
    var c = S.cfg, st = c.wstyle || 'bar', bg = wBg(), light, fg, mu;
    var bgCss = bg || 'var(--surf2)';
    if (bg) { light = lumOf(bg) > 0.58; } else { light = document.documentElement.getAttribute('data-theme') === 'light'; }
    fg = light ? '#18192a' : '#f0f1f8'; mu = light ? 'rgba(24,25,42,.6)' : 'rgba(240,241,248,.6)';
    var w = (+c.wwidth || (st === 'card' ? 340 : st === 'mini' ? 230 : 290)) * (c.wsize || 100) / 100;
    var rad = +c.wcorner === 0 ? 0 : +c.wcorner === 1 ? 5 : 11;
    var op = (c.wopacity == null ? 50 : c.wopacity) / 100;
    var cover = +c.wcover === 0 ? '' : '<i class="wp-cv"></i>';
    var btns = +c.wbuttons === 0 ? '' : st === 'mini' ? '<span class="wp-b play"></span>' : '<span class="wp-b"></span><span class="wp-b play"></span><span class="wp-b"></span>';
    var artist = +c.wartist === 0 || st === 'mini' ? '' : '<small>R n B Allstars</small>';
    var prog = +c.wprogress ? '<div class="wp-pr"><i style="width:38%"></i></div>' : '';
    return '<div class="wprev"><div class="wp wp-' + st + '" style="width:' + Math.round(w) + 'px;background:' + bgCss + ';color:' + fg + ';border-radius:' + rad + 'px;--mu:' + mu + ';opacity:' + Math.max(op, .55) + '">' + cover + '<div class="wp-t"><b>Smack That</b>' + artist + (st === 'card' && +c.wprogress ? '<small>1:24 / 3:35</small>' : '') + '</div>' + btns + (st === 'card' ? prog : '') + (st !== 'card' && +c.wprogress && st !== 'mini' ? '<div class="wp-pr abs"><i style="width:38%"></i></div>' : '') + '</div></div>';
  }
  function rowsWidget() {
    var c = S.cfg, pos = c.wpos || 'bl', st = c.wstyle || 'bar', bgm = c.wbg || 'theme';
    var grid = '<div class="corner">' + ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'].map(function (p) { return '<button data-wpos="' + p + '" class="' + (p === pos ? 'on' : '') + '" title=""></button>'; }).join('') + '</div>';
    var defW = st === 'card' ? 340 : st === 'mini' ? 230 : 290, wv = +c.wwidth || defW;
    var rows = '<div class="row col"><div class="lab"><b>Предпросмотр</b><small>Так выглядит виджет на экране. Он появляется, когда играет музыка в любом плеере</small></div><div id="wprev">' + widgetPreview() + '</div></div>' +
      row('Виджет «Сейчас играет»', 'Плашка с названием трека и кнопками управления', sw('widget')) +
      crow('Стиль', 'Полоска — компактная, карточка — с большой обложкой, мини — только название', optcards('wstyle', [['bar', 'Полоска', wmini('bar')], ['card', 'Карточка', wmini('card')], ['mini', 'Мини', wmini('mini')]], 'three')) +
      row('Расположение', 'Угол или край экрана', grid) +
      '<!--MORE-->' + row('Отступ от края', 'По горизонтали, в пикселях', rng('wox', 0, 300, 2, 'px', 200)) +
      row('Отступ сверху / снизу', 'Для верхних и нижних положений', rng('woy', 0, 300, 2, 'px', 200)) +
      row('На уровне панели задач', 'Нижние положения встают на полосу панели задач, а не над ней', sw('wtaskbar')) +
      row('Ширина', '', rng('wwidth', 200, 520, 5, 'px', 200).replace('value="' + (c.wwidth == null ? 200 : c.wwidth) + '"', 'value="' + wv + '"').replace('>' + fmtv(c.wwidth || 200, 'px') + '<', '>' + wv + ' px<')) +
      row('Масштаб', 'Размер всего виджета', rng('wsize', 60, 200, 5, '%', 200)) +
      row('Прозрачность в покое', '', rng('wopacity', 10, 100, 5, '%', 200)) +
      row('Прозрачность при наведении', 'Когда мышь на виджете', rng('wactive', 30, 100, 2, '%', 200)) +
      row('Углы', 'На Windows 11', segc('wcorner', [[0, 'Прямые'], [1, 'Малые'], [2, 'Круглые']])) +
      row('Фон', 'Цвет плашки. Цвет текста подбирается сам', segc('wbg', [['theme', 'Тема'], ['dark', 'Тёмный'], ['light', 'Светлый'], ['accent', 'Акцент'], ['custom', 'Свой']])) +
      row('Свой цвет', '', '<input class="hexin" id="wcolor" value="' + esc(c.wcolor || '#1b1d28') + '" maxlength="7" spellcheck="false">', { hide: bgm !== 'custom', id: 'wcolorRow' }) +
      row('Показывать обложку', '', sw('wcover')) +
      row('Показывать исполнителя', '', sw('wartist')) +
      row('Кнопки управления', 'Назад, пауза, дальше', sw('wbuttons')) +
      row('Полоса прогресса', 'Время трека. Щелчок по полосе перематывает', sw('wprogress')) +
      row('Показывать на паузе', 'Иначе виджет прячется, когда музыка остановлена', sw('wpaused')) +
      row('Прятать в играх и полноэкранном видео', '', sw('wfull')) +
      row('Колесо мыши — громкость', 'Прокрутка над виджетом меняет громкость системы', sw('wwheel'));
    return rows;
  }
  // ---------- виджет времени ----------
  var CLOCK_FONTS = { light: '"Segoe UI Light","Segoe UI",sans-serif', thin: '"Segoe UI Light","Segoe UI",sans-serif', bold: '"Segoe UI Semibold","Segoe UI",sans-serif', black: '"Segoe UI Black","Segoe UI",sans-serif', bahn: 'Bahnschrift,"Segoe UI",sans-serif', mono: 'Consolas,monospace', serif: 'Georgia,serif' };
  var MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var DAYS_F = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'], DAYS_S = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  function capF(x) { return x.charAt(0).toUpperCase() + x.slice(1); }
  function clockDate(d, fmt) {
    var dd = d.getDate(), mo = d.getMonth(), p2 = function (n) { return n < 10 ? '0' + n : '' + n; };
    if (fmt === 'full') return capF(DAYS_F[d.getDay()]) + ', ' + dd + ' ' + MONTHS_G[mo] + ' ' + d.getFullYear() + ' г.';
    if (fmt === 'short') return DAYS_S[d.getDay()] + ', ' + dd + ' ' + MONTHS_G[mo].slice(0, 3);
    if (fmt === 'num') return p2(dd) + '.' + p2(mo + 1) + '.' + d.getFullYear();
    if (fmt === 'day') return capF(DAYS_F[d.getDay()]);
    return capF(DAYS_F[d.getDay()]) + ', ' + dd + ' ' + MONTHS_G[mo];
  }
  function clockPreview() {
    var c = S.cfg, d = new Date(), st = c.cstyle || 'digital', pos = c.cpos || 'tr', sc = (c.csize || 100) / 100 * 0.5;
    var h = d.getHours(), m = d.getMinutes(), sec = d.getSeconds(), p2 = function (n) { return n < 10 ? '0' + n : '' + n; };
    var hh = +c.c24 === 0 ? (h % 12 || 12) : p2(h);
    var colon = (+c.cblink !== 0 && sec % 2) ? '<i style="opacity:.18;font-style:normal">:</i>' : ':';
    var time = hh + colon + p2(m) + (+c.csec ? ':' + p2(sec) : '');
    var col = c.ccolor === 'black' ? '#121216' : c.ccolor === 'accent' ? (c.accent || '#8136f2') : c.ccolor === 'custom' ? (c.chex || '#fff') : '#ffffff';
    var bgc = c.cbg === 'light' ? '248,248,252' : c.cbg === 'accent' ? hexRgb(c.accent || '#8136f2').join(',') : c.cbg === 'custom' ? hexRgb(c.cbgcolor || '#000').join(',') : '14,14,20';
    var bgCss = !c.cbg || c.cbg === 'none' ? 'transparent' : 'rgba(' + bgc + ',' + ((c.cbgalpha == null ? 55 : c.cbgalpha) / 100) + ')';
    var fam = CLOCK_FONTS[c.cfont || 'light'], op = (c.calpha == null ? 100 : c.calpha) / 100;
    var date = +c.cdate === 0 ? '' : clockDate(d, c.cdatefmt || 'long');
    var extra = [];
    if (S.clockWeather && +c.cweather) extra.push(S.clockWeather);
    if (+c.cweek) extra.push('Неделя 44');
    if (+c.cbat) extra.push('⚡ 86%');
    var sh = +c.cshadow === 0 ? 'none' : '0 2px 6px rgba(0,0,0,.45)';
    var al = pos === 'free' ? 'left' : ({ l: 'left', c: 'center', r: 'right' }[pos.charAt(1)] || 'left');
    var body;
    if (st === 'compact') body = '<div style="font-size:' + (26 * sc) + 'px">' + time + (date ? '&nbsp;&nbsp;·&nbsp;&nbsp;' + esc(date) : '') + (extra.length ? '&nbsp;&nbsp;·&nbsp;&nbsp;' + esc(extra.join('  ·  ')) : '') + '</div>';
    else if (st === 'analog') {
      var R = 95 * sc, a = function (deg, len, w, cc) { var rad = (deg - 90) * Math.PI / 180; return '<line x1="' + (R + 10) + '" y1="' + (R + 10) + '" x2="' + (R + 10 + Math.cos(rad) * len) + '" y2="' + (R + 10 + Math.sin(rad) * len) + '" stroke="' + cc + '" stroke-width="' + w + '" stroke-linecap="round"/>'; };
      var ticks = ''; for (var i = 0; i < 60; i++) { var rad = (i * 6 - 90) * Math.PI / 180, big = i % 5 === 0, r1 = R - (big ? 14 : 7) * sc * 2, r2 = R - 3 * sc * 2; ticks += '<line x1="' + (R + 10 + Math.cos(rad) * r1) + '" y1="' + (R + 10 + Math.sin(rad) * r1) + '" x2="' + (R + 10 + Math.cos(rad) * r2) + '" y2="' + (R + 10 + Math.sin(rad) * r2) + '" stroke="' + col + '" stroke-opacity="' + (big ? .9 : .4) + '" stroke-width="' + (big ? 2.2 : 1) + '"/>'; }
      body = '<svg width="' + (R * 2 + 20) + '" height="' + (R * 2 + 20) + '" style="display:block;margin:0 auto"><circle cx="' + (R + 10) + '" cy="' + (R + 10) + '" r="' + R + '" fill="none" stroke="' + col + '" stroke-opacity=".35" stroke-width="2"/>' + ticks + a((h % 12 + m / 60) * 30, R * .5, 5 * sc * 2, col) + a((m + sec / 60) * 6, R * .78, 3.2 * sc * 2, col) + a(sec * 6, R * .86, 1.6, c.accent || '#8136f2') + '<circle cx="' + (R + 10) + '" cy="' + (R + 10) + '" r="4" fill="' + (c.accent || '#8136f2') + '"/></svg>' +
        (date ? '<div style="font-size:' + (20 * sc) + 'px;text-align:center">' + esc(date) + '</div>' : '') + (extra.length ? '<div style="font-size:' + (15 * sc) + 'px;opacity:.75;text-align:center">' + esc(extra.join('  ·  ')) + '</div>' : '');
    } else if (st === 'stacked') body = '<div style="font-size:' + (92 * sc) + 'px;line-height:.9">' + hh + '</div><div style="font-size:' + (92 * sc) + 'px;line-height:.9;opacity:.62">' + p2(m) + '</div>' + (date ? '<div style="font-size:' + (22 * sc) + 'px;margin-top:' + (6 * sc) + 'px">' + esc(date) + '</div>' : '') + (extra.length ? '<div style="font-size:' + (16 * sc) + 'px;opacity:.75">' + esc(extra.join('  ·  ')) + '</div>' : '');
    else body = '<div style="font-size:' + (74 * sc) + 'px;line-height:1">' + time + '</div>' + (date ? '<div style="font-size:' + (22 * sc) + 'px;opacity:.92">' + esc(date) + '</div>' : '') + (extra.length ? '<div style="font-size:' + (16 * sc) + 'px;opacity:.75">' + esc(extra.join('  ·  ')) + '</div>' : '');
    var jc = pos === 'free' ? 'flex-start' : ({ l: 'flex-start', c: 'center', r: 'flex-end' }[pos.charAt(1)] || 'flex-end'), ai = pos === 'free' ? 'flex-start' : ({ t: 'flex-start', m: 'center', b: 'flex-end' }[pos.charAt(0)] || 'flex-start');
    var pd = (c.cbg && c.cbg !== 'none') ? (c.cpad == null ? 18 : c.cpad) * sc * 2 : 4;
    return '<div class="cstage" style="justify-content:' + jc + ';align-items:' + ai + '"><div style="font-family:' + fam + ';color:' + col + ';opacity:' + op + ';text-shadow:' + sh + ';text-align:' + al + ';background:' + bgCss + ';border-radius:' + ((c.cradius == null ? 20 : c.cradius) * sc * 2) + 'px;padding:' + pd + 'px;margin:' + Math.round(((c.coy == null ? 24 : c.coy) * .12)) + 'px ' + Math.round(((c.cox == null ? 24 : c.cox) * .12)) + 'px">' + body + '</div></div>';
  }
  function rowsClock() {
    var c = S.cfg, pos = c.cpos || 'tr', cbg = c.cbg || 'none', ccol = c.ccolor || 'white';
    var grid = '<div class="corner">' + ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'].map(function (p) { return '<button data-cpos="' + p + '" class="' + (p === pos ? 'on' : '') + '"></button>'; }).join('') + '</div>';
    function hex(id, val) { return '<input class="hexin" id="' + id + '" value="' + esc(val) + '" maxlength="7" spellcheck="false">'; }
    var rows = '<div class="row col"><div class="lab"><b>Предпросмотр</b><small>Серый прямоугольник — ваш экран. Слева направо и сверху вниз выбирается положение</small></div><div id="cprev">' + clockPreview() + '</div></div>' +
      row('Виджет времени', 'Часы и дата прямо на рабочем столе, поверх обоев', sw('clock')) +
      crow('Стиль', 'Цифровые, крупные в две строки, одна компактная строка или со стрелками', optcards('cstyle', [['digital', 'Цифровые', cmini('digital')], ['stacked', 'Крупные', cmini('stacked')], ['compact', 'Строка', cmini('compact')], ['analog', 'Аналоговые', cmini('analog')]], 'four')) +
      row('Расположение', 'Угол или край экрана', grid) +
      '<!--MORE-->' + row('Отступы от края', 'По горизонтали и по вертикали', rng('cox', 0, 400, 2, 'px', 170) + rng('coy', 0, 400, 2, 'px', 170)) +
      row('Закрепить на месте', 'Включено: клики проходят сквозь виджет к значкам рабочего стола. Выключите, чтобы перетащить его мышью в любое место', sw('clocked')) +
      row('Размер', '', rng('csize', 40, 400, 5, '%', 220)) +
      row('Где показывать', 'На рабочем столе — под окнами программ. Поверх всех — всегда сверху', segc('cwhere', [['desktop', 'На рабочем столе'], ['top', 'Поверх всех']])) +
      crow('Шрифт', '', optcards('cfont', [['light', 'Тонкий', '<span class="fnt" style="font-family:' + CLOCK_FONTS.light + '">12:34</span>'], ['bold', 'Полужирный', '<span class="fnt" style="font-family:' + CLOCK_FONTS.bold + '">12:34</span>'], ['black', 'Жирный', '<span class="fnt" style="font-family:' + CLOCK_FONTS.black + '">12:34</span>'], ['bahn', 'Технический', '<span class="fnt" style="font-family:' + CLOCK_FONTS.bahn + '">12:34</span>'], ['mono', 'Моноширинный', '<span class="fnt" style="font-family:' + CLOCK_FONTS.mono + '">12:34</span>'], ['serif', 'С засечками', '<span class="fnt" style="font-family:' + CLOCK_FONTS.serif + '">12:34</span>']], 'six')) +
      row('Цвет текста', '', segc('ccolor', [['white', 'Белый'], ['black', 'Чёрный'], ['accent', 'Акцент'], ['custom', 'Свой']]) + hex('chex', c.chex || '#ffffff').replace('class="hexin"', 'class="hexin" style="' + (ccol === 'custom' ? '' : 'display:none') + '"')) +
      row('Прозрачность текста', '', rng('calpha', 20, 100, 5, '%', 220)) +
      row('Тень под текстом', 'Лучше читается на светлых обоях', sw('cshadow')) +
      row('Фон', 'Подложка под часами', segc('cbg', [['none', 'Нет'], ['dark', 'Тёмный'], ['light', 'Светлый'], ['accent', 'Акцент'], ['custom', 'Свой']]) + hex('cbgcolor', c.cbgcolor || '#000000').replace('class="hexin"', 'class="hexin" style="' + (cbg === 'custom' ? '' : 'display:none') + '"')) +
      row('Непрозрачность фона', '', rng('cbgalpha', 5, 100, 5, '%', 220), { hide: cbg === 'none', id: 'cbgr1' }) +
      row('Скругление фона', '', rng('cradius', 0, 60, 2, 'px', 220), { hide: cbg === 'none', id: 'cbgr2' }) +
      row('Отступ внутри фона', '', rng('cpad', 4, 60, 2, 'px', 220), { hide: cbg === 'none', id: 'cbgr3' }) +
      row('24-часовой формат', 'Выключите для 12-часового (без AM/PM)', sw('c24')) +
      row('Показывать секунды', '', sw('csec')) +
      row('Мигающее двоеточие', '', sw('cblink')) +
      row('Показывать дату', '', sw('cdate')) +
      row('Формат даты', '', segc('cdatefmt', [['long', 'Вторник, 27 октября'], ['full', 'С годом'], ['short', 'Вт, 27 окт'], ['num', '27.10.2026'], ['day', 'Только день']])) +
      row('Номер недели', '', sw('cweek')) +
      row('Заряд батареи', 'Показывается только на ноутбуках', sw('cbat')) +
      row('Погода', 'Температура и состояние неба из открытого сервиса Open-Meteo (без регистрации). Отправляется только название города', sw('cweather')) +
      row('Город', 'Например: Москва, Минск, Алматы', '<input class="hexin" id="ccity" style="width:190px;text-transform:none" value="' + esc(c.ccity || '') + '" placeholder="Ваш город" spellcheck="false"><span id="cstatus" class="chip">' + esc(S.clockStatus || '') + '</span>', { hide: !+c.cweather, id: 'cwr1' }) +
      row('Единицы', '', segc('cunits', [['c', '°C'], ['f', '°F']]), { hide: !+c.cweather, id: 'cwr2' });
    return rows;
  }
  function discordPreview() {
    var c = S.cfg, cover = thumbsOf(1)[0], credit = +c.discordcredit !== 0, artist = +c.discordartist !== 0, prog = +c.discordprog !== 0, btn = +c.discordbtn !== 0;
    return '<div class="dsc"><div class="dsc-h">Слушает Lumora</div><div class="dsc-b"><div class="dsc-cv" style="' + bgi(cover) + '"></div><div class="dsc-t"><b>Smack That' + (artist ? ' - R n B Allstars' : '') + '</b><span>' + (credit ? 'Создал Frein &lt;3' : 'Название альбома') + '</span>' + (prog ? '<div class="dsc-pr"><div><i></i></div><em>1:24</em><em>3:35</em></div>' : '') + '</div></div>' +
      (btn ? '<div class="dsc-btns"><span>Яндекс Музыка</span><span>' + (credit ? 'Создал Frein &lt;3' : 'YouTube') + '</span></div>' : '') + '</div>';
  }
  function sectionDiscord() {
    var c = S.cfg;
    var steps = '<ol style="margin:8px 0 0;padding-left:20px;color:var(--fg2);line-height:1.7"><li>Откройте <a href="#" data-a="discordportal" style="color:var(--accent)">портал разработчиков Discord</a> и нажмите <span class="kb">New Application</span>.</li><li>Назовите приложение так, как хотите видеть в профиле, например <span class="kb">Lumora</span> — у вас будет «Слушает Lumora».</li><li>Скопируйте <span class="kb">Application ID</span> (на вкладке General Information) и вставьте ниже.</li><li>Discord должен быть запущен на этом компьютере.</li></ol>';
    var rows = crow('Так это выглядит в профиле', 'Предпросмотр карточки «Слушает». Меняется вместе с настройками ниже', '<div id="dprev">' + discordPreview() + '</div>') +
      row('Показывать, что я слушаю', 'В профиле Discord появится «Слушает …» с названием трека', sw('discord')) +
      '<div class="row col"><div class="lab"><b>Application ID</b><small>Без него Discord не покажет статус. Это просто число из вашего приложения на портале разработчиков' + steps + '</small></div>' +
      '<div style="display:flex;gap:10px;align-items:center"><input class="hexin" id="did" style="width:260px;text-transform:none" value="' + esc(c.discordid || '') + '" placeholder="Например, 1234567890123456789" spellcheck="false" maxlength="24"><button class="btn" data-a="discordportal">' + ic('link') + 'Открыть портал</button><span id="dstatus" class="chip" style="margin-left:auto">' + esc(S.discordStatus || 'Выключено') + '</span></div></div>' +
      '<!--MORE-->' + row('Исполнитель в названии', 'Строка статуса: «Название - Исполнитель». Выключите, чтобы показывать только название', sw('discordartist')) +
      row('Подпись «Создал Frein <3»', 'Вторая строка карточки и кнопка со ссылкой на YouTube', sw('discordcredit')) +
      row('Альбом второй строкой', 'Если подпись выключена: название альбома вместо неё (когда оно не совпадает с названием трека)', sw('discordalbum')) +
      row('Кнопки под карточкой', '«Яндекс Музыка» — поиск этого трека и вторая кнопка (подпись или YouTube)', sw('discordbtn')) +
            row('Обложка трека', 'Обложка альбома подбирается в каталогах iTunes и Deezer по названию и исполнителю (им отправляется только название трека)', sw('discordcover')) +
      row('Показывать время трека', 'Полоса прогресса в профиле', sw('discordprog'));
    return group('discord', 'Discord', 'Друзья увидят, какая музыка играет у вас сейчас.', rows, { icon: 'chat' });
  }
  function settingsBanner() {
    var cur = S.current && S.byId[S.current], t = cur && cur.thumb || thumbsOf(1)[0], favN = S.items.filter(function (i) { return S.favs[i.id]; }).length;
    return '<div class="setbanner"><div class="bg" style="' + bgi(t) + '"></div><div class="bt"><span class="eyebrow">Lumora ' + esc(S.version || '1.0') + '</span><h2>Настройки</h2><div class="stats"><span>' + S.items.length + ' обоев</span><span>' + favN + ' в избранном</span><span>' + (cur ? esc(cur.name) : 'обои выключены') + '</span></div></div></div>';
  }
  function renderSettings() {
    var sc = $('#scroll'), top = sc.scrollTop;
    var nav = '<div class="sub-nav">' + SUBS.map(function (s) { return '<button data-sub="' + s[0] + '" class="' + (S.sub === s[0] ? 'on' : '') + '">' + ic(s[1]) + s[2] + '</button>'; }).join('') + '</div>';
    sc.innerHTML = '<div class="set">' + nav + '<div class="panel">' + settingsBanner() + sectionAppearance() + sectionWall() + sectionPerf() + sectionWidgets() + sectionDiscord() + sectionSystem() + '</div></div>';
    $$('input[type=range]', sc).forEach(pct);
    sc.scrollTop = top;
  }

  document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.dataset && d.dataset.open) { (S.open = S.open || {})[d.dataset.open] = d.open; } }, true);

  // ---------- общая отрисовка ----------
  function render() {
    computeView(); renderNav(); renderTop();
    if (S.page === 'settings') { renderSettings(); closeDrawerSilently(); }
    else { renderLibrary(); renderDrawer(); }
  }
  function closeDrawerSilently() { $('#drawer').classList.remove('open'); $('.main').classList.remove('dr'); }
  function go(page) { S.page = page; render(); $('#scroll').scrollTop = 0; }

  // ---------- действия ----------
  function sendLook(id, key, val) {
    var p = S.per[id] || (S.per[id] = {}); p[key] = val;
    pushLook(id);
  }
  var pushLook = debounce(function (id) { send('look', { id: id, look: S.per[id] || null }); }, 90);
  var pushGlobal = debounce(function () { send('look', { id: '', look: S.global }); }, 90);
  function updateVal(scope, key, L) {
    $$('[data-v="' + key + '"]', scope).forEach(function (e) {
      var v = L[key]; e.textContent = key === 'sp' ? (v / 100).toFixed(2).replace(/0$/, '') + '×' : v + (key === 'h' ? '°' : key === 'bl' ? 'px' : '%');
    });
  }
  function select(id, open) {
    S.sel = id;
    $$('.card.sel').forEach(function (c) { c.classList.remove('sel'); });
    var c = $('.card[data-id="' + cssEsc(id) + '"]'); if (c) { c.classList.add('sel'); c.scrollIntoView({ block: 'nearest' }); }
    if (open !== false) renderDrawer();
  }
  function cssEsc(s) { return s.replace(/(["\\])/g, '\\$1'); }
  function apply(id) { if (!id) return; send('apply', { id: id }); }
  function toggleFav(id) {
    var on = !S.favs[id]; if (on) S.favs[id] = 1; else delete S.favs[id];
    send('fav', { id: id, on: on });
    toast(on ? 'Добавлено в избранное' : 'Убрано из избранного', 'heart');
    var c = $('.card[data-id="' + cssEsc(id) + '"]');
    if (S.f.nav === 'fav' || S.f.sort === 'fav') { renderLibrary(); } else if (c) {
      c.querySelector('.fv').classList.toggle('on', on); c.querySelector('.fv').title = on ? 'Убрать из избранного' : 'В избранное';
      var fm = c.querySelector('.fvmark'); if (on && !fm && id !== S.current) c.querySelector('.m').insertAdjacentHTML('beforeend', '<span class="fvmark">' + ic('heart') + '</span>'); else if (!on && fm) fm.remove();
    }
    renderNav(); if (S.sel === id) renderDrawer();
  }
  var delArm = null;
  function onAction(a, id, ev) {
    id = id || S.sel;
    switch (a) {
      case 'add': send('add'); break;
      case 'apply': apply(id); break;
      case 'fav': toggleFav(id); break;
      case 'close': closeDrawer(); break;
      case 'menu': var dm = $('#dmenu'); if (dm) dm.hidden = !dm.hidden; break;
      case 'pause': send('pause'); break;
      case 'next': send('next', { random: false }); break;
      case 'random': send('next', { random: true }); break;
      case 'off': send('off'); break;
      case 'music': send('music', { id: id, on: S.musicWall !== id }); var m1 = $('#dmenu'); if (m1) m1.hidden = true; break;
      case 'reveal': send('reveal', { id: id }); var m2 = $('#dmenu'); if (m2) m2.hidden = true; break;
      case 'openlib': send('openlib'); break;
      case 'discordportal': send('openurl', { url: 'https://discord.com/developers/applications' }); break;
      case 'restore': send('restore'); toast('Встроенные обои восстановлены', 'reset'); break;
      case 'resetlook':
        if (ev && ev.currentTarget && ev.currentTarget.closest('.hero')) id = S.current;
        delete S.per[id]; send('look', { id: id, look: null });
        if (S.page === 'library') { renderDrawer(); var hero = $('.hero'); if (hero) { var tmp = document.createElement('div'); tmp.innerHTML = heroHtml(); hero.replaceWith(tmp.firstChild); $$('.hero input[type=range]').forEach(pct); } }
        toast('Вид обоев сброшен', 'reset'); break;
      case 'resetglobal': S.global = {}; send('look', { id: '', look: null }); renderSettings(); toast('Эффекты сброшены', 'reset'); break;
      case 'del':
        var b = $('[data-a="del"]', $('#drawer'));
        if (delArm === id) { delArm = null; send('del', { id: id }); closeDrawer(); }
        else { delArm = id; b.innerHTML = ic('trash') + 'Точно удалить?'; setTimeout(function () { if (delArm === id) { delArm = null; if ($('#drawer.open')) renderDrawer(); } }, 2600); }
        break;
    }
  }

  // ---------- события ----------
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest('.menu-wrap')) { var mm = $('#dmenu'); if (mm) mm.hidden = true; }
    var nav = t.closest('[data-nav]'); if (nav) { S.f.nav = nav.dataset.nav; S.f.tag = ''; S.page = 'library'; render(); $('#scroll').scrollTop = 0; return; }
    if (t.closest('[data-go]')) { go(t.closest('[data-go]').dataset.go); return; }
    if (t.closest('#mini')) { S.f.nav = 'all'; S.page = 'library'; render(); $('#scroll').scrollTop = 0; return; }
    var ft2 = t.closest('[data-feat]'); if (ft2 && ft2.tagName === 'BUTTON' && ft2.closest('#fseg')) { S.f.feat = ft2.dataset.feat; S.f.tag = ''; computeView(); renderTop(); renderLibrary(); return; }
    var tg = t.closest('[data-tag]'); if (tg) { S.f.tag = tg.dataset.tag; computeView(); renderTop(); renderLibrary(); return; }
    var ty = t.closest('[data-type]'); if (ty) { S.f.type = ty.dataset.type; S.f.tag = ''; computeView(); renderTop(); renderLibrary(); return; }
    var sub = t.closest('[data-sub]'); if (sub) { S.sub = sub.dataset.sub; $$('.sub-nav button').forEach(function (b) { b.classList.toggle('on', b === sub); }); var g = $('#g-' + S.sub); if (g) g.scrollIntoView({ block: 'start' }); return; }
    var th = t.closest('.th[data-theme]'); if (th && S.page === 'settings') { setCfg('theme', +th.dataset.theme); renderSettings(); return; }
    var ac = t.closest('[data-accent]'); if (ac) { setCfg('accent', ac.dataset.accent); renderSettings(); return; }
    var cp = t.closest('[data-cpos]'); if (cp) { setCfg('cpos', cp.dataset.cpos); $$('[data-cpos]').forEach(function (b) { b.classList.toggle('on', b === cp); }); return; }
    var wt = t.closest('[data-wtab]'); if (wt) { S.wtab = wt.dataset.wtab; renderSettings(); return; }
    var wp = t.closest('[data-wpos]'); if (wp && !wp.classList.contains('nope')) { setCfg('wpos', wp.dataset.wpos); $$('[data-wpos]').forEach(function (b) { b.classList.toggle('on', b === wp); }); return; }
    var sg = t.closest('[data-seg] button'); if (sg) {
      var key = sg.parentNode.dataset.seg, val = sg.dataset.v; if (!isNaN(val) && val !== '') val = +val;
      $$('button', sg.parentNode).forEach(function (b) { b.classList.toggle('on', b === sg); });
      if (key === 'quality') { var m = { 0: [24, 75], 1: [30, 100], 2: [60, 150] }[val]; if (m) { setCfg('fps', m[0]); setCfg('scalepct', m[1]); } }
      setCfg(key, val);
      if (key === 'quality') renderSettings();
      if (key === 'radius') { /* применено */ }
      return;
    }
    var ft = t.closest('[data-fit]'); if (ft && ft.tagName === 'BUTTON') { var id0 = S.sel; $$('[data-fit]', ft.parentNode).forEach(function (b) { b.classList.toggle('on', b === ft); }); sendLook(id0, 'fit', ft.dataset.fit); return; }
    var ab = t.closest('[data-a]');
    if (ab) { var card = ab.closest('.card'); e.stopPropagation(); onAction(ab.dataset.a, card ? card.dataset.id : null, { currentTarget: ab }); return; }
    var cd = t.closest('.card'); if (cd) { select(cd.dataset.id); return; }
  });
  document.addEventListener('dblclick', function (e) { var cd = e.target.closest('.card'); if (cd && !e.target.closest('[data-a]')) apply(cd.dataset.id); });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q') { S.f.q = t.value; S.f.tag = ''; renderLibrary(); computeView(); var tr0 = $('.tagrow'); renderTagsOnly(); return; }
    if (t.id === 'tile') { pct(t); S.cfg.tile = +t.value; document.documentElement.style.setProperty('--tile', t.value + 'px'); measureCols(); cfgDeb('tile', +t.value); return; }
    if (t.dataset.look) {
      pct(t); var scope = t.closest('[data-for]'), id = scope.dataset.for, key = t.dataset.look, v = +t.value;
      sendLook(id, key, v); var L = effLook(id);
      $$('[data-for="' + cssEsc(id) + '"]').forEach(function (s) { updateVal(s, key, L); $$('[data-look="' + key + '"]', s).forEach(function (r) { if (r !== t) { r.value = v; pct(r); } }); });
      return;
    }
    if (t.dataset.glook) { pct(t); S.global[t.dataset.glook] = +t.value; fxUpdate(); pushGlobal(); updateVal($('#scroll'), t.dataset.glook, Object.assign({}, LOOK_DEF, S.global)); return; }
    if (t.dataset.r) { pct(t); var k = t.dataset.r, val = +t.value; S.cfg[k] = val; if (/^[wc]/.test(k)) refreshWPrev(); var lab = $('[data-rv="' + k + '"]'); if (lab) lab.textContent = fmtv(val, t.dataset.fmt); cfgDeb(k, val); if (k === 'zoom') document.body.style.zoom = val / 100; return; }
    if (t.id === 'hue') { var hx = hsl2hex(+t.value, 88, 58); $('#hex').value = hx; setCfgDeb('accent', hx); return; }
    if (t.id === 'chex' || t.id === 'cbgcolor') { var cm = /^#?([0-9a-f]{6})$/i.exec(t.value.trim()); if (cm) { S.cfg[t.id] = '#' + cm[1].toLowerCase(); cfgDeb(t.id, S.cfg[t.id]); refreshPreviews(); } return; }
    if (t.id === 'ccity') { S.cfg.ccity = t.value; cfgDeb('ccity', t.value.trim()); return; }
    if (t.id === 'did') { var dv = t.value.replace(/[^0-9]/g, ''); S.cfg.discordid = dv; cfgDeb('discordid', dv); return; }
    if (t.id === 'wcolor') { var wm = /^#?([0-9a-f]{6})$/i.exec(t.value.trim()); if (wm) { S.cfg.wcolor = '#' + wm[1].toLowerCase(); cfgDeb('wcolor', S.cfg.wcolor); refreshWPrev(); } return; }
    if (t.id === 'hex') { var m = /^#?([0-9a-f]{6})$/i.exec(t.value.trim()); if (m) setCfg('accent', '#' + m[1].toLowerCase()); return; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'sort') { S.f.sort = t.value; renderLibrary(); return; }
    if (t.dataset.k) {
      var v = t.checked ? 1 : 0; setCfg(t.dataset.k, v);
      if (t.dataset.k === 'ss') { ['ssr1', 'ssr2', 'ssr3'].forEach(function (i) { var r = $('#' + i); if (r) r.hidden = !v; }); }
      if (t.dataset.k === 'anim') applyLook();
    }
  });
  function refreshWPrev() { var p = $('#wprev'); if (p) p.innerHTML = widgetPreview(); var q = $('#cprev'); if (q) q.innerHTML = clockPreview(); }
  function refreshPreviews() { refreshWPrev(); }
  setInterval(function () { var q = document.getElementById('cprev'); if (q && S.page === 'settings') q.innerHTML = clockPreview(); }, 1000);
  var cfgTimers = {};
  function cfgDeb(k, v) { clearTimeout(cfgTimers[k]); cfgTimers[k] = setTimeout(function () { setCfg(k, v); }, 120); }
  function setCfgDeb(k, v) { S.cfg[k] = v; applyLook(); clearTimeout(cfgTimers[k]); cfgTimers[k] = setTimeout(function () { setCfg(k, v); $$('.swatch').forEach(function (s) { s.classList.toggle('on', s.dataset.accent === v); }); }, 120); }

  // предпросмотр видео при наведении
  var hoverT = null, hoverCard = null;
  document.addEventListener('mouseover', function (e) {
    var c = e.target.closest ? e.target.closest('.card') : null;
    if (c === hoverCard) return;
    stopPreview();
    hoverCard = c;
    if (!c) return;
    var it = S.byId[c.dataset.id]; if (!it || !it.video) return;
    hoverT = setTimeout(function () {
      var m = c.querySelector('.m'), v = document.createElement('video');
      v.src = it.video; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
      m.insertBefore(v, m.querySelector('.shade')); c.classList.add('pv'); c._pv = v;
    }, 380);
  });
  function stopPreview() {
    clearTimeout(hoverT);
    if (hoverCard && hoverCard._pv) { hoverCard._pv.pause(); hoverCard._pv.removeAttribute('src'); hoverCard._pv.load(); hoverCard._pv.remove(); hoverCard._pv = null; hoverCard.classList.remove('pv'); }
    hoverCard = null;
  }
  document.addEventListener('mouseleave', stopPreview);

  document.addEventListener('keydown', function (e) {
    var inField = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName) && document.activeElement.type !== 'range';
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (S.page !== 'library') go('library'); var q = $('#q'); if (q) { q.focus(); q.select(); } return; }
    if (e.key === 'Escape') { if (document.activeElement && document.activeElement.id === 'q') { document.activeElement.blur(); if (S.f.q) { S.f.q = ''; renderTop(); renderLibrary(); } } else closeDrawer(); return; }
    if (inField || S.page !== 'library') return;
    var k = e.key, v = S.view, idx = v.findIndex(function (i) { return i.id === S.sel; });
    var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: S.cols, ArrowUp: -S.cols }[k];
    if (step) { e.preventDefault(); var n = idx < 0 ? 0 : Math.max(0, Math.min(v.length - 1, idx + step)); if (v[n]) select(v[n].id, $('#drawer').classList.contains('open')); if (v[n] && !$('#drawer').classList.contains('open')) { S.sel = v[n].id; } return; }
    if (k === 'Enter' && S.sel) { apply(S.sel); return; }
    if ((k === 'f' || k === 'а' || k === 'F') && S.sel) { toggleFav(S.sel); return; }
    if (k === 'Delete' && S.sel) { onAction('del', S.sel); return; }
  });
  window.addEventListener('resize', debounce(measureCols, 100));
  // подсветка раздела настроек при прокрутке
  $('#scroll').addEventListener('scroll', debounce(function () {
    if (S.page !== 'settings') return;
    var sc = $('#scroll'), cur = SUBS[0][0], base = sc.getBoundingClientRect().top + 40;
    SUBS.forEach(function (x) { var g = $('#g-' + x[0]); if (g && g.getBoundingClientRect().top <= base) cur = x[0]; });
    if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) cur = SUBS[SUBS.length - 1][0];
    if (cur !== S.sub) { S.sub = cur; $$('.sub-nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.sub === cur); }); }
  }, 40));

  // файлы, перетащенные в окно, добавляются в библиотеку
  var dragN = 0;
  window.addEventListener('dragenter', function (e) { e.preventDefault(); dragN++; document.body.classList.add('drag'); });
  window.addEventListener('dragleave', function () { dragN--; if (dragN <= 0) { dragN = 0; document.body.classList.remove('drag'); } });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) {
    e.preventDefault(); dragN = 0; document.body.classList.remove('drag');
    if (bridge && e.dataTransfer && e.dataTransfer.files.length) bridge.postMessageWithAdditionalObjects(JSON.stringify({ c: 'drop' }), e.dataTransfer.files);
  });

  // ---------- мини-плеер: что играет сейчас ----------
  var NP = { has: false, title: '', artist: '', playing: false, pos: -1, dur: 0, at: 0, cover: '', built: false };
  function npBuild() {
    var el = $('#np'); if (NP.built) return; NP.built = true;
    el.innerHTML = '<div class="np-bg"></div><div class="np-in"><div class="np-top"><div class="np-cv"><span>' + ic('note') + '</span></div><div class="np-t"><b><span id="npT"></span></b><small><span id="npA"></span></small></div></div>' +
      '<div class="np-prog"><span id="npP">0:00</span><div class="np-bar" id="npBar"><i></i></div><span id="npD">0:00</span></div>' +
      '<div class="np-ctl"><button class="np-b" data-m="prev" title="Предыдущий">' + ic('prev') + '</button><button class="np-b big" data-m="play" id="npPlay" title="Пауза / играть">' + ic('pause') + '</button><button class="np-b" data-m="next" title="Следующий">' + ic('next') + '</button></div></div>';
  }
  function fmt(sec) { sec = Math.max(0, Math.floor(sec)); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function marquee(el) {
    el.style.animation = 'none'; el.style.removeProperty('--mv');
    var box = el.parentNode, over = el.scrollWidth - box.clientWidth;
    if (over > 4) { el.style.setProperty('--mv', '-' + (over + 12) + 'px'); el.style.animation = 'marq ' + Math.max(6, over / 18) + 's ease-in-out 1.2s infinite alternate'; }
  }
  function renderNP() {
    var el = $('#np'); if (!NP.has) { el.hidden = true; return; }
    npBuild(); el.hidden = false;
    var t = $('#npT'), a = $('#npA');
    if (t.textContent !== NP.title) { t.textContent = NP.title; marquee(t); }
    if (a.textContent !== NP.artist) { a.textContent = NP.artist; marquee(a); }
    var cv = $('.np-cv', el);
    if (NP.cover) { cv.style.backgroundImage = 'url("' + NP.cover + '")'; $('.np-bg', el).style.backgroundImage = 'url("' + NP.cover + '")'; cv.classList.add('has'); } else { cv.style.backgroundImage = ''; $('.np-bg', el).style.backgroundImage = ''; cv.classList.remove('has'); }
    $('#npPlay').innerHTML = ic(NP.playing ? 'pause' : 'play');
    el.classList.toggle('paused', !NP.playing);
    $('#npBar').parentNode.style.visibility = NP.dur > 0 ? 'visible' : 'hidden';
    tickNP();
  }
  function tickNP() {
    if (!NP.has || NP.dur <= 0) return;
    var pos = NP.pos + (NP.playing ? (Date.now() - NP.at) / 1000 : 0); pos = Math.min(pos, NP.dur);
    var bar = $('#npBar'); if (!bar) return;
    bar.firstChild.style.width = (pos / NP.dur * 100) + '%'; $('#npP').textContent = fmt(pos); $('#npD').textContent = fmt(NP.dur);
  }
  setInterval(tickNP, 500);
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-m]');
    if (b) { send('media', { a: b.dataset.m }); if (b.dataset.m === 'play') { NP.playing = !NP.playing; renderNP(); } return; }
    var bar = e.target.closest('#npBar');
    if (bar && NP.dur > 0) { var r = bar.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); NP.pos = f * NP.dur; NP.at = Date.now(); send('media', { a: 'seek', sec: NP.pos }); tickNP(); }
  });

  // ---------- сообщения от приложения ----------
  function setState(d) {
    S.items = d.items || []; S.byId = {}; S.items.forEach(function (i) { S.byId[i.id] = i; });
    S.current = d.current || null; S.paused = !!d.paused; S.musicWall = d.musicWall || null; S.version = d.version || '';
    S.discordStatus = d.discordStatus || ''; S.clockStatus = d.clockStatus || ''; S.favs = {}; (d.favs || []).forEach(function (id) { S.favs[id] = 1; });
    S.recent = d.recent || []; S.cfg = d.cfg || {}; S.per = d.per || {}; S.global = d.global || {};
    if (S.sel && !S.byId[S.sel]) S.sel = null;
    $('#ver').textContent = d.version ? 'v' + d.version : '';
    applyLook(); render();
    if (d.page) go(d.page);
    if (!S.shownSent) { S.shownSent = true; requestAnimationFrame(function () { requestAnimationFrame(function () { send('shown'); }); }); }
  }
  function onMsg(d) {
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
    switch (d.t) {
      case 'state': setState(d); break;
      case 'current': S.current = d.id || null; S.paused = !!d.paused; if (d.recent) S.recent = d.recent; if (S.page === 'library') { renderNav(); var keep = S.sel; renderLibrary(); if (keep) renderDrawer(); } else renderNav(); break;
      case 'paused': S.paused = !!d.paused; renderNav(); if (S.page === 'library') { var h = $('.hero'); if (h) { var tmp = document.createElement('div'); tmp.innerHTML = heroHtml(); h.replaceWith(tmp.firstChild); $$('.hero input[type=range]').forEach(pct); } } break;
      case 'toast': toast(d.msg, d.icon); break;
      case 'track': NP.has = !!d.has; NP.title = d.title || ''; NP.artist = d.artist || ''; NP.playing = !!d.playing; NP.pos = d.pos == null ? -1 : d.pos; NP.dur = d.dur || 0; NP.at = Date.now(); if (d.cover != null) NP.cover = d.cover; renderNP(); break;
      case 'clock': S.clockStatus = d.status; var cs = document.getElementById('cstatus'); if (cs) cs.textContent = d.status; break;
      case 'discord': S.discordStatus = d.status; var ds = document.getElementById('dstatus'); if (ds) ds.textContent = d.status; break;
      case 'page': go(d.page); if (d.sub) { S.sub = d.sub; } break;
      case 'music': S.musicWall = d.id || null; if (S.sel) renderDrawer(); break;
      case 'cfg': S.cfg[d.k] = d.v; applyLook(); break;
    }
  }
  if (bridge) { bridge.addEventListener('message', function (e) { onMsg(e.data); }); }
  window.LUMORA = { onMsg: onMsg, S: S };

  // ---------- запуск ----------
  applyLook(); render();
  if (bridge) send('ready');
  else {
    var m = /[?&]mock=([^&]+)/.exec(location.search);
    if (m) { var s = document.createElement('script'); s.src = decodeURIComponent(m[1]); s.onload = function () { setState(window.MOCK); if (/[?&]page=([a-z]+)/.test(location.search)) go(RegExp.$1); if (/[?&]sel=/.test(location.search)) { var id = decodeURIComponent(/[?&]sel=([^&]+)/.exec(location.search)[1]); select(id); } }; document.head.appendChild(s); }
  }
})();
