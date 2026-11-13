// Existing Tuzi desktop installers; no upstream or assistant installer URLs.
export const shellInstaller =
  "https://raw.githubusercontent.com/tuziapi/tuzi-magpie/main/scripts/tuzi-magpie/install.sh";
export const powershellInstaller =
  "https://raw.githubusercontent.com/tuziapi/tuzi-magpie/main/scripts/tuzi-magpie/install.ps1";
export function installation(platform) {
  if (platform === "windows")
    return {
      shell: "PowerShell",
      command: `irm ${powershellInstaller} | iex`,
      url: powershellInstaller,
      note: "自动识别本机架构：x64 安装当前用户版，ARM64 安装便携版。需要 WebView2 Runtime，无需管理员权限。",
    };
  if (platform === "macos" || platform === "linux")
    return {
      shell: platform === "macos" ? "macOS 终端" : "Ubuntu 终端",
      command: `curl -fsSL ${shellInstaller} | sh`,
      url: shellInstaller,
      note:
        platform === "macos"
          ? "自动识别本机架构，安装到 ~/Applications，命令链接放在 ~/.local/bin。不会关闭 Gatekeeper。"
          : "仅适用于 Ubuntu 24.04 amd64 图形桌面，通过 APT 安装并处理依赖，需要 sudo 权限。",
    };
  return null;
}
