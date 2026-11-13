import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { verifyFile } from "../scripts/verify-file.mjs";
const bytes = Buffer.from("synthetic installer bytes");
const asset = {
  name: "synthetic.dmg",
  bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
};
test("actual attachment bytes must match size and hash", async () => {
  await verifyFile(
    Readable.from([bytes.subarray(0, 5), bytes.subarray(5)]),
    asset,
  );
  await assert.rejects(verifyFile(Readable.from([bytes.subarray(1)]), asset));
  await assert.rejects(
    verifyFile(Readable.from([bytes, Buffer.from("extra")]), asset),
  );
  const corrupted = Buffer.from(bytes);
  corrupted[0] ^= 1;
  await assert.rejects(verifyFile(Readable.from([corrupted]), asset));
});
test("interrupted download never validates", async () => {
  async function* interrupted() {
    yield bytes.subarray(0, 2);
    throw Error("connection lost");
  }
  await assert.rejects(verifyFile(interrupted(), asset), /connection lost/);
});
