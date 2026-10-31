"""把文楷拆成「标题包」和「台词包」两个子集，按需加载。

为什么拆：
原来全站只有一个 475 字的子集，实测《她的秋》台词里有 33.7% 的字不在包内
（缺 ？ ！ … ‘ ’ · 与数字），缺的字落回系统楷体，一页里两种笔迹混排。
把完整字库裁成一个大包（1900 字 / 约 400KB）又会摊到每一篇影评上——
影评页根本不用文楷。

怎么拆：
A 标题包 family `WenKai`：页眉、章页大字、标题、题记、引语、图注，865 字 / 179KB。
B 台词包 family `WenKaiText`：A 的全部 + 剧本正文，2482 字 / 550KB。
`--hand-text` 只被三条剧本选择器引用。浏览器只在页面上真有元素解析到某个
family 时才发请求，所以影评页永远不下载 B——纯 CSS，没有 JS 判断。

语料从哪来：
按选择器白名单猜不准。文楷大量靠继承生效（.index-list__title 自己没写
font-family，从 .index-dialog 继承到 WenKai），白名单漏一处，那一处的字就
落回系统楷体。所以真正的语料由 scripts/dump-hand-corpus.mjs 在浏览器里
读 getComputedStyle 抓出来，落到 scripts/wenkai-hand-corpus.txt；
下面的静态语料只作兜底和向前兼容（新增内容还没 dump 过时）。

字库来源：
GitHub Release 的 TTF 在当前网络下下不动（curl 56），改用 npm 上的
@callmebill/lxgw-wenkai-web@1.530.0（同一版 v1.530），它把完整字体按
unicode-range 切成 207 个 woff2。先 Merger 合回一个完整字体，再裁两个子集。
注意 source-assets/LXGWWenKai-Regular.ttf 只有 475 字，是旧子集不是完整字库，
拿它当输入会得到「缺字 390」——要传 207 个切片的目录。

用法：
  node scripts/dump-hand-corpus.mjs          # 需 npm start + 9222 调试端口
  python3 scripts/build-wenkai-pairs.py <chunks-dir>
"""
import json
import os
import re
import sys
from html import unescape
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / 'dist/assets/fonts'

# 标题包里必须有的字符：全角标点与数字。
# 这些不进语料的话，标题里的「？」「2021」会掉回系统楷体。
EXTRA = '？！…‘’·—–、。，：；「」『』（）《》〈〉%0123456789'
# 只补标题里真会用到的拉丁字符，不铺满 ASCII：
# 95 个拉丁字形对一个中文标题包来说是纯负担。
LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,:-–—/()[]·'


def load_font(arg):
    """参数可以是切片目录，也可以是已经合并好的 TTF。

    注意：合并出来的完整字库不能直接 save()——cmap 的 format 4 子表
    会超出 65535 的偏移上限（struct.error: 'H' format requires 0 <= number）。
    所以这里只在内存里用，落地的是裁剪之后的两个子集。
    """
    path = Path(arg)
    if path.is_file() and path.suffix.lower() in ('.ttf', '.otf'):
        print('直接读完整字库:', path.name)
        return TTFont(str(path))
    chunks = sorted(path.glob('*.woff2'), key=lambda p: int(p.stem))
    if not chunks:
        sys.exit(f'{path} 里没有 woff2 切片')
    from fontTools.merge import Merger
    return Merger().merge([str(p) for p in chunks])


HAND_CORPUS = ROOT / 'scripts/wenkai-hand-corpus.txt'


def site_data():
    return json.loads((ROOT / 'dist/data/portfolio.json').read_text(encoding='utf-8'))


def rendered_corpus():
    """浏览器算出来的、真正以 WenKai 渲染的字（dump-hand-corpus.mjs 产出）。

    静态语料只能按选择器白名单去猜，而文楷大量靠继承生效
    （.index-list__title 自己没写 font-family，从 .index-dialog 继承到 WenKai），
    猜漏一处，那处就落回系统楷体。所以以渲染结果为准。
    文件缺失时退化成纯静态语料，并在最后打印警告。
    """
    if not HAND_CORPUS.exists():
        return ''
    return HAND_CORPUS.read_text(encoding='utf-8')


