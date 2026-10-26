// Управление интерфейсом запущенного приложения через DevTools (нужен запуск с WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9555 --remote-allow-origins=*")
// node tools/appui.js "<js>" [имя снимка] [url-часть, по умолчанию /ui/]
const fs = require('fs'), path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const expr = process.argv[2] || '1';
  const shot = process.argv[3];
  const part = process.argv[4] || '/ui/';
  const list = await (await fetch('http://127.0.0.1:9555/json')).json();
  const t = list.find((x) => x.url.includes(part));
  if (!t) { console.log('нет страницы', part, list.map((x) => x.url.slice(0, 80))); return; }
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  console.log(JSON.stringify(r.result.exceptionDetails ? r.result.exceptionDetails.exception : r.result.result.value));
  if (shot) {
    await sleep(900);
    const s = await send('Page.captureScreenshot', { format: 'png' });
    const dir = path.join(__dirname, 'uishots'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, shot + '.png'), Buffer.from(s.result.data, 'base64'));
  }
  ws.close();
})();
