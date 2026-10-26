// ---------- Интерактив и абстракция ----------
S({
  file: 'Жидкий градиент', cat: 'Интерактив', mouse: true, tags: ['абстракция', 'шейдер', 'интерактив'],
  desc: 'Переливающиеся краски, как жидкая акварель. Курсор закручивает цвет вокруг себя.',
  run: function () {
    LW.run({
      type: 'gl', fps: 30, glScale: 0.45, mouse: true,
      frag: [
        'void main(){',
        ' vec2 p=(gl_FragCoord.xy-.5*R)/R.y; vec2 m=(M.xy-.5)*vec2(R.x/R.y,1.);',
        ' float t=T*.12; vec2 q=p;',
        ' vec2 d=p-m; float r=length(d); q+=vec2(-d.y,d.x)*exp(-r*2.6)*(.9+M.z*1.2);',
        ' for(int i=1;i<5;i++){ float fi=float(i); q+=.42/fi*vec2(sin(fi*q.y*2.1+t*fi+1.2),cos(fi*q.x*2.1-t*fi*1.1)); }',
        ' float v=q.x*.55+q.y*.35;',
        ' vec3 col=.5+.5*cos(6.2832*(vec3(v,v*.9+.2,v*1.1+.4)+vec3(0.,.33,.67)+t*.5));',
        ' col=mix(vec3(dot(col,vec3(.33))),col,1.2); col=pow(col,vec3(1.15))*1.05;',
        ' col+=.08*exp(-r*4.)*vec3(1.,.9,.8);',
        ' col*=1.-.3*dot(p,p);',
        ' gl_FragColor=vec4(col,1.);',
        '}'
      ].join('\n')
    });
  }
});

S({
  file: 'Магнитные частицы', cat: 'Интерактив', mouse: true, tags: ['частицы', 'интерактив', 'потоки'],
  desc: 'Тысячи частиц текут по невидимому полю. Курсор притягивает их, клик — отталкивает.',
  run: function () {
    var W, H, N, px, py, hue, rnd = LW.rng(7), buckets = 10;
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; N = Math.min(3200, Math.floor(w * h / 700)); px = new Float32Array(N); py = new Float32Array(N); hue = new Uint8Array(N);
        for (var i = 0; i < N; i++) { px[i] = rnd() * w; py[i] = rnd() * h; hue[i] = Math.floor(rnd() * buckets); }
        c.fillStyle = '#050714'; c.fillRect(0, 0, w, h);
      },
      frame: function (c, t, dt) {
        c.fillStyle = 'rgba(5,7,20,0.1)'; c.fillRect(0, 0, W, H);
        var mx = LW.M.ax, my = LW.M.ay, down = LW.M.down, sp = 70 * dt * 30 / 30;
        c.lineWidth = 1.2; c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
        var paths = []; for (var b = 0; b < buckets; b++) paths.push([]);
        for (var i = 0; i < N; i++) {
          var x = px[i], y = py[i], a = LW.noise(x * 0.0022 + t * 0.03, y * 0.0022) * 6.283 * 1.4;
          var vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
          var dx = mx - x, dy = my - y, d2 = dx * dx + dy * dy;
          if (d2 < 90000) { var d = Math.sqrt(d2) + 1, f = (1 - d / 300) * 4 * (down ? -2.4 : 1) * dt * 30; vx += dx / d * f * 3; vy += dy / d * f * 3; }
          var nx = x + vx, ny = y + vy;
          paths[hue[i]].push(x, y, nx, ny);
          if (nx < 0 || nx > W || ny < 0 || ny > H || rnd() < 0.002) { nx = rnd() * W; ny = rnd() * H; paths[hue[i]].length -= 4; }
          px[i] = nx; py[i] = ny;
        }
        for (var k = 0; k < buckets; k++) {
          var p = paths[k]; if (!p.length) continue;
          c.strokeStyle = LW.hsl(190 + k * 17 + Math.sin(t * 0.1) * 30, 90, 62, 0.8); c.beginPath();
          for (var j = 0; j < p.length; j += 4) { c.moveTo(p[j], p[j + 1]); c.lineTo(p[j + 2], p[j + 3]); }
          c.stroke();
        }
        c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Неоновый след', cat: 'Интерактив', mouse: true, tags: ['интерактив', 'неон', 'симметрия'],
  desc: 'Курсор рисует светящиеся узоры с симметрией. Если мышь не трогать — рисует сам.',
  run: function () {
    var W, H, prev = null, hue = 0, SYM = 6;
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) { W = w; H = h; prev = null; c.fillStyle = '#04040c'; c.fillRect(0, 0, w, h); },
      frame: function (c, t, dt) {
        c.fillStyle = 'rgba(4,4,12,0.035)'; c.fillRect(0, 0, W, H);
        var cx = W / 2, cy = H / 2, x = LW.M.ax - cx, y = LW.M.ay - cy;
        hue += dt * 40;
        if (prev) {
          var dx = x - prev.x, dy = y - prev.y, sp = Math.sqrt(dx * dx + dy * dy);
          if (sp > 0.4) {
            c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
            for (var s = 0; s < SYM; s++) {
              var a = s / SYM * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
              for (var m = 0; m < 2; m++) {
                var f = m ? -1 : 1;
                var x1 = cx + (prev.x * f * ca - prev.y * sa), y1 = cy + (prev.x * f * sa + prev.y * ca), x2 = cx + (x * f * ca - y * sa), y2 = cy + (x * f * sa + y * ca);
                c.strokeStyle = LW.hsl(hue + s * 12, 100, 60, 0.2); c.lineWidth = 10; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
                c.strokeStyle = LW.hsl(hue + s * 12, 100, 78, 1); c.lineWidth = 2.6; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
              }
            }
            c.globalCompositeOperation = 'source-over';
          }
        }
        prev = { x: x, y: y };
      }
    });
  }
});

