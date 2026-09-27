// Hide, and later restore, the legacy products whose main image is a broken
// external hotlink.
//
// Dry-run is the default and writes nothing. hide records each row's current
// shop_hidden and sets it true. unhide writes that recorded value back.
// The id list is fixed. An id that is not on it is refused before any write.
// in_stock is read so the log can show it, and no statement updates it.
//
//   DATABASE_URL=... node server/scripts/hideBrokenImageProducts.mjs --mode=dry-run
//   DATABASE_URL=... node server/scripts/hideBrokenImageProducts.mjs --mode=hide
//   DATABASE_URL=... node server/scripts/hideBrokenImageProducts.mjs --mode=unhide

import path from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { scriptPoolOptions } from "./scriptPoolSsl.mjs";

const { Pool } = pg;

export const BROKEN_IMAGE_HIDE_REASON = "broken-external-main-image-2026-09-27";

const BROKEN_IMAGE_PRODUCTS_JSON = "[\n  {\n    \"id\": \"cd927dc5-1650-4e91-bff8-121949dcd648\",\n    \"name\": \"\u05d2\u2019\u05d0\u05e8\u05d3 \u05de\u05d9\u05d9\u05e0\u05d8\u05e0\u05e0\u05e1 20 \u05e7\u201d\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/cd927dc5-1650-4e91-bff8-121949dcd648\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"293af4d2-728e-4822-b3f6-0d48758637ae\",\n    \"name\": \"\u05e2\u05e6\u05dd \u05d3\u05d7\u05d5\u05e1\u05d4\",\n    \"slug\": null,\n    \"public_path\": \"/product/293af4d2-728e-4822-b3f6-0d48758637ae\",\n    \"source_domain\": \"speedog.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTTP 403.\"\n  },\n  {\n    \"id\": \"220bdeb7-d737-497f-a706-c74b41f8b97e\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d1\u05d5\u05d2\u05e8 \u05d0\u05e7\u05e1\u05d8\u05e8\u05d4 \u05e1\u05dc\u05de\u05d5\u05df 12 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/220bdeb7-d737-497f-a706-c74b41f8b97e\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"357633ed-a8e2-44d1-bbf4-5743fed59ed5\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d1\u05d5\u05d2\u05e8 \u05d0\u05e7\u05e1\u05d8\u05e8\u05d4 \u05e1\u05dc\u05de\u05d5\u05df 3 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/357633ed-a8e2-44d1-bbf4-5743fed59ed5\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"8a724b82-44c4-47e9-bfdc-085a4bd1b835\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05d1\u05d5\u05d2\u05e8 \u05d1\u05e8\u05d5\u05d5\u05d6 12 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/8a724b82-44c4-47e9-bfdc-085a4bd1b835\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"025ae904-fa99-435d-b692-7a9de674c740\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05d1\u05d5\u05d2\u05e8 \u05db\u05d1\u05e9 12 \u05e7\u201d\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/025ae904-fa99-435d-b692-7a9de674c740\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"e3949d58-3c77-491d-833d-5a7419702823\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05d1\u05d5\u05d2\u05e8 \u05de\u05d9\u05e0\u05d9 \u05d1\u05e8\u05d5\u05d5\u05d6 \u05e1\u05e0\u05e1\u05d9\u05d8\u05d9\u05d1 7 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/e3949d58-3c77-491d-833d-5a7419702823\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"21ac1d01-f977-4697-8912-748cf06b0442\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05d1\u05d5\u05d2\u05e8 \u05de\u05d9\u05e0\u05d9 \u05db\u05d1\u05e9 1.5 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/21ac1d01-f977-4697-8912-748cf06b0442\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"1ae7c311-d36c-4d3f-90ef-27b5387145f6\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05d1\u05d5\u05d2\u05e8 \u05de\u05d9\u05e0\u05d9 \u05db\u05d1\u05e9 7 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/1ae7c311-d36c-4d3f-90ef-27b5387145f6\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"94ee3d55-3c30-4c1a-a619-b55d5ae7c310\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05d1\u05d5\u05d2\u05e8 \u05de\u05d9\u05e0\u05d9 \u05e1\u05dc\u05de\u05d5\u05df \u05d5\u05e7\u05e8\u05d9\u05dc \u05d4\u05d9\u05e4\u05d5\u05d0\u05dc\u05e8\u05d2\u05e0\u05d9 7 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/94ee3d55-3c30-4c1a-a619-b55d5ae7c310\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"a30a67ee-d2f3-4054-a3de-e44dfce4227c\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05d1\u05d5\u05d2\u05e8 \u05e1\u05dc\u05de\u05d5\u05df \u05d5\u05e7\u05e8\u05d9\u05dc 12 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/a30a67ee-d2f3-4054-a3de-e44dfce4227c\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"2f423cde-8d17-43b8-8bee-82fc5a8379ca\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05d2\u2019\u05d5\u05e0\u05d9\u05d5\u05e8 \u05de\u05d9\u05e0\u05d9 \u05d1\u05e8\u05d5\u05d5\u05d6 1.5 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/2f423cde-8d17-43b8-8bee-82fc5a8379ca\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"6cd7157a-f6fc-4210-81c9-c7f31d91de78\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05e4\u05d0\u05e4\u05d9 \u05de\u05d9\u05e0\u05d9 \u05d1\u05e8\u05d5\u05d5\u05d6 1.5 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/6cd7157a-f6fc-4210-81c9-c7f31d91de78\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"2cf8fd17-7c6a-442f-b7bc-1fad76b217b3\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05e4\u05d0\u05e4\u05d9 \u05de\u05d9\u05e0\u05d9 \u05d1\u05e8\u05d5\u05d5\u05d6 7 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/2cf8fd17-7c6a-442f-b7bc-1fad76b217b3\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"623b0fd2-3b7d-476f-a002-1b6931b992a7\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05d2\u2019\u05d5\u05e0\u05d9\u05d5\u05e8 \u05d1\u05e8\u05d5\u05d5\u05d6 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 3 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/623b0fd2-3b7d-476f-a002-1b6931b992a7\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"4c5ef0b7-3b2e-4452-a661-5727bd89694d\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05db\u05dc\u05d1 \u05d1\u05d5\u05d2\u05e8 \u05d0\u05e7\u05e1\u05d8\u05e8\u05d4 \u05db\u05d1\u05e9 12 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/4c5ef0b7-3b2e-4452-a661-5727bd89694d\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"da58d8b0-6e6c-4bbb-b563-9c5ad627bf91\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05db\u05dc\u05d1 \u05d1\u05d5\u05d2\u05e8 \u05d0\u05e7\u05e1\u05d8\u05e8\u05d4 \u05db\u05d1\u05e9 3 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/da58d8b0-6e6c-4bbb-b563-9c5ad627bf91\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"96feeb9e-e651-4eea-ba21-df52f58e6c09\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05db\u05dc\u05d1 \u05d1\u05d5\u05d2\u05e8 \u05d0\u05e7\u05e1\u05d8\u05e8\u05d4 \u05e2\u05d5\u05e3 12 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/96feeb9e-e651-4eea-ba21-df52f58e6c09\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"dd235990-7fd0-4e0d-98ae-957d02289393\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05db\u05dc\u05d1 \u05d1\u05d5\u05d2\u05e8 \u05d0\u05e7\u05e1\u05d8\u05e8\u05d4 \u05e2\u05d5\u05e3 3 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/dd235990-7fd0-4e0d-98ae-957d02289393\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"55cdedf5-6bad-4f1e-9258-beb22ec2a83f\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05db\u05dc\u05d1 \u05d2\u2019\u05d5\u05e0\u05d9\u05d5\u05e8 \u05d0\u05e7\u05e1\u05d8\u05e8\u05d4 \u05e2\u05d5\u05e3 7 \u05e7\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/55cdedf5-6bad-4f1e-9258-beb22ec2a83f\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"98e4cc1c-37c1-4008-ac21-bfc1e1310e2a\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05db\u05dc\u05d1 \u05d2\u2019\u05d5\u05e0\u05d9\u05d5\u05e8 \u05d0\u05e7\u05e1\u05d8\u05e8\u05d4 \u05e2\u05d5\u05e3 7 \u05e7\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/98e4cc1c-37c1-4008-ac21-bfc1e1310e2a\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"6e09496f-aa98-4714-ab95-43476c271aa0\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05e1\u05dc\u05de\u05d5\u05df \u05d5\u05e7\u05e8\u05d9\u05dc \u05d1\u05d5\u05d2\u05e8 \u05d2\u05d6\u05e2 \u05de\u05d9\u05e0\u05d9 \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 \u05d4\u05d9\u05e4\u05d5\u05d0\u05dc\u05e8\u05d2\u05e0\u05d9 1.5 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/6e09496f-aa98-4714-ab95-43476c271aa0\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"e0c6ac9b-0784-4587-90f6-82816c879c08\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05e1\u05e0\u05d9\u05d5\u05e8 \u05de\u05d9\u05e0\u05d9 \u05d3\u05d2 \u05dc\u05d1\u05df \u05d5\u05e7\u05e8\u05d9\u05dc \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 1.5 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/e0c6ac9b-0784-4587-90f6-82816c879c08\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"7c0c170e-00ca-4727-a6ec-82c2e2f9a65d\",\n    \"name\": \"\u05e7\u05d5\u05d5\u05d0\u05d8\u05e8\u05d5 \u05e1\u05e0\u05d9\u05d5\u05e8 \u05de\u05d9\u05e0\u05d9 \u05d3\u05d2 \u05dc\u05d1\u05df \u05d5\u05e7\u05e8\u05d9\u05dc \u05d2\u05e8\u05d9\u05df \u05e4\u05e8\u05d9 7 \u05e7\\\"\u05d2\",\n    \"slug\": null,\n    \"public_path\": \"/product/7c0c170e-00ca-4727-a6ec-82c2e2f9a65d\",\n    \"source_domain\": \"ken-hatuki.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTML (HTTP 202 captcha) instead of an image.\"\n  },\n  {\n    \"id\": \"27e1a898-c4cb-4846-9044-93cc113204b6\",\n    \"name\": \"\u05e7\u05d5\u05e0\u05d2 \u05db\u05d3\u05d5\u05e8 \u05d8\u05e0\u05d9\u05e1 \u05d1\u05e0\u05d5\u05e0\u05d9 1 \u05d9\u05d7'\",\n    \"slug\": null,\n    \"public_path\": \"/product/27e1a898-c4cb-4846-9044-93cc113204b6\",\n    \"source_domain\": \"speedog.co.il\",\n    \"reason\": \"Main image is an external hotlink that returned HTTP 403.\"\n  }\n]";

