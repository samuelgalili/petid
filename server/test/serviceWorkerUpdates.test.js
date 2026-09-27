// A new build has to replace the running one.
//
// This is the defect that made every deploy in this session look like it had
// not happened, and it is worth writing down precisely because nothing about
// it is visible: CI is green, the artefact is on the server, the smoke test
// passes against the deployed environment, and the person opening the site
// sees last week's app.
//
// vite-plugin-pwa generated this, and only this:
//
//   navigator.serviceWorker.register('/sw.js', { scope: '/' })
//
// With `strategies: "injectManifest"` the plugin does not inject update
// handling - that lives in `virtual:pwa-register`, which nothing imported. So
// `registerType: "autoUpdate"` was a configuration line with no code behind
// it. The old worker kept serving the precached index.html, which names the
// old bundles, and the new worker took control of a page that never re-ran.
//
// The rules below are the three pieces that have to stay true together. Any
// one of them alone is the same silent failure.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

const REGISTRAR = "src/lib/registerServiceWorker.ts";

test("the app registers the worker itself", () => {
  // If the plugin is generating registerSW.js again, it is generating the
  // version that only calls register(), and the reload below is dead code
  // because nothing loads the module it lives in.
  const config = read("vite.config.ts");
  assert.match(
    config,
    /injectRegister:\s*false/,
    "vite.config.ts no longer sets injectRegister: false, so the plugin is emitting\n" +
      "its own registerSW.js again - which registers the worker and never updates it.",
  );

  const main = read("src/main.tsx");
  assert.match(main, /registerServiceWorker\(\)/, "main.tsx no longer registers the service worker");
});

test("a worker taking control reloads the page", () => {
  // THE LOAD-BEARING LINE. Claiming control does not re-run a page: the tab is
  // already executing the old bundle. Without this, an app whose navigation is
  // client-side can stay on a stale build until someone force-refreshes.
  const source = read(REGISTRAR);
  assert.match(
    source,
    /addEventListener\("controllerchange"/,
    "Nothing listens for controllerchange, so a new worker takes over a page that\n" +
      "keeps running the old bundle. This is the exact failure this file exists for.",
  );
  assert.match(source, /location\.reload\(\)/, "controllerchange no longer reloads");
});

test("the reload cannot loop on a first install", () => {
  // The obvious fix reloads on every controllerchange, and on a FIRST visit
  // the worker claims a page that was never stale - so it reloads, claims
  // again, and the site never finishes loading. The guard is whether a worker
  // was already in control when the page loaded.
  const source = read(REGISTRAR);
  assert.match(
    source,
    /navigator\.serviceWorker\.controller/,
    "The reload no longer distinguishes an update from a first install, which is a\n" +
      "reload loop on a visitor's first ever page view.",
  );
  assert.match(
    source,
    /if \(!hadController \|\| reloading\) return;/,
    "The loop guard changed shape. It must return on a first install AND on a\n" +
      "second controllerchange within the same page.",
  );
});

test("an open tab still finds out about a deploy", () => {
  // A tab left open for days never navigates, so it never asks whether there
  // is a new worker. Without a periodic check, "reload on controllerchange"
  // only helps people who were going to reload anyway.
  const source = read(REGISTRAR);
  assert.match(
    source,
    /registration\.update\(\)/,
    "Nothing calls registration.update(), so an open tab only learns about a new\n" +
      "build when the browser happens to check - which for an SPA can be never.",
  );
});

test("the worker still serves navigations from the precache", () => {
  // The reload is only correct BECAUSE of this: the second request for
  // index.html goes through the new worker and gets the new bundle names. If
  // navigations stopped being precache-backed, the reload would be solving a
  // problem that no longer exists in that form - and this test should be
  // re-read rather than deleted.
  const sw = read("src/sw.ts");
  assert.match(sw, /createHandlerBoundToURL\("\/index\.html"\)/);
  assert.match(sw, /skipWaiting\(\)/);
  assert.match(sw, /clients\.claim\(\)/);
});
