// ---------- Анимации с названием Lumora ----------
S({
  file: 'Lumora — частицы', cat: 'Интерактив', mouse: true, tags: ['lumora', 'частицы', 'текст', 'интерактив'],
  desc: 'Слово Lumora собирается из тысяч светящихся частиц. Курсор раздвигает их, клик разбрасывает, и они собираются снова.',
  run: function () {
    var W, H, N = 0, tx, ty, px, py, vx, vy, col, sz, ph, rnd = LW.rng(11), glow = null, bg = null, scatterT = 8, scattered = 0, cols = [];
    var PAL = [[255, 106, 61], [255, 79, 160], [160, 92, 255], [86, 150, 255], [60, 220, 220]];
    function mixPal(u) { var x = LW.clamp(u, 0, 0.9999) * (PAL.length - 1), i = Math.floor(x), f = x - i, a = PAL[i], b = PAL[i + 1]; return [a[0] + (b[0] - a[0]) * f | 0, a[1] + (b[1] - a[1]) * f | 0, a[2] + (b[2] - a[2]) * f | 0]; }
    LW.onClick(function (x, y) {
      for (var i = 0; i < N; i++) { var dx = px[i] - x, dy = py[i] - y, d = Math.sqrt(dx * dx + dy * dy) + 8, f = Math.min(30, 9000 / d); vx[i] += dx / d * f; vy[i] += dy / d * f; }
    });
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h;
        var fs = Math.min(w * 0.19, h * 0.3), off = document.createElement('canvas'); off.width = Math.ceil(w); off.height = Math.ceil(h);
        var o = off.getContext('2d'); o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
        o.font = '700 ' + fs + 'px "Segoe UI Variable Display","Segoe UI",Arial,sans-serif';
        o.fillText('Lumora', w / 2, h / 2 + fs * 0.08);
        var d = o.getImageData(0, 0, off.width, off.height).data, step = Math.max(2, Math.round(fs / 46)), pts = [];
        for (var y = 0; y < off.height; y += step) for (var x = 0; x < off.width; x += step) if (d[(y * off.width + x) * 4 + 3] > 128) pts.push(x + (rnd() - .5) * step * .6, y + (rnd() - .5) * step * .6);
        N = Math.min(9000, pts.length / 2);
        tx = new Float32Array(N); ty = new Float32Array(N); px = new Float32Array(N); py = new Float32Array(N); vx = new Float32Array(N); vy = new Float32Array(N); sz = new Float32Array(N); ph = new Float32Array(N); col = new Uint8Array(N);
        var x0 = w / 2 - fs * 1.7, x1 = w / 2 + fs * 1.7;
        for (var i = 0; i < N; i++) {
          tx[i] = pts[i * 2]; ty[i] = pts[i * 2 + 1];
          var a = rnd() * 6.283, r = Math.max(w, h) * (0.4 + rnd() * 0.5);
          px[i] = w / 2 + Math.cos(a) * r; py[i] = h / 2 + Math.sin(a) * r; vx[i] = vy[i] = 0;
          sz[i] = 1.7 + rnd() * 2.1; ph[i] = rnd() * 6.283; col[i] = Math.min(PAL.length * 3 - 1, Math.floor(LW.clamp((tx[i] - x0) / (x1 - x0), 0, 1) * (PAL.length * 3 - 1)));
        }
        cols = []; for (var k = 0; k < PAL.length * 3; k++) cols.push(mixPal(k / (PAL.length * 3 - 1)));
        glow = LW.glow('255,140,110', 64);
        bg = LW.layer(w, h, function (x, ww, hh) {
          var g = x.createRadialGradient(ww / 2, hh * 0.55, 0, ww / 2, hh * 0.55, Math.hypot(ww, hh) * 0.6);
          g.addColorStop(0, '#15102a'); g.addColorStop(1, '#05040a'); x.fillStyle = g; x.fillRect(0, 0, ww, hh);
        });
        c.drawImage(bg, 0, 0, w, h);
      },
      frame: function (c, t, dt) {
        scatterT -= dt;
        if (scatterT < 0) { scatterT = 14 + rnd() * 6; scattered = 2.2; for (var i = 0; i < N; i++) { var a = rnd() * 6.283, f = 8 + rnd() * 16; vx[i] += Math.cos(a) * f; vy[i] += Math.sin(a) * f; } }
        if (scattered > 0) scattered -= dt;
        // шлейф
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.3; c.drawImage(bg, 0, 0, W, H); c.globalAlpha = 1;
        // мягкое северное сияние за текстом
        c.globalCompositeOperation = 'lighter';
        for (var b = 0; b < 3; b++) {
          var bx = W * (0.25 + 0.25 * b) + Math.sin(t * 0.18 + b * 2) * W * 0.08, by = H * 0.5 + Math.cos(t * 0.15 + b) * H * 0.1, br = H * 0.55;
          c.globalAlpha = 0.045; c.drawImage(LW.glow(['255,90,120', '120,90,255', '60,170,255'][b], 128), bx - br, by - br, br * 2, br * 2);
        }
        var mx = LW.M.ax, my = LW.M.ay, k = scattered > 0 ? 0.0006 : 0.035, damp = scattered > 0 ? 0.992 : 0.86, sdt = dt * 30;
        var wave = t * 1.7, buckets = cols.length, paths = [];
        for (var q = 0; q < buckets; q++) paths.push([]);
        for (var i = 0; i < N; i++) {
          var dx = tx[i] - px[i], dy = ty[i] - py[i];
          vx[i] += dx * k * sdt; vy[i] += dy * k * sdt;
          // курсор расталкивает частицы
          var rx = px[i] - mx, ry = py[i] - my, rd = rx * rx + ry * ry;
          if (rd < 28000) { var d = Math.sqrt(rd) + 1, f = (1 - d / 167) * 3.2 * sdt; vx[i] += rx / d * f * 4; vy[i] += ry / d * f * 4; }
          // лёгкое «дыхание» вокруг цели
          vx[i] += Math.sin(t * 1.3 + ph[i]) * 0.012 * sdt; vy[i] += Math.cos(t * 1.1 + ph[i] * 1.3) * 0.012 * sdt;
          vx[i] *= Math.pow(damp, sdt); vy[i] *= Math.pow(damp, sdt);
          px[i] += vx[i] * sdt; py[i] += vy[i] * sdt;
          paths[col[i]].push(i);
        }
        for (var cb = 0; cb < buckets; cb++) {
          var list = paths[cb], cc = cols[cb]; if (!list.length) continue;
          c.fillStyle = 'rgb(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ')'; c.globalAlpha = 0.9; c.beginPath();
          for (var j = 0; j < list.length; j++) { var n = list[j], s = sz[n] * (0.8 + 0.5 * Math.sin(wave - px[n] * 0.012 + ph[n])); c.rect(px[n] - s / 2, py[n] - s / 2, s, s); }
          c.fill();
        }
        // ореол вокруг части частиц
        c.globalAlpha = 0.12;
        for (var g = 0; g < N; g += 3) { var s2 = 11 + 5 * Math.sin(wave * 0.7 + ph[g]); c.drawImage(glow, px[g] - s2, py[g] - s2, s2 * 2, s2 * 2); }
        // звёздочка-логотип над словом
        var lx = W / 2, ly = H / 2 - Math.min(W * 0.19, H * 0.3) * 0.85, ls = Math.min(W, H) * 0.035 * (1 + 0.08 * Math.sin(t * 1.4));
        c.globalAlpha = 0.9; c.fillStyle = '#ffd9c4'; c.beginPath();
        for (var p = 0; p < 8; p++) { var ang = p * Math.PI / 4 - Math.PI / 2 + t * 0.15, rr = p % 2 ? ls * 0.22 : ls; c.lineTo(lx + Math.cos(ang) * rr, ly + Math.sin(ang) * rr); }
        c.closePath(); c.fill();
        c.globalAlpha = 0.4; c.drawImage(LW.glow('255,170,130', 128), lx - ls * 2.4, ly - ls * 2.4, ls * 4.8, ls * 4.8);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        // подпись
        c.fillStyle = 'rgba(255,255,255,0.28)'; c.font = '500 ' + Math.max(11, H * 0.016) + 'px "Segoe UI","Segoe UI Variable Text",Arial'; c.textAlign = 'center';
        c.fillText('Ж И В Ы Е   О Б О И', W / 2, H / 2 + Math.min(W * 0.19, H * 0.3) * 0.72);
      }
    });
  }
});

