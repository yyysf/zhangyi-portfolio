"""曹禺 PDF 取文归一化：修康熙部首、补回文本层丢失的字、剥脚注与参考文献、重排摘要块，输出结构化 JSON。

用法：python3 scripts/normalize-caoyu.py <raw.txt> <out.json>
逐条核对依据：.tmp/caoyu-pages/page-01…07.png（渲染自原 PDF）
"""
import json
import re
import sys
import unicodedata

raw = open(sys.argv[1], encoding='utf-8').read()


def fix_char(ch):
    """只对部首区做 NFKC，避免把全角标点转成半角。"""
    if 0x2E80 <= ord(ch) <= 0x2FDF:
        return unicodedata.normalize('NFKC', ch)
    return ch


text = ''.join(fix_char(ch) for ch in raw)

# 1. 手工映射 NFKC 处理不掉的补充部首
EXTRA = {
    '⻅': '见', '⻄': '西', '⻩': '黄', '⻢': '马', '⻛': '风', '⻤': '鬼',
    '⻆': '角', '⺠': '民', '⻘': '青', '⻁': '虎', '᯿': '重', '⺟': '母',
    '⻰': '龙', '⻮': '齿', '⻋': '车', '⻔': '门', '⻓': '长', '⻙': '韦',
    '⻚': '页', '⻝': '食', '⻜': '飞', '⻥': '鱼', '⻦': '鸟', '⻧': '卤',
    '⻨': '麦', '⻳': '龟', '⺮': '竹', '⻬': '齐',
}
for bad, good in EXTRA.items():
    text = text.replace(bad, good)

# 2. 单破折号是字体映射残留，原文是「一」；「——」才是真破折号
text = re.sub(r'(?<!—)—(?!—)', '一', text)

# 3. 文本层丢失的汉字（逐条对照 PDF 页面截图核对）
FIXES = [
    ('气味书写的 要性', '气味书写的重要性'),
    ('中的 要部分', '中的重要部分'),
    ('其他 要效应', '其他主要效应'),
    ('雷雨 日出 原 北京人', '雷雨 日出 原野 北京人'),
    ('新生力 的嗅觉符号', '新生力量的嗅觉符号'),
    ('厚 感', '厚重感'),
    ('大 的生命元素', '大量的生命元素'),
    ('毁灭与 生', '毁灭与重生'),
    ('乡 本色', '乡野本色'),
    ('乡 环境', '乡野环境'),
    ('人性狂 所', '人性狂野所'),
    ('双 嗅觉叙事', '双重嗅觉叙事'),
    ('荒 的典型', '荒野的典型'),
    ('荒 的神秘', '荒野的神秘'),
    ('《原 》', '《原野》'),
    ('粗旷的 性', '粗犷的野性'),
    ('周围 草的', '周围野草的'),
    ('乡 中草木', '乡野中草木'),
    ('至关 要', '至关重要'),
    ('以“ ”为核心', '以“野”为核心'),
    ('又与乡环境', '又与乡野环境'),
    ('中大运用想象性气味', '中大量运用想象性气味'),
]


def apply_fixes(value):
    for bad, good in FIXES:
        value = value.replace(bad, good)
    return value


text = apply_fixes(text)

# 4. 去掉中文之间的排版空格，保留西文词间空格
CJK = r'\u3000-\u303f\u4e00-\u9fff\uff00-\uffef'
text = re.sub(rf'([{CJK}])[ \t]+([{CJK}])', r'\1\2', text)
text = re.sub(rf'[ \t]+([{CJK}])', r'\1', text)
text = re.sub(rf'([{CJK}])[ \t]+', r'\1', text)

# 5. 行层面：整行只有一个「一」的，与下一行合并（PDF 把「一、」拆成两行）
raw_lines = [line.strip() for line in text.split('\n') if line.strip()]
lines = []
for line in raw_lines:
    if lines and lines[-1] in tuple('一二三四五六七八九十') and line.startswith(('、', '，')):
        lines[-1] = lines[-1] + line
    else:
        lines.append(line)

# 6. 定位结构：标题 / 摘要 / 关键词 / 正文 / 参考文献
head_idx = lines.index('摘要')
kw_idx = next(i for i, line in enumerate(lines)
              if i > head_idx and '生命三部曲' in line and '气味叙事' in line and len(line) < 40)
title = apply_fixes(''.join(lines[:head_idx]))
abstract = apply_fixes(''.join(lines[head_idx + 1:kw_idx]))
keywords = lines[kw_idx]
body_lines = lines[kw_idx + 1:]
if '参考文献' in ''.join(body_lines):
    body_lines = body_lines[:next(i for i, line in enumerate(body_lines) if line.startswith('参考文献'))]

