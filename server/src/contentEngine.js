import { createHash } from "node:crypto";

import { callGeminiJson, isGeminiConfigured } from "./productIntel.js";
import { recordEvent } from "./events.js";

// Writing what a shopper reads.
//
// The supplier gives a terse internal name and a price. Everything a person
// actually reads has to be written, and the hard constraint is that it must be
// written from facts the system already holds — never invented.
//
// A generator that invents an ingredient list is worse than no generator: it
// produces text that reads well, is wrong, and nobody catches because it looks
// exactly like the text that is right. So the facts are assembled first, the
// model is told to work only from them, and what comes back is checked against
// them before anything is stored.

export const CONTENT_JOB_TYPE = "content.generate";

const MODEL = "gemini-2.5-flash";

/**
 * The facts a product actually has.
 *
 * Anything absent is absent. There is no filling in of a plausible weight or a
 * likely ingredient, because a plausible fact is still a fabricated one.
 */
export const collectFacts = (product) => {
  const facts = {};

  if (product.name) facts.source_name = product.name;
  if (product.name_en) facts.name_en = product.name_en;
  if (product.brand_name || product.brand) facts.brand = product.brand_name || product.brand;
  if (product.animal_name) facts.animal = product.animal_name;
  if (product.category_name) facts.category = product.category_name;
  if (product.category_parent) facts.category_group = product.category_parent;
  if (product.size_amount && product.size_unit) {
    facts.pack_size = `${product.size_amount} ${product.size_unit}`;
  }
  if (product.sku) facts.sku = product.sku;
  if (Number(product.price) > 0) facts.price_ils = Number(product.price);
  if (product.ingredients) facts.ingredients = product.ingredients;
  if (product.supplier_name) facts.supplier = product.supplier_name;

  return facts;
};

/** Changes to these mean the text no longer describes the product. */
export const hashFacts = (facts) =>
  createHash("sha256").update(JSON.stringify(facts, Object.keys(facts).sort())).digest("hex");

const PROMPT = `You write product copy for MIPO, an Israeli pet supplies shop.

Write in Hebrew. Professional, clear, useful, trustworthy. Not childish, not
salesy, no exclamation marks, no superlatives.

You are given the complete set of known facts about one product. Work only from
them.

Absolute rule: state nothing that is not in the facts. Do not name ingredients,
nutritional values, certifications, medical benefits, feeding amounts, ages or
country of origin unless they appear below. If the facts are thin, write less.
Short and correct beats long and invented.

Return JSON with exactly these keys:
  title              a clean product name for the shop, from the source name
  short_description  one sentence, up to 140 characters
  long_description   two or three short paragraphs
  key_benefits       array of up to 4 short strings, each grounded in a fact
  seo_title          up to 60 characters
  meta_description   up to 155 characters
  h1                 the page heading
  image_alt          what the picture shows, factually
  keywords           array of up to 8 Hebrew search terms

Facts:
`;

const asText = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || null;
};

const asList = (value, max) => {
  if (!Array.isArray(value)) return [];
  return value.map(asText).filter(Boolean).slice(0, max);
};

/**
 * Checks the generated text says nothing the facts do not support.
 *
 * This is the check that matters. A number in the copy that appears nowhere in
 * the facts is a fabrication, and the most common shape a fabrication takes —
 * an invented weight, an invented percentage, an invented age range.
 */
