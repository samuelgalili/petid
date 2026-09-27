// Builds the default share image and favicon.ico from the icons already in public/.
// Run from the repo root after server dependencies are installed:
//   node scripts/generate-share-images.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "server/package.json"));
const sharp = require("sharp");

const pngToIco = (png, size) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
};

const mark = await sharp(path.join(root, "public/mipo-mark.svg"))
  .resize(860, 420, { fit: "inside" })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: "#FFF6F1",
  },
})
  .composite([{ input: mark, gravity: "centre" }])
  .png()
  .toFile(path.join(root, "public/og-default.png"));

const icon = await sharp(path.join(root, "public/favicon-32x32.png"))
  .resize(32, 32)
  .png()
  .toBuffer();
await writeFile(path.join(root, "public/favicon.ico"), pngToIco(icon, 32));

const og = await sharp(path.join(root, "public/og-default.png")).metadata();
if (og.width !== 1200 || og.height !== 630) {
  throw new Error(`og-default.png is ${og.width}x${og.height}`);
}
const ico = await readFile(path.join(root, "public/favicon.ico"));
if (ico.readUInt16LE(2) !== 1) throw new Error("favicon.ico is not an icon");
