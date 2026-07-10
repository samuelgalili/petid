import { APP_URL } from "@/lib/app-url";

export const toSafeHttpUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;
  try {
    const base = typeof window === "undefined" ? APP_URL : window.location.origin;
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

export const openSafeExternalUrl = (value: string | null | undefined) => {
  const url = toSafeHttpUrl(value);
  if (!url) return null;
  return window.open(url, "_blank", "noopener,noreferrer");
};
