import type { MipoAdmin } from "@/lib/mipoApi";

export const ADMIN_PERMISSIONS = {
  FULL_ACCESS: "admin.full",
  PRODUCTS_READ: "products.read",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",
  PRODUCT_ASSETS_UPLOAD: "product_assets.upload",
  PRODUCT_TOOLS_USE: "product_tools.use",
} as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS];

export const adminHasPermission = (admin: MipoAdmin | null | undefined, permission: AdminPermission) => (
  Boolean(admin?.permissions?.includes("*") || admin?.permissions?.includes(permission))
);
