import test from "node:test";
import assert from "node:assert/strict";
import {
  formats,
  fromGithub,
  validateManifest,
  detectPlatform,
  assetUrl,
  releasesUrl,
} from "../src/release.js";
function release() {
  const tag = "v1.2.3";
  return {
    tag_name: tag,
    draft: false,
    prerelease: false,
    html_url: `${releasesUrl}/tag/${tag}`,
    published_at: "2026-11-01T00:00:00Z",
    assets: formats.map((f) => ({
      name: `tuzi-magpie-${tag}-${f.suffix}`,
      state: "uploaded",
      size: 1234,
      digest: `sha256:${"a".repeat(64)}`,
      browser_download_url: assetUrl(tag, `tuzi-magpie-${tag}-${f.suffix}`),
    })),
  };
}
test("exactly the six real packaging targets, independent of asset order", () => {
  const r = release();
  r.assets.reverse();
  assert.equal(fromGithub(r).downloads.length, 6);
  assert.deepEqual(
    formats.filter((f) => f.platform === "linux").map((f) => f.suffix),
    ["linux-amd64.deb"],
  );
});
for (const [name, mutate] of [
  [
    "upstream source",
    (r) =>
      (r.html_url = "https://github.com/yetone/magpie/releases/tag/v1.2.3"),
  ],
  ["draft", (r) => (r.draft = true)],
  ["prerelease", (r) => (r.prerelease = true)],
  ["beta tag", (r) => (r.tag_name = "v1.2.3-beta.1")],
  ["missing file", (r) => r.assets.pop()],
  ["duplicate file", (r) => r.assets.push(r.assets[0])],
  ["unfinished upload", (r) => (r.assets[0].state = "new")],
  ["zero size", (r) => (r.assets[0].size = 0)],
  ["fractional size", (r) => (r.assets[0].size = 1.2)],
  ["missing digest", (r) => delete r.assets[0].digest],
  ["bad digest", (r) => (r.assets[0].digest = "sha256:fake")],
  [
    "cross repo URL",
    (r) =>
      (r.assets[0].browser_download_url =
        r.assets[0].browser_download_url.replace(
          "tuziapi/tuzi-magpie",
          "yetone/magpie",
        )),
  ],
  [
    "old version URL",
    (r) =>
      (r.assets[0].browser_download_url =
        r.assets[0].browser_download_url.replace("v1.2.3", "v1.2.2")),
  ],
  ["query URL", (r) => (r.assets[0].browser_download_url += "?x=1")],
  ["invalid date", (r) => (r.published_at = "invalid")],
])
  test(`rejects ${name}`, () => {
    const r = release();
    mutate(r);
    assert.throws(() => fromGithub(r));
  });
test("browser rejects modified metadata, including missing and duplicate targets", () => {
  const m = fromGithub(release());
  m.downloads[0].url = "javascript:alert(1)";
  assert.throws(() => validateManifest(m));
  const n = fromGithub(release());
  n.downloads[0] = n.downloads[1];
  assert.throws(() => validateManifest(n));
  const o = fromGithub(release());
  o.repository = "yetone/magpie";
  assert.throws(() => validateManifest(o));
});
test("desktop OS recommendation never claims to know architecture, excludes phones and iPads", () => {
  assert.equal(
    detectPlatform("Mozilla Macintosh Mac OS X", "MacIntel", 0),
    "macos",
  );
  assert.equal(detectPlatform("Mozilla Windows NT 10.0"), "windows");
  assert.equal(detectPlatform("Mozilla X11 Linux x86_64"), "linux");
  assert.equal(detectPlatform("Mozilla Linux Android"), "");
  assert.equal(detectPlatform("Mozilla Macintosh", "MacIntel", 5), "");
  assert.equal(detectPlatform("Mozilla iPhone"), "");
  assert.equal(detectPlatform("Unknown"), "");
});
