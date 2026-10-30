"""v3 样式补丁：06 合并节、04 研读札记、影像卡比例、水彩力度、页脚索引对齐。

一次性执行；每处替换都带断言，改错会立刻报错而不是静默跳过。
"""
from pathlib import Path

CSS = Path(__file__).resolve().parents[1] / 'dist/assets/style.css'
css = CSS.read_text(encoding='utf-8')


def swap(old, new, label):
    global css
    assert old in css, f'找不到片段：{label}'
    css = css.replace(old, new, 1)
    print(f'ok  {label}')


# 1. 水彩力度：saturate 1.08/1.12 -> 1.2，章页加 contrast
swap('filter:saturate(1.08) contrast(1.03) brightness(1.01);',
     'filter:saturate(1.2) contrast(1.05) brightness(1.01);', '首屏水彩力度')
swap('filter:saturate(1.12) contrast(1.04) brightness(1.01);',
     'filter:saturate(1.2) contrast(1.15) brightness(1.01);', '章页水彩力度')

# 2. 首屏分类索引：名称长短不齐时底边对齐
swap(""".hero-index a{
  display:inline-flex;
  align-items:baseline;
  gap:8px;
  padding-bottom:3px;""",
     """.hero-index a{
  display:flex;
  flex-wrap:wrap;
  align-items:baseline;
  align-content:flex-start;
  min-height:2.9em;
  gap:8px;
  padding-bottom:3px;""", '首屏索引底边')

# 3. 首屏 eyebrow 提字号
swap('.hero-eyebrow{margin-bottom:clamp(20px,3.6vh,38px)}',
     """.hero-eyebrow{
  margin-bottom:clamp(20px,3.6vh,38px);
  font-size:var(--fs-sm);
  letter-spacing:.16em;
  color:var(--green-ink);
}""", '首屏 eyebrow 字号')

# 4. 04 研读札记：房间色 + 条目版式
swap("""#scripts{--room-accent:#b4553a}
#essays{--room-accent:#46707d}""",
     """#scripts{--room-accent:#b4553a}
#essays{--room-accent:#46707d}
#papers{--room-accent:#7a6a52}""", '研读札记房间色')

swap(""".essays{
  background:""",
     """.papers{background:var(--paper)}
.papers-layout{
  display:flex;
  flex-direction:column;
  border-top:1px solid var(--line-soft);
}
.paper-item{
  display:grid;
  grid-template-columns:96px minmax(0,1fr);
  gap:clamp(20px,2.6vw,38px);
  align-items:start;
  padding-block:clamp(26px,3.4vw,42px);
  border-bottom:1px solid var(--line-soft);
}
.paper-thumb{
  display:block;
  width:96px;
  aspect-ratio:3/4;
  overflow:hidden;
  background:var(--paper-soft);
  border:1px solid var(--line-soft);
}
.paper-thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  filter:saturate(1.06) contrast(1.02);
  transition:transform .6s var(--ease);
}
.paper-thumb:hover img{transform:scale(1.03)}
.paper-body{min-width:0}
.paper-title{
  margin-top:6px;
  font-size:clamp(20px,2.1vw,26px);
  line-height:1.5;
  letter-spacing:.01em;
}
.paper-title a{transition:color .25s}
.paper-title a:hover{color:var(--green-ink)}
.paper-summary{
  margin-top:10px;
  max-width:30em;
  font-size:var(--fs-sm);
  line-height:1.9;
  color:var(--muted);
}
.paper-foot{
  display:flex;
  align-items:center;
  gap:18px;
  margin-top:16px;
  font:400 11px/1.6 var(--sans);
  letter-spacing:.14em;
  color:var(--ink-soft);
}
.paper-foot .line-link{margin-left:auto}
.essays{
  background:""", '研读札记版式')

