// ---------- Космос ----------
S({
  file: 'Туманность', cat: 'Космос', mouse: true, tags: ['космос', 'шейдер'],
  desc: 'Дышащая туманность с мерцающими звёздами. Слегка следует за курсором.',
  run: function () {
    LW.run({
      type: 'gl', fps: 30, glScale: 0.55, mouse: true,
      frag: [
        'void main(){',
        ' vec2 p=(gl_FragCoord.xy-.5*R)/R.y; vec2 par=(M.xy-.5);',
        ' float t=T*.025;',
        ' vec2 w=p*1.05+par*.10;',
        ' vec2 q=vec2(fbm(w+t),fbm(w+vec2(5.2,1.3)-t));',
        ' vec2 r=vec2(fbm(w*1.1+3.5*q+vec2(1.7,9.2)+t*2.),fbm(w*1.1+3.5*q+vec2(8.3,2.8)-t*2.));',
        ' float f=fbm(w+3.8*r);',
        ' vec3 col=mix(vec3(.01,.008,.045),vec3(.26,.04,.40),clamp(f*f*3.1,0.,1.));',
        ' col=mix(col,vec3(.03,.34,.72),clamp(length(q)*.7,0.,1.)*f*1.15);',
        ' col=mix(col,vec3(.95,.38,.5),clamp(pow(r.x,4.)*3.5,0.,1.)*.75);',
        ' col*=.5+f*1.15;',
        ' col+=vec3(.7,.5,1.)*pow(max(f-.6,0.),2.)*1.2;',
        ' for(int k=0;k<3;k++){',
        '  float sc=60.+float(k)*55.; vec2 sp=(p+par*(.02+.03*float(k)))*sc+float(k)*17.;',
        '  vec2 g=floor(sp); vec2 fp=fract(sp)-.5; float h=hash(g+float(k));',
        '  vec2 o=(vec2(hash(g+3.1),hash(g+7.7))-.5)*.6;',
        '  float d=length(fp-o); float tw=.65+.35*sin(T*(1.5+h*3.)+h*50.);',
        '  float st=smoothstep(.09+.05*float(k==0 ? 1:0),0.,d)*step(.9-.03*float(k),h)*tw;',
        '  col+=mix(vec3(.7,.8,1.),vec3(1.,.85,.7),hash(g+9.))*st*(1.2-.25*float(k));',
        ' }',
        ' col*=1.-.55*dot(p*.8,p*.8);',
        ' gl_FragColor=vec4(pow(col,vec3(.95)),1.);',
        '}'
      ].join('\n')
    });
  }
});

