// What a post or comment may show. A pet's name wins. Otherwise only the
// first word of the person's name — "דנה כהן" is "דנה".
export const feedAuthorName = (
  petName: string | null | undefined,
  displayName: string | null | undefined,
): string => {
  const pet = String(petName || "").trim();
  if (pet) return pet;
  const first = String(displayName || "").trim().split(/\s+/).filter(Boolean)[0];
  return first || "Mipo";
};

// A photo in the feed is the pet's, or the default Mipo image. A person's
// profile photo is never a candidate, even if a payload still carries one.
export const feedAuthorAvatar = (
  petAvatarUrl: string | null | undefined,
  fallback: string,
): string => petAvatarUrl || fallback;
