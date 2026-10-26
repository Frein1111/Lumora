// ---------- Природа ----------
S({
  file: 'Дождь по стеклу', cat: 'Природа', mouse: true, tags: ['дождь', 'город', 'ночь', 'интерактив'],
  desc: 'Ночной город сквозь запотевшее стекло. Капли стекают сами, клик добавляет новую.',
  run: function () {
    var W, H, bg, flip, trail, tctx, drops = [], rnd = LW.rng(14), spray;
    function newDrop(x, y, big) {
      drops.push({ x: x, y: y, r: big ? 7 + rnd() * 6 : 3 + rnd() * 5, vy: 0, wait: rnd() * 3, px: x, py: y, sx: (rnd() - 0.5) * 0.4 });
    }
    LW.onClick(function (x, y) { newDrop(x, y, true); drops[drops.length - 1].wait = 0; });
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h;
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a1024'); g.addColorStop(1, '#1b1633');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          x.filter = 'blur(' + Math.round(Math.min(w, h) * 0.012) + 'px)';
          var r = LW.rng(33), cols = ['255,190,90', '255,90,110', '90,200,255', '255,255,235', '170,120,255', '120,255,200'];
          for (var i = 0; i < 90; i++) {
            var rad = 14 + r() * Math.min(w, h) * 0.06, cx = r() * w, cy = h * (0.25 + r() * 0.75);
            x.fillStyle = 'rgba(' + cols[Math.floor(r() * cols.length)] + ',' + (0.35 + r() * 0.5) + ')';
            x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
          }
          x.filter = 'none';
          // тёмные силуэты зданий
          x.fillStyle = 'rgba(5,7,18,0.75)';
          for (var b = 0; b < 14; b++) { var bw = w / 14, bh = h * (0.12 + r() * 0.3); x.fillRect(b * bw + 2, h * 0.7 - bh + h * 0.3, bw - 4, bh + 5); }
          x.fillStyle = 'rgba(210,220,255,0.06)'; x.fillRect(0, 0, w, h);
        });
        flip = LW.layer(w, h, function (x) { x.translate(w, h); x.rotate(Math.PI); x.drawImage(bg, 0, 0, w, h); });
        trail = document.createElement('canvas'); trail.width = Math.round(w * LW.s); trail.height = Math.round(h * LW.s);
        tctx = trail.getContext('2d'); tctx.scale(LW.s, LW.s);
        spray = LW.layer(w, h, function (x) {
          var r = LW.rng(77);
          for (var i = 0; i < 900; i++) {
            var px = r() * w, py = r() * h, pr = 0.8 + r() * r() * 4.5;
            x.fillStyle = 'rgba(255,255,255,0.05)'; x.beginPath(); x.arc(px, py, pr, 0, 7); x.fill();
            x.strokeStyle = 'rgba(255,255,255,0.16)'; x.lineWidth = 0.7; x.beginPath(); x.arc(px, py, pr, 0.2, 2.4); x.stroke();
            x.fillStyle = 'rgba(255,255,255,0.45)'; x.beginPath(); x.arc(px - pr * 0.35, py - pr * 0.4, Math.max(0.4, pr * 0.22), 0, 7); x.fill();
          }
        });
        drops = []; for (var i = 0; i < 14; i++) newDrop(rnd() * w, rnd() * h * 0.8, rnd() < 0.5);
      },
      frame: function (c, t, dt) {
        c.drawImage(bg, 0, 0, W, H);
        c.drawImage(spray, 0, 0, W, H);
        tctx.globalCompositeOperation = 'destination-out'; tctx.fillStyle = 'rgba(0,0,0,0.035)'; tctx.fillRect(0, 0, W, H);
        tctx.globalCompositeOperation = 'source-over';
        if (rnd() < 0.05) newDrop(rnd() * W, rnd() * H * 0.5, rnd() < 0.6);
        for (var i = drops.length - 1; i >= 0; i--) {
          var d = drops[i];
          d.wait -= dt;
          if (d.wait <= 0) {
            d.vy += (60 + d.r * 14) * dt * (0.4 + rnd());
            if (rnd() < 0.08) d.vy *= 0.2;
            d.px = d.x; d.py = d.y;
            d.y += d.vy * dt; d.x += d.sx * d.vy * dt * 0.1;
            if (d.vy > 12) {
              tctx.strokeStyle = 'rgba(255,255,255,0.07)'; tctx.lineWidth = d.r * 0.9; tctx.lineCap = 'round';
              tctx.beginPath(); tctx.moveTo(d.px, d.py); tctx.lineTo(d.x, d.y); tctx.stroke();
            }
            d.r -= dt * 0.12; if (d.vy > 10 && rnd() < 0.3) d.vy *= 0.75;
          }
          if (d.y > H + 20 || d.r < 2.2) { drops.splice(i, 1); if (drops.length < 26) newDrop(rnd() * W, -10, rnd() < 0.5); }
        }
        c.drawImage(trail, 0, 0, W, H);
        for (var k = 0; k < drops.length; k++) {
          var q = drops[k], r = q.r;
          c.save(); c.beginPath(); c.ellipse(q.x, q.y, r * 0.85, r * 1.1, 0, 0, 7); c.clip();
          c.drawImage(flip, q.x - r * 3, q.y - r * 3, r * 6, r * 6, q.x - r, q.y - r * 1.2, r * 2, r * 2.4);
          c.fillStyle = 'rgba(190,210,255,0.14)'; c.beginPath(); c.ellipse(q.x, q.y, r * 0.85, r * 1.1, 0, 0, 7); c.fill();
          c.restore();
          c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1; c.beginPath(); c.ellipse(q.x, q.y, r * 0.85, r * 1.1, 0, 0.3, 2.6); c.stroke();
          c.strokeStyle = 'rgba(0,0,20,0.35)'; c.beginPath(); c.ellipse(q.x, q.y, r * 0.85, r * 1.1, 0, 3.4, 5.7); c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(q.x - r * 0.3, q.y - r * 0.45, Math.max(0.8, r * 0.17), 0, 7); c.fill();
        }
      }
    });
  }
});

