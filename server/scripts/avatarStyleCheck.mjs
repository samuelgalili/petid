#!/usr/bin/env node
/**
 * Generates one real avatar per style from a real photo, so the visual result
 * can actually be looked at.
 *
 * Everything about the avatar pipeline is verifiable offline except the part
 * that matters most: what the image looks like. This calls the same exported
 * functions the server calls - not a copy of them - so what it produces is what
 * a customer would get.
 *
 * Usage:
 *   GEMINI_API_KEY=... node server/scripts/avatarStyleCheck.mjs <photo> [outDir]
 *
 * Vertex works too, via VERTEX_AI_API_KEY or GOOGLE_CLOUD_PROJECT.
 *
 * Costs real money: one vision call to read the photo, then one image per
 * style. Character art is the largest AI line in the product, so this is
 * deliberately a manual script and not part of any automated suite.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import {
  CHARACTER_STYLES,
  generateCharacterCandidates,
} from "../src/petCharacter.js";

const CONTENT_TYPES = new Map([
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
  [".png", "image/png"], [".webp", "image/webp"],
]);

const [photoPath, outDir = "avatar-check"] = process.argv.slice(2);

if (!photoPath) {
  console.error("usage: GEMINI_API_KEY=... node server/scripts/avatarStyleCheck.mjs <photo> [outDir]");
  process.exit(2);
}

const geminiApiKey = process.env.GEMINI_API_KEY || "";
const vertexApiKey = process.env.VERTEX_AI_API_KEY || "";
const project = process.env.GOOGLE_CLOUD_PROJECT || "";

if (!geminiApiKey && !vertexApiKey && !project) {
  console.error("No provider credentials. Set GEMINI_API_KEY, VERTEX_AI_API_KEY or GOOGLE_CLOUD_PROJECT.");
  process.exit(2);
}

const contentType = CONTENT_TYPES.get(path.extname(photoPath).toLowerCase());
if (!contentType) {
  console.error(`Unsupported photo type: ${path.extname(photoPath)}. Use jpg, png or webp.`);
  process.exit(2);
}

const petName = process.env.PET_NAME || "Luna";
const petType = process.env.PET_TYPE || "dog";

console.log(`photo      ${photoPath}`);
console.log(`pet        ${petName} (${petType})`);
console.log(`styles     ${CHARACTER_STYLES.join(", ")}`);
console.log(`provider   ${vertexApiKey || project ? "vertex" : "gemini"}`);
console.log("");

const started = Date.now();
let generated;
try {
  generated = await generateCharacterCandidates({
    geminiApiKey: geminiApiKey || undefined,
    vertexApiKey: vertexApiKey || undefined,
    project: project || undefined,
    location: process.env.GOOGLE_CLOUD_LOCATION || "global",
    imageModel: process.env.PET_CHARACTER_IMAGE_MODEL || "gemini-2.5-flash-image",
    visionModel: process.env.PET_CHARACTER_VISION_MODEL || "gemini-2.5-flash",
    references: [{ buffer: await readFile(photoPath), contentType }],
    petName,
    petType,
  });
} catch (error) {
  console.error(`generation failed: ${error?.message || error}`);
  if (error?.code) console.error(`code: ${error.code}`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

console.log("identity read from the photo:");
console.log(JSON.stringify(generated.visualIdentity, null, 2));
console.log("");

for (const candidate of generated.candidates) {
  const extension = candidate.contentType === "image/png" ? "png"
    : candidate.contentType === "image/webp" ? "webp" : "jpg";
  const target = path.join(outDir, `${candidate.key}.${extension}`);
  await writeFile(target, candidate.buffer);
  console.log(`${candidate.key.padEnd(22)} ${(candidate.buffer.length / 1024).toFixed(0)}KB  ${target}`);
}

console.log("");
console.log(`${generated.candidates.length} candidates in ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log("Open them and check: is this the same animal, and is the whole body in frame?");