# 5. 06 展演影像：深浅两组 + 组标题
swap(""".films{
  background:
    radial-gradient(ellipse 60% 50% at 85% 20%,rgba(72,108,98,.3),transparent 65%),
    radial-gradient(ellipse 55% 45% at 0% 100%,rgba(58,92,82,.26),transparent 70%),
    var(--film);
  color:#e9eee6;
  overflow:hidden;
}
.films .chapter-head::before{background:rgba(244,240,229,.2)}
.films .chapter-no{color:rgba(244,240,229,.72)}
.films .eyebrow{color:#a9c2b6}
.films .chapter-side{color:rgba(244,240,229,.74)}
.films .loading-message{color:rgba(244,240,229,.76)}""",
     """.showcase-group{position:relative}
.showcase-head{
  display:flex;
  align-items:center;
  gap:16px;
  padding-bottom:16px;
  margin-bottom:clamp(26px,3.4vw,44px);
  border-bottom:1px solid var(--line);
  font:500 var(--fs-sm)/1.6 var(--sans);
  letter-spacing:.2em;
  color:var(--green-ink);
}
.showcase-head::after{
  content:'';
  flex:1;
  height:1px;
  background:currentColor;
  opacity:.18;
}
.showcase-group--films{
  background:
    radial-gradient(ellipse 60% 50% at 85% 20%,rgba(72,108,98,.3),transparent 65%),
    radial-gradient(ellipse 55% 45% at 0% 100%,rgba(58,92,82,.26),transparent 70%),
    var(--film);
  color:#e9eee6;
  overflow:hidden;
  padding-block:clamp(52px,6.5vw,88px) clamp(60px,7.5vw,104px);
}
.showcase-group--films .showcase-head{color:rgba(244,240,229,.8);border-bottom-color:rgba(244,240,229,.22)}
.showcase-group--films .loading-message{color:rgba(244,240,229,.76)}""", '06 影像组')

# 6. 影像卡比例改由 --ar 驱动
swap(""".film-frame img{
  width:100%;
  aspect-ratio:16/9;
  object-fit:cover;
  filter:saturate(.92) brightness(.94);
}""",
     """.film-frame img{
  width:100%;
  aspect-ratio:var(--ar,16/9);
  object-fit:cover;
  filter:saturate(.92) brightness(.94);
}
.film-frame.is-portrait{max-width:min(430px,64vw);margin-inline:auto}
.film-frame.is-portrait img{object-fit:contain;background:#08130f}""", '影像卡比例')

# 7. 舞台组承接原 .stage 的渐变
swap('.stage{background:linear-gradient(to bottom,var(--paper),var(--tint) 75%,var(--paper))}',
     """.showcase-group--stage{
  background:linear-gradient(to bottom,var(--paper),var(--tint) 75%,var(--paper));
  padding-block:clamp(52px,6.5vw,88px);
}""", '舞台组背景')

# 8. 声音段改渐变，与舞台统一
swap(""".sound{
  background:
    radial-gradient(ellipse 52% 55% at 82% 30%,rgba(158,188,178,.30),transparent 70%),
    radial-gradient(ellipse 45% 40% at 4% 90%,rgba(158,190,172,.16),transparent 72%),
    var(--tint);
  border-top:1px solid var(--line-soft);
}""",
     """.sound{
  background:
    radial-gradient(ellipse 52% 55% at 82% 30%,rgba(158,188,178,.26),transparent 70%),
    radial-gradient(ellipse 45% 40% at 4% 90%,rgba(158,190,172,.14),transparent 72%),
    linear-gradient(to bottom,var(--paper),var(--tint) 22%,var(--tint) 78%,var(--paper));
}""", '声音段渐变')

# 9. 影评标题不在词中间断行
swap(""".essay-card h3{""", """.essay-card h3{
  text-wrap:balance;""", '影评标题断行')

# 10. 详情页题记带
swap(""".work-layout{""",
     """.work-epigraph{
  display:grid;
  grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);
  gap:clamp(20px,3vw,48px);
  margin-top:clamp(28px,3.6vw,46px);
  padding:clamp(26px,3.4vw,42px) clamp(22px,3vw,40px);
  background:var(--tint);
  border:1px solid var(--line-soft);
}
.work-epigraph__text{
  font-size:clamp(21px,2.4vw,29px);
  line-height:1.6;
  letter-spacing:.01em;
}
.work-epigraph__from{
  display:block;
  margin-top:12px;
  font:400 11px/1.6 var(--sans);
  font-style:normal;
  letter-spacing:.16em;
  color:var(--muted);
}
.work-epigraph__note p{
  font-size:var(--fs-sm);
  line-height:1.9;
  color:var(--muted);
}
.work-epigraph__note p + p{margin-top:.85em}
.work-layout{""", '详情页题记带')

# 11. 平板与手机：新组件的断点（追加在文件末尾，避免误插入旧媒体块）
css += """
@media(max-width:980px){
  .work-epigraph{grid-template-columns:minmax(0,1fr)}
  .paper-item{grid-template-columns:84px minmax(0,1fr);gap:20px}
  .paper-thumb{width:84px}
}
@media(max-width:767px){
  .paper-item{grid-template-columns:72px minmax(0,1fr);gap:16px}
  .paper-thumb{width:72px}
  .paper-foot{flex-wrap:wrap;gap:12px}
  .paper-foot .line-link{margin-left:0}
  .work-epigraph{padding:22px 18px}
  .showcase-head{margin-bottom:22px}
}
"""

CSS.write_text(css, encoding='utf-8')
print('style.css 已更新')
