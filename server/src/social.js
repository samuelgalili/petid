const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const optionalText = (value, maxLength) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) fail(`Text must be ${maxLength} characters or fewer`);
  return normalized;
};

const normalizePollOptions = (value) => {
  if (!Array.isArray(value)) return [];
  const options = value
    .map((option) => optionalText(option, 120))
    .filter(Boolean);
  if (options.length === 0) return [];
  if (options.length < 2 || options.length > 4) fail("A poll must have between 2 and 4 options");
  return options;
};

export const normalizeSocialPostInput = (body = {}) => {
  const uploadId = String(body.upload_id || body.uploadId || "").trim();
  if (!uuidPattern.test(uploadId)) fail("A valid uploaded media id is required");

  const petId = body.pet_id || body.petId || null;
  if (petId && !uuidPattern.test(String(petId))) fail("A valid pet id is required");

  const visibility = body.visibility === "private" ? "private" : "public";
  const pollQuestion = optionalText(body.poll_question || body.pollQuestion, 240);
  const pollOptions = normalizePollOptions(body.poll_options || body.pollOptions);
  if (pollQuestion && pollOptions.length === 0) fail("Poll options are required");
  if (!pollQuestion && pollOptions.length > 0) fail("A poll question is required");

  return {
    uploadId,
    petId: petId ? String(petId) : null,
    caption: optionalText(body.caption, 2000),
    location: optionalText(body.location, 160),
    visibility,
    allowComments: body.allow_comments !== false && body.allowComments !== false,
    pollQuestion,
    pollOptions,
  };
};

const serializePost = (row) => ({
  id: row.id,
  caption: row.caption || null,
  location: row.location || null,
  media_url: `/uploads/${row.storage_key}`,
  media_type: row.media_type,
  visibility: row.visibility,
  allow_comments: row.allow_comments,
  poll_question: row.poll_question || null,
  poll_options: Array.isArray(row.poll_options) ? row.poll_options : [],
  poll_results: Array.isArray(row.poll_results) ? row.poll_results.map(Number) : [],
  viewer_poll_option: row.viewer_poll_option === null || row.viewer_poll_option === undefined
    ? null
    : Number(row.viewer_poll_option),
  reaction_count: Number(row.reaction_count || 0),
  comment_count: Number(row.comment_count || 0),
  viewer_has_liked: Boolean(row.viewer_has_liked),
  viewer_has_saved: Boolean(row.viewer_has_saved),
  is_owner: Boolean(row.is_owner),
  published_at: row.published_at,
  creator: {
    id: row.user_id,
    display_name: row.creator_name || "Mipo",
    avatar_url: row.creator_avatar_url || null,
  },
  pet: row.pet_id ? {
    id: row.pet_id,
    name: row.pet_name,
    avatar_url: row.pet_avatar_url || null,
    type: row.pet_type || null,
    breed: row.pet_breed || null,
  } : null,
});

const postSelect = `
  select
    post.*,
    upload.storage_key,
    profile.full_name as creator_name,
    profile.avatar_url as creator_avatar_url,
    pet.name as pet_name,
    pet.avatar_url as pet_avatar_url,
    pet.type as pet_type,
    pet.breed as pet_breed,
    (post.user_id = $1) as is_owner,
    exists (
      select 1 from public.social_post_reactions reaction
      where reaction.post_id = post.id and reaction.user_id = $1
    ) as viewer_has_liked,
    exists (
      select 1 from public.social_post_saves saved
      where saved.post_id = post.id and saved.user_id = $1
    ) as viewer_has_saved,
    (select vote.option_index from public.social_poll_votes vote where vote.post_id = post.id and vote.user_id = $1) as viewer_poll_option,
    (select count(*) from public.social_post_reactions reaction where reaction.post_id = post.id) as reaction_count,
    (select count(*) from public.social_post_comments comment where comment.post_id = post.id and comment.status = 'published') as comment_count,
    coalesce((
      select jsonb_agg(coalesce(vote_counts.option_count, 0) order by options.option_index)
      from generate_series(0, jsonb_array_length(post.poll_options) - 1) as options(option_index)
      left join (
        select vote.option_index, count(*)::int as option_count
        from public.social_poll_votes vote
        where vote.post_id = post.id
        group by vote.option_index
      ) vote_counts on vote_counts.option_index = options.option_index
    ), '[]'::jsonb) as poll_results
  from public.social_posts post
  join public.user_uploads upload on upload.id = post.upload_id
  left join public.profiles profile on profile.id = post.user_id
  left join public.pets pet on pet.id = post.pet_id
`;