S({
  file: 'Туманный лес', cat: 'Природа', mouse: true, tags: ['лес', 'туман', 'рассвет'],
  desc: 'Слои хвойного леса в утреннем тумане, лучи солнца. Слои двигаются вслед за курсором.',
  run: function () {
    var W, H, sky, layers = [], fogs = [], rnd = LW.rng(6), blob;
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; layers = []; fogs = [];
        sky = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9fb7c8'); g.addColorStop(0.55, '#e6dfcf'); g.addColorStop(1, '#f4d9b4');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var sg = x.createRadialGradient(w * 0.7, h * 0.28, 0, w * 0.7, h * 0.28, w * 0.45);
          sg.addColorStop(0, 'rgba(255,248,220,0.95)'); sg.addColorStop(0.25, 'rgba(255,232,185,0.45)'); sg.addColorStop(1, 'rgba(255,232,185,0)');
          x.fillStyle = sg; x.fillRect(0, 0, w, h);
        });
        blob = LW.glow('255,255,255', 256);
        var tints = [[184, 198, 205], [150, 170, 180], [118, 142, 150], [84, 110, 118], [52, 76, 84], [26, 44, 52]];
        for (var L = 0; L < 6; L++) {
          (function (L) {
            var depth = L / 5, base = h * (0.42 + depth * 0.5), size = h * (0.06 + depth * 0.2), r = LW.rng(100 + L);
            var img = LW.layer(w * 1.12, h, function (x) {
              x.fillStyle = LW.rgb(tints[L]);
              x.beginPath(); x.moveTo(0, h);
              x.lineTo(0, base);
              var ground = base + size * 0.3;
              x.lineTo(w * 1.12, ground); x.lineTo(w * 1.12, h); x.fill();
              var n = Math.round(14 + depth * 22);
              for (var i = 0; i < n; i++) {
                var tx = (i + r() * 0.8) / n * w * 1.12, th = size * (0.9 + r() * 1.6), tw = th * (0.2 + r() * 0.08), ty = ground + size * 0.1;
                x.beginPath();
                var tiers = 6 + Math.floor(r() * 3);
                x.moveTo(tx, ty - th);
                for (var k = 1; k <= tiers; k++) { var f = k / tiers, yy = ty - th + th * f; x.lineTo(tx + tw * f * (1 + 0.15 * (k % 2)), yy); x.lineTo(tx + tw * f * 0.55, yy); }
                x.lineTo(tx + tw * 0.08, ty + 4); x.lineTo(tx - tw * 0.08, ty + 4);
                for (var k2 = tiers; k2 >= 1; k2--) { var f2 = k2 / tiers, y2 = ty - th + th * f2; x.lineTo(tx - tw * f2 * 0.55, y2); x.lineTo(tx - tw * f2 * (1 + 0.15 * (k2 % 2)), y2); }
                x.closePath(); x.fill();
              }
            });
            layers.push({ img: img, depth: depth, base: base });
          })(L);
        }
        for (var i = 0; i < 14; i++) fogs.push({ x: rnd() * w, y: h * (0.35 + rnd() * 0.55), s: w * (0.35 + rnd() * 0.4), v: 4 + rnd() * 10, a: 0.1 + rnd() * 0.16 });
      },
      frame: function (c, t) {
        c.drawImage(sky, 0, 0, W, H);
        var mx = (LW.M.ax / W - 0.5);
        // лучи
        c.globalCompositeOperation = 'lighter';
        var sx0 = W * 0.7, sy0 = H * 0.28, RL = Math.max(W, H) * 1.3;
        for (var r = 0; r < 7; r++) {
          var th = 1.75 + r * 0.14 + Math.sin(t * 0.15 + r) * 0.03, dl = 0.03 + 0.02 * (r % 3);
          var a = 0.05 + 0.04 * Math.sin(t * 0.4 + r * 1.7);
          var ex = sx0 + Math.cos(th) * RL, ey = sy0 + Math.sin(th) * RL;
          var g = c.createLinearGradient(sx0, sy0, ex, ey);
          g.addColorStop(0, 'rgba(255,240,200,' + a * 2 + ')'); g.addColorStop(1, 'rgba(255,240,200,0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(sx0, sy0);
          c.lineTo(sx0 + Math.cos(th - dl) * RL, sy0 + Math.sin(th - dl) * RL); c.lineTo(sx0 + Math.cos(th + dl) * RL, sy0 + Math.sin(th + dl) * RL); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
        for (var L = 0; L < layers.length; L++) {
          var ly = layers[L];
          c.drawImage(ly.img, -W * 0.06 - mx * W * 0.05 * (0.3 + ly.depth), 0, W * 1.12, H);
          // туман между слоями
          var fg = c.createLinearGradient(0, ly.base - H * 0.15, 0, ly.base + H * 0.25);
          fg.addColorStop(0, 'rgba(235,232,224,0)'); fg.addColorStop(1, 'rgba(235,232,224,' + (0.55 - ly.depth * 0.35) + ')');
          c.fillStyle = fg; c.fillRect(0, ly.base - H * 0.15, W, H * 0.45);
          for (var f = L; f < fogs.length; f += 6) {
            var fo = fogs[f]; fo.x += fo.v * 0.033 * (1 + ly.depth); if (fo.x - fo.s > W) fo.x = -fo.s;
            c.globalAlpha = fo.a * (1 - ly.depth * 0.5);
            c.drawImage(blob, fo.x - fo.s, ly.base - fo.s * 0.25, fo.s * 2, fo.s * 0.5);
          }
          c.globalAlpha = 1;
        }
      }
    });
  }
});

