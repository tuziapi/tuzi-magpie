# 独立下载页本地交付 — 2026-11-13

## 隔离与基线

- 原目录：`/Users/syd08/Documents/tuzi-magpie-local`，开始与交付时均干净。
- `origin` 是 `yetone/magpie`；兔子版远程为 `tuzi` → `tuziapi/tuzi-magpie`。
- 基线 `tuzi/main`：`b4590d85a0790a3e3d3f97e6b4d4287fc83222c0`，已通过 GitHub API 对照远程 main。
- worktree：`/Users/syd08/.codex/worktrees/tuzi-download-page/tuzi-magpie-local`。
- 分支：`codex/tuzi-download-page`。未提交、未推送、未创建 PR、未公开发布。

## 交付范围

`packages/download-page/` 提供 React + Vite 静态产品页、真实 GUI 的三张合成数据截图、
Magpie 原版图标与 favicon、默认中文文案、响应式布局、系统/浅色/深色主题、键盘焦点、平台/架构选择、下载与
摘要复制、按系统切换的命令安装及脚本源码入口、错误重试、安装说明、快速开始和 FAQ。没有添加助手的创作能力。
`src/release.js` 同时约束构建和浏览器的下载数据，避免两套来源判断漂移。
`scripts/release-metadata.mjs` 生成 release.json；tests 覆盖伪造来源和完整失败链路。

`.github/workflows/tuzi-download-page.yml` 仅 main 上手动触发，默认只构建；显式
`deploy=true` 才部署 Pages。没有依赖客户端构建，没有更改 site/、Worker、更新器、
签名或安装文件。`docs/subsystems/README.md` 加入本页面职责文档入口。
许可、截图来源和页面源码包随站点提供。

## 验证结果

- `npm test`：22 项通过。包含正式版/来源/包名/大小/摘要验证，操作系统推荐，
  下载数据流截断/损坏，以及执行真实元数据脚本的隔离集成测试。
  集成测试注入缺包、404、错误远程大小、损坏校验清单和恶意重定向：均失败，
  且旧 dist / release.json 已移除，没有静默使用旧产物。测试不访问公网。
- Chromium：6 项浏览器测试通过；WebKit：5 项通过，1 项明确跳过。
  跳过的是 Chromium 专属的原生剪贴板权限测试；WebKit 仍验证复制成功/失败交互。
  Chromium 原生剪贴板读回与目标摘要一致。
- UI 检查覆盖 320/390/768/1440px、无横向溢出、三张截图切换、深浅主题与持久化、
  六包 URL、切平台选中默认安装包、安装命令及脚本链接、命令/摘要复制失败提示、FAQ、
  键盘焦点、失败重试；发现并修正 favicon 的重复子路径问题。
  macOS WebKit 使用系统约定的 Option-Tab 包含链接；没有修改系统键盘设置。
- 两份公开 install.sh / install.ps1 已下载，与当前兔子版仓库逐字节一致。
  Shell 语法通过，`python3 scripts/tuzi-magpie/test-install-command.py` 的 7 项离线测试通过。
  页面使用现有正式命令，不改安装器，也没有执行真实系统安装。
- `npm run screenshots`：从当前真实 GUI 和合成 fixtures 生成三张 1200×800 截图，
  所有外部请求拒绝，运行无 JS 异常，没有访问真实用户配置或账户。
- `npm run build`：真实 `tuziapi/tuzi-magpie` 正式 `v0.1.0` 构建通过。
  六种包均验证在线存在性和 Content-Length，GitHub API SHA-256 与发布的
  SHA256SUMS.txt 逐项一致；SHA256SUMS.txt 本身经过完整字节哈希验证。
- 生产预览子路径 `/tuzi-magpie/`：人工检查版本、真实下载入口、复制反馈、
  深浅色和移动布局；控制台没有 error/warn。源码归档请求返回 HTTP 200。
- Prettier 检查通过；工作流 YAML 可解析；`git diff --check` 通过。

没有完成六个安装包的全量下载逐字节核验：本机直连下载较慢，标准构建已采用
远程大小 + API/发布校验清单双来源比对，避免每次文案改动都传输约 181 MB。
`VERIFY_DOWNLOAD_BYTES=1 npm run build` 保留全量字节校验功能，损坏和截断分支有离线测试。
未执行客户端安装、Windows PowerShell 本机安装测试、真实账户业务操作、Go 全量/跨平台套件；本次没有改动客户端代码。
未运行远程 Actions 或修改 GitHub Pages 设置。

详细构建、测试日志与桌面/移动/失败状态截图在
`packages/download-page/evidence/`。这些是本地交付证据，不进入站点 dist。

## 预览与后续上线

- 开发预览：http://127.0.0.1:4198/tuzi-magpie/
- 生产预览：http://127.0.0.1:4199/tuzi-magpie/
- 仅监听本机，无后端及账号需求；服务归属记录位于 Git common directory 下的
  `codex-worktree-flow/tuzi-download-page.json`，权限 0600。

上线前需获得授权，将代码提交至兔子版仓库，核实并切换 Pages Source 为 Actions、
停用可能存在的分支发布源、确认 github-pages 环境权限，然后手动验证/部署。
目标为 https://tuziapi.github.io/tuzi-magpie/。

tuzi-api 后续仅需在其仓库把「更多 → tuzi-magpie」弹窗改为新窗口外链，使用
`target="_blank" rel="noopener noreferrer"`，不携带账户数据或令牌参数。

## 默认安装包调整

按用户补充要求，macOS 默认 Apple Silicon DMG、Windows 默认 x64 安装版、Linux 默认 amd64 DEB。
首次检测到桌面系统或手动切换平台后，正式清单加载成功即可下载；保留架构切换和芯片核对提示。
默认推荐不声称识别到了用户 CPU，未知/移动系统仍先选择目标电脑系统。失败状态仍不生成下载链接。