export const BROKEN_IMAGE_PRODUCTS = Object.freeze(
  JSON.parse(BROKEN_IMAGE_PRODUCTS_JSON).map((entry) => Object.freeze(entry)),
);

const ALLOWLIST = new Map(BROKEN_IMAGE_PRODUCTS.map((entry) => [entry.id, entry]));

const UUID = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

export const assertAllowlisted = (id) => {
  const key = String(id || "").toLowerCase();
  if (!ALLOWLIST.has(key)) {
    const error = new Error(`refusing id that is not on the broken-image list: ${id}`);
    error.code = "NOT_ALLOWLISTED";
    throw error;
  }
  return ALLOWLIST.get(key);
};

/** Uuids named on the command line that this script must not touch. */
export const unexpectedIds = (argv) => {
  const found = [];
  for (const arg of argv) {
    const matches = String(arg).match(UUID) || [];
    for (const id of matches) {
      if (!ALLOWLIST.has(id.toLowerCase())) found.push(id.toLowerCase());
    }
  }
  return found;
};

export const parseMode = (argv) => {
  const found = argv.find((value) => value.startsWith("--mode="));
  if (!found) return "dry-run";
  const mode = found.slice("--mode=".length);
  if (!["dry-run", "hide", "unhide"].includes(mode)) {
    const error = new Error("mode must be dry-run, hide or unhide");
    error.code = "BAD_MODE";
    throw error;
  }
  return mode;
};

