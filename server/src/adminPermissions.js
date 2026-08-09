export const ADMIN_ROLES = Object.freeze({
  ADMIN: "admin",
  PRODUCT_MANAGER: "product_manager",
});

export const ADMIN_PERMISSIONS = Object.freeze({
  FULL_ACCESS: "admin.full",
  PRODUCTS_READ: "products.read",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",
  PRODUCT_ASSETS_UPLOAD: "product_assets.upload",
  PRODUCT_TOOLS_USE: "product_tools.use",
});

const rolePermissions = Object.freeze({
  [ADMIN_ROLES.ADMIN]: Object.freeze(["*"]),
  [ADMIN_ROLES.PRODUCT_MANAGER]: Object.freeze([
    ADMIN_PERMISSIONS.PRODUCTS_READ,
    ADMIN_PERMISSIONS.PRODUCTS_CREATE,
    ADMIN_PERMISSIONS.PRODUCTS_UPDATE,
    ADMIN_PERMISSIONS.PRODUCT_ASSETS_UPLOAD,
    ADMIN_PERMISSIONS.PRODUCT_TOOLS_USE,
  ]),
});

export const isSupportedAdminRole = (role) => Object.hasOwn(rolePermissions, String(role || ""));

export const getAdminPermissions = (role) => [...(rolePermissions[String(role || "")] || [])];

export const hasAdminPermission = (role, permission) => {
  const permissions = rolePermissions[String(role || "")] || [];
  return permissions.includes("*") || permissions.includes(permission);
};