S({
  file: 'Гиперпрыжок', cat: 'Космос', mouse: true, tags: ['космос', 'интерактив'],
  desc: 'Полёт сквозь звёзды. Курсор направляет корабль, клик включает форсаж.',
  run: function () {
    var stars = [], N = 520, boost = 0, W, H, bg;
    var rnd = LW.rng(11);
    function reset(s, far) {
      s.x = (rnd() - 0.5) * 2; s.y = (rnd() - 0.5) * 2; s.z = far ? 1 : rnd();
      s.h = 195 + rnd() * 90; s.l = 55 + rnd() * 35;
    }
    for (var i = 0; i < N; i++) { var s = {}; reset(s, false); stars.push(s); }
    LW.onClick(function () { boost = 1; });
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) { W = w; H = h; c.fillStyle = '#04050d'; c.fillRect(0, 0, w, h); },
      frame: function (c, t, dt) {
        boost = Math.max(0, boost - dt * 0.5);
        var cx = W / 2 + (LW.M.ax - W / 2) * 0.35, cy = H / 2 + (LW.M.ay - H / 2) * 0.35;
        var speed = (0.22 + boost * 1.3) * dt, f = Math.max(W, H) * 0.55;
        c.fillStyle = 'rgba(4,5,13,' + (0.42 - boost * 0.22) + ')';
        c.fillRect(0, 0, W, H);
        var g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.5);
        g.addColorStop(0, 'rgba(70,90,255,' + (0.12 + boost * 0.25) + ')'); g.addColorStop(1, 'rgba(70,90,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        for (var i = 0; i < N; i++) {
          var s = stars[i], z0 = s.z;
          s.z -= speed * (0.6 + z0);
          if (s.z <= 0.02) { reset(s, true); continue; }
          var x1 = cx + s.x / s.z * f * 0.3, y1 = cy + s.y / s.z * f * 0.3;
          var zb = s.z + speed * (3 + boost * 22) * (0.6 + z0);
          var x0 = cx + s.x / zb * f * 0.3, y0 = cy + s.y / zb * f * 0.3;
          if (x1 < -50 || x1 > W + 50 || y1 < -50 || y1 > H + 50) { reset(s, true); continue; }
          var a = Math.min(1, (1 - s.z) * 1.4);
          c.strokeStyle = LW.hsl(s.h, 90, s.l, a);
          c.lineWidth = 0.6 + (1 - s.z) * 2.2;
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        }
        c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Спиральная галактика', cat: 'Космос', mouse: true, tags: ['космос', 'частицы'],
  desc: 'Тысячи звёзд вращаются вокруг светящегося ядра. Курсор наклоняет галактику.',
  run: function () {
    var N = 7000, W, H, bg, rnd = LW.rng(5), st = [], buckets = [];
    var pal = [[255, 236, 200], [255, 205, 150], [255, 170, 190], [200, 150, 255], [140, 170, 255], [120, 210, 255]];
    for (var i = 0; i < N; i++) {
      var arm = i % 3, r = Math.pow(rnd(), 1.6) * 1.0 + 0.03;
      var spread = (rnd() - 0.5) * (0.5 + r * 0.9) * (rnd() < 0.3 ? 2 : 1);
      var a = arm * Math.PI * 2 / 3 + r * 5.2 + spread * 0.9 + (r < 0.25 ? (rnd() - 0.5) * 6 * (0.25 - r) * 4 : 0);
      var ci = Math.min(5, Math.floor(r * 4 + rnd() * 1.6));
      st.push({ r: r, a: a, w: 0.55 / Math.sqrt(r + 0.12), z: (rnd() - 0.5) * 0.05 / (r + 0.3), b: ci, s: 0.7 + rnd() * 1.3, al: 0.35 + rnd() * 0.65 });
    }
    var core = null, groups = [[], [], [], [], [], []];
    for (var gi = 0; gi < N; gi++) groups[st[gi].b].push(st[gi]);
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h;
        bg = LW.layer(w, h, function (x) {
          var g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
          g.addColorStop(0, '#0d0a22'); g.addColorStop(1, '#02020a');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var r2 = LW.rng(2);
          for (var i = 0; i < 380; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.2 + r2() * 0.7) + ')'; x.fillRect(r2() * w, r2() * h, 1.2, 1.2); }
        });
        core = LW.glow('255,215,160', 256);
      },
      frame: function (c, t) {
        c.drawImage(bg, 0, 0, W, H);
        var R = Math.min(W, H) * 0.64, tilt = 0.42 + (LW.M.ay / H - 0.5) * 0.22, rot = t * 0.05 + (LW.M.ax / W - 0.5) * 0.5;
        c.save(); c.translate(W / 2, H / 2); c.rotate(-0.35);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.75; c.drawImage(core, -R * 0.45, -R * 0.3, R * 0.9, R * 0.6); c.globalAlpha = 1;
        for (var b = 0; b < pal.length; b++) {
          c.fillStyle = LW.rgb(pal[b], 0.85);
          var grp = groups[b];
          for (var i = 0; i < grp.length; i++) {
            var s = grp[i];
            var ang = s.a + rot * s.w * 2;
            var x = Math.cos(ang) * s.r * R, y = Math.sin(ang) * s.r * R * tilt - s.z * R;
            c.globalAlpha = s.al; c.fillRect(x, y, s.s * 1.3, s.s * 1.3);
          }
        }
        c.globalAlpha = 1; c.restore();
        c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Чёрная дыра', cat: 'Космос', mouse: true, tags: ['космос', 'шейдер'],
  desc: 'Аккреционный диск и гравитационное линзирование звёзд. Курсор меняет наклон диска.',
  run: function () {
    LW.run({
      type: 'gl', fps: 30, glScale: 0.6, mouse: true,
      frag: [
        'vec3 stars(vec2 b){',
        ' vec3 c=vec3(0.); for(int k=0;k<3;k++){ float sc=70.+float(k)*60.; vec2 sp=b*sc+float(k)*13.;',
        '  vec2 g=floor(sp),f=fract(sp)-.5; float h=hash(g+float(k)); vec2 o=(vec2(hash(g+3.1),hash(g+7.7))-.5)*.6;',
        '  float s=smoothstep(.1,0.,length(f-o))*step(.92,h); c+=s*mix(vec3(.7,.8,1.),vec3(1.,.8,.6),hash(g+9.))*(.6+.4*sin(T*2.+h*60.)); }',
        ' c+=vec3(.05,.03,.1)*fbm(b*2.+3.)*1.4; return c; }',
        'void main(){',
        ' vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float tilt=.2+(M.y-.5)*.16;',
        ' p=rot(-.18)*p; float r=length(p); float E=.17; float rsh=.135;',
        ' vec2 b=p*(1.-E*E/(r*r+1e-4)); vec3 col=stars(b*.9);',
        ' // линзированная задняя часть диска — кольцо вокруг тени',
        ' float ang=atan(p.y,p.x);',
        ' float ringI=exp(-pow((r-rsh*1.28)/(rsh*.34),2.));',
        ' float sw=fbm(vec2(ang*2.5+T*.25,r*30.));',
        ' vec3 hot=mix(vec3(1.,.55,.15),vec3(1.,.93,.75),ringI);',
        ' col+=hot*ringI*(.5+1.4*sw)*(1.+.5*cos(ang+3.14));',
        ' col+=vec3(1.,.6,.25)*exp(-pow((r-rsh*1.02)/(rsh*.05),2.))*.9;',
        ' // тень',
        ' col*=smoothstep(rsh*.97,rsh*1.03,r);',
        ' // передняя часть диска — тонкий эллипс',
        ' vec2 d=vec2(p.x,p.y/tilt); float rr=length(d);',
        ' float inD=smoothstep(.16,.19,rr)*(1.-smoothstep(.62,.7,rr));',
        ' float da=atan(d.y,d.x)+T*(.55/pow(rr+.05,1.1));',
        ' float streak=.35+.9*fbm(vec2(da*2.6,rr*22.)); float sh=pow(.17/rr,1.7);',
        ' float dop=1.+.65*(-d.x/rr);',
        ' vec3 dc=mix(vec3(1.,.95,.85),vec3(.95,.35,.07),smoothstep(.17,.55,rr));',
        ' float front=step(p.y,0.)+step(rsh*1.0,r)*step(0.,p.y);',
        ' float vis=clamp(front,0.,1.);',
        ' col=mix(col,dc*streak*sh*dop*3.4,clamp(inD*vis*min(1.,streak*sh*3.),0.,1.));',
        ' col+=vec3(1.,.5,.2)*inD*vis*sh*.3;',
        ' col*=1.-.35*r*r*4.; col=1.-exp(-col*1.3);',
        ' gl_FragColor=vec4(pow(col,vec3(.9)),1.);',
        '}'
      ].join('\n')
    });
  }
});

