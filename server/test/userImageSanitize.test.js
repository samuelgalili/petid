import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";

import {
  IMAGE_PRESETS,
  ImagePipelineError,
  USER_IMAGE_TOO_LARGE_HE,
  USER_IMAGE_UNREADABLE_HE,
  USER_PHOTO_MAX_EDGE,
  sanitizeUserImage,
} from "../src/imagePipeline.js";
import { contentTypeForSafeExtension } from "../src/security.js";

const DEVICE = "MIPO-DEVICE-PIXEL";
const MODEL = "MIPO-CAM-9";
const PLACE = "32.085300,34.781800";

// A real HEVC still (ftyp heic) with Make, Model and a GPS fix written into
// the EXIF. sharp's bundled libvips cannot decode this compression, which is
// the point of the fixture.
const HEIC_WITH_GPS = Buffer.from(
  `
AAAAHGZ0eXBoZWljAAAAAG1pZjFoZWljbWlhZgAAAb5tZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0
AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAANGlsb2MAAAAAREAAAgABAAAAAALuAAEAAAAAAAAA
NAACAAAAAAAAAAEAAAHiAAABDAAAADhpaW5mAAAAAAACAAAAFWluZmUCAAAAAAEAAGh2YzEAAAAAFWlu
ZmUCAAABAAIAAEV4aWYAAAAAGmlyZWYAAAAAAAAADmNkc2MAAgABAAEAAAD9aXBycAAAAN1pcGNvAAAA
dmh2Y0MBA3AAAAAAAAAAAAAe8AD8/fj4AAAPAyAAAQAYQAEMAf//A3AAAAMAkAAAAwAAAwAeugJAIQAB
ACpCAQEDcAAAAwCQAAADAAADAB6gIIEFluqumubgIaDAgAAAAwCAAAADAIQiAAEABkQBwXPBiQAAABRp
c3BlAAAAAAAAAEAAAABAAAAAKGNsYXAAAAAgAAAAAQAAABgAAAAB////4AAAAAL////YAAAAAgAAABNj
b2xybmNseAABAA0ABoAAAAAQcGl4aQAAAAADCAgIAAAAGGlwbWEAAAAAAAAAAQABBYECgwQFAAABSG1k
YXQAAAAGRXhpZgAATU0AKgAAAAgABwEPAAIAAAASAAAAYgEQAAIAAAALAAAAdAEaAAUAAAABAAAAgAEb
AAUAAAABAAAAiAEoAAMAAAABAAIAAAITAAMAAAABAAEAAIglAAQAAAABAAAAkAAAAABNSVBPLURFVklD
RS1QSVhFTABNSVBPLUNBTS05AAAAAABIAAAAAQAAAEgAAAABAAUAAAABAAAABAIDAAAAAQACAAAAAk4A
AAAAAgAFAAAAAwAAANIAAwACAAAAAkUAAAAABAAFAAAAAwAAAOoAAAAAAAAAIAAAAAEAAAAFAAAAAQAA
ALEAAAAZAAAAIgAAAAEAAAAuAAAAAQAABVIAAAAZAAAAMCgBrxMhZmNA+BD3Z//rvBX/lWs/8zex6c7I
R0DA0iCAm0BIk11QCxYQgId2pVbc+A==
  `.replace(/\s/g, ""),
  "base64",
);

const gpsFromExif = (exif) => {
  if (!exif) return null;
  let base = 0;
  if (exif.toString("ascii", 0, 4) === "Exif") base = 6;
  const little = exif.toString("ascii", base, base + 2) === "II";
  const u16 = (offset) => (little ? exif.readUInt16LE(offset) : exif.readUInt16BE(offset));
  const u32 = (offset) => (little ? exif.readUInt32LE(offset) : exif.readUInt32BE(offset));
  if (u16(base + 2) !== 42) return null;

  const readIfd = (pos) => {
    const count = u16(pos);
    const entries = [];
    for (let index = 0; index < count; index += 1) {
      const at = pos + 2 + index * 12;
      entries.push({
        tag: u16(at),
        type: u16(at + 2),
        count: u32(at + 4),
        value: u32(at + 8),
      });
    }
    return entries;
  };

  const ifd0 = readIfd(base + u32(base + 4));
  const gpsPointer = ifd0.find((entry) => entry.tag === 0x8825);
  if (!gpsPointer) return null;
  const gps = readIfd(base + gpsPointer.value);
  const rationals = (entry) => {
    if (!entry || entry.type !== 5) return null;
    const start = base + entry.value;
    const values = [];
    for (let index = 0; index < entry.count; index += 1) {
      const numerator = u32(start + index * 8);
      const denominator = u32(start + index * 8 + 4) || 1;
      values.push(numerator / denominator);
    }
    return values;
  };
  const latitude = rationals(gps.find((entry) => entry.tag === 0x0002));
  const longitude = rationals(gps.find((entry) => entry.tag === 0x0004));
  if (!latitude || !longitude) return null;
  return { latitude, longitude };
};

