// Which URLs are real pages in production.
//
// The source of truth is src/routes/index.tsx: static paths, param patterns,
// the legacy admin redirects, and the planned admin screens (their hrefs live
// in src/components/admin/adminNavigation.ts). This module does not import
// those files — the API image only contains server/. The patterns below are
// that table with dev-only routes removed, and server/test/publicPages.test.js
// re-reads the route table and fails if the two disagree.
//
// A route that exists only when import.meta.env.DEV is true is not in the
// production bundle, so it is not a known page here. The SPA catch-all ("*")
// is the not-found screen, not a page.

const DEV_TOKEN = "import.meta.env.DEV";

const skipString = (source, start) => {
  const quote = source[start];
  let i = start + 1;
  if (quote === "`") {
    while (i < source.length) {
      if (source[i] === "\\") {
        i += 2;
        continue;
      }
      if (source[i] === "`") return i + 1;
      if (source[i] === "$" && source[i + 1] === "{") {
        i += 2;
        let depth = 1;
        while (i < source.length && depth > 0) {
          const c = source[i];
          if (c === "\"" || c === "'" || c === "`") {
            i = skipString(source, i);
            continue;
          }
          if (c === "{") depth += 1;
          else if (c === "}") depth -= 1;
          i += 1;
        }
        continue;
      }
      i += 1;
    }
    return i;
  }
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] === quote) return i + 1;
    if (source[i] === "\n") return i;
    i += 1;
  }
  return i;
};

export const stripComments = (source) => {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === "\"" || c === "'" || c === "`") {
      const end = skipString(source, i);
      out += source.slice(i, end);
      i = end;
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      i = end === -1 ? source.length : end;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      out += " ";
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
};

