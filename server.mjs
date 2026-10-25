import http from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const compress = promisify(gzip);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.webm': 'video/webm', '.wav': 'audio/wav', '.pdf': 'application/pdf' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) { res.writeHead(403).end('Forbidden'); return; }
    const info = await stat(path);
    const file = info.isDirectory() ? resolve(path, 'index.html') : path;
    const bytes = await readFile(file);
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');
    if (range) {
      const start = Number(range[1]);
      const end = Math.min(Number(range[2] || bytes.length - 1), bytes.length - 1);
      if (start > end || start >= bytes.length) { res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }).end(); return; }
      res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': end - start + 1 });
      res.end(req.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1));
    } else {
      const useGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && /\.(?:html|css|js|json|txt)$/.test(file);
      const payload = useGzip ? await compress(bytes) : bytes;
      if (useGzip) { res.setHeader('Content-Encoding', 'gzip'); res.setHeader('Vary', 'Accept-Encoding'); }
      res.writeHead(200, { 'Content-Length': payload.length });
      res.end(req.method === 'HEAD' ? undefined : payload);
    }
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('页面或文件不存在。'); }
}).listen(port, '127.0.0.1', () => console.log(`作品集预览：http://127.0.0.1:${port}`));
