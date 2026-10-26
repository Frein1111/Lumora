// ---------- Аниме и арт ----------
S({
  file: 'Сакура и луна', cat: 'Аниме', mouse: true, tags: ['аниме', 'сакура', 'ночь'],
  desc: 'Цветущая ветвь сакуры под огромной луной. Лепестки летят по ветру курсора.',
  run: function () {
    var W, H, bg, petals = [], rnd = LW.rng(17), wind = 0, pet;
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; petals = [];
        var cols = ['#ffd6e6', '#ffb7d0', '#ff9fc0', '#ffe9f1', '#ffc4da'];
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#120a2e'); g.addColorStop(0.55, '#3a1a5c'); g.addColorStop(1, '#b0457f');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var r = LW.rng(3);
          for (var i = 0; i < 120; i++) { x.fillStyle = 'rgba(255,240,255,' + (0.2 + r() * 0.6) + ')'; x.fillRect(r() * w, r() * h * 0.6, 1.3, 1.3); }
          var mx = w * 0.68, my = h * 0.34, mr = h * 0.2;
          var mg = x.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 2.6); mg.addColorStop(0, 'rgba(255,225,240,0.5)'); mg.addColorStop(1, 'rgba(255,200,230,0)');
          x.fillStyle = mg; x.fillRect(0, 0, w, h);
          var m2 = x.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr); m2.addColorStop(0, '#fffaf5'); m2.addColorStop(1, '#ffe2ec');
          x.fillStyle = m2; x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill();
          x.fillStyle = 'rgba(230,170,190,0.28)';
          for (var k = 0; k < 9; k++) { x.beginPath(); x.arc(mx + (r() - 0.5) * mr * 1.2, my + (r() - 0.5) * mr * 1.2, mr * (0.04 + r() * 0.1), 0, 7); x.fill(); }
          // дальние холмы
          x.fillStyle = 'rgba(60,20,70,0.8)'; x.beginPath(); x.moveTo(0, h);
          for (var px = 0; px <= w; px += 8) x.lineTo(px, h * 0.86 - LW.fbm(px / w * 3, 4, 3) * h * 0.1); x.lineTo(w, h); x.fill();
          x.fillStyle = '#1c0b2a'; x.beginPath(); x.moveTo(0, h);
          for (var px2 = 0; px2 <= w; px2 += 8) x.lineTo(px2, h * 0.93 - LW.fbm(px2 / w * 4, 9, 3) * h * 0.06); x.lineTo(w, h); x.fill();
          // ветвь
          function flower(fx, fy, s) {
            x.save(); x.translate(fx, fy); x.rotate(r() * 6.28); x.fillStyle = cols[Math.floor(r() * cols.length)];
            for (var p = 0; p < 5; p++) { x.rotate(1.2566); x.beginPath(); x.ellipse(0, -s * 0.55, s * 0.4, s * 0.6, 0, 0, 7); x.fill(); }
            x.fillStyle = '#d0407f'; x.beginPath(); x.arc(0, 0, s * 0.14, 0, 7); x.fill(); x.restore();
          }
          function grow(bx, by, ang, len, wd, depth) {
            var ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
            var cx = (bx + ex) / 2 + (r() - 0.5) * len * 0.3, cy = (by + ey) / 2 + (r() - 0.5) * len * 0.3;
            x.strokeStyle = '#1a0c1c'; x.lineWidth = wd; x.lineCap = 'round'; x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(cx, cy, ex, ey); x.stroke();
            if (depth >= 2) { var n = depth >= 3 ? 7 : 3; for (var i = 0; i < n; i++) flower(ex + (r() - 0.5) * 60, ey + (r() - 0.5) * 60, h * (0.012 + r() * 0.014)); }
            if (depth >= 5) return;
            var kids = depth < 2 ? 2 : (r() < 0.6 ? 2 : 3);
            for (var k = 0; k < kids; k++) grow(ex, ey, ang + (r() - 0.5) * 1.5 + (k === 0 ? -0.15 : 0.15), len * (0.68 + r() * 0.12), Math.max(1.2, wd * 0.66), depth + 1);
          }
          grow(-20, h * 0.18, 0.2, h * 0.26, h * 0.022, 0);
          grow(w * 0.02, h * 0.02, 0.5, h * 0.2, h * 0.012, 2);
          grow(w * 0.12, -10, 1.2, h * 0.16, h * 0.01, 2);
          for (var i2 = 0; i2 < 70; i2++) flower(r() * w * 0.55, r() * h * 0.5, h * (0.01 + r() * 0.018));
        });
        pet = [];
        for (var i = 0; i < 80; i++) petals.push({ x: rnd() * w, y: rnd() * h, s: 4 + rnd() * 7, r: rnd() * 6.28, vr: (rnd() - 0.5) * 2, p: rnd() * 6, z: rnd(), c: cols[Math.floor(rnd() * cols.length)] });
      },
      frame: function (c, t, dt) {
        c.drawImage(bg, 0, 0, W, H);
        var tw = (LW.M.ax / W - 0.5) * 2; wind += (tw * 0.8 - wind) * 0.03;
        for (var i = 0; i < petals.length; i++) {
          var p = petals[i]; p.y += (22 + p.z * 40) * dt; p.x += (22 + wind * 70 + Math.sin(t * 0.9 + p.p) * 26) * dt * (0.5 + p.z); p.r += p.vr * dt;
          if (p.y > H + 10 || p.x > W + 20) { p.y = -10; p.x = rnd() * W * 0.9 - W * 0.1; }
          c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.scale(1, 0.55 + 0.45 * Math.sin(t * 2 + p.p)); c.fillStyle = p.c; c.globalAlpha = 0.6 + p.z * 0.4;
          c.beginPath(); c.ellipse(0, 0, p.s * (0.6 + p.z * 0.5), p.s * 0.4, 0, 0, 7); c.fill(); c.restore();
        }
        c.globalAlpha = 1;
      }
    });
  }
});

