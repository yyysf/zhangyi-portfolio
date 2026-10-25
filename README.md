# 张艺的作品集

白底青绿、水彩插画与艺术展览风格的个人作品集演示站。原生 HTML / CSS / JavaScript，无运行时第三方依赖、后台或数据库。

本次视觉升级已通过本地检查并提交为 Git 提交 `1f3d3d5`。站点改为 GitHub Pages 托管，`gh-pages` 分支已由 `dist` 生成，推送后即可上线，见下方部署说明。八个模块采用封面风景、中文目录、剧本手稿、刊物影评、深青绿放映框、舞台过程记录、声音静物与风景致谢的不同构图。详情页按类别区分开篇，长正文统一为最大 700px 阅读宽度。

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
- `category`：`scripts`（剧本）、`essays`（影评）、`films`（影像）、`stage`（舞台）、`sound`（声音）。
- `categoryLabel`、`title`、`subtitle`、`summary`：作品分类、标题、类型及摘要。
- `demo`：演示内容为 `true`；替换成确属本人创作的作品后改为 `false`，并检查正文中的示例说明。
- `image`、`imageAlt`、`imageCaption`：可选配图路径、图片描述、图注。`imageSmall` 为可选的 768px 缩略版本；替换图片时同时替换或删除此字段，避免仍显示旧缩略图。
- `sections`：正文段落。普通文章使用 `title` 和 `paragraphs`；剧本还支持 `blocks`，其 `type` 可为 `scene`、`paragraph`、`dialogue`。对白增加 `speaker` 字段。
- `pdf`：可选 PDF 路径，提供后详情页显示下载入口。

图片放入 `dist/assets/images/`，媒体放入 `dist/assets/media/`（按需新建）。JSON 文件路径从 `dist` 根目录起写，例如 `assets/images/my-work.webp`。

音视频配置示例：

```json
"media": {
  "type": "video",
  "src": "assets/media/my-film.mp4",
  "externalUrl": "https://你的作品原链接",
  "caption": "视频待补充",
  "description": "真实素材待补充。"
}
```

音频把 `type` 改为 `audio`，使用 MP3 / M4A / WAV 等浏览器支持的格式。`src` 与 `externalUrl` 没有时写 `null`。只提供外部链接也可以，网站会显示跳转链接，不尝试绕过视频平台的嵌入限制。媒体不会自动播放，播放一个时会暂停页面上的其他媒体。

姓名、站点名称和封面简介在 JSON 的 `profile` 中编辑，剧本摘句使用作品的可选 `excerpt` 字段。其他封面文字、个人介绍、致谢和分类介绍在 `dist/index.html` 中编辑；视觉参数在 `dist/assets/style.css` 中编辑。

## 字体与图片

标题使用本地霞鹜文楷子集，字体项目：https://github.com/lxgw/LxgwWenKai 。原始字体按 SIL OFL 1.1 授权，许可证位于 `dist/assets/fonts/OFL.txt`。子集重命名为 Portfolio WenKai，保留原版权与许可记录。正文使用系统中文字体。

新增标题汉字若不在字体子集中，会自动使用系统楷体或衬线字体，不会缺字。需要统一字形时运行：

```powershell
python scripts/prepare-assets.py
```

该维护脚本需要 Pillow、fontTools 和 Brotli。普通预览、编辑与发布不需要 Python。原始字体与五张生成插画保留于 `source-assets/`，网站实际使用本地压缩 WebP。新增声音静物提供 1536px 与 768px 两种尺寸。插画使用内置 imagegen 生成，提示词与素材用途见 `source-assets/art-prompts.md`，不代表实际剧照或排练照片。

## 检查与部署文件

```powershell
npm run check
```

`dist` 是完整静态发布目录，无需安装依赖或执行构建命令。

### 发布到 GitHub Pages

当前采用 GitHub Pages 托管：`gh-pages` 分支存放 **dist 的全部内容**，站点文件位于该分支根层，并带一个空的 `.nojekyll` 以跳过 Jekyll 处理。页面源码仍在 `main` 分支，二者互不干扰。

首次发布（把 `仓库地址` 换成你自己的）：

```powershell
git remote add origin 仓库地址
git push -u origin main
npm run deploy:pages
git push origin gh-pages
```

然后在 GitHub 仓库的 Settings → Pages，把 Source 选为 **Deploy from a branch**，分支选 `gh-pages`、目录选 `/ (root)`，保存后等一两分钟。

- 地址形如 `https://用户名.github.io/仓库名/`。仓库名是 `用户名.github.io` 时才是根地址。
- 站点内全部引用均为相对路径，放在仓库子路径下可以正常访问，无需改代码。
- 免费账号的 Pages 要求仓库为公开。
- 中国大陆公网与微信访问的稳定性取决于网络环境，未做实测。

以后每次更新：先提交 `main`，再执行 `npm run deploy:pages` 和 `git push origin gh-pages`。脚本从 `dist` 当前内容重建分支，所以务必先提交源码，否则线上版本无法对应到提交。若远端分支被网页端改过而推送被拒，用 `git push origin gh-pages --force-with-lease`。

### 备选：更新 Sites

Sites 只有「保存版本」和「部署版本」两步，没有文件上传界面，不要尝试上传 `dist` 或压缩包。`.openai/hosting.json` 保留原有站点关联。

1. 在 ChatGPT 桌面应用或 Codex 中打开本项目目录（`hosting.json` 把关本地源码和线上站点关联起来）。
2. 让 sites 为当前提交构建并保存一个版本，例如：「用 sites 保存这个项目的版本，沿用现有站点（project_id appgprj_6addb7ba141081918227cd31378bc3de），先不要部署」。
3. 核对预览无误后再让它部署该版本；部署成功后它会返回线上地址。
4. 想确认历史版本时，让 ChatGPT 列出已保存的版本。

每次保存版本会关联构建所用的 Git 提交，所以务必先提交改动再让 sites 构建。

### 其他托管平台

如果要换用 Cloudflare Pages、Netlify、Vercel 等支持文件上传的平台，可上传 **dist 内的全部内容**，确保 `index.html` 位于上传目录根层；不要上传 `source-assets`、测试或预览服务器。`zhangyi-portfolio-site.zip` 是 `dist` 的打包结果（17 个文件，`index.html` 位于根层），仅用于这类平台或留档，改动 `dist` 后需重新打包（条目分隔符统一为 `/`）：

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

当前首版的剧本、文章、实践及声音条目均为明确标注的示例。真实音视频播放、微信及大陆公网访问需要有实际素材和公开地址后验收。本地预览网址只在运行服务器的电脑上可用，不是公开分享链接。