S({
  file: 'Закат над океаном', cat: 'Природа', tags: ['море', 'закат'],
  desc: 'Тёплый закат, солнечная дорожка на воде и далёкий парусник.',
  run: function () {
    var W, H, sky, hz, rnd = LW.rng(19), clouds = [], sun;
    LW.run({
      type: '2d', fps: 30,
      init: function (c, w, h) {
        W = w; H = h; hz = h * 0.56;
        sun = LW.glow('255,190,110', 512);
        sky = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#1d1a4a'); g.addColorStop(0.45, '#7b3d7a'); g.addColorStop(0.8, '#ff7a4d'); g.addColorStop(1, '#ffd08a');
          x.fillStyle = g; x.fillRect(0, 0, w, hz);
          var r = LW.rng(91);
          for (var i = 0; i < 26; i++) {
            var cx = r() * w, cy = hz * (0.15 + r() * 0.7), cw = w * (0.12 + r() * 0.3), ch = 5 + r() * 16;
            var cg = x.createRadialGradient(cx, cy, 0, cx, cy, cw);
            cg.addColorStop(0, 'rgba(255,170,130,' + (0.25 + r() * 0.3) + ')'); cg.addColorStop(1, 'rgba(255,150,120,0)');
            x.save(); x.translate(cx, cy); x.scale(1, ch / cw); x.translate(-cx, -cy); x.fillStyle = cg; x.beginPath(); x.arc(cx, cy, cw, 0, 7); x.fill(); x.restore();
          }
          var sg = x.createLinearGradient(0, hz, 0, h); sg.addColorStop(0, '#ff9a5a'); sg.addColorStop(0.12, '#a24a5f'); sg.addColorStop(0.5, '#2b2a5e'); sg.addColorStop(1, '#0d1030');
          x.fillStyle = sg; x.fillRect(0, hz, w, h - hz);
        });
      },
      frame: function (c, t) {
        c.drawImage(sky, 0, 0, W, H);
        var sx = W * 0.5, sy = hz - H * 0.015;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.9; c.drawImage(sun, sx - H * 0.5, sy - H * 0.5, H, H); c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#fff1c9'; c.beginPath(); c.arc(sx, sy, H * 0.055, Math.PI, 0); c.fill();
        // волны и блики
        for (var y = hz + 2, row = 0; y < H; row++) {
          var d = (y - hz) / (H - hz), step = 1.5 + d * 9;
          var off = Math.sin(t * 0.9 + row * 0.7) * (1 + d * 8);
          var glintW = W * (0.04 + d * 0.22);
          for (var k = 0; k < 6; k++) {
            var h1 = Math.sin(row * 12.9898 + k * 78.233 + Math.floor(t * 0.8 + k) * 3.7) * 43758.5453; h1 -= Math.floor(h1);
            var gx = sx + (h1 - 0.5) * glintW * 2 + off, gl = (4 + h1 * 38) * (0.4 + d * 1.2);
            var fall = 1 - Math.abs(h1 - 0.5) * 2;
            c.fillStyle = 'rgba(255,' + Math.round(200 - d * 60) + ',' + Math.round(130 - d * 40) + ',' + (0.75 * fall * (1 - d * 0.55)) + ')';
            c.fillRect(gx - gl / 2, y, gl, Math.max(1, step * 0.45));
          }
          c.fillStyle = 'rgba(10,10,40,' + (0.05 + 0.08 * Math.abs(Math.sin(row * 0.37 + t * 0.5))) + ')';
          c.fillRect(0, y + step * 0.5, W, Math.max(1, step * 0.25));
          y += step;
        }
        // парусник
        var bx = W * 0.2 + (t * 3) % (W * 0.7) * 0.1, by = hz + 6 + Math.sin(t * 1.2) * 1.5;
        c.fillStyle = '#1a1230';
        c.beginPath(); c.moveTo(bx - 16, by); c.lineTo(bx + 16, by); c.lineTo(bx + 11, by + 5); c.lineTo(bx - 11, by + 5); c.fill();
        c.beginPath(); c.moveTo(bx, by - 2); c.lineTo(bx, by - 34); c.lineTo(bx + 15, by - 2); c.fill();
        c.beginPath(); c.moveTo(bx - 2, by - 2); c.lineTo(bx - 2, by - 26); c.lineTo(bx - 13, by - 2); c.fill();
      }
    });
  }
});

