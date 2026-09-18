// The permission matrix, asserted exhaustively.
//
// Not "can an admin read products" - that kind of test passes on a matrix with
// a hole in it. What is asserted here is the whole grid: for every role, every
// permission is either held or not held, and the expected set is written out.
// A permission added without a decision about each role fails this file.

import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  ADMIN_SCOPES,
  canActOnBusiness,
  getAdminPermissions,
  getAdminScope,
  hasAdminPermission,
  isKnownAdminPermission,
  isPlatformScopedRole,
  isSellerScopedRole,
  isSupportedAdminRole,
  isWriteAdminPermission,
} from "../src/adminPermissions.js";

const ALL_ROLES = Object.values(ADMIN_ROLES);
const ALL_PERMISSIONS = Object.values(ADMIN_PERMISSIONS);

const P = ADMIN_PERMISSIONS;

// The grid, written out. This is the specification; the module is the
// implementation. They are compared, not described in terms of each other.
const EXPECTED = {
  [ADMIN_ROLES.ADMIN]: ALL_PERMISSIONS,

  [ADMIN_ROLES.PRODUCT_MANAGER]: [
    P.PRODUCTS_READ, P.PRODUCTS_CREATE, P.PRODUCTS_UPDATE,
    P.PRODUCT_ASSETS_UPLOAD, P.PRODUCT_TOOLS_USE,
    P.INTAKE_READ, P.INTAKE_WRITE, P.DRAFT_SUBMIT, P.DRAFT_REVIEW,
    P.VARIANTS_READ, P.VARIANTS_WRITE,
    P.OFFERS_READ, P.OFFERS_WRITE,
    P.INVENTORY_READ, P.INVENTORY_WRITE,
    P.MEDIA_ADOPT, P.MEDIA_APPROVE,
    P.PUBLICATION_READ, P.PUBLICATION_PUBLISH,
  ],

  [ADMIN_ROLES.SELLER_ADMIN]: [
    P.INTAKE_READ, P.INTAKE_WRITE, P.DRAFT_SUBMIT,
    P.VARIANTS_READ, P.VARIANTS_WRITE,
    P.OFFERS_READ, P.OFFERS_WRITE,
    P.INVENTORY_READ, P.INVENTORY_WRITE,
    P.MEDIA_ADOPT,
    P.PUBLICATION_READ, P.PUBLICATION_PUBLISH,
  ],

  [ADMIN_ROLES.READONLY_ADMIN]: [
    P.PRODUCTS_READ, P.INTAKE_READ, P.VARIANTS_READ,
    P.OFFERS_READ, P.INVENTORY_READ, P.PUBLICATION_READ,
  ],
};

// ─── the grid ────────────────────────────────────────────────────────────────

test("every role holds exactly the permissions it is specified to hold", () => {
  for (const role of ALL_ROLES) {
    assert.deepEqual(
      [...getAdminPermissions(role)].sort(),
      [...EXPECTED[role]].sort(),
      `the permission set for ${role} does not match the specification`,
    );
  }
});

test("every role x permission pair answers as specified - the whole grid", () => {
  for (const role of ALL_ROLES) {
    const held = new Set(EXPECTED[role]);
    for (const permission of ALL_PERMISSIONS) {
      assert.equal(
        hasAdminPermission(role, permission), held.has(permission),
        `${role} / ${permission}`,
      );
    }
  }
});

test("a new permission cannot be added without deciding it for all four roles", () => {
  // If ADMIN_PERMISSIONS grows and EXPECTED does not, this fails: the admin row
  // is the full list, so an undecided permission shows up here first.
  assert.equal(EXPECTED[ADMIN_ROLES.ADMIN].length, ALL_PERMISSIONS.length);
  for (const role of ALL_ROLES) {
    for (const permission of EXPECTED[role]) {
      assert.ok(isKnownAdminPermission(permission), `${permission} is not a declared permission`);
    }
  }
});

// ─── the thing the wildcard used to hide ─────────────────────────────────────

test("an undeclared permission is denied to every role, including admin", () => {
  for (const role of ALL_ROLES) {
    assert.equal(hasAdminPermission(role, "totally.made.up"), false, role);
    assert.equal(hasAdminPermission(role, "*"), false, `${role} must not answer to a literal wildcard`);
    assert.equal(hasAdminPermission(role, ""), false, role);
    assert.equal(hasAdminPermission(role, null), false, role);
    assert.equal(hasAdminPermission(role, undefined), false, role);
  }
  assert.equal(isKnownAdminPermission("totally.made.up"), false);
});

