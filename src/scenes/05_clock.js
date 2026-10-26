// ---------- Часы и дата ----------
S({
  file: 'Минимализм', cat: 'Часы', clock: true, tags: ['часы', 'дата', 'минимализм'],
  desc: 'Огромное тонкое время и дата на мягком переливающемся градиенте. Цвет зависит от времени суток.',
  run: function () {
    var W, H, blobs = [], rnd = LW.rng(5);
    LW.run({
      type: '2d', fps: 15, clock: true,
      init: function (c, w, h) { W = w; H = h; blobs = []; for (var i = 0; i < 5; i++) blobs.push({ x: rnd(), y: rnd(), r: 0.35 + rnd() * 0.3, p: rnd() * 6, h: rnd() * 60 }); },
      frame: function (c, t) {
        var C = LW.clock, base = 205 + (C.hf / 24) * 110;
        var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, LW.hsl(base, 55, 14)); g.addColorStop(1, LW.hsl(base + 50, 55, 24)); c.fillStyle = g; c.fillRect(0, 0, W, H);
        for (var i = 0; i < blobs.length; i++) {
          var b = blobs[i], bx = (b.x + Math.sin(t * 0.05 + b.p) * 0.15) * W, by = (b.y + Math.cos(t * 0.04 + b.p) * 0.15) * H, r = b.r * Math.max(W, H);
          var rg = c.createRadialGradient(bx, by, 0, bx, by, r); rg.addColorStop(0, LW.hsl(base + b.h, 70, 50, 0.22)); rg.addColorStop(1, LW.hsl(base + b.h, 70, 50, 0)); c.fillStyle = rg; c.fillRect(0, 0, W, H);
        }
        c.textAlign = 'center'; c.textBaseline = 'middle';
        var fs = Math.min(W * 0.3, H * 0.46);
        c.font = '200 ' + fs + 'px "Segoe UI Light","Segoe UI",sans-serif'; c.fillStyle = 'rgba(255,255,255,0.95)';
        var wH = c.measureText('00').width, wC = c.measureText(':').width, x0 = W / 2 - (wH * 2 + wC) / 2;
        c.textAlign = 'left'; c.fillText(LW.pad(C.h), x0, H * 0.46); c.fillText(LW.pad(C.m), x0 + wH + wC, H * 0.46);
        c.fillStyle = 'rgba(255,255,255,' + (C.s % 2 === 0 ? 0.95 : 0.25) + ')'; c.fillText(':', x0 + wH, H * 0.46 - fs * 0.03); c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,0.95)';
        c.font = '300 ' + (fs * 0.17) + 'px "Segoe UI",sans-serif'; c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillText(C.full, W / 2, H * 0.46 + fs * 0.62);
        // секундная линия
        c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(W * 0.3, H * 0.9, W * 0.4, 2); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(W * 0.3, H * 0.9, W * 0.4 * (C.sf / 60), 2);
      }
    });
  }
});