S({
  file: 'Врата Тории', cat: 'Аниме', mouse: true, tags: ['аниме', 'япония', 'храм'],
  desc: 'Бесконечная аллея красных ворот тории на закате. Тихий полёт вперёд, курсор смещает взгляд.',
  run: function () {
    var W, H, bg, motes = [], rnd = LW.rng(9), glowW, fog;
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; motes = [];
        glowW = LW.glow('255,200,120', 256);
        for (var i = 0; i < 60; i++) motes.push({ x: rnd(), y: rnd(), z: rnd(), p: rnd() * 6 });
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h * 0.6); g.addColorStop(0, '#2d1b4e'); g.addColorStop(0.6, '#d9607a'); g.addColorStop(1, '#ffb877');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
        });
      },
      frame: function (c, t) {
        c.drawImage(bg, 0, 0, W, H);
        var mx = (LW.M.ax / W - 0.5), my = (LW.M.ay / H - 0.5);
        var vx = W / 2 + mx * W * 0.1, vy = H * 0.46 + my * H * 0.06, F = Math.min(W, H) * 0.72;
        // лес по бокам
        var gl = c.createRadialGradient(vx, vy, 0, vx, vy, H * 0.7); gl.addColorStop(0, 'rgba(255,220,150,0.9)'); gl.addColorStop(0.3, 'rgba(255,170,110,0.4)'); gl.addColorStop(1, 'rgba(255,170,110,0)');
        c.fillStyle = gl; c.fillRect(0, 0, W, H);
        // земля
        var gg = c.createLinearGradient(0, vy, 0, H); gg.addColorStop(0, '#f0c08a'); gg.addColorStop(0.2, '#7a4a52'); gg.addColorStop(1, '#2a1a28');
        c.fillStyle = gg; c.fillRect(0, vy, W, H - vy);
        // ворота: от дальних к ближним
        var spacing = 2.2, N = 26, off = (t * 0.9) % spacing;
        for (var i = N; i >= 0; i--) {
          var z = i * spacing + (spacing - off) + 0.4; if (i === 0) z = Math.max(0.5, spacing - off + 0.4);
          var s = F / z, bend = Math.sin(z * 0.12 + t * 0.05) * 0.5 * (z / 20);
          var cx = vx + bend * s * 0.3, gy = vy + 0.5 * s * 1.0;       // уровень земли
          var gw = 1.55 * s, gh = 3.0 * s, pw = 0.2 * s;
          var fogA = Math.min(0.92, Math.pow(z / (N * spacing), 0.8) * 1.15);
          var r = Math.round(210 - 70 * fogA), gcol = Math.round(52 + 120 * fogA), b = Math.round(30 + 100 * fogA);
          var col = 'rgb(' + Math.round(LW.lerp(214, 250, fogA)) + ',' + Math.round(LW.lerp(60, 170, fogA)) + ',' + Math.round(LW.lerp(32, 130, fogA)) + ')';
          var dark = 'rgb(' + Math.round(LW.lerp(30, 120, fogA)) + ',' + Math.round(LW.lerp(18, 60, fogA)) + ',' + Math.round(LW.lerp(22, 80, fogA)) + ')';
          c.fillStyle = col;
          c.fillRect(cx - gw / 2 - pw / 2, gy - gh, pw, gh); c.fillRect(cx + gw / 2 - pw / 2, gy - gh, pw, gh);
          c.fillStyle = dark; c.fillRect(cx - gw / 2 - pw * 0.6, gy - gh * 0.07, pw * 1.2, gh * 0.07); c.fillRect(cx + gw / 2 - pw * 0.6, gy - gh * 0.07, pw * 1.2, gh * 0.07);
          c.fillStyle = col; c.fillRect(cx - gw / 2 - pw * 1.2, gy - gh * 0.8, gw + pw * 2.4, pw * 0.9);
          // верхняя балка с изгибом
          c.fillStyle = dark; c.beginPath(); c.moveTo(cx - gw * 0.78, gy - gh - pw * 0.4); c.quadraticCurveTo(cx, gy - gh + pw * 0.4, cx + gw * 0.78, gy - gh - pw * 0.4);
          c.lineTo(cx + gw * 0.68, gy - gh + pw * 0.7); c.quadraticCurveTo(cx, gy - gh + pw * 1.3, cx - gw * 0.68, gy - gh + pw * 0.7); c.fill();
          c.fillStyle = col; c.fillRect(cx - gw * 0.56, gy - gh + pw * 0.8, gw * 1.12, pw * 0.8);
          // свет на земле между воротами
          if (fogA < 0.7) { c.fillStyle = 'rgba(255,200,130,' + 0.18 * (1 - fogA) + ')'; c.fillRect(cx - gw * 0.4, gy - 1, gw * 0.8, Math.max(1, s * 0.04)); }
        }
        // туман и дымка
        var fg = c.createLinearGradient(0, vy - H * 0.2, 0, vy + H * 0.25); fg.addColorStop(0, 'rgba(255,190,140,0)'); fg.addColorStop(0.5, 'rgba(255,190,140,0.22)'); fg.addColorStop(1, 'rgba(255,190,140,0)');
        c.fillStyle = fg; c.fillRect(0, vy - H * 0.2, W, H * 0.45);
        // светлячки/пылинки
        c.globalCompositeOperation = 'lighter';
        for (var m = 0; m < motes.length; m++) {
          var o = motes[m]; o.z -= 0.0035; o.x += Math.sin(t * 0.5 + o.p) * 0.0004; if (o.z < 0.03) { o.z = 1; o.x = rnd(); o.y = rnd(); }
          var ms = 1 / o.z, px = vx + (o.x - 0.5) * W * 0.9 * ms * 0.5, py = vy + (o.y - 0.5) * H * 0.6 * ms * 0.5;
          var sz = 8 + 18 / (o.z + 0.2); c.globalAlpha = 0.55 * Math.min(1, ms * 0.4); c.drawImage(glowW, px - sz / 2, py - sz / 2, sz, sz);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Закат на переезде', cat: 'Аниме', tags: ['аниме', 'закат', 'поезд', 'облака'],
  desc: 'Летний вечер у железнодорожного переезда: огромные облака, мигающие огни, проходящий поезд.',
  run: function () {
    var W, H, sky, clouds, rnd = LW.rng(12), gnd, lamp;
    var CYC = 30;
    LW.run({
      type: '2d', fps: 30,
      init: function (c, w, h) {
        W = w; H = h; lamp = LW.glow('255,70,60', 64);
        sky = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h * 0.78); g.addColorStop(0, '#2f6fc7'); g.addColorStop(0.45, '#8fb4e8'); g.addColorStop(0.75, '#f6c5a8'); g.addColorStop(1, '#ffb27a');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var sg = x.createRadialGradient(w * 0.8, h * 0.68, 0, w * 0.8, h * 0.68, w * 0.5); sg.addColorStop(0, 'rgba(255,230,170,0.9)'); sg.addColorStop(0.3, 'rgba(255,190,130,0.35)'); sg.addColorStop(1, 'rgba(255,190,130,0)');
          x.fillStyle = sg; x.fillRect(0, 0, w, h);
        });
        clouds = LW.clouds(w * 2, h * 0.8, { res: 0.42, scale: 2.4, squash: 2.4, cover: 0.52, soft: 0.3, light: [0.9, 0.2], lit: [255, 246, 232], shade: [150, 138, 190], warm: [255, 160, 110], warmAmt: 0.6, fadeTop: 0.08, fadeBottom: 0.35, step: 0.016, gain: 3.5, seed: 4 });
        gnd = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, h * 0.72, 0, h); g.addColorStop(0, '#3b5a52'); g.addColorStop(1, '#10201f');
          x.fillStyle = g; x.beginPath(); x.moveTo(0, h);
          for (var px = 0; px <= w; px += 10) x.lineTo(px, h * 0.76 + LW.noise(px / 300, 1) * h * 0.012); x.lineTo(w, h); x.fill();
          // рельсы
          x.fillStyle = '#1a1a22'; x.fillRect(0, h * 0.86, w, 4); x.fillRect(0, h * 0.905, w, 6);
          x.fillStyle = 'rgba(0,0,0,0.5)'; for (var s = 0; s < w; s += 26) x.fillRect(s, h * 0.865, 12, h * 0.05);
          // столбы и провода
          var xs = [w * 0.08, w * 0.42, w * 0.78, w * 1.14];
          x.strokeStyle = '#0d0d16'; x.lineWidth = 2;
          for (var i = 0; i < xs.length - 1; i++) {
            for (var k = 0; k < 3; k++) { x.beginPath(); x.moveTo(xs[i], h * (0.5 + k * 0.025)); x.quadraticCurveTo((xs[i] + xs[i + 1]) / 2, h * (0.56 + k * 0.025), xs[i + 1], h * (0.5 + k * 0.025)); x.stroke(); }
          }
          x.fillStyle = '#0d0d16'; for (var j = 0; j < 3; j++) { x.fillRect(xs[j] - 4, h * 0.46, 8, h * 0.45); x.fillRect(xs[j] - w * 0.03, h * 0.5, w * 0.06, 5); x.fillRect(xs[j] - w * 0.025, h * 0.525, w * 0.05, 4); }
        });
      },
      frame: function (c, t) {
        var ph = (LW.cfg.demo ? t + 9 : t) % CYC;
        var off = (0.5 - 0.5 * Math.cos(t * 0.02)) * W * 1.0;
        c.drawImage(sky, 0, 0, W, H);
        c.drawImage(clouds, -off, H * 0.04, W * 2, H * 0.8);
        // слой дымки у горизонта
        var hz = c.createLinearGradient(0, H * 0.6, 0, H * 0.78); hz.addColorStop(0, 'rgba(255,190,140,0)'); hz.addColorStop(1, 'rgba(255,190,140,0.5)'); c.fillStyle = hz; c.fillRect(0, H * 0.6, W, H * 0.18);
        c.drawImage(gnd, 0, 0, W, H);
        var warn = ph > 5 && ph < 18, blink = Math.floor(t * 2.2) % 2;
        var gx = W * 0.62, gy = H * 0.86;
        // шлагбаум
        var arm = ph < 6 ? 0 : ph < 8 ? (ph - 6) / 2 : ph < 16 ? 1 : ph < 18 ? 1 - (ph - 16) / 2 : 0, ang = -1.2 + arm * 1.15;
        c.save(); c.translate(gx, gy - H * 0.06); c.fillStyle = '#0d0d16'; c.fillRect(-5, -H * 0.12, 10, H * 0.18); c.rotate(ang);
        for (var s = 0; s < 8; s++) { c.fillStyle = s % 2 ? '#f2f2f2' : '#d6302b'; c.fillRect(s * W * 0.02 - W * 0.02, -3, W * 0.02, 6); }
        c.restore();
        // огни
        c.globalCompositeOperation = 'lighter';
        for (var l = 0; l < 2; l++) {
          var on = warn && (blink === l);
          var lx = gx - 10 + l * 22, ly = gy - H * 0.17;
          c.fillStyle = '#240f12'; c.beginPath(); c.arc(lx, ly, 7, 0, 7); c.fill();
          if (on) { c.globalAlpha = 1; c.drawImage(lamp, lx - 36, ly - 36, 72, 72); c.fillStyle = '#ff6a58'; c.beginPath(); c.arc(lx, ly, 6, 0, 7); c.fill(); }
        }
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        // поезд
        if (ph > 8.5 && ph < 15.5) {
          var f = (ph - 8.5) / 7, tx = -W * 0.9 + f * W * 2.2, ty = H * 0.78, th = H * 0.085, cw = W * 0.17;
          for (var v = 0; v < 6; v++) {
            var vx = tx + v * cw; if (vx > W || vx + cw < 0) continue;
            c.fillStyle = '#d9dfe8'; c.fillRect(vx, ty, cw - 3, th);
            c.fillStyle = '#2d6fb5'; c.fillRect(vx, ty + th * 0.62, cw - 3, th * 0.12);
            c.fillStyle = '#f7d98a'; for (var w2 = 0; w2 < 5; w2++) c.fillRect(vx + cw * 0.08 + w2 * cw * 0.18, ty + th * 0.15, cw * 0.12, th * 0.36);
            c.fillStyle = '#222730'; c.fillRect(vx, ty + th, cw - 3, th * 0.12);
          }
        }
        // вспышка заката на переднем плане
        var fgl = c.createLinearGradient(0, H * 0.86, 0, H); fgl.addColorStop(0, 'rgba(255,170,110,0.15)'); fgl.addColorStop(1, 'rgba(0,0,0,0.4)'); c.fillStyle = fgl; c.fillRect(0, H * 0.86, W, H * 0.14);
      }
    });
  }
});

