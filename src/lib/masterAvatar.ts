import { isValidUrl } from "@/lib/inputSanitizer";

/**
 * Master avatar = the generated / uploaded identity stored on `pets.avatar_url`.
 * Type-icon fallbacks are official dog/cat marks — never breed stock (doberman).
 */
export type MasterAvatarKind = "master" | "type-fallback";

export type MasterAvatarResolution = {
  src: string;
  kind: MasterAvatarKind;
};

/** Hebrew label shown when the type icon is used instead of a Master image. */
export const TYPE_FALLBACK_LABEL_HE = "ברירת מחדל";

/**
 * True when `avatar_url` can be used as an <img> src.
 * Accepts http(s), site-relative `/...`, and `data:image/...` (upload-avatar).
 */
export function isUsableMasterAvatarSrc(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isValidUrl(trimmed)) return true;
  if (trimmed.startsWith("/") && trimmed.length > 1 && !trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("data:image/")) return true;
  return false;
}

/**
 * Resolve the Hero / presence image.
 * Never returns an empty string: invalid Master values fall back to `fallbackSrc`.
 */
export function resolveMasterAvatarSrc(
  avatarUrl: string | null | undefined,
  fallbackSrc: string,
): MasterAvatarResolution {
  if (isUsableMasterAvatarSrc(avatarUrl)) {
    return { src: (avatarUrl as string).trim(), kind: "master" };
  }
  return { src: fallbackSrc, kind: "type-fallback" };
}