S({
  file: 'Кристаллы', cat: 'Интерактив', mouse: true, tags: ['геометрия', 'low-poly', 'интерактив'],
  desc: 'Мерцающая сетка из треугольников (low-poly). Курсор подсвечивает грани.',
  run: function () {
    var W, H, cols = 20, rows = 12, pts = [], rnd = LW.rng(11);
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; pts = [];
        cols = Math.max(10, Math.round(w / 90)); rows = Math.max(6, Math.round(h / 90));
        for (var j = 0; j <= rows; j++) for (var i = 0; i <= cols; i++) {
          var edge = (i === 0 || j === 0 || i === cols || j === rows);
          pts.push({ bx: i / cols * (w + 120) - 60 + (edge ? 0 : (rnd() - 0.5) * (w / cols) * 0.7), by: j / rows * (h + 120) - 60 + (edge ? 0 : (rnd() - 0.5) * (h / rows) * 0.7), p: rnd() * 6.28 });
        }
      },
      frame: function (c, t) {
        var mx = LW.M.ax, my = LW.M.ay, base = 215 + Math.sin(t * 0.05) * 40;
        c.fillStyle = '#0a0c1e'; c.fillRect(0, 0, W, H);
        function P(i, j) { var p = pts[j * (cols + 1) + i]; return [p.bx + Math.sin(t * 0.35 + p.p) * 10, p.by + Math.cos(t * 0.3 + p.p * 1.3) * 10]; }
        c.lineJoin = 'round';
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
          var a = P(i, j), b = P(i + 1, j), d = P(i, j + 1), e = P(i + 1, j + 1);
          for (var k = 0; k < 2; k++) {
            var tri = k ? [b, e, d] : [a, b, d], cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
            var n = LW.noise(cx * 0.004 + t * 0.05, cy * 0.004 + k * 3.3), md = Math.hypot(cx - mx, cy - my), glow = Math.max(0, 1 - md / (Math.min(W, H) * 0.4));
            var hue = base + (cx / W) * 60 + n * 40, lig = 22 + n * 14 + glow * 34 + (cy / H) * 8;
            c.fillStyle = LW.hsl(hue, 65 + glow * 20, lig); c.strokeStyle = LW.hsl(hue, 70, lig + 6, 0.5); c.lineWidth = 0.8;
            c.beginPath(); c.moveTo(tri[0][0], tri[0][1]); c.lineTo(tri[1][0], tri[1][1]); c.lineTo(tri[2][0], tri[2][1]); c.closePath(); c.fill(); c.stroke();
          }
        }
      }
    });
  }
});

