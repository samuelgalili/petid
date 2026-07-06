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

export interface MipoAdmin {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at?: string | null;
  last_login_at?: string | null;
}

export interface MipoCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed" | "free_shipping" | string;
  discount_value: number;
  min_order_amount: number | null;
  max_uses?: number | null;
  used_count?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MipoOrderItem {
  id: string;
  order_id?: string;
  product_id?: string | null;
  product_source?: string | null;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
  variant?: string | null;
  size?: string | null;
  created_at?: string | null;
}

export interface MipoOrder {
  id: string;
  order_number: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  payment_status: string;
  payment_method: string;
  payment_installments?: number;
  subtotal: number;
  shipping: number;
  tax: number;
  discount_amount: number;
  cash_on_delivery_fee: number;
  total: number;
  coupon_id?: string | null;
  shipping_address: Record<string, unknown>;
  order_type: string;
  pet_name?: string | null;
  special_instructions?: string | null;
  medical_urgency?: string | null;
  shipping_status?: string | null;
  tracking_number?: string | null;
  order_date: string;
  created_at?: string | null;
  updated_at?: string | null;
  items: MipoOrderItem[];
  order_items: MipoOrderItem[];
}

export interface CreateMipoOrderInput {
  items: Array<{
    id?: string;
    product_id?: string | null;
    product_source?: string | null;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    variant?: string | null;
    size?: string | null;
  }>;
  shipping_address: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
  };
  payment_method: string;
  installments?: number;
  coupon_code?: string;
  order_type?: string;
  want_recurring_order?: boolean;
}

export interface MipoPaymentSession {
  success: boolean;
  order_id: string;
  order_number: string;
  payment_method?: string;
  payment_url?: string;
  redirect_url?: string;
  low_profile_code?: string | null;
  dev_mode?: boolean;
  already_paid?: boolean;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
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

async function adminApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
    if (response.status === 401) {
      throw new Error("נדרשת התחברות מנהל");
    }
    throw new Error(body?.error || `API request failed with ${response.status}`);
  }

  return body as T;
}

export async function getCurrentAdmin(): Promise<MipoAdmin | null> {
  const response = await fetch(`${API_BASE_URL}/admin/me`, {
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
  });

  if (response.status === 401) return null;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `API request failed with ${response.status}`);
  }

  return (body?.admin || null) as MipoAdmin | null;
}

export async function loginAdmin(email: string, password: string): Promise<MipoAdmin> {
  const result = await apiFetch<{ admin: MipoAdmin }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return result.admin;
}

export async function logoutAdmin() {
  return apiFetch<{ ok: boolean }>("/admin/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function validateCouponCode(code: string, subtotal: number): Promise<MipoCoupon> {
  const result = await apiFetch<{ coupon: MipoCoupon }>("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, subtotal }),
  });
  return result.coupon;
}

export async function getAdminCoupons(): Promise<MipoCoupon[]> {
  const result = await adminApiFetch<{ coupons: MipoCoupon[] }>("/admin/coupons");
  return result.coupons;
}

export async function createAdminCoupon(coupon: Partial<MipoCoupon>): Promise<MipoCoupon> {
  const result = await adminApiFetch<{ coupon: MipoCoupon }>("/admin/coupons", {
    method: "POST",
    body: JSON.stringify(coupon),
  });
  return result.coupon;
}

export async function updateAdminCoupon(couponId: string, updates: Partial<MipoCoupon>): Promise<MipoCoupon> {
  const result = await adminApiFetch<{ coupon: MipoCoupon }>(`/admin/coupons/${couponId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return result.coupon;
}

export async function deleteAdminCoupon(couponId: string) {
  return adminApiFetch<{ deleted: boolean }>(`/admin/coupons/${couponId}`, {
    method: "DELETE",
  });
}

export async function createShopOrder(input: CreateMipoOrderInput): Promise<MipoOrder> {
  const result = await apiFetch<{ order: MipoOrder }>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.order;
}

export async function createShopPaymentSession(input: {
  order_id: string;
  success_url: string;
  cancel_url: string;
}): Promise<MipoPaymentSession> {
  return apiFetch<MipoPaymentSession>("/payments/shop", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getShopOrder(orderIdOrNumber: string): Promise<MipoOrder> {
  const result = await apiFetch<{ order: MipoOrder }>(`/orders/${encodeURIComponent(orderIdOrNumber)}`);
  return result.order;
}

export async function getShopOrders(input: { ids?: string[]; email?: string } = {}): Promise<MipoOrder[]> {
  const params = new URLSearchParams();
  if (input.ids?.length) params.set("ids", input.ids.join(","));
  if (input.email) params.set("email", input.email);
  const query = params.toString();
  const result = await apiFetch<{ orders: MipoOrder[] }>(`/orders${query ? `?${query}` : ""}`);
  return result.orders;
}

export async function getAdminOrders(): Promise<MipoOrder[]> {
  const result = await adminApiFetch<{ orders: MipoOrder[] }>("/admin/orders");
  return result.orders;
}

export async function updateAdminOrder(
  orderId: string,
  updates: Partial<Pick<MipoOrder, "status" | "payment_status" | "shipping_status" | "tracking_number" | "special_instructions">>,
): Promise<MipoOrder> {
  const result = await adminApiFetch<{ order: MipoOrder }>(`/admin/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return result.order;
}

export async function bulkUpdateAdminOrders(ids: string[], updates: Partial<Pick<MipoOrder, "status">>) {
  return adminApiFetch<{ updated: number }>("/admin/orders/bulk", {
    method: "PATCH",
    body: JSON.stringify({ ids, updates }),
  });
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
