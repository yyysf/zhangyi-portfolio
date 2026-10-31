/**
 * 把「真正以文楷渲染的字」抓出来，落地成 scripts/wenkai-hand-corpus.txt。
 *
 * 为什么不用静态语料：
 * build-wenkai-pairs.py 里原来是按选择器白名单猜哪些文字用文楷。
 * 猜漏一处，那一处的字就落回系统楷体，一页里两种笔迹——正是这个脚本要治的病。
 * 而文楷是靠继承生效的（.index-list__title 自己没写 font-family，
 * 从 .index-dialog 继承到 WenKai），纯看 CSS 也推不准。
 * 所以语料以「浏览器算出来的 fontFamily」为准，静态语料只作兜底。
 *
 * 前置：
 *   1. 预览服务  npm start            → 127.0.0.1:4173
 *   2. 调试浏览器 见 README「自查脚本」→ 127.0.0.1:9222
 * 用法：node scripts/dump-hand-corpus.mjs [基地址]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const CDP = 'http://127.0.0.1:9222';

const data = JSON.parse(await readFile(join(ROOT, 'dist/data/portfolio.json'), 'utf8'));
const pages = ['/', ...data.works.map(w => `/work.html?id=${w.id}`)];

const version = await (await fetch(`${CDP}/json/version`)).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
});
await new Promise(r => ws.addEventListener('open', r, { once: true }));
const send = (m, p = {}, sid) => new Promise((res, rej) => {
  const i = ++id;
  pending.set(i, { resolve: res, reject: rej });
  ws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: sid }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await s('Page.enable');
await s('Network.enable');
// Python SimpleHTTP 不发 Cache-Control，无头浏览器会按启发式缓存旧资源
await s('Network.setCacheDisabled', { cacheDisabled: true });
await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const PROBE = `(() => {
  const out = { WenKai: '', WenKaiText: '', detail: [] };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue;
    if (!t || !t.trim()) continue;
    const el = n.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const fam = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
    if (fam !== 'WenKai' && fam !== 'WenKaiText') continue;
    out[fam] += t;
    if (fam === 'WenKai') {
      const path = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\\s+/).join('.') : '');
      out.detail.push(path + ' | ' + t.replace(/\\s+/g, ' ').trim().slice(0, 40));
    }
  }
  return JSON.stringify(out);
})()`;

const acc = { WenKai: '', WenKaiText: '' };
const detail = [];
for (const page of pages) {
  await s('Page.navigate', { url: BASE + page });
  // 首屏之外的懒加载图与 reveal 动画都会改变可见性，等两拍再读
  await new Promise(r => setTimeout(r, 1800));
  await s('Runtime.evaluate', { expression: 'window.scrollTo(0, document.body.scrollHeight)' });
  await new Promise(r => setTimeout(r, 900));
  await s('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' });
  const o = await s('Runtime.evaluate', { expression: PROBE, returnByValue: true });
  const r = JSON.parse(o.result.value);
  acc.WenKai += r.WenKai;
  acc.WenKaiText += r.WenKaiText;
  for (const d of r.detail) detail.push(page + '  ' + d);
}

const txt = join(ROOT, 'scripts/wenkai-hand-corpus.txt');
await writeFile(txt, acc.WenKai);
await writeFile('/tmp/wenkai-detail.txt', detail.join('\n'));

const uni = new Set(acc.WenKai);
console.log(`页面 ${pages.length} 个`);
console.log(`WenKai     文本 ${acc.WenKai.length} 字  去重 ${uni.size} 字`);
console.log(`WenKaiText 文本 ${acc.WenKaiText.length} 字  去重 ${new Set(acc.WenKaiText).size} 字`);
console.log(`已写入 ${txt}`);

await send('Target.closeTarget', { targetId });
process.exit(0);
