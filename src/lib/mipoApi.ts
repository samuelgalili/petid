import { emitPetCompanionReaction } from "@/lib/petCompanionReactions";

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

export interface MipoAiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MipoAiChatProduct {
  id: string;
  name: string;
  price?: number | null;
  sale_price?: number | null;
  image_url?: string | null;
  category?: string | null;
}

export interface MipoAiChatResponseMessage {
  role: "assistant";
  content: string;
  timestamp?: string;
  suggestions?: string[];
  products?: MipoAiChatProduct[];
  botSource?: string;
}

export interface MipoSocialCreator {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface MipoSocialPost {
  id: string;
  caption: string | null;
  location: string | null;
  media_url: string;
  media_type: "image" | "video";
  visibility: "public" | "private";
  allow_comments: boolean;
  poll_question: string | null;
  poll_options: string[];
  poll_results: number[];
  viewer_poll_option: number | null;
  reaction_count: number;
  comment_count: number;
  viewer_has_liked: boolean;
  viewer_has_saved: boolean;
  is_owner: boolean;
  published_at: string;
  creator: MipoSocialCreator;
  pet: {
    id: string;
    name: string;
    avatar_url: string | null;
    type: string | null;
    breed: string | null;
  } | null;
}

export interface MipoSocialComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  is_owner: boolean;
  creator: MipoSocialCreator;
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
  permissions: string[];
  must_change_password: boolean;
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
  user_id?: string | null;
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
  expected_total: number;
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

export interface MipoOrderCreationResult {
  order: MipoOrder;
  access_token?: string;
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
  id_verified?: boolean | null;
  marketing_consent?: boolean | null;
  marketing_consent_date?: string | null;
  marketing_unsubscribed_at?: string | null;
  quiet_mode_until?: string | null;
  last_active_at?: string | null;
  show_activity_status?: boolean | null;
  profile_visibility?: "public" | "private" | null;
  ai_consent_given?: boolean | null;
  ai_consent_date?: string | null;
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
  is_lost?: boolean | null;
  lost_since?: string | null;
  lost_reward_text?: string | null;
  lost_temperament?: string | null;
  lost_medication_note?: string | null;
  lost_allergy_note?: string | null;
  lost_show_phone?: boolean | null;
  lost_contact_phone?: string | null;
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

export type MipoPetCharacterStatus =
  | "generating_candidates"
  | "awaiting_selection"
  | "generating_pack"
  | "ready"
  | "failed";

export type MipoPetCharacterExpression =
  | "neutral"
  | "happy"
  | "curious"
  | "sleepy"
  | "proud"
  | "celebrate"
  | "attentive";

export interface MipoPetCharacter {
  id: string;
  pet_id: string;
  status: MipoPetCharacterStatus;
  style_key: string;
  selected_candidate_key: string | null;
  candidates: Array<{ key: string; url: string }>;
  expressions: Partial<Record<MipoPetCharacterExpression, string>>;
  error_code: string | null;
  generation_version: number;
  created_at: string;
  updated_at: string;
}

export interface MipoPetCharacterResponse {
  available: boolean;
  character: MipoPetCharacter | null;
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

export interface MipoDataExport {
  exported_at: string;
  profile: MipoProfile | null;
  pets: MipoPet[];
  documents: MipoDocument[];
  insurance_claims: MipoInsuranceClaim[];
  service_bookings: MipoServiceBooking[];
  notifications: MipoNotification[];
  orders: MipoOrder[];
  vet_visits: MipoVetVisit[];
  vaccinations: MipoVaccination[];
  pet_characters: Array<Pick<
    MipoPetCharacter,
    "id" | "pet_id" | "status" | "style_key" | "selected_candidate_key" | "generation_version" | "error_code" | "created_at" | "updated_at"
  >>;
}

export interface MipoPublicPet {
  pet: MipoPet;
  owner: Pick<MipoProfile, "full_name" | "phone" | "city"> | null;
}

export interface MipoAdminAnalytics {
  orders: Array<Pick<MipoOrder, "id" | "status" | "total" | "created_at"> & { user_id?: string | null }>;
  pets: Array<Pick<MipoPet, "id" | "type" | "breed" | "birth_date" | "medical_conditions" | "is_neutered" | "last_vet_visit" | "created_at" | "user_id"> & {
    is_lost?: boolean | null;
  }>;
  profiles: Array<Pick<MipoProfile, "id" | "city" | "created_at">>;
  products: MipoProduct[];
  pet_documents: Array<{ id: string; needs_review?: boolean | null; created_at: string }>;
  chat_feedback: Array<{
    id: string;
    user_id?: string | null;
    message_content?: string | null;
    rating?: string | null;
    created_at: string;
  }>;
  breeds: MipoBreedInfo[];
}

import { getSessionId } from "./analytics";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const userSessionHintKey = "mipo_user_session_hint";
const adminSessionHintKey = "mipo_admin_session_hint";

export class MipoApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "MipoApiError";
  }
}

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
    throw new MipoApiError(body?.error || `API request failed with ${response.status}`, response.status);
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
    throw new MipoApiError(body?.error || `API request failed with ${response.status}`, response.status);
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

export async function loginUser(email: string, password: string, rememberMe = false): Promise<MipoAuthResult> {
  const auth = await apiFetch<MipoAuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember_me: rememberMe, session_id: getSessionId() }),
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
    body: JSON.stringify({ ...input, session_id: getSessionId() }),
  });
  setStorageHint(userSessionHintKey, true);
  return auth;
}