S({
  file: 'Ночной Токио', cat: 'Аниме', mouse: true, tags: ['аниме', 'город', 'неон', 'дождь'],
  desc: 'Неоновые вывески, горящие окна и дождь над ночным городом. Слои двигаются за курсором.',
  run: function () {
    var W, H, sky, layers = [], rain = [], rnd = LW.rng(5), train, signs = [];
    var texts = ['ラーメン', '居酒屋', '夜', 'カラオケ', 'ホテル', 'ゲーム', '寿司', 'バー'];
    var neon = ['255,60,140', '60,220,255', '255,200,60', '170,100,255', '90,255,170'];
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; layers = []; rain = []; signs = [];
        sky = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b0620'); g.addColorStop(0.55, '#2a1050'); g.addColorStop(1, '#7a2a7a');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var mx = w * 0.78, my = h * 0.2, mr = h * 0.07, mg = x.createRadialGradient(mx, my, mr, mx, my, mr * 5); mg.addColorStop(0, 'rgba(255,200,240,0.4)'); mg.addColorStop(1, 'rgba(255,200,240,0)');
          x.fillStyle = mg; x.fillRect(0, 0, w, h); x.fillStyle = '#ffeaf6'; x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill();
        });
        var cfg = [[0.52, 0.2, '#1c0f3a', 0.9], [0.62, 0.28, '#140a2c', 1.1], [0.78, 0.4, '#0a0618', 1.4]];
        for (var L = 0; L < 3; L++) {
          (function (L) {
            var r = LW.rng(50 + L), base = h * cfg[L][0], maxH = h * cfg[L][1];
            var wins = [];
            var img = LW.layer(w * 1.1, h, function (x) {
              x.fillStyle = cfg[L][2]; var px = 0;
              while (px < w * 1.1) {
                var bw = w * (0.05 + r() * 0.08), bh = maxH * (0.35 + r() * 0.65), top = base + (h - base) * 0 - bh + maxH * 0.5 + (L * h * 0.02);
                x.fillRect(px, top, bw, h - top);
                if (r() < 0.5) x.fillRect(px + bw * 0.4, top - bh * 0.08, bw * 0.06, bh * 0.08);
                var cols = Math.floor(bw / (10 + L * 4)), rows = Math.floor(bh / (14 + L * 5));
                for (var cx = 0; cx < cols; cx++) for (var ry = 0; ry < rows; ry++) {
                  if (r() < 0.38) { var wx = px + 6 + cx * (10 + L * 4), wy = top + 8 + ry * (14 + L * 5); wins.push([wx, wy, 5 + L * 2, 7 + L * 2, r() < 0.2]); }
                }
                if (L > 0 && r() < 0.5) signs.push({ x: px + bw * 0.5, y: top + bh * (0.2 + r() * 0.5), t: texts[Math.floor(r() * texts.length)], c: neon[Math.floor(r() * neon.length)], f: r() * 6, L: L, s: 16 + r() * 14 + L * 6 });
                px += bw + 3;
              }
              for (var i = 0; i < wins.length; i++) { var q = wins[i]; x.fillStyle = q[4] ? 'rgba(255,230,160,0.9)' : 'rgba(255,200,120,' + (0.25 + r() * 0.5) + ')'; x.fillRect(q[0], q[1], q[2], q[3]); }
            });
            layers.push({ img: img, par: 0.012 + L * 0.02 });
          })(L);
        }
        for (var i = 0; i < 260; i++) rain.push({ x: rnd() * w, y: rnd() * h, l: 10 + rnd() * 20, s: 700 + rnd() * 500 });
      },
      frame: function (c, t, dt) {
        c.drawImage(sky, 0, 0, W, H);
        var mx = LW.M.ax / W - 0.5;
        for (var L = 0; L < layers.length; L++) {
          c.drawImage(layers[L].img, -W * 0.05 - mx * W * layers[L].par * 2, 0, W * 1.1, H);
          if (L === 1) {
            // поезд на эстакаде
            var tx = ((t * 160) % (W * 1.8)) - W * 0.4, ty = H * 0.66;
            c.fillStyle = '#0c0820'; c.fillRect(0, ty + 14, W, 6);
            for (var v = 0; v < 5; v++) { var vx = tx - v * 110; c.fillStyle = '#26203f'; c.fillRect(vx, ty - 12, 106, 26); c.fillStyle = 'rgba(255,240,180,0.95)'; for (var w2 = 0; w2 < 5; w2++) c.fillRect(vx + 8 + w2 * 19, ty - 6, 12, 9); }
          }
        }
        // вывески
        c.globalCompositeOperation = 'lighter'; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (var i = 0; i < signs.length; i++) {
          var sg = signs[i], par = layers[sg.L].par; var flick = Math.sin(t * 3 + sg.f) > -0.92 ? 1 : 0.25;
          var sx = sg.x - W * 0.05 - mx * W * par * 2;
          c.font = '700 ' + sg.s + 'px "Yu Gothic UI","Meiryo","Segoe UI",sans-serif';
          c.fillStyle = 'rgba(' + sg.c + ',' + (0.2 * flick) + ')'; for (var k = 0; k < 2; k++) c.fillText(sg.t, sx, sg.y + k);
          c.shadowColor = 'rgba(' + sg.c + ',0.9)'; c.shadowBlur = 0;
          c.fillStyle = 'rgba(' + sg.c + ',' + (0.95 * flick) + ')'; c.fillText(sg.t, sx, sg.y);
        }
        c.globalCompositeOperation = 'source-over';
        // дождь
        c.lineWidth = 1; c.beginPath();
        for (var r = 0; r < rain.length; r++) { var d = rain[r]; d.y += d.s * dt; d.x -= d.s * 0.12 * dt; if (d.y > H) { d.y = -d.l; d.x = rnd() * W * 1.2; } c.moveTo(d.x, d.y); c.lineTo(d.x + d.l * 0.12, d.y - d.l); }
        c.strokeStyle = 'rgba(190,200,255,0.28)'; c.stroke();
        var fg = c.createLinearGradient(0, H * 0.8, 0, H); fg.addColorStop(0, 'rgba(255,60,160,0)'); fg.addColorStop(1, 'rgba(255,60,160,0.22)'); c.fillStyle = fg; c.fillRect(0, H * 0.8, W, H * 0.2);
      }
    });
  }
});

