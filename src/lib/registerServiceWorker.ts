/**
 * Registering the service worker, and reloading when it is replaced.
 *
 * THE SECOND HALF IS THE WHOLE POINT, and its absence is why every deploy
 * looked like it had not happened.
 *
 * vite-plugin-pwa generated this registration:
 *
 *   navigator.serviceWorker.register('/sw.js', { scope: '/' })
 *
 * and nothing else. With `strategies: "injectManifest"` the plugin does NOT
 * inject update handling — that comes from `virtual:pwa-register`, which
 * nothing in this app imported. So `registerType: "autoUpdate"` was a setting
 * with no code behind it.
 *
 * What that produced, on every deploy:
 *
 *   1. The page loads. The OLD worker is in control, and sw.ts routes every
 *      navigation to the precached /index.html — which names the OLD hashed
 *      bundles. The old app renders.
 *   2. The browser fetches /sw.js in the background, sees a new one, installs
 *      it. skipWaiting() and clients.claim() put it in control.
 *   3. AND NOTHING RELOADS. The page is already running the old bundle.
 *
 * Claiming control does not re-run a page. In an app where navigation is
 * client-side, step 3 can last until the person force-refreshes — which is
 * exactly the report "I deployed and the shop is still the old one", twice.
 *
 * The fix is one event. `controllerchange` fires when a new worker takes over,
 * and that is the moment the page is running code the worker no longer serves.
 */

let reloading = false;

export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  // Whether a worker was ALREADY controlling this page when it loaded.
  //
  // This is the difference between an update and a first install, and getting
  // it wrong is a reload loop: on a first visit the worker claims a page that
  // was never stale, and reloading there would do it again on every load.
  const hadController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    // reload() rather than a router navigation: the point is to re-request
    // index.html through the NEW worker and pick up the new bundle names. A
    // client-side route change would keep the old JS in memory.
    window.location.reload();
  });

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
      // A tab left open for days never navigates, so it never asks whether
      // there is a new worker. Checking hourly means a deploy reaches an open
      // tab within the hour instead of whenever someone happens to reload.
      setInterval(() => { void registration.update(); }, 60 * 60 * 1000);
    }).catch(() => {
      // A failed registration is not worth an error to the user: the app works
      // without the worker, it is simply not installable or offline-capable.
    });
  });
};
