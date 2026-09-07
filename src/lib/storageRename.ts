/**
 * Carries browser storage across the petid → mipo rename.
 *
 * The rename changed the keys these values live under. Without this, everyone
 * with the app already open loses their cart, their favourites, their theme and
 * accessibility settings, gets shown onboarding again, and drops whatever was
 * waiting in the offline queue. The keys are invisible to users; the data is
 * not.
 *
 * Runs once per browser: it copies each old key to its new name only when the
 * new one is absent, so a value written since the rename always wins, then
 * removes the old key. Safe to call on every boot — after the first pass there
 * is nothing left to move.
 */

const RENAMED_KEYS = [
  "petid-accessibility",
  "petid-cart",
  "petid-favorites",
  "petid-offline-queue",
  "petid-onboarding-complete",
  "petid-search-history",
  "petid-theme",
  "petid_feed_last_visit",
  "petid_feed_onboarding_v2",
  "petid_feed_streak",
  "petid_shown_hints",
] as const;

const newNameFor = (key: string) => key.replace(/^petid/, "mipo");

const migrateStore = (store: Storage) => {
  for (const oldKey of RENAMED_KEYS) {
    let value: string | null;
    try {
      value = store.getItem(oldKey);
    } catch {
      // A store that throws on read (private mode, blocked site data) has
      // nothing to migrate.
      return;
    }
    if (value === null) continue;

    try {
      const newKey = newNameFor(oldKey);
      if (store.getItem(newKey) === null) store.setItem(newKey, value);
      store.removeItem(oldKey);
    } catch {
      // Out of quota or blocked: leave the old key in place rather than lose
      // the value, and try again next boot.
    }
  }
};

export const migrateRenamedStorage = () => {
  if (typeof window === "undefined") return;
  migrateStore(window.localStorage);
  migrateStore(window.sessionStorage);
};
