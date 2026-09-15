// Admin roles, scopes and permissions.
//
// Two axes, deliberately kept apart:
//
//   PERMISSION  what kind of action this role may perform at all
//   SCOPE       whose rows it may perform it on
//
// A permission check alone is not authorisation. seller_admin has OFFERS_WRITE,
// but that says nothing about WHICH offers - the scope decides, and the route
// enforces it against the session's business_id. Conflating the two is how an
// "authorised" request ends up editing somebody else's catalogue.
//
// There is no "*" wildcard any more. It used to stand for the admin role, and
// it meant hasAdminPermission('admin', 'anything.at.all') returned true -
// including for a permission name that was a typo, or one a future route
// invented and never defined. Every role now enumerates what it holds, so an
// unknown permission is denied to everybody. Fail-closed: a typo shows up as a
// 403 rather than as full access nobody notices was granted by accident.

export const ADMIN_ROLES = Object.freeze({
  ADMIN: "admin",
  PRODUCT_MANAGER: "product_manager",
  SELLER_ADMIN: "seller_admin",
  READONLY_ADMIN: "readonly_admin",
});

export const ADMIN_SCOPES = Object.freeze({
  PLATFORM: "platform",
  SELLER: "seller",
});

export const ADMIN_PERMISSIONS = Object.freeze({
  FULL_ACCESS: "admin.full",

  // The legacy catalogue (business_products). Unchanged.
  PRODUCTS_READ: "products.read",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",
  PRODUCT_ASSETS_UPLOAD: "product_assets.upload",
  PRODUCT_TOOLS_USE: "product_tools.use",
  // Deciding who owns a legacy product is not an editing action. It is left
  // out of PRODUCT_MANAGER below on purpose: being able to change a price must
  // not carry the authority to settle ownership, so only a full admin has it.
  PRODUCTS_OWNERSHIP_REVIEW: "products.ownership_review",

  // Product Intake.
  INTAKE_READ: "intake.read",
  INTAKE_WRITE: "intake.write",
  // Submitting a draft for review is not reviewing it.
  DRAFT_SUBMIT: "intake.draft_submit",
  // Approving or rejecting. Deliberately NOT held by seller_admin: the state
  // machine forbids a submitter approving their own draft, and the cleanest
  // way to guarantee that is for the submitting role not to hold the
  // permission at all.
  DRAFT_REVIEW: "intake.draft_review",

  VARIANTS_READ: "variants.read",
  VARIANTS_WRITE: "variants.write",
  OFFERS_READ: "offers.read",
  OFFERS_WRITE: "offers.write",
  INVENTORY_READ: "inventory.read",
  INVENTORY_WRITE: "inventory.write",

  // Bringing bytes under our control is not the same act as accepting them for
  // public display - held separately for the same reason the columns are.
  MEDIA_ADOPT: "media.adopt",
  MEDIA_APPROVE: "media.approve",

  PUBLICATION_READ: "publication.read",
  PUBLICATION_PUBLISH: "publication.publish",
});

const ALL_PERMISSIONS = Object.freeze(Object.values(ADMIN_PERMISSIONS));

// Which permissions change data. readonly_admin holds none of them, and a test
// asserts that by intersection rather than trusting this list to stay right.
const WRITE_PERMISSIONS = Object.freeze(new Set([
  ADMIN_PERMISSIONS.FULL_ACCESS,
  ADMIN_PERMISSIONS.PRODUCTS_CREATE,
  ADMIN_PERMISSIONS.PRODUCTS_UPDATE,
  ADMIN_PERMISSIONS.PRODUCTS_DELETE,
  ADMIN_PERMISSIONS.PRODUCT_ASSETS_UPLOAD,
  ADMIN_PERMISSIONS.PRODUCT_TOOLS_USE,
  ADMIN_PERMISSIONS.PRODUCTS_OWNERSHIP_REVIEW,
  ADMIN_PERMISSIONS.INTAKE_WRITE,
  ADMIN_PERMISSIONS.DRAFT_SUBMIT,
  ADMIN_PERMISSIONS.DRAFT_REVIEW,
  ADMIN_PERMISSIONS.VARIANTS_WRITE,
  ADMIN_PERMISSIONS.OFFERS_WRITE,
  ADMIN_PERMISSIONS.INVENTORY_WRITE,
  ADMIN_PERMISSIONS.MEDIA_ADOPT,
  ADMIN_PERMISSIONS.MEDIA_APPROVE,
  ADMIN_PERMISSIONS.PUBLICATION_PUBLISH,
]));

const READ_PERMISSIONS = Object.freeze([
  ADMIN_PERMISSIONS.PRODUCTS_READ,
  ADMIN_PERMISSIONS.INTAKE_READ,
  ADMIN_PERMISSIONS.VARIANTS_READ,
  ADMIN_PERMISSIONS.OFFERS_READ,
  ADMIN_PERMISSIONS.INVENTORY_READ,
  ADMIN_PERMISSIONS.PUBLICATION_READ,
]);

