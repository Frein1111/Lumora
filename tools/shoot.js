// Проверка обоев в Chrome: ошибки в консоли, время кадра, скриншоты и миниатюры.
// node tools/shoot.js [часть имени] [--full]    (полные кадры 1280x720 кладутся в папку из SHOTS)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const bdir = path.join(root, 'builtin');
const tdir = path.join(bdir, 'thumbs');
const shots = process.env.SHOTS || path.join(root, 'tools', 'shots');
const filter = process.argv.slice(2).filter((a) => !a.startsWith('--'))[0] || '';
const full = process.argv.includes('--full');
const WARM = process.env.WARM || 120;
fs.mkdirSync(tdir, { recursive: true }); fs.mkdirSync(shots, { recursive: true });
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const port = 9333, profile = path.join(process.env.TEMP || '.', 'lw-chrome-profile');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const proc = cp.spawn(chrome, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--mute-audio',
    '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch('http://127.0.0.1:' + port + '/json/version'); break; } catch { await sleep(200); } }

  const files = fs.readdirSync(bdir).filter((f) => f.endsWith('.html') && f.includes(filter)).sort();
  let bad = 0;
  for (const f of files) {
    const t = await (await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0; const pend = new Map(); const errors = [];
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
      else if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description : d.params.exceptionDetails.text);
      else if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'warning')) errors.push(d.params.args.map((a) => a.value || a.description).join(' '));
      else if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push(d.params.entry.text + ' ' + (d.params.entry.url || ''));
    };
    const send = (method, params) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    const url = 'file:///' + path.join(bdir, f).replace(/\\/g, '/') + '?demo=1&warm=' + WARM;
    await send('Page.navigate', { url: encodeURI(url).replace(/#/g, '%23') });
    await sleep(1500);
    // «Мышь»: движение и клик
    for (const [x, y] of [[300, 300], [500, 350], [700, 300]]) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await sleep(120); }
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 300, button: 'left', clickCount: 1, buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 300, button: 'left', buttons: 0 });
    await sleep(900);
    const r = await send('Runtime.evaluate', { expression: 'JSON.stringify({cost: (typeof LW!=="undefined" ? LW.cost : -1), n: (typeof LW!=="undefined"?LW.n:-1)})', returnByValue: true });
    const info = JSON.parse(r.result.result.value || '{}');
    const base = f.replace(/\.html$/, '');
    const th = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1280, height: 720, scale: 0.4 } });
    fs.writeFileSync(path.join(tdir, base + '.jpg'), Buffer.from(th.result.data, 'base64'));
    if (full) {
      const fl = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
      fs.writeFileSync(path.join(shots, base + '.jpg'), Buffer.from(fl.result.data, 'base64'));
    }
    const uniq = [...new Set(errors)];
    if (uniq.length || !(info.n > 0)) bad++;
    console.log((uniq.length || !(info.n > 0) ? 'FAIL ' : 'ok   ') + base + '  кадр ' + (info.cost || 0).toFixed(1) + ' мс, шагов ' + info.n + (uniq.length ? '\n     ' + uniq.join('\n     ') : ''));
    ws.close(); await fetch('http://127.0.0.1:' + port + '/json/close/' + t.id);
  }
  console.log('Проверено: ' + files.length + ', с ошибками: ' + bad);
  proc.kill();
  process.exit(bad ? 1 : 0);
})();
