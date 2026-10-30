# 张艺的作品集

青灰纸色、低饱和青绿与手绘水彩质感的个人作品集。原生 HTML / CSS / JavaScript，无运行时第三方依赖、后台或数据库。

线上地址：https://yyysf.github.io/zhangyi-portfolio/ 。整站以「五间房间」为结构：草甸水彩封面 → 文 / 影 / 研 / 声 / 展五张水彩章页 → 深青致谢；详情页是安静的书页，带目录、阅读进度与上一篇 / 下一篇。

## 内容

当前收录 13 件真实作品：

- 剧本：《百元大钞》《她的秋》
- 影评随笔：《日掛中天：日挂中天上，爱恨无尽时》（2025 丽水市大学生电影季影评专业组一等奖）、《我观葡萄》（获奖随笔）
- 文学与戏剧研读札记：《山重水复里的「柳暗花明」到春波绿畔的「惊鸿照影」》（陆游与绍兴）、《易卜生〈玩偶之家〉中空间意象与个体意识的动态关联》、《气味叙事：为曹禺剧作提供生命元素与情感支撑》
- 影像：《绍兴暖契》（「我与中国的美丽邂逅」二等奖）、《时间「贷」价》、《竹林深处》
- 声音：《今晚，稻田没有睡》《守岁的电波》
- 舞台：《作为树的形象》

**所有作品均为全文收录**，详情页不再只给节选或 PDF 下载。全站正文约 5.5 万字：剧本 2.4 万（《她的秋》约 1.8 万、《百元大钞》约 5.9 千），研读札记 1.28 万，舞台《作为树的形象》约 5.9 千，影评随笔 5.3 千，影像文本 4.6 千，声音文本 2.7 千。正文由 `作品所有/` 里的 PDF 与 DOCX 原始文件提取后结构化，未改写句子。

## 视觉与交互

