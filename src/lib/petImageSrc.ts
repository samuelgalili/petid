import { isValidUrl } from "@/lib/inputSanitizer";

/**
 * Same URL contract as Profile resolveHeroSrc / pets.avatar_url:
 * http(s), site-relative `/…`, or `data:image/*`.
 *
 * Q4: resolveQrSrc uses this on source_image_url only — never avatar_url.
 * Hero keeps its own resolveHeroSrc on avatar_url (unchanged).
 */
export const isUsablePetImageSrc = (url: string | null | undefined): url is string => {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (isValidUrl(trimmed)) return true;
  if (trimmed.startsWith("/") && trimmed.length > 1) return true;
  if (trimmed.startsWith("data:image/")) return true;
  return false;
};

/** QR center: valid source_image_url, else the type icon. Never avatar_url. */
export const resolveQrSrc = (
  sourceImageUrl: string | null | undefined,
  fallbackSrc: string,
): string => {
  if (!isUsablePetImageSrc(sourceImageUrl)) return fallbackSrc;
  return sourceImageUrl.trim();
};

/**
 * First-create photo (AddPet): write the uploaded image to Master and source.
 * Later Master updates must send only avatar_url.
 *
 * Onboarding persist (#21) sends avatar_url only. Server INSERT copies
 * avatar → source when source is omitted, so this helper stays off that path.
 */
export const petCreateImageFields = (
  photoUrl: string | null | undefined,
): { avatar_url: string | null; source_image_url: string | null } => {
  const url = typeof photoUrl === "string" && photoUrl.trim() ? photoUrl.trim() : null;
  return { avatar_url: url, source_image_url: url };
};