const rolePermissions = Object.freeze({
  // Everything, enumerated. Not "*".
  [ADMIN_ROLES.ADMIN]: Object.freeze([...ALL_PERMISSIONS]),

  // Platform-wide content authority. No ownership review (see above), no
  // deletion, no full access.
  [ADMIN_ROLES.PRODUCT_MANAGER]: Object.freeze([
    ADMIN_PERMISSIONS.PRODUCTS_READ,
    ADMIN_PERMISSIONS.PRODUCTS_CREATE,
    ADMIN_PERMISSIONS.PRODUCTS_UPDATE,
    ADMIN_PERMISSIONS.PRODUCT_ASSETS_UPLOAD,
    ADMIN_PERMISSIONS.PRODUCT_TOOLS_USE,
    ADMIN_PERMISSIONS.INTAKE_READ,
    ADMIN_PERMISSIONS.INTAKE_WRITE,
    ADMIN_PERMISSIONS.DRAFT_SUBMIT,
    ADMIN_PERMISSIONS.DRAFT_REVIEW,
    ADMIN_PERMISSIONS.VARIANTS_READ,
    ADMIN_PERMISSIONS.VARIANTS_WRITE,
    ADMIN_PERMISSIONS.OFFERS_READ,
    ADMIN_PERMISSIONS.OFFERS_WRITE,
    ADMIN_PERMISSIONS.INVENTORY_READ,
    ADMIN_PERMISSIONS.INVENTORY_WRITE,
    ADMIN_PERMISSIONS.MEDIA_ADOPT,
    ADMIN_PERMISSIONS.MEDIA_APPROVE,
    ADMIN_PERMISSIONS.PUBLICATION_READ,
    ADMIN_PERMISSIONS.PUBLICATION_PUBLISH,
  ]),

  // A Seller's own catalogue, and nothing else. Every one of these is still
  // bounded by the session's business_id at the route.
  //
  // No DRAFT_REVIEW: a Seller may submit but not approve. No PRODUCTS_* either
  // - that is the legacy catalogue, which no Seller owns.
  [ADMIN_ROLES.SELLER_ADMIN]: Object.freeze([
    ADMIN_PERMISSIONS.INTAKE_READ,
    ADMIN_PERMISSIONS.INTAKE_WRITE,
    ADMIN_PERMISSIONS.DRAFT_SUBMIT,
    ADMIN_PERMISSIONS.VARIANTS_READ,
    ADMIN_PERMISSIONS.VARIANTS_WRITE,
    ADMIN_PERMISSIONS.OFFERS_READ,
    ADMIN_PERMISSIONS.OFFERS_WRITE,
    ADMIN_PERMISSIONS.INVENTORY_READ,
    ADMIN_PERMISSIONS.INVENTORY_WRITE,
    ADMIN_PERMISSIONS.MEDIA_ADOPT,
    ADMIN_PERMISSIONS.PUBLICATION_READ,
    // OD-4: a Seller may publish its own product. The gate enforces every
    // objective condition, and the content was reviewed at the draft.
    ADMIN_PERMISSIONS.PUBLICATION_PUBLISH,
  ]),

  // Seller-scoped and read-only. Holds no write permission at all - not even
  // MEDIA_ADOPT, which reads passive but fetches and stores bytes.
  [ADMIN_ROLES.READONLY_ADMIN]: Object.freeze([...READ_PERMISSIONS]),
});

const roleScopes = Object.freeze({
  [ADMIN_ROLES.ADMIN]: ADMIN_SCOPES.PLATFORM,
  [ADMIN_ROLES.PRODUCT_MANAGER]: ADMIN_SCOPES.PLATFORM,
  [ADMIN_ROLES.SELLER_ADMIN]: ADMIN_SCOPES.SELLER,
  [ADMIN_ROLES.READONLY_ADMIN]: ADMIN_SCOPES.SELLER,
});

const asRole = (role) => String(role ?? "");

export const isSupportedAdminRole = (role) => Object.hasOwn(rolePermissions, asRole(role));

export const isKnownAdminPermission = (permission) => ALL_PERMISSIONS.includes(String(permission ?? ""));

export const isWriteAdminPermission = (permission) => WRITE_PERMISSIONS.has(String(permission ?? ""));

export const getAdminPermissions = (role) => [...(rolePermissions[asRole(role)] || [])];

/**
 * The scope a role operates in. Returns null for an unknown role rather than
 * defaulting to PLATFORM, because a wrong guess here is a privilege escalation.
 */
export const getAdminScope = (role) => roleScopes[asRole(role)] ?? null;

export const isSellerScopedRole = (role) => getAdminScope(role) === ADMIN_SCOPES.SELLER;

export const isPlatformScopedRole = (role) => getAdminScope(role) === ADMIN_SCOPES.PLATFORM;

/**
 * Whether a role holds a permission.
 *
 * An unknown permission is denied for every role, including admin. That is the
 * point of dropping the wildcard.
 */
export const hasAdminPermission = (role, permission) => {
  const wanted = String(permission ?? "");
  if (!isKnownAdminPermission(wanted)) return false;
  return (rolePermissions[asRole(role)] || []).includes(wanted);
};

/**
 * Whether a role may act on rows belonging to `targetBusinessId`.
 *
 * Platform roles may act on anything. A Seller-scoped role may act only within
 * its own Seller - and, importantly, a Seller-scoped identity with no
 * business_id may act on NOTHING. The database makes such a row
 * unrepresentable, but this function must not rely on that: if one ever
 * existed, reading a missing scope as "no restriction" would turn the narrowest
 * role into the widest one. Same failure shape as ON DELETE SET NULL.
 */
export const canActOnBusiness = (role, sessionBusinessId, targetBusinessId) => {
  const scope = getAdminScope(role);
  if (scope === null) return false;
  if (scope === ADMIN_SCOPES.PLATFORM) return true;
  if (!sessionBusinessId) return false;
  if (!targetBusinessId) return false;
  return String(sessionBusinessId) === String(targetBusinessId);
};