S({
  file: 'Игра «Жизнь»', cat: 'Интерактив', mouse: true, tags: ['клеточный автомат', 'интерактив', 'неон'],
  desc: 'Живые клетки Конвея светятся и оставляют следы. Клик засевает новую колонию.',
  run: function () {
    var W, H, cols, rows, cur, nxt, age, cv, cx, img, stepT = 0, seedT = 0, last = 0, same = 0, CELL = 7;
    function seed(n) { for (var i = 0; i < cols * rows; i++) if (Math.random() < n) cur[i] = 1; }
    function blob(x, y) { var gx = Math.floor(x / CELL), gy = Math.floor(y / CELL); for (var j = -4; j <= 4; j++) for (var i = -4; i <= 4; i++) if (Math.random() < 0.55) { var xx = (gx + i + cols) % cols, yy = (gy + j + rows) % rows; cur[yy * cols + xx] = 1; } }
    LW.onClick(function (x, y) { blob(x, y); });
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; cols = Math.ceil(w / CELL); rows = Math.ceil(h / CELL);
        cur = new Uint8Array(cols * rows); nxt = new Uint8Array(cols * rows); age = new Float32Array(cols * rows);
        cv = document.createElement('canvas'); cv.width = cols; cv.height = rows; cx = cv.getContext('2d'); img = cx.createImageData(cols, rows);
        seed(0.22);
      },
      frame: function (c, t, dt) {
        stepT += dt;
        if (stepT > 0.09) {
          stepT = 0; var pop = 0;
          for (var y = 0; y < rows; y++) { var ym = ((y + rows - 1) % rows) * cols, y0 = y * cols, yp = ((y + 1) % rows) * cols;
            for (var x = 0; x < cols; x++) {
              var xm = (x + cols - 1) % cols, xp = (x + 1) % cols;
              var n = cur[ym + xm] + cur[ym + x] + cur[ym + xp] + cur[y0 + xm] + cur[y0 + xp] + cur[yp + xm] + cur[yp + x] + cur[yp + xp];
              var alive = cur[y0 + x], v = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0; nxt[y0 + x] = v; pop += v;
            } }
          var tmp = cur; cur = nxt; nxt = tmp;
          if (Math.abs(pop - last) < 3) same++; else same = 0; last = pop;
          if (pop < cols * rows * 0.01 || same > 40) { seed(0.2); same = 0; }
        }
        var d = img.data, tt = t * 20;
        for (var i = 0; i < cur.length; i++) {
          age[i] = cur[i] ? 1 : age[i] * 0.9; var a = age[i], k = i * 4, x2 = i % cols, y2 = (i / cols) | 0;
          if (cur[i]) { d[k] = 90 + 80 * Math.sin(x2 * 0.05 + tt * 0.02); d[k + 1] = 230; d[k + 2] = 255; } else { d[k] = 255 * a * 0.8; d[k + 1] = 60 * a; d[k + 2] = 200 * a; }
          d[k + 3] = cur[i] ? 255 : a * 230;
        }
        cx.putImageData(img, 0, 0);
        c.fillStyle = '#05060f'; c.fillRect(0, 0, W, H);
        c.imageSmoothingEnabled = true; c.globalAlpha = 0.9; c.drawImage(cv, 0, 0, cols * CELL, rows * CELL);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; c.filter = 'blur(6px)'; c.drawImage(cv, 0, 0, cols * CELL, rows * CELL); c.filter = 'none';
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Волна маятников', cat: 'Интерактив', mouse: true, tags: ['физика', 'гипноз', 'интерактив'],
  desc: 'Классическая волна маятников: шарики то выстраиваются в линию, то рисуют узоры. Клик сбрасывает фазу.',
  run: function () {
    var W, H, N = 22, t0 = 0, glows = [];
    function hsl2rgb(h, s, l) { s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); }; return Math.round(f(0) * 255) + ',' + Math.round(f(8) * 255) + ',' + Math.round(f(4) * 255); }
    LW.onClick(function () { t0 = LW.t; });
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) { W = w; H = h; glows = []; for (var i = 0; i < N; i++) glows.push(LW.glow(hsl2rgb(i / N * 300 + 190, 90, 62), 64)); },
      frame: function (c, t) {
        var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0c24'); g.addColorStop(1, '#1a1040'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        var tt = t - t0 + 8, top = H * 0.08, L = H * 0.62, span = W * 0.8, x0 = (W - span) / 2, amp = 0.5;
        c.fillStyle = '#2b2f55'; c.fillRect(x0 - 24, top - 8, span + 48, 8);
        c.lineWidth = 1.3;
        var pts = [];
        for (var i = 0; i < N; i++) {
          var f = (30 + i) / 60 * 6.2832, th = amp * Math.cos(f * tt * 0.5 * 0 + f * tt), px = x0 + span * i / (N - 1), bx = px + Math.sin(th) * L, by = top + Math.cos(th) * L * 0.98;
          pts.push([bx, by]);
          c.strokeStyle = 'rgba(190,200,255,0.35)'; c.beginPath(); c.moveTo(px, top); c.lineTo(bx, by); c.stroke();
        }
        c.globalCompositeOperation = 'lighter';
        for (var k = 0; k < N; k++) {
          var p = pts[k], sz = Math.min(W, H) * 0.075; c.globalAlpha = 0.9; c.drawImage(glows[k], p[0] - sz / 2, p[1] - sz / 2, sz, sz);
          c.globalAlpha = 0.18; c.drawImage(glows[k], p[0] - sz * 0.5, H * 0.94 - sz * 0.25 + 0, sz, sz * 0.5);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#fff'; for (var m = 0; m < N; m++) { c.beginPath(); c.arc(pts[m][0], pts[m][1], Math.min(W, H) * 0.008, 0, 7); c.fill(); }
      }
    });
  }
});

