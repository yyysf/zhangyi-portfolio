"""把按视口高度切出来的截图按实际滚动位置拼回一张。

无头 Chrome 在本机一次性截超过约 1400px 高的视口会挂住
（Page.captureScreenshot 不返回），所以截图脚本改成切片。
注意：页面滚到底后 scrollY 会被夹住，切片不再等距，必须按实际偏移贴，
否则底部会重复一段内容。

用法：python3 scripts/stitch.py <parts_dir> <out.png> <width> <tile_h> <total_h>
"""
import json
import sys
from pathlib import Path

from PIL import Image

parts_dir = Path(sys.argv[1])
out = Path(sys.argv[2])
width = int(sys.argv[3])
tile_h = int(sys.argv[4])
total_h = int(sys.argv[5])

meta_path = parts_dir / 'offsets.json'
if not meta_path.exists():
    sys.exit(f'缺少 offsets.json：{meta_path}')
meta = json.loads(meta_path.read_text())
offsets = meta['offsets']
start = meta['start']

files = sorted(parts_dir.glob('tile-*.png'))
if not files:
    sys.exit(f'没有找到切片：{parts_dir}')
if len(files) != len(offsets):
    sys.exit(f'切片数 {len(files)} 与偏移数 {len(offsets)} 不一致')

canvas = Image.new('RGB', (width, total_h), 'white')
for f, y in zip(files, offsets):
    img = Image.open(f).convert('RGB')
    if img.width != width:
        img = img.resize((width, img.height), Image.LANCZOS)
    top = y - start
    if top >= total_h:
        continue
    if top + img.height > total_h:
        img = img.crop((0, 0, width, total_h - top))
    canvas.paste(img, (0, top))

canvas.save(out, optimize=True)
print(f'{out} {canvas.width}x{canvas.height} ({len(files)} 片)')