S({
  file: 'Lumora — неон', cat: 'Интерактив', mouse: true, tags: ['lumora', 'неон', 'текст', 'интерактив'],
  desc: 'Неоновая вывеска Lumora на кирпичной стене: буквы мерцают, свет живёт. Курсор подсвечивает стену, клик «щёлкает» вывеской.',
  run: function () {
    var W, H, wall = null, letters = [], glowL = null, dust = [], rnd = LW.rng(5), flick = [], off = 0, kick = 0;
    LW.onClick(function () { kick = 1.2; });
    function pink(a) { return 'rgba(255,70,160,' + a + ')'; }
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h;
        wall = LW.layer(w, h, function (x) {
          x.fillStyle = '#1a0f14'; x.fillRect(0, 0, w, h);
          var bh = Math.max(26, h / 18), bw = bh * 2.3;
          for (var y = 0, r = 0; y < h; y += bh, r++) for (var xx = -(r % 2) * bw / 2; xx < w; xx += bw) {
            var s = 0.85 + rnd() * 0.3; x.fillStyle = 'rgb(' + (46 * s | 0) + ',' + (26 * s | 0) + ',' + (30 * s | 0) + ')'; x.fillRect(xx + 2, y + 2, bw - 4, bh - 4);
            if (rnd() < 0.2) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(xx + 2 + rnd() * bw * .5, y + 2, rnd() * 18, bh - 4); }
          }
          var v = x.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, Math.hypot(w, h) * 0.6); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.75)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
        });
        var fs = Math.min(w * 0.2, h * 0.34), font = '700 ' + fs + 'px "Segoe UI Variable Display","Segoe UI",Arial,sans-serif';
        var m = document.createElement('canvas').getContext('2d'); m.font = font;
        var word = 'Lumora', total = m.measureText(word).width, x0 = w / 2 - total / 2, cy = h / 2; letters = []; flick = [];
        var xx = x0;
        for (var i = 0; i < word.length; i++) {
          var ch = word[i], cw = m.measureText(ch).width, pad = fs * 0.5, hue = i % 2 ? [90, 170, 255] : [255, 70, 160];
          (function (ch, xx, cw, hue) {
            var cv = LW.layer(cw + pad * 2, fs * 1.8, function (cx2, lw, lh) {
              cx2.font = font; cx2.textBaseline = 'middle'; cx2.textAlign = 'left'; cx2.lineJoin = 'round';
              var col = 'rgb(' + hue.join(',') + ')';
              cx2.shadowColor = col; cx2.shadowBlur = fs * 0.35; cx2.strokeStyle = col; cx2.lineWidth = fs * 0.06; cx2.strokeText(ch, pad, lh / 2);
              cx2.shadowBlur = fs * 0.12; cx2.strokeText(ch, pad, lh / 2);
              cx2.shadowBlur = 0; cx2.strokeStyle = '#fff4fb'; cx2.lineWidth = fs * 0.022; cx2.strokeText(ch, pad, lh / 2);
            });
            letters.push({ cv: cv, x: xx - pad, y: cy - fs * 0.9, w: cw + pad * 2, h: fs * 1.8, hue: hue });
          })(ch, xx, cw, hue);
          flick.push({ v: 1, t: 9 + rnd() * 9 });
          xx += cw;
        }
        dust = []; for (var d = 0; d < 70; d++) dust.push({ x: rnd() * w, y: rnd() * h, s: 0.5 + rnd() * 1.5, a: rnd() * 6.283 });
        glowL = LW.glow('255,70,160', 128);
      },
      frame: function (c, t, dt) {
        kick = Math.max(0, kick - dt);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.drawImage(wall, 0, 0, W, H);
        // свет курсора на стене
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.12; var gs = H * 0.6; c.drawImage(glowL, LW.M.ax - gs / 2, LW.M.ay - gs / 2, gs, gs);
        // розовый и голубой отсвет вывески на стене
        c.globalAlpha = 0.28; var gw = W * 0.75, gh = H * 0.8; c.drawImage(glowL, W / 2 - gw / 2, H / 2 - gh / 2, gw, gh);
        c.globalAlpha = 0.12; c.drawImage(LW.glow('90,170,255', 128), W * 0.5 - gw * 0.2, H * 0.5 - gh * 0.3, gw * 0.4, gh * 0.6);
        // буквы с мерцанием
        for (var i = 0; i < letters.length; i++) {
          var L = letters[i], f = flick[i], a = 1;
          f.t -= dt;
          if (f.t < 0) { f.t = 2 + rnd() * 9; f.v = 0.15 + rnd() * 0.3; setTimeout(function (q) { return function () { q.v = 1; }; }(f), 90 + rnd() * 260); }
          a = f.v * (0.94 + 0.06 * Math.sin(t * 40 + i * 3));
          if (kick > 0) a *= (Math.sin(kick * 32 + i) > 0 ? 1 : 0.2);
          c.globalAlpha = a; c.drawImage(L.cv, L.x, L.y, L.w, L.h);
        }
        // пылинки в свете
        c.globalAlpha = 0.5; c.fillStyle = '#ffd0e6';
        for (var p = 0; p < dust.length; p++) { var q2 = dust[p]; q2.x += Math.sin(t * 0.3 + q2.a) * 6 * dt; q2.y -= 6 * q2.s * dt; if (q2.y < -5) { q2.y = H + 5; q2.x = rnd() * W; } c.fillRect(q2.x, q2.y, q2.s, q2.s); }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
    });
  }
});
