// Сборка обоев: src/engine.js + src/scenes/*.js -> builtin/*.html и builtin/catalog.json
// Запуск: node tools/gen.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const out = path.join(root, 'builtin');
const engine = fs.readFileSync(path.join(root, 'src', 'engine.js'), 'utf8');
const scenes = [];
const artDir = path.join(root, 'builtin', 'art');
const sandbox = { S: (d) => scenes.push(d), console, ARTFILES: fs.existsSync(artDir) ? fs.readdirSync(artDir).sort() : [] };
vm.createContext(sandbox);
const dir = path.join(root, 'src', 'scenes');
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js')).sort())
  vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), sandbox, { filename: f });

fs.mkdirSync(out, { recursive: true });
const names = new Set();
const catalog = [];
for (const s of scenes) {
  if (names.has(s.file)) throw new Error('Дубликат: ' + s.file);
  names.add(s.file);
  const html = '<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><title>' + s.file +
    '</title><meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<style>html,body{margin:0;height:100%;overflow:hidden;background:#000;cursor:default}' +
    'canvas{display:block;position:fixed;left:0;top:0;width:100vw;height:100vh}</style></head><body>\n' +
    '<script>\n' + engine + '\n</script>\n<script>\n(' + s.run.toString() + ')();\n</script>\n</body></html>\n';
  fs.writeFileSync(path.join(out, s.file + '.html'), html, 'utf8');
  catalog.push({ file: s.file + '.html', name: s.file, cat: s.cat, desc: s.desc, tags: s.tags || [], audio: !!s.audio, mouse: !!s.mouse, clock: !!s.clock });
}
fs.writeFileSync(path.join(out, 'catalog.json'), JSON.stringify(catalog, null, 1), 'utf8');
fs.writeFileSync(path.join(out, 'version.txt'), Date.now().toString(36), 'utf8');
console.log('Обоев собрано: ' + scenes.length);
