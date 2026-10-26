// Скриншоты интерфейса: node tools/uishot.js "<json сцен>"   [{name,query,js,w,h,wait}]
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const port = 9444, profile = path.join(process.env.TEMP, 'lw-ui-profile');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scenes = JSON.parse(process.argv[2] || '[{"name":"lib"}]');
const outDir = path.join(__dirname, 'uishots'); fs.mkdirSync(outDir, { recursive: true });
(async () => {
  const proc = cp.spawn(chrome, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--hide-scrollbars=false',
    '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', '--disable-web-security', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch('http://127.0.0.1:' + port + '/json/version'); break; } catch { await sleep(200); } }
  for (const sc of scenes) {
    const t = await (await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
    let id = 0; const pend = new Map(); const errs = [];
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description : d.params.exceptionDetails.text); else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(d.params.args.map((a) => a.value || a.description).join(' ')); };
    const send = (method, params) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: sc.w || 1440, height: sc.h || 900, deviceScaleFactor: 1, mobile: false });
    const fu = (p) => 'file:///' + p.split(path.sep).join('/');
    const url = fu(path.join(root, 'ui', 'index.html')) + '?mock=' + encodeURIComponent(fu(path.join(root, 'tools', 'mock-data.js'))) + (sc.query || '');
    await send('Page.navigate', { url });
    await sleep(sc.wait || 1800);
    if (sc.js) { const r = await send('Runtime.evaluate', { expression: sc.js, awaitPromise: true }); console.log('js ->', JSON.stringify(r.result && r.result.result && r.result.result.value)); if (r.result && r.result.exceptionDetails) errs.push('js: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); await sleep(sc.wait2 || 900); }
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, sc.name + '.png'), Buffer.from(shot.result.data, 'base64'));
    console.log(sc.name, errs.length ? 'ОШИБКИ: ' + errs.join(' | ') : 'ok');
    ws.close();
  }
  proc.kill();
})();
