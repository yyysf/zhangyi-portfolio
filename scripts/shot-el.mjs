// 开发用：按选择器截取单个区块（可超过一屏）。
// 本机无头 Chrome 一次性截高视口会在 Page.captureScreenshot 挂住（实测 >1400px），
// 所以这里把视口固定在 1200px，逐片滚动截取，再交给 stitch.py 拼回整张。
// 用法：node scripts/shot-el.mjs <url> <selector> <out.png> [width] [padY] [scale]
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

const LOG = process.env.SHOT_EL_LOG;
const log = (m) => { if (LOG) appendFileSync(LOG, m + '\n'); };

const url = process.argv[2];
const selector = process.argv[3];
const out = process.argv[4] || 'el.png';
const width = Number(process.argv[5] || 1440);
const padY = Number(process.argv[6] || 0);
const scale = Number(process.argv[7] || 1);
const TILE = 1200;
const MAX_H = 9000;

const version = await (await fetch('http://127.0.0.1:9222/json/version')).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve: res, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : res(msg.result);
  }
});
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

const send = (method, params = {}, sessionId) =>
  new Promise((res, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve: res, reject });
    ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);

await s('Page.enable');
// 本地预览是 Python SimpleHTTP，只发 Last-Modified，没有 Cache-Control，
// 无头浏览器会按启发式缓存旧资源，导致改完样式截出来还是上一版。
await s('Network.enable'); await s('Network.setCacheDisabled', { cacheDisabled: true });
await s('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
});
await s('Emulation.setDeviceMetricsOverride', { width, height: TILE, deviceScaleFactor: 1, mobile: width < 700 });
await s('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 2000));

// 先把所有图片解码、页眉改成 absolute（否则滚动时吸顶会重复出现在每片里）
await s('Runtime.evaluate', {
  expression: `(async () => {
    document.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
    await Promise.all(Array.from(document.images).map(img => img.decode().catch(() => {})));
    const header = document.getElementById('site-header');
    if (header) header.style.position = 'absolute';
    await document.fonts.ready;
  })()`,
  awaitPromise: true,
});
await log('assets settled');

const measure = await s('Runtime.evaluate', {
  expression: `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return JSON.stringify({ error: 'not found' });
    const r = el.getBoundingClientRect();
    return JSON.stringify({ y: Math.round(r.y + scrollY), h: Math.round(r.height) });
  })()`,
  returnByValue: true,
});
const box = JSON.parse(measure.result.value);
if (box.error) {
  console.error('未找到选择器:', selector);
  await send('Target.closeTarget', { targetId });
  process.exit(1);
}

const start = Math.max(0, box.y - padY);
const height = Math.min(box.h + padY * 2, MAX_H);
await log(`measured y=${box.y} h=${box.h} -> start=${start} height=${height}`);

const partsDir = resolve(dirname(out), 'parts-' + out.split('/').pop().replace(/\.png$/, ''));
await rm(partsDir, { recursive: true, force: true });
await mkdir(partsDir, { recursive: true });

const tiles = Math.ceil(height / TILE);
const offsets = [];
for (let i = 0; i < tiles; i++) {
  const want = start + i * TILE;
  // 滚到底后 scrollY 会被夹住，记实际位置，拼图时按实际位置贴
  const { result } = await s('Runtime.evaluate', {
    expression: `(window.scrollTo(0, ${want}), Math.round(window.scrollY))`,
    returnByValue: true
  });
  const actual = result.value;
  offsets.push(actual);
  await new Promise((r) => setTimeout(r, 320));
  const shot = await s('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(partsDir, `tile-${String(i).padStart(3, '0')}.png`), Buffer.from(shot.data, 'base64'));
  await log(`tile ${i}/${tiles - 1} want=${want} actual=${actual}`);
}
await writeFile(join(partsDir, 'offsets.json'), JSON.stringify({ start, offsets }));

await send('Target.closeTarget', { targetId });

execFileSync('python3', [
  'scripts/stitch.py', partsDir, out, String(width), String(TILE), String(height)
], { stdio: 'inherit', cwd: resolve('.') });

await rm(partsDir, { recursive: true, force: true });
process.exit(0);
