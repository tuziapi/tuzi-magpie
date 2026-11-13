import test from "node:test";
import assert from "node:assert/strict";
import {
  installation,
  shellInstaller,
  powershellInstaller,
} from "../src/install.js";
test("commands use existing Tuzi desktop scripts and match supported systems", () => {
  assert.equal(
    installation("macos").command,
    `curl -fsSL ${shellInstaller} | sh`,
  );
  assert.equal(installation("linux").command, installation("macos").command);
  assert.equal(
    installation("windows").command,
    `irm ${powershellInstaller} | iex`,
  );
  assert.match(installation("linux").note, /Ubuntu 24.04 amd64/);
  assert.match(installation("windows").note, /ARM64/);
  assert.equal(installation(""), null);
  for (const os of ["macos", "windows", "linux"])
    assert.match(
      installation(os).url,
      /^https:\/\/raw\.githubusercontent\.com\/tuziapi\/tuzi-magpie\/main\/scripts\/tuzi-magpie\/install\.(sh|ps1)$/,
    );
});
