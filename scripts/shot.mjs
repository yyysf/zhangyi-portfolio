// 开发用截图脚本：通过 Chrome DevTools Protocol 分段截取整页并拼接。
// 用法：node scripts/shot.mjs <url> <out.png> [width] [mode]
// mode: full（整页，默认） | viewport（仅首屏）
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const url = process.argv[2];
const out = process.argv[3] || 'shot.png';
const width = Number(process.argv[4] || 1440);
const mode = process.argv[5] || 'full';
const VH = 900;

const version = await (await fetch('http://127.0.0.1:9222/json/version')).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
});

await new Promise((r) => ws.addEventListener('open', r, { once: true }));

const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);

await s('Page.enable');
// 减少动态效果：让 reveal 元素直接可见、滚动不做平滑动画，截图才稳定
await s('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
});
await s('Emulation.setDeviceMetricsOverride', {
  width, height: VH, deviceScaleFactor: 1, mobile: width < 700,
});
await s('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 2200));

const totalHeight = async () => {
  const { result } = await s('Runtime.evaluate', {
    expression: 'document.documentElement.scrollHeight',
    returnByValue: true,
  });
  return result.value;
};

// 先滚动一遍，触发懒加载与渐显动画
let h = await totalHeight();
for (let y = 0; y < h; y += VH * 0.75) {
  await s('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` });
  await new Promise((r) => setTimeout(r, 180));
  h = await totalHeight();
}
await s('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' });
// 等所有图片解码完成，避免截图途中高度变化造成拼接错位
await s('Runtime.evaluate', {
  expression: `(async () => {
    document.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
    await Promise.all(Array.from(document.images).map(img => img.decode().catch(() => {})));
    const header = document.getElementById('site-header');
    if (header) header.style.position = 'absolute';
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 300));
  })()`,
  awaitPromise: true,
});
await new Promise((r) => setTimeout(r, 500));

const dir = dirname(out);
const partsDir = join(dir, 'parts');
await mkdir(partsDir, { recursive: true });

const offsets = mode === 'viewport' ? [0] : [];
if (mode !== 'viewport') {
  const full = await totalHeight();
  const last = Math.max(0, full - VH);
  for (let y = 0; y < full; y += VH) offsets.push(Math.min(y, last));
}

for (let i = 0; i < offsets.length; i++) {
  await s('Runtime.evaluate', { expression: `window.scrollTo(0, ${offsets[i]})` });
  await new Promise((r) => setTimeout(r, 260));
  const shot = await s('Page.captureScreenshot', { format: 'png' });
  const file = join(partsDir, `part-${String(i).padStart(3, '0')}.png`);
  await writeFile(file, Buffer.from(shot.data, 'base64'));
}
await writeFile(join(dir, 'parts.json'), JSON.stringify({ offsets, VH, width, out }));

console.log(`parts: ${offsets.length} @ ${width}x${VH}`);
await send('Target.closeTarget', { targetId });
ws.close();
process.exit(0);
