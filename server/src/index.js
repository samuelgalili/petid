import http from "node:http";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import {
  analyzeProductIngredients,
  enrichProductAi,
  importProductsFromUrl,
  productDuplicateCheck,
  scrapeProduct,
  searchProductImage,
  smartScrapeProduct,
} from "./productIntel.js";

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
const adminApiKey = process.env.ADMIN_API_KEY;
const uploadDir = process.env.UPLOAD_DIR || "/app/uploads";
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
const adminCookieName = "mipo_admin_session";
const adminSessionMs = Number(process.env.ADMIN_SESSION_HOURS || 8) * 60 * 60 * 1000;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_MAX || 8),
});

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const readBody = async (request, maxBytes = 1024 * 1024) => {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      const error = new Error("Request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const sendJson = (response, statusCode, body, headers = {}) => {
  response.writeHead(statusCode, { ...jsonHeaders, ...headers });
  response.end(JSON.stringify(body));
};

const sendError = (response, statusCode, message, details) => {
  sendJson(response, statusCode, { error: message, details });
};

const requireAdmin = (request, response) => {
  if (!adminApiKey) {
    sendError(response, 503, "Admin API key is not configured");
    return false;
  }

  if (request.headers["x-admin-api-key"] === adminApiKey) {
    return true;
  }

  const sessionToken = parseCookies(request.headers.cookie || "")[adminCookieName];
  if (sessionToken && verifyAdminToken(sessionToken)) {
    return true;
  }

  if (request.headers["x-admin-api-key"] !== adminApiKey) {
    sendError(response, 401, "Unauthorized");
    return false;
  }

  return true;
};

const parseCookies = (cookieHeader) => Object.fromEntries(
  cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return [part, ""];
      return [
        decodeURIComponent(part.slice(0, separatorIndex)),
        decodeURIComponent(part.slice(separatorIndex + 1)),
      ];
    }),
);

const signAdminPayload = (payload) => (
  createHmac("sha256", adminApiKey).update(payload).digest("base64url")
);

const createAdminToken = () => {
  const payload = Buffer.from(JSON.stringify({
    exp: Date.now() + adminSessionMs,
    nonce: randomUUID(),
  })).toString("base64url");
  return `${payload}.${signAdminPayload(payload)}`;
};

const verifyAdminToken = (token) => {
  if (!adminApiKey || typeof token !== "string") return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = signAdminPayload(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(decoded.exp) > Date.now();
  } catch {
    return false;
  }
};

const buildAdminCookie = (request, token) => {
  const isHttps = request.headers["x-forwarded-proto"] === "https";
  return [
    `${adminCookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.floor(adminSessionMs / 1000)}`,
    isHttps ? "Secure" : "",
  ].filter(Boolean).join("; ");
};

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePetType = (value) => {
  if (value === "both") return "all";
  if (["dog", "cat", "other", "all"].includes(value)) return value;
  return null;
};

const numberFields = new Set([
  "price",
  "original_price",
  "sale_price",
  "price_per_weight",
  "suggested_price",
  "safety_score",
  "cost_price",
  "restock_interval_days",
  "kcal_per_kg",
]);

const arrayFields = new Set([
  "images",
  "flavors",
  "special_diet",
  "breed_tags",
  "medical_tags",
]);

const jsonFields = new Set([
  "benefits",
  "feeding_guide",
  "product_attributes",
]);

const booleanFields = new Set([
  "in_stock",
  "is_featured",
  "needs_image_review",
  "needs_price_review",
  "is_flagged",
  "auto_restock",
  "api_sync_enabled",
]);

const businessProductFields = {
  name: "name",
  description: "description",
  price: "price",
  original_price: "original_price",
  sale_price: "sale_price",
  image_url: "image_url",
  images: "images",
  category: "category",
  in_stock: "in_stock",
  is_featured: "is_featured",
  sku: "sku",
  pet_type: "pet_type",
  flavors: "flavors",
  brand: "brand",
  weight_unit: "weight_unit",
  price_per_weight: "price_per_weight",
  source_url: "source_url",
  ingredients: "ingredients",
  benefits: "benefits",
  feeding_guide: "feeding_guide",
  product_attributes: "product_attributes",
  life_stage: "life_stage",
  dog_size: "dog_size",
  special_diet: "special_diet",
  needs_image_review: "needs_image_review",
  needs_price_review: "needs_price_review",
  suggested_price: "suggested_price",
  price_suggestion_reason: "price_suggestion_reason",
  is_flagged: "is_flagged",
  flagged_reason: "flagged_reason",
  flagged_at: "flagged_at",
  safety_score: "safety_score",
  cost_price: "cost_price",
  supplier_id: "supplier_id",
  auto_restock: "auto_restock",
  restock_interval_days: "restock_interval_days",
  api_sync_enabled: "api_sync_enabled",
  breed_tags: "breed_tags",
  medical_tags: "medical_tags",
  kcal_per_kg: "kcal_per_kg",
};