export const listSocialFeed = async (pool, userId, { limit = 20, before = null, saved = false } = {}) => {
  const normalizedLimit = Math.min(40, Math.max(1, Number(limit) || 20));
  const values = [userId];
  const where = [
    "post.archived = false",
    "post.moderation_status = 'published'",
    "(post.visibility = 'public' or post.user_id = $1)",
  ];

  if (before) {
    const date = new Date(String(before));
    if (!Number.isNaN(date.getTime())) {
      values.push(date.toISOString());
      where.push(`post.published_at < $${values.length}`);
    }
  }

  if (saved) {
    where.push("exists (select 1 from public.social_post_saves saved_filter where saved_filter.post_id = post.id and saved_filter.user_id = $1)");
  }

  values.push(normalizedLimit);
  const result = await pool.query(
    `${postSelect}
      where ${where.join(" and ")}
      order by post.published_at desc, post.id desc
      limit $${values.length}`,
    values,
  );

  return result.rows.map(serializePost);
};

export const getSocialPost = async (pool, userId, postId) => {
  if (!uuidPattern.test(String(postId || ""))) return null;
  const result = await pool.query(
    `${postSelect}
      where post.id = $2
        and post.archived = false
        and post.moderation_status = 'published'
        and (post.visibility = 'public' or post.user_id = $1)
      limit 1`,
    [userId, postId],
  );
  return result.rows[0] ? serializePost(result.rows[0]) : null;
};

export const createSocialPost = async (pool, userId, body) => {
  const payload = normalizeSocialPostInput(body);
  const uploadResult = await pool.query(
    "select id, storage_key, content_type from public.user_uploads where id = $1 and user_id = $2 limit 1",
    [payload.uploadId, userId],
  );
  if (uploadResult.rowCount === 0) fail("Uploaded media was not found", 404);

  if (payload.petId) {
    const petResult = await pool.query(
      "select id from public.pets where id = $1 and user_id = $2 and archived = false limit 1",
      [payload.petId, userId],
    );
    if (petResult.rowCount === 0) fail("Pet was not found", 404);
  }

  const upload = uploadResult.rows[0];
  const mediaType = String(upload.content_type).startsWith("video/") ? "video" : "image";
  const result = await pool.query(
    `
      insert into public.social_posts (
        user_id, pet_id, upload_id, caption, location, media_type,
        visibility, allow_comments, poll_question, poll_options
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
      returning id
    `,
    [
      userId,
      payload.petId,
      payload.uploadId,
      payload.caption,
      payload.location,
      mediaType,
      payload.visibility,
      payload.allowComments,
      payload.pollQuestion,
      JSON.stringify(payload.pollOptions),
    ],
  );

  return getSocialPost(pool, userId, result.rows[0].id);
};

export const archiveSocialPost = async (pool, userId, postId) => {
  if (!uuidPattern.test(String(postId || ""))) return false;
  const result = await pool.query(
    "update public.social_posts set archived = true, updated_at = now() where id = $1 and user_id = $2 and archived = false",
    [postId, userId],
  );
  return result.rowCount > 0;
};

