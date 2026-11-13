// Include corresponding source from this checkout, including uncommitted local
// edits, so a preview never links to a source file that does not exist yet.
import { copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../../", import.meta.url));
await copyFile("LICENSE", "public/LICENSE.txt");
await copyFile("SOURCE.json", "public/SOURCE.json");
execFileSync(
  "tar",
  [
    "--exclude=node_modules",
    "--exclude=dist",
    "--exclude=evidence",
    "--exclude=test-results",
    "--exclude=playwright-report",
    "--exclude=source.tar.gz",
    "--exclude=release.json",
    "--exclude=release.json.tmp",
    "-czf",
    fileURLToPath(new URL("../public/source.tar.gz", import.meta.url)),
    "-C",
    root,
    "packages/download-page",
    "internal/gui/assets",
    "internal/gui/tests/tuzi-account.test.cjs",
    "LICENSE",
    "THIRD_PARTY_NOTICES",
  ],
  { stdio: "inherit" },
);
