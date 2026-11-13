// Copyright (C) 2026 Tuzi. AGPL-3.0-or-later.
export const repository = "tuziapi/tuzi-magpie";
export const releasesUrl = `https://github.com/${repository}/releases`;
// Product defaults are recommendations, not hardware detection.
export const defaultDownloads = {
  macos: "macos-arm64",
  windows: "windows-amd64-setup",
  linux: "linux-amd64",
};
export const formats = [
  {
    id: "macos-arm64",
    platform: "macos",
    arch: "arm64",
    suffix: "macos-arm64.dmg",
    label: "Apple Silicon",
    format: "DMG",
  },
  {
    id: "macos-amd64",
    platform: "macos",
    arch: "amd64",
    suffix: "macos-amd64.dmg",
    label: "Intel",
    format: "DMG",
  },
  {
    id: "windows-amd64-setup",
    platform: "windows",
    arch: "amd64",
    suffix: "windows-amd64-setup.exe",
    label: "x64 安装版",
    format: "EXE",
  },
  {
    id: "windows-amd64-portable",
    platform: "windows",
    arch: "amd64",
    suffix: "windows-amd64-portable.zip",
    label: "x64 便携版",
    format: "ZIP",
  },
  {
    id: "windows-arm64-portable",
    platform: "windows",
    arch: "arm64",
    suffix: "windows-arm64-portable.zip",
    label: "ARM64 便携版",
    format: "ZIP",
  },
  {
    id: "linux-amd64",
    platform: "linux",
    arch: "amd64",
    suffix: "linux-amd64.deb",
    label: "x64 / amd64",
    format: "DEB",
  },
];
export function validTag(tag) {
  return typeof tag === "string" && /^v\d+\.\d+\.\d+$/.test(tag);
}
export function assetUrl(tag, name) {
  return `${releasesUrl}/download/${tag}/${name}`;
}
export function validateManifest(m) {
  if (
    !m ||
    m.schema !== 1 ||
    m.repository !== repository ||
    !validTag(m.tag) ||
    m.draft !== false ||
    m.prerelease !== false ||
    m.releaseUrl !== `${releasesUrl}/tag/${m.tag}` ||
    !Number.isFinite(Date.parse(m.publishedAt)) ||
    !Number.isFinite(Date.parse(m.checkedAt)) ||
    !Array.isArray(m.downloads) ||
    m.downloads.length !== formats.length
  )
    throw Error("正式下载清单无效");
  for (const spec of formats) {
    const matches = m.downloads.filter((a) => a.id === spec.id);
    const a = matches[0],
      name = `tuzi-magpie-${m.tag}-${spec.suffix}`;
    if (
      matches.length !== 1 ||
      a.name !== name ||
      a.url !== assetUrl(m.tag, name) ||
      !Number.isSafeInteger(a.bytes) ||
      a.bytes <= 0 ||
      !/^[a-f0-9]{64}$/.test(a.sha256)
    )
      throw Error(`安装包元数据无效：${spec.id}`);
  }
  return m;
}
export function fromGithub(r, checkedAt = new Date().toISOString()) {
  if (
    !r ||
    !validTag(r.tag_name) ||
    r.draft !== false ||
    r.prerelease !== false ||
    r.html_url !== `${releasesUrl}/tag/${r.tag_name}` ||
    !Array.isArray(r.assets)
  )
    throw Error("拒绝非兔子版正式 Release");
  const downloads = formats.map((spec) => {
    const name = `tuzi-magpie-${r.tag_name}-${spec.suffix}`;
    const found = r.assets.filter((a) => a.name === name);
    const a = found[0];
    if (
      found.length !== 1 ||
      a.state !== "uploaded" ||
      !/^sha256:[a-f0-9]{64}$/.test(a.digest)
    )
      throw Error(`缺少安装包或 SHA-256：${name}`);
    return {
      id: spec.id,
      name,
      url: a.browser_download_url,
      bytes: a.size,
      sha256: a.digest.slice(7),
    };
  });
  return validateManifest({
    schema: 1,
    repository,
    tag: r.tag_name,
    draft: false,
    prerelease: false,
    publishedAt: r.published_at,
    checkedAt,
    releaseUrl: r.html_url,
    downloads,
  });
}
export function detectPlatform(ua, platform = "", touchPoints = 0) {
  if (
    /Android|iPhone|iPad|iPod/i.test(ua) ||
    (/Mac/i.test(platform) && touchPoints > 1)
  )
    return "";
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  if (/Linux/i.test(ua)) return "linux";
  return "";
}