S({
  file: 'Горы — сутки', cat: 'Природа', clock: true, tags: ['горы', 'время суток', 'часы'],
  desc: 'Небо меняется вместе с реальным временем: рассвет, день, закат, ночь со звёздами и луной.',
  run: function () {
    var W, H, ridges = [], stars = [], rnd = LW.rng(2), sunG, moonG;
    // ключевые цвета неба по часам: [час, верх, низ, горы-тон]
    var K = [
      [0, [6, 9, 28], [16, 22, 56], 0], [4.5, [10, 14, 40], [36, 38, 84], 0.05], [6, [58, 58, 130], [255, 150, 100], 0.3], [8, [70, 140, 220], [190, 225, 250], 0.7],
      [12, [50, 125, 225], [175, 220, 250], 1], [16, [60, 130, 220], [200, 225, 245], 0.85], [18.5, [70, 70, 150], [255, 140, 80], 0.4], [20, [28, 24, 70], [110, 60, 100], 0.12], [22, [8, 12, 34], [22, 28, 62], 0], [24, [6, 9, 28], [16, 22, 56], 0]
    ];
    function sample(h) {
      for (var i = 0; i < K.length - 1; i++) if (h >= K[i][0] && h <= K[i + 1][0]) {
        var f = (h - K[i][0]) / (K[i + 1][0] - K[i][0]);
        return { top: LW.mix(K[i][1], K[i + 1][1], f), bot: LW.mix(K[i][2], K[i + 1][2], f), day: LW.lerp(K[i][3], K[i + 1][3], f) };
      }
      return { top: K[0][1], bot: K[0][2], day: 0 };
    }
    LW.run({
      type: '2d', fps: 12, clock: true,
      init: function (c, w, h) {
        W = w; H = h; ridges = []; stars = [];
        for (var L = 0; L < 4; L++) {
          var pts = [], r = LW.rng(40 + L);
          for (var x = 0; x <= w + 8; x += 8) {
            var n = LW.fbm(x / w * (2.2 + L * 0.7) + L * 9.1, L * 3.3, 5);
            pts.push(h * (0.48 + L * 0.1) - (n + 0.35) * h * (0.36 - L * 0.05));
          }
          ridges.push(pts);
        }
        for (var i = 0; i < 220; i++) stars.push({ x: rnd() * w, y: rnd() * h * 0.6, a: rnd(), s: 1 + rnd() * 1.4 });
        sunG = LW.glow('255,220,150', 512); moonG = LW.glow('200,215,255', 256);
      },
      frame: function (c, t) {
        var hf = LW.cfg.demo ? 17.4 : LW.clock.hf, s = sample(hf);
        var g = c.createLinearGradient(0, 0, 0, H * 0.7); g.addColorStop(0, LW.rgb(s.top)); g.addColorStop(1, LW.rgb(s.bot));
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        var night = 1 - LW.clamp(s.day * 4, 0, 1);
        if (night > 0.02) for (var i = 0; i < stars.length; i++) {
          var st = stars[i]; c.fillStyle = 'rgba(255,255,255,' + (night * (0.3 + 0.7 * Math.abs(Math.sin(t * 0.6 + st.a * 30)))) + ')'; c.fillRect(st.x, st.y, st.s, st.s);
        }
        // солнце (6..20) и луна (20..6)
        var sp = (hf - 6) / 14, mp = ((hf + 4) % 24) / 14;
        c.globalCompositeOperation = 'lighter';
        if (sp >= -0.05 && sp <= 1.05) {
          var sx = W * (0.08 + sp * 0.84), sy = H * 0.62 - Math.sin(Math.PI * LW.clamp(sp, 0, 1)) * H * 0.5;
          c.globalAlpha = 0.9; c.drawImage(sunG, sx - H * 0.45, sy - H * 0.45, H * 0.9, H * 0.9); c.globalAlpha = 1;
          c.fillStyle = '#fff6d8'; c.beginPath(); c.arc(sx, sy, H * 0.04, 0, 7); c.fill();
        }
        if (mp >= 0 && mp <= 1) {
          var mx = W * (0.08 + mp * 0.84), my = H * 0.62 - Math.sin(Math.PI * mp) * H * 0.48;
          c.globalAlpha = 0.5; c.drawImage(moonG, mx - H * 0.22, my - H * 0.22, H * 0.44, H * 0.44); c.globalAlpha = 1;
          c.fillStyle = '#eef2ff'; c.beginPath(); c.arc(mx, my, H * 0.028, 0, 7); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
        // горы: чем дальше, тем ближе к цвету неба
        for (var L = 0; L < ridges.length; L++) {
          var depth = 1 - L / 3, base = LW.mix([14, 18, 34], [78, 98, 120], s.day);
          var warm = LW.mix(base, [150, 90, 80], Math.max(0, 1 - Math.abs(s.day - 0.35) * 3) * 0.5);
          var col = LW.mix(warm, s.bot, depth * 0.62);
          c.fillStyle = LW.rgb(col); c.beginPath(); c.moveTo(0, H);
          var pts = ridges[L];
          for (var k = 0; k < pts.length; k++) c.lineTo(k * 8, pts[k]);
          c.lineTo(W, H); c.fill();
        }
        // озеро-отражение у подножия
        var wg = c.createLinearGradient(0, H * 0.86, 0, H); wg.addColorStop(0, LW.rgb(s.bot, 0.0)); wg.addColorStop(1, LW.rgb(s.top, 0.55));
        c.fillStyle = wg; c.fillRect(0, H * 0.86, W, H * 0.14);
      }
    });
  }
});

S({
  file: 'Светлячки', cat: 'Природа', mouse: true, tags: ['лес', 'ночь', 'интерактив'],
  desc: 'Летний лес ночью. Светлячки тянутся к курсору.',
  run: function () {
    var W, H, bg, grass, flies = [], rnd = LW.rng(8), glowG, glowY, blades = [];
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; flies = []; blades = [];
        glowG = LW.glow('190,255,120', 64); glowY = LW.glow('255,240,150', 64);
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#071a22'); g.addColorStop(0.6, '#0b2a2e'); g.addColorStop(1, '#06150f');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var mg = x.createRadialGradient(w * 0.78, h * 0.18, 0, w * 0.78, h * 0.18, w * 0.4);
          mg.addColorStop(0, 'rgba(190,230,255,0.4)'); mg.addColorStop(1, 'rgba(190,230,255,0)'); x.fillStyle = mg; x.fillRect(0, 0, w, h);
          x.fillStyle = '#e9f4ff'; x.beginPath(); x.arc(w * 0.78, h * 0.18, h * 0.045, 0, 7); x.fill();
          var r = LW.rng(12);
          for (var L = 0; L < 3; L++) {
            x.fillStyle = ['rgba(10,40,44,0.55)', 'rgba(7,28,32,0.8)', 'rgba(3,14,14,1)'][L];
            var n = 5 + L * 2;
            for (var i = 0; i < n; i++) {
              var tx = (i + r() * 0.8) / n * w, tw = w * (0.008 + r() * 0.014) * (1 + L * 0.6);
              x.beginPath(); x.moveTo(tx - tw * 0.3, h * (0.9 + L * 0.06)); x.lineTo(tx + tw * 0.2, 0); x.lineTo(tx + tw * 0.8, 0); x.lineTo(tx + tw * 1.3, h * (0.9 + L * 0.06)); x.fill();
              for (var br = 0; br < 4; br++) {
                var by0 = h * (0.08 + r() * 0.5), dir = r() < 0.5 ? -1 : 1, bl = w * (0.03 + r() * 0.06);
                x.lineWidth = tw * (0.3 + r() * 0.2); x.strokeStyle = x.fillStyle; x.lineCap = 'round';
                x.beginPath(); x.moveTo(tx + tw / 2, by0); x.quadraticCurveTo(tx + tw / 2 + dir * bl * 0.5, by0 - bl * 0.1, tx + tw / 2 + dir * bl, by0 - bl * 0.45); x.stroke();
              }
            }
          }
        });
        for (var i = 0; i < 70; i++) flies.push({ x: rnd() * w, y: h * (0.3 + rnd() * 0.65), ph: rnd() * 6.28, sp: 0.4 + rnd() * 0.8, z: rnd(), y2: rnd() * 100, c: rnd() < 0.7 });
        for (var b = 0; b < 260; b++) blades.push({ x: rnd() * w, h: h * (0.04 + rnd() * 0.12), p: rnd() * 6.28, w: 1.5 + rnd() * 2, d: rnd() });
      },
      frame: function (c, t, dt) {
        c.drawImage(bg, 0, 0, W, H);
        c.globalCompositeOperation = 'lighter';
        var mx = LW.M.ax, my = LW.M.ay, near = !LW.M.w || LW.M.w < 0.5;
        for (var i = 0; i < flies.length; i++) {
          var f = flies[i];
          var a = LW.noise(f.x * 0.004 + t * 0.12 * f.sp, f.y2) * Math.PI * 4;
          f.x += Math.cos(a) * 28 * f.sp * dt; f.y += Math.sin(a) * 22 * f.sp * dt - 2 * dt;
          if (near) {
            var dx = mx - f.x, dy = my - f.y, d = Math.hypot(dx, dy);
            if (d < 360 && d > 30) { f.x += dx / d * 70 * dt * (1 - d / 360); f.y += dy / d * 70 * dt * (1 - d / 360); }
          }
          if (f.x < -20) f.x = W + 20; if (f.x > W + 20) f.x = -20; if (f.y < H * 0.2) f.y = H * 0.95; if (f.y > H) f.y = H * 0.3;
          var bl = Math.pow(0.5 + 0.5 * Math.sin(t * (1.1 + f.sp) + f.ph), 2);
          var sz = (28 + f.z * 40) * (0.5 + bl * 0.7);
          c.globalAlpha = 0.25 + bl * 0.75; c.drawImage(f.c ? glowG : glowY, f.x - sz / 2, f.y - sz / 2, sz, sz);
          c.globalAlpha = bl; c.fillStyle = '#fffbd0'; c.fillRect(f.x - 1, f.y - 1, 2, 2);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        // трава
        c.lineCap = 'round';
        for (var b = 0; b < blades.length; b++) {
          var bl2 = blades[b], sw = Math.sin(t * (0.8 + bl2.d) + bl2.p) * bl2.h * 0.25 + (mx / W - 0.5) * bl2.h * 0.4;
          c.strokeStyle = 'rgb(' + Math.round(4 + bl2.d * 10) + ',' + Math.round(16 + bl2.d * 26) + ',' + Math.round(12 + bl2.d * 10) + ')';
          c.lineWidth = bl2.w; c.beginPath(); c.moveTo(bl2.x, H + 4); c.quadraticCurveTo(bl2.x + sw * 0.3, H - bl2.h * 0.5, bl2.x + sw, H - bl2.h); c.stroke();
        }
      }
    });
  }
});

