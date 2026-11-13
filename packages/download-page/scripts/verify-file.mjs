import { createHash } from "node:crypto";
export async function verifyFile(stream, asset) {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of stream) {
    bytes += chunk.length;
    if (bytes > asset.bytes) throw Error(`文件大小超出清单：${asset.name}`);
    hash.update(chunk);
  }
  if (bytes !== asset.bytes || hash.digest("hex") !== asset.sha256)
    throw Error(`文件大小或 SHA-256 不匹配：${asset.name}`);
}
