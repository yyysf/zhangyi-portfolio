import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const load = path => readFile(resolve(root, path), 'utf8');
const data = JSON.parse(await load('data/portfolio.json'));
const ids = new Set();
const categories = new Set(['scripts', 'essays', 'films', 'stage', 'sound']);
for (const work of data.works) {
  assert.ok(/^[a-z0-9-]+$/.test(work.id), `Invalid ID: ${work.id}`);
  assert.ok(!ids.has(work.id), `Duplicate ID: ${work.id}`); ids.add(work.id);
  assert.ok(categories.has(work.category), `Invalid category: ${work.category}`);
  assert.ok(work.title && work.summary && Array.isArray(work.sections), `Incomplete work: ${work.id}`);
  for (const asset of [work.image, work.imageSmall, work.pdf, work.media?.src].filter(Boolean)) {
    if (!/^https?:\/\//.test(asset)) assert.ok((await stat(resolve(root, asset))).isFile(), `Missing ${asset}`);
  }
  for (const photo of work.gallery || []) {
    for (const asset of [photo.image, photo.imageSmall].filter(Boolean)) {
      if (!/^https?:\/\//.test(asset)) assert.ok((await stat(resolve(root, asset))).isFile(), `Missing gallery asset ${asset}`);
    }
  }
}
const home = await load('index.html');
assert.equal((home.match(/<section\b/g) || []).length, 8, 'Homepage must have eight sections');
for (const id of ['home', 'about', 'scripts', 'essays', 'films', 'stage', 'sound', 'thanks']) assert.ok(home.includes(`id="${id}"`), `Missing section: ${id}`);
for (const text of ['我叫张艺。', '一闪而过的东西——', '被听见、被看见。']) assert.ok(home.includes(text), `Missing exact copy: ${text}`);
for (const path of ['index.html', 'work.html', 'assets/style.css']) {
  const contents = await load(path);
  for (const match of contents.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"|url\(['"]?([^)'"?#]+)['"]?\)/g)) {
    const value = match[1] || match[2];
    if (/^(?:https?:|data:|%23)/.test(value)) continue;
    assert.ok((await stat(resolve(root, dirname(path), value))).isFile(), `Missing reference in ${path}: ${value}`);
  }
}
console.log(`静态检查通过：${ids.size} 项作品、8 个模块、全部本地素材与页面引用完整。`);