S({
  file: 'Снегопад у хижины', cat: 'Природа', mouse: true, tags: ['зима', 'ночь', 'уют'],
  desc: 'Тёплая хижина в заснеженном лесу. Курсор «дует» ветром и сносит снег.',
  run: function () {
    var W, H, bg, flakes = [], smoke = [], rnd = LW.rng(4), warm, wind = 0;
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; flakes = []; smoke = [];
        warm = LW.glow('255,190,90', 256);
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#070b24'); g.addColorStop(0.55, '#1a2a5a'); g.addColorStop(1, '#3a4f86');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var r = LW.rng(5);
          for (var i = 0; i < 160; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.6) + ')'; x.fillRect(r() * w, r() * h * 0.55, 1.3, 1.3); }
          x.fillStyle = '#f4f2e8'; x.beginPath(); x.arc(w * 0.2, h * 0.2, h * 0.05, 0, 7); x.fill();
          var mg = x.createRadialGradient(w * 0.2, h * 0.2, 0, w * 0.2, h * 0.2, h * 0.3); mg.addColorStop(0, 'rgba(210,225,255,0.3)'); mg.addColorStop(1, 'rgba(210,225,255,0)'); x.fillStyle = mg; x.fillRect(0, 0, w, h);
          function pine(px, py, ph, col, snow) {
            var tiers = 7, tw = ph * 0.32; x.fillStyle = col; x.beginPath(); x.moveTo(px, py - ph);
            for (var k = 1; k <= tiers; k++) { var f = k / tiers, yy = py - ph + ph * f * 0.95; x.lineTo(px + tw * f, yy); x.lineTo(px + tw * f * 0.5, yy - ph * 0.01); }
            x.lineTo(px, py); for (var k2 = tiers; k2 >= 1; k2--) { var f2 = k2 / tiers, y2 = py - ph + ph * f2 * 0.95; x.lineTo(px - tw * f2 * 0.5, y2 - ph * 0.01); x.lineTo(px - tw * f2, y2); }
            x.closePath(); x.fill();
            if (snow) { x.fillStyle = 'rgba(235,240,255,0.5)'; for (var k3 = 1; k3 <= tiers; k3++) { var f3 = k3 / tiers; x.fillRect(px - tw * f3 * 0.8, py - ph + ph * f3 * 0.95 - 2, tw * f3 * 1.6, 3); } }
          }
          for (var L = 0; L < 2; L++) for (var p = 0; p < 12; p++) pine((p + r() * 0.7) / 12 * w, h * (0.7 + L * 0.04), h * (0.14 + L * 0.1) * (0.8 + r() * 0.5), L ? '#0d1a38' : '#17274e', true);
          // сугробы
          var sg = x.createLinearGradient(0, h * 0.7, 0, h); sg.addColorStop(0, '#c9d4f0'); sg.addColorStop(1, '#7c8dbf');
          x.fillStyle = sg; x.beginPath(); x.moveTo(0, h);
          for (var px = 0; px <= w; px += 10) x.lineTo(px, h * 0.76 + Math.sin(px / w * 5) * h * 0.015 + LW.noise(px / 240, 3) * h * 0.02);
          x.lineTo(w, h); x.fill();
          // хижина
          var hx = w * 0.62, hy = h * 0.8, hw = w * 0.2, hh = h * 0.13;
          x.fillStyle = '#2b1a14'; x.fillRect(hx, hy - hh, hw, hh);
          x.fillStyle = 'rgba(0,0,0,0.25)'; for (var l = 1; l < 6; l++) x.fillRect(hx, hy - hh + l * hh / 6, hw, 2);
          x.fillStyle = '#1b1012'; x.beginPath(); x.moveTo(hx - hw * 0.08, hy - hh); x.lineTo(hx + hw / 2, hy - hh - hh * 0.65); x.lineTo(hx + hw * 1.08, hy - hh); x.fill();
          x.fillStyle = '#eef3ff'; x.beginPath(); x.moveTo(hx - hw * 0.1, hy - hh + 3); x.lineTo(hx + hw / 2, hy - hh - hh * 0.7); x.lineTo(hx + hw * 1.1, hy - hh + 3);
          x.lineTo(hx + hw * 1.02, hy - hh - 4); x.lineTo(hx + hw / 2, hy - hh - hh * 0.55); x.lineTo(hx - hw * 0.02, hy - hh - 4); x.fill();
          x.fillStyle = '#3a2418'; x.fillRect(hx + hw * 0.72, hy - hh - hh * 0.78, hw * 0.1, hh * 0.45);
          x.fillStyle = '#ffd27a'; x.fillRect(hx + hw * 0.12, hy - hh * 0.72, hw * 0.24, hh * 0.38); x.fillRect(hx + hw * 0.62, hy - hh * 0.72, hw * 0.2, hh * 0.38);
          x.fillStyle = '#4a2c1a'; x.fillRect(hx + hw * 0.42, hy - hh * 0.62, hw * 0.14, hh * 0.62);
          x.fillStyle = '#3a2418'; x.fillRect(hx + hw * 0.24 - 1, hy - hh * 0.72, 2, hh * 0.38); x.fillRect(hx + hw * 0.72 - 1, hy - hh * 0.72, 2, hh * 0.38);
        });
        for (var i = 0; i < 320; i++) flakes.push({ x: rnd() * w, y: rnd() * h, z: rnd(), p: rnd() * 6.28 });
      },
      frame: function (c, t, dt) {
        c.drawImage(bg, 0, 0, W, H);
        var hx = W * 0.62, hy = H * 0.8, hw = W * 0.2, hh = H * 0.13;
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 + 0.1 * Math.sin(t * 7) * Math.sin(t * 3.3);
        c.drawImage(warm, hx - hw * 0.1, hy - hh * 1.1, hw * 0.6, hw * 0.6); c.drawImage(warm, hx + hw * 0.45, hy - hh * 1.1, hw * 0.55, hw * 0.55);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        // дым из трубы
        if (rnd() < 0.25) smoke.push({ x: hx + hw * 0.77, y: hy - hh * 1.2, a: 0.35, s: 6, vx: 0, life: 0 });
        for (var i = smoke.length - 1; i >= 0; i--) {
          var s = smoke[i]; s.life += dt; s.y -= 22 * dt; s.x += (10 + wind * 40) * dt + Math.sin(t + s.y * 0.05) * 0.3; s.s += 14 * dt; s.a -= 0.08 * dt;
          if (s.a <= 0) { smoke.splice(i, 1); continue; }
          c.fillStyle = 'rgba(220,225,245,' + s.a + ')'; c.beginPath(); c.arc(s.x, s.y, s.s, 0, 7); c.fill();
        }
        var tw = (LW.M.ax / W - 0.5) * 2; wind += (tw * 1 - wind) * 0.02;
        for (var k = 0; k < flakes.length; k++) {
          var f = flakes[k], sp = 30 + f.z * 90;
          f.y += sp * dt; f.x += (Math.sin(t * 0.8 + f.p) * 14 + wind * 55 * (0.4 + f.z)) * dt;
          if (f.y > H + 6) { f.y = -6; f.x = rnd() * W; } if (f.x > W + 10) f.x = -10; if (f.x < -10) f.x = W + 10;
          c.fillStyle = 'rgba(255,255,255,' + (0.35 + f.z * 0.6) + ')'; var r = 0.9 + f.z * 2.4; c.fillRect(f.x, f.y, r, r);
        }
      }
    });
  }
});

