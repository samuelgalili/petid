/**
 * Which admin actions need a recent second factor once two-factor is on.
 *
 * The flag itself is not read here. requireFreshAdminMfa is the no-op while
 * the feature is off, so a password session keeps doing these actions exactly
 * as it does today. This module only answers "is this one of those actions?"
 * so the HTTP layer cannot drift from the tests.
 *
 * A body we cannot read, on a route that can perform one of these actions,
 * is treated as the action. Failing open would let a malformed payload skip
 * the check and still be interpreted by the handler.
 */

const UUID = "[0-9a-fA-F-]{36}";
const productId = new RegExp(`^/api/products/${UUID}$`);
const couponId = new RegExp(`^/api/admin/coupons/${UUID}$`);
const orderId = new RegExp(`^/api/admin/orders/${UUID}$`);

const pathOf = (pathname) => {
  const path = String(pathname || "/").split("?")[0] || "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
};

const isObject = (body) => Boolean(body) && typeof body === "object" && !Array.isArray(body);

/**
 * A discretionary price change. Zero and an absent field are not one: the
 * order writer ignores both. A value that is present and not a finite number
 * is still the attempt, and it fails closed rather than being skipped.
 */
export const priceAdjustmentNeedsStepUp = (raw) => {
  if (raw === undefined || raw === null || raw === "") return false;
  const number = Number(raw);
  if (!Number.isFinite(number)) return true;
  return number !== 0;
};

/**
 * A manual order marks a payment when the method is admin-attested, and
 * adjusts a price when admin_adjustment is a real change. Any other manual
 * order (record now, collect on delivery) is not one of those actions.
 * A body that is not an object fails closed.
 */
export const manualOrderNeedsStepUp = (body) => {
  if (!isObject(body)) return true;
  if (String(body.payment_method || "") === "admin-attested") return true;
  return priceAdjustmentNeedsStepUp(body.admin_adjustment);
};

/**
 * True when this request is one of the sensitive admin actions:
 * manual payment marking, price adjustment, product delete, coupon
 * create/update/delete, connector connect/update/disconnect, customer edit.
 */
export const adminActionNeedsFreshMfa = ({ method = "GET", pathname = "/", body } = {}) => {
  const verb = String(method || "GET").toUpperCase();
  const path = pathOf(pathname);

  if (verb === "DELETE" && (path === "/api/products/bulk" || productId.test(path))) return true;

  if (verb === "POST" && path === "/api/admin/coupons") return true;
  if ((verb === "PATCH" || verb === "DELETE") && couponId.test(path)) return true;

  // Changing payment_status is the manual mark. Status, tracking and notes
  // on the same route are not. An unreadable body fails closed.
  if (verb === "PATCH" && orderId.test(path)) {
    if (!isObject(body)) return true;
    return Object.hasOwn(body, "payment_status");
  }

  if (verb === "POST" && path === "/api/admin/os/orders") return manualOrderNeedsStepUp(body);

  if (verb === "POST" && (path === "/api/admin/os/connectors" || path === "/api/admin/os/connectors/disconnect")) {
    return true;
  }

  if (verb === "PATCH" && path === "/api/admin/os/customers") return true;

  return false;
};
