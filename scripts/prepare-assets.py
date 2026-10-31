"""压缩本地插画。字体子集见 build-wenkai-pairs.py，不在这里。"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'source-assets'
output = root / 'dist' / 'assets'
(output / 'images').mkdir(parents=True, exist_ok=True)
(output / 'fonts').mkdir(parents=True, exist_ok=True)
for name in ('meadow', 'platform', 'rehearsal', 'river', 'listening', 'reading'):
    # 原始 PNG 不进仓库，缺失时跳过，保留 dist 里已有的 WebP
    original = source / 'illustrations' / f'{name}.png'
    if not original.exists():
        print(f'{name}.png 不在仓库内，跳过（保留现有 WebP）')
        continue
    img = Image.open(original).convert('RGB')
    img.thumbnail((1536, 1024), Image.Resampling.LANCZOS)
    destination = output / 'images' / f'{name}.webp'
    img.save(destination, 'WEBP', quality=86, method=6)
    print(f'{destination.name}: {destination.stat().st_size // 1024} KB, {img.width} x {img.height}')
    small = img.copy()
    small.thumbnail((768, 768), Image.Resampling.LANCZOS)
    small_path = output / 'images' / f'{name}-small.webp'
    small.save(small_path, 'WEBP', quality=76, method=6)
    print(f'{small_path.name}: {small_path.stat().st_size // 1024} KB')
# 字体不在这里生成。原来这里裁的是单包（475 字，缺 ？ ！ … 与数字），
# 现在是两个按需加载的子集，见 scripts/build-wenkai-pairs.py：
#   wenkai-title.woff2（865 字 / 179KB，全站 preload）
#   wenkai-text.woff2（2482 字 / 550KB，只在有对白的页面由 --hand-text 触发下载）
# 语料以浏览器算出来的 fontFamily 为准（scripts/dump-hand-corpus.mjs），
# 静态猜测会漏掉靠继承生效的那部分文字。