S({
  file: 'Пруд с кувшинками', cat: 'Природа', mouse: true, tags: ['вода', 'карпы', 'интерактив'],
  desc: 'Ночной пруд: кувшинки, плывущие карпы кои и круги от капель. Клик — всплеск.',
  run: function () {
    var W, H, bg, pads = [], fish = [], rings = [], rnd = LW.rng(23), nextDrop = 0;
    function ring(x, y, big) { rings.push({ x: x, y: y, r: 2, max: big ? 160 : 70 + rnd() * 60, a: 0.6 }); }
    LW.onClick(function (x, y) { ring(x, y, true); ring(x, y, false); });
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; pads = []; fish = []; rings = [];
        bg = LW.layer(w, h, function (x) {
          var g = x.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.7); g.addColorStop(0, '#12565c'); g.addColorStop(1, '#06222c');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var r = LW.rng(2);
          for (var i = 0; i < 40; i++) {
            var cx = r() * w, cy = r() * h, rad = 60 + r() * 220, cg = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
            cg.addColorStop(0, 'rgba(120,230,220,' + (0.05 + r() * 0.06) + ')'); cg.addColorStop(1, 'rgba(120,230,220,0)'); x.fillStyle = cg; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
          }
        });
        for (var i = 0; i < 16; i++) pads.push({ x: rnd() * w, y: rnd() * h, r: Math.min(w, h) * (0.03 + rnd() * 0.05), a: rnd() * 6.28, f: rnd() < 0.3, p: rnd() * 6 });
        for (var k = 0; k < 4; k++) fish.push({ x: rnd() * w, y: rnd() * h, a: rnd() * 6.28, s: 0.7 + rnd() * 0.5, c: k % 2 ? ['#ff7a2f', '#ffe8d0'] : ['#ffffff', '#ff5a2a'], ph: rnd() * 9, seed: rnd() * 100 });
      },
      frame: function (c, t, dt) {
        c.drawImage(bg, 0, 0, W, H);
        if (t > nextDrop) { ring(rnd() * W, rnd() * H, false); nextDrop = t + 0.5 + rnd() * 1.6; }
        // рыбы
        for (var i = 0; i < fish.length; i++) {
          var f = fish[i], size = Math.min(W, H) * 0.045 * f.s;
          var tgt = LW.noise(f.seed + t * 0.05, 1.7) * Math.PI * 3;
          var da = Math.atan2(Math.sin(tgt - f.a), Math.cos(tgt - f.a)); f.a += da * 0.6 * dt;
          if (f.x < 60) f.a += (0 - f.a) * 0.05; var sp = 38 * f.s;
          f.x += Math.cos(f.a) * sp * dt; f.y += Math.sin(f.a) * sp * dt;
          if (f.x < -80) f.x = W + 80; if (f.x > W + 80) f.x = -80; if (f.y < -80) f.y = H + 80; if (f.y > H + 80) f.y = -80;
          c.save(); c.translate(f.x + 8, f.y + 14); c.rotate(f.a); c.fillStyle = 'rgba(0,10,15,0.25)'; c.beginPath(); c.ellipse(0, 0, size * 1.6, size * 0.55, 0, 0, 7); c.fill(); c.restore();
          c.save(); c.translate(f.x, f.y); c.rotate(f.a);
          var wob = Math.sin(t * 4 * f.s + f.ph);
          c.fillStyle = f.c[0]; c.beginPath(); c.moveTo(size * 1.5, 0);
          c.bezierCurveTo(size * 1.1, -size * 0.6, -size * 0.4, -size * 0.55, -size * 1.3, wob * size * 0.2);
          c.lineTo(-size * 2.1, wob * size * 0.6 - size * 0.4); c.lineTo(-size * 1.9, wob * size * 0.7); c.lineTo(-size * 2.1, wob * size * 0.6 + size * 0.5);
          c.lineTo(-size * 1.3, wob * size * 0.2);
          c.bezierCurveTo(-size * 0.4, size * 0.55, size * 1.1, size * 0.6, size * 1.5, 0); c.fill();
          c.fillStyle = f.c[1]; c.beginPath(); c.ellipse(size * 0.1, -size * 0.1, size * 0.7, size * 0.28, 0, 0, 7); c.fill();
          c.fillStyle = f.c[0]; c.beginPath(); c.ellipse(size * 0.2, -size * 0.55, size * 0.5, size * 0.18, -0.6, 0, 7); c.fill(); c.beginPath(); c.ellipse(size * 0.2, size * 0.55, size * 0.5, size * 0.18, 0.6, 0, 7); c.fill();
          c.restore();
        }
        // кувшинки
        for (var p = 0; p < pads.length; p++) {
          var pd = pads[p]; var bx = pd.x + Math.sin(t * 0.3 + pd.p) * 3, by = pd.y + Math.cos(t * 0.27 + pd.p) * 3;
          c.save(); c.translate(bx, by); c.rotate(pd.a + Math.sin(t * 0.2 + pd.p) * 0.05);
          c.fillStyle = 'rgba(0,10,10,0.3)'; c.beginPath(); c.arc(5, 8, pd.r, 0.3, 6); c.fill();
          var pg = c.createRadialGradient(-pd.r * 0.2, -pd.r * 0.2, 0, 0, 0, pd.r); pg.addColorStop(0, '#4fae5a'); pg.addColorStop(1, '#1e6a3c');
          c.fillStyle = pg; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, pd.r, 0.25, Math.PI * 2 - 0.25); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(180,255,190,0.25)'; c.lineWidth = 1; for (var v = 1; v < 5; v++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(v * 1.2 + 0.4) * pd.r * 0.9, Math.sin(v * 1.2 + 0.4) * pd.r * 0.9); c.stroke(); }
          if (pd.f) {
            for (var q = 0; q < 8; q++) {
              var pa = q / 8 * 6.283; c.save(); c.rotate(pa); c.fillStyle = q % 2 ? '#ffd1e6' : '#ff9ec9';
              c.beginPath(); c.ellipse(pd.r * 0.28, 0, pd.r * 0.26, pd.r * 0.1, 0, 0, 7); c.fill(); c.restore();
            }
            c.fillStyle = '#ffe36b'; c.beginPath(); c.arc(0, 0, pd.r * 0.1, 0, 7); c.fill();
          }
          c.restore();
        }
        // круги на воде
        c.lineWidth = 1.4;
        for (var k = rings.length - 1; k >= 0; k--) {
          var r = rings[k]; r.r += (40 + r.max * 0.3) * dt; r.a = 0.55 * (1 - r.r / r.max);
          if (r.a <= 0) { rings.splice(k, 1); continue; }
          c.strokeStyle = 'rgba(200,255,250,' + r.a + ')'; c.beginPath(); c.arc(r.x, r.y, r.r, 0, 7); c.stroke();
          c.strokeStyle = 'rgba(200,255,250,' + r.a * 0.5 + ')'; c.beginPath(); c.arc(r.x, r.y, r.r * 0.8, 0, 7); c.stroke();
        }
      }
    });
  }
});