S({
  file: 'Аналоговые часы', cat: 'Часы', clock: true, tags: ['часы', 'стрелки', 'классика'],
  desc: 'Изящный циферблат с плавной секундной стрелкой и окошком даты.',
  run: function () {
    var W, H, bg, face;
    LW.run({
      type: '2d', fps: 30, clock: true,
      init: function (c, w, h) {
        W = w; H = h;
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0e1a3a'); g.addColorStop(1, '#1d6a7a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
          x.filter = 'blur(' + Math.round(h * 0.05) + 'px)'; var r = LW.rng(8), cols = ['rgba(255,150,200,0.25)', 'rgba(120,200,255,0.25)', 'rgba(180,140,255,0.25)'];
          for (var i = 0; i < 6; i++) { x.fillStyle = cols[i % 3]; x.beginPath(); x.arc(r() * w, r() * h, h * (0.15 + r() * 0.2), 0, 7); x.fill(); } x.filter = 'none';
        });
        var R = Math.min(w, h) * 0.38;
        face = LW.layer(R * 2.4, R * 2.4, function (x) {
          x.translate(R * 1.2, R * 1.2);
          x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = R * 0.12; x.shadowOffsetY = R * 0.04;
          var fg = x.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R); fg.addColorStop(0, '#fbfbfd'); fg.addColorStop(1, '#dfe3ec'); x.fillStyle = fg; x.beginPath(); x.arc(0, 0, R, 0, 7); x.fill();
          x.shadowColor = 'transparent'; x.strokeStyle = '#2a3350'; x.lineWidth = R * 0.03; x.beginPath(); x.arc(0, 0, R * 0.97, 0, 7); x.stroke();
          for (var i = 0; i < 60; i++) {
            var a = i / 60 * 6.2832, big = i % 5 === 0; x.strokeStyle = '#1b2240'; x.lineWidth = big ? R * 0.026 : R * 0.01; x.beginPath();
            x.moveTo(Math.cos(a) * R * (big ? 0.82 : 0.89), Math.sin(a) * R * (big ? 0.82 : 0.89)); x.lineTo(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.94); x.stroke();
          }
          x.fillStyle = '#1b2240'; x.font = '500 ' + (R * 0.17) + 'px "Segoe UI",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
          for (var n = 1; n <= 12; n++) { var an = n / 12 * 6.2832 - Math.PI / 2; x.fillText(n, Math.cos(an) * R * 0.68, Math.sin(an) * R * 0.68); }
        });
      },
      frame: function (c, t) {
        var C = LW.clock, R = Math.min(W, H) * 0.38, cx = W / 2, cy = H / 2;
        c.drawImage(bg, 0, 0, W, H);
        c.drawImage(face, cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
        // окошко даты
        c.fillStyle = '#fff'; LW.roundRect(c, cx + R * 0.28, cy - R * 0.07, R * 0.26, R * 0.14, R * 0.02); c.fill(); c.strokeStyle = '#2a3350'; c.lineWidth = 1; c.stroke();
        c.fillStyle = '#1b2240'; c.font = '600 ' + (R * 0.1) + 'px "Segoe UI",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(C.day, cx + R * 0.41, cy + 1);
        c.font = '500 ' + (R * 0.09) + 'px "Segoe UI",sans-serif'; c.fillStyle = '#4a5578'; c.fillText(LW.ruDays[C.wd].toUpperCase().slice(0, 3) + ' · ' + LW.ruMonths[C.mon].toUpperCase().slice(0, 3), cx, cy + R * 0.38);
        function hand(ang, len, w, col, tail) {
          c.save(); c.translate(cx, cy); c.rotate(ang); c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = R * 0.03; c.shadowOffsetX = R * 0.01; c.shadowOffsetY = R * 0.015;
          c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, tail); c.lineTo(0, -len); c.stroke(); c.restore();
        }
        hand(C.hf / 12 * 6.2832 % 6.2832, R * 0.5, R * 0.05, '#1b2240', R * 0.08);
        hand(C.mf / 60 * 6.2832, R * 0.78, R * 0.032, '#1b2240', R * 0.1);
        hand(C.sf / 60 * 6.2832, R * 0.86, R * 0.012, '#e0364b', R * 0.16);
        c.fillStyle = '#e0364b'; c.beginPath(); c.arc(cx, cy, R * 0.035, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, R * 0.012, 0, 7); c.fill();
      }
    });
  }
});