/**
 * What to do for each allowlisted id, given the rows and holds just read.
 * Pure: the dry-run and the write path both call it, so they cannot disagree.
 */
export const planShopVisibility = (mode, rowsById, holdsById) => {
  if (!["dry-run", "hide", "unhide"].includes(mode)) {
    const error = new Error("mode must be dry-run, hide or unhide");
    error.code = "BAD_MODE";
    throw error;
  }
  return BROKEN_IMAGE_PRODUCTS.map((entry) => {
    const row = rowsById.get(entry.id) || null;
    const hold = holdsById.get(entry.id) || null;
    const base = {
      id: entry.id,
      name: entry.name,
      source_domain: entry.source_domain,
      found: Boolean(row),
      in_stock: row ? row.in_stock : null,
      shop_hidden: row ? row.shop_hidden === true : null,
      recorded_previous_shop_hidden: hold ? hold.previous_shop_hidden === true : null,
      has_hold: Boolean(hold),
      write: false,
      restore_to: hold ? hold.previous_shop_hidden === true : null,
    };
    if (!row) return { ...base, action: "missing" };
    if (mode === "dry-run") return { ...base, action: "report" };
    if (mode === "hide") {
      if (row.shop_hidden === true && hold) return { ...base, action: "already-hidden" };
      if (row.shop_hidden === true && !hold) return { ...base, action: "hidden-without-record" };
      return {
        ...base,
        action: "hide",
        write: true,
        restore_to: row.shop_hidden === true,
      };
    }
    if (!hold && row.shop_hidden !== true) return { ...base, action: "already-visible" };
    if (!hold) return { ...base, action: "refuse-no-record", restore_to: null };
    return {
      ...base,
      action: "unhide",
      write: true,
      restore_to: hold.previous_shop_hidden === true,
    };
  });
};

