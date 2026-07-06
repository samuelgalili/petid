import http from "node:http";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
const adminApiKey = process.env.ADMIN_API_KEY;

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

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const sendJson = (response, statusCode, body) => {
  response.writeHead(statusCode, jsonHeaders);
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

  if (request.headers["x-admin-api-key"] !== adminApiKey) {
    sendError(response, 401, "Unauthorized");
    return false;
  }

  return true;
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
        benefits, feeding_guide, product_attributes, life_stage, dog_size, special_diet
      )
      values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25
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
    ],
  );

  return mapBusinessProduct(result.rows[0]);
};

const updateProduct = async (id, body) => {
  const payload = normalizeProductPayload({ ...body, price: body.price ?? 1 });
  const result = await pool.query(
    `
      update public.business_products
      set
        name = $2,
        description = $3,
        price = $4,
        original_price = $5,
        sale_price = $6,
        image_url = $7,
        images = $8,
        category = $9,
        in_stock = $10,
        is_featured = $11,
        sku = $12,
        pet_type = $13,
        flavors = $14,
        brand = $15,
        weight_unit = $16,
        price_per_weight = $17,
        source_url = $18,
        ingredients = $19,
        benefits = $20,
        feeding_guide = $21,
        product_attributes = $22,
        life_stage = $23,
        dog_size = $24,
        special_diet = $25,
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      id,
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
    ],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapBusinessProduct(result.rows[0]);
};

const deleteProduct = async (id) => {
  const result = await pool.query("delete from public.business_products where id = $1", [id]);
  return result.rowCount > 0;
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

    if (request.method === "GET" && url.pathname === "/api/products") {
      sendJson(response, 200, { products: await listProducts() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/products") {
      if (!requireAdmin(request, response)) return;
      sendJson(response, 201, { product: await createProduct(await readBody(request)) });
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
      const deleted = await deleteProduct(productMatch[1]);
      sendJson(response, deleted ? 200 : 404, { deleted });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/reports") {
      sendJson(response, 201, { report: await createReport(await readBody(request)) });
      return;
    }

    sendError(response, 404, "Not found");
  } catch (error) {
    console.error(error);
    sendError(response, 500, "Internal server error", error.message);
  }
};

const server = http.createServer(handleRequest);

server.listen(port, () => {
  console.log(`mipo-api listening on ${port}`);
});