S({
  file: 'Кольца Сатурна', cat: 'Космос', mouse: true, tags: ['космос', 'планета'],
  desc: 'Газовый гигант с кольцами и спутником на фоне звёздного неба.',
  run: function () {
    var W, H, bg, tex, rnd = LW.rng(3);
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h;
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#05060f'); g.addColorStop(1, '#0c0a1c');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var r = LW.rng(4);
          for (var i = 0; i < 420; i++) {
            var s = r() < 0.08 ? 1.8 : 1; x.fillStyle = 'rgba(255,255,255,' + (0.15 + r() * 0.7) + ')'; x.fillRect(r() * w, r() * h, s, s);
          }
        });
        var R = Math.min(w, h) * 0.27;
        tex = LW.layer(R * 2, R * 2, function (x) {
          var cols = ['#e8d3a4', '#d6b985', '#f1e0bb', '#c9a56e', '#e3c991', '#bf9a63', '#ead7ad'];
          var y = 0, r = LW.rng(9);
          while (y < R * 2) {
            var hgt = R * (0.04 + r() * 0.12);
            x.fillStyle = cols[Math.floor(r() * cols.length)]; x.fillRect(0, y, R * 2, hgt + 1); y += hgt;
          }
          x.globalAlpha = 0.35;
          for (var i = 0; i < 40; i++) {
            x.fillStyle = r() < 0.5 ? '#fff4d8' : '#a67c45';
            x.beginPath(); x.ellipse(r() * R * 2, r() * R * 2, R * (0.1 + r() * 0.35), R * (0.004 + r() * 0.012), 0, 0, 7); x.fill();
          }
        });
      },
      frame: function (c, t) {
        c.drawImage(bg, 0, 0, W, H);
        var R = Math.min(W, H) * 0.27, px = W * 0.56 + (LW.M.ax / W - 0.5) * -18, py = H * 0.52 + (LW.M.ay / H - 0.5) * -12;
        var rings = [[1.28, 1.42, 0.35], [1.45, 1.62, 0.55], [1.64, 1.78, 0.28], [1.8, 2.05, 0.5], [2.07, 2.2, 0.22], [2.24, 2.36, 0.3]];
        function ring(front) {
          c.save(); c.translate(px, py); c.rotate(-0.33);
          for (var i = 0; i < rings.length; i++) {
            var ri = rings[i], mid = (ri[0] + ri[1]) / 2 * R, w = (ri[1] - ri[0]) * R;
            c.strokeStyle = 'rgba(' + (i % 2 ? '230,205,160' : '200,170,125') + ',' + ri[2] + ')';
            c.lineWidth = w; c.beginPath();
            c.ellipse(0, 0, mid, mid * 0.26, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
            c.stroke();
          }
          c.restore();
        }
        ring(false);
        // планета
        c.save(); c.beginPath(); c.arc(px, py, R, 0, Math.PI * 2); c.clip();
        c.drawImage(tex, px - R + ((t * 3) % 40) - 20 + 20, py - R, R * 2, R * 2);
        c.drawImage(tex, px - R + ((t * 3) % 40) - 20 + 20, py - R, R * 2, R * 2);
        var g = c.createRadialGradient(px - R * 0.45, py - R * 0.4, R * 0.1, px, py, R * 1.1);
        g.addColorStop(0, 'rgba(255,240,210,0.1)'); g.addColorStop(0.55, 'rgba(60,30,10,0.25)'); g.addColorStop(1, 'rgba(0,0,10,0.92)');
        c.fillStyle = g; c.fillRect(px - R, py - R, R * 2, R * 2);
        c.restore();
        ring(true);
        // спутник
        var ma = t * 0.12, mx = px + Math.cos(ma) * R * 3.1, my = py + Math.sin(ma) * R * 0.75 - R * 0.35;
        var mr = R * 0.1, mg = c.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 1, mx, my, mr);
        mg.addColorStop(0, '#f2efe8'); mg.addColorStop(1, '#4b4a52');
        c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
      }
    });
  }
});

