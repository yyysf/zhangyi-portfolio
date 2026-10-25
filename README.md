# 张艺的作品集

白底青绿、水彩风景明信片风格的个人作品集演示站。原生 HTML / CSS / JavaScript，无运行时第三方依赖、后台或数据库。

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

该维护脚本需要 Pillow、fontTools 和 Brotli。普通预览、编辑与发布不需要 Python。原始字体与四张生成插画保留于 `source-assets/`，网站实际使用本地压缩 WebP。插画使用内置 imagegen 生成，提示词与素材用途见 `source-assets/art-prompts.md`，不代表实际剧照或排练照片。

## 检查与部署文件

```powershell
npm run check
```

`dist` 是完整静态发布目录。当前按用户要求使用 Sites 发布，站点身份与静态目录配置保存在 `.openai/hosting.json`，后续更新应复用同一站点。也可在其他静态托管平台上传 **dist 内的全部内容**，确保 `index.html` 位于上传目录根层；不要上传 `source-assets`、测试或预览服务器。无需安装依赖或执行构建命令。

当前首版的剧本、文章、实践及声音条目均为明确标注的示例。真实音视频播放、微信及大陆公网访问需要有实际素材和公开地址后验收。本地预览网址只在运行服务器的电脑上可用，不是公开分享链接。