S({
  file: 'Девушка и звёзды', cat: 'Аниме', mouse: true, tags: ['аниме', 'ночь', 'звёзды'],
  desc: 'Силуэт девушки на холме под звёздами. Волосы и платье развеваются, падают звёзды.',
  run: function () {
    var W, H, bg, shooting = [], rnd = LW.rng(26), flies = [], gl;
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; shooting = []; gl = LW.glow('255,240,190', 48);
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#05061a'); g.addColorStop(0.5, '#1a2a6a'); g.addColorStop(0.85, '#3a76a8'); g.addColorStop(1, '#6fb8c8');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var r = LW.rng(2);
          for (var i = 0; i < 480; i++) { var sz = r() < 0.06 ? 2.2 : 1.1; x.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.8) + ')'; x.fillRect(r() * w, r() * h * 0.75, sz, sz); }
          var mx = w * 0.22, my = h * 0.28, mr = h * 0.08, mg = x.createRadialGradient(mx, my, mr, mx, my, mr * 6); mg.addColorStop(0, 'rgba(180,220,255,0.45)'); mg.addColorStop(1, 'rgba(180,220,255,0)');
          x.fillStyle = mg; x.fillRect(0, 0, w, h); x.fillStyle = '#f4faff'; x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill();
          x.fillStyle = 'rgba(20,50,90,0.45)'; x.beginPath(); x.moveTo(0, h);
          for (var px = 0; px <= w; px += 8) x.lineTo(px, h * 0.8 - LW.fbm(px / w * 2.5, 3, 4) * h * 0.14); x.lineTo(w, h); x.fill();
          x.fillStyle = '#0a1228'; x.beginPath(); x.moveTo(0, h);
          for (var p2 = 0; p2 <= w; p2 += 6) { var hy = h * 0.86 - Math.pow(Math.max(0, 1 - Math.abs(p2 / w - 0.62) * 2.2), 1.4) * h * 0.12 - LW.noise(p2 / 200, 8) * h * 0.01; x.lineTo(p2, hy); }
          x.lineTo(w, h); x.fill();
        });
        flies = []; for (var i = 0; i < 26; i++) flies.push({ x: rnd() * w, y: h * (0.7 + rnd() * 0.3), p: rnd() * 6, s: 0.5 + rnd() });
      },
      frame: function (c, t, dt) {
        c.drawImage(bg, 0, 0, W, H);
        if (rnd() < 0.015) shooting.push({ x: rnd() * W * 0.8 + W * 0.2, y: rnd() * H * 0.3, v: 700 + rnd() * 400, life: 0 });
        c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
        for (var i = shooting.length - 1; i >= 0; i--) {
          var s = shooting[i]; s.life += dt; s.x -= s.v * dt * 0.8; s.y += s.v * dt * 0.45; if (s.life > 1.1) { shooting.splice(i, 1); continue; }
          var a = Math.sin(Math.PI * Math.min(1, s.life / 1.1)); var g = c.createLinearGradient(s.x, s.y, s.x + 190, s.y - 106);
          g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(1, 'rgba(160,200,255,0)'); c.strokeStyle = g; c.lineWidth = 2.4; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + 190, s.y - 106); c.stroke();
        }
        for (var f = 0; f < flies.length; f++) { var q = flies[f]; q.x += Math.sin(t * 0.5 * q.s + q.p) * 0.4; q.y += Math.cos(t * 0.4 * q.s + q.p) * 0.3; var al = 0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.5 * q.s + q.p), 2); c.globalAlpha = al; c.drawImage(gl, q.x - 10, q.y - 10, 20, 20); }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        // девушка
        var gx = W * 0.62, gy = H * 0.86 - H * 0.12 + 4, S = H * 0.26, wind = Math.sin(t * 1.3) * 0.5 + Math.sin(t * 2.7) * 0.25 + 0.7 + (LW.M.ax / W - 0.5) * 0.6;
        function sway(k) { return Math.sin(t * 2 + k) * 0.12 + wind * 0.3; }
        c.fillStyle = '#080c1e'; c.strokeStyle = '#080c1e'; c.lineCap = 'round'; c.lineJoin = 'round';
        // ноги
        c.lineWidth = S * 0.035; c.beginPath(); c.moveTo(gx - S * 0.03, gy - S * 0.36); c.lineTo(gx - S * 0.035, gy); c.moveTo(gx + S * 0.03, gy - S * 0.36); c.lineTo(gx + S * 0.04, gy); c.stroke();
        // платье
        c.beginPath(); c.moveTo(gx - S * 0.05, gy - S * 0.62); c.lineTo(gx + S * 0.05, gy - S * 0.62);
        c.quadraticCurveTo(gx + S * (0.08 + wind * 0.05), gy - S * 0.5, gx + S * (0.15 + wind * 0.12), gy - S * 0.33 + Math.sin(t * 3) * 2);
        for (var k = 1; k <= 5; k++) c.quadraticCurveTo(gx + S * (0.15 + wind * 0.12) - k * S * 0.06, gy - S * 0.28 + (k % 2) * S * 0.02 + Math.sin(t * 3 + k) * 2, gx + S * (0.15 + wind * 0.12) - k * S * (0.3 + wind * 0.03) / 5, gy - S * 0.33 + Math.sin(t * 3 + k) * 2);
        c.quadraticCurveTo(gx - S * 0.1, gy - S * 0.5, gx - S * 0.05, gy - S * 0.62); c.fill();
        // торс и руки
        c.beginPath(); c.moveTo(gx - S * 0.055, gy - S * 0.62); c.lineTo(gx - S * 0.045, gy - S * 0.78); c.lineTo(gx + S * 0.045, gy - S * 0.78); c.lineTo(gx + S * 0.055, gy - S * 0.62); c.fill();
        c.lineWidth = S * 0.028; c.beginPath(); c.moveTo(gx - S * 0.045, gy - S * 0.77); c.lineTo(gx - S * 0.09, gy - S * 0.66); c.stroke();
        c.beginPath(); c.moveTo(gx + S * 0.045, gy - S * 0.77); c.lineTo(gx + S * 0.1, gy - S * 0.88); c.lineTo(gx + S * 0.12, gy - S * 0.98); c.stroke();
        // голова и волосы
        c.beginPath(); c.arc(gx, gy - S * 0.85, S * 0.055, 0, 7); c.fill();
        for (var h2 = 0; h2 < 7; h2++) {
          var o = (h2 - 3) * S * 0.014; c.lineWidth = S * (0.03 - Math.abs(h2 - 3) * 0.003); c.beginPath(); c.moveTo(gx + o, gy - S * 0.9);
          c.bezierCurveTo(gx + o - S * 0.04, gy - S * 0.8, gx + o + S * (0.1 + wind * 0.1) + sway(h2) * S * 0.1, gy - S * 0.72, gx + o + S * (0.22 + wind * 0.2) + Math.sin(t * 2.4 + h2) * S * 0.04, gy - S * (0.66 - h2 * 0.012 + Math.sin(t * 1.9 + h2 * 0.8) * 0.03)); c.stroke();
        }
        c.lineWidth = S * 0.012; c.strokeStyle = 'rgba(190,225,255,0.55)'; c.beginPath(); c.arc(gx, gy - S * 0.85, S * 0.056, 3.3, 4.6); c.stroke();
      }
    });
  }
});

