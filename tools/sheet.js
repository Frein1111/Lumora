// Контактный лист: node tools/sheet.js <фильтр> [страница] -> tools/sheet.jpg (сетка 3x3 из tools/shots)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const shots = process.env.SHOTDIR || path.join(root, 'tools', 'shots');
const filter = process.argv[2] || '';
const page = parseInt(process.argv[3] || '0', 10);
const files = fs.readdirSync(shots).filter((f) => f.endsWith('.jpg') && f.includes(filter)).sort().slice(page * 9, page * 9 + 9);
const html = '<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(3,640px);gap:4px">' +
  files.map((f) => '<div style="position:relative"><img width=640 height=360 src="file:///' + path.join(shots, f).replace(/\\/g, '/') + '"><span style="position:absolute;left:6px;top:4px;color:#fff;font:14px sans-serif;text-shadow:0 0 4px #000">' + f.replace('.jpg', '') + '</span></div>').join('') + '</body>';
const tmp = path.join(process.env.TEMP || '.', 'lw-sheet.html');
fs.writeFileSync(tmp, html);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const rows = Math.ceil(files.length / 3);
cp.spawnSync(chrome, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1936,' + (rows * 364), '--screenshot=' + path.join(root, 'tools', 'sheet.jpg'), 'file:///' + tmp.replace(/\\/g, '/')], { stdio: 'ignore' });
console.log(files.join(', '));
