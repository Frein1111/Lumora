// Лист превью по оценке: node tools/sheet2.js <от> <до> [имя.png]  (из tools/scores.json и tools/mock-data.js)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const scores = JSON.parse(fs.readFileSync(path.join(__dirname, 'scores.json'), 'utf8'));
const mock = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-data.js'), 'utf8').replace(/^window\.MOCK = /, '').replace(/;$/, ''));
const from = +process.argv[2] || 0, to = +process.argv[3] || 60, name = process.argv[4] || 'top.png';
const list = mock.items.filter((i) => scores[i.id] != null).sort((a, b) => scores[b.id] - scores[a.id]).slice(from, to);
const html = '<body style="margin:0;background:#111;color:#fff;font:12px Segoe UI;display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:6px;width:1800px">' +
  list.map((i, n) => '<div><img src="' + i.thumb + '" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block"><div>' + (from + n) + ' · ' + scores[i.id] + ' · ' + i.name.replace(/</g, '') + ' [' + i.type + ']</div></div>').join('') + '</body>';
const f = path.join(__dirname, 'sheet2.html'); fs.writeFileSync(f, html);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const h = Math.ceil(list.length / 6) * 215 + 20;
cp.spawnSync(chrome, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--window-size=1800,' + h, '--screenshot=' + path.join(__dirname, 'uishots', name), 'file:///' + f.split(path.sep).join('/')], { stdio: 'ignore', timeout: 60000 });
console.log('ok', list.length);