S({
  file: 'Метеоритный дождь', cat: 'Космос', mouse: true, tags: ['космос', 'интерактив', 'ночь'],
  desc: 'Звездопад над горами. Клик запускает метеор в выбранную точку.',
  run: function () {
    var W, H, bg, stars = [], meteors = [], rnd = LW.rng(21), nextAt = 0, glowS;
    function spawn(tx, ty) {
      var ang = Math.PI * (0.78 + rnd() * 0.12), sp = 900 + rnd() * 700;
      var x = tx !== undefined ? tx + Math.cos(ang + Math.PI) * W * 0.5 : rnd() * W * 1.2 + W * 0.1;
      var y = ty !== undefined ? ty + Math.sin(ang + Math.PI) * W * 0.5 : -20 - rnd() * H * 0.25;
      meteors.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * -1 * -1, len: 140 + rnd() * 220, life: 0, max: 1.1 + rnd() * 0.8, h: 190 + rnd() * 40 });
    }
    LW.onClick(function (x, y) { for (var i = 0; i < 3; i++) spawn(x + (rnd() - 0.5) * 120, y + (rnd() - 0.5) * 60); });
    LW.run({
      type: '2d', fps: 30, mouse: true,
      init: function (c, w, h) {
        W = w; H = h; stars = [];
        for (var i = 0; i < 260; i++) stars.push({ x: rnd() * w, y: rnd() * h * 0.82, r: 0.4 + rnd() * 1.1, p: rnd() * 6.28, s: 0.5 + rnd() * 2 });
        glowS = LW.glow('150,200,255', 64);
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#050816'); g.addColorStop(0.6, '#141a4a'); g.addColorStop(0.9, '#33306e'); g.addColorStop(1, '#3a2a62');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          var mg = x.createRadialGradient(w * 0.7, h * 0.95, 0, w * 0.7, h * 0.95, w * 0.5);
          mg.addColorStop(0, 'rgba(255,150,140,0.4)'); mg.addColorStop(1, 'rgba(255,150,140,0)');
          x.fillStyle = mg; x.fillRect(0, 0, w, h);
          // Млечный путь: мягкая полоса и россыпь звёзд
          x.save(); x.translate(w * 0.45, h * 0.35); x.rotate(-0.5);
          var bgd = x.createLinearGradient(0, -h * 0.3, 0, h * 0.3);
          bgd.addColorStop(0, 'rgba(150,170,255,0)'); bgd.addColorStop(0.5, 'rgba(170,175,255,0.2)'); bgd.addColorStop(1, 'rgba(150,170,255,0)');
          x.fillStyle = bgd; x.fillRect(-w, -h * 0.3, w * 2, h * 0.6);
          var rm = LW.rng(8);
          for (var q = 0; q < 1800; q++) {
            var gx = (rm() - 0.5) * w * 1.6, gy = (rm() + rm() + rm() - 1.5) * h * 0.16;
            x.fillStyle = 'rgba(220,225,255,' + (0.1 + rm() * 0.45) + ')'; x.fillRect(gx, gy, 1.1, 1.1);
          }
          x.restore();
          for (var layer = 0; layer < 3; layer++) {
            var base = h * (0.8 + layer * 0.06), amp = h * (0.12 - layer * 0.025);
            x.fillStyle = ['#161a3c', '#0d1030', '#05060f'][layer];
            x.beginPath(); x.moveTo(0, h);
            for (var px = 0; px <= w; px += 6) x.lineTo(px, base - amp * (0.5 + 0.5 * LW.fbm(px / w * 3 + layer * 7, layer * 3.1, 4)) * 1.4);
            x.lineTo(w, h); x.fill();
          }
        });
      },
      frame: function (c, t, dt) {
        c.drawImage(bg, 0, 0, W, H);
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i]; c.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.65 * Math.abs(Math.sin(t * s.s + s.p))) + ')'; c.fillRect(s.x, s.y, s.r, s.r);
        }
        if (t > nextAt) { spawn(); nextAt = t + 0.35 + rnd() * 1.1; }
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        for (var k = meteors.length - 1; k >= 0; k--) {
          var m = meteors[k]; m.life += dt; m.x += m.vx * dt; m.y += m.vy * dt;
          var f = m.life / m.max; if (f >= 1 || m.y > H || m.x < -300) { meteors.splice(k, 1); continue; }
          var a = Math.sin(Math.PI * Math.min(1, f * 1.2));
          var sp = Math.hypot(m.vx, m.vy), tx = m.x - m.vx / sp * m.len, ty = m.y - m.vy / sp * m.len;
          var g = c.createLinearGradient(m.x, m.y, tx, ty);
          g.addColorStop(0, LW.hsl(m.h, 100, 92, a)); g.addColorStop(0.3, LW.hsl(m.h, 100, 70, a * 0.5)); g.addColorStop(1, LW.hsl(m.h, 100, 60, 0));
          c.strokeStyle = g; c.lineWidth = 3; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(tx, ty); c.stroke();
          c.globalAlpha = a; c.drawImage(glowS, m.x - 22, m.y - 22, 44, 44); c.globalAlpha = 1;
        }
        c.globalCompositeOperation = 'source-over';
      }
    });
  }
});

