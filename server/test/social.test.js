import assert from "node:assert/strict";
import test from "node:test";

import { readFileSync } from "node:fs";

import {
  authorFirstName,
  normalizeSocialPostInput,
  publicFeedCreator,
  serializeSocialComment,
  serializeSocialPost,
} from "../src/social.js";

const uploadId = "0ea7381f-49b0-4d62-a7a1-3fcfe88f340d";
const petId = "496d9f18-94b4-40df-aaac-c8fe44b588fc";

test("normalizes a social post payload", () => {
  assert.deepEqual(normalizeSocialPostInput({
    upload_id: uploadId,
    pet_id: petId,
    caption: "  Sunday walk  ",
    location: "  Park  ",
    poll_question: "  Best trail?  ",
    poll_options: ["  Lake  ", "Woods"],
  }), {
    uploadId,
    petId,
    caption: "Sunday walk",
    location: "Park",
    visibility: "public",
    allowComments: true,
    pollQuestion: "Best trail?",
    pollOptions: ["Lake", "Woods"],
  });
});

test("requires an owned upload identifier shape", () => {
  assert.throws(
    () => normalizeSocialPostInput({ upload_id: "not-an-id" }),
    /valid uploaded media id/i,
  );
});

test("requires a complete poll", () => {
  assert.throws(
    () => normalizeSocialPostInput({ upload_id: uploadId, poll_question: "Choose", poll_options: ["One"] }),
    /between 2 and 4 options/i,
  );
  assert.throws(
    () => normalizeSocialPostInput({ upload_id: uploadId, poll_options: ["One", "Two"] }),
    /poll question is required/i,
  );
});

test("honors private posts and disabled comments", () => {
  const normalized = normalizeSocialPostInput({
    uploadId,
    visibility: "private",
    allowComments: false,
  });
  assert.equal(normalized.visibility, "private");
  assert.equal(normalized.allowComments, false);
});

const userId = "22222222-2222-4222-8222-222222222222";
const humanAvatar = "https://cdn.example/people/dana-face.jpg";

const postRow = (overrides = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  caption: "בוקר",
  location: null,
  storage_key: "moments/walk.jpg",
  media_type: "image",
  visibility: "public",
  allow_comments: true,
  poll_question: null,
  poll_options: [],
  poll_results: [],
  viewer_poll_option: null,
  reaction_count: 0,
  comment_count: 0,
  viewer_has_liked: false,
  viewer_has_saved: false,
  is_owner: false,
  published_at: "2026-09-30T08:00:00.000Z",
  user_id: userId,
  creator_name: "דנה כהן",
  creator_avatar_url: humanAvatar,
  pet_id: null,
  pet_name: null,
  pet_avatar_url: null,
  pet_type: null,
  pet_breed: null,
  ...overrides,
});

test("a post with no pet shows only the first name and no human photo", () => {
  const post = serializeSocialPost(postRow());
  assert.equal(post.creator.display_name, "דנה");
  assert.equal(post.creator.avatar_url, null);
  assert.equal(post.pet, null);
  const json = JSON.stringify(post);
  assert.equal(json.includes("כהן"), false);
  assert.equal(json.includes("דנה כהן"), false);
  assert.equal(json.includes("dana-face"), false);
  assert.equal(json.includes("full_name"), false);
});

test("a tagged pet replaces the person's name and photo", () => {
  const post = serializeSocialPost(postRow({
    pet_id: petId,
    pet_name: "לוקה הקטן",
    pet_avatar_url: "/uploads/luka.png",
    pet_type: "dog",
    pet_breed: "לברדור",
  }));
  assert.equal(post.creator.display_name, "לוקה הקטן");
  assert.equal(post.creator.avatar_url, null);
  assert.equal(post.pet.name, "לוקה הקטן");
  assert.equal(post.pet.avatar_url, "/uploads/luka.png");
  const json = JSON.stringify(post);
  assert.equal(json.includes("דנה"), false);
  assert.equal(json.includes("כהן"), false);
  assert.equal(json.includes("dana-face"), false);
});

test("a pet with no photo still does not borrow a person's photo", () => {
  const post = serializeSocialPost(postRow({
    pet_id: petId,
    pet_name: "לוקה",
    pet_avatar_url: null,
  }));
  assert.equal(post.creator.display_name, "לוקה");
  assert.equal(post.creator.avatar_url, null);
  assert.equal(post.pet.avatar_url, null);
  assert.equal(JSON.stringify(post).includes("dana-face"), false);
});

test("a comment shows only the first name and no human photo", () => {
  const comment = serializeSocialComment({
    id: "44444444-4444-4444-8444-444444444444",
    post_id: "11111111-1111-4111-8111-111111111111",
    user_id: userId,
    parent_id: null,
    body: "איזה כיף",
    created_at: "2026-09-30T08:05:00.000Z",
    is_owner: false,
    creator_name: "  דנה   כהן  ",
    creator_avatar_url: humanAvatar,
  });
  assert.equal(comment.creator.display_name, "דנה");
  assert.equal(comment.creator.avatar_url, null);
  const json = JSON.stringify(comment);
  assert.equal(json.includes("כהן"), false);
  assert.equal(json.includes("dana-face"), false);
});

test("a missing name falls back to Mipo, and a single name stays whole", () => {
  assert.equal(authorFirstName("דנה"), "דנה");
  assert.equal(authorFirstName("  דנה   כהן  "), "דנה");
  assert.equal(authorFirstName(""), null);
  assert.equal(authorFirstName(null), null);
  assert.equal(publicFeedCreator({ id: userId, fullName: "" }).display_name, "Mipo");
  assert.equal(publicFeedCreator({ id: userId, fullName: "דנה" }).display_name, "דנה");
  assert.equal(publicFeedCreator({ id: userId, fullName: "דנה", petName: "   " }).display_name, "דנה");
});

test("feed queries do not select a person's profile photo or surname", () => {
  const source = readFileSync(new URL("../src/social.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /profile\.avatar_url/);
  assert.doesNotMatch(source, /creator_avatar_url/);
  assert.doesNotMatch(source, /author\.full_name as creator_name/);
  const splits = source.match(/split_part\(btrim\(coalesce\(author\.full_name, ''\)\), ' ', 1\)/g) || [];
  assert.equal(splits.length, 2);
});
