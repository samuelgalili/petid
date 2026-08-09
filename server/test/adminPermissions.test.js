import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  getAdminPermissions,
  hasAdminPermission,
  isSupportedAdminRole,
} from "../src/adminPermissions.js";

test("full admins retain every permission", () => {
  assert.equal(hasAdminPermission(ADMIN_ROLES.ADMIN, ADMIN_PERMISSIONS.FULL_ACCESS), true);
  assert.equal(hasAdminPermission(ADMIN_ROLES.ADMIN, ADMIN_PERMISSIONS.PRODUCTS_DELETE), true);
  assert.deepEqual(getAdminPermissions(ADMIN_ROLES.ADMIN), ["*"]);
});

test("product managers can manage products without destructive or global admin access", () => {
  assert.equal(hasAdminPermission(ADMIN_ROLES.PRODUCT_MANAGER, ADMIN_PERMISSIONS.PRODUCTS_READ), true);
  assert.equal(hasAdminPermission(ADMIN_ROLES.PRODUCT_MANAGER, ADMIN_PERMISSIONS.PRODUCTS_CREATE), true);
  assert.equal(hasAdminPermission(ADMIN_ROLES.PRODUCT_MANAGER, ADMIN_PERMISSIONS.PRODUCTS_UPDATE), true);
  assert.equal(hasAdminPermission(ADMIN_ROLES.PRODUCT_MANAGER, ADMIN_PERMISSIONS.PRODUCT_ASSETS_UPLOAD), true);
  assert.equal(hasAdminPermission(ADMIN_ROLES.PRODUCT_MANAGER, ADMIN_PERMISSIONS.PRODUCT_TOOLS_USE), true);
  assert.equal(hasAdminPermission(ADMIN_ROLES.PRODUCT_MANAGER, ADMIN_PERMISSIONS.PRODUCTS_DELETE), false);
  assert.equal(hasAdminPermission(ADMIN_ROLES.PRODUCT_MANAGER, ADMIN_PERMISSIONS.FULL_ACCESS), false);
});

test("unknown admin roles receive no permissions", () => {
  assert.equal(isSupportedAdminRole("admin"), true);
  assert.equal(isSupportedAdminRole("product_manager"), true);
  assert.equal(isSupportedAdminRole("unknown"), false);
  assert.deepEqual(getAdminPermissions("unknown"), []);
  assert.equal(hasAdminPermission("unknown", ADMIN_PERMISSIONS.PRODUCTS_READ), false);
});