const matchingCloser = (source, openIndex) => {
  let depth = 0;
  let i = openIndex;
  while (i < source.length) {
    const c = source[i];
    if (c === "\"" || c === "'" || c === "`") {
      i = skipString(source, i);
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return source.length;
};

const indexOfToken = (source, from, token) => {
  let i = from;
  while (i < source.length) {
    const c = source[i];
    if (c === "\"" || c === "'" || c === "`") {
      i = skipString(source, i);
      continue;
    }
    if (source.startsWith(token, i)) {
      const before = source[i - 1];
      const after = source[i + token.length];
      const ident = /[A-Za-z0-9_$]/;
      if (before && ident.test(before)) {
        i += 1;
        continue;
      }
      if (after && ident.test(after)) {
        i += 1;
        continue;
      }
      return i;
    }
    i += 1;
  }
  return -1;
};

// Read one expression. A `:` or `;` or `,` at depth 0 ends it, so this is also
// how a ternary consequent stops before its alternate.
const readExpression = (source, start) => {
  let stack = 0;
  let tern = 0;
  let i = start;
  while (i < source.length) {
    const c = source[i];
    if (c === "\"" || c === "'" || c === "`") {
      i = skipString(source, i);
      continue;
    }
    if (c === "(" || c === "[" || c === "{") {
      stack += 1;
    } else if (c === ")" || c === "]" || c === "}") {
      if (stack === 0) break;
      stack -= 1;
    } else if (c === "?" && stack === 0) {
      tern += 1;
    } else if (c === ":" && stack === 0) {
      if (tern === 0) break;
      tern -= 1;
    } else if ((c === ";" || c === ",") && stack === 0 && tern === 0) {
      break;
    }
    i += 1;
  }
  return { text: source.slice(start, i), end: i };
};

const devExpressionStart = (source, tokenAt) => {
  let k = tokenAt - 1;
  while (k >= 0 && /\s/.test(source[k])) k -= 1;
  return source[k] === "!" ? k : tokenAt;
};

const ifBefore = (source, exprStart) => {
  let k = exprStart - 1;
  while (k >= 0 && /\s/.test(source[k])) k -= 1;
  if (source[k] !== "(") return null;
  k -= 1;
  while (k >= 0 && /\s/.test(source[k])) k -= 1;
  if (source.slice(k - 1, k + 1) !== "if") return null;
  const start = k - 1;
  const before = source[start - 1];
  if (before && /[A-Za-z0-9_$]/.test(before)) return null;
  return start;
};

// Drop routes that are compiled only in dev. `vite build` constant-folds
// import.meta.env.DEV to false, and those pages are absent from the bundle.
export const productionRouteSource = (source) => {
  let result = "";
  let i = 0;
  while (i < source.length) {
    const at = indexOfToken(source, i, DEV_TOKEN);
    if (at === -1) {
      result += source.slice(i);
      break;
    }
    const negated = devExpressionStart(source, at) < at;
    const exprStart = devExpressionStart(source, at);
    let j = at + DEV_TOKEN.length;
    while (j < source.length && /\s/.test(source[j])) j += 1;

    const ifStart = ifBefore(source, exprStart);
    if (ifStart !== null && source[j] === ")") {
      let k = j + 1;
      while (k < source.length && /\s/.test(source[k])) k += 1;
      if (source[k] === "{") {
        const end = matchingCloser(source, k);
        result += source.slice(i, ifStart);
        if (negated) result += source.slice(k + 1, end);
        i = end + 1;
        continue;
      }
    }

    if (source[j] === "?") {
      const consequent = readExpression(source, j + 1);
      if (source[consequent.end] !== ":") {
        result += source.slice(i, j);
        i = j;
        continue;
      }
      const alternate = readExpression(source, consequent.end + 1);
      result += source.slice(i, exprStart);
      result += negated ? consequent.text : alternate.text;
      i = alternate.end;
      continue;
    }

    if (source.startsWith("&&", j)) {
      const expr = readExpression(source, j + 2);
      result += source.slice(i, exprStart);
      if (negated) result += expr.text;
      i = expr.end;
      continue;
    }

    result += source.slice(i, j);
    i = j;
  }
  return result;
};

const pathArraysUsedAsRoutes = (source) => {
  const paths = [];
  const decl = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*\[/g;
  for (const match of source.matchAll(decl)) {
    const name = match[1];
    const open = match.index + match[0].length - 1;
    const close = matchingCloser(source, open);
    const used = new RegExp(`\\b${name}\\.map\\b|\\.\\.\\.${name}\\b`).test(source);
    if (!used) continue;
    const body = source.slice(open + 1, close);
    for (const item of body.matchAll(/(["'`])(\/[^"'`]*)\1/g)) paths.push(item[2]);
  }
  return paths;
};

export const plannedScreenHrefs = (navigationSource) => {
  const clean = stripComments(String(navigationSource || ""));
  const hrefs = [];
  const re = /href\s*:\s*(["'`])(\/[^"'`]*)\1/g;
  for (const match of clean.matchAll(re)) {
    const next = clean.indexOf("href", match.index + 4);
    const window = clean.slice(match.index, next === -1 ? match.index + 800 : next);
    const status = window.match(/status\s*:\s*(["'`])(planned|ready)\1/);
    if (status?.[2] === "planned") hrefs.push(match[2]);
  }
  return hrefs;
};

export const navigationScreenHrefs = (navigationSource) => {
  const clean = stripComments(String(navigationSource || ""));
  return [...clean.matchAll(/href\s*:\s*(["'`])(\/[^"'`]*)\1/g)].map((match) => match[2]);
};

const routePathLiterals = (source) => {
  const paths = [];
  for (const match of source.matchAll(/path\s*:\s*(["'`])([^"'`]+)\1/g)) paths.push(match[2]);
  return paths;
};

export const productionRoutePatterns = (routesSource, navigationSource = "", options = {}) => {
  const stripped = stripComments(String(routesSource || ""));
  const production = options.includeDev ? stripped : productionRouteSource(stripped);
  const paths = new Set();
  for (const routePath of routePathLiterals(production)) {
    if (routePath !== "*") paths.add(routePath);
  }
  for (const routePath of pathArraysUsedAsRoutes(production)) {
    if (routePath !== "*") paths.add(routePath);
  }
  const usesPlannedScreens = /PLANNED_SCREENS\s*\.map\s*\(/.test(production)
    && /path\s*:\s*[A-Za-z_$][\w$]*\.href/.test(production);
  if (usesPlannedScreens) {
    const planned = plannedScreenHrefs(navigationSource);
    if (planned.length === 0) {
      throw new Error("PLANNED_SCREENS is routed, but no planned href was found in the navigation source");
    }
    for (const href of planned) paths.add(href);
  }
  return [...paths].sort();
};

const escapeSegment = (segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const compileRoutePattern = (routePath) => {
  if (routePath === "*" || routePath === "/*") {
    throw new Error("the not-found catch-all is not a known page");
  }
  const dynamic = routePath.includes(":") || routePath.includes("*");
  if (!dynamic) return { pattern: routePath, exact: true, regex: null };
  const source = routePath.split("/").map((segment) => {
    if (segment === "*") return ".*";
    if (segment.startsWith(":")) return "[^/]+";
    return escapeSegment(segment);
  }).join("/");
  return { pattern: routePath, exact: false, regex: new RegExp(`^${source}$`) };
};

// Production half of src/routes/index.tsx, sorted. The public-page test
// re-parses that file and fails if a route was added or removed.
export const PRODUCTION_ROUTE_PATTERNS = [
  "/",
  "/accessibility",
  "/ad-campaigns",
  "/add-pet",
  "/admin",
  "/admin/action-center",
  "/admin/adoption",
  "/admin/ai-economics",
  "/admin/ai-os",
  "/admin/ai-os-admin",
  "/admin/ai-service",
  "/admin/analytics",
  "/admin/approval-queue",
  "/admin/approvals",
  "/admin/architect",
  "/admin/audit",
  "/admin/audit-log",
  "/admin/automations",
  "/admin/backup",
  "/admin/blog",
  "/admin/bot-activity",
  "/admin/brain-dashboard",
  "/admin/branches",
  "/admin/business",
  "/admin/calendar",
  "/admin/categories",
  "/admin/ceo",
  "/admin/change-password",
  "/admin/command-center",
  "/admin/communication",
  "/admin/compliance-finance",
  "/admin/connectors",
  "/admin/content-bot",
  "/admin/content-calendar",
  "/admin/control-room",
  "/admin/coupons",
  "/admin/crm",
  "/admin/customers",
  "/admin/customers/:identityId",
  "/admin/data-hub",
  "/admin/data-import",
  "/admin/debts",
  "/admin/documents",
  "/admin/employees",
  "/admin/expenses",
  "/admin/feed-manager",
  "/admin/financial",
  "/admin/growo",
  "/admin/health-check",
  "/admin/helpdesk",
  "/admin/integration-hub",
  "/admin/integrations",
  "/admin/inventory",
  "/admin/inventory-predictions",
  "/admin/invoices",
  "/admin/leads",
  "/admin/login",
  "/admin/marketing",
  "/admin/notification-rules",
  "/admin/notifications",
  "/admin/ocr-verification",
  "/admin/orders",
  "/admin/parks",
  "/admin/pet-services",
  "/admin/pricing",
  "/admin/products",
  "/admin/prometheus",
  "/admin/publishing",
  "/admin/purchase-orders",
  "/admin/quick-import",
  "/admin/reports",
  "/admin/research-lab",
  "/admin/returns",
  "/admin/review-queue",
  "/admin/robot-fleet",
  "/admin/roles",
  "/admin/scraper",
  "/admin/segments",
  "/admin/settings",
  "/admin/shipping",
  "/admin/shipping-settings",
  "/admin/smart-calendar",
  "/admin/smart-editor",
  "/admin/sovereign",
  "/admin/stories",
  "/admin/supplier-negotiation",
  "/admin/suppliers",
  "/admin/tasks",
  "/admin/test-suite",
  "/admin/time-tracking",
  "/admin/transactions",
  "/admin/two-factor",
  "/admin/user-timeline",
  "/admin/users",
  "/admin/vendor-audit",
  "/admin/vendor-dashboard",
  "/admin/webhooks",
  "/admin/workflows",
  "/adoption",
  "/archived-pets",
  "/auth",
  "/auth/callback",
  "/breed-detect",
  "/breed-history/:petId",
  "/breed-quiz",
  "/breeds",
  "/business-crm",
  "/business-settings",
  "/business/:id",
  "/businesses",
  "/cart",
  "/chat",
  "/checkout",
  "/club-terms",
  "/convert-to-business",
  "/creator-analytics",
  "/creator-dashboard",
  "/data-deletion",
  "/documents",
  "/dog-parks",
  "/edit-pet/:petId",
  "/edit-profile",
  "/experiences",
  "/explore",
  "/factory",
  "/factory/auth",
  "/favorites",
  "/feed",
  "/forgot-password",
  "/found-pet/:petId",
  "/grooming",
  "/guides",
  "/highlight/:highlightId",
  "/install",
  "/insurance",
  "/live",
  "/live/:streamId",
  "/live/:streamId/broadcast",
  "/messages",
  "/messages/:userId",
  "/messages/new",
  "/notifications",
  "/old-feed",
  "/onboarding",
  "/order-confirmation",
  "/order-history",
  "/order-tracking/:orderId",
  "/owner-profile",
  "/parks",
  "/payment-failed",
  "/payment-success",
  "/pet-profile",
  "/pet-profile/:petId",
  "/pet/:petId",
  "/pet/:petId/*",
  "/photos",
  "/post/:postId",
  "/privacy-policy",
  "/privacy-settings",
  "/product-sourcing",
  "/product/:id",
  "/profile",
  "/profile/:userId",
  "/radar",
  "/reels",
  "/reorder-confirmation",
  "/reset-password",
  "/science",
  "/settings",
  "/shop",
  "/shop/explore",
  "/shop/feed",
  "/signup",
  "/smart-notifications",
  "/story/:userId",
  "/support",
  "/terms",
  "/training",
  "/user/:userId",
  "/verify-email",
];

const compiled = () => PRODUCTION_ROUTE_PATTERNS.map(compileRoutePattern);
let cached = null;
const compiledRoutes = () => {
  if (!cached || cached.source !== PRODUCTION_ROUTE_PATTERNS) {
    cached = { source: PRODUCTION_ROUTE_PATTERNS, routes: compiled() };
  }
  return cached.routes;
};

export const isProductionRoute = (pathname) => {
  for (const route of compiledRoutes()) {
    if (route.exact ? route.pattern === pathname : route.regex.test(pathname)) return true;
  }
  return false;
};