S({
  file: 'Фонарики в небе', cat: 'Аниме', mouse: true, tags: ['аниме', 'фонарики', 'ночь', 'озеро'],
  desc: 'Тёплые небесные фонарики уплывают в ночное небо и отражаются в озере.',
  run: function () {
    var W, H, bg, lanterns = [], rnd = LW.rng(7), warm, hz;
    function mk(first) {
      return { x: rnd() * W, y: first ? rnd() * H * 0.85 : hz + rnd() * 40, z: rnd(), p: rnd() * 6, s: 0.6 + rnd() * 0.7 };
    }
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; hz = h * 0.74; lanterns = []; warm = LW.glow('255,170,70', 256);
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#060a24'); g.addColorStop(0.7, '#1a2a62'); g.addColorStop(1, '#6a4a7a');
          x.fillStyle = g; x.fillRect(0, 0, w, hz);
          var r = LW.rng(4); for (var i = 0; i < 300; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.7) + ')'; x.fillRect(r() * w, r() * hz * 0.9, 1.2, 1.2); }
          x.fillStyle = '#0a0d22'; x.beginPath(); x.moveTo(0, hz);
          for (var px = 0; px <= w; px += 8) x.lineTo(px, hz - LW.fbm(px / w * 3, 12, 4) * h * 0.12 - h * 0.015); x.lineTo(w, hz); x.fill();
          var wg = x.createLinearGradient(0, hz, 0, h); wg.addColorStop(0, '#2a3066'); wg.addColorStop(1, '#070a1c'); x.fillStyle = wg; x.fillRect(0, hz, w, h - hz);
        });
        for (var i = 0; i < 46; i++) lanterns.push(mk(true));
      },
      frame: function (c, t, dt) {
        c.drawImage(bg, 0, 0, W, H);
        var wind = (LW.M.ax / W - 0.5) * 30;
        lanterns.sort(function (a, b) { return a.z - b.z; });
        for (var pass = 0; pass < 2; pass++) for (var i = 0; i < lanterns.length; i++) {
          var l = lanterns[i], sz = H * (0.02 + l.z * 0.035) * l.s;
          if (pass === 0) {
            l.y -= (12 + l.z * 20) * dt * l.s; l.x += (Math.sin(t * 0.4 + l.p) * 10 + wind) * dt;
            if (l.y < -40) { var n = mk(false); l.x = n.x; l.y = hz + 30; l.z = n.z; }
            continue;
          }
          var fl = 0.8 + 0.2 * Math.sin(t * 5 + l.p * 3);
          var ry = hz + (hz - l.y) * 0.9;
          if (l.y < hz && ry < H) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.3 * fl; c.drawImage(warm, l.x - sz * 2, ry - sz * 2, sz * 4, sz * 4); c.globalAlpha = 0.25; c.fillStyle = '#ffb860'; c.fillRect(l.x - sz * 0.35 + Math.sin(t * 2 + l.p) * 2, ry - sz * 0.4, sz * 0.7, sz * 0.9); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
          if (l.y > hz + 5) continue;
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.85 * fl; c.drawImage(warm, l.x - sz * 3, l.y - sz * 3, sz * 6, sz * 6); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
          var g = c.createLinearGradient(0, l.y - sz * 0.6, 0, l.y + sz * 0.6); g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.5, '#ffb04d'); g.addColorStop(1, '#d9602a');
          c.fillStyle = g; c.beginPath(); c.moveTo(l.x - sz * 0.5, l.y - sz * 0.6); c.lineTo(l.x + sz * 0.5, l.y - sz * 0.6); c.lineTo(l.x + sz * 0.38, l.y + sz * 0.6); c.lineTo(l.x - sz * 0.38, l.y + sz * 0.6); c.fill();
          c.fillStyle = 'rgba(80,30,10,0.55)'; c.fillRect(l.x - sz * 0.5, l.y - sz * 0.62, sz, sz * 0.1); c.fillRect(l.x - sz * 0.38, l.y + sz * 0.52, sz * 0.76, sz * 0.1);
        }
      }
    });
  }
});

