# tuzi-magpie 未签名桌面版 / Unsigned desktop release

此桌面安装包没有可信开发者签名或公证。自动更新尚未启用。
API 站部署及真实账户联调的完成情况，以对应 GitHub Release 的说明为准。

This desktop release has no trusted developer signature or notarization. Automatic updates
are disabled. Consult its Release notes for actual platform testing and API-site
integration status. Keep the original Magpie licenses and attribution with it.

## 一行命令安装 / Command-line installation

脚本自动下载本仓库最新正式版，按操作系统及架构选择文件，验证 `SHA256SUMS.txt` 后安装。它仍使用已发布的二进制包，只是不需要手动下载或编译源码。不安装上游 Magpie，不关闭 Gatekeeper/SmartScreen，不自动启动应用。更新前请退出 tuzi-magpie。

macOS / Ubuntu 24.04 amd64：

```sh
curl -fsSL https://raw.githubusercontent.com/tuziapi/tuzi-magpie/main/scripts/tuzi-magpie/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/tuziapi/tuzi-magpie/main/scripts/tuzi-magpie/install.ps1 | iex
```

安装后运行 `tuzi-magpie`。macOS 安装到 `~/Applications/tuzi-magpie.app`，命令链接在 `~/.local/bin/tuzi-magpie`；如未在 PATH，可直接运行该路径，或将下面这一行加入 `~/.zshrc`（其他 shell 使用对应配置文件）再打开新终端：

```sh
export PATH="$HOME/.local/bin:$PATH"
```

Linux 使用 APT 安装 DEB 并处理依赖，需要 sudo 权限及图形桌面。仅支持 Ubuntu 24.04 amd64，不声称支持其他发行版或 Linux ARM64。

Windows x64 使用现有当前用户安装器；ARM64 安装便携版到 `%LOCALAPPDATA%\Programs\tuzi-magpie-arm64`，升级保留其 `tuzi-magpie-data`。两者都将安装目录加入用户 PATH 及当前 PowerShell 会话，不需要管理员权限。需要 WebView2 Runtime。账户及设置不会被脚本删除。

指定版本或只下载校验、不安装：

```sh
curl -fsSL https://raw.githubusercontent.com/tuziapi/tuzi-magpie/main/scripts/tuzi-magpie/install.sh | sh -s -- --version v0.1.0
curl -fsSL https://raw.githubusercontent.com/tuziapi/tuzi-magpie/main/scripts/tuzi-magpie/install.sh | sh -s -- --check
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/tuziapi/tuzi-magpie/main/scripts/tuzi-magpie/install.ps1))) -Version v0.1.0 -Check
```

The scripts install released desktop binaries after checksum verification; they do not build from source or install a headless server edition. Downloads stay on the resolved release tag even if Latest changes during installation. macOS uses the current user's Applications and local bin folders; Ubuntu uses APT; Windows uses a per-user installer (x64) or a portable folder (ARM64) and adds it to the user PATH. Quit the app before upgrading. Run `--check` / `-Check` to verify the download without installation.

卸载：macOS 删除 `~/Applications/tuzi-magpie.app` 及对应的 `~/.local/bin/tuzi-magpie` 链接；Ubuntu 运行 `sudo apt remove tuzi-magpie`；Windows x64 使用系统“已安装的应用”，ARM64 可先备份便携目录中的数据后删除应用目录。Windows 用户 PATH 中残留的对应目录可通过系统环境变量设置移除。不要删除账户数据目录，除非确定不再需要。

## macOS (12 or later)

选择 Apple Silicon (`arm64`) 或 Intel (`amd64`) 的 DMG，打开后将
`tuzi-magpie.app` 拖到 Applications。包使用本地 ad-hoc 完整性签名，
不是 Apple Developer ID 签名，未经公证。首次启动可能被 Gatekeeper 拦截。
确认下载来源及 SHA-256 后，可使用系统设置 → 隐私与安全性中的“仍要打开”。
不要全局关闭 Gatekeeper；企业策略可能不允许打开未公证应用。

Choose the matching DMG and drag the app to Applications. If macOS blocks it,
verify its origin and checksum, then use Privacy & Security → Open Anyway if
permitted by your device policy. Do not disable Gatekeeper globally.

## Windows

`amd64-setup.exe` 为当前用户安装到 LocalAppData，创建开始菜单快捷方式，
无需管理员权限。安装前退出已运行的 tuzi-magpie。需要 Microsoft Edge WebView2
Runtime；若未安装，请从 Microsoft 官方网站安装。未签名程序可能触发
SmartScreen 或公司设备策略；此版本不能保证无提示安装。

便携 ZIP 提供 `amd64` / `arm64`，完整解压到可写目录再运行。便携账户、配置及
浏览器数据保存在同目录的 `tuzi-magpie-data` 中，请勿公开分享使用过的目录。
卸载安装版保留账户及配置；不会删除原版 Magpie 的文件。

The installer is per-user. Close the running app before installing or uninstalling.
Microsoft Edge WebView2 Runtime is required. SmartScreen may warn about this
unsigned application. Portable archives keep user data beside the executable;
never redistribute a used portable folder containing accounts or credentials.

## Linux

DEB 面向 Ubuntu 24.04 `amd64`，依赖 GTK 3 和 WebKitGTK 4.1：

```sh
sudo apt install ./tuzi-magpie-vX.Y.Z-linux-amd64.deb
```

需要桌面会话；安装后从应用菜单启动。其他发行版、Wayland/X11 组合的测试情况
以 Release 说明为准。此 DEB 没有仓库签名，也不会配置 APT 更新源。

The DEB targets Ubuntu 24.04 amd64 and requires a graphical desktop session.
It does not add an APT repository. Other distributions and desktop environments
are not implied to be tested by a successful build.

## Verify the download

发布页应提供 `SHA256SUMS.txt`。在包含安装包的目录中校验：

```sh
# macOS
shasum -a 256 -c SHA256SUMS.txt
# Linux
sha256sum -c SHA256SUMS.txt
# Windows PowerShell: compare the value with SHA256SUMS.txt
Get-FileHash .\tuzi-magpie-vX.Y.Z-windows-amd64-setup.exe -Algorithm SHA256
```

仅下载部分平台安装包时，校验文件中其他平台的条目会提示文件缺失；请核对所下载
文件的条目。校验值用于发现损坏或文件不一致，不能替代开发者签名。
