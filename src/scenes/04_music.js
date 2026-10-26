// ---------- Музыка: обои, реагирующие на звук ----------
S({
  file: 'Горы звука', cat: 'Музыка', audio: true, tags: ['музыка', 'спектр', '3d'],
  desc: 'Объёмный спектр в стиле Joy Division: хребты звука уходят вдаль.',
  run: function () {
    var W, H, rows = [], ROWS = 46, acc = 0, glow;
    LW.run({
      type: '2d', fps: 30, audio: true,
      init: function (c, w, h) { W = w; H = h; rows = []; for (var i = 0; i < ROWS; i++) rows.push(new Float32Array(96)); },
      frame: function (c, t, dt) {
        acc += dt;
        if (acc > 1 / 14) {
          acc = 0; var r = rows.pop();
          for (var i = 0; i < 96; i++) { var f = i / 95; r[i] = LW.bandAt(Math.pow(f, 0.9) * 0.92); }
          rows.unshift(r);
        }
        var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07041a'); g.addColorStop(1, '#1b0b36'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        var base = H * 0.9, top = H * 0.26, left = W * 0.12, right = W * 0.88;
        c.lineJoin = 'round'; c.lineWidth = 1.6;
        for (var k = ROWS - 1; k >= 0; k--) {
          var row = rows[k], f = k / (ROWS - 1), y = base - (base - top) * Math.pow(f, 0.85);
          var sc = 1 - f * 0.45, x0 = W / 2 - (W / 2 - left) * sc, x1 = W / 2 + (right - W / 2) * sc, amp = H * 0.2 * sc;
          c.beginPath(); c.moveTo(x0, y);
          for (var i = 0; i < 96; i++) {
            var px = x0 + (x1 - x0) * i / 95, edge = Math.sin(Math.PI * i / 95), v = row[i] * (0.15 + edge * 0.85);
            c.lineTo(px, y - v * amp + Math.sin(i * 0.7 + t) * 0.5);
          }
          c.lineTo(x1, y);
          c.fillStyle = '#0a0620'; c.fill();
          var hue = 275 + f * 60 - A_level() * 30;
          c.strokeStyle = LW.hsl(hue, 90, 62 + (1 - f) * 12, 0.95 - f * 0.65); c.stroke();
        }
        function A_level() { return LW.A.level; }
      }
    });
  }
});