export const blockingActions = new Set(["missing", "hidden-without-record", "refuse-no-record"]);

const printPlan = (mode, plans) => {
  console.log(`mode=${mode} products=${plans.length} writes=${plans.filter((plan) => plan.write).length}`);
  for (const plan of plans) {
    const stock = plan.found ? String(plan.in_stock) : "absent";
    const hidden = plan.found ? String(plan.shop_hidden) : "absent";
    const recorded = plan.has_hold ? String(plan.recorded_previous_shop_hidden) : "none";
    console.log(
      `${plan.id}  hidden=${hidden}  stock_flag=${stock}  recorded_previous=${recorded}  action=${plan.action}  ${plan.source_domain}  ${plan.name}`,
    );
  }
};

const rowsByIdFrom = (rows) => new Map(rows.map((row) => [row.id, row]));
const holdsByIdFrom = (rows) => new Map(rows.map((row) => [row.product_id, row]));

const applyOne = async (client, mode, plan) => {
  assertAllowlisted(plan.id);
  const { rows } = await client.query(
    `select id, in_stock, shop_hidden
       from public.business_products
      where id = $1
      for update`,
    [plan.id],
  );
  const row = rows[0];
  if (!row) {
    const error = new Error(`product not found: ${plan.id}`);
    error.code = "MISSING_PRODUCT";
    throw error;
  }
  const holdResult = await client.query(
    `select product_id, previous_shop_hidden
       from public.product_shop_visibility_holds
      where product_id = $1
      for update`,
    [plan.id],
  );
  const decision = planShopVisibility(
    mode,
    rowsByIdFrom([{ ...row, name: plan.name }]),
    holdsByIdFrom(holdResult.rows),
  )[0];
  if (blockingActions.has(decision.action)) {
    const error = new Error(`${decision.action}: ${plan.id}`);
    error.code = decision.action;
    throw error;
  }
  if (!decision.write) return decision;

  const stockBefore = row.in_stock;
  if (decision.action === "hide") {
    await client.query(
      `insert into public.product_shop_visibility_holds
         (product_id, previous_shop_hidden, reason)
       values ($1, $2, $3)`,
      [plan.id, row.shop_hidden === true, BROKEN_IMAGE_HIDE_REASON],
    );
    const updated = await client.query(
      `update public.business_products
          set shop_hidden = true,
              updated_at = now()
        where id = $1
          and shop_hidden is not true
        returning id, in_stock, shop_hidden`,
      [plan.id],
    );
    if (updated.rowCount !== 1 || updated.rows[0].shop_hidden !== true) {
      throw new Error(`hide did not update ${plan.id}`);
    }
    if (updated.rows[0].in_stock !== stockBefore) {
      throw new Error(`stock flag changed for ${plan.id}`);
    }
    await client.query(
      `insert into public.product_shop_visibility_events
         (product_id, action, previous_shop_hidden, resulting_shop_hidden)
       values ($1, 'hide', $2, true)`,
      [plan.id, row.shop_hidden === true],
    );
    return decision;
  }

  const restoreTo = decision.restore_to === true;
  const updated = await client.query(
    `update public.business_products
        set shop_hidden = $2,
            updated_at = now()
      where id = $1
      returning id, in_stock, shop_hidden`,
    [plan.id, restoreTo],
  );
  if (updated.rowCount !== 1 || updated.rows[0].shop_hidden !== restoreTo) {
    throw new Error(`unhide did not restore ${plan.id}`);
  }
  if (updated.rows[0].in_stock !== stockBefore) {
    throw new Error(`stock flag changed for ${plan.id}`);
  }
  await client.query(
    `delete from public.product_shop_visibility_holds where product_id = $1`,
    [plan.id],
  );
  await client.query(
    `insert into public.product_shop_visibility_events
       (product_id, action, previous_shop_hidden, resulting_shop_hidden)
     values ($1, 'unhide', $2, $3)`,
    [plan.id, row.shop_hidden === true, restoreTo],
  );
  return decision;
};

