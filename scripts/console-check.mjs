// 巡检：加载首页与一个详情页，收集控制台报错与失败请求。
// 用法：node scripts/console-check.mjs
import { appendFileSync, writeFileSync } from 'node:fs';

writeFileSync('/tmp/console.log', '');
const log = (m) => appendFileSync('/tmp/console.log', m + '\n');

const v = await (await fetch('http://127.0.0.1:9222/json/version')).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const p = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && p.has(m.id)) {
    m.error ? p.get(m.id).rej(new Error(JSON.stringify(m.error))) : p.get(m.id).res(m.result);
    p.delete(m.id);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((res, rej) => { const i = ++id; p.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

const pages = ['http://127.0.0.1:4173/', 'http://127.0.0.1:4173/work.html?id=caoyu-qiwei'];

for (const url of pages) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, pp) => send(m, pp, sessionId);

  const errors = [];
  const failed = [];

  await s('Runtime.enable');
  await s('Log.enable');
  await s('Network.enable');
  await s('Page.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // 这些事件通过全局 ws 分发，按 sessionId 过滤
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    }
    if (m.method === 'Network.loadingFailed' && !m.params.errorText.includes('ERR_ABORTED')) {
      failed.push(m.params.errorText);
    }
  });

  await s('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 3000));
  await s('Runtime.evaluate', {
    expression: `(async () => {
      document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
      await Promise.all(Array.from(document.images).map(i => i.decode().catch(() => {})));
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 500));
      window.scrollTo(0, 0);
    })()`, awaitPromise: true
  });

  const counts = await s('Runtime.evaluate', {
    expression: `JSON.stringify({
      sections: document.querySelectorAll('section[id]').length,
      works: document.querySelectorAll('[data-category]').length,
      brokenImg: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc.split('/').pop())
    })`, returnByValue: true
  });

  log(`===== ${url}`);
  log('  ' + counts.result.value);
  log('  errors: ' + (errors.length ? JSON.stringify(errors) : '无'));
  log('  failedRequests: ' + (failed.length ? JSON.stringify([...new Set(failed)]) : '无'));

  await send('Target.closeTarget', { targetId });
}

process.exit(0);
