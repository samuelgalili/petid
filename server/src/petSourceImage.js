/**
 * Q4 Gate2 — source photo is write-once and independent of Master.
 *
 * source_image_url is the uploaded original. avatar_url is Master (Hero).
 * Creating a pet with a photo writes both. Later Master updates must not
 * copy or overwrite source. Existing rows are never backfilled.
 */

export const applySourceImageOnCreate = (payload) => {
  if (payload.source_image_url == null && payload.avatar_url) {
    payload.source_image_url = payload.avatar_url;
  }
  return payload;
};

export const applySourceImageOnUpdate = (payload, currentSource) => {
  if (currentSource) {
    delete payload.source_image_url;
  }
  return payload;
};