S({
  file: 'Пиксельный город', cat: 'Интерактив', tags: ['пиксель-арт', 'город', 'ночь', 'дождь'],
  desc: 'Ночной город в стиле пиксель-арт: дождь, мигающие окна, неон и проезжающий автобус.',
  run: function () {
    var W, H, sky, city, wins = [], rain = [], rnd = LW.rng(5), bus = 0;
    var PAL = [[16, 12, 40], [32, 20, 66], [58, 28, 90], [102, 40, 112], [158, 56, 120], [214, 84, 110]];
    var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    LW.run({
      type: '2d', pixel: 4, fps: 20,
      init: function (c, w, h) {
        W = w; H = h; wins = []; rain = [];
        sky = document.createElement('canvas'); sky.width = w; sky.height = h; var sx = sky.getContext('2d'), im = sx.createImageData(w, h), d = im.data, hz = h * 0.75;
        for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
          var f = Math.min(1, y / hz) * (PAL.length - 1), lo = Math.floor(f), fr = f - lo, th = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16, idx = Math.min(PAL.length - 1, lo + (fr > th ? 1 : 0)), col = PAL[idx], k = (y * w + x) * 4;
          d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
        }
        sx.putImageData(im, 0, 0);
        sx.fillStyle = '#ffe9f0'; sx.beginPath(); sx.arc(w * 0.8, h * 0.2, h * 0.07, 0, 7); sx.fill(); sx.fillStyle = '#e4bfd0'; sx.fillRect(w * 0.8 - 6, h * 0.2 - 3, 4, 3); sx.fillRect(w * 0.8 + 3, h * 0.2 + 5, 5, 3);
        for (var s = 0; s < 70; s++) { sx.fillStyle = 'rgba(255,255,255,' + (0.3 + rnd() * 0.6) + ')'; sx.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h * 0.45), 1, 1); }
        city = document.createElement('canvas'); city.width = w; city.height = h; var cx = city.getContext('2d');
        var cols = ['#2a1a4a', '#1c1038', '#10082a'];
        for (var L = 0; L < 3; L++) {
          var xx = -4, base = Math.floor(h * (0.62 + L * 0.07));
          while (xx < w) {
            var bw = 12 + Math.floor(rnd() * 22), bh = Math.floor(h * (0.14 + rnd() * 0.3 - L * 0.04)), top = base - bh + Math.floor(L * 4);
            cx.fillStyle = cols[L]; cx.fillRect(xx, top, bw, h - top);
            if (rnd() < 0.4) cx.fillRect(xx + Math.floor(bw / 2), top - 5, 2, 5);
            for (var wy = top + 4; wy < base + 8 - 3; wy += 5) for (var wx = xx + 3; wx < xx + bw - 3; wx += 4) if (rnd() < 0.42) wins.push([wx, wy, L, rnd() < 0.2 ? 1 : 0, rnd() * 100]);
            xx += bw + 1;
          }
        }
        cx.fillStyle = '#0a0518'; cx.fillRect(0, Math.floor(h * 0.9), w, h);
        cx.fillStyle = '#2a1a3a'; cx.fillRect(0, Math.floor(h * 0.9), w, 1);
        for (var r = 0; r < 140; r++) rain.push({ x: rnd() * w, y: rnd() * h, v: 1.6 + rnd() * 1.4 });
      },
      frame: function (c, t) {
        c.drawImage(sky, 0, 0); c.drawImage(city, 0, 0);
        for (var i = 0; i < wins.length; i++) {
          var q = wins[i], on = Math.sin(t * 0.3 + q[4]) > -0.85; if (!on) continue;
          c.fillStyle = q[3] ? '#7ee8ff' : (q[2] === 0 ? '#ffd47a' : '#c99a50'); c.fillRect(q[0], q[1], 2, 3);
        }
        // неон
        var fl = Math.sin(t * 9) > -0.9; c.fillStyle = fl ? '#ff3da0' : '#7a1f50'; c.fillRect(Math.floor(W * 0.2), Math.floor(H * 0.52), 14, 3); c.fillStyle = fl ? '#3de8ff' : '#1f6a7a'; c.fillRect(Math.floor(W * 0.2), Math.floor(H * 0.52) + 5, 10, 2);
        // автобус
        bus = (t * 18) % (W + 80) - 60; var by = Math.floor(H * 0.93);
        c.fillStyle = '#d6b043'; c.fillRect(bus, by - 10, 36, 9); c.fillStyle = '#1a1230'; for (var wv = 0; wv < 5; wv++) c.fillRect(bus + 3 + wv * 7, by - 8, 5, 4);
        c.fillStyle = '#10082a'; c.fillRect(bus + 5, by - 1, 5, 3); c.fillRect(bus + 26, by - 1, 5, 3); c.fillStyle = 'rgba(255,240,170,0.5)'; c.fillRect(bus + 36, by - 7, 12, 4);
        c.fillStyle = 'rgba(255,200,120,0.18)'; c.fillRect(0, by + 2, W, 3);
        // дождь
        c.fillStyle = 'rgba(190,200,255,0.5)';
        for (var r = 0; r < rain.length; r++) { var d = rain[r]; d.y += d.v; d.x -= 0.5; if (d.y > H) { d.y = -4; d.x = Math.random() * W; } c.fillRect(Math.floor(d.x), Math.floor(d.y), 1, 3); }
      }
    });
  }
});