- 封面：整幅草甸水彩铺满首屏，左侧纸面写标题，右侧放《我观葡萄》《她的秋》两张真实封面；首屏只留「开始浏览」一个入口，底部是一条五格分类索引（01 原创剧本 … 05 展演影像），首屏即目录。无胶带、无印章、无英文装饰，页眉有细进度与章节读数。
- 关于：房间索引支持悬停预览真实作品封面；预览图按 4:5 裁切填满相纸；左侧底部用一句作品里的引句收住，下方接一条三格工作照（排练厅 / 绍兴巷子 / 舞台），不再堆文字。获奖记录列表已按作者要求撤掉，单项作品上的获奖标记仍保留。
- 全屏目录：`dialog` 实现，支持 `Esc`、焦点圈与悬停预览图；目录行逐条错峰浮起。
- 章页：剧本「文」、影评「影」、研读札记「研」、声音「声」、展演影像「展」各用一张整幅水彩 + 一个淡到像纸纹的大字，内容在画下方展开。五间房间各有自己的强调色（`--room-accent`：朱砂 / 石板蓝 / 赭石 / 苔绿 / 暗金），落在章页编号、小标签、标题上的细线与底边 3px 色条上，画面另叠一层 15% 的 `multiply` 同色。水彩带轻微视差（±26px，`prefers-reduced-motion` 下关闭）。
- 剧本：首页卡片只讲一件事——封面 + 编号 + 标题 + 一句钩子（`hook`）+ 一句台词引文（`pullQuote` / `pullFrom`）+「读全文」；两页「剧本原页」缩略与全文节选都移进了详情页，首页因此轻了一半。
- 影评：改为左图右文的通栏卡片——《我观葡萄》用真实封面（相纸装裱、不裁切），《日掛中天》用同风格水彩氛围图（正午巷子，非剧照），配小号编号、摘句、阅读时长；详情页展示获奖信息。
- 研读札记：三篇论文排成索引行——96px 竖版缩略图 + 编号 + 分类小标 + 标题 + 摘要 + 「字数 / 阅读时长 / 读全文」，不放大图，读起来像一页目录。章页大字「研」，标题句「一扇门、一种气味、一座城。」对应三篇的核心意象。
- 展演与影像：原先的「影像」「舞台」两节合并成一节 06，章页大字「展」、标题「在灯亮起来之前。」。深色的影像组（三部短片，首页「观看作品」打开真实播放层；详情页内置 720p 视频与拍摄现场图集）与浅色的舞台组（原创舞台海报 + 文字式「开灯 / 关灯」控制，正文末尾三张剧照缩略条；详情页含 4 张舞台剧照）上下相接，两处深浅硬边各用一段渐变化开，章页底边溶进深色、深色底边再溶回纸色。
- 声音：真实音频试听（《今晚，稻田没有睡》04:01），文字式播放控制 + 波形与时间；目录每行左侧加 44px 封面缩略，两件作品都有图可看；详情页可收听两件声音作品。
- 转场：声音一章之后插一条深墨绿引句带（`《守岁的电波》· 李玉妈妈`），只有一句话、一条细线与一个淡「声」字，把 亮—暗—亮 的节奏隔开。
- 致谢：深青结尾、淡「谢」字水印、随便翻一页、复制链接与版权页；正文下方加四张同批拍摄的照片（低饱和处理，桌面四列 / 手机两列，可点开放大），给长页一个视觉收尾。
- 全站：无自定义光标、无 3D 倾斜、无指针视差；页眉在「展演影像」的深色影像组、「致谢」两个深色段落、以及详情页的深色封面横幅上自动切换为深色玻璃态（`is-on-dark`），不再出现浅色横条切断画面；保留缓慢渐显、章页浮现、图片淡淡晕开、细进度、当前章节、图片灯箱（支持上一张 / 下一张与键盘）、页面淡入淡出；支持 `prefers-reduced-motion` 与键盘访问。
- 详情页：顶部是一条深墨绿的封面横幅——左侧分类 / 职责 / 获奖、标题、导语、字数与阅读时长，右侧完整展示作品封面（`contain`，不裁切，可点开放大；影像类作品这里改成「播放作品」，点击直接开全屏播放层，正文里不再重复放一个同封面的播放器）；下方接三栏阅读版式（目录 / 正文 / 工具），目录随滚动高亮，含上一篇 / 下一篇与复制链接，文末保留 PDF 原件下载。章标题带朱砂序号（原文已自带「一、二、」的章节不再重复编号）。
- 详情页·剧本：`reading-section--script` 把角色名排成右对齐的一列、台词落在右栏，舞台提示缩进到台词左边缘，场次标题带一条细分隔线；手机上角色列收到 60px 并允许折行。全套剧本因此可以像纸页一样连续读，而不是一堆条目。
- 详情页·导航：正文里每个场次都有锚点，左侧目录在「剧本全文」下面长出二级场次列表（可滚动、当前场次高亮、目录头显示「18 / 49 场」）。《她的秋》49 场、《百元大钞》8 场、《作为树的形象》4 幕都走这套。
- 详情页·字号：横幅右下角三档「小 / 中 / 大」（15 / 17 / 19px），写进 `localStorage`，只影响正文 `--fs-body`。
- 图注：`图 01 · …` 编号左侧朱砂，图集与工作照统一用 `.caption-no`。

## 本地预览

安装 Node.js 后，在此目录运行：

```powershell
npm start
```

打开 http://127.0.0.1:4173 。保持终端运行即可预览，按 Ctrl+C 停止。可用 `PORT` 环境变量修改端口。

请使用本地 HTTP 预览，不要双击 HTML 通过 file:// 打开：浏览器会限制作品数据 JSON 的读取。

## 替换作品

编辑 `dist/data/portfolio.json` 的 `works` 数组。每项作品包含：

