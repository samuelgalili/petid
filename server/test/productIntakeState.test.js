// The intake state machine.
//
// What matters in a state machine is what it refuses, so the table is asserted
// exhaustively rather than sampled: every from-state against every to-state,
// with the expected answer written out. A transition added without a decision
// fails here first.

import assert from "node:assert/strict";
import test from "node:test";
import {
  DRAFT_STATES,
  PUBLICATION_STATES,
  allowedDraftTransitions,
  draftSubmissionBlockers,
  isDraftTransitionAllowed,
  isPublicationTransitionAllowed,
  mayApproveDraft,
} from "../src/productIntakeState.js";

const D = DRAFT_STATES;
const ALL = Object.values(D);

// The specification. The module is the implementation; they are compared.
const EXPECTED = {
  [D.IMPORTED]: [D.DRAFT, D.ARCHIVED],
  [D.DRAFT]: [D.IN_REVIEW, D.ARCHIVED],
  [D.IN_REVIEW]: [D.APPROVED, D.REJECTED, D.DRAFT],
  [D.APPROVED]: [D.DRAFT],
  [D.REJECTED]: [D.DRAFT, D.ARCHIVED],
  [D.ARCHIVED]: [],
};

test("the whole transition table answers as specified", () => {
  for (const from of ALL) {
    const allowed = new Set(EXPECTED[from]);
    for (const to of ALL) {
      assert.equal(
        isDraftTransitionAllowed(from, to), allowed.has(to),
        `${from} -> ${to}`,
      );
    }
  }
});

test("review cannot be skipped", () => {
  assert.equal(isDraftTransitionAllowed(D.DRAFT, D.APPROVED), false,
    "DRAFT -> APPROVED would make review optional");
  assert.equal(isDraftTransitionAllowed(D.IMPORTED, D.APPROVED), false);
  assert.equal(isDraftTransitionAllowed(D.IMPORTED, D.IN_REVIEW), false,
    "a raw record has to become a draft before anybody reviews it");
});

test("a rejected draft cannot be approved without going back through review", () => {
  assert.equal(isDraftTransitionAllowed(D.REJECTED, D.APPROVED), false);
  // The way back is REJECTED -> DRAFT -> IN_REVIEW -> APPROVED.
  assert.equal(isDraftTransitionAllowed(D.REJECTED, D.DRAFT), true);
  assert.equal(isDraftTransitionAllowed(D.DRAFT, D.IN_REVIEW), true);
  assert.equal(isDraftTransitionAllowed(D.IN_REVIEW, D.APPROVED), true);
});

test("ARCHIVED is terminal", () => {
  for (const to of ALL) {
    assert.equal(isDraftTransitionAllowed(D.ARCHIVED, to), false, `ARCHIVED -> ${to}`);
  }
  assert.deepEqual(allowedDraftTransitions(D.ARCHIVED), []);
});

test("an unknown state allows nothing", () => {
  for (const to of ALL) {
    assert.equal(isDraftTransitionAllowed("READY_TO_PUBLISH", to), false);
    assert.equal(isDraftTransitionAllowed(null, to), false);
  }
  assert.deepEqual(allowedDraftTransitions("nonsense"), []);
});

test("allowedDraftTransitions returns a copy", () => {
  const allowed = allowedDraftTransitions(D.DRAFT);
  allowed.push(D.APPROVED);
  assert.equal(isDraftTransitionAllowed(D.DRAFT, D.APPROVED), false);
});

// ─── self-approval ───────────────────────────────────────────────────────────

test("the submitter may not approve their own draft", () => {
  assert.equal(mayApproveDraft("admin-1", "admin-1"), false,
    "a reviewer approving their own submission is a review that did not happen");
  assert.equal(mayApproveDraft("admin-2", "admin-1"), true);
});

test("a draft with no recorded submitter cannot be approved by anybody", () => {
  // Fail closed: the guard cannot be evaluated, so it refuses rather than
  // assuming somebody else submitted it.
  assert.equal(mayApproveDraft("admin-1", null), false);
  assert.equal(mayApproveDraft("admin-1", undefined), false);
  assert.equal(mayApproveDraft(null, "admin-1"), false, "the api-key identity has no admin id");
});

// ─── submission preconditions ────────────────────────────────────────────────

test("a draft needs a name and a category to enter review", () => {
  assert.deepEqual(draftSubmissionBlockers({ name: "קולר", category_id: "c1" }), []);
  assert.deepEqual(draftSubmissionBlockers({ name: "  ", category_id: "c1" }), ["missing_name"]);
  assert.deepEqual(draftSubmissionBlockers({ name: "קולר" }), ["missing_category"]);
  assert.deepEqual(draftSubmissionBlockers({}), ["missing_name", "missing_category"]);
  assert.deepEqual(draftSubmissionBlockers(null), ["missing_name", "missing_category"]);
});

// ─── publication ─────────────────────────────────────────────────────────────

test("publication transitions are as specified, and ARCHIVED is terminal", () => {
  const P = PUBLICATION_STATES;
  assert.equal(isPublicationTransitionAllowed(P.UNPUBLISHED, P.PUBLISHED), true);
  assert.equal(isPublicationTransitionAllowed(P.PUBLISHED, P.UNPUBLISHED), true);
  assert.equal(isPublicationTransitionAllowed(P.UNPUBLISHED, P.ARCHIVED), true);
  assert.equal(isPublicationTransitionAllowed(P.PUBLISHED, P.ARCHIVED), true);
  assert.equal(isPublicationTransitionAllowed(P.ARCHIVED, P.PUBLISHED), false);
  assert.equal(isPublicationTransitionAllowed(P.ARCHIVED, P.UNPUBLISHED), false);
  assert.equal(isPublicationTransitionAllowed(P.PUBLISHED, P.PUBLISHED), false,
    "re-publishing an already published product is not a transition");
});
