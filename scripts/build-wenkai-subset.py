"""从 npm 上的文楷切片重建一个只含站点语料的字体，供 prepare-assets.py 使用。

背景：仓库不带原始 TTF，GitHub Release 在当前网络下不可达；npm 上的
@callmebill/lxgw-wenkai-web 按 unicode-range 切成 207 个 woff2。
这里把切片合并回完整字体后立即按站点语料裁剪，避免 cmap 超过 format 4 上限。

用法：python3 scripts/build-wenkai-subset.py <chunks-dir> <out.ttf>
"""
import glob
import json
import os
import re
import sys
from html import unescape
from pathlib import Path

from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
chunks_dir = Path(sys.argv[1])
out_path = Path(sys.argv[2])


def build_corpus():
    data = json.loads((ROOT / 'dist/data/portfolio.json').read_text(encoding='utf-8'))
    corpus = '文本排演回看听研展这篇作品还没有放进来。'
    corpus += data['profile']['name'] + data['profile']['siteTitle']
    corpus += '原创剧本影评随笔文学与戏剧研读札记影像成片舞台实践声音时间关于剧本研读札记声音展演影像'
    for work in data['works']:
        corpus += work['title'] + work.get('excerpt', '')
        corpus += ''.join(s.get('title', '') for s in work.get('sections', []))
        corpus += ''.join(b.get('text', '') for s in work.get('sections', [])
                          for b in s.get('blocks', []) if b.get('type') == 'subhead')
        if work['category'] == 'essays':
            opening = work.get('sections', [{}])[0].get('paragraphs', [])
            if len(opening) > 1:
                corpus += opening[1].split('。')[0] + '。'
    for path in (ROOT / 'dist').glob('*.html'):
        text = path.read_text(encoding='utf-8')
        pattern = (r'<h[123][^>]*>(.*?)</h[123]>|<p class="hero-quote">(.*?)</p>'
                   r'|<a class="wordmark"[^>]*>(.*?)</a>|<span class="chapter-plate__char"[^>]*>(.*?)</span>')
        for match in re.finditer(pattern, text, re.S):
            corpus += unescape(re.sub(r'<[^>]+>', '', ''.join(value or '' for value in match.groups())))
    return corpus


paths = sorted(glob.glob(str(chunks_dir / '*.woff2')), key=lambda p: int(os.path.basename(p)[:-6]))
print(f'合并 {len(paths)} 个切片…')
merged = Merger().merge(paths)
print('合并后 cmap:', len(merged.getBestCmap()))

corpus = build_corpus()
print('语料去重字符:', len(set(corpus)))

options = subset.Options()
options.flavor = None
options.name_IDs = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=corpus)
subsetter.subset(merged)

cmap = merged.getBestCmap()
missing = sorted({c for c in corpus if not c.isspace() and ord(c) not in cmap})
print('裁剪后字符数:', len(cmap), '缺字:', ''.join(missing) if missing else '无')
merged.save(str(out_path))
print('saved', out_path)
