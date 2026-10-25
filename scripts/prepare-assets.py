"""Compress local illustrations and subset the locally licensed WenKai font."""
from pathlib import Path
import json
import re
from html import unescape
from PIL import Image
from fontTools import subset

root = Path(__file__).resolve().parents[1]
source = root / 'source-assets'
output = root / 'dist' / 'assets'
(output / 'images').mkdir(parents=True, exist_ok=True)
(output / 'fonts').mkdir(parents=True, exist_ok=True)
for name in ('meadow', 'platform', 'rehearsal', 'river'):
    img = Image.open(source / 'illustrations' / f'{name}.png').convert('RGB')
    img.thumbnail((1536, 1024), Image.Resampling.LANCZOS)
    destination = output / 'images' / f'{name}.webp'
    img.save(destination, 'WEBP', quality=86, method=6)
    print(f'{destination.name}: {destination.stat().st_size // 1024} KB, {img.width} x {img.height}')
    small = img.copy()
    small.thumbnail((768, 768), Image.Resampling.LANCZOS)
    small_path = output / 'images' / f'{name}-small.webp'
    small.save(small_path, 'WEBP', quality=76, method=6)
    print(f'{small_path.name}: {small_path.stat().st_size // 1024} KB')
data = json.loads((root / 'dist/data/portfolio.json').read_text(encoding='utf-8'))
# WenKai is used for headings, not the long body text. Include exactly those
# strings instead of shipping hundreds of unused glyphs from the sample scripts.
corpus = '文本排演回看听这篇作品还没有放进来。'
corpus += data['profile']['name'] + data['profile']['siteTitle']
for work in data['works']:
    corpus += work['title'] + work.get('excerpt', '')
    corpus += ''.join(section.get('title', '') for section in work.get('sections', []))
for path in (root / 'dist').glob('*.html'):
    text = path.read_text(encoding='utf-8')
    for match in re.finditer(r'<h[123][^>]*>(.*?)</h[123]>|<p class="hero-quote">(.*?)</p>|<a class="wordmark"[^>]*>(.*?)</a>', text, re.S):
        corpus += unescape(re.sub(r'<[^>]+>', '', ''.join(value or '' for value in match.groups())))
options = subset.Options()
options.flavor = 'woff2'
options.name_IDs = ['*']
font = subset.load_font(str(source / 'LXGWWenKai-Regular.ttf'), options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=corpus)
subsetter.subset(font)
# Give this subset its own name; retain all original license and copyright records.
names = {1: 'Portfolio WenKai', 2: 'Regular', 3: 'Portfolio WenKai Regular 1.0', 4: 'Portfolio WenKai Regular', 6: 'PortfolioWenKai-Regular', 16: 'Portfolio WenKai', 17: 'Regular'}
for record in font['name'].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding(), errors='replace')
destination = output / 'fonts' / 'wenkai-subset.woff2'
subset.save_font(font, str(destination), options)
print(f'wenkai-subset.woff2: {destination.stat().st_size // 1024} KB')