export const checkAgainstFacts = (content, facts) => {
  const checks = {};
  const factText = Object.values(facts).join(" ").toLowerCase();

  // Whole numbers, not substrings. A price of 329 must not excuse an invented
  // protein content of 32%, and a SKU of caqu07107 must not excuse "7 years".
  const factNumbers = new Set(
    (factText.match(/\d+(?:[.,]\d+)?/g) || []).map((number) => number.replace(",", ".")),
  );
  const generated = [
    content.title, content.short_description, content.long_description,
    ...(content.key_benefits || []),
  ].filter(Boolean).join(" ");

  checks.has_title = Boolean(content.title);
  checks.has_short_description = Boolean(content.short_description);
  checks.has_long_description = Boolean(content.long_description);

  // Numbers that appear in the copy but nowhere in the facts.
  const numbersUsed = [...new Set(generated.match(/\d+(?:[.,]\d+)?/g) || [])];
  const unsupported = numbersUsed.filter((number) => !factNumbers.has(number.replace(",", ".")));
  checks.unsupported_numbers = unsupported;
  checks.no_invented_numbers = unsupported.length === 0;

  // Claims a pet shop must not make without evidence behind them.
  const forbidden = [
    /מרפא|ריפוי|תרופה/,          // curing, medicine
    /מונע מחל|מונע סרטן/,          // prevents disease
    /מאושר על ידי|תקן ISO|אורגני מוסמך/, // certifications
    /100%\s*טבעי/,                 // absolute purity claims
  ];
  const claims = forbidden.filter((pattern) => pattern.test(generated)).map(String);
  checks.unsupported_claims = claims;
  checks.no_medical_claims = claims.length === 0;

  checks.length_ok = !content.short_description || content.short_description.length <= 200;

  // Everything mandatory has to hold. The specification is explicit that a
  // quality score never overrides a mandatory rule.
  checks.passed = checks.has_title
    && checks.has_short_description
    && checks.no_invented_numbers
    && checks.no_medical_claims
    && checks.length_ok;

  return checks;
};