export async function logoutUser() {
  const result = await apiFetch<{ ok: boolean }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!result.ok) throw new Error("Sign out failed");
  setStorageHint(userSessionHintKey, false);
  return result;
}

export async function requestPasswordReset(email: string): Promise<{
  ok: boolean;
  email_delivery?: "sent" | "not_configured" | "send_failed" | string;
  debug_otp?: string;
}> {
  return apiFetch("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(input: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  return apiFetch("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(input),
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

export async function updateMyMarketingConsent(enabled: boolean): Promise<MipoProfile> {
  const result = await apiFetch<{ profile: MipoProfile }>("/me/marketing-consent", {
    method: "PATCH",
    body: JSON.stringify({ marketing_consent: enabled, source: "settings" }),
  });
  return result.profile;
}

export async function getMyDataExport(): Promise<MipoDataExport> {
  const result = await apiFetch<{ export: MipoDataExport }>("/me/export");
  return result.export;
}

export async function deleteMyAccount(): Promise<MipoDataExport> {
  const result = await apiFetch<{ deleted: boolean; export: MipoDataExport }>("/me/account", {
    method: "DELETE",
  });
  setStorageHint(userSessionHintKey, false);
  return result.export;
}

export async function getProfileActivity(userId: string): Promise<{
  last_active_at: string | null;
  show_activity_status: boolean;
} | null> {
  try {
    const result = await apiFetch<{
      activity: { last_active_at: string | null; show_activity_status: boolean };
    }>(`/profiles/${encodeURIComponent(userId)}/activity`);
    return result.activity;
  } catch {
    return null;
  }
}

export async function updateMyActivityStatus(): Promise<void> {
  await updateMyProfile({ last_active_at: new Date().toISOString() } as Partial<MipoProfile>);
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

export async function getPublicPet(petId: string): Promise<MipoPublicPet> {
  return apiFetch<MipoPublicPet>(`/public/pets/${encodeURIComponent(petId)}`);
}

export async function logPublicPetScan(petId: string, input: {
  latitude?: number | null;
  longitude?: number | null;
  user_agent?: string | null;
}): Promise<{ logged: boolean }> {
  return apiFetch<{ logged: boolean }>(`/public/pets/${encodeURIComponent(petId)}/qr-scan`, {
    method: "POST",
    body: JSON.stringify(input),
  });
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

export async function getMyPetCharacter(petId: string): Promise<MipoPetCharacterResponse> {
  return apiFetch<MipoPetCharacterResponse>(`/me/pets/${encodeURIComponent(petId)}/character`);
}

export async function createMyPetCharacter(petId: string, photos: File[]): Promise<MipoPetCharacterResponse> {
  const encodedPhotos = await Promise.all(photos.map(async (file) => ({
    file_name: file.name,
    data_url: await fileToDataUrl(file),
  })));
  const result = await apiFetch<MipoPetCharacterResponse>(
    `/me/pets/${encodeURIComponent(petId)}/character`,
    {
      method: "POST",
      body: JSON.stringify({ photos: encodedPhotos, consent: true }),
    },
  );
  window.dispatchEvent(new Event("mipo:pet-character-changed"));
  return result;
}

export async function selectMyPetCharacterCandidate(
  petId: string,
  candidateKey: string,
): Promise<MipoPetCharacterResponse> {
  const result = await apiFetch<MipoPetCharacterResponse>(
    `/me/pets/${encodeURIComponent(petId)}/character/select`,
    {
      method: "POST",
      body: JSON.stringify({ candidate_key: candidateKey }),
    },
  );
  window.dispatchEvent(new Event("mipo:pet-character-changed"));
  return result;
}

export async function deleteMyPetCharacter(petId: string): Promise<boolean> {
  const result = await apiFetch<{ deleted: boolean }>(
    `/me/pets/${encodeURIComponent(petId)}/character`,
    { method: "DELETE" },
  );
  window.dispatchEvent(new Event("mipo:pet-character-changed"));
  return result.deleted;
}

export async function sendAiChat(input: {
  messages: MipoAiChatMessage[];
  userContext?: {
    userName?: string | null;
    selectedPetId?: string | null;
    selectedPetName?: string | null;
    pets?: Array<{
      id: string;
      name: string;
      type?: string | null;
      breed?: string | null;
    }>;
  };
}): Promise<MipoAiChatResponseMessage> {
  const result = await apiFetch<{ message: MipoAiChatResponseMessage }>("/ai/chat", {
    method: "POST",
    body: JSON.stringify(input),
  });
  emitPetCompanionReaction(input.userContext?.selectedPetId, "curious");
  return result.message;
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

export async function uploadSocialMedia(file: File) {
  const dataUrl = await fileToDataUrl(file);
  const result = await apiFetch<{
    upload: { id: string; url: string; file_name: string; content_type: string; size: number };
  }>("/me/social/uploads", {
    method: "POST",
    body: JSON.stringify({ file_name: file.name, data_url: dataUrl }),
  });
  return result.upload;
}

export async function getSocialFeed(input: { limit?: number; before?: string; saved?: boolean } = {}) {
  const params = new URLSearchParams();
  if (input.limit) params.set("limit", String(input.limit));
  if (input.before) params.set("before", input.before);
  if (input.saved) params.set("saved", "true");
  const query = params.toString();
  const result = await apiFetch<{ posts: MipoSocialPost[] }>(`/feed${query ? `?${query}` : ""}`);
  return result.posts;
}

export async function getSocialPost(postId: string) {
  const result = await apiFetch<{ post: MipoSocialPost }>(`/feed/posts/${postId}`);
  return result.post;
}

export async function createSocialPost(input: {
  upload_id: string;
  pet_id?: string | null;
  caption?: string;
  location?: string;
  visibility?: "public" | "private";
  allow_comments?: boolean;
  poll_question?: string;
  poll_options?: string[];
}) {
  const result = await apiFetch<{ post: MipoSocialPost }>("/feed/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.post;
}

export async function deleteSocialPost(postId: string) {
  return apiFetch<{ deleted: boolean }>(`/feed/posts/${postId}`, { method: "DELETE" });
}

export async function toggleSocialReaction(postId: string) {
  return apiFetch<{ liked: boolean; count: number }>(`/feed/posts/${postId}/reaction`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function toggleSocialSave(postId: string) {
  return apiFetch<{ saved: boolean }>(`/feed/posts/${postId}/save`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getSocialComments(postId: string) {
  const result = await apiFetch<{ comments: MipoSocialComment[] }>(`/feed/posts/${postId}/comments`);
  return result.comments;
}

export async function createSocialComment(postId: string, body: string) {
  const result = await apiFetch<{ comment: MipoSocialComment }>(`/feed/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return result.comment;
}

export async function deleteSocialComment(commentId: string) {
  return apiFetch<{ deleted: boolean }>(`/feed/comments/${commentId}`, { method: "DELETE" });
}

export async function voteSocialPoll(postId: string, optionIndex: number) {
  const result = await apiFetch<{ post: MipoSocialPost }>(`/feed/posts/${postId}/poll`, {
    method: "POST",
    body: JSON.stringify({ option_index: optionIndex }),
  });
  return result.post;
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
  emitPetCompanionReaction(input.pet_id, "proud");
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
  emitPetCompanionReaction(petId, "celebrate");
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
  emitPetCompanionReaction(petId, "celebrate");
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
  const result = await apiFetch<{ ok: boolean }>("/admin/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!result.ok) throw new Error("Admin sign out failed");
  setStorageHint(adminSessionHintKey, false);
  return result;
}

export async function changeAdminPassword(password: string): Promise<MipoAdmin> {
  const result = await adminApiFetch<{ admin: MipoAdmin }>("/admin/password", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  setStorageHint(adminSessionHintKey, false);
  return result.admin;
}

export async function getAdminAnalytics(days: number): Promise<MipoAdminAnalytics> {
  const params = new URLSearchParams({ days: String(days) });
  return adminApiFetch<MipoAdminAnalytics>(`/admin/analytics?${params.toString()}`);
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

export async function createShopOrder(input: CreateMipoOrderInput): Promise<MipoOrderCreationResult> {
  return apiFetch<MipoOrderCreationResult>("/orders", {
    method: "POST",
    body: JSON.stringify({ ...input, session_id: getSessionId() }),
  });
}


// --- supplier imports ------------------------------------------------------

export interface MipoSupplier {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  source_type: string;
  default_currency: string;
  last_import_at: string | null;
}

export interface MipoImportProfile {
  id: string;
  supplier_id: string;
  name: string;
  sheet_name: string | null;
  header_row: number;
  status: string;
  last_import_at: string | null;
}

export interface MipoImportRun {
  id: string;
  supplier_id: string | null;
  supplier_name?: string | null;
  profile_id: string | null;
  status: string;
  filename: string | null;
  sheet_name: string | null;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  pending_review_rows: number;
  mapped_fields: number;
  unmapped_fields: number;
  ignored_fields: number;
  warnings: { code: string; message: string; columns?: string[] }[];
  errors: { code: string; message: string }[];
  created_at: string;
}

export interface MipoFieldMapping {
  id: string;
  profile_id: string;
  source_field: string;
  normalized_source_field: string;
  target_kind: "domain" | "attribute" | "identifier" | "price" | "metadata" | "ignored" | "unmapped";
  target_field: string | null;
  value_type: string;
  is_required: boolean;
  ignore_reason: string | null;
  notes: string | null;
}

export interface MipoTargetField {
  field: string;
  kind: string;
  type: string;
}

export interface MipoSupplierWithProfiles extends MipoSupplier {
  profiles: MipoImportProfile[];
}

export async function getSuppliers(): Promise<MipoSupplierWithProfiles[]> {
  const result = await adminApiFetch<{ suppliers: MipoSupplierWithProfiles[] }>("/admin/suppliers");
  return result.suppliers;
}

export async function getImportTargetFields(): Promise<MipoTargetField[]> {
  const result = await adminApiFetch<{ fields: MipoTargetField[] }>("/admin/import-target-fields");
  return result.fields;
}

export async function getImportRuns(): Promise<MipoImportRun[]> {
  const result = await adminApiFetch<{ imports: MipoImportRun[] }>("/admin/imports");
  return result.imports;
}

export async function getImportReport(importId: string) {
  return adminApiFetch<{
    import: MipoImportRun;
    row_states: { status: string; count: number }[];
    fields: MipoFieldMapping[];
    field_summary: { mapped: number; unmapped: number; ignored: number };
  }>(`/admin/imports/${importId}`);
}

export async function uploadSupplierFile(input: {
  filename: string;
  file_base64: string;
  supplier_id?: string | null;
  profile_id?: string | null;
  sheet_name?: string | null;
  content_type?: string | null;
}): Promise<MipoImportRun> {
  const result = await adminApiFetch<{ import: MipoImportRun }>("/admin/imports", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.import;
}

export async function getProfileMappings(profileId: string): Promise<MipoFieldMapping[]> {
  const result = await adminApiFetch<{ mappings: MipoFieldMapping[] }>(
    `/admin/import-profiles/${profileId}/mappings`,
  );
  return result.mappings;
}

export async function updateProfileMappings(
  profileId: string,
  mappings: Array<Partial<MipoFieldMapping> & { id: string; source_field: string }>,
): Promise<{ updated: number }> {
  return adminApiFetch(`/admin/import-profiles/${profileId}/mappings`, {
    method: "PATCH",
    body: JSON.stringify({ mappings }),
  });
}

export async function suggestProfileMappings(profileId: string): Promise<{ proposed: number; total: number }> {
  return adminApiFetch(`/admin/import-profiles/${profileId}/suggest`, { method: "POST" });
}

export async function runImportMapping(importId: string): Promise<{ queued: boolean }> {
  return adminApiFetch(`/admin/imports/${importId}/map`, { method: "POST" });
}

// --- customers ---------------------------------------------------------------

export interface MipoCustomerRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  has_account: boolean;
  first_order_at: string | null;
  last_order_at: string | null;
  order_count: number;
  total_spent: string;
  pet_count: number;
  created_at: string;
}

export interface MipoCustomerCard {
  customer: MipoCustomerRow & {
    marketing_consent?: boolean | null;
    city?: string | null;
    last_login_at?: string | null;
  };
  orders: { id: string; order_number: string; status: string; total: string; order_date: string; item_count: number }[];
  pets: { id: string; name: string; type: string; breed: string | null; birth_date: string | null }[];
  behaviour: { event_type: string; count: number; last_at: string }[];
  viewed_products: { id: string; name: string; image_url: string; price: string; views: number; purchased: boolean }[];
  stats: { order_count: number; total_spent: number; average_order: number; viewed_not_purchased: number };
}

export async function getCustomers(input: { search?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (input.search) params.set("search", input.search);
  params.set("limit", String(input.limit ?? 50));
  return adminApiFetch<{ customers: MipoCustomerRow[]; totals: { customers: number; with_account: number; buyers: number } }>(
    `/admin/customers?${params.toString()}`,
  );
}

export async function getCustomerCard(customerId: string): Promise<MipoCustomerCard> {
  return adminApiFetch<MipoCustomerCard>(`/admin/customers/${customerId}`);
}

// --- review center ---------------------------------------------------------

export interface MipoReviewReason {
  code: string;
  label: string;
  blocks_publish: boolean;
  product_count: number;
}

export interface MipoReviewSummary {
  reasons: MipoReviewReason[];
  pending: number;
  publishable: number;
}

export interface MipoReviewProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  cost_price: number | null;
  image_url: string;
  size_amount: number | null;
  size_unit: string | null;
  brand_name: string | null;
  category_name: string | null;
  animal_name: string | null;
  supplier_name: string | null;
  row_number: number;
  reasons: string[];
}

export async function getReviewSummary(): Promise<MipoReviewSummary> {
  return adminApiFetch<MipoReviewSummary>("/admin/review/summary");
}

export async function getReviewProducts(input: { reason?: string | null; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (input.reason) params.set("reason", input.reason);
  params.set("limit", String(input.limit ?? 100));
  const result = await adminApiFetch<{ products: MipoReviewProduct[] }>(
    `/admin/review/products?${params.toString()}`,
  );
  return result.products;
}

export async function applyReviewDecision(input: { product_ids: string[]; action: "publish" | "reject" }) {
  return adminApiFetch<{
    requested: number;
    updated: number;
    refused: { id: string; name: string; sku: string | null; reason: string }[];
  }>("/admin/review/decision", { method: "POST", body: JSON.stringify(input) });
}

// --- event bus -------------------------------------------------------------

export interface MipoEventSubscription {
  id: string;
  name: string;
  target_url: string;
  event_types: string[];
  is_active: boolean;
  max_attempts: number;
  timeout_ms: number;
  headers: Record<string, string>;
  /** The secret itself never leaves the server — only whether one is set. */
  has_secret: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  created_at: string;
  pending: string;
  delivered: string;
  dead: string;
}

export interface MipoEventBusStatus {
  subscriptions: MipoEventSubscription[];
  backlog: { awaiting_dispatch: string; awaiting_delivery: string; dead: string };
  recent_failures: {
    id: string;
    status: string;
    attempts: number;
    response_status: number | null;
    last_error: string | null;
    updated_at: string;
    event_type: string;
    subscription_name: string;
  }[];
  event_types: { event_type: string; events: string }[];
}

export interface MipoSubscriptionInput {
  name?: string;
  target_url?: string;
  event_types?: string[];
  secret?: string;
  clear_secret?: boolean;
  headers?: Record<string, string>;
  is_active?: boolean;
  max_attempts?: number;
  timeout_ms?: number;
}

export async function getEventBusStatus(): Promise<MipoEventBusStatus> {
  return adminApiFetch<MipoEventBusStatus>("/admin/events/bus");
}

export async function createEventSubscription(input: MipoSubscriptionInput) {
  return adminApiFetch<{ id: string }>("/admin/events/subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateEventSubscription(id: string, input: MipoSubscriptionInput) {
  return adminApiFetch<{ updated: boolean }>(`/admin/events/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteEventSubscription(id: string) {
  return adminApiFetch<{ deleted: boolean }>(`/admin/events/subscriptions/${id}`, { method: "DELETE" });
}

export async function testEventSubscription(id: string) {
  return adminApiFetch<{ ok: boolean; responseStatus?: number; error?: string }>(
    `/admin/events/subscriptions/${id}/test`,
    { method: "POST" },
  );
}

export async function replayEventDeliveries(input: { delivery_ids?: string[]; subscription_id?: string }) {
  return adminApiFetch<{ replayed: number }>("/admin/events/replay", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function dispatchPendingEvents() {
  return adminApiFetch<{ dispatched: number; deliveries: number }>("/admin/events/dispatch", {
    method: "POST",
  });
}

export async function runImportApply(importId: string): Promise<{ queued: boolean }> {
  return adminApiFetch(`/admin/imports/${importId}/apply`, { method: "POST" });
}

export async function createShopPaymentSession(input: {
  order_id: string;
  success_url: string;
  cancel_url: string;
  access_token?: string;
}): Promise<MipoPaymentSession> {
  return apiFetch<MipoPaymentSession>("/payments/shop", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getShopOrder(orderIdOrNumber: string, accessToken?: string): Promise<MipoOrder> {
  const result = await apiFetch<{ order: MipoOrder }>(
    `/orders/${encodeURIComponent(orderIdOrNumber)}`,
    accessToken ? { headers: { "X-Order-Access-Token": accessToken } } : undefined,
  );
  return result.order;
}

export async function getMyOrders(input: { limit?: number } = {}): Promise<MipoOrder[]> {
  const params = new URLSearchParams();
  if (input.limit) params.set("limit", String(input.limit));
  const query = params.toString();
  const result = await apiFetch<{ orders: MipoOrder[] }>(`/me/orders${query ? `?${query}` : ""}`);
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
): Promise<{ data: T; error: { message: string } | null }> {
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
