import { createHash } from "node:crypto";

// Finding, checking and keeping product images.
//
// The supplier file's image column points into a private ERP share, so those
// 217 references cannot be fetched. Images come from elsewhere, from sources of
// very different trustworthiness, and the engine's job is to keep that
// difference visible rather than to produce a picture at any cost.
//
// Three rules shape everything here:
//
//   A candidate is scored on evidence, not on being first. A search result that
//   matches nothing about the product is worse than no image.
//
//   An accepted image is copied into storage we control. Hotlinking means the
//   shop breaks when someone else's site changes.
//
//   Nothing bypasses anyone's access control. A source needing credentials is
//   used only with credentials given to us.

export const IMAGE_JOB_TYPE = "image.resolve";

// Lower is better. A supplier export outranks anything found by searching, so
// when it finally arrives it replaces the stand-ins without re-review.
export const SOURCE_RANK = Object.freeze({
  supplier_export: 1,
  supplier_url: 2,
  manufacturer: 3,
  barcode_lookup: 4,
  name_search: 5,
  manual_upload: 0,
  erp_path: 99,
});

export const AUTO_ACCEPT_AT = 95;
export const REVIEW_AT = 70;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Decides what happens to a candidate given its score. */
export const verdictFor = (confidence) => {
  if (confidence >= AUTO_ACCEPT_AT) return "accepted";
  if (confidence >= REVIEW_AT) return "review";
  return "rejected";
};

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/["'׳״]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const tokens = (value) => new Set(normalize(value).split(" ").filter((token) => token.length > 1));

/**
 * Scores a candidate against the product it claims to depict.
 *
 * The evidence is returned alongside the number, because "84" tells a reviewer
 * nothing and "the barcode matched, the brand did not" tells them everything.
 * A source that is trusted by nature — an export named by SKU — scores high
 * without needing the filename to describe the product.
 */
export const scoreCandidate = (candidate, product) => {
  const evidence = {};
  let score = 0;

  const haystack = normalize([candidate.url, candidate.filename, candidate.title, candidate.context].join(" "));

  if (candidate.source_kind === "supplier_export" || candidate.source_kind === "manual_upload") {
    // The SKU in the filename is the whole claim, and it is a strong one.
    evidence.source = "trusted";
    score = 100;
    return { score, evidence, verdict: verdictFor(score) };
  }

  if (product.sku && haystack.includes(normalize(product.sku))) {
    evidence.sku = true;
    score += 45;
  }

  if (product.barcode && haystack.includes(String(product.barcode).replace(/\D/g, ""))) {
    evidence.barcode = true;
    score += 40;
  }

  if (product.brand) {
    const brandTokens = tokens(product.brand);
    const matched = [...brandTokens].filter((token) => haystack.includes(token));
    if (matched.length > 0) {
      evidence.brand = true;
      score += 20;
    } else {
      // A picture whose page never mentions the brand is probably a different
      // product, so this is a deduction rather than a missing bonus.
      evidence.brand = false;
      score -= 15;
    }
  }

  if (product.name) {
    const nameTokens = [...tokens(product.name)];
    const matched = nameTokens.filter((token) => haystack.includes(token));
    const ratio = nameTokens.length > 0 ? matched.length / nameTokens.length : 0;
    evidence.name_match_ratio = Number(ratio.toFixed(2));
    score += Math.round(ratio * 25);
  }

  // Pack size is what separates a 1.5kg bag from a 20kg one, and those share a
  // barcode in this catalogue. Getting it wrong is worse than having no image.
  if (product.size_amount && product.size_unit) {
    const sizePattern = new RegExp(`${product.size_amount}\\s*(kg|g|ml|l|ק"?ג|גרם|ליטר)`, "i");
    if (sizePattern.test(candidate.filename || candidate.title || "")) {
      evidence.size = true;
      score += 10;
    }
  }

  const bounded = Math.max(0, Math.min(100, score));
  return { score: bounded, evidence, verdict: verdictFor(bounded) };
};

const sniffContentType = (buffer) => {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buffer.slice(0, 3).toString("ascii") === "GIF") return "image/gif";
  return null;
};

