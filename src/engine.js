/* Движок обоев LiveWall: холст с учётом HiDPI, лимит кадров, пауза, звук, мышь, часы. */
var LW = (function () {
  'use strict';
  var Q = new URLSearchParams(location.search);
  var cfg = {
    fps: parseFloat(Q.get('fps')) || 30,
    q: parseFloat(Q.get('q')) || 1,
    demo: Q.has('demo'),
    warm: parseInt(Q.get('warm') || '0', 10) || 0
  };
  var L = { cfg: cfg, W: 1, H: 1, s: 1, t: 0, dt: 1 / 30, n: 0 };
  var spec = null, canvas = null, ctx = null, gl = null, glState = null;
  var lastTs = 0, failed = 0;

  // ---------- математика ----------
  L.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  L.lerp = function (a, b, t) { return a + (b - a) * t; };
  L.smooth = function (a, b, x) { var t = L.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  L.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  var P = new Uint8Array(512);
  (function () {
    var r = L.rng(7), p = [], i, j, t;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) P[i] = p[i & 255];
  })();
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad(h, x, y) {
    switch (h & 7) {
      case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  }
  // шум Перлина, примерно -1..1
  L.noise = function (x, y) {
    var fx = Math.floor(x), fy = Math.floor(y), X = fx & 255, Y = fy & 255;
    x -= fx; y -= fy;
    var u = fade(x), v = fade(y), a = P[X] + Y, b = P[X + 1] + Y;
    return L.lerp(L.lerp(grad(P[a], x, y), grad(P[b], x - 1, y), u),
                  L.lerp(grad(P[a + 1], x, y - 1), grad(P[b + 1], x - 1, y - 1), u), v);
  };
  L.fbm = function (x, y, o) {
    var s = 0, a = 0.5;
    for (var i = 0; i < (o || 4); i++) { s += a * L.noise(x, y); x *= 2; y *= 2; a *= 0.5; }
    return s;
  };

  // ---------- мышь ----------
  var M = L.M = { x: 0, y: 0, sx: 0, sy: 0, ax: 0, ay: 0, vx: 0, vy: 0, down: false, inside: false, has: false, moved: -99, w: 1 };
  var clickFns = [];
  L.onClick = function (fn) { clickFns.push(fn); };
  function pointer(nx, ny, down, inside) {
    var x = nx * L.W, y = ny * L.H;
    if (inside) {
      if (Math.abs(x - M.x) > 0.5 || Math.abs(y - M.y) > 0.5) { M.moved = L.t; M.has = true; }
      M.x = x; M.y = y;
    }
    if (down && inside && !M.down) {
      for (var i = 0; i < clickFns.length; i++) { try { clickFns[i](x, y); } catch (e) { } }
    }
    M.down = !!(down && inside);
    M.inside = !!inside;
  }
  window.livelyMouse = function (m) { pointer(m.x, m.y, m.down, m.inside); };
  addEventListener('mousemove', function (e) { pointer(e.clientX / L.W, e.clientY / L.H, (e.buttons & 1) === 1, true); });
  addEventListener('mousedown', function (e) { pointer(e.clientX / L.W, e.clientY / L.H, true, true); });
  addEventListener('mouseup', function (e) { pointer(e.clientX / L.W, e.clientY / L.H, false, true); });
  function updateMouse(dt) {
    var k = 1 - Math.exp(-dt * 9), px = M.sx, py = M.sy;
    if (!M.has) { M.sx = M.x = L.W / 2; M.sy = M.y = L.H / 2; }
    M.sx += (M.x - M.sx) * k; M.sy += (M.y - M.sy) * k;
    M.vx = (M.sx - px) / Math.max(dt, 0.001); M.vy = (M.sy - py) / Math.max(dt, 0.001);
    // Когда курсор давно не двигали, он «блуждает» сам — обои всегда живые
    var t = L.t, active = M.has && (t - M.moved) < 6;
    M.w += ((active ? 0 : 1) - M.w) * (1 - Math.exp(-dt * 1.5));
    var wx = L.W * (0.5 + 0.30 * Math.sin(t * 0.23) + 0.10 * Math.sin(t * 0.71 + 1));
    var wy = L.H * (0.5 + 0.26 * Math.sin(t * 0.31 + 2) + 0.09 * Math.sin(t * 0.83));
    M.ax = M.sx * (1 - M.w) + wx * M.w;
    M.ay = M.sy * (1 - M.w) + wy * M.w;
  }

  // ---------- звук ----------
  var A = L.A = { bands: new Float32Array(64), bass: 0, mid: 0, treble: 0, level: 0, beat: 0, active: false };
  var raw = new Float32Array(64), rawT = -99, peak = 0.5, bassAvg = 0, beatT = 0;
  window.livelyAudioListener = function (a) {
    for (var i = 0; i < 64; i++) raw[i] = a[i * 2] || 0;
    rawT = performance.now();
  };
  L.bandAt = function (f) { var x = L.clamp(f, 0, 1) * 63, i = Math.floor(x), fr = x - i; return A.bands[i] * (1 - fr) + A.bands[Math.min(63, i + 1)] * fr; };
  function avg(arr, a, b) { var s = 0; for (var i = a; i < b; i++) s += arr[i]; return s / (b - a); }
  function updateAudio(dt) {
    var i, now = performance.now(), t = L.t;
    var src = raw;
    if (cfg.demo) {
      src = demoBands(t);
    } else if (now - rawT > 1500) {
      src = null;
    }
    var m = 0;
    if (src) for (i = 0; i < 64; i++) if (src[i] > m) m = src[i];
    var live = !!src && m > 0.06;
    if (live) { A.silent = 0; } else { A.silent = (A.silent || 0) + dt; }
    A.active = A.silent < 2.5;
    // автоусиление: тихие треки тоже выглядят хорошо
    peak = Math.max(peak * Math.exp(-dt * 0.08), live ? m : 0, 0.45);
    var gain = 0.85 / peak, decay = Math.exp(-dt * 10);
    for (i = 0; i < 64; i++) {
      var v = live ? Math.min(1, src[i] * gain) : 0;
      if (!A.active) v = 0.05 + 0.04 * Math.sin(t * 0.9 + i * 0.35) + 0.03 * Math.sin(t * 0.37 - i * 0.9);
      A.bands[i] = Math.max(v, A.bands[i] * decay);
    }
    A.bass = avg(A.bands, 0, 16); A.mid = avg(A.bands, 16, 40); A.treble = avg(A.bands, 40, 64);
    A.level = A.bass * 0.5 + A.mid * 0.35 + A.treble * 0.15;
    bassAvg += (A.bass - bassAvg) * (1 - Math.exp(-dt * 1.2));
    A.beat = Math.max(0, A.beat - dt * 4);
    if (A.active && live && A.bass > 0.3 && A.bass > bassAvg * 1.3 && t - beatT > 0.2) { A.beat = 1; beatT = t; }
  }
  // Демо-звук (для превью и проверки): ровный бит 120 уд/мин
  var dbands = new Float32Array(64);
  function demoBands(t) {
    var ph = (t * 2) % 1, kick = Math.exp(-ph * 6), hat = Math.exp(-((t * 4) % 1) * 12);
    for (var i = 0; i < 64; i++) {
      var f = i / 63;
      var v = kick * Math.exp(-f * 5) * 0.95 + 0.45 * Math.exp(-Math.pow((f - 0.45 - 0.2 * Math.sin(t * 0.7)) * 5, 2)) * (0.6 + 0.4 * Math.sin(t * 3.1 + i))
            + hat * 0.55 * f + 0.12 + 0.1 * Math.sin(t * 5 + i * 1.7);
      dbands[i] = Math.max(0, Math.min(1, v * (0.75 + 0.25 * Math.sin(t * 0.3))));
    }
    return dbands;
  }

  // ---------- трек ----------
  var T = L.track = { title: '', artist: '', cover: null, key: '', has: false, color: [120, 140, 255] };
  // Яркий усреднённый цвет обложки — акцент для обоев
  function coverColor(img) {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 8; var x = c.getContext('2d'); x.drawImage(img, 0, 0, 8, 8);
      var d = x.getImageData(0, 0, 8, 8).data, r = 0, g = 0, b = 0, wsum = 0;
      for (var i = 0; i < d.length; i += 4) { var mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]), w = 0.15 + (mx - mn) / 255; r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; wsum += w; }
      r /= wsum; g /= wsum; b /= wsum; var m = Math.max(r, g, b, 1), k = 215 / m; T.color = [Math.min(255, Math.round(r * k)), Math.min(255, Math.round(g * k)), Math.min(255, Math.round(b * k))];
    } catch (e) { }
  }
  window.livelyCurrentTrack = function (json) {
    try {
      var d = typeof json === 'string' ? JSON.parse(json) : json;
      T.title = d.Title || ''; T.artist = d.Artist || ''; T.has = !!(T.title || T.artist);
      var key = T.title + '|' + T.artist + '|' + (d.Thumbnail ? d.Thumbnail.length : 0);
      if (key !== T.key) {
        T.key = key;
        if (d.Thumbnail) {
          var img = new Image();
          img.onload = function () { T.cover = img; coverColor(img); };
          img.src = 'data:image/png;base64,' + d.Thumbnail;
        } else { T.cover = null; T.color = [120, 140, 255]; }
      }
    } catch (e) { }
  };
  if (cfg.demo) {
    T.title = 'Neon Dreams'; T.artist = 'Живые обои'; T.has = true;
    (function () {
      var c = document.createElement('canvas'); c.width = c.height = 320;
      var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 320, 320);
      g.addColorStop(0, '#ff4fa3'); g.addColorStop(0.55, '#7a5cff'); g.addColorStop(1, '#27d3ff');
      x.fillStyle = g; x.fillRect(0, 0, 320, 320);
      x.fillStyle = 'rgba(255,255,255,0.16)'; x.beginPath(); x.arc(220, 100, 90, 0, 7); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.arc(90, 250, 120, 0, 7); x.fill();
      T.cover = c; coverColor(c);
    })();
  }

  // ---------- время и дата ----------
  L.ruDays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  L.ruDaysShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  L.ruMonths = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  L.ruMonthsNom = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  L.pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var C = L.clock = {};
  function updateClock() {
    var d = new Date();
    C.d = d; C.h = d.getHours(); C.m = d.getMinutes(); C.s = d.getSeconds(); C.ms = d.getMilliseconds();
    C.sf = C.s + C.ms / 1000; C.mf = C.m + C.sf / 60; C.hf = C.h + C.mf / 60;
    C.day = d.getDate(); C.mon = d.getMonth(); C.year = d.getFullYear(); C.wd = d.getDay();
    C.hm = L.pad(C.h) + ':' + L.pad(C.m);
    C.date = C.day + ' ' + L.ruMonths[C.mon];
    C.full = L.ruDays[C.wd].charAt(0).toUpperCase() + L.ruDays[C.wd].slice(1) + ', ' + C.day + ' ' + L.ruMonths[C.mon];
  }

  // ---------- вспомогательные рисовалки ----------
  L.hsl = function (h, s, l, a) { return 'hsla(' + (((h % 360) + 360) % 360).toFixed(1) + ',' + s + '%,' + l + '%,' + (a === undefined ? 1 : a) + ')'; };
  L.mix = function (c1, c2, t) {
    return [Math.round(c1[0] + (c2[0] - c1[0]) * t), Math.round(c1[1] + (c2[1] - c1[1]) * t), Math.round(c1[2] + (c2[2] - c1[2]) * t)];
  };
  L.rgb = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a === undefined ? 1 : a) + ')'; };
  // Слой во весь экран с тем же разрешением, что и основной холст (рисуется один раз)
  L.layer = function (w, h, draw) {
    var c = document.createElement('canvas'), s = L.s;
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    var x = c.getContext('2d'); x.scale(s, s);
    draw(x, w, h);
    return c;
  };
  // Облака: плотность из шума, освещение сбоку. Рисуется один раз в небольшом разрешении.
  L.clouds = function (w, h, o) {
    var q = o.res || 0.5, cw = Math.max(8, Math.round(w * q)), ch = Math.max(8, Math.round(h * q));
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var x = c.getContext('2d'), img = x.createImageData(cw, ch), d = img.data;
    var sc = o.scale || 3, sq = o.squash || 1.8, cov = o.cover || 0.5, soft = o.soft || 0.25, seed = o.seed || 0;
    var lx = o.light ? o.light[0] : -1, ly = o.light ? o.light[1] : -1, st = o.step || 0.012, gain = o.gain || 3;
    var lit = o.lit || [255, 255, 255], sh = o.shade || [150, 160, 190], warm = o.warm || null, wa = o.warmAmt || 0;
    var ft = o.fadeTop || 0, fb = o.fadeBottom || 0, al = o.alpha === undefined ? 1 : o.alpha, aspect = w / h;
    function dens(u, v) {
      var n = L.fbm(u * sc * aspect + seed, v * sc * sq + seed * 0.7, 6) * 0.95 + 0.5;
      var t = L.clamp((n - cov) / soft, 0, 1);
      return t * t * (3 - 2 * t);
    }
    for (var j = 0; j < ch; j++) {
      var v = j / ch, fade = 1;
      if (ft) fade *= L.smooth(0, ft, v);
      if (fb) fade *= 1 - L.smooth(1 - fb, 1, v);
      for (var i = 0; i < cw; i++) {
        var u = i / cw, k = (j * cw + i) * 4, dd = dens(u, v) * fade;
        if (dd < 0.003) { d[k + 3] = 0; continue; }
        var d2 = dens(u + lx * st, v + ly * st * aspect);
        var li = L.clamp(1 - (d2 - dd / Math.max(fade, 0.01)) * gain, 0, 1);
        li = li * 0.85 + 0.15 * (1 - v);
        var r = sh[0] + (lit[0] - sh[0]) * li, g = sh[1] + (lit[1] - sh[1]) * li, b = sh[2] + (lit[2] - sh[2]) * li;
        if (warm) { var wt = wa * v * li; r += (warm[0] - r) * wt; g += (warm[1] - g) * wt; b += (warm[2] - b) * wt; }
        d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = Math.min(255, dd * 255 * al);
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  };
  var glowCache = {};
  // Мягкий светящийся круг (спрайт) — дешёвая замена shadowBlur
  L.glow = function (rgb, size) {
    var key = rgb + '|' + size;
    if (glowCache[key]) return glowCache[key];
    var c = document.createElement('canvas'), n = Math.max(8, Math.round(size * L.s));
    c.width = c.height = n;
    var x = c.getContext('2d'), g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.15, 'rgba(' + rgb + ',0.55)');
    g.addColorStop(0.45, 'rgba(' + rgb + ',0.14)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    return glowCache[key] = c;
  };
  L.drawGlow = function (c, sprite, x, y, size, alpha) {
    if (alpha !== undefined) c.globalAlpha = alpha;
    c.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  };
  L.roundRect = function (c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };
  L.fitText = function (c, text, max) {
    if (c.measureText(text).width <= max) return text;
    while (text.length > 1 && c.measureText(text + '…').width > max) text = text.slice(0, -1);
    return text + '…';
  };
  // Обложка (или заглушка) в квадрате
  L.drawCover = function (c, x, y, size, r) {
    c.save(); L.roundRect(c, x, y, size, size, r); c.clip();
    if (T.cover) c.drawImage(T.cover, x, y, size, size);
    else {
      var g = c.createLinearGradient(x, y, x + size, y + size);
      g.addColorStop(0, '#5b6cff'); g.addColorStop(1, '#c05cff');
      c.fillStyle = g; c.fillRect(x, y, size, size);
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = (size * 0.45) + 'px "Segoe UI Symbol", "Segoe UI"';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♫', x + size / 2, y + size / 2);
    }
    c.restore();
  };

  // ---------- WebGL ----------
  function compile(g, type, src) {
    var sh = g.createShader(type); g.shaderSource(sh, src); g.compileShader(sh);
    if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) throw new Error('shader: ' + g.getShaderInfoLog(sh));
    return sh;
  }
  function initGL(s) {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL недоступен');
    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = 'precision highp float;uniform vec2 R;uniform float T;uniform vec4 M;uniform vec4 A;uniform float H;uniform sampler2D S;\n' +
      'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n' +
      'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}\n' +
      'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vnoise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}\n' +
      'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}\n' +
      'float band(float f){return texture2D(S,vec2(clamp(f,0.,1.),.5)).r;}\n' + s.frag;
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    glState = { prog: prog, tex: tex, bytes: new Uint8Array(64),
      u: { R: gl.getUniformLocation(prog, 'R'), T: gl.getUniformLocation(prog, 'T'), M: gl.getUniformLocation(prog, 'M'),
           A: gl.getUniformLocation(prog, 'A'), H: gl.getUniformLocation(prog, 'H'), S: gl.getUniformLocation(prog, 'S') } };
    gl.uniform1i(glState.u.S, 0);
  }
  function drawGL() {
    var u = glState.u, i;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.R, canvas.width, canvas.height);
    gl.uniform1f(u.T, L.t);
    gl.uniform4f(u.M, L.clamp(M.ax / L.W, 0, 1), 1 - L.clamp(M.ay / L.H, 0, 1), M.down ? 1 : 0, M.w);
    gl.uniform4f(u.A, A.bass, A.mid, A.treble, A.beat);
    gl.uniform1f(u.H, C.hf);
    for (i = 0; i < 64; i++) glState.bytes[i] = Math.round(L.clamp(A.bands[i], 0, 1) * 255);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 64, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, glState.bytes);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---------- запуск ----------
  function resize() {
    var cw = window.innerWidth || 1280, ch = window.innerHeight || 720;
    var q = cfg.q, dpr = window.devicePixelRatio || 1;
    if (spec.pixel) {
      L.W = Math.ceil(cw / spec.pixel); L.H = Math.ceil(ch / spec.pixel); L.s = 1;
      canvas.width = L.W; canvas.height = L.H;
      canvas.style.imageRendering = 'pixelated';
    } else if (spec.type === 'gl') {
      L.W = cw; L.H = ch;
      var gs = (spec.glScale || 0.6) * Math.min(dpr, 1.5) * (q < 1 ? 0.8 : q > 1.3 ? 1.4 : 1);
      L.s = gs;
      canvas.width = Math.max(2, Math.round(cw * gs)); canvas.height = Math.max(2, Math.round(ch * gs));
    } else {
      L.W = cw; L.H = ch;
      var maxPix = q < 1 ? 2.1e6 : q > 1.3 ? 8.3e6 : 4.2e6;
      var s = Math.min(dpr, q > 1.3 ? 2 : 1.25) * (q < 1 ? 0.8 : 1);
      s = Math.min(s, Math.sqrt(maxPix / (cw * ch)));
      L.s = s;
      canvas.width = Math.round(cw * s); canvas.height = Math.round(ch * s);
    }
    glowCache = {};
    if (spec.init) { try { spec.init(ctx || gl, L.W, L.H); } catch (e) { console.error('init: ' + e.message + '\n' + e.stack); } }
  }

  function step(dt) {
    L.dt = dt; L.t += dt; L.n++;
    var t0 = performance.now();
    updateAudio(dt); updateMouse(dt); updateClock();
    try {
      if (gl) drawGL();
      else {
        ctx.setTransform(L.s, 0, 0, L.s, 0, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (spec.pixel) ctx.imageSmoothingEnabled = false;
        spec.frame(ctx, L.t, dt, L.W, L.H);
      }
      failed = 0;
    } catch (e) {
      if (failed++ < 3) console.error('frame: ' + e.message + '\n' + e.stack);
    }
    L.cost = (L.cost || 0) * 0.9 + (performance.now() - t0) * 0.1;
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (window.lwPaused || document.hidden) { lastTs = ts; return; }
    var iv = 1000 / Math.min(spec.fps || 60, cfg.fps);
    var el = ts - lastTs;
    if (el < iv - 2) return;
    lastTs = ts - Math.min(el % iv, iv);
    step(Math.min(0.1, el / 1000));
  }

  L.run = function (s) {
    spec = s;
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    if (s.type === 'gl') initGL(s); else ctx = canvas.getContext('2d', { alpha: false });
    var caps = [];
    if (s.audio) caps.push('audio');
    if (s.mouse) caps.push('mouse');
    try { window.chrome.webview.postMessage('caps:' + caps.join(',')); } catch (e) { }
    var timer = 0;
    addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(resize, 150); });
    updateClock();
    resize();
    // Прогрев: заранее «проживаем» несколько секунд, чтобы кадр сразу выглядел наполненным
    for (var i = 0; i < cfg.warm; i++) step(1 / 30);
    requestAnimationFrame(loop);
  };

  return L;
})();