- `id`：唯一英文标识，发布后尽量保持不变，详情地址为 `work.html?id=标识`。
- `category`：`scripts`（剧本）、`essays`（影评）、`papers`（文学与戏剧研读札记）、`films`（影像）、`sound`（声音）、`stage`（舞台）。
- `categoryLabel`、`title`、`subtitle`、`summary`：作品分类、标题、类型及摘要。
- `role`、`year`、`award`：可选，作者职责、年份与获奖信息；有 `award` 时首页卡片与详情页会显示获奖标记。
- `demo`：当前真实作品均为 `false`。若临时加入演示内容可设为 `true`，页面会显示示例提示。
- `image`、`imageSmall`、`imageAlt`、`imageCaption`：封面路径、700px 缩略图、图片描述与图注。
- `imageRatio`：`portrait`（竖版，3:4 展示）、`square`（1:1）或 `landscape`（16:9）。封面会以 `contain` 完整呈现，不裁切标题。
- `imageWidth`、`imageHeight`：原图尺寸，用于避免布局跳动。影像类作品的播放框比例直接由这两个值算出（写入 CSS 变量 `--ar`），所以竖拍的短片不会被压成 16:9；框高大于框宽时自动加 `is-portrait`，限宽 430px、`object-fit:contain` 并居中。
- `epigraph`：可选题记带，详情页在封面横幅下方单独铺一条。`text` 是引文，`from` 是出处，`note` 是可选的多段说明（数组）。《竹林深处》用它放了导演阐述开头的五段话。
- `gallery`：可选图集数组，每项含 `image`、`imageSmall`、`imageAlt`、`caption`；详情页会以 2 列网格展示并可点击放大。
- `sections`：正文段落。普通文章使用 `title` 和 `paragraphs`；剧本还支持 `blocks`，其 `type` 可为 `scene`（场次）、`paragraph`（舞台提示 / 叙述）、`dialogue`（对白，需 `speaker`）、`subhead`（小节标题，长文里用来分（一）（二）这类子目）。
- `homeExcerpt`：可选，首页剧本卡片的「剧本节选」，数组，元素结构同 `blocks`。不填时首页自动取第一个场次的前两句对白；填了就用策展过的那一段。
- `pdf`：可选 PDF 路径，提供后详情页显示下载入口。
- `pageCount`：可选，剧本总页数，显示在首页「剧本原页」说明里。
- `pagePreviews`：可选，首页展示的剧本原页缩略图，最多取 2 项；每项含 `image`、`imageSmall`、`imageAlt`、`caption`。图片是把 PDF 前两页渲染成 3:4 裁切图（640px 宽），放入 `dist/assets/works/`，点击可放大。

作品封面放入 `dist/assets/works/`，媒体放入 `dist/assets/media/`。JSON 文件路径从 `dist` 根目录起写，例如 `assets/works/my-work.webp`。

音视频配置示例：

```json
"media": {
  "type": "video",
  "src": "assets/media/my-film.mp4",
  "externalUrl": null,
  "caption": "文本 + 影像作品 · 01:26",
  "description": "文案：张艺。"
}
```

音频把 `type` 改为 `audio`，使用 MP3 / M4A / WAV 等浏览器支持的格式。`src` 与 `externalUrl` 没有时写 `null`。只提供外部链接也可以，网站会显示跳转链接，不尝试绕过视频平台的嵌入限制。媒体不会自动播放，播放一个时会暂停页面上的其他媒体；详情页头部会自动显示 `caption` 中的时长。

姓名、站点名称和封面简介在 JSON 的 `profile` 中编辑，剧本摘句使用作品的可选 `excerpt` 字段。其他封面文字、个人介绍、致谢和分类介绍在 `dist/index.html` 中编辑；视觉参数在 `dist/assets/style.css` 中编辑。

当前真实素材来自仓库外 `作品所有/` 目录：剧本 PDF 与音频、视频已分别放入 `dist/assets/media/`，封面与剧照已转为 WebP 放入 `dist/assets/works/`。原始 Word / PDF / 音视频请保留备份，网站只引用发布副本。

## 视觉系统

`dist/assets/style.css` 顶部是一组设计令牌，改配色和字号优先改这里，不要在具体规则里写死数值。

