# PR #1 发布前复核与人工验收

结论：**继续保持 Draft，尚不满足评审通过、合并或三端发布条件**。
管理员可以提前审阅代码、证据和未决项，但不能把本记录当成验收放行。
范围是 [PR #1](https://github.com/tuziapi/tuzi-magpie/pull/1) 的现有分支
`codex/tuzi-unsigned-release`，未合并、打标签、发布 Release、部署站点或修改签名/可见性。

## 本轮完成

- 核对已有 Go/race/vet、完整浏览器日志和六个候选包；保留失败原始记录。
- 完整浏览器冻结批次已结束：Chromium **9482/9551，69 fail**；WebKit
  **9463/9536，73 fail**。失败数包括父测试，两批均无取消/跳过/todo。
  共 21 个不同失败文件；归因、修复和未决影响详见[浏览器验收](browser-release-validation-2026-11-06.md)。
- 既有候选修正的 22 个完整文件双引擎 **318/318** 通过。本轮提交
  `eb2490a538e0e0951182c9437777cac147f52147` 修正 `update-stuck` 测量时机：
  等待真实头部 ResizeObserver 和其后布局帧，原断言不变，双引擎完整文件 **62/62**；
  人为永久溢出的负控 **31/31 失败**。本轮没有产品代码修改，没有跳过或放宽断言。
- 市场失败捕获到错误输入落点，并用受控聚焦竞争复现；后端验证会拒绝缺命令的保存。
  其余四项保留已知事实和下一步最小取证，不以自然重跑绿证明解决。
- 原始 Go/race 等结果见[前期记录](release-validation-2026-11-06.md)。本轮仅测试/文档变化，
  没有无依据重复整套 Go 或构建；也没有在未决问题存在时宣称最终全量已绿。

## 安装包验收矩阵

| 平台/包 | 已执行 | 尚未验证 | 当前结论 |
| --- | --- | --- | --- |
| macOS Apple Silicon DMG | macOS 26.6.2 arm64：只读挂载，复制到私有 Applications 目录，校验复制后的二进制一致；签名完整性、架构、版本；精确包内程序以私有 HOME、回环网络和操作系统沙箱运行；原生窗口目视显示中文兔子账户，切到 Agent，再从应用菜单正常退出 | 下载后带隔离属性的 Gatekeeper 首次安装体验、系统 /Applications 拖拽路径及更多 macOS 版本 | 隔离安装复制、原生 GUI 启动/导航/退出通过；不扩大为所有安装场景通过 |
| macOS Intel DMG | DMG 完整性、x86_64 架构、plist 版本及复制一致；同一 ARM 主机通过 Rosetta 启动精确包内程序，原生窗口目视与退出通过 | **Intel Mac 真机安装与启动未验证**；下载后 Gatekeeper 体验也未验证 | Rosetta 为补充，不替代 Intel 验收 |
| Windows x64 setup | NSIS 零警告编译、产物清单/校验和 | **Windows 安装、启动、卸载未验证** | 无可用 Windows 系统/虚拟机 |
| Windows x64 / ARM64 portable | PE 架构、生产构建标签、ZIP CRC、内容、便携标记、版本字符串及校验和 | **两个架构实际运行均未验证** | 交叉编译/静态检查不算 Windows 验收 |
| Linux x64 DEB | Ubuntu 24.04 x64 容器（ARM Mac 仿真）依赖/安装/版本/卸载通过；私有非 root 用户下 Xvfb + D-Bus 成功启动应用与 WebKit 进程、回环网关返回；卸载后测试配置保留 | **实际 X11/Wayland 桌面窗口显示、交互、托盘及退出未验证** | 虚拟显示启动有 GDK/StatusNotifier/DRI3 警告，没有可视交互通过结论 |

测试没有覆盖本机现有应用或日常配置。macOS 测试程序已退出；本轮使用的
`tuzi-release-candidate-build` 容器在复核结束后停止，其他容器不动。
未修改包内签名、添加开发者凭据或尝试绕过 Gatekeeper。

## 六包身份、版本与最终代码关系

当前唯一待评审包目录：
`/Users/syd08/Documents/tuzi-magpie-tools/release-20261106/candidate-packages/`。
`final-packages/` 是保留的旧包，不能混用。

- 版本：`v0.1.0-beta.1`。DMG plist 为 `0.1.0` / `0.1.0.1`；DEB 为 `0.1.0~beta.1`。
- 真实构建提交：`03e8af852475351249fc0100c088839d7fb40a03`。构建脚本在打包前检查干净源码；
  `candidate-package-results.json` 和 `candidate-*.log` 记录来源和阶段结果。
- 与本轮最终代码提交 `eb2490a53` 的差异仅为测试及验收文档；产品源码、嵌入资源、包内安装文档
  和构建脚本均相同。因此不需要重建，不将原清单的构建提交伪改成后来文档提交。
- 再次核验六资产、四清单、文件大小与 SHA-256；五个应用二进制的 OS/架构/production 标签正确，
  均含 beta 版本字符串，无 fixture/nogui 标签。macOS ARM 和 Linux 已执行版本命令；
  Windows 版本仍是构建日志和静态证据，不能代替原生运行。
- `go version -m` 未含 VCS revision，不能声称从二进制独立恢复了源码提交；来源依据是
  干净源码构建记录、清单和哈希链。此项是证据边界，不是已发现源码不匹配。
- 仓库中新增[版本及来源清单](release-candidate-assets.json)和
  [SHA-256 清单](release-candidate-SHA256SUMS.txt)，保留原实际构建身份。
  Windows 清单的主 architecture 是 amd64 安装器，其两个 portable 资产按各自文件名和 PE 检查区分。

重新核验命令（在仓库根目录，目录变量指向当前包目录）：

```sh
python3 scripts/tuzi-magpie/verify-release.py --directory "$package_dir" \
  --version v0.1.0-beta.1 --commit 03e8af852475351249fc0100c088839d7fb40a03
```

## 发布阻塞与责任边界

| 状态 | 项目 | 影响与所需配合 |
| --- | --- | --- |
| 未通过，阻塞 | 五项浏览器失败 | MCP 快速录入失败、插件设置点击未生效、窄规则布局、导航动画观测、滚动逆跳；历史/未知分类和最小后续工作见浏览器报告，不豁免历史失败 |
| 未闭环，阻塞 | 原 F01/F11 | 本次全量未再失败，但原 side-effort/click-scroll 原因未定位，仍按[原清单](closing-blockers.md)保留 |
| 环境阻塞 | GitHub Actions | 管理员确认付款失败/额度限制；在 Billing & plans 修复后运行纯 Test 和只产出 artifacts 的构建检查，取得对应候选的绿色结果。当前没有手动调度任何工作流；PR 推送会自动触发 Test，不会发布 |
| 未验证，阻塞三端验收 | Windows、Intel Mac、Linux 实际桌面 | 需要对应系统/硬件及下面的最短验收；不能用编译成功、Rosetta 或容器进程替代 |
| 未验证，范围外 | API 站和真实账户/计费联调 | 本次没有部署或请求付费服务；三端包的检查不等于 API 端到端可用。管理员需安排 API 站另行发布验收，不能宣传完整服务已上线 |

## 人工最短验收步骤

共同要求：使用全新虚拟机、测试机或独立测试用户，不能覆盖已有 tuzi-magpie 或真实账户资料。
从管理员受控渠道取得上述六包和校验清单，先校验 SHA-256；记录系统/架构、包哈希、操作结果、
截图及错误原文。未签名/未公证的系统提示要原样记录，不关闭系统安全保护。

### Windows x64 安装与便携；ARM64 便携

1. 在 Windows x64 新测试用户中运行 `*-windows-amd64-setup.exe`，选择空的安装目录。
   如果缺 WebView2，记录并安装微软官方运行时后复测，不把缺依赖当成功。
2. 从安装后的入口启动：窗口出现、兔子账户默认页/中文菜单完整，切换 Agent/兔子页、缩放窗口，
   确认版本 `v0.1.0-beta.1`，退出并重新打开。不要登录真实账户。
3. 在安装目录添加测试哨兵文件 `acceptance-keep.txt`，通过系统应用列表卸载，确认主程序/快捷方式移除，
   哨兵和测试配置没有被误删。失败记录实际路径和残留项。
4. 将 x64 portable 解压到另一个空目录，确认 `.tuzi-magpie-portable` 存在，运行
   `tuzi-magpie.exe`，重复启动/切页/退出；确认配置在相邻 `tuzi-magpie-data` 并能重启读取。
5. 在 **Windows ARM64** 上对 ARM64 portable 重复第 4 步；x64 机器上的静态检查不算 ARM64 通过。

已有 `scripts/tuzi-magpie/test-windows-installer.ps1` 仅用于临时 GitHub Actions runner，
不会覆盖上述 GUI/便携验收；不要在日常机器伪造其 CI 环境标记来绕过保护。

### macOS Apple Silicon / Intel

1. 分别在对应真机的新测试用户中校验 DMG，打开并复制到该用户空的 `~/Applications`，
   不覆盖系统中的已有应用。保留下载隔离属性。
2. 从 Finder 启动，记录 Gatekeeper 提示及系统允许的确认流程；不能正常允许启动则记失败/阻塞。
3. 确认兔子页、中文导航、版本、切换 Agent、调整窗口与退出/重开；检查无崩溃。
   Intel 必须记录 **Intel CPU**，不能用本次 Rosetta 结果填写。删除的只能是新测试用户下该副本。

### Linux Ubuntu 24.04 x64 实际桌面

1. 在具有真实 GNOME/KDE 桌面会话的测试机/虚拟机中校验 DEB，执行
   `sudo apt install ./tuzi-magpie-v0.1.0-beta.1-linux-amd64.deb`，记录 X11/Wayland 会话类型。
2. 从应用菜单启动（不是仅访问浏览器或启动 Xvfb），确认实际窗口、兔子页、中文导航、切页和缩放。
   检查菜单退出、托盘/面板行为及再次启动，保留终端/系统日志中的错误。
3. `sudo apt remove tuzi-magpie`，确认应用入口/程序卸载且新测试用户配置未误删。
   当前只发布 x64 DEB，不把其他发行版/架构推定为通过。

## 证据位置与复查

原始日志保存在 `/Users/syd08/Documents/tuzi-magpie-tools/release-20261106/`。
本轮目录 `acceptance-followup/` 包含浏览器诊断、完整 update-stuck 正/负控、包来源复核 JSON、
macOS 安装/启动/退出 JSON 和两张真实窗口截图，以及 Linux 安装/进程/网关/卸载日志。
其中 `linux-uninstall-completed.log` 才是成功卸载记录；第一次空的 `linux-uninstall.log` 不是通过证据。

远程 PR 包含本文、逐项浏览器结论及六包哈希清单；本地原始日志/截图和安装包尚未上传为公开资产。
管理员需要复查原始附件时，从上述本地目录取证或另行约定受控传递渠道，不通过发布 Release 来传递。