S({
  file: 'Летнее небо', cat: 'Аниме', mouse: true, tags: ['аниме', 'облака', 'небо', 'шейдер'],
  desc: 'Яркое летнее небо с огромными кучевыми облаками, как в полнометражных аниме.',
  run: function () {
    LW.run({
      type: 'gl', fps: 30, glScale: 0.6, mouse: true,
      frag: [
        'float cl(vec2 p,float t,float sc,float cov){ vec2 q=p*sc+vec2(t,0.); float d=fbm(q)*1.05+.3*fbm(q*2.3+4.); return smoothstep(cov,cov+.28,d); }',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/R; vec2 p=(gl_FragCoord.xy-.5*R)/R.y; vec2 par=(M.xy-.5);',
        ' vec3 top=vec3(.05,.28,.78), mid=vec3(.25,.58,.95), low=vec3(.72,.9,1.);',
        ' vec3 col=mix(low,mid,smoothstep(.0,.5,uv.y)); col=mix(col,top,smoothstep(.45,1.,uv.y));',
        ' vec2 sunp=vec2(-.45,.18); col+=vec3(1.,.9,.6)*exp(-length(p-sunp)*3.2)*.45;',
        ' for(int L=0;L<3;L++){',
        '  float fl=float(L); float sc=1.1+fl*.55; float sp=.008+fl*.006;',
        '  vec2 pp=p+par*(.03+.03*fl); pp.y+=.18-fl*.16;',
        '  float d=cl(pp*vec2(1.,1.6+fl*.5),T*sp,sc,.6-fl*.02);',
        '  float d2=cl((pp+normalize(sunp-pp)*.045)*vec2(1.,1.6+fl*.5),T*sp,sc,.6-fl*.02);',
        '  float lit=clamp(1.-(d2-d)*2.6,0.,1.); lit=mix(lit,1.,.25);',
        '  vec3 sh=vec3(.56,.66,.88)-vec3(.0,.0,.0)*fl; vec3 hi=mix(vec3(1.,.97,.92),vec3(1.,.93,.82),smoothstep(.0,.5,length(p-sunp)*.5));',
        '  vec3 cc=mix(sh,hi,lit); cc=mix(cc,col*1.05,fl*.18);',
        '  float vis=d*smoothstep(-.35,.12,pp.y+.1+fl*.1);',
        '  col=mix(col,cc,clamp(vis,0.,1.)*(1.-fl*.12));',
        ' }',
        ' float hz=smoothstep(.25,.0,uv.y); col=mix(col,vec3(.85,.95,1.),hz*.5);',
        ' col=pow(col,vec3(.96)); col*=1.-.18*dot(uv-.5,uv-.5);',
        ' gl_FragColor=vec4(col,1.);',
        '}'
      ].join('\n')
    });
  }
});