- 颜色（2026-10 提饱和）：`--paper` #f7f3e9 暖米纸、`--ink` #1e2f2a 墨绿、`--muted` #56685f、`--green` #35655a、`--green-deep` #12302b、`--accent` #b4553a 朱砂（编号、细线、引号）、`--accent-ink` #9c4a31、`--tint` #e9efe3。**文字用 `--green-ink`（#1f5348，7.9:1）/ `--accent-ink`（5.5:1），线条与色块用 `--green` / `--accent`。** `--accent` 只有 4.4:1，只能给大字号数字与装饰线，不要用来写 11–13px 小字。
- 图片饱和度：首屏草甸与五张章页水彩都是 `opacity:1 + saturate(1.2)`（首屏 1.2、章页 1.2 + `contrast(1.15)`），只在文字一侧加压暗渐变，画面不再整幅洗白。06 的章页水彩本身是暗墙，所以那一张改成浅字压深底，并在文案后面垫一层向右淡出的暗色。
- 字体：标题本地霞鹜文楷（WenKai），正文系统中文衬线，小号编号与说明用无衬线；站内不出现英文装饰字。
- 字号：`--fs-xs` 11 / `--fs-sm` 13 / `--fs-base` 15 / `--fs-body` 17 / `--fs-md` 22 / `--fs-lg` 34 / `--fs-xl` 48 / `--fs-2xl` 64。封面与章节大标题使用 `clamp()` 按视口缩放。**全站最小字号 11px，不再出现 8–10px 的中文标签。**
- 行高：按层级分四档，不再逐处写中间值。大标题（≥56px）1.02–1.25（字号越大行高越紧）；小节标题 1.3；正文与说明 1.9；导语 1.75。新增规则请落到这四档之一，不要写 2.0、2.05、2.1。
- 版式：`--shell` 1320 / `--gutter` clamp(20px, 4.6vw, 74px) / `--measure` 640。所有区块共用同一左边缘，新增区块不要另设宽度。
- **行宽一律用 `em`，不要用 `ch`。** 中文排版里 `1em` 才等于一个汉字宽；`ch` 量的是数字 "0" 的宽度，在中文字体里只有半个字，写成 `40ch` 实际每行只有 19 字，会把正文压成窄栏。当前各处的 `N em` 即"每行 N 个汉字"，正文 26–32em、说明 22–26em、导语 18–20em。
- 对比度：`--muted`（#56685f）对纸色 5.35:1，是次级文字的下限，不要再调浅。深色段落（`--film` / `--green-deep` / 详情页横幅）上的文字用 `rgba(247,243,233,.72)` 起步，不要低于 `.62`。

影评与随笔的配图规则：有真实封面的直接用作卡片主图（`imageRatio` 为 `portrait` 时按相纸装裱、`contain` 不裁切；为 `landscape` 时按 16:10 裁切填满左侧栏）。没有封面的作品使用同风格水彩氛围图，`imageCaption` 里标注「非剧照」，不要换成来源不明的网络图片。

分享卡片已按真实作品封面重新制作，输出在 `dist/assets/brand/og-cover.jpg`（1200 × 630）。如需调整，直接替换该文件即可；`make-brand-assets.py` 中的旧水彩版脚本不再用于当前封面。

## 字体与图片

标题使用本地霞鹜文楷子集，字体项目：https://github.com/lxgw/LxgwWenKai 。原始字体按 SIL OFL 1.1 授权，许可证位于 `dist/assets/fonts/OFL.txt`。子集重命名为 Portfolio WenKai，保留原版权与许可记录。正文使用系统中文字体。

新增标题汉字若不在字体子集中，会自动使用系统楷体或衬线字体，不会缺字。需要统一字形时运行：

```powershell
python scripts/prepare-assets.py
```

该维护脚本需要 Pillow、fontTools 和 Brotli。剧本原页缩略图另需 PyMuPDF（`pip install pymupdf`），渲染命令见 `scripts/` 历史提交，或直接替换 `dist/assets/works/*-page*.webp`。

本地截图脚本只用于开发自查（Chrome 无头 + CDP），不参与发布，也不要上传到静态目录。先用 `chrome --headless=new --remote-debugging-port=9222` 启动浏览器，再运行：

- `node scripts/shot.mjs <url> <输出.png> [宽度] [full|viewport]` —— 整页分段截图，切片落在 `parts/`，需自行拼接。
- `node scripts/shot-el.mjs <url> <选择器> <输出.png> [宽度] [上下留白] [缩放]` —— 按选择器截单个区块，内部按 1200px 切片后交给 `scripts/stitch.py` 拼回一张。本机无头 Chrome 一次性截超过约 1400px 高的视口会卡在 `Page.captureScreenshot`，所以必须切片；拼图按实际 `scrollY` 贴片，页面滚到底被夹住时不会重复内容。
- `node scripts/audit.mjs` —— 在 1440 / 768 / 390 三档宽度下查横向溢出、影像框比例与章页大字字体回退。