const scrapedProductFields = {
  name: "product_name",
  description: "long_description",
  price: "final_price",
  original_price: "regular_price",
  sale_price: "sale_price",
  image_url: "main_image_url",
  category: "sub_category",
  in_stock: "stock_status",
  sku: "sku",
  pet_type: "pet_type",
  flavors: "flavors",
  brand: "brand",
  source_url: "product_url",
  ingredients: "ingredients",
  is_flagged: "is_flagged",
  flagged_reason: "flagged_reason",
  flagged_at: "flagged_at",
};

const normalizeFieldValue = (field, value, target = "business") => {
  if (value === undefined) return undefined;

  if (field === "name") {
    const name = typeof value === "string" ? value.trim() : "";
    if (!name) throw new Error("Product name is required");
    return name;
  }

  if (field === "price") {
    const price = toNumber(value);
    if (!price || price <= 0) throw new Error("A valid product price is required");
    return price;
  }

  if (numberFields.has(field)) {
    return toNumber(value);
  }

  if (field === "pet_type") {
    return normalizePetType(value);
  }

  if (field === "in_stock" && target === "scraped") {
    return value ? "in_stock" : "out_of_stock";
  }

  if (booleanFields.has(field)) {
    return value === null ? null : Boolean(value);
  }

  if (arrayFields.has(field)) {
    if (value === null) return null;
    return Array.isArray(value) ? value : [];
  }

  if (jsonFields.has(field)) {
    if (value === null) return null;
    if (field === "product_attributes") {
      return JSON.stringify(value && typeof value === "object" && !Array.isArray(value) ? value : {});
    }
    return JSON.stringify(Array.isArray(value) ? value : []);
  }

  return value ?? null;
};

const normalizeProductPayload = (body) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = toNumber(body.price);

  if (!name) throw new Error("Product name is required");
  if (!price || price <= 0) throw new Error("A valid product price is required");

  return {
    name,
    description: body.description ?? null,
    price,
    original_price: toNumber(body.original_price),
    sale_price: toNumber(body.sale_price),
    image_url: body.image_url || "/placeholder.svg",
    images: Array.isArray(body.images) ? body.images : [],
    category: body.category ?? null,
    in_stock: body.in_stock ?? true,
    is_featured: body.is_featured ?? false,
    sku: body.sku ?? null,
    pet_type: normalizePetType(body.pet_type),
    flavors: Array.isArray(body.flavors) ? body.flavors : [],
    brand: body.brand ?? null,
    weight_unit: body.weight_unit ?? null,
    price_per_weight: toNumber(body.price_per_weight),
    source_url: body.source_url ?? null,
    ingredients: body.ingredients ?? null,
    benefits: Array.isArray(body.benefits) ? body.benefits : [],
    feeding_guide: Array.isArray(body.feeding_guide) ? body.feeding_guide : [],
    product_attributes: body.product_attributes && typeof body.product_attributes === "object" ? body.product_attributes : {},
    life_stage: body.life_stage ?? null,
    dog_size: body.dog_size ?? null,
    special_diet: Array.isArray(body.special_diet) ? body.special_diet : [],
    breed_tags: Array.isArray(body.breed_tags) ? body.breed_tags : [],
    medical_tags: Array.isArray(body.medical_tags) ? body.medical_tags : [],
    auto_restock: body.auto_restock ?? false,
    restock_interval_days: toNumber(body.restock_interval_days),
    api_sync_enabled: body.api_sync_enabled ?? false,
    cost_price: toNumber(body.cost_price),
    supplier_id: body.supplier_id ?? null,
    safety_score: toNumber(body.safety_score),
    kcal_per_kg: toNumber(body.kcal_per_kg),
  };
};

