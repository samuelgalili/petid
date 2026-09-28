/**
 * Where to send someone after they log in.
 *
 * The value comes from the query string, which anyone can edit, so it has to
 * be a path on this site. A protocol-relative URL or a scheme would leave the
 * app, and sending a customer login back into the admin is a different door.
 */
export const safeReturnPath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) return null;
  if (trimmed.includes("\\") || trimmed.includes("://") || trimmed.includes("\0")) return null;

  let url: URL;
  try {
    url = new URL(trimmed, "https://mipo.pet");
  } catch {
    return null;
  }
  if (url.origin !== "https://mipo.pet") return null;

  const blocked = url.pathname === "/auth"
    || url.pathname.startsWith("/auth/")
    || url.pathname === "/signup"
    || url.pathname.startsWith("/signup/")
    || url.pathname === "/admin"
    || url.pathname.startsWith("/admin/");
  if (blocked) return null;

  return `${url.pathname}${url.search}${url.hash}`;
};