const decimal = ([degrees, minutes, seconds]) => degrees + minutes / 60 + seconds / 3600;

const phoneJpeg = async ({ width, height, orientation = null, paint = null }) => {
  let image = sharp({
    create: { width, height, channels: 3, background: { r: 240, g: 230, b: 220 } },
  });
  if (paint) image = image.composite(paint);
  const plain = await image.jpeg({ quality: 95 }).toBuffer();
  let pipeline = sharp(plain).withExif({
    IFD0: {
      Make: DEVICE,
      Model: MODEL,
      ImageDescription: `GPS ${PLACE}`,
    },
    IFD3: {
      GPSLatitudeRef: "N",
      GPSLatitude: "32/1 5/1 708/100",
      GPSLongitudeRef: "E",
      GPSLongitude: "34/1 46/1 5448/100",
    },
  });
  if (orientation) pipeline = pipeline.withMetadata({ orientation });
  return pipeline.jpeg().toBuffer();
};

const assertNoLocation = async (buffer) => {
  const meta = await sharp(buffer).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.exif, undefined);
  assert.equal(meta.xmp, undefined);
  assert.equal(meta.iptc, undefined);
  assert.equal(meta.icc, undefined);
  assert.equal(meta.orientation, undefined);
  assert.equal(buffer.includes(Buffer.from(DEVICE)), false);
  assert.equal(buffer.includes(Buffer.from(MODEL)), false);
  assert.equal(buffer.includes(Buffer.from(PLACE)), false);
  assert.equal(buffer.includes(Buffer.from("GPSLatitude")), false);
  assert.equal(gpsFromExif(meta.exif), null);
};

test("a photo with GPS and a device name is served without either", async () => {
  const source = await phoneJpeg({ width: 800, height: 600 });
  const sourceMeta = await sharp(source).metadata();
  const gps = gpsFromExif(sourceMeta.exif);
  assert.ok(gps, "the fixture itself must carry a GPS IFD");
  assert.ok(Math.abs(decimal(gps.latitude) - 32.0853) < 0.001);
  assert.ok(Math.abs(decimal(gps.longitude) - 34.7818) < 0.001);
  assert.equal(sourceMeta.exif.toString("latin1").includes(DEVICE), true);
  assert.equal(sourceMeta.exif.toString("latin1").includes(MODEL), true);
  assert.equal(source.includes(Buffer.from(PLACE)), true);

  const stored = await sanitizeUserImage(source);
  assert.equal(stored.content_type, "image/webp");
  assert.equal(stored.extension, ".webp");
  assert.equal(contentTypeForSafeExtension(stored.extension), "image/webp");
  await assertNoLocation(stored.buffer);
  assert.equal(stored.width, 800);
  assert.equal(stored.height, 600);
});

test("orientation is applied and the orientation tag is not kept", async () => {
  const left = await sharp({
    create: { width: 30, height: 20, channels: 3, background: { r: 220, g: 10, b: 10 } },
  }).png().toBuffer();
  const right = await sharp({
    create: { width: 30, height: 20, channels: 3, background: { r: 10, g: 10, b: 220 } },
  }).png().toBuffer();
  const source = await phoneJpeg({
    width: 60,
    height: 20,
    orientation: 6,
    paint: [
      { input: left, left: 0, top: 0 },
      { input: right, left: 30, top: 0 },
    ],
  });
  const before = await sharp(source).metadata();
  assert.equal(before.orientation, 6);
  assert.equal(before.width, 60);
  assert.equal(before.height, 20);

  const stored = await sanitizeUserImage(source);
  await assertNoLocation(stored.buffer);
  assert.equal(stored.width, 20);
  assert.equal(stored.height, 60);

  const { data, info } = await sharp(stored.buffer).raw().toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => {
    const index = (y * info.width + x) * info.channels;
    return [data[index], data[index + 1], data[index + 2]];
  };
  // 90 degrees clockwise: the right (blue) half becomes the top.
  const top = pixel(10, 8);
  const bottom = pixel(10, 50);
  // Orientation 6 turns the stored left edge into the top. Red was on the left.
  assert.ok(top[0] > 150 && top[2] < 80, `top should be the red half, got ${top}`);
  assert.ok(bottom[2] > 150 && bottom[0] < 80, `bottom should be the blue half, got ${bottom}`);
});

