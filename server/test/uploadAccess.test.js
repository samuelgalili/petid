// A hidden, archived, or private post must not keep serving its file to
// strangers. The bytes stay on disk: the owner and a platform admin can still
// read them, and publishing the post again makes the same URL public.
//
// The HTTP handler lives in index.js, which starts a server on import, so
// these tests cover the decision and pin the wiring that turns a refusal
// into the existing 404.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ADMIN_ROLES } from "../src/adminPermissions.js";
import {
  POSTS_FOR_UPLOAD_SQL,
  PUBLIC_POST_FILE_CACHE,
  RESTRICTED_POST_FILE_CACHE,
  adminMayReadRestrictedFile,
  decidePostUploadAccess,
  listPostsForUploadKey,
  postFileIsPublic,
} from "../src/uploadAccess.js";

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const storageKey = "1710000000000-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg";

const post = (overrides = {}) => ({
  user_id: ownerId,
  archived: false,
  moderation_status: "published",
  visibility: "public",
  ...overrides,
});

const stranger = { userId: null, isAdmin: false };
const owner = { userId: ownerId, isAdmin: false };
const other = { userId: otherId, isAdmin: false };
const admin = { userId: null, isAdmin: true };

test("a file that is not a post stays publicly cacheable", () => {
  const access = decidePostUploadAccess([]);
  assert.equal(access.allow, true);
  assert.equal(access.restricted, false);
  assert.equal(access.cacheControl, null);
});

test("a published public post is served, and the cache must revalidate", () => {
  const access = decidePostUploadAccess([post()], stranger);
  assert.equal(access.allow, true);
  assert.equal(access.restricted, false);
  assert.equal(access.cacheControl, PUBLIC_POST_FILE_CACHE);
  assert.equal(PUBLIC_POST_FILE_CACHE.includes("immutable"), false);
  assert.equal(PUBLIC_POST_FILE_CACHE.includes("max-age=31536000"), false);
  assert.match(PUBLIC_POST_FILE_CACHE, /must-revalidate/);
});

test("a hidden post is refused to strangers and to other members", () => {
  const hidden = post({ moderation_status: "hidden" });
  assert.equal(postFileIsPublic(hidden), false);
  assert.equal(decidePostUploadAccess([hidden], stranger).allow, false);
  assert.equal(decidePostUploadAccess([hidden], other).allow, false);
  assert.equal(decidePostUploadAccess([hidden]).allow, false);
});

test("the owner and an admin can still read a hidden post, without a shared cache", () => {
  const hidden = post({ moderation_status: "hidden" });
  for (const viewer of [owner, admin]) {
    const access = decidePostUploadAccess([hidden], viewer);
    assert.equal(access.allow, true);
    assert.equal(access.restricted, true);
    assert.equal(access.cacheControl, RESTRICTED_POST_FILE_CACHE);
    assert.match(access.cacheControl, /private/);
    assert.match(access.cacheControl, /no-store/);
  }
});

test("an archived post is the delete route, and its file is not public", () => {
  const deleted = post({ archived: true });
  assert.equal(decidePostUploadAccess([deleted], stranger).allow, false);
  assert.equal(decidePostUploadAccess([deleted], owner).allow, true);
  assert.equal(decidePostUploadAccess([deleted], admin).allow, true);
  assert.equal(decidePostUploadAccess([post({ archived: "t" })], stranger).allow, false);
});

test("a private post is not served to anyone except the owner and an admin", () => {
  const privatePost = post({ visibility: "private" });
  assert.equal(decidePostUploadAccess([privatePost], stranger).allow, false);
  assert.equal(decidePostUploadAccess([privatePost], other).allow, false);
  assert.equal(decidePostUploadAccess([privatePost], owner).allow, true);
  assert.equal(decidePostUploadAccess([privatePost], admin).allow, true);
});

test("a post waiting in review is not public", () => {
  const review = post({ moderation_status: "review" });
  assert.equal(decidePostUploadAccess([review], stranger).allow, false);
  assert.equal(decidePostUploadAccess([review], owner).allow, true);
});