普通预览、编辑与发布不需要 Python。原始字体与六张生成插画保留于 `source-assets/`，网站实际使用本地压缩 WebP。新增声音静物提供 1536px 与 768px 两种尺寸。插画使用内置 imagegen 生成，提示词与素材用途见 `source-assets/art-prompts.md`，不代表实际剧照或排练照片。仓库外 `素材/` 目录为本次改版参考图，不参与站点构建。

## 检查与部署文件

```powershell
npm run check
```

`dist` 是完整静态发布目录，无需安装依赖或执行构建命令。

### 发布到 GitHub Pages

当前采用 GitHub Pages 托管：`gh-pages` 分支存放 **dist 的全部内容**，站点文件位于该分支根层，并带一个空的 `.nojekyll` 以跳过 Jekyll 处理。页面源码仍在 `main` 分支，二者互不干扰。

- 线上地址：https://yyysf.github.io/zhangyi-portfolio/
- 仓库：https://github.com/yyysf/zhangyi-portfolio
- Pages 设置：Source 为 **Deploy from a branch**，分支 `gh-pages`、目录 `/ (root)`，已启用 HTTPS。

以后每次更新：

```powershell
git add -A; git commit -m "更新内容"
npm run deploy:pages
git push origin main
git push origin gh-pages
```

脚本从 `dist` 当前内容重建分支，所以务必先提交源码，否则线上版本无法对应到提交。若远端分支被网页端改过而推送被拒，用 `git push origin gh-pages --force-with-lease`。

- 站点内全部引用均为相对路径，放在仓库子路径下可以正常访问，无需改代码。
- 免费账号的 Pages 要求仓库为公开。
- 中国大陆公网与微信访问的稳定性取决于网络环境，未做实测。

换到新仓库时，另需 `git remote add origin 仓库地址`、推送 `main` 与 `gh-pages`，再在 Settings → Pages 选好分支。

### 备选：更新 Sites

Sites 只有「保存版本」和「部署版本」两步，没有文件上传界面，不要尝试上传 `dist` 或压缩包。`.openai/hosting.json` 保留原有站点关联。

1. 在 ChatGPT 桌面应用或 Codex 中打开本项目目录（`hosting.json` 把关本地源码和线上站点关联起来）。
2. 让 sites 为当前提交构建并保存一个版本，例如：「用 sites 保存这个项目的版本，沿用现有站点（project_id appgprj_6addb7ba141081918227cd31378bc3de），先不要部署」。
3. 核对预览无误后再让它部署该版本；部署成功后它会返回线上地址。
4. 想确认历史版本时，让 ChatGPT 列出已保存的版本。

每次保存版本会关联构建所用的 Git 提交，所以务必先提交改动再让 sites 构建。

### 其他托管平台

如果要换用 Cloudflare Pages、Netlify、Vercel 等支持文件上传的平台，可上传 **dist 内的全部内容**，确保 `index.html` 位于上传目录根层；不要上传 `source-assets`、测试或预览服务器。`zhangyi-portfolio-site.zip` 是 `dist` 的打包结果（`index.html` 位于根层），仅用于这类平台或留档，改动 `dist` 后需重新打包（条目分隔符统一为 `/`）：

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$dist = (Resolve-Path .\dist).Path
Remove-Item zhangyi-portfolio-site.zip -Force -ErrorAction SilentlyContinue
$zip = [System.IO.Compression.ZipFile]::Open((Join-Path $PWD 'zhangyi-portfolio-site.zip'), 'Create')
Get-ChildItem -Recurse -File $dist | ForEach-Object {
  $name = $_.FullName.Substring($dist.Length + 1).Replace('\', '/')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $name) | Out-Null
}
$zip.Dispose()
```

上传后在浏览器硬刷新确认新首页生效。目标平台上的旧文件若与新包不同名（例如替换图片后改了文件名），需一并删除。

当前收录的 13 件作品均为真实作品：剧本 PDF、作品封面、两段音频与三部短片已接入。微信及大陆公网访问的稳定性取决于网络环境，未做实测。本地预览网址只在运行服务器的电脑上可用，不是公开分享链接。
