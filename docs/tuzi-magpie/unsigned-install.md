# tuzi-magpie 未签名测试版 / Unsigned beta

这是供测试的桌面安装包，不是已签名、公证的正式版。自动更新尚未启用。
API 站部署及真实账户联调的完成情况，以对应 GitHub Release 的说明为准。

This beta has no trusted developer signature or notarization. Automatic updates
are disabled. Consult its Release notes for actual platform testing and API-site
integration status. Keep the original Magpie licenses and attribution with it.

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
sudo apt install ./tuzi-magpie-vX.Y.Z-beta.N-linux-amd64.deb
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
Get-FileHash .\tuzi-magpie-vX.Y.Z-beta.N-windows-amd64-setup.exe -Algorithm SHA256
```

仅下载部分平台安装包时，校验文件中其他平台的条目会提示文件缺失；请核对所下载
文件的条目。校验值用于发现损坏或文件不一致，不能替代开发者签名。
