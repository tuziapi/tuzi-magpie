import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  copyFile,
  readFile,
  rm,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { formats, assetUrl, releasesUrl } from "../src/release.js";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
// A fake executable owns every request. No registry, GitHub or live config is
// reachable in this production-script integration test.
test("production build fails closed on unavailable files, bad HEAD size, checksum mismatch and unsafe redirects", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tuzi-build-test-"));
  try {
    for (const p of ["scripts", "src", "public", "bin"])
      await mkdir(join(dir, p));
    for (const p of [
      "scripts/release-metadata.mjs",
      "scripts/verify-file.mjs",
      "src/release.js",
      "LICENSE",
      "SOURCE.json",
    ])
      await copyFile(resolve(p), join(dir, p));
    await writeFile(join(dir, "package.json"), '{"type":"module"}');
    const tag = "v1.2.3",
      bodies = {};
    const assets = formats.map((f, i) => {
      const name = `tuzi-magpie-${tag}-${f.suffix}`,
        bytes = Buffer.from(`synthetic installer ${i}`);
      bodies[i + 1] = bytes.toString("base64");
      return {
        id: i + 1,
        name,
        state: "uploaded",
        size: bytes.length,
        digest: `sha256:${sha(bytes)}`,
        url: `https://api.github.com/repos/tuziapi/tuzi-magpie/releases/assets/${i + 1}`,
        browser_download_url: assetUrl(tag, name),
      };
    });
    const sums = Buffer.from(
      assets.map((a) => `${a.digest.slice(7)}  ${a.name}`).join("\n") + "\n",
    );
    bodies[7] = sums.toString("base64");
    assets.push({
      id: 7,
      name: "SHA256SUMS.txt",
      state: "uploaded",
      size: sums.length,
      digest: `sha256:${sha(sums)}`,
      url: "https://api.github.com/repos/tuziapi/tuzi-magpie/releases/assets/7",
    });
    const release = {
      tag_name: tag,
      draft: false,
      prerelease: false,
      html_url: `${releasesUrl}/tag/${tag}`,
      published_at: "2026-11-01T00:00:00Z",
      assets,
    };
    await writeFile(
      join(dir, "fixture.json"),
      JSON.stringify({ release, bodies }),
    );
    await writeFile(
      join(dir, "bin/curl"),
      `#!/usr/bin/env node
const fs=require('node:fs');
const {release,bodies}=JSON.parse(fs.readFileSync('fixture.json'));
const args=process.argv.slice(2),url=new URL(args.at(-1)),mode=process.env.FAILURE_MODE;
const out=args[args.indexOf('--output')+1],head=args[args.indexOf('--dump-header')+1];
let status=200,headers='',body=Buffer.alloc(0);
if(url.pathname.endsWith('/latest')){
 if(mode==='missing')release.assets.shift();
 body=Buffer.from(JSON.stringify(release));
}else{
 const id=Number(url.pathname.split('/').at(-1));
 if(url.hostname==='api.github.com'){
  status=302;headers='Location: https://'+(mode==='redirect'?'attacker.invalid':'release-assets.githubusercontent.com')+'/'+id+'\\r\\n';
 }else if(mode==='404'&&id===1){status=404;}
 else{
  const bytes=Buffer.from(bodies[id],'base64');
  if(args.includes('--head'))headers='Content-Length: '+(bytes.length+(mode==='size'?1:0))+'\\r\\n';
  else{body=bytes;if(mode==='checksum'&&id===7)body[0]^=1;}
 }
}
fs.writeFileSync(head,'HTTP/2 '+status+'\\r\\n'+headers+'\\r\\n');
fs.writeFileSync(out,body);
`,
      { mode: 0o755 },
    );
    // This .cjs copy is needed because the containing test project is ESM.
    const fake = await readFile(join(dir, "bin/curl"), "utf8");
    await writeFile(join(dir, "bin/curl.cjs"), fake);
    await writeFile(
      join(dir, "bin/curl"),
      `#!/bin/sh\nexec '${process.execPath}' '${join(dir, "bin/curl.cjs")}' "$@"\n`,
      { mode: 0o755 },
    );
    const env = {
      ...process.env,
      PATH: `${join(dir, "bin")}:${process.env.PATH}`,
      GH_TOKEN: "synthetic-test-token",
      RELEASE_TAG: "",
      VERIFY_DOWNLOAD_BYTES: "1",
    };
    execFileSync(process.execPath, ["scripts/release-metadata.mjs"], {
      cwd: dir,
      env,
      stdio: "pipe",
    });
    assert.equal(
      JSON.parse(await readFile(join(dir, "public/release.json"))).downloads
        .length,
      6,
    );
    for (const mode of ["missing", "404", "size", "checksum", "redirect"]) {
      await mkdir(join(dir, "dist"), { recursive: true });
      await writeFile(join(dir, "dist/index.html"), "stale build");
      await writeFile(join(dir, "public/release.json"), "stale metadata");
      assert.throws(
        () =>
          execFileSync(process.execPath, ["scripts/release-metadata.mjs"], {
            cwd: dir,
            env: { ...env, FAILURE_MODE: mode },
            stdio: "pipe",
          }),
        mode,
      );
      await assert.rejects(access(join(dir, "public/release.json")), mode);
      await assert.rejects(access(join(dir, "dist")), mode);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