const buildUpdateStatement = ({ table, fields, id, body, target }) => {
  const values = [id];
  const assignments = [];

  for (const [apiField, column] of Object.entries(fields)) {
    if (!Object.prototype.hasOwnProperty.call(body, apiField)) continue;

    const value = normalizeFieldValue(apiField, body[apiField], target);
    if (value === undefined) continue;

    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return null;

  return {
    sql: `
      update public.${table}
      set ${assignments.join(", ")}, updated_at = now()
      where id = $1
      returning *
    `,
    values,
  };
};

const buildBulkUpdateStatement = ({ table, fields, ids, body, target }) => {
  const values = [ids];
  const assignments = [];

  for (const [apiField, column] of Object.entries(fields)) {
    if (!Object.prototype.hasOwnProperty.call(body, apiField)) continue;

    const value = normalizeFieldValue(apiField, body[apiField], target);
    if (value === undefined) continue;

    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return null;

  return {
    sql: `
      update public.${table}
      set ${assignments.join(", ")}, updated_at = now()
      where id = any($1::uuid[])
      returning id
    `,
    values,
  };
};

const mapBusinessProduct = (row) => ({
  ...row,
  source: "manual",
});

const mapScrapedProduct = (row) => ({
  id: row.id,
  name: row.product_name || "",
  description: row.long_description || row.short_description || "",
  price: row.final_price || row.regular_price || 0,
  original_price: row.regular_price !== row.final_price ? row.regular_price : null,
  sale_price: row.sale_price,
  image_url: row.main_image_url || "/placeholder.svg",
  images: row.main_image_url ? [row.main_image_url] : [],
  category: row.sub_category || row.main_category,
  in_stock: row.stock_status === "in_stock" || row.stock_status === null,
  is_featured: false,
  business_id: null,
  created_at: row.created_at || row.scraped_at,
  updated_at: row.updated_at || row.scraped_at,
  is_flagged: row.is_flagged || false,
  flagged_reason: row.flagged_reason,
  sku: row.sku,
  pet_type: normalizePetType(row.pet_type),
  flavors: row.flavors || [],
  brand: row.brand,
  ingredients: row.ingredients,
  source_url: row.product_url,
  source: "scraped",
});

const listProducts = async () => {
  const [businessProducts, scrapedProducts] = await Promise.all([
    pool.query("select * from public.business_products order by created_at desc"),
    pool.query("select * from public.scraped_products order by scraped_at desc nulls last, created_at desc"),
  ]);

  return [
    ...businessProducts.rows.map(mapBusinessProduct),
    ...scrapedProducts.rows.map(mapScrapedProduct),
  ];
};

const createProduct = async (body) => {
  const payload = normalizeProductPayload(body);
  const businessId = body.business_id || process.env.DEFAULT_BUSINESS_ID;

  if (!businessId) {
    throw new Error("DEFAULT_BUSINESS_ID is required");
  }

  const result = await pool.query(
    `
      insert into public.business_products (
        business_id, name, description, price, original_price, sale_price,
        image_url, images, category, in_stock, is_featured, sku, pet_type,
        flavors, brand, weight_unit, price_per_weight, source_url, ingredients,
        benefits, feeding_guide, product_attributes, life_stage, dog_size, special_diet,
        breed_tags, medical_tags, auto_restock, restock_interval_days, api_sync_enabled,
        cost_price, supplier_id, safety_score, kcal_per_kg
      )
      values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31, $32, $33, $34
      )
      returning *
    `,
    [
      businessId,
      payload.name,
      payload.description,
      payload.price,
      payload.original_price,
      payload.sale_price,
      payload.image_url,
      payload.images,
      payload.category,
      payload.in_stock,
      payload.is_featured,
      payload.sku,
      payload.pet_type,
      payload.flavors,
      payload.brand,
      payload.weight_unit,
      payload.price_per_weight,
      payload.source_url,
      payload.ingredients,
      JSON.stringify(payload.benefits),
      JSON.stringify(payload.feeding_guide),
      JSON.stringify(payload.product_attributes),
      payload.life_stage,
      payload.dog_size,
      payload.special_diet,
      payload.breed_tags,
      payload.medical_tags,
      payload.auto_restock,
      payload.restock_interval_days,
      payload.api_sync_enabled,
      payload.cost_price,
      payload.supplier_id,
      payload.safety_score,
      payload.kcal_per_kg,
    ],
  );

  return mapBusinessProduct(result.rows[0]);
};

const fetchProductById = async (id, source) => {
  if (source === "scraped") {
    const result = await pool.query("select * from public.scraped_products where id = $1", [id]);
    return result.rows[0] ? mapScrapedProduct(result.rows[0]) : null;
  }

  const result = await pool.query("select * from public.business_products where id = $1", [id]);
  return result.rows[0] ? mapBusinessProduct(result.rows[0]) : null;
};

const updateBusinessProduct = async (id, body) => {
  const statement = buildUpdateStatement({
    table: "business_products",
    fields: businessProductFields,
    id,
    body,
    target: "business",
  });

  if (!statement) return fetchProductById(id, "manual");

  const result = await pool.query(statement.sql, statement.values);
  return result.rows[0] ? mapBusinessProduct(result.rows[0]) : null;
};

const updateScrapedProduct = async (id, body) => {
  const statement = buildUpdateStatement({
    table: "scraped_products",
    fields: scrapedProductFields,
    id,
    body,
    target: "scraped",
  });

  if (!statement) return fetchProductById(id, "scraped");

  const result = await pool.query(statement.sql, statement.values);
  return result.rows[0] ? mapScrapedProduct(result.rows[0]) : null;
};

const updateProduct = async (id, body) => {
  if (body.source === "scraped") return updateScrapedProduct(id, body);
  if (body.source === "manual") return updateBusinessProduct(id, body);

  const businessProduct = await updateBusinessProduct(id, body);
  if (businessProduct) return businessProduct;

  return updateScrapedProduct(id, body);
};

const bulkUpdateProducts = async (ids, updates) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Product ids are required");
  }

  const businessStatement = buildBulkUpdateStatement({
    table: "business_products",
    fields: businessProductFields,
    ids,
    body: updates,
    target: "business",
  });
  const scrapedStatement = buildBulkUpdateStatement({
    table: "scraped_products",
    fields: scrapedProductFields,
    ids,
    body: updates,
    target: "scraped",
  });

  const [businessResult, scrapedResult] = await Promise.all([
    businessStatement ? pool.query(businessStatement.sql, businessStatement.values) : Promise.resolve({ rowCount: 0 }),
    scrapedStatement ? pool.query(scrapedStatement.sql, scrapedStatement.values) : Promise.resolve({ rowCount: 0 }),
  ]);

  return {
    updated: businessResult.rowCount + scrapedResult.rowCount,
    manual: businessResult.rowCount,
    scraped: scrapedResult.rowCount,
  };
};