def title_corpus(data):
    """标题包：页面上所有以 WenKai 渲染、但不在剧本正文里的字。"""
    corpus = '文本排演回看听研展这篇作品还没有放进来。'
    corpus += data['profile']['name'] + data['profile']['siteTitle']
    corpus += '原创剧本影评随笔文学与戏剧研读札记影像成片舞台实践声音时间关于剧本研读札记声音展演影像'
    for work in data['works']:
        corpus += work['title'] + work.get('excerpt', '')
        # 首页剧本卡的 hook（work.hook 或 summary 首句）和详情页横幅导语
        # 都以 --hand 渲染，但它们是 JS 用这些字段拼出来的，静态 HTML 里没有。
        for field in ('summary', 'hook', 'subtitle', 'categoryLabel', 'imageCaption',
                      'pullQuote', 'pullFrom'):
            corpus += work.get(field) or ''
        corpus += ''.join(s.get('title', '') for s in work.get('sections', []))
        corpus += ''.join(b.get('text', '') for s in work.get('sections', [])
                          for b in s.get('blocks', []) if b.get('type') == 'subhead')
        # 题记、引语、导语都是文楷
        corpus += (work.get('epigraph') or {}).get('text', '')
        corpus += (work.get('epigraph') or {}).get('from', '')
        for line in (work.get('epigraph') or {}).get('note') or []:
            corpus += line
        if work['category'] == 'essays':
            opening = work.get('sections', [{}])[0].get('paragraphs', [])
            if len(opening) > 1:
                corpus += opening[1].split('。')[0] + '。'
    # 首页 HTML 里直接写死的标题、章页大字、首屏引语
    pattern = (r'<h[123][^>]*>(.*?)</h[123]>|<p class="hero-quote">(.*?)</p>'
               r'|<a class="wordmark"[^>]*>(.*?)</a>|<span class="chapter-plate__char"[^>]*>(.*?)</span>'
               r'|<p class="pause__line"[^>]*>(.*?)</p>|<p class="chapter-side"[^>]*>(.*?)</p>'
               r'|<p class="eyebrow"[^>]*>(.*?)</p>')
    # 其余以 --hand 渲染、又不是 h1–h3 的块：导语、引语、索引条、落款。
    # 这类名字改一次白名单就漏一次，所以照 CSS 里的类名整组扫。
    hand_blocks = ('about-lead', 'about-quote', 'sound-lead', 'sound-quote',
                   'index-list__title', 'work-lead', 'essay-quote', 'script-quote',
                   'script-pull', 'sound-item__title', 'thanks-sign')
    block_pattern = re.compile(
        r'<(p|blockquote|span|div|cite) class="[^"]*\b(' + '|'.join(hand_blocks) + r')\b[^"]*"[^>]*>(.*?)</\1>',
        re.S)
    for path in (ROOT / 'dist').glob('*.html'):
        text = path.read_text(encoding='utf-8')
        for match in re.finditer(pattern, text, re.S):
            corpus += unescape(re.sub(r'<[^>]+>', '', ''.join(v or '' for v in match.groups())))
        for match in block_pattern.finditer(text):
            corpus += unescape(re.sub(r'<[^>]+>', '', match.group(3)))
    return corpus + rendered_corpus() + EXTRA + LATIN


def text_corpus(data, base):
    """台词包：标题包 + 全部正文（对白、角色名、场次、舞台提示、段落）。

    正文全收而不只收剧本类目：别的类目里也可能有 dialogue 块，
    有 dialogue 块的 section 就会被标成 .reading-section--script，
    那一段就会用 --hand-text 渲染。
    """
    corpus = base
    for work in data['works']:
        for section in work.get('sections', []):
            corpus += ''.join(section.get('paragraphs') or [])
            for block in section.get('blocks') or []:
                corpus += block.get('text', '')
                corpus += block.get('speaker', '')
    return corpus