S({
  file: 'Северное сияние', cat: 'Космос', mouse: true, tags: ['природа', 'ночь', 'шейдер'],
  desc: 'Переливающиеся занавесы сияния над озером и заснеженными горами.',
  run: function () {
    LW.run({
      type: 'gl', fps: 30, glScale: 0.55, mouse: true,
      frag: [
        'vec3 sky(vec2 uv,float yy){',
        ' vec3 col=mix(vec3(.01,.03,.07),vec3(.0,.01,.04),clamp(uv.y*1.5,0.,1.));',
        ' col+=vec3(.01,.07,.06)*pow(1.-uv.y,3.);',
        ' float t=T*.18;',
        ' for(int i=0;i<4;i++){',
        '  float fi=float(i); float x=uv.x*(2.2+fi*.5)+fi*3.1;',
        '  float h=.52+.12*sin(x*1.3+t+fi)+.09*sin(x*2.7-t*1.3)+.1*(fbm(vec2(x*.7,t*.4+fi))-.5);',
        '  float rays=.25+.95*pow(vnoise(vec2(uv.x*(46.+fi*9.)+sin(t+fi)*3.,t*1.5)),1.6);',
        '  float d=uv.y-h; float body=exp(-pow(d/(.09+.04*fi*.3),2.))*(d<0.?1.:exp(-d*3.));',
        '  float lift=smoothstep(-.55,0.,d)*(d<0.?1.:exp(-d*2.));',
        '  vec3 c1=mix(vec3(.1,1.,.45),vec3(.1,.8,.9),clamp(d*4.+.4,0.,1.));',
        '  c1=mix(c1,vec3(.65,.25,.95),smoothstep(.05,.35,d));',
        '  col+=c1*body*rays*lift*(1.5-.2*fi)*(1.+A.x*1.);',
        ' }',
        ' vec2 sp=uv*vec2(R.x/R.y,1.)*110.; vec2 g=floor(sp),f=fract(sp)-.5; float h2=hash(g);',
        ' col+=vec3(.9)*smoothstep(.12,0.,length(f))*step(.965,h2)*(.5+.5*sin(T*2.+h2*40.))*smoothstep(.2,.6,uv.y);',
        ' return col; }',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/R; float wl=.27;',
        ' vec3 col;',
        ' float ridge=wl+.02+.09*fbm(vec2(uv.x*4.+1.3,0.))+.07*pow(fbm(vec2(uv.x*2.2,5.)),2.)*3.;',
        ' if(uv.y>wl){ col=sky(vec2(uv.x,(uv.y-wl)/(1.-wl)),0.); }',
        ' else { float ry=(wl-uv.y); vec2 q=vec2(uv.x+.006*sin(uv.y*160.+T*1.3)*(1.-ry*2.),(wl+ry*.9-wl)/(1.-wl));',
        '  col=sky(vec2(q.x,q.y),0.)*.55+vec3(0.,.01,.02); col*=1.-ry*1.6; }',
        ' // горы и их отражение',
        ' float rr=wl+(ridge-wl); float m=smoothstep(ridge+.003,ridge-.003,uv.y)*step(wl,uv.y);',
        ' vec3 snow=vec3(.05,.08,.12)+vec3(.0,.07,.04)*smoothstep(ridge-.08,ridge,uv.y)*1.2;',
        ' col=mix(col,snow*(.6+.5*fbm(uv*30.)),m);',
        ' float rm=smoothstep(wl-(ridge-wl)-.003,wl-(ridge-wl)+.003,uv.y)*step(uv.y,wl); col=mix(col,col*.3,1.-rm);',
        ' col*=1.-.4*dot(uv-.5,uv-.5)*2.;',
        ' gl_FragColor=vec4(pow(col,vec3(.92)),1.);',
        '}'
      ].join('\n')
    });
  }
});