S({
  file: 'Неоновые часы', cat: 'Часы', clock: true, tags: ['часы', 'неон', 'дата'],
  desc: 'Яркая неоновая вывеска с временем и датой, лёгкое мерцание и отражение на полу.',
  run: function () {
    var W, H, bg;
    LW.run({
      type: '2d', fps: 12, clock: true,
      init: function (c, w, h) {
        W = w; H = h;
        bg = LW.layer(w, h, function (x) {
          x.fillStyle = '#0a0812'; x.fillRect(0, 0, w, h);
          var bh = h * 0.055, bw = h * 0.12, r = LW.rng(4);
          for (var y = 0, row = 0; y < h * 0.8; y += bh, row++) for (var xx = -(row % 2) * bw / 2; xx < w; xx += bw) { var s = 14 + Math.round(r() * 14); x.fillStyle = 'rgb(' + (s + 6) + ',' + s + ',' + (s + 12) + ')'; x.fillRect(xx + 1.5, y + 1.5, bw - 3, bh - 3); }
          var fl = x.createLinearGradient(0, h * 0.8, 0, h); fl.addColorStop(0, '#15101e'); fl.addColorStop(1, '#07050c'); x.fillStyle = fl; x.fillRect(0, h * 0.8, w, h * 0.2);
          var vg = x.createRadialGradient(w / 2, h * 0.4, h * 0.2, w / 2, h * 0.4, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.85)'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
        });
      },
      frame: function (c, t) {
        var C = LW.clock; c.drawImage(bg, 0, 0, W, H);
        var fs = Math.min(W * 0.26, H * 0.38), flick = (Math.sin(t * 17) > 0.985 || Math.sin(t * 7.3) > 0.995) ? 0.55 : 1;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        function neon(text, x, y, size, rgb, font) {
          c.font = font.replace('$', size);
          c.shadowColor = 'rgba(' + rgb + ',1)'; c.shadowBlur = size * 0.35; c.fillStyle = 'rgba(' + rgb + ',' + 0.5 * flick + ')'; c.fillText(text, x, y);
          c.shadowBlur = size * 0.12; c.fillStyle = 'rgba(' + rgb + ',' + 0.9 * flick + ')'; c.fillText(text, x, y);
          c.shadowBlur = 0; c.fillStyle = 'rgba(255,240,250,' + flick + ')'; c.fillText(text, x, y);
        }
        var time = LW.pad(C.h) + ((C.s % 2) ? ' ' : ':') + LW.pad(C.m);
        neon(time, W / 2, H * 0.4, fs, '255,50,160', '700 $px "Bahnschrift","Segoe UI",sans-serif');
        neon(C.full, W / 2, H * 0.4 + fs * 0.7, fs * 0.2, '60,230,255', '500 $px "Segoe Script","Segoe UI",sans-serif');
        // отражение на полу
        c.save(); c.globalAlpha = 0.16; c.translate(0, H * 0.8 * 2 - H * 0.05); c.scale(1, -1); c.font = '700 ' + fs + 'px "Bahnschrift","Segoe UI",sans-serif'; c.fillStyle = 'rgba(255,50,160,1)'; c.fillText(time, W / 2, H * 0.4 + H * 0.0); c.restore();
        c.globalAlpha = 1;
      }
    });
  }
});