S({
  file: 'Бит-взрыв', cat: 'Музыка', audio: true, tags: ['музыка', 'бит', 'частицы'],
  desc: 'Шар в центре пульсирует на басах, на каждый удар вылетают кольца и искры.',
  run: function () {
    var W, H, parts = [], rings = [], g1, rnd = LW.rng(3), hueBase = 200, lastBeat = 0, orb;
    LW.run({
      type: '2d', fps: 30, audio: true,
      init: function (c, w, h) { W = w; H = h; g1 = LW.glow('255,255,255', 64); orb = LW.glow('255,255,255', 512); },
      frame: function (c, t, dt) {
        var A = LW.A, cx = W / 2, cy = H / 2, R = Math.min(W, H);
        hueBase += dt * 6;
        c.fillStyle = 'rgba(5,4,16,0.5)'; c.fillRect(0, 0, W, H);
        if (A.beat > 0.95 && t - lastBeat > 0.15) {
          lastBeat = t; rings.push({ r: R * 0.12, a: 1, h: hueBase });
          for (var i = 0; i < 26; i++) { var an = rnd() * 6.283, sp = R * (0.3 + rnd() * 0.7); parts.push({ x: cx, y: cy, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, l: 1, h: hueBase + rnd() * 80, s: 14 + rnd() * 26 }); }
        }
        c.globalCompositeOperation = 'lighter';
        var rad = R * (0.12 + A.bass * 0.07 + A.beat * 0.03);
        c.globalAlpha = 0.55 + A.bass * 0.4; c.drawImage(orb, cx - rad * 3, cy - rad * 3, rad * 6, rad * 6);
        c.globalAlpha = 1;
        // кольцо из столбиков спектра
        c.lineCap = 'round'; c.lineWidth = Math.max(2, R * 0.006);
        for (var b = 0; b < 64; b++) {
          var v = LW.A.bands[b], an2 = b / 64 * 6.283 + t * 0.15, r0 = rad * 1.35, r1 = r0 + v * R * 0.16 + 3;
          c.strokeStyle = LW.hsl(hueBase + b * 3, 90, 62, 0.35 + v * 0.65);
          c.beginPath(); c.moveTo(cx + Math.cos(an2) * r0, cy + Math.sin(an2) * r0); c.lineTo(cx + Math.cos(an2) * r1, cy + Math.sin(an2) * r1); c.stroke();
        }
        c.fillStyle = LW.hsl(hueBase + 20, 80, 70, 0.95); c.beginPath(); c.arc(cx, cy, rad * 0.55, 0, 7); c.fill();
        for (var k = rings.length - 1; k >= 0; k--) {
          var rg = rings[k]; rg.r += R * 0.9 * dt; rg.a -= dt * 1.1; if (rg.a <= 0) { rings.splice(k, 1); continue; }
          c.strokeStyle = LW.hsl(rg.h, 90, 65, rg.a * 0.8); c.lineWidth = 3 + rg.a * 5; c.beginPath(); c.arc(cx, cy, rg.r, 0, 7); c.stroke();
        }
        for (var p = parts.length - 1; p >= 0; p--) {
          var q = parts[p]; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.985; q.vy *= 0.985; q.l -= dt * 0.8; if (q.l <= 0) { parts.splice(p, 1); continue; }
          c.globalAlpha = q.l; c.fillStyle = LW.hsl(q.h, 95, 65); var s = q.s * q.l; c.drawImage(g1, q.x - s, q.y - s, s * 2, s * 2);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Неоновая сетка', cat: 'Музыка', audio: true, tags: ['музыка', 'ретровейв', 'синтвейв'],
  desc: 'Ретровейв: полосатое солнце, бегущая сетка и горы из спектра звука.',
  run: function () {
    var W, H, sky, stars = [], rnd = LW.rng(9), off = 0;
    LW.run({
      type: '2d', fps: 30, audio: true,
      init: function (c, w, h) {
        W = w; H = h; stars = []; for (var i = 0; i < 120; i++) stars.push({ x: rnd() * w, y: rnd() * h * 0.5, p: rnd() * 6 });
        sky = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h * 0.6); g.addColorStop(0, '#0a0221'); g.addColorStop(0.6, '#3a0a5e'); g.addColorStop(1, '#ff3d8b');
          x.fillStyle = g; x.fillRect(0, 0, w, h * 0.6);
        });
      },
      frame: function (c, t, dt) {
        var A = LW.A, hz = H * 0.6;
        c.drawImage(sky, 0, 0, W, H);
        c.fillStyle = '#12021f'; c.fillRect(0, hz, W, H - hz);
        for (var i = 0; i < stars.length; i++) { var s = stars[i]; c.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.7 * Math.abs(Math.sin(t + s.p))) + ')'; c.fillRect(s.x, s.y, 1.5, 1.5); }
        // солнце
        var sr = H * (0.24 + A.bass * 0.03), sx = W / 2, sy = hz - sr * 0.35;
        c.save(); c.beginPath(); c.rect(0, 0, W, hz); c.clip();
        var sg = c.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, '#ffe34d'); sg.addColorStop(0.5, '#ff7a3d'); sg.addColorStop(1, '#ff2d95');
        c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, sr, 0, 7); c.fill();
        c.fillStyle = '#2a0a4a';
        for (var k = 0; k < 9; k++) { var yy = sy + sr * (-0.05 + k * 0.12), hh = sr * 0.012 * (k + 1) + 1; c.fillRect(sx - sr, yy, sr * 2, hh); }
        c.restore();
        // горы из спектра
        c.beginPath(); c.moveTo(0, hz);
        for (var b = 0; b <= 64; b++) { var px = W * b / 64, f = Math.abs(b / 64 - 0.5) * 2, v = LW.bandAt(f * 0.85); c.lineTo(px, hz - v * H * 0.22 - 4); }
        c.lineTo(W, hz); c.closePath(); c.fillStyle = '#12021f'; c.fill(); c.strokeStyle = 'rgba(0,240,255,0.9)'; c.lineWidth = 2; c.stroke();
        // сетка
        off = (off + dt * (0.35 + A.level * 1.6)) % 1;
        c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,60,200,0.85)';
        c.beginPath();
        for (var r = 0; r < 18; r++) { var z = (r + off) / 18, y = hz + Math.pow(z, 2.2) * (H - hz); c.moveTo(0, y); c.lineTo(W, y); }
        for (var v2 = -24; v2 <= 24; v2++) { c.moveTo(W / 2 + v2 * W * 0.004, hz); c.lineTo(W / 2 + v2 * W * 0.12, H); }
        c.stroke();
        var hg = c.createLinearGradient(0, hz - 6, 0, hz + H * 0.08); hg.addColorStop(0, 'rgba(255,60,200,0.7)'); hg.addColorStop(1, 'rgba(255,60,200,0)'); c.fillStyle = hg; c.fillRect(0, hz - 2, W, H * 0.08);
      }
    });
  }
});