S({
  file: 'Фрактал Жюлиа', cat: 'Интерактив', mouse: true, tags: ['фрактал', 'шейдер', 'математика'],
  desc: 'Множество Жюлиа, которое медленно «дышит». Курсор меняет форму фрактала.',
  run: function () {
    LW.run({
      type: 'gl', fps: 30, glScale: 0.5, mouse: true,
      frag: [
        'void main(){',
        ' vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float zoom=1.5+.35*sin(T*.07); p*=zoom; p=rot(T*.02)*p;',
        ' vec2 c=vec2(-.8+.1*sin(T*.11),.156+.08*cos(T*.13))+(M.xy-.5)*vec2(.35,.3)*(1.-M.w);',
        ' vec2 z=p; float it=0.; float m=0.;',
        ' for(int i=0;i<90;i++){ z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+c; m=dot(z,z); if(m>256.) break; it+=1.; }',
        ' float sm=it-log2(log2(max(m,1.001)))+4.;',
        ' vec3 col=.5+.5*cos(6.2832*(sm*.02+vec3(.0,.12,.28)+T*.01));',
        ' col*=it>=89.?vec3(0.):vec3(1.);',
        ' col=pow(col,vec3(1.1))*(1.-.4*length(gl_FragCoord.xy/R-.5));',
        ' gl_FragColor=vec4(col,1.);',
        '}'
      ].join('\n')
    });
  }
});

S({
  file: 'Калейдоскоп', cat: 'Интерактив', mouse: true, tags: ['абстракция', 'шейдер', 'гипноз'],
  desc: 'Гипнотический калейдоскоп из переливающихся узоров. Курсор меняет масштаб и поворот.',
  run: function () {
    LW.run({
      type: 'gl', fps: 30, glScale: 0.5, mouse: true,
      frag: [
        'void main(){',
        ' vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float t=T*.15; vec2 m=(M.xy-.5);',
        ' p*=1.4+m.y*.8; p=rot(t*.3+m.x*1.5)*p;',
        ' float a=atan(p.y,p.x), r=length(p), n=8.; float seg=6.2832/n;',
        ' a=abs(mod(a,seg)-seg*.5);',
        ' vec2 q=vec2(cos(a),sin(a))*r;',
        ' vec3 col=vec3(0.);',
        ' for(int i=0;i<4;i++){ float fi=float(i); q=abs(q)-.18-.04*sin(t+fi); q=rot(.6+fi*.4+t*.2)*q; float d=length(q)-.12-.05*sin(t*1.3+fi*2.); col+=.012/abs(d)*(.5+.5*cos(6.2832*(fi*.25+r*.8+t*.2+vec3(0.,.33,.67)))); }',
        ' col=1.-exp(-col*1.1); col*=1.-.4*r*r;',
        ' gl_FragColor=vec4(col,1.);',
        '}'
      ].join('\n')
    });
  }
});

