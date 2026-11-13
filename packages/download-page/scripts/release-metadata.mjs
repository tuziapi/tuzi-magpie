// Copyright (C) 2026 Tuzi. AGPL-3.0-or-later.
import {
  writeFile,
  copyFile,
  rm,
  rename,
  mkdtemp,
  readFile,
  stat,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { repository, fromGithub, validTag } from "../src/release.js";
import { verifyFile } from "./verify-file.mjs";

// Fail closed even if a previous build succeeded.
await rm("dist", { recursive: true, force: true });
await rm("public/release.json", { force: true });
const tag = process.env.RELEASE_TAG;
if (tag && !validTag(tag)) throw Error("RELEASE_TAG 必须是正式版本 vX.Y.Z");
const temp = await mkdtemp(join(tmpdir(), "tuzi-download-"));
let serial = 0;
// curl uses the OS TLS stack and HTTP/2. No shell interpolation, redirects or
// credentials in argv; auth is supplied over stdin only to the GitHub API.
async function request(url, accept, maxBytes, auth = false, headOnly = false) {
  const id = serial++,
    file = join(temp, `${id}.body`),
    head = join(temp, `${id}.headers`);
  const headers = [
    `Accept: ${accept}`,
    "User-Agent: tuzi-magpie-download-page",
  ];
  if (auth && process.env.GH_TOKEN) {
    if (/[\r\n]/.test(process.env.GH_TOKEN)) throw Error("Invalid GH_TOKEN");
    headers.push(`Authorization: Bearer ${process.env.GH_TOKEN}`);
  }
  await new Promise((resolve, reject) => {
    const child = spawn(
      "curl",
      [
        "-q",
        "--silent",
        "--show-error",
        "--proto",
        "=https",
        "--connect-timeout",
        "15",
        "--max-time",
        headOnly || maxBytes <= 4 * 1024 * 1024 ? "30" : "900",
        "--retry",
        "2",
        "--max-filesize",
        String(maxBytes),
        ...(headOnly ? ["--head"] : []),
        "--header",
        "@-",
        "--dump-header",
        head,
        "--output",
        file,
        url,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let diagnostic = "";
    child.stderr.on("data", (b) => {
      diagnostic += b;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            Error(
              `GitHub read failed (curl ${code}): ${diagnostic.split("\n")[0]}`,
            ),
          ),
    );
    child.stdin.on("error", () => {});
    child.stdin.end(headers.join("\n") + "\n");
  });
  const blocks = (await readFile(head, "utf8")).trim().split(/\r?\n\r?\n/);
  const lines = blocks.at(-1).split(/\r?\n/),
    status = Number(lines[0].split(" ")[1]);
  const location = lines
    .find((x) => /^location:/i.test(x))
    ?.slice(9)
    .trim();
  if ((await stat(file)).size > maxBytes)
    throw Error("Response exceeds expected size");
  const length = lines
    .find((x) => /^content-length:/i.test(x))
    ?.slice(15)
    .trim();
  return {
    status,
    location,
    file,
    length: length === undefined ? null : Number(length),
  };
}
try {
  const result = await request(
    `https://api.github.com/repos/${repository}/releases/${tag ? `tags/${tag}` : "latest"}`,
    "application/vnd.github+json",
    4 * 1024 * 1024,
    true,
  );
  if (result.status !== 200)
    throw Error(`读取正式 Release 失败：HTTP ${result.status}`);
  const github = JSON.parse(await readFile(result.file, "utf8"));
  const manifest = fromGithub(github);
  async function attachment(published, maxBytes, headOnly = false) {
    if (
      !Number.isSafeInteger(published?.id) ||
      published.id <= 0 ||
      published.url !==
        `https://api.github.com/repos/${repository}/releases/assets/${published.id}`
    )
      throw Error("安装包 API 来源无效");
    let body = await request(
      published.url,
      "application/octet-stream",
      maxBytes,
      true,
      headOnly,
    );
    for (
      let redirects = 0;
      [301, 302, 303, 307, 308].includes(body.status) && redirects < 3;
      redirects++
    ) {
      const location = new URL(body.location);
      if (
        location.protocol !== "https:" ||
        location.username ||
        location.password ||
        location.port ||
        ![
          "release-assets.githubusercontent.com",
          "objects.githubusercontent.com",
        ].includes(location.hostname)
      )
        throw Error("下载重定向来源不可信");
      body = await request(
        location.href,
        "application/octet-stream",
        maxBytes,
        false,
        headOnly,
      );
    }
    if (body.status !== 200)
      throw Error(`安装包不可读：${published.name} (HTTP ${body.status})`);
    return body;
  }
  const sums = github.assets.filter((a) => a.name === "SHA256SUMS.txt");
  if (
    sums.length !== 1 ||
    sums[0].state !== "uploaded" ||
    !/^sha256:[a-f0-9]{64}$/.test(sums[0].digest) ||
    !Number.isSafeInteger(sums[0].size) ||
    sums[0].size <= 0 ||
    sums[0].size > 1024 * 1024
  )
    throw Error("缺少有效 SHA256SUMS.txt");
  const checksum = await attachment(sums[0], sums[0].size);
  await verifyFile(createReadStream(checksum.file), {
    name: sums[0].name,
    bytes: sums[0].size,
    sha256: sums[0].digest.slice(7),
  });
  const entries = (await readFile(checksum.file, "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => line.match(/^([a-f0-9]{64})  (.+)$/));
  if (entries.some((entry) => !entry)) throw Error("SHA256SUMS.txt 格式无效");
  for (const asset of manifest.downloads) {
    const matching = entries.filter((entry) => entry[2] === asset.name);
    if (matching.length !== 1 || matching[0][1] !== asset.sha256)
      throw Error(`发布摘要不一致：${asset.name}`);
    const published = github.assets.find((a) => a.name === asset.name);
    const head = await attachment(published, asset.bytes, true);
    if (head.length !== asset.bytes)
      throw Error(`远程大小缺失或不匹配：${asset.name}`);
    if (process.env.VERIFY_DOWNLOAD_BYTES === "1") {
      const body = await attachment(published, asset.bytes);
      await verifyFile(createReadStream(body.file), asset);
    }
    console.log(
      `Verified ${asset.name}: available, ${asset.bytes} bytes, GitHub digest matches SHA256SUMS${process.env.VERIFY_DOWNLOAD_BYTES === "1" ? ", full bytes hashed" : ""}`,
    );
  }
  await copyFile("LICENSE", "public/LICENSE.txt");
  await copyFile("SOURCE.json", "public/SOURCE.json");
  await writeFile(
    "public/release.json.tmp",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await rename("public/release.json.tmp", "public/release.json");
  console.log(`Verified official release ${manifest.tag}; no fallback data.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
