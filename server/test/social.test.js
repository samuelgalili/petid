import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSocialPostInput } from "../src/social.js";

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