S({
  file: 'Волны звука', cat: 'Музыка', audio: true, tags: ['музыка', 'волны', 'плавно'],
  desc: 'Переливающиеся ленты, которые колышутся в такт музыке.',
  run: function () {
    var W, H, bg;
    LW.run({
      type: '2d', fps: 30, audio: true,
      init: function (c, w, h) { W = w; H = h; },
      frame: function (c, t) {
        var A = LW.A;
        var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#060a28'); g.addColorStop(1, '#1c0a3a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
        for (var L = 0; L < 7; L++) {
          var band = LW.bandAt(L / 7 * 0.8 + 0.05), amp = H * (0.04 + band * 0.2), ph = t * (0.6 + L * 0.13), freq = 1.6 + L * 0.35;
          c.beginPath();
          for (var x = 0; x <= W; x += 12) {
            var u = x / W, env = Math.sin(Math.PI * u), y = H * 0.5 + Math.sin(u * freq * 6.283 + ph) * amp * env + Math.sin(u * 3 * 6.283 - ph * 1.7 + L) * amp * 0.4 * env + (L - 3) * H * 0.02;
            if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
          }
          var hue = 190 + L * 22 + t * 4;
          c.strokeStyle = LW.hsl(hue, 90, 60, 0.16); c.lineWidth = 14; c.stroke();
          c.strokeStyle = LW.hsl(hue, 95, 70, 0.85); c.lineWidth = 2.4; c.stroke();
        }
        c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Виниловая пластинка', cat: 'Музыка', audio: true, tags: ['музыка', 'винил', 'обложка'],
  desc: 'Вращающаяся пластинка с обложкой играющего трека, игла и название.',
  run: function () {
    var W, H, ang = 0, grooves;
    LW.run({
      type: '2d', fps: 30, audio: true,
      init: function (c, w, h) { W = w; H = h; },
      frame: function (c, t, dt) {
        var A = LW.A, T = LW.track, col = T.color;
        var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, LW.rgb(LW.mix(col, [10, 8, 18], 0.82))); g.addColorStop(1, '#0a0812'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        var R = Math.min(W, H) * 0.36, cx = W * 0.32, cy = H * 0.52;
        ang += dt * (A.active ? 2.1 : 0.5);
        // тень и диск
        c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.arc(cx + 14, cy + 18, R, 0, 7); c.fill();
        var dg = c.createRadialGradient(cx, cy, R * 0.2, cx, cy, R); dg.addColorStop(0, '#1a1a1e'); dg.addColorStop(1, '#0b0b0e');
        c.fillStyle = dg; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
        c.lineWidth = 1;
        for (var r = R * 0.42; r < R * 0.97; r += 3.2) { c.strokeStyle = 'rgba(255,255,255,' + (0.025 + 0.03 * Math.abs(Math.sin(r * 0.7))) + ')'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke(); }
        c.strokeStyle = 'rgba(255,255,255,0.08)'; for (var tr = 0; tr < 4; tr++) { c.beginPath(); c.arc(cx, cy, R * (0.5 + tr * 0.12), 0, 7); c.stroke(); }
        // блик
        c.save(); c.translate(cx, cy); c.rotate(-0.6);
        var sh = c.createLinearGradient(-R, 0, R, 0); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.09)'); sh.addColorStop(0.65, 'rgba(255,255,255,0)');
        c.fillStyle = sh; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); c.restore();
        // этикетка с обложкой (вращается)
        c.save(); c.translate(cx, cy); c.rotate(ang); c.beginPath(); c.arc(0, 0, R * 0.34, 0, 7); c.clip();
        LW.drawCover(c, -R * 0.34, -R * 0.34, R * 0.68, 0);
        c.restore();
        c.fillStyle = '#0a0a0c'; c.beginPath(); c.arc(cx, cy, R * 0.035, 0, 7); c.fill();
        // тонарм
        var px = cx + R * 1.12, py = cy - R * 0.85, ta = 2.33 + A.bass * 0.012 + Math.sin(t * 9) * 0.004 * A.level, al = R * 0.79;
        c.strokeStyle = '#c9ccd6'; c.lineWidth = Math.max(4, R * 0.022); c.lineCap = 'round';
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(ta) * al, py + Math.sin(ta) * al); c.stroke();
        c.fillStyle = '#80838f'; c.beginPath(); c.arc(px, py, R * 0.07, 0, 7); c.fill();
        c.fillStyle = '#0e0e12'; c.save(); c.translate(px + Math.cos(ta) * al, py + Math.sin(ta) * al); c.rotate(ta + 0.25); c.fillRect(-R * 0.02, -R * 0.04, R * 0.1, R * 0.08); c.restore();
        // текст
        var tx = W * 0.62, maxW = W * 0.34;
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        c.font = '600 ' + Math.round(H * 0.07) + 'px "Segoe UI", sans-serif'; c.fillStyle = '#fff';
        var title = T.has ? T.title : 'Включите музыку'; c.fillText(LW.fitText(c, title, maxW), tx, H * 0.47);
        c.font = Math.round(H * 0.038) + 'px "Segoe UI", sans-serif'; c.fillStyle = LW.rgb(col, 0.95);
        c.fillText(LW.fitText(c, T.has ? T.artist : 'Здесь появится название трека', maxW), tx, H * 0.52);
        // мини-спектр
        for (var b = 0; b < 32; b++) { var v = A.bands[b * 2], bh = 4 + v * H * 0.11, bx = tx + b * (maxW / 32); c.fillStyle = LW.rgb(col, 0.35 + v * 0.65); LW.roundRect(c, bx, H * 0.62 - bh, maxW / 32 - 4, bh, 2); c.fill(); }
      }
    });
  }
});

S({
  file: 'Звуковой тоннель', cat: 'Музыка', audio: true, mouse: true, tags: ['музыка', 'тоннель'],
  desc: 'Полёт сквозь пульсирующий тоннель из колец, форма которых повторяет спектр.',
  run: function () {
    var W, H, z0 = 0, hue = 0;
    LW.run({
      type: '2d', fps: 30, audio: true, mouse: true,
      init: function (c, w, h) { W = w; H = h; },
      frame: function (c, t, dt) {
        var A = LW.A; hue += dt * 12;
        c.fillStyle = '#04030c'; c.fillRect(0, 0, W, H);
        var cx = W / 2 + (LW.M.ax - W / 2) * 0.12, cy = H / 2 + (LW.M.ay - H / 2) * 0.12, R = Math.max(W, H) * 0.75;
        z0 = (z0 + dt * (0.25 + A.level * 0.9)) % 1;
        c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
        var N = 22, SEG = 96;
        for (var i = N; i >= 0; i--) {
          var z = (i + 1 - z0) / (N + 1), s = 0.2 / (z + 0.025);
          var rad = R * 0.1 * s, a = Math.min(1, (1 - z) * 1.6);
          c.beginPath();
          for (var k = 0; k <= SEG; k++) {
            var u = k / SEG, ang = u * 6.2832 + t * 0.2 * (i % 2 ? 1 : -1) + i * 0.1, f = Math.abs(u * 2 - 1);
            var bv = (LW.bandAt(f * 0.9 - 0.03) + LW.bandAt(f * 0.9) + LW.bandAt(f * 0.9 + 0.03)) / 3, m = 1 + bv * 0.35 * (1 - z * 0.5), px = cx + Math.cos(ang) * rad * m * 1.25, py = cy + Math.sin(ang) * rad * m * 0.85;
            if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
          }
          c.closePath(); c.strokeStyle = LW.hsl(hue + i * 14, 90, 62, a * 0.9); c.lineWidth = 1.5 + Math.min(s, 3) * 1.6; c.stroke();
        }
        var g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3); g.addColorStop(0, 'rgba(255,255,255,' + (0.1 + A.beat * 0.25) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Пульсар', cat: 'Музыка', audio: true, tags: ['музыка', 'шейдер', 'круги'],
  desc: 'Гипнотические кольца и лучи, искажаемые басом. Работает на видеокарте и почти не грузит процессор.',
  run: function () {
    LW.run({
      type: 'gl', fps: 30, glScale: 0.5, audio: true,
      frag: [
        'vec3 pal(float t){ return .5+.5*cos(6.2832*(vec3(1.,1.,1.)*t+vec3(.0,.33,.67))); }',
        'void main(){',
        ' vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float r=length(p); float a=atan(p.y,p.x);',
        ' float bass=A.x, mid=A.y, tre=A.z, beat=A.w;',
        ' float sp=band(abs(a)/3.1416);',
        ' float w=r+.05*sin(a*6.+T*.7)*(bass+.2)+sp*.05;',
        ' float rings=.5+.5*sin(w*38.-T*(2.+bass*3.));',
        ' float core=exp(-r*(5.5-bass*2.5))*(1.+beat*.8);',
        ' float rays=pow(max(0.,sin(a*24.+T*.8)*.5+.5),6.)*sp*1.5*smoothstep(.1,.7,r)*(1.-smoothstep(.5,1.1,r));',
        ' vec3 col=pal(w*1.2+T*.04+bass*.3)*pow(rings,3.)*.6*(1.-smoothstep(.3,1.2,r));',
        ' col+=pal(a/6.2832+T*.05)*rays;',
        ' col+=vec3(1.,.85,.7)*core*.8; col+=pal(T*.05+.2)*core*.5;',
        ' col+=vec3(.02,.02,.06)*(1.-r*.5);',
        ' col*=1.-.35*dot(p,p);',
        ' gl_FragColor=vec4(col,1.);',
        '}'
      ].join('\n')
    });
  }
});

S({
  file: 'Звуковая сфера', cat: 'Музыка', audio: true, mouse: true, tags: ['музыка', '3d', 'сфера'],
  desc: 'Трёхмерная сфера из точек, поверхность которой деформируется звуком. Курсор вращает её.',
  run: function () {
    var W, H, pts = [], N = 1100, rx = 0, ry = 0, sprites = [];
    function hsl2rgb(h, s, l) { s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); }; return Math.round(f(0) * 255) + ',' + Math.round(f(8) * 255) + ',' + Math.round(f(4) * 255); }
    LW.run({
      type: '2d', fps: 30, audio: true, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; pts = []; sprites = []; for (var si = 0; si < 24; si++) sprites.push(LW.glow(hsl2rgb(190 + si * 7, 95, 62), 32));
        for (var i = 0; i < N; i++) { var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963; pts.push({ x: Math.cos(th) * r, y: y, z: Math.sin(th) * r, b: Math.abs(y) }); }
      },
      frame: function (c, t, dt) {
        var A = LW.A;
        var g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, '#12102e'); g.addColorStop(1, '#040410'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        ry += dt * 0.25 + (LW.M.ax / W - 0.5) * dt * 1.5; rx = Math.sin(t * 0.2) * 0.3 + (LW.M.ay / H - 0.5) * 0.6;
        var cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), R = Math.min(W, H) * 0.3;
        c.globalCompositeOperation = 'lighter';
        var list = [];
        for (var i = 0; i < N; i++) {
          var p = pts[i], v = LW.bandAt(p.b * 0.85), d = 1 + v * 0.55 + A.beat * 0.08 + Math.sin(p.x * 4 + t * 1.5) * 0.03;
          var x = p.x * d, y = p.y * d, z = p.z * d;
          var x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
          var pr = 1 / (1 - z2 * 0.25);
          list.push([W / 2 + x1 * R * pr, H / 2 + y1 * R * pr, z2, v]);
        }
        for (var k = 0; k < list.length; k++) {
          var q = list[k], depth = (q[2] + 1) / 2, s = 3 + depth * 9;
          c.globalAlpha = 0.3 + depth * 0.7;
          c.drawImage(sprites[Math.min(23, Math.floor(q[3] * 23.9))], q[0] - s * 1.4, q[1] - s * 1.4, s * 2.8, s * 2.8);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Город-эквалайзер', cat: 'Музыка', audio: true, tags: ['музыка', 'город', 'ночь'],
  desc: 'Небоскрёбы вырастают и светятся окнами в такт музыке, внизу отражение в воде.',
  run: function () {
    var W, H, sky, hts, rnd = LW.rng(4), wins = [], N = 36, hz;
    LW.run({
      type: '2d', fps: 30, audio: true,
      init: function (c, w, h) {
        W = w; H = h; hz = h * 0.78; hts = new Float32Array(N);
        sky = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#080a2c'); g.addColorStop(1, '#5a2a78'); x.fillStyle = g; x.fillRect(0, 0, w, hz);
          var r = LW.rng(2); for (var i = 0; i < 160; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.6) + ')'; x.fillRect(r() * w, r() * hz * 0.7, 1.3, 1.3); }
          x.fillStyle = '#f7f1ff'; x.beginPath(); x.arc(w * 0.82, h * 0.18, h * 0.05, 0, 7); x.fill();
        });
        wins = []; for (var i = 0; i < N * 40; i++) wins.push(rnd());
      },
      frame: function (c, t) {
        var A = LW.A; c.drawImage(sky, 0, 0, W, H);
        var bw = W / N;
        for (var i = 0; i < N; i++) {
          var f = i / (N - 1), v = LW.bandAt(Math.pow(f, 0.8) * 0.92); hts[i] = Math.max(v * 0.9 + 0.1, hts[i] * 0.93);
        }
        for (var pass = 0; pass < 2; pass++) {
          c.save(); if (pass) { c.translate(0, hz * 2); c.scale(1, -1); c.globalAlpha = 0.3; }
          for (var b = 0; b < N; b++) {
            var bh = hts[b] * H * 0.5 + 8, x = b * bw, y = hz - bh;
            var hue = 250 + b * 3, g = c.createLinearGradient(0, y, 0, hz); g.addColorStop(0, LW.hsl(hue, 50, 22)); g.addColorStop(1, LW.hsl(hue + 20, 55, 10));
            c.fillStyle = g; c.fillRect(x + 1, y, bw - 2, bh);
            c.fillStyle = LW.hsl(hue + 80, 100, 65, 0.95); c.fillRect(x + 1, y, bw - 2, 2);
            var cols = 3, rows = Math.floor(bh / 12);
            for (var r = 0; r < rows; r++) for (var cc = 0; cc < cols; cc++) {
              var on = wins[(b * 40 + r * 3 + cc) % wins.length] < 0.35 + hts[b] * 0.5;
              if (on) { c.fillStyle = (wins[(b * 7 + r * 5 + cc) % wins.length] < 0.2) ? 'rgba(130,230,255,0.9)' : 'rgba(255,220,140,0.85)'; c.fillRect(x + 4 + cc * ((bw - 8) / cols), hz - 10 - r * 12, (bw - 8) / cols - 3, 6); }
            }
          }
          c.restore();
        }
        c.globalAlpha = 1;
        var wg = c.createLinearGradient(0, hz, 0, H); wg.addColorStop(0, 'rgba(20,10,50,0.2)'); wg.addColorStop(1, 'rgba(5,4,20,0.95)'); c.fillStyle = wg; c.fillRect(0, hz, W, H - hz);
        c.fillStyle = 'rgba(255,255,255,0.05)'; for (var y2 = hz + 6; y2 < H; y2 += 7) c.fillRect(0, y2 + Math.sin(t * 2 + y2) * 1, W, 1);
      }
    });
  }
});

S({
  file: 'Лазерное шоу', cat: 'Музыка', audio: true, tags: ['музыка', 'лазеры', 'клуб'],
  desc: 'Клубные лазеры веером расходятся от сцены и бьют в такт басу.',
  run: function () {
    var W, H, haze = [], rnd = LW.rng(6), hh = 200, hz;
    LW.run({
      type: '2d', fps: 30, audio: true,
      init: function (c, w, h) { W = w; H = h; haze = []; for (var i = 0; i < 18; i++) haze.push({ x: rnd() * w, y: h * (0.2 + rnd() * 0.8), r: 100 + rnd() * 240, v: 6 + rnd() * 16 }); },
      frame: function (c, t, dt) {
        var A = LW.A; hh += dt * 25;
        c.fillStyle = '#06030f'; c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = 'lighter';
        for (var k = 0; k < haze.length; k++) { var h2 = haze[k]; h2.x += h2.v * dt; if (h2.x - h2.r > W) h2.x = -h2.r; var g = c.createRadialGradient(h2.x, h2.y, 0, h2.x, h2.y, h2.r); g.addColorStop(0, LW.hsl(hh + k * 20, 80, 40, 0.07 + A.level * 0.06)); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(h2.x - h2.r, h2.y - h2.r, h2.r * 2, h2.r * 2); }
        var srcs = [[W * 0.5, H * 1.02, 1], [W * 0.12, H * 1.02, 0.7], [W * 0.88, H * 1.02, 0.7], [W * 0.3, H * 1.02, 0.85], [W * 0.7, H * 1.02, 0.85]];
        c.lineCap = 'round';
        for (var s = 0; s < srcs.length; s++) {
          var S = srcs[s], n = 9;
          for (var b = 0; b < n; b++) {
            var f = b / (n - 1) - 0.5, sweep = Math.sin(t * (0.7 + s * 0.13) + s) * 0.35 * (0.4 + A.mid), ang = -Math.PI / 2 + f * (1.5 + A.bass * 0.8) + sweep;
            var v = LW.bandAt((b + s * 3) / (n + 12)), len = Math.max(W, H) * 1.5, a = 0.3 + v * 0.7;
            var ex = S[0] + Math.cos(ang) * len, ey = S[1] + Math.sin(ang) * len, gr = c.createLinearGradient(S[0], S[1], ex, ey);
            var hue = hh + s * 50 + b * 8; gr.addColorStop(0, LW.hsl(hue, 100, 70, a)); gr.addColorStop(1, LW.hsl(hue, 100, 60, 0));
            c.strokeStyle = gr; c.lineWidth = 4 + v * 12; c.beginPath(); c.moveTo(S[0], S[1]); c.lineTo(ex, ey); c.stroke();
            c.lineWidth = 1; c.strokeStyle = LW.hsl(hue, 60, 92, a); c.beginPath(); c.moveTo(S[0], S[1]); c.lineTo(ex, ey); c.stroke();
          }
        }
        c.globalCompositeOperation = 'source-over';
        if (A.beat > 0) { c.fillStyle = 'rgba(255,255,255,' + A.beat * 0.07 + ')'; c.fillRect(0, 0, W, H); }
        c.fillStyle = '#05030a'; c.fillRect(0, H * 0.94, W, H * 0.06);
      }
    });
  }
});

S({
  file: 'Сейчас играет', cat: 'Музыка', audio: true, clock: true, tags: ['музыка', 'обложка', 'часы', 'плеер'],
  desc: 'Стеклянная карточка с обложкой и названием трека на размытом фоне, плюс время.',
  run: function () {
    var W, H, bgKey = '', bgL = null;
    LW.run({
      type: '2d', fps: 30, audio: true, clock: true,
      init: function (c, w, h) { W = w; H = h; bgKey = ''; },
      frame: function (c, t) {
        var A = LW.A, T = LW.track, col = T.color, key = T.key + (T.cover ? 1 : 0);
        if (key !== bgKey) {
          bgKey = key;
          bgL = LW.layer(W, H, function (x) {
            x.fillStyle = '#0a0a14'; x.fillRect(0, 0, W, H);
            if (T.cover) { x.filter = 'blur(' + Math.round(Math.min(W, H) * 0.06) + 'px) saturate(1.4) brightness(0.65)'; var s = Math.max(W, H) * 1.2; x.drawImage(T.cover, W / 2 - s / 2, H / 2 - s / 2, s, s); x.filter = 'none'; }
            else { var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1c2a6a'); g.addColorStop(1, '#5a1a6a'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
            x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, W, H);
          });
        }
        c.drawImage(bgL, 0, 0, W, H);
        var cw = Math.min(W * 0.62, H * 1.4), ch = cw * 0.42, cx = (W - cw) / 2, cy = (H - ch) / 2;
        c.fillStyle = 'rgba(255,255,255,0.1)'; LW.roundRect(c, cx, cy, cw, ch, ch * 0.09); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1.5; c.stroke();
        var cs = ch * 0.8, pad = (ch - cs) / 2, sc = 1 + A.bass * 0.03;
        c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.translate(cx + pad + cs / 2, cy + ch / 2); c.scale(sc, sc);
        LW.drawCover(c, -cs / 2, -cs / 2, cs, cs * 0.08); c.restore();
        var tx = cx + pad * 2 + cs, tw = cw - cs - pad * 3;
        c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = '#fff';
        c.font = '600 ' + Math.round(ch * 0.15) + 'px "Segoe UI", sans-serif'; c.fillText(LW.fitText(c, T.has ? T.title : 'Музыка не играет', tw), tx, cy + ch * 0.36);
        c.font = Math.round(ch * 0.095) + 'px "Segoe UI", sans-serif'; c.fillStyle = 'rgba(255,255,255,0.72)'; c.fillText(LW.fitText(c, T.has ? T.artist : 'Запустите плеер — трек появится здесь', tw), tx, cy + ch * 0.5);
        var n = 40, bw = tw / n;
        for (var i = 0; i < n; i++) { var v = A.bands[Math.floor(i / n * 56)], bh = 3 + v * ch * 0.28; c.fillStyle = LW.rgb(col, 0.45 + v * 0.55); LW.roundRect(c, tx + i * bw, cy + ch * 0.9 - bh, bw - 3, bh, 2); c.fill(); }
        var C = LW.clock; c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,0.92)'; c.font = '300 ' + Math.round(H * 0.07) + 'px "Segoe UI Light", "Segoe UI", sans-serif'; c.fillText(C.hm, W - W * 0.04, H * 0.1);
        c.font = Math.round(H * 0.024) + 'px "Segoe UI", sans-serif'; c.fillStyle = 'rgba(255,255,255,0.65)'; c.fillText(C.full, W - W * 0.04, H * 0.135);
      }
    });
  }
});

S({
  file: 'Обложка и эквалайзер', cat: 'Музыка', audio: true, tags: ['музыка', 'обложка', 'круговой эквалайзер'],
  desc: 'Обложка трека в центре, вокруг — круговой эквалайзер в цвет обложки.',
  run: function () {
    var W, H, bgL, bgKey = '', fade = 0;
    LW.run({
      type: '2d', fps: 30, audio: true,
      init: function (c, w, h) { W = w; H = h; bgKey = ''; },
      frame: function (c, t, dt) {
        var A = LW.A, T = LW.track, col = T.color, key = T.key + (T.cover ? 1 : 0);
        if (key !== bgKey) {
          bgKey = key; fade = 0;
          bgL = LW.layer(W, H, function (x) {
            var g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, LW.rgb(LW.mix(col, [8, 8, 16], 0.78))); g.addColorStop(1, '#05050c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
          });
        }
        fade = Math.min(1, fade + dt * 1.5);
        c.drawImage(bgL, 0, 0, W, H);
        var cx = W / 2, cy = H * 0.46, size = Math.min(W, H) * 0.3 * (1 + A.bass * 0.05), radius = size * 0.78, cs = LW.rgb(col);
        c.save(); c.translate(cx, cy); c.lineCap = 'round'; c.lineWidth = Math.max(3, size * 0.022);
        c.globalCompositeOperation = 'lighter';
        for (var j = 0; j < 128; j++) {
          var idx = j < 64 ? j : 127 - j, v = A.bands[idx], ang = j / 128 * 6.2832 - Math.PI / 2 + t * 0.03, len = 6 + v * size * 0.55;
          c.strokeStyle = LW.rgb(col, 0.3 + v * 0.7); c.beginPath(); c.moveTo(Math.cos(ang) * radius, Math.sin(ang) * radius); c.lineTo(Math.cos(ang) * (radius + len), Math.sin(ang) * (radius + len)); c.stroke();
        }
        c.globalCompositeOperation = 'source-over'; c.restore();
        c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; LW.drawCover(c, cx - size / 2, cy - size / 2, size, size * 0.06); c.restore();
        c.globalAlpha = fade; c.textAlign = 'center'; c.textBaseline = 'top'; c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 12;
        var ty = cy + radius + size * 0.62, mn = Math.min(W, H);
        c.fillStyle = '#fff'; c.font = '600 ' + Math.round(mn * 0.034) + 'px "Segoe UI", sans-serif'; c.fillText(LW.fitText(c, LW.track.has ? T.title : 'Включите музыку', W * 0.7), cx, ty);
        c.fillStyle = LW.rgb(col, 0.95); c.font = Math.round(mn * 0.022) + 'px "Segoe UI", sans-serif'; c.fillText(LW.fitText(c, T.artist, W * 0.7), cx, ty + mn * 0.048);
        c.shadowBlur = 0; c.globalAlpha = 1;
      }
    });
  }
});