def build(source, corpus, out_name, label):
    options = subset.Options()
    options.flavor = 'woff2'
    options.name_IDs = ['*']
    options.hinting = False
    options.drop_tables.append('DSIG')
    # 不要 layout_features=['*']：文楷的 GSUB 里带大量异体字，
    # 全留会把这些字形一起塞进 glyf，141 字的测试包从 45KB 涨到 81KB。
    # 中文排印不需要 GSUB 参与基本渲染，默认集合够用。

    # 每个包各合一次：合并出来的字库没法复制，也没法落地成 TTF
    work = load_font(source) if isinstance(source, (str, Path)) else source
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=corpus)
    subsetter.subset(work)

    cmap = work.getBestCmap()
    # 零宽连接符、BOM、控制符不是字形，不该算进缺字
    invisible = set('\u200b\u200c\u200d\ufeff\u00ad')
    missing = sorted({c for c in corpus
                      if not c.isspace() and c not in invisible
                      and not (ord(c) < 0x20 or 0x7f <= ord(c) <= 0x9f)
                      and ord(c) not in cmap})
    # 改名但保留全部版权与许可记录（OFL 要求）——沿用 prepare-assets.py 的写法
    names = {1: 'Portfolio WenKai', 2: 'Regular', 3: 'Portfolio WenKai Regular 1.0',
             4: 'Portfolio WenKai Regular', 6: 'PortfolioWenKai-Regular',
             16: 'Portfolio WenKai', 17: 'Regular'}
    for record in work['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding(), errors='replace')

    out = OUT_DIR / out_name
    # options.flavor 只在 subset 内部记录，落盘前必须再写一次，
    # 否则存出来是裸 TTF（文件头 0001 0000 而不是 wOF2），体积翻三倍。
    work.flavor = 'woff2'
    work.save(str(out))
    size = out.stat().st_size
    print(f'{label:6s} {out_name:20s} 字形 {len(cmap):5d}  {size/1024:6.1f}KB  缺字 {len(missing)}')
    if missing:
        print('       缺:', ''.join(missing))
    return len(cmap), len(missing)


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    source = args[0]

    probe = load_font(source)
    cmap_n = len(probe.getBestCmap())
    print('完整字库 cmap:', cmap_n)
    del probe
    # 旧子集只有 475 字，当成完整字库用会得到一堆假缺字，先挡一道
    if cmap_n < 5000:
        sys.exit(f'{source} 只有 {cmap_n} 个字形，不是完整字库。传 207 个 woff2 切片的目录。')

    data = site_data()
    if not HAND_CORPUS.exists():
        print(f'⚠️  没有 {HAND_CORPUS.name}，标题包只按静态语料裁，可能漏字。')
        print('    先跑：npm start（另开一个终端）+ node scripts/dump-hand-corpus.mjs')
    a_corpus = title_corpus(data)
    b_corpus = text_corpus(data, a_corpus)
    print(f'标题包语料去重 {len(set(a_corpus))} 字，台词包语料去重 {len(set(b_corpus))} 字')

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    a_n, a_missing = build(source, a_corpus, 'wenkai-title.woff2', 'A 标题')
    b_n, b_missing = build(source, b_corpus, 'wenkai-text.woff2', 'B 台词')

    # A 的字符必须全部落在 B 里，否则同一句话在标题和台词里会用两种字
    a_cmap = set(TTFont(str(OUT_DIR / 'wenkai-title.woff2')).getBestCmap())
    b_cmap = set(TTFont(str(OUT_DIR / 'wenkai-text.woff2')).getBestCmap())
    lost = sorted(a_cmap - b_cmap)
    print(f'B 是否覆盖 A 全部字形: {"是" if not lost else "否，" + str(len(lost)) + " 个"}')
    if a_missing or b_missing or lost:
        sys.exit('有缺字，不要发布')
    print('两个包都无缺字。')


if __name__ == '__main__':
    main()