const deleteProduct = async (id, source) => {
  if (source === "manual") {
    const result = await pool.query("delete from public.business_products where id = $1", [id]);
    return result.rowCount > 0;
  }

  if (source === "scraped") {
    const result = await pool.query("delete from public.scraped_products where id = $1", [id]);
    return result.rowCount > 0;
  }

  const [businessResult, scrapedResult] = await Promise.all([
    pool.query("delete from public.business_products where id = $1", [id]),
    pool.query("delete from public.scraped_products where id = $1", [id]),
  ]);
  return businessResult.rowCount + scrapedResult.rowCount > 0;
};

const bulkDeleteProducts = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Product ids are required");
  }

  const [businessResult, scrapedResult] = await Promise.all([
    pool.query("delete from public.business_products where id = any($1::uuid[])", [ids]),
    pool.query("delete from public.scraped_products where id = any($1::uuid[])", [ids]),
  ]);

  return {
    deleted: businessResult.rowCount + scrapedResult.rowCount,
    manual: businessResult.rowCount,
    scraped: scrapedResult.rowCount,
  };
};

const createReport = async (body) => {
  const id = randomUUID();
  await pool.query(
    `
      insert into public.content_reports (
        id, content_type, content_id, reason, description, reporter_id
      )
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      id,
      body.content_type || "product",
      body.content_id || null,
      body.reason || "other",
      body.description || null,
      body.reporter_id || null,
    ],
  );
  return { id };
};

const runProductIntelFunction = async (functionName, body) => {
  if (functionName === "import-products-from-url" || functionName === "scrape-products") {
    return importProductsFromUrl(body);
  }
  if (functionName === "scrape-product") {
    return scrapeProduct(body);
  }
  if (functionName === "smart-scrape-product") {
    return smartScrapeProduct(body);
  }
  if (functionName === "enrich-product-ai") {
    return enrichProductAi(body);
  }
  if (functionName === "search-product-image") {
    return searchProductImage(body);
  }
  if (functionName === "analyze-product-ingredients") {
    return analyzeProductIngredients(body);
  }
  if (functionName === "product-duplicate-check") {
    return productDuplicateCheck(pool, body);
  }

  const error = new Error("Product intelligence function not found");
  error.statusCode = 404;
  throw error;
};

const fileExtensionForContentType = (contentType) => {
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/gif") return ".gif";
  return "";
};

const uploadImage = async (body) => {
  const dataUrl = typeof body.data_url === "string" ? body.data_url : "";
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    const error = new Error("A base64 data URL is required");
    error.statusCode = 400;
    throw error;
  }

  const contentType = match[1];
  if (!contentType.startsWith("image/")) {
    const error = new Error("Only image uploads are supported");
    error.statusCode = 415;
    throw error;
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > maxUploadBytes) {
    const error = new Error("Image is too large");
    error.statusCode = 413;
    throw error;
  }

  const originalExtension = path.extname(String(body.file_name || "")).toLowerCase();
  const extension = originalExtension || fileExtensionForContentType(contentType) || ".img";
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);

  return {
    url: `/uploads/${fileName}`,
    file_name: fileName,
    content_type: contentType,
    size: buffer.length,
  };
};

const handleRequest = async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, service: "mipo-api" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/db/health") {
      const result = await pool.query("select current_database() as database, current_user as user");
      sendJson(response, 200, { ok: true, ...result.rows[0] });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/session") {
      if (!adminApiKey) {
        sendError(response, 503, "Admin API key is not configured");
        return;
      }

      const body = await readBody(request);
      if (body.key !== adminApiKey) {
        sendError(response, 401, "Unauthorized");
        return;
      }

      sendJson(response, 200, { ok: true }, { "set-cookie": buildAdminCookie(request, createAdminToken()) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/products") {
      sendJson(response, 200, { products: await listProducts() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/products") {
      if (!requireAdmin(request, response)) return;
      sendJson(response, 201, { product: await createProduct(await readBody(request)) });
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/products/bulk") {
      if (!requireAdmin(request, response)) return;
      const body = await readBody(request);
      sendJson(response, 200, await bulkUpdateProducts(body.ids, body.updates || {}));
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/products/bulk") {
      if (!requireAdmin(request, response)) return;
      const body = await readBody(request);
      sendJson(response, 200, await bulkDeleteProducts(body.ids));
      return;
    }

    const productMatch = url.pathname.match(/^\/api\/products\/([0-9a-fA-F-]{36})$/);
    if (productMatch && request.method === "PATCH") {
      if (!requireAdmin(request, response)) return;
      const product = await updateProduct(productMatch[1], await readBody(request));
      if (!product) {
        sendError(response, 404, "Product not found");
        return;
      }
      sendJson(response, 200, { product });
      return;
    }

    if (productMatch && request.method === "DELETE") {
      if (!requireAdmin(request, response)) return;
      const deleted = await deleteProduct(productMatch[1], url.searchParams.get("source"));
      sendJson(response, deleted ? 200 : 404, { deleted });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/uploads") {
      if (!requireAdmin(request, response)) return;
      sendJson(response, 201, { upload: await uploadImage(await readBody(request, maxUploadBytes + 1024 * 1024)) });
      return;
    }

    const productIntelMatch = url.pathname.match(/^\/api\/product-intel\/([a-z0-9-]+)$/);
    if (productIntelMatch && request.method === "POST") {
      if (!requireAdmin(request, response)) return;
      sendJson(response, 200, await runProductIntelFunction(productIntelMatch[1], await readBody(request, 2 * 1024 * 1024)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/reports") {
      sendJson(response, 201, { report: await createReport(await readBody(request)) });
      return;
    }

    sendError(response, 404, "Not found");
  } catch (error) {
    console.error(error);
    sendError(response, error.statusCode || 500, error.statusCode ? error.message : "Internal server error", error.statusCode ? undefined : error.message);
  }
};

const server = http.createServer(handleRequest);

server.listen(port, () => {
  console.log(`mipo-api listening on ${port}`);
});
