// 巡检：在多个视口宽度下查横向溢出、图片裁切、字体回退。
// 用法：node scripts/audit.mjs
import { appendFileSync, writeFileSync } from 'node:fs';

const LOG = '/tmp/audit.log';
writeFileSync(LOG, '');
const log = (m) => appendFileSync(LOG, m + '\n');

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

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, pp) => send(m, pp, sessionId);

await s('Page.enable');
// 本地预览是 Python SimpleHTTP，只发 Last-Modified，没有 Cache-Control，
// 无头浏览器会按启发式缓存旧资源，导致改完样式截出来还是上一版。
await s('Network.enable'); await s('Network.setCacheDisabled', { cacheDisabled: true });
await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

const widths = [1440, 768, 390];
for (const w of widths) {
  await s('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 700 });
  await s('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await new Promise((r) => setTimeout(r, 2400));
  await s('Runtime.evaluate', {
    expression: `(async () => {
      document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
      await Promise.all(Array.from(document.images).map(i => i.decode().catch(() => {})));
      await document.fonts.ready;
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 400));
      window.scrollTo(0, 0);
    })()`, awaitPromise: true
  });

  const r = await s('Runtime.evaluate', {
    expression: `(() => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      document.querySelectorAll('body *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) return;
        if (b.right > vw + 1 || b.left < -1) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed') return;
          over.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className || '').slice(0, 42),
            left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width)
          });
        }
      });
      // 去重，保留最外侧的几个
      const seen = new Set();
      const uniq = over.filter(o => { const k = o.tag + o.cls; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);

      // 竖版影像卡是否被裁
      const frames = [...document.querySelectorAll('.film-frame')].map(f => {
        const img = f.querySelector('img');
        const b = f.getBoundingClientRect();
        const ib = img ? img.getBoundingClientRect() : null;
        return {
          portrait: f.classList.contains('is-portrait'),
          w: Math.round(b.width), h: Math.round(b.height),
          fit: img ? getComputedStyle(img).objectFit : null,
          clipped: ib ? (ib.right > vw + 1) : null
        };
      });

      // 大字是否掉了手写字体
      const bigChar = document.querySelector('.chapter-plate__char');
      const h2 = document.querySelector('.chapter-plate__copy h2');

      return JSON.stringify({
        vw,
        scrollW: document.documentElement.scrollWidth,
        bodyScrollW: document.body.scrollWidth,
        overflowing: uniq,
        frames,
        charFont: bigChar ? getComputedStyle(bigChar).fontFamily.slice(0, 40) : null,
        charSize: bigChar ? getComputedStyle(bigChar).fontSize : null,
        h2Font: h2 ? getComputedStyle(h2).fontFamily.slice(0, 40) : null
      }, null, 1);
    })()`,
    returnByValue: true
  });
  log(`===== ${w}px =====`);
  log(r.result.value);
}

process.exit(0);