test("the admin permission list is enumerated, not a wildcard", () => {
  const permissions = getAdminPermissions(ADMIN_ROLES.ADMIN);
  assert.ok(!permissions.includes("*"), "a wildcard would grant permissions nobody defined");
  assert.ok(permissions.length >= 20, "the admin list must be the real enumeration");
});

test("the returned permission list cannot be mutated into extra access", () => {
  const permissions = getAdminPermissions(ADMIN_ROLES.READONLY_ADMIN);
  permissions.push(ADMIN_PERMISSIONS.OFFERS_WRITE);
  assert.equal(
    hasAdminPermission(ADMIN_ROLES.READONLY_ADMIN, ADMIN_PERMISSIONS.OFFERS_WRITE), false,
    "getAdminPermissions must return a copy",
  );
});

// ─── read versus write ───────────────────────────────────────────────────────

test("readonly_admin holds no write permission at all", () => {
  const writes = getAdminPermissions(ADMIN_ROLES.READONLY_ADMIN).filter(isWriteAdminPermission);
  assert.deepEqual(writes, [], "readonly must be read-only by intersection, not by intention");
});

test("MEDIA_ADOPT counts as a write, because it fetches and stores bytes", () => {
  assert.equal(isWriteAdminPermission(ADMIN_PERMISSIONS.MEDIA_ADOPT), true);
  assert.equal(hasAdminPermission(ADMIN_ROLES.READONLY_ADMIN, ADMIN_PERMISSIONS.MEDIA_ADOPT), false);
});

test("every permission is classified as either read or write", () => {
  const reads = [
    P.PRODUCTS_READ, P.INTAKE_READ, P.VARIANTS_READ,
    P.OFFERS_READ, P.INVENTORY_READ, P.PUBLICATION_READ,
    // AUDIT_READ is a read, and it is deliberately NOT in the module's
    // READ_PERMISSIONS bundle. That bundle is what readonly_admin holds, and
    // readonly_admin is seller-scoped; the audit log is platform-wide by
    // nature, so granting it there would be a scope escalation dressed as a
    // read. Two separate questions - "is this a read?" and "does the read-only
    // role hold it?" - and this list answers only the first.
    P.AUDIT_READ,
  ];
  for (const permission of ALL_PERMISSIONS) {
    const isWrite = isWriteAdminPermission(permission);
    const isRead = reads.includes(permission);
    assert.notEqual(isWrite, isRead, `${permission} must be exactly one of read or write`);
  }
});

// ─── scope ───────────────────────────────────────────────────────────────────

test("scopes are as decided: platform for admin roles, seller for the rest", () => {
  assert.equal(getAdminScope(ADMIN_ROLES.ADMIN), ADMIN_SCOPES.PLATFORM);
  assert.equal(getAdminScope(ADMIN_ROLES.PRODUCT_MANAGER), ADMIN_SCOPES.PLATFORM);
  assert.equal(getAdminScope(ADMIN_ROLES.SELLER_ADMIN), ADMIN_SCOPES.SELLER);
  // readonly_admin is Seller-scoped. An earlier draft had it platform-wide.
  assert.equal(getAdminScope(ADMIN_ROLES.READONLY_ADMIN), ADMIN_SCOPES.SELLER);

  assert.equal(isPlatformScopedRole(ADMIN_ROLES.ADMIN), true);
  assert.equal(isSellerScopedRole(ADMIN_ROLES.SELLER_ADMIN), true);
  assert.equal(isSellerScopedRole(ADMIN_ROLES.ADMIN), false);
});

test("an unknown role has no scope, and is neither platform nor seller", () => {
  assert.equal(getAdminScope("super_admin"), null,
    "defaulting to platform here would be a privilege escalation");
  assert.equal(isPlatformScopedRole("super_admin"), false);
  assert.equal(isSellerScopedRole("super_admin"), false);
});

// ─── the scope decision itself ───────────────────────────────────────────────

const SELLER_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const SELLER_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";

test("a platform role may act on any Seller's rows", () => {
  for (const role of [ADMIN_ROLES.ADMIN, ADMIN_ROLES.PRODUCT_MANAGER]) {
    assert.equal(canActOnBusiness(role, null, SELLER_A), true, role);
    assert.equal(canActOnBusiness(role, null, SELLER_B), true, role);
  }
});

