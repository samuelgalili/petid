import assert from "node:assert/strict";
import test from "node:test";

import { compileRoutePattern, isProductionRoute, productionRoutePatterns } from "../src/knownRoutes.js";

test("dev-only routes are unknown in production", () => {
  const source = `
    // { path: "/from-a-comment" }
    const devPetAvatarRoutes = import.meta.env.DEV
      ? [{ path: "/dev/pet-avatar" }]
      : [];
    if (import.meta.env.DEV) {
      const hidden = [{ path: "/dev/inside-if" }];
    }
    const kept = !import.meta.env.DEV ? [{ path: "/shop" }] : [{ path: "/dev/negated" }];
    const extra = import.meta.env.DEV && [{ path: "/dev/and" }];
    export const allRoutes = [
      { path: "/support" },
      { path: "*" },
      ...devPetAvatarRoutes,
      ...kept,
      ...extra,
    ];
  `;
  assert.deepEqual(productionRoutePatterns(source), ["/shop", "/support"]);
  const withDev = productionRoutePatterns(source, "", { includeDev: true });
  assert.deepEqual(
    withDev.filter((pattern) => !productionRoutePatterns(source).includes(pattern)).sort(),
    ["/dev/and", "/dev/inside-if", "/dev/negated", "/dev/pet-avatar"],
  );
});

test("legacy path arrays and planned screens are routes, and a prefix is not", () => {
  const routes = `
    const legacyAdminPaths = ["/admin/growo", "/admin/audit"];
    const legacyAdminRedirects = legacyAdminPaths.map((path) => ({ path, element: null }));
    export const adminRoutes = [
      { path: "/admin" },
      { path: "/admin/customers/:identityId" },
      ...PLANNED_SCREENS.map((screen) => ({ path: screen.href, element: null })),
      ...legacyAdminRedirects,
    ];
  `;
  const navigation = `
    export const ADMIN_SCREENS = [
      { href: "/admin", status: "ready" },
      { href: "/admin/leads", status: "planned" },
      { href: "/admin/customers", status: "ready" },
    ];
  `;
  assert.deepEqual(productionRoutePatterns(routes, navigation), [
    "/admin",
    "/admin/audit",
    "/admin/customers/:identityId",
    "/admin/growo",
    "/admin/leads",
  ]);
  const customers = compileRoutePattern("/admin/customers/:identityId");
  assert.equal(customers.regex.test("/admin/customers/abc"), true);
  assert.equal(customers.regex.test("/admin/customers/abc/extra"), false);
  assert.equal(isProductionRoute("/admin/not-a-real-screen"), false);
});
