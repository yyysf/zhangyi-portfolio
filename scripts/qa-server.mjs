// Isolated browser fixtures. Never upload this file or use it for public hosting.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
let retryCount = 0;
const cases = new Set(['empty', 'bad-image', 'retry-data', 'long-title', 'audio', 'media-error', 'text-scale']);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function silence() {
  const size = 24000 * 30 * 2;
  const b = Buffer.alloc(size + 44);
  b.write('RIFF'); b.writeUInt32LE(size + 36, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(24000, 24); b.writeUInt32LE(48000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(size, 40); return b;
}
http.createServer(async (req, res) => {
  try {
    const parts = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).split('/').filter(Boolean);
    const scenario = cases.has(parts[0]) ? parts.shift() : '';
    const relative = parts.join('/') || 'index.html';
    const path = resolve(root, relative);
    if (!path.startsWith(resolve(root) + sep)) { res.writeHead(403).end(); return; }
    // Text-only 200% enlargement fixture; production CSS stays untouched.
    if (scenario === 'text-scale' && relative === 'assets/style.css') {
      const css = (await readFile(path, 'utf8'))
        .replace(/(font-size\s*:\s*)([\d.]+)px/g, (_, prefix, size) => `${prefix}${Number(size) * 2}px`)
        .replace(/font:([^;{}]+)/g, (_, value) => `font:${value.replace(/([\d.]+)px/, (match, size) => `${Number(size) * 2}px`)}`);
      res.writeHead(200, { 'Content-Type': types['.css'], 'Cache-Control': 'no-store' }); res.end(css); return;
    }
    if (relative === 'data/portfolio.json' && scenario) {
      if (scenario === 'retry-data' && retryCount++ === 0) { res.writeHead(503).end(); return; }
      const data = JSON.parse(await readFile(path, 'utf8'));
      if (scenario === 'empty') data.works = [];
      if (scenario === 'bad-image') { data.works[0].image = 'assets/images/missing.webp'; delete data.works[0].imageSmall; }
      if (scenario === 'long-title') {
        data.works[0].title = '一封很长很长的信，写给那些尚未来得及说出口的故事'.repeat(4);
        data.works[0].summary = 'LongUnbrokenTitleForLayoutChecks'.repeat(7);
      }
      if (scenario === 'audio') data.works.filter(w => w.category === 'sound').forEach(w => { w.media.src = 'assets/media/qa-silence.wav'; });
      if (scenario === 'media-error') { const w = data.works.find(w => w.category === 'sound'); w.media.src = 'assets/media/missing.wav'; w.media.externalUrl = 'https://example.com/'; }
      res.writeHead(200, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); return;
    }
    const bytes = relative === 'assets/media/qa-silence.wav' ? silence() : await readFile((await stat(path)).isDirectory() ? resolve(path, 'index.html') : path);
    res.setHeader('Content-Type', relative.endsWith('.wav') ? 'audio/wav' : types[extname(path)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]); const end = Math.min(Number(range[2] || bytes.length - 1), bytes.length - 1);
      if (start > end) { res.writeHead(416).end(); return; }
      res.writeHead(206, { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': end - start + 1 });
      res.end(bytes.subarray(start, end + 1));
    } else { res.writeHead(200, { 'Content-Length': bytes.length }); res.end(bytes); }
  } catch { res.writeHead(404).end('Fixture asset not found'); }
}).listen(4174, '127.0.0.1', () => console.log('Browser QA fixtures: http://127.0.0.1:4174'));