export const runHideBrokenImageProducts = async ({ pool, mode, argv = [] }) => {
  const stray = unexpectedIds(argv);
  if (stray.length > 0) {
    const error = new Error(`refusing id that is not on the broken-image list: ${stray.join(", ")}`);
    error.code = "NOT_ALLOWLISTED";
    throw error;
  }
  const ids = BROKEN_IMAGE_PRODUCTS.map((entry) => entry.id);
  for (const id of ids) assertAllowlisted(id);

  const ready = await pool.query(
    `select
       to_regclass('public.product_shop_visibility_holds') is not null as holds,
       exists (
         select 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'business_products'
            and column_name = 'shop_hidden'
       ) as shop_hidden`,
  );
  if (ready.rows[0]?.holds !== true || ready.rows[0]?.shop_hidden !== true) {
    const error = new Error("0061_product_shop_visibility.sql is not applied. Deploy aws-migration first.");
    error.code = "SCHEMA";
    throw error;
  }

  const { rows } = await pool.query(
    `select id, name, in_stock, shop_hidden
       from public.business_products
      where id = any($1::uuid[])`,
    [ids],
  );
  const holds = await pool.query(
    `select product_id, previous_shop_hidden
       from public.product_shop_visibility_holds
      where product_id = any($1::uuid[])`,
    [ids],
  );
  const plans = planShopVisibility(mode, rowsByIdFrom(rows), holdsByIdFrom(holds.rows));
  printPlan(mode, plans);
  if (mode === "dry-run") return { plans, wrote: false };

  const blocked = plans.filter((plan) => blockingActions.has(plan.action));
  if (blocked.length > 0) {
    const error = new Error(`refusing to write: ${blocked.map((plan) => `${plan.action} ${plan.id}`).join("; ")}`);
    error.code = "BLOCKED";
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const plan of plans) {
      if (plan.write) await applyOne(client, mode, plan);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  return { plans, wrote: true };
};

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const main = async () => {
    let mode;
    try {
      mode = parseMode(process.argv.slice(2));
    } catch (error) {
      console.error(error.message);
      process.exit(2);
    }
    const stray = unexpectedIds(process.argv.slice(2));
    if (stray.length > 0) {
      console.error(`refusing id that is not on the broken-image list: ${stray.join(", ")}`);
      console.error("Nothing was written.");
      process.exit(2);
    }
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is required");
      process.exit(2);
    }
    const pool = new Pool(scriptPoolOptions());
    try {
      await runHideBrokenImageProducts({ pool, mode, argv: process.argv.slice(2) });
    } catch (error) {
      console.error(error.message);
      process.exit(error.code === "BAD_MODE" ? 2 : 1);
    } finally {
      await pool.end();
    }
  };
  main();
}