S({
  file: 'Созвездие', cat: 'Интерактив', mouse: true, tags: ['частицы', 'линии', 'классика'],
  desc: 'Плавающие светящиеся точки соединяются линиями. Курсор становится ещё одной звездой.',
  run: function () {
    var W, H, pts = [], rnd = LW.rng(4), N, LINK;
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; pts = []; N = Math.min(170, Math.round(w * h / 15000)); LINK = Math.max(130, Math.min(w, h) * 0.17);
        for (var i = 0; i < N; i++) pts.push({ x: rnd() * w, y: rnd() * h, vx: (rnd() - 0.5) * 22, vy: (rnd() - 0.5) * 22, r: 1.2 + rnd() * 1.8, h: 200 + rnd() * 90 });
      },
      frame: function (c, t, dt) {
        var g = c.createLinearGradient(0, 0, W * 0.3, H); g.addColorStop(0, '#0a0c1e'); g.addColorStop(1, '#261040'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        for (var i = 0; i < N; i++) { var p = pts[i]; p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < 0 || p.x > W) p.vx = -p.vx; if (p.y < 0 || p.y > H) p.vy = -p.vy; }
        var mp = { x: LW.M.ax, y: LW.M.ay, r: 2.6, h: 40 };
        var all = pts.concat([mp]); c.lineWidth = 1;
        for (var a = 0; a < all.length; a++) for (var b = a + 1; b < all.length; b++) {
          var dx = all[a].x - all[b].x, dy = all[a].y - all[b].y; if (dx > LINK || dx < -LINK || dy > LINK || dy < -LINK) continue;
          var d = Math.sqrt(dx * dx + dy * dy); if (d >= LINK) continue;
          c.strokeStyle = 'rgba(' + (b === all.length - 1 || a === all.length - 1 ? '255,200,120' : '120,170,255') + ',' + (0.5 * (1 - d / LINK)) + ')'; c.beginPath(); c.moveTo(all[a].x, all[a].y); c.lineTo(all[b].x, all[b].y); c.stroke();
        }
        c.globalCompositeOperation = 'lighter';
        for (var k = 0; k < all.length; k++) {
          var q = all[k], pulse = 0.6 + 0.4 * Math.sin(t * 1.1 + k); c.fillStyle = LW.hsl(q.h, 90, 75, 0.14 * pulse); c.beginPath(); c.arc(q.x, q.y, q.r * 4.5, 0, 7); c.fill();
          c.fillStyle = LW.hsl(q.h, 90, 82, 0.95); c.beginPath(); c.arc(q.x, q.y, q.r, 0, 7); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Матрица', cat: 'Интерактив', mouse: true, tags: ['код', 'классика', 'хакер'],
  desc: 'Падающий код в стиле «Матрицы». Курсор подсвечивает колонки рядом с собой.',
  run: function () {
    var SIZE = 18, W, H, drops, cols, CH = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789{}[]<>=+-*/;$#@&', rnd = LW.rng(1);
    LW.run({
      type: '2d', fps: 20, mouse: true,
      init: function (c, w, h) { W = w; H = h; cols = Math.ceil(w / SIZE); drops = []; for (var i = 0; i < cols; i++) drops.push(rnd() * -h / SIZE); c.fillStyle = '#000'; c.fillRect(0, 0, w, h); },
      frame: function (c, t) {
        c.fillStyle = 'rgba(0,0,0,0.09)'; c.fillRect(0, 0, W, H); c.font = SIZE + 'px "Consolas","MS Gothic",monospace'; c.textBaseline = 'top';
        var mc = Math.floor(LW.M.ax / SIZE);
        for (var i = 0; i < cols; i++) {
          var y = drops[i] * SIZE, near = Math.abs(i - mc) < 4 && LW.M.w < 0.5 ? 1 : 0;
          c.fillStyle = near ? '#b8ffd0' : (rnd() > 0.97 ? '#d8ffe0' : '#22e06a'); c.fillText(CH.charAt(Math.floor(rnd() * CH.length)), i * SIZE, y);
          drops[i] += near ? 1.6 : 1; if (y > H && rnd() > 0.975) drops[i] = 0;
        }
      }
    });
  }
});
