import { ADMIN_PERMISSIONS, hasAdminPermission } from "./adminPermissions.js";

/**
 * Who may read a file under /uploads when that file belongs to a post.
 *
 * servePublicUpload used to send every non-document file to anyone who knew
 * the URL. Hiding a post, archiving it (the delete route), or marking it
 * private only changed the row. The bytes stayed at the same address, and the
 * response was cached as public and immutable for a year, so a hide would not
 * have stopped a browser that had already fetched it.
 *
 * A post file is public only while at least one post that uses it is
 * published, public, and not archived. Hidden, archived, private, and review
 * are not sent to anyone else. The owner can still read it, and so can a
 * platform admin who may use the moderation queue. The file is never removed:
 * restoring the post makes the same URL public again.
 *
 * A file that is not a post (catalogue images, and an upload that has not
 * been posted yet) is unchanged. The caller keeps the long public cache for
 * those.
 */

export const PUBLIC_POST_FILE_CACHE = "public, max-age=0, must-revalidate";
export const RESTRICTED_POST_FILE_CACHE = "private, no-store";

export const POSTS_FOR_UPLOAD_SQL = `
  select post.user_id, post.archived, post.moderation_status, post.visibility
  from public.user_uploads upload
  join public.social_posts post on post.upload_id = upload.id
  where upload.storage_key = $1
`;

const archived = (post) => post.archived === true || post.archived === "t" || post.archived === "true";

export const postFileIsPublic = (post) => (
  !archived(post)
  && post.moderation_status === "published"
  && post.visibility === "public"
);

/**
 * A platform admin, fully signed in. Seller and product roles do not hold
 * the moderation permission, and a password session that still owes a second
 * factor is not treated as signed in.
 */
export const adminMayReadRestrictedFile = (admin, { twoFactorEnabled = false } = {}) => {
  if (!admin) return false;
  if (admin.must_change_password) return false;
  const apiKey = admin.id === "api-key" || admin.identity_source === "api_key";
  if (!apiKey && twoFactorEnabled && admin.mfa_verified !== true) return false;
  return hasAdminPermission(admin.role, ADMIN_PERMISSIONS.FULL_ACCESS);
};

const sameUser = (post, userId) => Boolean(userId) && post.user_id === userId;

/**
 * @param {Array<{ user_id: string, archived: boolean, moderation_status: string, visibility: string }>} posts
 * @param {{ userId?: string | null, isAdmin?: boolean }} [viewer]
 * @returns {{ allow: boolean, restricted: boolean, cacheControl: string | null }}
 */
export const decidePostUploadAccess = (posts, viewer = {}) => {
  const rows = Array.isArray(posts) ? posts : [];
  if (rows.length === 0) {
    return { allow: true, restricted: false, cacheControl: null };
  }
  if (rows.some(postFileIsPublic)) {
    return { allow: true, restricted: false, cacheControl: PUBLIC_POST_FILE_CACHE };
  }
  const userId = viewer.userId || null;
  const allowed = viewer.isAdmin === true || rows.some((post) => sameUser(post, userId));
  if (!allowed) return { allow: false, restricted: true, cacheControl: null };
  return { allow: true, restricted: true, cacheControl: RESTRICTED_POST_FILE_CACHE };
};

export const listPostsForUploadKey = async (pool, storageKey) => {
  const result = await pool.query(POSTS_FOR_UPLOAD_SQL, [storageKey]);
  return result.rows || [];
};