S({
  file: 'Звёздный поезд', cat: 'Аниме', tags: ['аниме', 'поезд', 'вода', 'ночь'],
  desc: 'Одинокий поезд идёт по воде под звёздами — тихая сказочная атмосфера.',
  run: function () {
    var W, H, bg, hz, lamps = [], rnd = LW.rng(33), warm;
    var CYC = 36;
    LW.run({
      type: '2d', fps: 30,
      init: function (c, w, h) {
        W = w; H = h; hz = h * 0.58; warm = LW.glow('255,215,140', 128);
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#04061a'); g.addColorStop(0.7, '#1c3270'); g.addColorStop(1, '#4a86b8'); x.fillStyle = g; x.fillRect(0, 0, w, hz);
          var r = LW.rng(3); for (var i = 0; i < 420; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.8) + ')'; x.fillRect(r() * w, r() * hz * 0.95, r() < 0.07 ? 2 : 1, r() < 0.07 ? 2 : 1); }
          x.filter = 'blur(' + Math.round(h * 0.01) + 'px)'; x.fillStyle = 'rgba(200,225,255,0.22)';
          for (var k = 0; k < 20; k++) { x.beginPath(); x.ellipse(r() * w, hz * (0.45 + r() * 0.5), w * (0.08 + r() * 0.15), h * (0.01 + r() * 0.02), 0, 0, 7); x.fill(); }
          x.filter = 'none';
          // отражение неба в воде
          x.save(); x.translate(0, hz * 2); x.scale(1, -1); x.globalAlpha = 0.9; x.drawImage(x.canvas, 0, 0, x.canvas.width, hz * LW.s, 0, 0, w, hz); x.restore();
          x.fillStyle = 'rgba(8,24,60,0.35)'; x.fillRect(0, hz, w, h - hz);
          // рельс на воде
          x.fillStyle = '#0a0c1c'; x.fillRect(0, hz + 4, w, 4);
          for (var s = 0; s < w; s += 40) x.fillRect(s, hz + 8, 5, h * 0.025);
        });
        lamps = []; for (var i = 0; i < 7; i++) lamps.push(w * (0.05 + i * 0.16));
      },
      frame: function (c, t) {
        c.drawImage(bg, 0, 0, W, H);
        // рябь на воде
        c.fillStyle = 'rgba(180,210,255,0.07)';
        for (var y = hz + 14, k = 0; y < H; k++) { var d = (y - hz) / (H - hz); c.fillRect(((k * 97 + t * (4 + d * 14)) % (W + 200)) - 100, y, W * 0.08 * (0.4 + d), Math.max(1, d * 2)); y += 3 + d * 8; }
        // фонари на рельсе
        c.globalCompositeOperation = 'lighter';
        for (var l = 0; l < lamps.length; l++) { c.fillStyle = '#0a0c1c'; c.fillRect(lamps[l] - 1.5, hz - H * 0.09, 3, H * 0.1); c.globalAlpha = 0.9; c.drawImage(warm, lamps[l] - 30, hz - H * 0.09 - 30, 60, 60); c.globalAlpha = 0.25; c.drawImage(warm, lamps[l] - 20, hz + H * 0.09 - 25, 40, 50); }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        // поезд
        var ph = ((LW.cfg.demo ? t + 6 : t) % CYC) / CYC, cars = 5, cw = W * 0.16, tw = cars * cw, tx = -tw + ph * (W + tw), ty = hz - H * 0.085, th = H * 0.08;
        for (var pass = 0; pass < 2; pass++) {
          c.save(); if (pass) { c.translate(0, hz * 2 + 8); c.scale(1, -1); c.globalAlpha = 0.28; }
          for (var v = 0; v < cars; v++) {
            var vx = tx + v * cw; if (vx > W || vx + cw < 0) continue;
            c.fillStyle = '#1b1f3a'; c.fillRect(vx, ty, cw - 4, th); c.fillStyle = '#3a2a4e'; c.fillRect(vx, ty + th * 0.68, cw - 4, th * 0.12);
            c.fillStyle = '#ffe3a0'; for (var w2 = 0; w2 < 5; w2++) c.fillRect(vx + cw * 0.09 + w2 * cw * 0.17, ty + th * 0.17, cw * 0.11, th * 0.34);
            c.fillStyle = '#10122a'; c.fillRect(vx + 2, ty - th * 0.08, cw - 8, th * 0.08);
          }
          c.restore();
        }
        c.globalAlpha = 1;
        var vg = c.createLinearGradient(0, H * 0.8, 0, H); vg.addColorStop(0, 'rgba(0,0,10,0)'); vg.addColorStop(1, 'rgba(0,0,10,0.55)'); c.fillStyle = vg; c.fillRect(0, H * 0.8, W, H * 0.2);
      }
    });
  }
});
