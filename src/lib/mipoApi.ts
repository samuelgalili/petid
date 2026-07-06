export interface MipoProduct {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  original_price: number | string | null;
  sale_price?: number | string | null;
  image_url: string;
  images?: string[] | null;
  category: string | null;
  pet_type?: string | null;
  in_stock: boolean | null;
  is_featured?: boolean | null;
  business_id?: string | null;
  sku?: string | null;
  flavors?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  needs_image_review?: boolean | null;
  needs_price_review?: boolean | null;
  is_flagged?: boolean | null;
  flagged_reason?: string | null;
  flagged_at?: string | null;
  brand?: string | null;
  ingredients?: string | null;
  benefits?: unknown[] | null;
  feeding_guide?: unknown[] | null;
  product_attributes?: Record<string, unknown> | null;
  weight_unit?: string | null;
  price_per_weight?: number | string | null;
  source_url?: string | null;
  life_stage?: string | null;
  dog_size?: string | null;
  special_diet?: string[] | null;
  medical_tags?: string[] | null;
  breed_tags?: string[] | null;
  auto_restock?: boolean | null;
  restock_interval_days?: number | null;
  api_sync_enabled?: boolean | null;
  cost_price?: number | string | null;
  supplier_id?: string | null;
  kcal_per_kg?: number | string | null;
  safety_score?: number | null;
  source?: "manual" | "scraped";
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
let promptedAdminKey: string | null = null;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function getStoredAdminKey() {
  if (typeof window === "undefined") return promptedAdminKey;
  return promptedAdminKey || window.localStorage.getItem("mipo_admin_api_key");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || `API request failed with ${response.status}`);
  }

  return body as T;
}

async function createAdminSession(key: string) {
  return apiFetch<{ ok: boolean }>("/admin/session", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}

async function requestAdminKey() {
  const existingKey = getStoredAdminKey();
  if (existingKey) return existingKey;
  if (typeof window === "undefined") throw new Error("נדרש מפתח מנהל");

  const key = window.prompt("הזן מפתח מנהל ל-Mipo");
  if (!key) throw new Error("נדרש מפתח מנהל");

  promptedAdminKey = key;
  await createAdminSession(key);
  return key;
}

async function adminApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const adminKey = getStoredAdminKey();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(adminKey ? { "x-admin-api-key": adminKey } : {}),
      ...(init?.headers || {}),
    },
  });

  if (response.status === 401 && !adminKey) {
    const promptedKey = await requestAdminKey();
    return adminApiFetch<T>(path, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        "x-admin-api-key": promptedKey,
      },
    });
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || `API request failed with ${response.status}`);
  }

  return body as T;
}

export async function getShopProducts(): Promise<MipoProduct[]> {
  const result = await apiFetch<{ products: MipoProduct[] }>("/products");
  return result.products;
}

export async function getAdminProducts(): Promise<MipoProduct[]> {
  return getShopProducts();
}

export async function createAdminProduct(product: Partial<MipoProduct>): Promise<MipoProduct> {
  const result = await adminApiFetch<{ product: MipoProduct }>("/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
  return result.product;
}

export async function updateAdminProduct(
  productId: string,
  updates: Partial<MipoProduct> & { source?: "manual" | "scraped" },
): Promise<MipoProduct> {
  const result = await adminApiFetch<{ product: MipoProduct }>(`/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return result.product;
}

export async function deleteAdminProduct(productId: string, source?: "manual" | "scraped") {
  const query = source ? `?source=${encodeURIComponent(source)}` : "";
  return adminApiFetch<{ deleted: boolean }>(`/products/${productId}${query}`, {
    method: "DELETE",
  });
}

export async function bulkUpdateAdminProducts(ids: string[], updates: Partial<MipoProduct>) {
  return adminApiFetch<{ updated: number; manual: number; scraped: number }>("/products/bulk", {
    method: "PATCH",
    body: JSON.stringify({ ids, updates }),
  });
}

export async function bulkDeleteAdminProducts(ids: string[]) {
  return adminApiFetch<{ deleted: number; manual: number; scraped: number }>("/products/bulk", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

export async function uploadAdminProductImage(file: File) {
  const dataUrl = await fileToDataUrl(file);
  const result = await adminApiFetch<{
    upload: { url: string; file_name: string; content_type: string; size: number };
  }>("/uploads", {
    method: "POST",
    body: JSON.stringify({
      file_name: file.name,
      data_url: dataUrl,
    }),
  });

  return result.upload;
}

export async function invokeProductIntelFunction<T = unknown>(
  functionName: string,
  options: { body?: Record<string, unknown> } = {},
): Promise<{ data: T; error: null }> {
  const data = await adminApiFetch<T>(`/product-intel/${functionName}`, {
    method: "POST",
    body: JSON.stringify(options.body || {}),
  });

  return { data, error: null };
}

export async function createContentReport(input: {
  content_type: string;
  content_id: string;
  reason: string;
  description?: string;
  reporter_id?: string | null;
}) {
  return apiFetch<{ report: { id: string } }>("/reports", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
