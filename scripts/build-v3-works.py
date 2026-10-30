"""v3 五件新作品入库：从提取好的纯文本结构化，写入 dist/data/portfolio.json。

用法：python3 scripts/build-v3-works.py
前置：.tmp/{shan,wanou,shijian,zhulin,zhulin-note}.txt 与 .tmp/caoyu.json 已生成。
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / '.tmp'
DATA = ROOT / 'dist/data/portfolio.json'


def lines_of(name):
    raw = (TMP / name).read_text(encoding='utf-8').split('\n')
    return [html.unescape(line.replace('[list0]', '').replace('[list]', '').strip())
            for line in raw if line.strip()]


def blocks_from(section_paras):
    """把 [(kind, text), ...] 转成 blocks 数组。"""
    out = []
    for kind, text in section_paras:
        out.append({'type': 'subhead', 'text': text} if kind == 'h' else {'type': 'paragraph', 'text': text})
    return out


# ---------- 01 山重水复 ----------
shan = lines_of('shan.txt')
assert shan[4].startswith('两诗对于当今绍兴'), shan[4][:20]
shan_sections = [
    {'title': '引言', 'paragraphs': [shan[3]]},
    {
        'title': '一、两诗对于当今绍兴城市发展具体的文化传承性',
        'blocks': blocks_from([
            ('h', '1.《游山西村》给现代绍兴的文化传承提供新启示'),
            ('p', shan[6]),
            ('h', '2.《沈园其一》为绍兴城市空间发展提供情感支撑'),
            ('p', shan[8]),
            ('p', shan[9]),
        ]),
    },
    {
        'title': '二、两诗所表达的哲学性与绍兴城市历史人文风貌相契合',
        'blocks': blocks_from([
            ('p', shan[11]),
            ('h', '1.《游山西村》中“山重水复”到“柳暗花明”的心境变化'),
            ('p', shan[12]),
            ('p', shan[13]),
            ('h', '2.《沈园其一》里“遗憾”的本质'),
            ('p', shan[14]),
        ]),
    },
    {'title': '结语', 'paragraphs': [re.sub(r'^结语：', '', shan[15])]},
]

# ---------- 02 玩偶之家 ----------
wanou = lines_of('wanou.txt')
wanou_sections = [
    {'title': '摘要', 'paragraphs': [re.sub(r'^摘要：', '', wanou[1]), wanou[2]]},
    {'title': '一、“关门声”的余音绕梁', 'paragraphs': [wanou[4], wanou[5]]},
    {
        'title': '二、“门”的三重空间功能与人物心理的动态呼应',
        'blocks': blocks_from([
            ('h', wanou[7]),
            ('p', wanou[8]), ('p', wanou[9]), ('p', wanou[10]),
            ('h', wanou[11]),
            ('p', wanou[12]), ('p', wanou[13]), ('p', wanou[14]),
            ('h', '（三）' + wanou[15]),
            ('p', wanou[16]), ('p', wanou[17]), ('p', wanou[18]),
        ]),
    },
    {'title': '三、跨文化影响：从《玩偶之家》到中国“娜拉剧”', 'paragraphs': [wanou[20], wanou[21], wanou[22]]},
    {'title': '四、研究发现与结论', 'paragraphs': [wanou[24], wanou[25]]},
    {'title': '参考文献', 'paragraphs': wanou[27:35]},
]

# ---------- 03 曹禺气味 ----------
caoyu = json.loads((TMP / 'caoyu.json').read_text(encoding='utf-8'))
caoyu_sections = [{'title': s['title'], 'paragraphs': s['paragraphs']} for s in caoyu['sections']]

# ---------- 04 时间「贷」价 ----------
shijian = lines_of('shijian.txt')
shijian_sections = [
    {'title': '创作说明', 'paragraphs': [
        '将时间货币化，以一种夸张而残酷的“时间贷款”协议，展现挥霍时间的巨大代价。核心反差在于：主角以为贷来的是自由，实则签下的是卖身契。',
        '时长约 60 秒。场景为大学校园、宿舍与一间风格昏暗的教室。',
    ]},
    {'title': '人物', 'paragraphs': [
        '主角：大学生贾未来，一个总把“时间还多”挂在嘴边的年轻人。',
        '神秘代理人 X：是“时间信贷员”。',
        '演职员表：贾未来 — 罗怡；神秘人 X 兼陌生人 — 张艺。',
    ]},
    {'title': '分镜脚本', 'paragraphs': shijian[9:]},
]

# ---------- 05 竹林深处 ----------
zhulin = lines_of('zhulin.txt')
zhulin_note = lines_of('zhulin-note.txt')
zhulin_sections = [
    {'title': '导演阐述', 'paragraphs': zhulin[1:8]},
    {
        'title': '剧本大纲',
        'blocks': blocks_from([
            ('h', '资源优势'),
            ('p', zhulin[10]), ('p', zhulin[11]), ('p', zhulin[12]),
            ('h', '专业保障'),
            ('p', zhulin[14]),
            ('h', '执行要点'),
            ('p', zhulin[17]), ('p', zhulin[18]), ('p', zhulin[19]), ('p', zhulin[20]),
        ]),
    },
    {
        'title': '创作的独特性与挑战',
        'blocks': blocks_from([
            ('h', '一、创作独特性'),
            ('h', '1. 真实的原生性与不可复制性'),
            ('p', zhulin[24]),
            ('h', '2. 平民化人文关怀的影像表达'),
            ('p', zhulin[26]),
            ('h', '二、核心创作挑战'),
            ('h', '1. 理论归纳困境'),
            ('p', zhulin[29]),
            ('h', '2. 单一学科理论局限性'),
            ('p', zhulin[31]),
            ('h', '3. 哲学层面的精神叩问'),
            ('p', zhulin[33]),
        ]),
    },
    {
        'title': '纪录片创作的道德与历史目的',
        'blocks': blocks_from([
            ('h', '一、历史参与性：记录“活着的历史”'),
            ('h', '1. “活体历史”的留存'),
            ('p', zhulin[37]),
            ('h', '2. 微观历史的影像见证'),
            ('p', zhulin[39]),
            ('h', '二、道德维度：平衡记录与尊重'),
            ('h', '1. 拍摄对象的长期影响'),
            ('p', zhulin[42]),
            ('h', '2. 非虚构的道德底线'),
            ('p', zhulin[44]),
            ('h', '三、文化责任：传递人文与社会价值'),
            ('h', '1. 文化表现的载体使命'),
            ('p', zhulin[47]),
            ('h', '2. 社会价值的引导与传播'),
            ('p', zhulin[49]),
        ]),
    },
    {
        'title': '行业背景与作品定位',
        'blocks': blocks_from([
            ('h', '行业背景'),
            ('p', zhulin[51]), ('p', zhulin[52]), ('p', zhulin[53]),
            ('h', '作品定位'),
            ('p', zhulin[55]), ('p', zhulin[56]), ('p', zhulin[57]),
        ]),
    },
]

NEW = [
    {
        'id': 'shan-zhong-shui-fu',
        'category': 'papers',
        'categoryLabel': '研读札记',
        'title': '山重水复里的“柳暗花明”到春波绿畔的“惊鸿照影”',
        'subtitle': '文学随笔 · 陆游与绍兴',
        'role': '作者',
        'year': '2026',
        'summary': '从《游山西村》到《沈园其一》，两首诗隔着半生：一首在罢官的烦闷里看见转机，一首在暮年的旧景里认领遗憾。它们一起回答了同一件事——一座城市的精神，是怎样被写下来的。',
        'image': 'assets/works/shanzhong.webp',
        'imageSmall': 'assets/works/shanzhong-small.webp',
        'imageAlt': '绍兴水乡水彩：石桥、柳枝与阶前的一坛黄酒',
        'imageCaption': '氛围配图 · 沈园的桥与酒（非实景照片）',
        'imageRatio': 'portrait',
        'imageWidth': 1024,
        'imageHeight': 1460,
        'demo': False,
        'sections': shan_sections,
    },
    {
        'id': 'wanou-zhijia',
        'category': 'papers',
        'categoryLabel': '研读札记',
        'title': '易卜生《玩偶之家》中空间意象与个体意识的动态关联',
        'subtitle': '论文 · 戏剧研究',
        'role': '作者',
        'year': '2026',
        'summary': '把“门”当作一条线索重读《玩偶之家》：它先是隔绝内外的墙，再是危机闯入的通道，最后成为娜拉走出去的那道边界。三重门，对应一个人从依附到独立的三步。',
        'image': 'assets/works/wanou.webp',
        'imageSmall': 'assets/works/wanou-small.webp',
        'imageAlt': '一扇紧闭的木门，门缝下透出一线暖光',
        'imageCaption': '氛围配图 · 一扇门（非舞台剧照）',
        'imageRatio': 'portrait',
        'imageWidth': 1024,
        'imageHeight': 1460,
        'demo': False,
        'sections': wanou_sections,
    },
    {
        'id': 'caoyu-qiwei',
        'category': 'papers',
        'categoryLabel': '研读札记',
        'title': '气味叙事：为曹禺剧作提供生命元素丰富情感支撑',
        'subtitle': '论文 · 戏剧研究',
        'role': '作者',
        'year': '2026',
        'summary': '《日出》的腐气、《雷雨》的汗与霉锈、《原野》的黑泥与松针——曹禺把看不见的东西写成了能闻到的。这篇论文顺着气味读“生命三部曲”，也讨论气味能不能真的搬上舞台。',
        'image': 'assets/works/caoyu.webp',
        'imageSmall': 'assets/works/caoyu-small.webp',
        'imageAlt': '雷雨前闷热的屋子：木桌、盖碗与被风掀起的窗帘',
        'imageCaption': '氛围配图 · 雷雨前的屋子（非舞台剧照）',
        'imageRatio': 'portrait',
        'imageWidth': 1024,
        'imageHeight': 1460,
        'demo': False,
        'sections': caoyu_sections,
    },
    {
        'id': 'shijian-daijia',
        'category': 'films',
        'categoryLabel': '影像成片',
        'title': '时间“贷”价',
        'subtitle': '公益广告 · 00:59',
        'role': '编剧 / 出演',
        'year': '2026',
        'summary': '如果时间可以贷款，你会签吗？一支六十秒的公益广告：大学生贾未来签下“时间协议”，换来一段狂欢，也换来一个比自己大二十多岁的同学。',
        'image': 'assets/works/shijian.webp',
        'imageSmall': 'assets/works/shijian-small.webp',
        'imageAlt': '《时间“贷”价》静帧：昏暗教室里的一排排空座位',
        'imageCaption': '影像静帧 · 时间“贷”价',
        'imageRatio': 'portrait',
        'imageWidth': 900,
        'imageHeight': 1112,
        'media': {
            'type': 'video',
            'src': 'assets/media/shijian-daijia.mp4',
            'externalUrl': None,
            'caption': '公益广告 · 00:59',
            'description': '编剧 / 出演：张艺。竖屏短片，建议全屏观看。',
        },
        'gallery': [
            {'image': 'assets/works/shijian-still.webp', 'imageSmall': 'assets/works/shijian-still-small.webp',
             'imageAlt': '昏暗的教室，只有窗口透进一点光', 'caption': '镜头 3 · 醒来时的那间教室'},
            {'image': 'assets/works/shijian-end.webp', 'imageSmall': 'assets/works/shijian-end-small.webp',
             'imageAlt': '《时间“贷”价》结尾字幕卡', 'caption': '结尾字幕'},
        ],
        'demo': False,
        'sections': shijian_sections,
    },
    {
        'id': 'zhulin-shenchu',
        'category': 'films',
        'categoryLabel': '影像成片',
        'title': '竹林深处',
        'subtitle': '纪录短片 · 04:18',
        'role': '文本 / 参与拍摄',
        'year': '2026',
        'summary': '绍兴兰亭的一处流浪猫狗基地，阿萍一个人撑着几百只动物、几份工和一身债。这部学生纪录片不打算煽情，只想把一个人固执的善意，连同它招来的非议一起拍下来。',
        'image': 'assets/works/zhulin.webp',
        'imageSmall': 'assets/works/zhulin-small.webp',
        'imageAlt': '《竹林深处》静帧：基地里围在食盆前的狗群',
        'imageCaption': '影像静帧 · 竹林深处',
        'imageRatio': 'landscape',
        'imageWidth': 1280,
        'imageHeight': 796,
        'media': {
            'type': 'video',
            'src': 'assets/media/zhulin-shenchu.mp4',
            'externalUrl': None,
            'caption': '纪录短片 · 04:18',
            'description': '文本 / 参与拍摄：张艺。1280×960 网页版本，保留原片上下黑边与字幕。',
        },
        'epigraph': {
            'text': '看见是理解的开始，而理解，是改变的前提。',
            'from': '《看见，是改变的开始》· 创作手记',
            'note': zhulin_note[1:],
        },
        'demo': False,
        'sections': zhulin_sections,
    },
]

data = json.loads(DATA.read_text(encoding='utf-8'))
by_id = {work['id']: index for index, work in enumerate(data['works'])}
for work in NEW:
    if work['id'] in by_id:
        data['works'][by_id[work['id']]] = work
    else:
        data['works'].append(work)

DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

total = 0
for work in data['works']:
    chars = 0
    for section in work['sections']:
        chars += len(section.get('title', ''))
        chars += sum(len(p) for p in section.get('paragraphs', []))
        chars += sum(len(b.get('text', '')) for b in section.get('blocks', []))
    total += chars
    print(f'{work["id"]:24} {work["category"]:8} {chars:6} 字')
print(f'共 {len(data["works"])} 件 / {total} 字')