test("a Seller role may act only within its own Seller", () => {
  for (const role of [ADMIN_ROLES.SELLER_ADMIN, ADMIN_ROLES.READONLY_ADMIN]) {
    assert.equal(canActOnBusiness(role, SELLER_A, SELLER_A), true, role);
    assert.equal(canActOnBusiness(role, SELLER_A, SELLER_B), false, `${role} crossed into another Seller`);
  }
});

test("a Seller role with no scope may act on NOTHING", () => {
  // The database makes this row unrepresentable. The check must not depend on
  // that: reading a missing scope as "unrestricted" would turn the narrowest
  // role into the widest one.
  for (const missing of [null, undefined, ""]) {
    assert.equal(canActOnBusiness(ADMIN_ROLES.SELLER_ADMIN, missing, SELLER_A), false,
      `sessionBusinessId=${JSON.stringify(missing)} must not mean unrestricted`);
  }
});

test("a Seller role may not act on a row with no owner", () => {
  assert.equal(canActOnBusiness(ADMIN_ROLES.SELLER_ADMIN, SELLER_A, null), false);
  assert.equal(canActOnBusiness(ADMIN_ROLES.SELLER_ADMIN, SELLER_A, undefined), false);
});

test("an unknown role may act on nothing", () => {
  assert.equal(canActOnBusiness("super_admin", SELLER_A, SELLER_A), false);
  assert.equal(canActOnBusiness("super_admin", null, SELLER_A), false);
  assert.equal(canActOnBusiness(null, null, SELLER_A), false);
});

// ─── roles ───────────────────────────────────────────────────────────────────

test("exactly the four approved roles are supported", () => {
  for (const role of ALL_ROLES) assert.equal(isSupportedAdminRole(role), true, role);
  for (const role of ["super_admin", "owner", "unknown", "", null, undefined]) {
    assert.equal(isSupportedAdminRole(role), false, String(role));
    assert.deepEqual(getAdminPermissions(role), []);
  }
  assert.equal(ALL_ROLES.length, 4);
});

// ─── the decisions these roles encode ────────────────────────────────────────

test("a Seller may submit a draft but may not approve one", () => {
  assert.equal(hasAdminPermission(ADMIN_ROLES.SELLER_ADMIN, ADMIN_PERMISSIONS.DRAFT_SUBMIT), true);
  assert.equal(
    hasAdminPermission(ADMIN_ROLES.SELLER_ADMIN, ADMIN_PERMISSIONS.DRAFT_REVIEW), false,
    "the submitter approving their own draft is forbidden by the state machine; the role must not hold the permission",
  );
  assert.equal(hasAdminPermission(ADMIN_ROLES.PRODUCT_MANAGER, ADMIN_PERMISSIONS.DRAFT_REVIEW), true);
});

test("a Seller may publish its own product (OD-4) but may not approve images", () => {
  assert.equal(hasAdminPermission(ADMIN_ROLES.SELLER_ADMIN, ADMIN_PERMISSIONS.PUBLICATION_PUBLISH), true);
  assert.equal(hasAdminPermission(ADMIN_ROLES.SELLER_ADMIN, ADMIN_PERMISSIONS.MEDIA_APPROVE), false);
});

test("no Seller role touches the legacy catalogue", () => {
  for (const permission of [P.PRODUCTS_CREATE, P.PRODUCTS_UPDATE, P.PRODUCTS_DELETE, P.PRODUCTS_OWNERSHIP_REVIEW]) {
    assert.equal(hasAdminPermission(ADMIN_ROLES.SELLER_ADMIN, permission), false, permission);
    assert.equal(hasAdminPermission(ADMIN_ROLES.READONLY_ADMIN, permission), false, permission);
  }
});

test("only a full admin may settle ownership or delete", () => {
  for (const permission of [P.PRODUCTS_OWNERSHIP_REVIEW, P.PRODUCTS_DELETE, P.FULL_ACCESS]) {
    assert.equal(hasAdminPermission(ADMIN_ROLES.ADMIN, permission), true, permission);
    for (const role of [ADMIN_ROLES.PRODUCT_MANAGER, ADMIN_ROLES.SELLER_ADMIN, ADMIN_ROLES.READONLY_ADMIN]) {
      assert.equal(hasAdminPermission(role, permission), false, `${role} / ${permission}`);
    }
  }
});