test("restoring a hidden post makes the file public again", () => {
  const hidden = post({ moderation_status: "hidden" });
  assert.equal(decidePostUploadAccess([hidden], stranger).allow, false);
  const restored = post({ moderation_status: "published" });
  const access = decidePostUploadAccess([restored], stranger);
  assert.equal(access.allow, true);
  assert.equal(access.restricted, false);
  assert.equal(access.cacheControl, PUBLIC_POST_FILE_CACHE);
});

test("one public post keeps a shared file servable even if another post on it is hidden", () => {
  const access = decidePostUploadAccess([
    post({ moderation_status: "hidden" }),
    post(),
  ], stranger);
  assert.equal(access.allow, true);
  assert.equal(access.restricted, false);
});

test("a file used only by restricted posts stays restricted", () => {
  const access = decidePostUploadAccess([
    post({ visibility: "private" }),
    post({ archived: true }),
  ], stranger);
  assert.equal(access.allow, false);
  assert.equal(decidePostUploadAccess([
    post({ visibility: "private" }),
    post({ archived: true }),
  ], owner).allow, true);
});

test("the lookup reads post state and does not change stored rows", async () => {
  assert.match(POSTS_FOR_UPLOAD_SQL, /upload\.storage_key = \$1/);
  assert.match(POSTS_FOR_UPLOAD_SQL, /social_posts/);
  assert.match(POSTS_FOR_UPLOAD_SQL, /moderation_status/);
  assert.match(POSTS_FOR_UPLOAD_SQL, /visibility/);
  assert.match(POSTS_FOR_UPLOAD_SQL, /archived/);
  assert.doesNotMatch(POSTS_FOR_UPLOAD_SQL, /\b(delete|update|insert|truncate|drop)\b/i);

  let seen = null;
  const rows = [post({ moderation_status: "hidden" })];
  const loaded = await listPostsForUploadKey({
    query: async (sql, params) => {
      seen = { sql, params };
      return { rows };
    },
  }, storageKey);
  assert.equal(seen.sql, POSTS_FOR_UPLOAD_SQL);
  assert.deepEqual(seen.params, [storageKey]);
  assert.equal(loaded, rows);
});

test("only a fully signed-in platform admin may read a restricted file", () => {
  const platform = { id: "admin-1", role: ADMIN_ROLES.ADMIN, mfa_verified: true };
  assert.equal(adminMayReadRestrictedFile(platform, { twoFactorEnabled: false }), true);
  assert.equal(adminMayReadRestrictedFile(platform, { twoFactorEnabled: true }), true);
  assert.equal(adminMayReadRestrictedFile(
    { ...platform, mfa_verified: false },
    { twoFactorEnabled: true },
  ), false);
  assert.equal(adminMayReadRestrictedFile(
    { ...platform, must_change_password: true },
    { twoFactorEnabled: false },
  ), false);
  assert.equal(adminMayReadRestrictedFile(
    { id: "api-key", role: ADMIN_ROLES.ADMIN, identity_source: "api_key" },
    { twoFactorEnabled: true },
  ), true);
  assert.equal(adminMayReadRestrictedFile(
    { id: "seller-1", role: ADMIN_ROLES.SELLER_ADMIN, mfa_verified: true },
    { twoFactorEnabled: false },
  ), false);
  assert.equal(adminMayReadRestrictedFile(
    { id: "pm-1", role: ADMIN_ROLES.PRODUCT_MANAGER, mfa_verified: true },
    { twoFactorEnabled: false },
  ), false);
  assert.equal(adminMayReadRestrictedFile(null), false);
});

test("the upload route asks for that decision and a refusal stays a 404", () => {
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  const start = source.indexOf("const servePublicUpload");
  const end = source.indexOf("const renderPublicPage");
  const body = source.slice(start, end);
  assert.ok(start > 0 && end > start);

  const decisionAt = body.indexOf("decidePostUploadAccess");
  const readAt = body.indexOf("readFile");
  assert.ok(decisionAt > 0 && readAt > decisionAt, "the file is read only after the post check");
  assert.match(body, /if \(!access\.allow\) return false/);
  assert.match(body, /cacheControl: access\.cacheControl/);
  assert.doesNotMatch(body, /\bunlink\b/);

  assert.match(
    source,
    /if \(!\(await servePublicUpload\(request, response, url\.pathname\)\)\) \{\s*sendError\(response, 404, "File not found"\)/,
  );
  assert.match(source, /"cache-control": "no-store"/);
});
