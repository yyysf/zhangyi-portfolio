"""v3 素材入库：生成图裁水印、成片抽帧、剧照批量转 WebP（大图 + 700w 小图）。

用法：python3 scripts/build-v3-images.py
源目录：项目根 ../作品所有 2；输出：dist/assets/{images,works}
"""
import subprocess
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / '作品所有 2'
ILL = ROOT / 'source-assets' / 'illustrations'
IMAGES = ROOT / 'dist' / 'assets' / 'images'
WORKS = ROOT / 'dist' / 'assets' / 'works'

# 生成图：右下角带「AI生成」水印，按比例裁掉底部
GENERATED = {
    'Use_case__illustration_story___2026-10-30T13-46-25.png': ('reading', IMAGES, 1536, 76),
    'Use_case__illustration_story___2026-10-30T13-46-48.png': ('shanzhong', WORKS, 1024, 76),
    'Use_case__illustration_story___2026-10-30T13-47-16.png': ('wanou', WORKS, 1024, 76),
    'Use_case__illustration_story___2026-10-30T13-47-38.png': ('caoyu', WORKS, 1024, 76),
}

# 剧照：源文件片段 -> (目标名, 目标长边)
PHOTOS = {
    '舞台实践/007f0fdf6m4dfc21d5599c6147936cfb.JPG': ('tree-stage-4', 1320),
    '舞台实践/483be53fem8a594834b50fe0243e212d.HEIC': ('tree-quote', 1320),
    '舞台实践/7a222f08fv2585cda9234e1d582aec0a.JPG': ('tree-stage-5', 1320),
    '舞台实践/7c1f25a21nac7556be7db2283e92d391.JPG': ('tree-backstage', 1320),
    '舞台实践/942f426a9v82033516e2422244ad34e4.JPG': ('tree-group', 1320),
    '舞台实践/a6490a6a6l6aa219b0f5e0f018448295.jpg': ('tree-stage-6', 1320),
    '舞台实践/adcc5ddf8h3c1e32aedf10253c163e7a.JPG': ('tree-stage-7', 1320),
    '舞台实践/cd921368bu8f1c117598a4be9ec945da.JPG': ('tree-scene', 1320),
    '舞台实践/d9857e44di30ec8edd4722e7bf54d244.jpg': ('tree-stage-8', 1320),
    '文本➕影视绍兴暖契/47dc84635p725671c1fc53b2a584a77f.JPG': ('shaoxing-group-2', 1320),
    '文本➕影视绍兴暖契/9f36cfc7dn252583852d662096f02b3b.JPG': ('shaoxing-set', 1320),
    '时间代价，影像+文本/IMG_1356.PNG': ('shijian-still', 1320),
    '时间代价，影像+文本/IMG_1358.PNG': ('shijian-end', 1320),
}


def save(image, path, width, quality):
    copy = image.copy()
    copy.thumbnail((width, width * 4), Image.Resampling.LANCZOS)
    copy.save(path, 'WEBP', quality=quality, method=6)
    print(f'  {path.name}: {copy.width} x {copy.height}, {path.stat().st_size // 1024} KB')


def open_any(path):
    """HEIC 用 sips 先解码成临时 PNG，Pillow 直接读不了。"""
    if path.suffix.lower() == '.heic':
        tmp = ROOT / '.tmp' / (path.stem + '.png')
        tmp.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['sips', '-s', 'format', 'png', str(path), '--out', str(tmp)],
                       check=True, capture_output=True)
        return Image.open(tmp).convert('RGB')
    return ImageOps.exif_transpose(Image.open(path)).convert('RGB')


print('== 生成图（裁水印）==')
for source, (name, target, width, crop_bottom) in GENERATED.items():
    image = Image.open(ILL / source).convert('RGB')
    image = image.crop((0, 0, image.width, image.height - crop_bottom))
    if image.width > width:
        image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
    print(f'  {name}: {image.width} x {image.height}')
    if target is IMAGES:
        image.save(ILL / f'{name}.png')
        save(image, target / f'{name}.webp', 1536, 86)
        save(image, target / f'{name}-small.webp', 768, 76)
    else:
        image.save(ILL / f'{name}.png')
        save(image, target / f'{name}.webp', width, 88)
        save(image, target / f'{name}-small.webp', 700, 78)

print('== 时间「贷」价封面（IMG_1356 竖版裁切）==')


def trim_black(image, threshold=8):
    """去掉录屏自带的上下黑边：从两端逐行扫，直到整行均值超过阈值。"""
    gray = image.convert('L')
    width, height = gray.size
    rows = [gray.crop((0, y, width, y + 1)).resize((1, 1)).getpixel((0, 0)) for y in range(height)]
    top = next(y for y, value in enumerate(rows) if value > threshold)
    bottom = next(y for y, value in enumerate(reversed(rows)) if value > threshold)
    return image.crop((0, top, width, height - bottom))


still = trim_black(open_any(SRC / '时间代价，影像+文本/IMG_1356.PNG'))
target = still.width * 4 / 3
if still.height > target:
    top = (still.height - target) / 2
    still = still.crop((0, round(top), still.width, round(top + target)))
still.save(ILL / 'shijian.png')
save(still, WORKS / 'shijian.webp', 900, 88)
save(still, WORKS / 'shijian-small.webp', 700, 78)

print('== 剧照批量转 WebP ==')
for source, (name, width) in PHOTOS.items():
    image = open_any(SRC / source)
    if name.startswith('shijian'):
        image = trim_black(image)
    save(image, WORKS / f'{name}.webp', width, 86)
    save(image, WORKS / f'{name}-small.webp', 700, 76)

print('== 竹林深处封面（成片 40s 抽帧，裁掉上下黑边）==')
frame = ROOT / '.tmp' / 'zhulin-cover.png'
subprocess.run(['swift', str(ROOT / 'scripts/media.swift'), 'frame',
                str(ROOT / 'dist/assets/media/zhulin-shenchu.mp4'), str(frame), '40', '1320'],
               check=True, capture_output=True)
zhulin = trim_black(open_any(frame))
zhulin.save(ILL / 'zhulin.png')
save(zhulin, WORKS / 'zhulin.webp', 1320, 86)
save(zhulin, WORKS / 'zhulin-small.webp', 700, 76)