const toggleJoin = async (pool, table, userId, postId) => {
  if (!uuidPattern.test(String(postId || ""))) fail("Post was not found", 404);
  const post = await getSocialPost(pool, userId, postId);
  if (!post) fail("Post was not found", 404);

  const inserted = await pool.query(
    `insert into public.${table} (post_id, user_id) values ($1, $2) on conflict do nothing returning post_id`,
    [postId, userId],
  );
  let active = inserted.rowCount > 0;
  if (!active) {
    await pool.query(`delete from public.${table} where post_id = $1 and user_id = $2`, [postId, userId]);
  }

  const countResult = table === "social_post_reactions"
    ? await pool.query("select count(*) from public.social_post_reactions where post_id = $1", [postId])
    : null;
  return { active, count: countResult ? Number(countResult.rows[0].count) : undefined };
};

export const toggleSocialReaction = (pool, userId, postId) => (
  toggleJoin(pool, "social_post_reactions", userId, postId)
);

export const toggleSocialSave = (pool, userId, postId) => (
  toggleJoin(pool, "social_post_saves", userId, postId)
);

export const listSocialComments = async (pool, userId, postId, { limit = 80 } = {}) => {
  const post = await getSocialPost(pool, userId, postId);
  if (!post) fail("Post was not found", 404);
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 80));
  const result = await pool.query(
    `
      select
        comment.id,
        comment.post_id,
        comment.user_id,
        comment.parent_id,
        comment.body,
        comment.created_at,
        profile.full_name as creator_name,
        profile.avatar_url as creator_avatar_url,
        (comment.user_id = $2) as is_owner
      from public.social_post_comments comment
      left join public.profiles profile on profile.id = comment.user_id
      where comment.post_id = $1 and comment.status = 'published'
      order by comment.created_at asc
      limit $3
    `,
    [postId, userId, normalizedLimit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    parent_id: row.parent_id || null,
    body: row.body,
    created_at: row.created_at,
    is_owner: Boolean(row.is_owner),
    creator: {
      id: row.user_id,
      display_name: row.creator_name || "Mipo",
      avatar_url: row.creator_avatar_url || null,
    },
  }));
};

export const createSocialComment = async (pool, userId, postId, body) => {
  const post = await getSocialPost(pool, userId, postId);
  if (!post) fail("Post was not found", 404);
  if (!post.allow_comments) fail("Comments are disabled", 403);
  const text = optionalText(body.body, 500);
  if (!text) fail("Comment text is required");
  const parentId = body.parent_id || body.parentId || null;
  if (parentId && !uuidPattern.test(String(parentId))) fail("A valid parent comment is required");
  if (parentId) {
    const parentResult = await pool.query(
      "select id from public.social_post_comments where id = $1 and post_id = $2 and status = 'published' limit 1",
      [parentId, postId],
    );
    if (parentResult.rowCount === 0) fail("Parent comment was not found", 404);
  }

  const result = await pool.query(
    `
      insert into public.social_post_comments (post_id, user_id, parent_id, body)
      values ($1, $2, $3, $4)
      returning id
    `,
    [postId, userId, parentId, text],
  );
  const comments = await listSocialComments(pool, userId, postId);
  return comments.find((comment) => comment.id === result.rows[0].id);
};

export const deleteSocialComment = async (pool, userId, commentId) => {
  if (!uuidPattern.test(String(commentId || ""))) return false;
  const result = await pool.query(
    `
      update public.social_post_comments
      set status = 'deleted', body = '[deleted]', updated_at = now()
      where id = $1 and user_id = $2 and status = 'published'
    `,
    [commentId, userId],
  );
  return result.rowCount > 0;
};

export const voteSocialPoll = async (pool, userId, postId, optionIndex) => {
  const post = await getSocialPost(pool, userId, postId);
  if (!post) fail("Post was not found", 404);
  const normalizedIndex = Number(optionIndex);
  if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= post.poll_options.length) {
    fail("A valid poll option is required");
  }
  await pool.query(
    `
      insert into public.social_poll_votes (post_id, user_id, option_index)
      values ($1, $2, $3)
      on conflict (post_id, user_id) do update set option_index = excluded.option_index, created_at = now()
    `,
    [postId, userId, normalizedIndex],
  );
  return getSocialPost(pool, userId, postId);
};