test("an XMP location packet is not copied into the stored file", async () => {
  const plain = await sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 20, g: 40, b: 60 } },
  }).jpeg().toBuffer();
  const secret = `MIPO-XMP-${PLACE}`;
  const xmp = Buffer.from(`http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>${secret}</x:xmpmeta>`);
  const length = Buffer.alloc(2);
  length.writeUInt16BE(xmp.length + 2);
  const source = Buffer.concat([
    plain.subarray(0, 2),
    Buffer.from([0xff, 0xe1]),
    length,
    xmp,
    plain.subarray(2),
  ]);
  assert.equal((await sharp(source).metadata()).xmp.toString().includes(secret), true);

  const stored = await sanitizeUserImage(source);
  await assertNoLocation(stored.buffer);
  assert.equal(stored.buffer.includes(Buffer.from(secret)), false);
  assert.equal(stored.buffer.includes(Buffer.from("http://ns.adobe.com/xap/1.0/")), false);
});

test("the long edge is capped and a small photo is not enlarged", async () => {
  const large = await sanitizeUserImage(await phoneJpeg({ width: 3000, height: 1500 }));
  assert.equal(large.width, USER_PHOTO_MAX_EDGE);
  assert.equal(large.height, USER_PHOTO_MAX_EDGE / 2);
  await assertNoLocation(large.buffer);

  const small = await sanitizeUserImage(await phoneJpeg({ width: 40, height: 30 }));
  assert.equal(small.width, 40);
  assert.equal(small.height, 30);
});

test("a thumbnail uses the catalogue thumbnail edge and carries no metadata", async () => {
  const stored = await sanitizeUserImage(await phoneJpeg({ width: 2000, height: 1000 }), {
    thumbnail: true,
  });
  await assertNoLocation(stored.buffer);
  await assertNoLocation(stored.thumbnail.buffer);
  assert.equal(stored.thumbnail.width, IMAGE_PRESETS.thumbnail.width);
  assert.equal(stored.thumbnail.height, IMAGE_PRESETS.thumbnail.width / 2);
  assert.equal(stored.thumbnail.content_type, "image/webp");
});

test("HEIC input is re-encoded and its GPS and device name are gone", async () => {
  assert.equal(HEIC_WITH_GPS.subarray(4, 8).toString("ascii"), "ftyp");
  assert.equal(HEIC_WITH_GPS.includes(Buffer.from(DEVICE)), true);
  assert.equal(HEIC_WITH_GPS.includes(Buffer.from(MODEL)), true);

  const stored = await sanitizeUserImage(HEIC_WITH_GPS);
  assert.equal(stored.content_type, "image/webp");
  assert.equal(stored.extension, ".webp");
  assert.equal(stored.width, 32);
  assert.equal(stored.height, 24);
  await assertNoLocation(stored.buffer);
});

test("a file that is not a photo fails with a Hebrew message", async () => {
  await assert.rejects(
    () => sanitizeUserImage(Buffer.from("this is not an image at all")),
    (error) => error instanceof ImagePipelineError
      && error.message === USER_IMAGE_UNREADABLE_HE
      && error.statusCode === 400
      && error.code === "undecodable",
  );
});

test("an image past the pixel cap fails with a Hebrew message", async () => {
  const source = await phoneJpeg({ width: 32, height: 32 });
  await assert.rejects(
    () => sanitizeUserImage(source, { limitInputPixels: 16 }),
    (error) => error instanceof ImagePipelineError
      && error.message === USER_IMAGE_TOO_LARGE_HE
      && error.code === "too_large",
  );
});

test("public image uploads are re-encoded before the file is written", () => {
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(source, /publicUrl && contentType\.startsWith\("image\/"\)/);
  assert.match(source, /sanitizeUserImage\(buffer\)/);
  assert.match(source, /extension = sanitized\.extension/);
});
