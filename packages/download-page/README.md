# 兔子版 Magpie 产品介绍与下载页

独立 React + Vite 静态页面，默认简体中文，部署基路径为 `/tuzi-magpie/`。
不依赖 tuzi-api、不登录、不调用账户接口、不加载统计 SDK 或外部字体。
本目录不会覆盖 `site/`、Worker、客户端更新器、签名或安装包。

## 本地使用

需要 Node.js 22.12+（建议 24）与 npm、curl（系统 TLS / HTTP/2）。所有命令在本目录运行：

```sh
npm ci
npm run metadata                 # 获取正式 Release 并核验可访问性、大小及摘要
npm run dev -- --port 4198 --strictPort
# http://127.0.0.1:4198/tuzi-magpie/
npm test                         # 离线元数据与 OS 检测测试
npx playwright install chromium webkit
npm run test:ui                   # 两引擎、桌面/移动布局及交互，全部隔离网络
npm run build                    # 重新核验正式 Release，然后生产构建
npm run preview -- --port 4199 --strictPort
# http://127.0.0.1:4199/tuzi-magpie/
```

`RELEASE_TAG=v0.1.0 npm run build` 可锁定正式版；不指定则读取兔子版 latest。
`GH_TOKEN` 仅用于 GitHub API 的读取额度，绝不打包进网页，也不发送到附件下载域名。
下载通过系统 curl 访问 GitHub API 附件端点（与公开下载 URL 对应同一文件），再显式验证存储重定向。没有代理、镜像或仓库回退。

## 下载数据与失败行为

唯一来源是 `tuziapi/tuzi-magpie` 的公开正式 GitHub Release。源规则对照：
`../../scripts/tuzi-magpie/package-release.py` 与
`../../.github/workflows/tuzi-unsigned-build.yml`，系统要求对照
`../../docs/tuzi-magpie/unsigned-install.md`。

- macOS arm64 / amd64：`tuzi-magpie-vX.Y.Z-macos-{arch}.dmg`
- Windows amd64：`tuzi-magpie-vX.Y.Z-windows-amd64-setup.exe`
- Windows amd64 / arm64：`tuzi-magpie-vX.Y.Z-windows-{arch}-portable.zip`
- Linux amd64：`tuzi-magpie-vX.Y.Z-linux-amd64.deb`

构建拒绝 draft、prerelease、非 vX.Y.Z、跨仓库/跨版本 URL、缺包、重复包、
未完成上传、缺少 SHA-256 或无效大小。随后从官方附件 API 解析到存储 URL，使用 HEAD 核验六个文件存在性与 Content-Length，
下载并哈希验证 SHA256SUMS.txt，再逐项比对 GitHub API 摘要。缺失或不一致即失败。
重定向只允许 GitHub 附件存储域名；校验不等于开发者签名。
`VERIFY_DOWNLOAD_BYTES=1 npm run build` 还会完整下载六包并逐字节计算 SHA-256；
普通页面构建不重复传输约 181 MB 安装包。构建开始先移除旧 dist 和 release.json，失败不留下可部署旧清单。
成功后原子写入 `public/release.json`，Vite 复制至 dist。浏览器再校验清单结构与来源，
加载失败、超时或非法清单只提供重试和兔子版 Releases 入口，不创建下载 URL。
无静默假数据回退；测试合成版本仅存在 tests 中。没有生产构建绕过开关。

OS 仅用于推荐，不推断芯片架构。下载区默认选择 macOS Apple Silicon DMG、Windows x64 安装版或 Linux amd64 DEB，清单加载后直接显示下载按钮。
平台切换采用新平台的默认包，用户仍可手动切换架构/格式，并提示核对芯片类型。手机/iPad/未知系统仍需先选择目标系统；Linux 不提供 ARM64。
当前发布未可信签名/macOS 未公证，自动更新未启用；页面如实提示。
命令安装区随平台切换，调用兔子版现有 `scripts/tuzi-magpie/install.sh` / `install.ps1`，
自动识别运行命令的电脑并安装最新正式版，不受网页手动选择的安装包架构影响。
提供命令复制、失败提示及公开脚本入口；不复制兔子助手脚本。公开脚本与当前源码
逐字节核对一致，Shell 语法和离线安装边界测试通过。本次没有在真实电脑执行安装，
没有运行 Windows PowerShell 安装测试，不宣称跨平台安装通过。

## 截图、语言与许可

`npm run screenshots` 从仓库真实 GUI 生成三张 1200×800 PNG。它读取现有账户测试
fixture，所有请求被拦截为合成数据，外部网络被拒绝；不启动真实网关、不读用户配置。
需先安装 Playwright Chromium；可用 `CHROME_PATH` 指定本机 Chrome 可执行文件。
截图不是 AI 生成图片，不修改客户端布局。来源和基线见 `SOURCE.json`。

本页目前只提供中文，没有多语言开关。已核对现有 `site/i18n.js`：上游站点采用键值字典并由 Worker 按语言路径渲染；客户端采用 `t()` 字典。
客户端 `t()` 与五语言字典属于桌面 GUI，本页不加载其全局运行时。增加语言时应沿用现有的键值字典、locale 路径和缺失键测试约定，
用静态构建生成各语言入口，不依赖或改写上游 Worker，也不改变客户端语言设置。
主题默认跟随系统，可在浅色、深色、系统三者切换；仅主题偏好存入本地存储。

参考兔子助手的页面组织与 release.json 构建方式，页面按 AGPL-3.0-or-later
分发，保留其 LICENSE 和 Tuzi 版权；Magpie 图标、GUI 截图及 fixture 保留 MIT
及 yetone 署名。见 SOURCE.json、public/MAGPIE-LICENSE.txt 与页脚源码/许可入口。
生产发布应同时提供当前页面对应源码（流程生成 source.tar.gz）和 SOURCE.json。

## GitHub Pages 发布准备（尚未发布）

`.github/workflows/tuzi-download-page.yml` 仅支持 main 上手动运行，默认 deploy=false，
先测试和真实构建，再上传 Pages artifact；deploy=true 才有部署作业。与客户端打包
工作流没有依赖，不因修改页面而重建桌面程序，不在 Release/Push 事件自动运行。
当前仓库没有其他启用的 Pages 工作流；原 `site/` 和 Worker 不做修改。

获得授权后：

1. 审核并提交本目录及工作流到 **tuziapi/tuzi-magpie**（不能推到 origin 上游）。
2. 管理员核实 Pages 当前 Source；若使用分支发布，停用该发布来源，再选择 GitHub
   Actions，确保只有本流程写入 Pages。不要同时维护根目录静态快照。
3. 检查 github-pages 环境保护规则、运行权限/额度，确认正式 Release 六包可下载。
4. 先手动运行 deploy=false 检查产物，再明确执行 deploy=true。
5. 访问 https://tuziapi.github.io/tuzi-magpie/，检查子路径、六包链接、摘要和移动端。
   新版本发布后独立重跑页面流程刷新清单；文案变更同样不需要客户端构建。

没有执行推送、PR、部署或 Pages 设置修改。实际服务器设置需管理员上线前核实，
不能仅凭仓库中没有 Pages 工作流就断言线上没有其他发布来源。

## 后续 tuzi-api 接入

在 tuzi-api 仓库将「更多 → tuzi-magpie」从弹窗改成普通外链：

```html
<a
  href="https://tuziapi.github.io/tuzi-magpie/"
  target="_blank"
  rel="noopener noreferrer"
  >tuzi-magpie</a
>
```

本次不修改 tuzi-api 导航，也不把后台账户令牌或个人信息放进链接参数。