/** Width and height from the header alone, without decoding the image. */
export const readDimensions = (buffer, contentType) => {
  try {
    if (contentType === "image/png") {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    if (contentType === "image/gif") {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }

    if (contentType === "image/webp" && buffer.slice(12, 16).toString("ascii") === "VP8X") {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }

    if (contentType === "image/jpeg") {
      let offset = 2;
      while (offset < buffer.length - 9) {
        if (buffer[offset] !== 0xff) { offset += 1; continue; }
        const marker = buffer[offset + 1];
        // SOF0 through SOF15, skipping the ones that are not frame headers.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        offset += 2 + buffer.readUInt16BE(offset + 2);
      }
    }
  } catch {
    // A truncated or unusual file simply has unknown dimensions.
  }

  return { width: null, height: null };
};

/**
 * Downloads a candidate and checks it is actually an image.
 *
 * Content-type headers are advisory, so the bytes are sniffed. A server
 * claiming image/png and sending HTML is common enough to be worth refusing.
 */
export const fetchImage = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { accept: "image/*" },
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_IMAGE_BYTES) {
      return { ok: false, error: `Image is larger than ${MAX_IMAGE_BYTES} bytes` };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) return { ok: false, error: "Empty response" };
    if (buffer.length > MAX_IMAGE_BYTES) {
      return { ok: false, error: `Image is larger than ${MAX_IMAGE_BYTES} bytes` };
    }

    const contentType = sniffContentType(buffer);
    if (!contentType || !ALLOWED_TYPES.has(contentType)) {
      return { ok: false, error: "The response is not an image" };
    }

    const checksum = createHash("sha256").update(buffer).digest("hex");
    const { width, height } = readDimensions(buffer, contentType);

    return { ok: true, buffer, contentType, checksum, width, height, byteSize: buffer.length };
  } catch (error) {
    return { ok: false, error: error.name === "AbortError" ? "Timed out" : error.message };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Stores an accepted image and records it against the product.
 *
 * The same bytes arriving twice are stored once: the blob is keyed on its
 * checksum, so two products sharing a picture share the storage too.
 */
export const storeImage = async (client, { productId, fetched, candidate, score, evidence, verdict }) => {
  const storageKey = `products/${productId.slice(0, 2)}/${fetched.checksum}`;

  await client.query(
    `
      insert into public.image_blobs (storage_key, content, content_type, byte_size, checksum_sha256)
      values ($1, $2, $3, $4, $5)
      on conflict (storage_key) do nothing
    `,
    [storageKey, fetched.buffer, fetched.contentType, fetched.byteSize, fetched.checksum],
  );

  const result = await client.query(
    `
      insert into public.product_images (
        product_id, image_url, alt_text, source_kind, source_url, source_reference,
        storage_key, checksum_sha256, width, height, content_type, byte_size,
        confidence, match_evidence, status
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15)
      -- The index this targets is partial, so its predicate has to be repeated
      -- here or PostgreSQL will not match it.
      on conflict (product_id, checksum_sha256) where checksum_sha256 is not null do update set
        confidence = greatest(public.product_images.confidence, excluded.confidence),
        updated_at = now()
      returning id, status
    `,
    [
      productId,
      `/api/images/${fetched.checksum}`,
      candidate.alt || null,
      candidate.source_kind,
      candidate.url || null,
      candidate.filename || null,
      storageKey,
      fetched.checksum,
      fetched.width,
      fetched.height,
      fetched.contentType,
      fetched.byteSize,
      score,
      JSON.stringify(evidence),
      verdict,
    ],
  );

  return result.rows[0];
};

/**
 * Promotes the best accepted image to the one the shop shows.
 *
 * Ranked by source first and confidence second, so a supplier export beats a
 * high-scoring search result. An image an administrator chose by hand outranks
 * everything, because a person looked at it.
 */
export const promotePrimaryImage = async (client, productId) => {
  const best = await client.query(
    `
      select id, image_url, source_kind, confidence
      from public.product_images
      where product_id = $1 and status = 'accepted'
      order by
        case source_kind
          when 'manual_upload' then 0
          when 'supplier_export' then 1
          when 'supplier_url' then 2
          when 'manufacturer' then 3
          when 'barcode_lookup' then 4
          when 'name_search' then 5
          else 99
        end,
        confidence desc nulls last,
        created_at
      limit 1
    `,
    [productId],
  );

  const winner = best.rows[0];
  if (!winner) return null;

  await client.query(
    "update public.product_images set is_main = (id = $2), updated_at = now() where product_id = $1",
    [productId, winner.id],
  );

  await client.query(
    "update public.products set image_url = $2, updated_at = now() where id = $1",
    [productId, winner.image_url],
  );

  return winner;
};

/** Records what was tried, so a product nobody could find an image for is visible. */
export const recordAttempt = async (pool, { productId, sourceKind, query, candidatesFound, accepted, error, durationMs }) => {
  await pool.query(
    `
      insert into public.image_resolution_attempts (
        product_id, source_kind, query, candidates_found, accepted, error, duration_ms
      )
      values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [productId, sourceKind, query || null, candidatesFound || 0, accepted || 0, error || null, durationMs || null],
  ).catch(() => {
    // Losing a log line must not fail an import.
  });
};