/** Turns a Hebrew product name into a usable address. */
export const buildSlug = (title, sku) => {
  const base = String(title || "")
    .trim()
    .toLowerCase()
    .replace(/["'׳״]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  // The SKU keeps two similarly named products apart, which a slug built from
  // the name alone cannot do.
  const suffix = String(sku || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return suffix ? `${base}-${suffix}`.replace(/^-+/, "") : base || null;
};

/** Everything the generator needs about one product, in one query. */
const loadProduct = async (pool, productId) => {
  const result = await pool.query(
    `
      select
        p.id, p.name, p.description as name_en, p.sku, p.price, p.brand,
        p.size_amount, p.size_unit, p.ingredients,
        b.name as brand_name,
        c.name as category_name,
        parent.name as category_parent,
        a.name as animal_name,
        s.name as supplier_name
      from public.products p
      left join public.brands b on b.id = p.brand_id
      left join public.categories c on c.id = p.primary_category_id
      left join public.categories parent on parent.id = c.parent_id
      left join public.animal_types a on a.id = p.animal_type_id
      left join public.suppliers s on s.id = p.primary_supplier_id
      where p.id = $1 and p.deleted_at is null
    `,
    [productId],
  );
  return result.rows[0] || null;
};

/**
 * Generates content for one product and stores it as a new version.
 *
 * Nothing is overwritten and nothing is published. The result lands as a draft
 * or, if a mandatory check failed, in review with the failure recorded — so a
 * person sees why rather than seeing nothing.
 */
export const generateProductContent = async (pool, productId, { adminUserId = null, reason = null } = {}) => {
  const product = await loadProduct(pool, productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  if (!isGeminiConfigured()) {
    throw Object.assign(
      new Error("GEMINI_API_KEY is not set, so content cannot be generated"),
      { statusCode: 503 },
    );
  }

  const facts = collectFacts(product);
  const sourceHash = hashFacts(facts);

  const existing = await pool.query(
    "select version, source_hash from public.product_content where product_id = $1 order by version desc limit 1",
    [productId],
  );
  const latest = existing.rows[0];

  // The facts have not moved, so regenerating would produce a second version
  // saying the same thing from the same inputs.
  if (latest && latest.source_hash === sourceHash && !reason) {
    return { product_id: productId, skipped: true, reason: "SOURCE_UNCHANGED", version: latest.version };
  }

  const generated = await callGeminiJson(
    PROMPT + JSON.stringify(facts, null, 2),
    { temperature: 0.3 },
  );

  if (!generated) {
    throw Object.assign(new Error("The model returned nothing usable"), { statusCode: 502 });
  }

  const content = {
    title: asText(generated.title) || product.name,
    short_description: asText(generated.short_description),
    long_description: asText(generated.long_description),
    key_benefits: asList(generated.key_benefits, 4),
    seo_title: asText(generated.seo_title),
    meta_description: asText(generated.meta_description),
    h1: asText(generated.h1),
    image_alt: asText(generated.image_alt),
    keywords: asList(generated.keywords, 8),
  };

  const checks = checkAgainstFacts(content, facts);
  const version = (latest?.version || 0) + 1;
  const status = checks.passed ? "draft" : "review";

  const client = await pool.connect();
  try {
    await client.query("begin");

    // Only one version is live, so the previous one steps down first.
    await client.query(
      "update public.product_content set is_current = false, updated_at = now() where product_id = $1 and is_current",
      [productId],
    );

    const stored = await client.query(
      `
        insert into public.product_content (
          product_id, version, is_current, title, short_description, long_description,
          key_benefits, source_hash, source_facts, generator, model, reason, status, quality_checks,
          created_by_admin_user_id
        )
        values ($1, $2, true, $3, $4, $5, $6::jsonb, $7, $8::jsonb, 'ai', $9, $10, $11, $12::jsonb, $13)
        returning id
      `,
      [
        productId, version, content.title, content.short_description, content.long_description,
        JSON.stringify(content.key_benefits), sourceHash, JSON.stringify(facts), MODEL,
        reason, status, JSON.stringify(checks), adminUserId,
      ],
    );

    await client.query(
      "update public.product_seo set is_current = false, updated_at = now() where product_id = $1 and is_current",
      [productId],
    );

    await client.query(
      `
        insert into public.product_seo (
          product_id, content_id, version, is_current, seo_title, meta_description,
          h1, slug, image_alt, keywords, generator, model
        )
        values ($1, $2, $3, true, $4, $5, $6, $7, $8, $9, 'ai', $10)
      `,
      [
        productId, stored.rows[0].id, version,
        content.seo_title, content.meta_description, content.h1,
        buildSlug(content.title, product.sku), content.image_alt, content.keywords, MODEL,
      ],
    );

    await client.query(
      "update public.products set content_status = $2, updated_at = now() where id = $1",
      [productId, status],
    );

    await recordEvent(client, {
      event_type: "product.content_generated",
      actor_admin_user_id: adminUserId,
      entity_type: "product",
      entity_id: productId,
      source: "system",
      payload: { version, status, checks_passed: checks.passed, model: MODEL },
    });

    await client.query("commit");

    return {
      product_id: productId,
      version,
      status,
      checks,
      content,
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

/** Approves content, which is what lets a product be published. */
export const approveContent = async (pool, { productId, version, adminUserId }) => {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const result = await client.query(
      `
        update public.product_content
        set status = 'approved', updated_at = now()
        where product_id = $1 and version = $2
        returning id, quality_checks
      `,
      [productId, version],
    );

    if (result.rowCount === 0) {
      throw Object.assign(new Error("No such content version"), { statusCode: 404 });
    }

    await client.query(
      "update public.products set content_status = 'approved', updated_at = now() where id = $1",
      [productId],
    );

    await client.query(
      `
        insert into public.admin_audit_log (action_type, entity_type, entity_id, new_values, actor_admin_user_id)
        values ('content.approve', 'product', $1, $2::jsonb, $3)
      `,
      [productId, JSON.stringify({ version }), adminUserId || null],
    );

    await client.query("commit");
    return { product_id: productId, version, status: "approved" };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

/** A product's content history, so a version can be compared or restored. */
export const getContentHistory = async (pool, productId) => {
  const result = await pool.query(
    `
      select
        c.version, c.is_current, c.status, c.generator, c.model, c.reason,
        c.title, c.short_description, c.long_description, c.key_benefits,
        c.quality_checks, c.source_facts, c.created_at,
        s.seo_title, s.meta_description, s.slug, s.keywords
      from public.product_content c
      left join public.product_seo s on s.content_id = c.id
      where c.product_id = $1
      order by c.version desc
    `,
    [productId],
  );
  return result.rows;
};
