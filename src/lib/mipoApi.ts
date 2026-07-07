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

export interface MipoBreedInfo {
  id: string;
  breed_name: string;
  breed_name_he: string | null;
  pet_type: string;
  life_expectancy_years: string | null;
  description_he: string | null;
  affection_family: number | null;
  kids_friendly: number | null;
  dog_friendly: number | null;
  shedding_level: number | null;
  grooming_freq: number | null;
  drooling_level: number | null;
  stranger_openness: number | null;
  playfulness: number | null;
  watchdog_nature: number | null;
  trainability: number | null;
  energy_level: number | null;
  barking_level: number | null;
  mental_needs: number | null;
  size_category: string | null;
  weight_range_kg: string | null;
  image_url: string | null;
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

export interface MipoUser {
  id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  birthdate?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_login_at?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface MipoProfile {
  id: string;
  email: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  avatar_url?: string | null;
  birthdate?: string | null;
  street?: string | null;
  city?: string | null;
  id_number_last4?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MipoPet {
  id: string;
  user_id?: string;
  name: string;
  type: "dog" | "cat" | "other" | string;
  pet_type?: "dog" | "cat" | "other" | string;
  breed?: string | null;
  secondary_breed?: string | null;
  is_mixed?: boolean | null;
  breed_confidence?: number | null;
  avatar_url?: string | null;
  weight?: number | null;
  birth_date?: string | null;
  age_years?: number | null;
  age_months?: number | null;
  gender?: string | null;
  color?: string | null;
  is_neutered?: boolean | null;
  medical_conditions?: string[] | null;
  health_notes?: string | null;
  personality_tags?: string[] | null;
  favorite_activities?: string[] | null;
  activities?: string[] | null;
  theme_color?: string | null;
  has_insurance?: boolean | null;
  insurance_company?: string | null;
  insurance_expiry_date?: string | null;
  current_food?: string | null;
  last_vet_visit?: string | null;
  next_vet_visit?: string | null;
  vet_clinic?: string | null;
  vet_clinic_name?: string | null;
  vet_clinic_phone?: string | null;
  vet_clinic_address?: string | null;
  microchip_number?: string | null;
  is_dangerous_breed?: boolean | null;
  license_conditions?: string | null;
  license_expiry_date?: string | null;
  archived?: boolean | null;
  archived_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MipoAuthResult {
  user: MipoUser;
  profile: MipoProfile | null;
}

export interface MipoNotification {
  id: string;
  user_id?: string;
  type: string;
  category?: string | null;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  action_url?: string | null;
  is_read: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface MipoDocument {
  id: string;
  user_id?: string;
  pet_id: string;
  document_type: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  content_type?: string | null;
  uploaded_at: string;
  updated_at?: string | null;
}

export interface MipoVetVisit {
  id: string;
  pet_id: string;
  visit_type?: string | null;
  visit_date?: string | null;
  next_visit_date?: string | null;
  clinic_name?: string | null;
  vet_name?: string | null;
  reason?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;
  vaccines?: string[];
  is_recovery_mode?: boolean | null;
  recovery_until?: string | null;
  raw_summary?: string | null;
  cost?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MipoVaccination {
  id: string;
  pet_id: string;
  vaccine_name: string;
  administered_at?: string | null;
  expires_at?: string | null;
  veterinarian?: string | null;
  batch_number?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MipoPetHealthSummary {
  pet: MipoPet;
  profile: MipoProfile | null;
  vet_visits: MipoVetVisit[];
  vaccinations: MipoVaccination[];
  documents: MipoDocument[];
  active_recovery: MipoVetVisit | null;
}

export interface MipoInsuranceClaim {
  id: string;
  user_id?: string;
  pet_id: string | null;
  pet_name: string | null;
  pet_microchip: string | null;
  owner_name: string | null;
  owner_id_number: string | null;
  clinic_name: string | null;
  visit_date: string | null;
  diagnosis: string | null;
  treatment: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  status: "pending" | "approved" | "paid" | "denied" | string;
  status_note: string | null;
  submitted_at: string;
  updated_at?: string | null;
}

export interface MipoServiceBooking {
  id: string;
  user_id?: string;
  pet_id: string | null;
  service_type: string;
  service_id: string | null;
  service_name: string;
  provider_name: string | null;
  requested_date: string | null;
  start_date: string | null;
  end_date: string | null;
  total_price: number | null;
  status: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string | null;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const userSessionHintKey = "mipo_user_session_hint";
const adminSessionHintKey = "mipo_admin_session_hint";

const hasStorageHint = (key: string) => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

const setStorageHint = (key: string, value: boolean) => {
  try {
    if (value) localStorage.setItem(key, "true");
    else localStorage.removeItem(key);
  } catch {
    // Session hints are only an optimization for public pages.
  }
};

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
  if (!hasStorageHint(adminSessionHintKey)) return null;

  const response = await fetch(`${API_BASE_URL}/admin/me`, {
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
  });

  if (response.status === 401) {
    setStorageHint(adminSessionHintKey, false);
    return null;
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `API request failed with ${response.status}`);
  }

  return (body?.admin || null) as MipoAdmin | null;
}

export async function getCurrentUser(): Promise<MipoAuthResult | null> {
  if (!hasStorageHint(userSessionHintKey)) return null;

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
  });

  if (response.status === 401) {
    setStorageHint(userSessionHintKey, false);
    return null;
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `API request failed with ${response.status}`);
  }

  return {
    user: body.user as MipoUser,
    profile: (body.profile || null) as MipoProfile | null,
  };
}

export async function loginUser(email: string, password: string): Promise<MipoAuthResult> {
  const auth = await apiFetch<MipoAuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setStorageHint(userSessionHintKey, true);
  return auth;
}

export async function signupUser(input: {
  full_name: string;
  email: string;
  password: string;
  birthdate?: string | null;
  phone?: string | null;
}): Promise<MipoAuthResult> {
  const auth = await apiFetch<MipoAuthResult>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setStorageHint(userSessionHintKey, true);
  return auth;
}

export async function logoutUser() {
  setStorageHint(userSessionHintKey, false);
  return apiFetch<{ ok: boolean }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function updateMyProfile(input: Partial<MipoProfile> & {
  fullName?: string;
  whatsappNumber?: string | null;
}): Promise<MipoAuthResult> {
  return apiFetch<MipoAuthResult>("/me/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getMyPets(input: { archived?: boolean | "all" } = {}): Promise<MipoPet[]> {
  const params = new URLSearchParams();
  if (input.archived !== undefined) params.set("archived", String(input.archived));
  const query = params.toString();
  const result = await apiFetch<{ pets: MipoPet[] }>(`/me/pets${query ? `?${query}` : ""}`);
  return result.pets;
}

export async function getMyPet(petId: string): Promise<MipoPet> {
  const result = await apiFetch<{ pet: MipoPet }>(`/me/pets/${petId}`);
  return result.pet;
}

export async function createMyPet(input: Partial<MipoPet> & {
  pet_type?: string;
  birthDate?: string | null;
}): Promise<MipoPet> {
  const result = await apiFetch<{ pet: MipoPet }>("/me/pets", {
    method: "POST",
    body: JSON.stringify(input),
  });
  window.dispatchEvent(new Event("mipo:pets-changed"));
  return result.pet;
}

export async function updateMyPet(petId: string, input: Partial<MipoPet>): Promise<MipoPet> {
  const result = await apiFetch<{ pet: MipoPet }>(`/me/pets/${petId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  window.dispatchEvent(new Event("mipo:pets-changed"));
  return result.pet;
}

export async function deleteMyPet(petId: string) {
  const result = await apiFetch<{ deleted: boolean }>(`/me/pets/${petId}`, {
    method: "DELETE",
  });
  window.dispatchEvent(new Event("mipo:pets-changed"));
  return result;
}

export async function uploadMyImage(file: File) {
  const dataUrl = await fileToDataUrl(file);
  const result = await apiFetch<{
    upload: { url: string; file_name: string; content_type: string; size: number };
  }>("/me/uploads", {
    method: "POST",
    body: JSON.stringify({
      file_name: file.name,
      data_url: dataUrl,
    }),
  });

  return result.upload;
}

export async function getMyNotifications(input: { unread?: boolean; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (input.unread) params.set("unread", "true");
  if (input.limit) params.set("limit", String(input.limit));
  const query = params.toString();
  return apiFetch<{ notifications: MipoNotification[]; unread_count: number }>(
    `/me/notifications${query ? `?${query}` : ""}`,
  );
}

export async function createMyNotification(input: {
  type?: string;
  category?: string | null;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  action_url?: string | null;
}): Promise<MipoNotification> {
  const result = await apiFetch<{ notification: MipoNotification }>("/me/notifications", {
    method: "POST",
    body: JSON.stringify(input),
  });
  window.dispatchEvent(new Event("mipo:notifications-changed"));
  return result.notification;
}

export async function getMyUnreadNotificationCount(): Promise<number> {
  const result = await apiFetch<{ unread_count: number }>("/me/notifications/unread-count");
  return result.unread_count;
}

export async function markMyNotificationRead(notificationId: string, isRead = true): Promise<MipoNotification> {
  const result = await apiFetch<{ notification: MipoNotification }>(`/me/notifications/${notificationId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_read: isRead }),
  });
  window.dispatchEvent(new Event("mipo:notifications-changed"));
  return result.notification;
}

export async function markAllMyNotificationsRead() {
  const result = await apiFetch<{ updated: number }>("/me/notifications/read-all", {
    method: "PATCH",
    body: JSON.stringify({}),
  });
  window.dispatchEvent(new Event("mipo:notifications-changed"));
  return result;
}

export async function getMyDocuments(input: {
  pet_id?: string | null;
  document_type?: string | null;
  limit?: number;
} = {}): Promise<MipoDocument[]> {
  const params = new URLSearchParams();
  if (input.pet_id) params.set("pet_id", input.pet_id);
  if (input.document_type && input.document_type !== "all") params.set("document_type", input.document_type);
  if (input.limit) params.set("limit", String(input.limit));
  const query = params.toString();
  const result = await apiFetch<{ documents: MipoDocument[] }>(`/me/documents${query ? `?${query}` : ""}`);
  return result.documents;
}

export async function createMyDocument(input: {
  pet_id: string;
  document_type: string;
  title: string;
  description?: string | null;
  file: File;
}): Promise<MipoDocument> {
  const dataUrl = await fileToDataUrl(input.file);
  const result = await apiFetch<{ document: MipoDocument }>("/me/documents", {
    method: "POST",
    body: JSON.stringify({
      pet_id: input.pet_id,
      document_type: input.document_type,
      title: input.title,
      description: input.description || null,
      file_name: input.file.name,
      file_size: input.file.size,
      content_type: input.file.type || null,
      data_url: dataUrl,
    }),
  });
  window.dispatchEvent(new Event("mipo:documents-changed"));
  window.dispatchEvent(new Event("mipo:health-changed"));
  return result.document;
}

export async function deleteMyDocument(documentId: string) {
  const result = await apiFetch<{ deleted: boolean }>(`/me/documents/${documentId}`, {
    method: "DELETE",
  });
  window.dispatchEvent(new Event("mipo:documents-changed"));
  window.dispatchEvent(new Event("mipo:health-changed"));
  return result;
}

export async function getMyInsuranceClaims(input: {
  pet_id?: string | null;
  limit?: number;
} = {}): Promise<MipoInsuranceClaim[]> {
  const params = new URLSearchParams();
  if (input.pet_id) params.set("pet_id", input.pet_id);
  if (input.limit) params.set("limit", String(input.limit));
  const query = params.toString();
  const result = await apiFetch<{ claims: MipoInsuranceClaim[] }>(
    `/me/insurance-claims${query ? `?${query}` : ""}`,
  );
  return result.claims;
}

export async function createMyInsuranceClaim(input: Partial<MipoInsuranceClaim>): Promise<MipoInsuranceClaim> {
  const result = await apiFetch<{ claim: MipoInsuranceClaim }>("/me/insurance-claims", {
    method: "POST",
    body: JSON.stringify(input),
  });
  window.dispatchEvent(new Event("mipo:insurance-claims-changed"));
  return result.claim;
}

export async function getMyServiceBookings(input: {
  pet_id?: string | null;
  service_type?: string | null;
  limit?: number;
} = {}): Promise<MipoServiceBooking[]> {
  const params = new URLSearchParams();
  if (input.pet_id) params.set("pet_id", input.pet_id);
  if (input.service_type) params.set("service_type", input.service_type);
  if (input.limit) params.set("limit", String(input.limit));
  const query = params.toString();
  const result = await apiFetch<{ bookings: MipoServiceBooking[] }>(
    `/me/service-bookings${query ? `?${query}` : ""}`,
  );
  return result.bookings;
}

export async function createMyServiceBooking(input: Partial<MipoServiceBooking>): Promise<MipoServiceBooking> {
  const result = await apiFetch<{ booking: MipoServiceBooking }>("/me/service-bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
  window.dispatchEvent(new Event("mipo:service-bookings-changed"));
  return result.booking;
}

export async function getMyVetVisits(petId: string): Promise<MipoVetVisit[]> {
  const result = await apiFetch<{ vet_visits: MipoVetVisit[] }>(`/me/pets/${petId}/vet-visits`);
  return result.vet_visits;
}

export async function getMyPetHealthSummary(petId: string): Promise<MipoPetHealthSummary> {
  return apiFetch<MipoPetHealthSummary>(`/me/pets/${petId}/health-summary`);
}

export async function createMyVetVisit(petId: string, input: Partial<MipoVetVisit>): Promise<MipoVetVisit> {
  const result = await apiFetch<{ vet_visit: MipoVetVisit }>(`/me/pets/${petId}/vet-visits`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  window.dispatchEvent(new Event("mipo:health-changed"));
  return result.vet_visit;
}

export async function getMyVaccinations(petId: string): Promise<MipoVaccination[]> {
  const result = await apiFetch<{ vaccinations: MipoVaccination[] }>(`/me/pets/${petId}/vaccinations`);
  return result.vaccinations;
}

export async function createMyVaccination(petId: string, input: Partial<MipoVaccination>): Promise<MipoVaccination> {
  const result = await apiFetch<{ vaccination: MipoVaccination }>(`/me/pets/${petId}/vaccinations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  window.dispatchEvent(new Event("mipo:health-changed"));
  return result.vaccination;
}

export async function loginAdmin(email: string, password: string): Promise<MipoAdmin> {
  const result = await apiFetch<{ admin: MipoAdmin }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setStorageHint(adminSessionHintKey, true);
  return result.admin;
}

export async function logoutAdmin() {
  setStorageHint(adminSessionHintKey, false);
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

export async function getBreedInfo(petType: "dog" | "cat"): Promise<MipoBreedInfo[]> {
  const result = await apiFetch<{ breeds: MipoBreedInfo[] }>(`/breeds?pet_type=${encodeURIComponent(petType)}`);
  return result.breeds;
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
