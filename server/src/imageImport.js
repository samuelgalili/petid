import { createHash } from "node:crypto";
import * as XLSX from "@e965/xlsx";

import { promotePrimaryImage, readDimensions, storeImage } from "./imageEngine.js";
import { setChangeContext } from "./productVersions.js";

// Taking in a supplier's image export.
//
// The supplier sends a zip whose filenames are SKUs — caqu07107.jpg for the
// product with that SKU, caqu07107-2.jpg for its second picture. That is the
// highest-ranked source there is, so anything found by searching is replaced
// automatically when this arrives, with nobody having to re-review.
//
// Reading a zip is done with the spreadsheet library's own zip reader rather
// than by adding a dependency, since it is already here and already used on
// untrusted files.

const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;
const MAX_FILES = 5000;

const IMAGE_EXTENSIONS = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
]);

/**
 * Reads the SKU out of a filename.
 *
 * "caqu07107.jpg" is the product's first image; "caqu07107-2.jpg" its second.
 * Folder structure is ignored, because suppliers organise their exports however
 * they like and the filename is the part they were asked to control.
 */
export const parseImageFilename = (path) => {
  const filename = String(path).split(/[\\/]/).pop() || "";
  const match = filename.match(/^(.+?)(?:[-_](\d+))?\.([a-z0-9]+)$/i);
  if (!match) return null;

  const [, rawSku, sequence, extension] = match;
  const contentType = IMAGE_EXTENSIONS.get(extension.toLowerCase());
  if (!contentType) return null;

  const sku = rawSku.trim();
  if (!sku) return null;

  return {
    sku,
    normalizedSku: sku.toLowerCase(),
    sequence: sequence ? Number(sequence) : 1,
    contentType,
    filename,
  };
};

/**
 * Unpacks an export and attaches each image to the product whose SKU it names.
 *
 * A file naming a SKU nobody has is reported rather than dropped: it usually
 * means the export and the catalogue file disagree, which is worth knowing.
 */
export const importImageArchive = async (pool, { buffer, supplierId, adminUserId }) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error("The archive is empty"), { statusCode: 400 });
  }
  if (buffer.length > MAX_ARCHIVE_BYTES) {
    throw Object.assign(new Error("The archive is larger than the 200MB limit"), { statusCode: 413 });
  }

  let entries;
  try {
    const zip = XLSX.CFB.read(buffer, { type: "buffer" });
    entries = zip.FileIndex
      .map((meta, index) => ({ meta, path: zip.FullPaths[index] }))
      .filter((entry) => entry.meta.type === 2 && entry.meta.content);
  } catch (error) {
    throw Object.assign(new Error(`The archive could not be read: ${error.message}`), { statusCode: 400 });
  }

  if (entries.length > MAX_FILES) {
    throw Object.assign(new Error(`The archive holds more than ${MAX_FILES} files`), { statusCode: 413 });
  }

  const result = {
    files: entries.length,
    matched: 0,
    stored: 0,
    unmatched_skus: [],
    skipped: [],
  };

  for (const entry of entries) {
    const parsed = parseImageFilename(entry.path);
    if (!parsed) {
      result.skipped.push({ file: String(entry.path).split(/[\\/]/).pop(), reason: "NOT_AN_IMAGE" });
      continue;
    }

    const content = Buffer.from(entry.meta.content);
    if (content.length === 0) {
      result.skipped.push({ file: parsed.filename, reason: "EMPTY_FILE" });
      continue;
    }

    // Matched within the supplier's scope. Two suppliers can use the same SKU
    // for different products, and merging them on a filename would be exactly
    // the silent mistake the identity rules exist to prevent.
    const product = await pool.query(
      `
        select p.id, p.name
        from public.products p
        left join public.product_supplier_links l on l.product_id = p.id
        where lower(btrim(p.sku)) = $1
          and p.deleted_at is null
          and ($2::uuid is null or p.primary_supplier_id = $2 or l.supplier_id = $2)
        limit 1
      `,
      [parsed.normalizedSku, supplierId || null],
    );

    if (product.rowCount === 0) {
      result.unmatched_skus.push(parsed.sku);
      continue;
    }

    result.matched += 1;
    const productId = product.rows[0].id;
    const checksum = createHash("sha256").update(content).digest("hex");
    const { width, height } = readDimensions(content, parsed.contentType);

    const client = await pool.connect();
    try {
      await client.query("begin");
      await setChangeContext(client, {
        source: "import",
        reason: "תמונה מייצוא ספק",
        adminUserId,
      });

      await storeImage(client, {
        productId,
        fetched: {
          buffer: content,
          contentType: parsed.contentType,
          checksum,
          width,
          height,
          byteSize: content.length,
        },
        candidate: {
          source_kind: "supplier_export",
          filename: parsed.filename,
          alt: product.rows[0].name,
        },
        score: 100,
        evidence: { source: "trusted", sku_from_filename: parsed.sku },
        // The supplier saying "this is that product" is the strongest claim
        // available, so it does not queue for review.
        verdict: "accepted",
      });

      await promotePrimaryImage(client, productId);
      await client.query("commit");
      result.stored += 1;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      result.skipped.push({ file: parsed.filename, reason: error.message });
    } finally {
      client.release();
    }
  }

  // Duplicates in this list are noise; the useful signal is which SKUs.
  result.unmatched_skus = [...new Set(result.unmatched_skus)].slice(0, 100);
  return result;
};
