"""把 docx 的段落与编号层级导成纯文本，便于逐段核对（不依赖 python-docx）。

用法：python3 scripts/dump-docx.py <file.docx> <out.txt>
"""
import re
import sys
import zipfile

NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def para_text(node):
    return ''.join(re.findall(r'<w:t[^>]*>(.*?)</w:t>', node, re.S))


def para_style(node):
    match = re.search(r'<w:pStyle w:val="([^"]+)"', node)
    numbered = '<w:numPr>' in node
    level = re.search(r'<w:ilvl w:val="(\d+)"', node)
    return match.group(1) if match else '', numbered, (level.group(1) if level else '')


with zipfile.ZipFile(sys.argv[1]) as archive:
    xml = archive.read('word/document.xml').decode('utf-8')

paras = re.findall(r'<w:p[ >].*?</w:p>', xml, re.S)
lines = []
for node in paras:
    text = para_text(node)
    style, numbered, level = para_style(node)
    if not text.strip():
        continue
    tag = ''
    if numbered:
        tag = f'[list{level}]'
    elif style:
        tag = f'[{style}]'
    lines.append(f'{tag}{text.strip()}')

open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(lines))
print(f'{len(lines)} 段 -> {sys.argv[2]}')
