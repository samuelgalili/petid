const DEFAULT_LOCAL_APP_URL = "http://localhost:8080";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const APP_URL = trimTrailingSlash(
  import.meta.env.VITE_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : DEFAULT_LOCAL_APP_URL),
);

export function appUrl(path = ""): string {
  if (!path) {
    return APP_URL;
  }

  return new URL(path.replace(/^\/+/, ""), `${APP_URL}/`).toString();
}