# 7. 按标题切节，其余行按句末合并成段
HEADING = re.compile(r'^(?:[一二三四五六七八九十]、|[（(][一二三四五六七八九十][）)])')
sections = [{'title': '', 'paragraphs': []}]
buf = ''
for line in body_lines:
    if HEADING.match(line):
        if buf:
            sections[-1]['paragraphs'].append(buf)
            buf = ''
        if sections[-1]['title'] or sections[-1]['paragraphs']:
            sections.append({'title': line, 'paragraphs': []})
        else:
            sections[-1]['title'] = line
        continue
    buf += line
    if re.search(r'[。！？]$', buf):
        sections[-1]['paragraphs'].append(buf)
        buf = ''
if buf:
    sections[-1]['paragraphs'].append(buf)

# 8. 清掉脚注标记与残留引文（参考文献已在第 6 步截断，正文里的上标数字一并去掉）
CITATIONS = [
    '王尔德.百年孤独[M].沈阳:辽宁教育出版社,2021.03.',
    '李莹,王原.数字虚拟交互技术与戏剧舞台的融合研究[J].剧作家,2025',
    '莫言.小说的气味(节选)[J].作文,2025,(第30期).',
    '梁鹏.亚里士多德《诗学》集注[M].中译出版社.2017.',
    '李迈.普鲁斯特效应：气味对情绪记忆的影响[D].河北师范大学,2024.',
    '李增.气味与人物的阶级属性——英国19世纪60年代小说中一种特有现象的分析[J].东北师大学报,2002.',
    '曹禺.雷雨日出原野北京人曹禺经典剧作[M].成都:巴蜀书社,2016.01.',
    '雷雨日出原野北京人曹禺经典剧作[M].成都:巴蜀书社,2016.01.',
    '一种特有现象的分析[J].东北师大学报,2002.',
]


def clean_para(value):
    value = apply_fixes(value)
    # 引文里的年份被拆成「2 0 1 6」这种带空格形式，先并回数字再匹配
    while re.search(r'\d \d', value):
        value = re.sub(r'(?<=\d) (?=\d)', '', value)
    for citation in CITATIONS:
        value = value.replace(citation, '')
    value = re.sub(r'(?<=[”』」])\d(?=[，。；：、])', '', value)
    value = re.sub(r'(?<=[。])\d(?=[\u4e00-\u9fff“])', '', value)
    value = re.sub(r'（Proust Effect）\d', '（Proust Effect）', value)
    value = re.sub(r'(?<=[\u4e00-\u9fff])([1-9])\.(?=[\u4e00-\u9fff])', '', value)
    value = re.sub(r'(?<=[\u4e00-\u9fff])\d(?=[。：])', '', value)
    # 上标脚注号：夹在汉字之间、且不是「世纪／年代」的年份
    value = re.sub(r'(?<=[\u4e00-\u9fff”》）])\d{1,2}(?!世纪|年代)(?=[\u4e00-\u9fff“《])', '', value)
    value = re.sub(r'\[\d\]', '', value)
    # 页底脚注被并入正文时，编号与引文连成一串，按已知片段整段剥掉
    value = re.sub(r'\d*曹禺\.雷雨日出.*?东北师大学报,2002\s*\.', '', value)
    value = re.sub(r'\d*王尔德\..*?辽宁教育出版社,2021\.?0?3?\.?', '', value)
    value = re.sub(r'\d*李莹,王原\..*?剧作家,2025\.?', '', value)
    value = re.sub(r'^[：:]+', '', value)
    return value.strip()


for section in sections:
    section['title'] = clean_para(section['title'])
    section['paragraphs'] = [p for p in (clean_para(p) for p in section['paragraphs']) if p]

# 9. 标题被 PDF 拆到两行时并回去：短标题接上首段冒号前的半句
for index, section in enumerate(sections):
    paragraphs = section['paragraphs']
    if not paragraphs or '：' in section['title'] or not section['title'].endswith('、'):
        continue
    head = paragraphs[0]
    colon = head.find('：')
    if 0 < colon <= 30:
        section['title'] = section['title'] + head[:colon]
        rest = head[colon + 1:]
        section['paragraphs'] = ([rest] if rest else []) + paragraphs[1:]

for section in sections:
    section['title'] = section['title'].rstrip('：')

sections = [s for s in sections if s['title'] or s['paragraphs']]
result = {
    'title': title,
    'abstract': clean_para(abstract),
    'keywords': keywords,
    'sections': sections,
}
json.dump(result, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

chars = sum(len(p) for s in sections for p in s['paragraphs'])
print(f'标题 {len(title)} / 摘要 {len(result["abstract"])} / {len(sections)} 节 / 正文 {chars} 字')
for section in sections:
    print(f'  - {section["title"][:40]} · {len(section["paragraphs"])} 段')
