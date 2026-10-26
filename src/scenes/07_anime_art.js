// Живые аниме-арты: готовые картинки (builtin/art) оживляются параллаксом, светом и частицами.
// Картинка рисуется один раз в слой нужного размера, дальше каждый кадр — одно drawImage и пара десятков спрайтов.

var ART = function (src, style) {
  var W, H, bg = null, img = null, loaded = 0, accent = [190, 200, 255], parts = [], rings = [], sweep = null, vig = null;
  var rnd = LW.rng(src.length * 31 + style * 7 + 5), Z = 1.12;
  var N = [70, 46, 120, 64, 150, 22][style];

  function build() {
    if (!img || !img.naturalWidth) return;
    var cw = W * Z, ch = H * Z, k = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    bg = LW.layer(cw, ch, function (c) {
      c.imageSmoothingQuality = 'high';
      var iw = img.naturalWidth * k, ih = img.naturalHeight * k;
      c.drawImage(img, (cw - iw) / 2, (ch - ih) / 2, iw, ih);
    });
    // Главный цвет картинки: самый яркий насыщенный участок уменьшенной копии
    try {
      var s = document.createElement('canvas'); s.width = 24; s.height = 14;
      var sx = s.getContext('2d'); sx.drawImage(bg, 0, 0, 24, 14);
      var d = sx.getImageData(0, 0, 24, 14).data, best = -1;
      for (var i = 0; i < d.length; i += 4) {
        var mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        var sc = (mx - mn) * 1.4 + mx * 0.6;
        if (sc > best) { best = sc; accent = [d[i], d[i + 1], d[i + 2]]; }
      }
      var m = Math.max(accent[0], accent[1], accent[2]) || 1, f = 255 / m;
      accent = [Math.min(255, Math.round(accent[0] * f * 0.9 + 25)), Math.min(255, Math.round(accent[1] * f * 0.9 + 25)), Math.min(255, Math.round(accent[2] * f * 0.9 + 25))];
    } catch (e) { }
  }

  function spawn(p, initial) {
    p.x = rnd() * W; p.y = initial ? rnd() * H : (style === 3 || style === 0 ? H + 20 : -20);
    p.z = 0.35 + rnd() * 0.65; p.a = rnd() * 6.283; p.s = 0.5 + rnd();
    if (style === 5) { p.x = rnd() * W; p.y = rnd() * H; }
    return p;
  }

  LW.onClick(function (x, y) { rings.push({ x: x, y: y, t: 0 }); if (rings.length > 6) rings.shift(); });

  LW.run({
    type: '2d', fps: 30, mouse: true,
    init: function (c, w, h) {
      W = w; H = h; bg = null; vig = null; sweep = null; parts = [];
      for (var i = 0; i < N; i++) parts.push(spawn({}, true));
      vig = LW.layer(w, h, function (x) {
        var g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.hypot(w, h) * 0.6);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,12,0.55)');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
      });
      sweep = LW.layer(w * 0.3, h * 1.2, function (x, sw, sh) {
        var g = x.createLinearGradient(0, 0, sw, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, sw, sh);
      });
      if (!img) { img = new Image(); img.onload = function () { build(); loaded = 0; }; img.src = src; }
      else build();
      c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    },
    frame: function (c, t, dt) {
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      if (!bg) { c.fillStyle = '#05060c'; c.fillRect(0, 0, W, H); return; }
      loaded = Math.min(1, loaded + dt * 0.8);
      var px = LW.clamp((LW.M.ax / W - 0.5) * 2, -1, 1), py = LW.clamp((LW.M.ay / H - 0.5) * 2, -1, 1);
      var zoom = 1.015 + 0.012 * Math.sin(t * 0.11), cw = bg.width / LW.s, ch = bg.height / LW.s;
      var sw = W / zoom, sh = H / zoom;
      var rx = (cw - sw) / 2, ry = (ch - sh) / 2;
      var ox = rx + rx * (Math.sin(t * 0.07) * 0.35 - px * 0.9), oy = ry + ry * (Math.cos(t * 0.05) * 0.3 - py * 0.9);
      ox = LW.clamp(ox, 0, cw - sw); oy = LW.clamp(oy, 0, ch - sh);
      c.drawImage(bg, ox * LW.s, oy * LW.s, sw * LW.s, sh * LW.s, 0, 0, W, H);

      var gl = LW.glow(accent.join(','), 128);
      c.globalCompositeOperation = 'lighter';
      // мягкий свет следует за курсором
      c.globalAlpha = 0.16 + (LW.M.down ? 0.12 : 0);
      c.drawImage(gl, LW.M.ax - H * 0.35, LW.M.ay - H * 0.35, H * 0.7, H * 0.7);
      // световой блик, раз в несколько секунд пролетает по картинке
      var ph = (t % 16) / 16;
      if (ph < 0.6) {
        var sxp = (ph / 0.6 * 1.5 - 0.35) * W, a = Math.sin(ph / 0.6 * Math.PI);
        c.save(); c.globalAlpha = 0.09 * a; c.transform(1, 0, -0.3, 1, 0, 0);
        c.drawImage(sweep, sxp, -H * 0.1, W * 0.3, H * 1.2); c.restore();
      }

      // частицы
      var wind = Math.sin(t * 0.3) * 0.5 + LW.M.vx * 0.0004;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], u = dt * 30;
        if (style === 0) { // искры, поднимаются вверх
          p.y -= (14 + 22 * p.z) * dt; p.x += Math.sin(t * 0.8 + p.a) * 9 * dt;
          var tw = 0.5 + 0.5 * Math.sin(t * 2.2 * p.s + p.a), sz = (5 + 11 * p.z) * (0.6 + tw * 0.6);
          c.globalAlpha = 0.25 + 0.55 * tw * p.z; c.drawImage(gl, p.x - sz, p.y - sz, sz * 2, sz * 2);
          if (p.y < -20) spawn(p, false);
        } else if (style === 1) { // лепестки
          p.y += (24 + 30 * p.z) * dt; p.x += (Math.sin(t * 0.9 + p.a) * 26 + 18 + wind * 40) * dt * p.z; p.a += dt * (0.8 + p.s);
          var L = 5 + 8 * p.z; c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.scale(1, 0.55 + 0.45 * Math.sin(p.a * 1.7));
          c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.55 + 0.35 * p.z; c.fillStyle = 'rgb(255,' + (180 + p.s * 20 | 0) + ',205)';
          c.beginPath(); c.ellipse(0, 0, L, L * 0.5, 0, 0, 6.283); c.fill(); c.restore(); c.globalCompositeOperation = 'lighter';
          if (p.y > H + 20 || p.x > W + 40) spawn(p, false);
        } else if (style === 2) { // снег
          p.y += (22 + 50 * p.z) * dt; p.x += (Math.sin(t * 0.7 + p.a) * 14 + wind * 30) * dt;
          var r = 1 + 2.6 * p.z; c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.35 + 0.5 * p.z; c.fillStyle = '#eef4ff';
          c.beginPath(); c.arc(p.x, p.y, r, 0, 6.283); c.fill(); c.globalCompositeOperation = 'lighter';
          if (p.y > H + 10) spawn(p, false);
        } else if (style === 3) { // угольки
          p.y -= (30 + 50 * p.z) * dt; p.x += (Math.sin(t * 1.3 + p.a) * 22 + wind * 30) * dt;
          var fl = 0.55 + 0.45 * Math.sin(t * 7 * p.s + p.a), sz3 = (4 + 9 * p.z) * fl + 2;
          c.globalAlpha = (0.35 + 0.5 * fl) * p.z; c.drawImage(LW.glow('255,150,60', 64), p.x - sz3, p.y - sz3, sz3 * 2, sz3 * 2);
          if (p.y < -20) spawn(p, false);
        } else if (style === 4) { // дождь
          var sp = 520 + 520 * p.z; p.y += sp * dt; p.x -= sp * 0.18 * dt;
          c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.14 + 0.2 * p.z; c.strokeStyle = '#cfe0ff'; c.lineWidth = 0.8 + p.z;
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 0.18 * 26 * p.z, p.y - 26 * p.z - 6); c.stroke(); c.globalCompositeOperation = 'lighter';
          if (p.y > H + 20 || p.x < -20) { p.x = rnd() * (W + 200); p.y = -30; }
        } else { // боке
          p.x += Math.sin(t * 0.12 + p.a) * 6 * dt; p.y += Math.cos(t * 0.1 + p.a * 2) * 5 * dt - 3 * dt;
          var rb = (30 + 90 * p.z) * (1 + 0.1 * Math.sin(t * 0.6 + p.a));
          c.globalAlpha = 0.07 + 0.1 * p.z * (0.6 + 0.4 * Math.sin(t * 0.5 + p.a * 3)); c.drawImage(gl, p.x - rb, p.y - rb, rb * 2, rb * 2);
          if (p.y < -rb) { p.y = H + rb; p.x = rnd() * W; }
        }
      }
      // круги от кликов
      for (var j = rings.length - 1; j >= 0; j--) {
        var rg = rings[j]; rg.t += dt;
        if (rg.t > 1.4) { rings.splice(j, 1); continue; }
        var e = rg.t / 1.4, rr = 20 + e * H * 0.28;
        c.globalAlpha = (1 - e) * 0.7; c.strokeStyle = 'rgb(' + accent.join(',') + ')'; c.lineWidth = 3 * (1 - e) + 0.5;
        c.beginPath(); c.arc(rg.x, rg.y, rr, 0, 6.283); c.stroke();
        c.globalAlpha = (1 - e) * 0.35; c.drawImage(gl, rg.x - rr * 0.9, rg.y - rr * 0.9, rr * 1.8, rr * 1.8);
      }
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      c.drawImage(vig, 0, 0, W, H);
      if (loaded < 1) { c.fillStyle = 'rgba(0,0,0,' + (1 - loaded) + ')'; c.fillRect(0, 0, W, H); }
    }
  });
};

(function () {
  // стили частиц: 0 искры, 1 лепестки, 2 снег, 3 угольки, 4 дождь, 5 боке
  var names = ['искры света', 'лепестки', 'снег', 'угольки', 'дождь', 'мягкое боке'];
  var first = [0, 1, 5, 2, 0, 3, 4, 5, 0, 3, 3, 3, 5, 3, 2, 1, 0, 4, 2], cycle = [0, 1, 5, 0, 2, 5, 1, 4, 0, 5];
  ARTFILES.forEach(function (file, i) {
    var n = (i < 9 ? '0' : '') + (i + 1), st = i < first.length ? first[i] : cycle[i % cycle.length];
    S({
      file: 'Живой арт ' + n, cat: 'Аниме', mouse: true, tags: ['аниме', 'арт', 'параллакс', 'частицы'],
      desc: 'Аниме-арт в высоком качестве, который двигается: картинка плавно «дышит» и следит за курсором, поверх — ' + names[st] + ' и пролетающий блик. Клик пускает круг света.',
      run: new Function('(' + ART.toString() + ')(' + JSON.stringify('art/' + file) + ',' + st + ');')
    });
  });
})();