S({
  file: 'Матрица-часы', cat: 'Часы', clock: true, tags: ['часы', 'матрица', 'код'],
  desc: 'Цифровой дождь, из которого проступают цифры текущего времени.',
  run: function () {
    var SIZE = 18, W, H, cols, rows, drops, mask, mchar = [], mc, mx, last = '', CH = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>=+*';
    var rnd = LW.rng(2);
    function rebuild(C) {
      var txt = LW.pad(C.h) + ':' + LW.pad(C.m); last = txt;
      mc.width = cols; mc.height = rows; mx.clearRect(0, 0, cols, rows); mx.fillStyle = '#fff'; mx.textAlign = 'center'; mx.textBaseline = 'middle';
      var fs = Math.min(rows * 0.62, cols * 0.3); mx.font = '700 ' + fs + 'px "Consolas","Courier New",monospace'; mx.fillText(txt, cols / 2, rows * 0.45);
      mx.font = '700 ' + (fs * 0.28) + 'px "Consolas","Courier New",monospace'; mx.fillText(C.date.toUpperCase(), cols / 2, rows * 0.45 + fs * 0.72);
      var d = mx.getImageData(0, 0, cols, rows).data; mask = new Uint8Array(cols * rows); mchar = new Array(cols * rows);
      for (var i = 0; i < mask.length; i++) mask[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    }
    LW.run({
      type: '2d', fps: 20, clock: true,
      init: function (c, w, h) {
        W = w; H = h; cols = Math.ceil(w / SIZE); rows = Math.ceil(h / SIZE); mc = document.createElement('canvas'); mx = mc.getContext('2d'); last = '';
        drops = []; for (var i = 0; i < cols; i++) drops.push(rnd() * -rows);
        c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
      },
      frame: function (c, t) {
        var C = LW.clock; if (LW.pad(C.h) + ':' + LW.pad(C.m) !== last) rebuild(C);
        c.fillStyle = 'rgba(0,6,2,0.13)'; c.fillRect(0, 0, W, H);
        c.font = '700 ' + SIZE + 'px "Consolas","MS Gothic",monospace'; c.textBaseline = 'top';
        for (var i = 0; i < cols; i++) {
          var row = Math.floor(drops[i]);
          if (row >= 0 && row < rows) {
            var ch = CH.charAt(Math.floor(rnd() * CH.length)), inMask = mask[row * cols + i];
            c.fillStyle = inMask ? '#e8fff0' : (rnd() > 0.96 ? '#d8ffe0' : '#19d95e'); c.fillText(ch, i * SIZE, row * SIZE);
          }
          drops[i] += 0.55 + (i % 7) * 0.05; if (drops[i] > rows + 8 && rnd() > 0.96) drops[i] = rnd() * -12;
        }
        // цифры времени складываются из символов, которые иногда меняются
        for (var m = 0; m < mask.length; m++) {
          if (!mask[m]) continue;
          if (!mchar[m] || rnd() < 0.04) mchar[m] = CH.charAt(Math.floor(rnd() * CH.length));
          c.fillStyle = rnd() < 0.05 ? 'rgba(255,255,255,0.95)' : 'rgba(150,255,190,0.85)'; c.fillText(mchar[m], (m % cols) * SIZE, Math.floor(m / cols) * SIZE);
        }
      }
    });
  }
});

S({
  file: 'Календарь и время', cat: 'Часы', clock: true, tags: ['часы', 'календарь', 'дата'],
  desc: 'Время слева, календарь текущего месяца справа с подсвеченным сегодняшним днём.',
  run: function () {
    var W, H, bg;
    LW.run({
      type: '2d', fps: 4, clock: true,
      init: function (c, w, h) {
        W = w; H = h;
        bg = LW.layer(w, h, function (x) {
          var g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#171a3a'); g.addColorStop(1, '#3a1f4f'); x.fillStyle = g; x.fillRect(0, 0, w, h);
          x.filter = 'blur(' + Math.round(h * 0.06) + 'px)'; x.fillStyle = 'rgba(90,140,255,0.28)'; x.beginPath(); x.arc(w * 0.15, h * 0.9, h * 0.35, 0, 7); x.fill();
          x.fillStyle = 'rgba(255,100,170,0.22)'; x.beginPath(); x.arc(w * 0.85, h * 0.1, h * 0.3, 0, 7); x.fill(); x.filter = 'none';
        });
      },
      frame: function (c, t) {
        var C = LW.clock; c.drawImage(bg, 0, 0, W, H);
        c.textAlign = 'left'; c.textBaseline = 'alphabetic'; var fs = Math.min(W * 0.17, H * 0.26);
        c.fillStyle = '#fff'; c.font = '200 ' + fs + 'px "Segoe UI Light","Segoe UI",sans-serif'; c.fillText(C.hm, W * 0.07, H * 0.52);
        c.font = '300 ' + (fs * 0.22) + 'px "Segoe UI",sans-serif'; c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillText(LW.pad(C.s) + ' сек', W * 0.07 + 4, H * 0.52 + fs * 0.3);
        c.font = '600 ' + (fs * 0.28) + 'px "Segoe UI",sans-serif'; c.fillStyle = '#fff'; c.fillText(LW.ruDays[C.wd].charAt(0).toUpperCase() + LW.ruDays[C.wd].slice(1), W * 0.07, H * 0.52 + fs * 0.75);
        c.font = '300 ' + (fs * 0.2) + 'px "Segoe UI",sans-serif'; c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillText(C.date + ' ' + C.year, W * 0.07, H * 0.52 + fs * 1.05);
        // календарь
        var cw = Math.min(W * 0.36, H * 0.62), cx = W * 0.93 - cw, cy = H * 0.5 - cw * 0.48, cell = cw / 7;
        c.fillStyle = 'rgba(255,255,255,0.08)'; LW.roundRect(c, cx - cell * 0.5, cy - cell * 1.5, cw + cell, cell * 9.4, cell * 0.4); c.fill();
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = '600 ' + (cell * 0.5) + 'px "Segoe UI",sans-serif'; c.fillText(LW.ruMonthsNom[C.mon] + ' ' + C.year, cx + cw / 2, cy - cell * 0.7);
        var heads = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']; c.font = '500 ' + (cell * 0.34) + 'px "Segoe UI",sans-serif';
        for (var i = 0; i < 7; i++) { c.fillStyle = i > 4 ? '#ff8aa8' : 'rgba(255,255,255,0.55)'; c.fillText(heads[i], cx + cell * (i + 0.5), cy + cell * 0.3); }
        var first = (new Date(C.year, C.mon, 1).getDay() + 6) % 7, days = new Date(C.year, C.mon + 1, 0).getDate();
        for (var d = 1; d <= days; d++) {
          var idx = first + d - 1, col = idx % 7, row = Math.floor(idx / 7), px = cx + cell * (col + 0.5), py = cy + cell * (row + 1.45);
          if (d === C.day) { c.fillStyle = '#7a8cff'; c.beginPath(); c.arc(px, py, cell * 0.42, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '700 ' + (cell * 0.4) + 'px "Segoe UI",sans-serif'; }
          else { c.fillStyle = col > 4 ? '#ff9cb6' : 'rgba(255,255,255,0.88)'; c.font = '400 ' + (cell * 0.4) + 'px "Segoe UI",sans-serif'; }
          c.fillText(d, px, py + 1);
        }
      }
    });
  }
});

S({
  file: 'Время словами', cat: 'Часы', clock: true, tags: ['часы', 'типографика', 'текст'],
  desc: 'Время человеческим языком: «без десяти три», «половина пятого». Красивая типографика на плавном фоне.',
  run: function () {
    var W, H, shown = '', prev = '', fade = 1;
    var H12 = ['двенадцать часов', 'час', 'два часа', 'три часа', 'четыре часа', 'пять часов', 'шесть часов', 'семь часов', 'восемь часов', 'девять часов', 'десять часов', 'одиннадцать часов'];
    var NOM = ['двенадцать', 'час', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать'];
    var ORD = ['первого', 'второго', 'третьего', 'четвёртого', 'пятого', 'шестого', 'седьмого', 'восьмого', 'девятого', 'десятого', 'одиннадцатого', 'двенадцатого'];
    var CARD = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать', 'двадцать', 'двадцать одна', 'двадцать две', 'двадцать три', 'двадцать четыре', 'двадцать пять', 'двадцать шесть', 'двадцать семь', 'двадцать восемь', 'двадцать девять'];
    var GEN = { 1: 'без одной минуты', 2: 'без двух минут', 3: 'без трёх минут', 4: 'без четырёх минут', 5: 'без пяти', 6: 'без шести минут', 7: 'без семи минут', 8: 'без восьми минут', 9: 'без девяти минут', 10: 'без десяти', 11: 'без одиннадцати', 12: 'без двенадцати', 13: 'без тринадцати', 14: 'без четырнадцати', 15: 'без четверти', 16: 'без шестнадцати', 17: 'без семнадцати', 18: 'без восемнадцати', 19: 'без девятнадцати', 20: 'без двадцати', 21: 'без двадцати одной минуты', 22: 'без двадцати двух минут', 23: 'без двадцати трёх минут', 24: 'без двадцати четырёх минут', 25: 'без двадцати пяти', 26: 'без двадцати шести минут', 27: 'без двадцати семи минут', 28: 'без двадцати восьми минут', 29: 'без двадцати девяти минут' };
    function mw(n) { var d = n % 10; return (d === 1 && n !== 11) ? 'минута' : (d >= 2 && d <= 4 && (n < 12 || n > 14)) ? 'минуты' : 'минут'; }
    function phrase(h, m) {
      var h12 = h % 12, nxt = (h + 1) % 12;
      if (m === 0) return H12[h12];
      if (m === 15) return 'четверть ' + ORD[h12];
      if (m === 30) return 'половина ' + ORD[h12];
      if (m < 30) return CARD[m] + ' ' + mw(m) + ' ' + ORD[h12];
      return GEN[60 - m] + ' ' + NOM[nxt];
    }
    function part(h) { return h < 4 ? 'ночи' : h < 12 ? 'утра' : h < 18 ? 'дня' : 'вечера'; }
    function wrap(c, text, max) { var words = text.split(' '), lines = [], cur = ''; for (var i = 0; i < words.length; i++) { var test = cur ? cur + ' ' + words[i] : words[i]; if (c.measureText(test).width > max && cur) { lines.push(cur); cur = words[i]; } else cur = test; } lines.push(cur); return lines; }
    LW.run({
      type: '2d', fps: 20, clock: true,
      init: function (c, w, h) { W = w; H = h; shown = ''; },
      frame: function (c, t, dt) {
        var C = LW.clock, ph = phrase(C.h, C.m);
        if (ph !== shown) { prev = shown; shown = ph; fade = 0; }
        fade = Math.min(1, fade + dt * 1.6);
        var hue = 215 + (C.hf / 24) * 120;
        var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, LW.hsl(hue, 45, 13)); g.addColorStop(1, LW.hsl(hue + 40, 50, 20)); c.fillStyle = g; c.fillRect(0, 0, W, H);
        var rg = c.createRadialGradient(W * 0.8, H * 0.2, 0, W * 0.8, H * 0.2, W * 0.6); rg.addColorStop(0, LW.hsl(hue + 30, 80, 55, 0.22)); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
        var fs = Math.min(W * 0.075, H * 0.13), left = W * 0.09;
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        c.font = '300 ' + (fs * 0.42) + 'px "Segoe UI",sans-serif'; c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText('СЕЙЧАС', left, H * 0.3);
        c.font = '600 ' + fs + 'px "Segoe UI",sans-serif';
        var lines = wrap(c, shown, W * 0.78), y = H * 0.3 + fs * 1.15;
        for (var i = 0; i < lines.length; i++) {
          var a = LW.clamp(fade * 2 - i * 0.25, 0, 1), off = (1 - a) * fs * 0.3;
          c.fillStyle = i === lines.length - 1 && lines.length > 1 ? LW.hsl(hue + 30, 90, 75, a) : 'rgba(255,255,255,' + a + ')'; c.fillText(lines[i], left, y + i * fs * 1.12 + off);
        }
        c.font = '300 ' + (fs * 0.42) + 'px "Segoe UI",sans-serif'; c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText(part(C.h), left, y + lines.length * fs * 1.12 + fs * 0.1);
        c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,0.45)'; c.font = '300 ' + (fs * 0.4) + 'px "Segoe UI",sans-serif'; c.fillText(C.hm + ' · ' + C.full, W * 0.93, H * 0.92);
      }
    });
  }
});

S({
  file: 'Флип-часы', cat: 'Часы', clock: true, tags: ['часы', 'ретро', 'флип'],
  desc: 'Классические перекидные часы с анимацией переворота карточек.',
  run: function () {
    var W, H, st = [], bg;
    function slot(i) { return st[i] || (st[i] = { cur: -1, prev: -1, p: 1 }); }
    LW.run({
      type: '2d', fps: 30, clock: true,
      init: function (c, w, h) {
        W = w; H = h;
        bg = LW.layer(w, h, function (x) { var g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7); g.addColorStop(0, '#2a2d38'); g.addColorStop(1, '#0e0f14'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
      },
      frame: function (c, t, dt) {
        var C = LW.clock; c.drawImage(bg, 0, 0, W, H);
        var digits = [Math.floor(C.h / 10), C.h % 10, Math.floor(C.m / 10), C.m % 10];
        var cw = Math.min(W * 0.18, H * 0.34), ch = cw * 1.35, gap = cw * 0.1, groupGap = cw * 0.38, total = cw * 4 + gap * 2 + groupGap, x0 = (W - total) / 2, y0 = H * 0.5 - ch / 2 - H * 0.03;
        for (var i = 0; i < 4; i++) {
          var s = slot(i), d = digits[i];
          if (s.cur !== d) { s.prev = s.cur < 0 ? d : s.cur; s.cur = d; s.p = s.prev === d ? 1 : 0; }
          s.p = Math.min(1, s.p + dt * 2.4);
          var x = x0 + i * (cw + gap) + (i >= 2 ? groupGap - gap : 0);
          drawCard(c, x, y0, cw, ch, s);
        }
        c.fillStyle = '#e9e9ee'; var ds = cw * 0.09, cxm = x0 + cw * 2 + gap * 1.5 + groupGap * 0.5 + (0); c.beginPath(); c.arc(x0 + cw * 2 + gap + (groupGap) / 2 + gap * 0.0 - 0, y0 + ch * 0.36, ds, 0, 7); c.fill(); c.beginPath(); c.arc(x0 + cw * 2 + gap + (groupGap) / 2, y0 + ch * 0.64, ds, 0, 7); c.fill();
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = '400 ' + (cw * 0.2) + 'px "Segoe UI",sans-serif'; c.fillText(C.full + '  ·  ' + LW.pad(C.s) + ' с', W / 2, y0 + ch + cw * 0.3);
        function drawCard(c, x, y, w, h, s) {
          var r = w * 0.08, half = h / 2, f = '700 ' + (h * 0.78) + 'px "Bahnschrift","Segoe UI",sans-serif';
          function half_(top, digit, scale) {
            c.save(); c.beginPath(); if (top) c.rect(x - 1, y, w + 2, half); else c.rect(x - 1, y + half, w + 2, half); c.clip();
            var cy = top ? y + half : y + half; c.translate(0, cy); c.scale(1, scale); c.translate(0, -cy);
            var g = c.createLinearGradient(0, y, 0, y + h); if (top) { g.addColorStop(0, '#34363f'); g.addColorStop(1, '#25262d'); } else { g.addColorStop(0, '#1f2026'); g.addColorStop(1, '#2b2d35'); }
            c.fillStyle = g; LW.roundRect(c, x, y, w, h, r); c.fill();
            c.fillStyle = '#f1f1f4'; c.font = f; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(digit, x + w / 2, y + h * 0.54);
            c.restore();
          }
          c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = w * 0.1; c.shadowOffsetY = w * 0.04; c.fillStyle = '#000'; LW.roundRect(c, x, y, w, h, r); c.fill(); c.restore();
          if (s.p >= 1) { half_(true, s.cur, 1); half_(false, s.cur, 1); }
          else {
            half_(true, s.cur, 1); half_(false, s.prev, 1);
            if (s.p < 0.5) half_(true, s.prev, 1 - s.p * 2); else half_(false, s.cur, (s.p - 0.5) * 2);
          }
          c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(x, y + half - 1.5, w, 3);
        }
      }
    });
  }
});

S({
  file: 'Терминал', cat: 'Часы', clock: true, tags: ['часы', 'ретро', 'терминал', 'хакер'],
  desc: 'Зелёный ЭЛТ-монитор: строки печатаются, бежит индикатор нагрузки, время и дата обновляются.',
  run: function () {
    var W, H, scan, lines = [], typed = 0, lastKey = '', rnd = LW.rng(4);
    LW.run({
      type: '2d', fps: 20, clock: true,
      init: function (c, w, h) {
        W = w; H = h; typed = 0;
        scan = LW.layer(w, h, function (x) {
          for (var y = 0; y < h; y += 3) { x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(0, y, w, 1.2); }
          var vg = x.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
        });
      },
      frame: function (c, t, dt) {
        var C = LW.clock; c.fillStyle = '#021008'; c.fillRect(0, 0, W, H);
        var fs = Math.max(14, Math.min(H * 0.032, W * 0.017)), lh = fs * 1.45, x0 = W * 0.06, y0 = H * 0.09, G = '#37ff8b';
        c.font = fs + 'px "Consolas","Courier New",monospace'; c.textAlign = 'left'; c.textBaseline = 'top';
        var cpu = Math.round(30 + 25 * LW.noise(t * 0.3, 1) + 20 * Math.sin(t * 0.7)), mem = Math.round(55 + 12 * LW.noise(t * 0.1, 7));
        function bar(v, n) { var k = Math.round(v / 100 * n); return '[' + new Array(k + 1).join('█') + new Array(n - k + 1).join('░') + '] ' + v + '%'; }
        var all = [
          ['LIVEWALL TERMINAL v2.0', 1], ['(c) Живые обои. Все системы в норме.', 0.6], ['', 0],
          ['> date', 1], ['  ' + C.full + ' ' + C.year, 1], ['> time', 1], ['  ' + LW.pad(C.h) + ':' + LW.pad(C.m) + ':' + LW.pad(C.s), 1.2], ['', 0],
          ['> status', 1], ['  CPU  ' + bar(cpu, 24), 1], ['  MEM  ' + bar(mem, 24), 1], ['  NET  ' + bar(Math.round(20 + 40 * Math.abs(Math.sin(t * 0.4))), 24), 1], ['', 0],
          ['> wallpaper --mode live', 1], ['  render: ok · fps: ' + Math.round(1000 / Math.max(33, 33)) + ' · sleep when covered: on', 0.8], ['', 0], ['> _', 1]
        ];
        typed += dt * 55; var total = 0;
        for (var i = 0; i < all.length; i++) {
          var text = all[i][0], shown = Math.max(0, Math.min(text.length, Math.floor(typed - total))); total += text.length + 2;
          if (i === all.length - 1) text = '> ' + (Math.floor(t * 2) % 2 ? '█' : ' ');
          else text = text.slice(0, shown);
          var big = i === 6; c.font = (big ? fs * 1.9 : fs) + 'px "Consolas","Courier New",monospace';
          c.shadowColor = G; c.shadowBlur = 8; c.fillStyle = all[i][1] < 1 && !big ? 'rgba(55,255,139,0.6)' : G;
          c.fillText(text, x0, y0 + i * lh + (i > 6 ? fs * 0.9 : 0));
        }
        c.shadowBlur = 0;
        c.drawImage(scan, 0, 0, W, H);
        c.fillStyle = 'rgba(55,255,139,' + (0.015 + 0.01 * Math.sin(t * 40)) + ')'; c.fillRect(0, 0, W, H);
      }
    });
  }
});