S({
  file: 'Гроза', cat: 'Природа', mouse: true, tags: ['гроза', 'дождь', 'интерактив'],
  desc: 'Грозовые тучи, ливень и молнии. Клик вызывает удар молнии.',
  run: function () {
    var W, H, clouds, rain = [], bolts = [], flash = 0, nextBolt = 2, rnd = LW.rng(31), ground;
    function bolt(x0) {
      var pts = [], x = x0, y = -10, segs = [];
      function branch(x, y, ang, len, w, depth) {
        var pts = [[x, y]];
        for (var i = 0; i < len; i++) {
          ang += (rnd() - 0.5) * 0.8; x += Math.cos(ang) * (12 + rnd() * 16); y += Math.sin(ang) * (12 + rnd() * 16);
          pts.push([x, y]);
          if (depth < 2 && rnd() < 0.09) branch(x, y, ang + (rnd() - 0.5) * 1.5, Math.floor(len * 0.5), w * 0.55, depth + 1);
          if (y > H * 0.86) break;
        }
        segs.push({ pts: pts, w: w });
      }
      branch(x0, -10, Math.PI / 2 + (rnd() - 0.5) * 0.4, 70, 3.2, 0);
      bolts.push({ segs: segs, life: 0 }); flash = 1;
    }
    LW.onClick(function (x) { bolt(x); });
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; rain = [];
        clouds = LW.clouds(w * 1.5, h * 0.8, { res: 0.4, scale: 2.2, squash: 1.6, cover: 0.4, soft: 0.3, light: [0, -1], lit: [96, 108, 140], shade: [14, 18, 32], gain: 2.6, step: 0.02, fadeBottom: 0.25, seed: 9 });
        ground = LW.layer(w, h, function (x) {
          x.fillStyle = '#05070c'; x.beginPath(); x.moveTo(0, h);
          for (var px = 0; px <= w; px += 8) x.lineTo(px, h * 0.9 - (LW.fbm(px / w * 4, 8, 4) + 0.3) * h * 0.1);
          x.lineTo(w, h); x.fill();
          var r = LW.rng(9);
          for (var i = 0; i < 30; i++) { var tx = r() * w, th = h * (0.05 + r() * 0.08), ty = h * 0.93; x.beginPath(); x.moveTo(tx, ty - th); x.lineTo(tx + th * 0.18, ty); x.lineTo(tx - th * 0.18, ty); x.fill(); }
        });
        for (var i = 0; i < 520; i++) rain.push({ x: rnd() * w, y: rnd() * h, l: 12 + rnd() * 22, s: 700 + rnd() * 500, a: 0.1 + rnd() * 0.25 });
      },
      frame: function (c, t, dt) {
        flash = Math.max(0, flash - dt * 3.2);
        var sg0 = c.createLinearGradient(0, 0, 0, H); sg0.addColorStop(0, '#0a0e18'); sg0.addColorStop(1, '#27324b'); c.fillStyle = sg0; c.fillRect(0, 0, W, H);
        var co = (0.5 - 0.5 * Math.cos(t * 0.03)) * W * 0.5; c.drawImage(clouds, -co, 0, W * 1.5, H * 0.8);
        if (flash > 0) { c.fillStyle = 'rgba(190,205,255,' + flash * 0.55 + ')'; c.fillRect(0, 0, W, H); }
        if (t > nextBolt) { bolt(W * (0.1 + rnd() * 0.8)); nextBolt = t + 2.5 + rnd() * 5; }
        for (var b = bolts.length - 1; b >= 0; b--) {
          var bo = bolts[b]; bo.life += dt; var a = bo.life < 0.12 ? 1 : Math.max(0, 1 - (bo.life - 0.12) * 3);
          if (a <= 0) { bolts.splice(b, 1); continue; }
          c.lineCap = 'round'; c.lineJoin = 'round';
          for (var pass = 0; pass < 2; pass++) for (var s = 0; s < bo.segs.length; s++) {
            var sg = bo.segs[s]; c.strokeStyle = pass ? 'rgba(255,255,255,' + a + ')' : 'rgba(150,170,255,' + a * 0.35 + ')'; c.lineWidth = sg.w * (pass ? 1 : 4);
            c.beginPath(); c.moveTo(sg.pts[0][0], sg.pts[0][1]); for (var k = 1; k < sg.pts.length; k++) c.lineTo(sg.pts[k][0], sg.pts[k][1]); c.stroke();
          }
        }
        c.drawImage(ground, 0, 0, W, H);
        c.lineWidth = 1; var wind = 0.18 + (LW.M.ax / W - 0.5) * 0.2; c.beginPath();
        for (var i = 0; i < rain.length; i++) {
          var r = rain[i]; r.y += r.s * dt; r.x += r.s * wind * dt;
          if (r.y > H) { r.y = -r.l; r.x = rnd() * W * 1.2 - W * 0.1; }
          c.moveTo(r.x, r.y); c.lineTo(r.x - r.l * wind, r.y - r.l);
        }
        c.strokeStyle = 'rgba(175,195,235,0.32)'; c.stroke();
      }
    });
  }
});
