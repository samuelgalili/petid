// The intake state machine, as rules rather than as scattered `if`s.
//
// The transitions live here, pure and testable, because the interesting part
// of a state machine is what it REFUSES and a refusal spread across five route
// handlers is a refusal that will eventually have a hole in it.
//
// Two guards matter more than the rest:
//
//   * a draft may not jump to APPROVED. Review cannot be skipped, so
//     DRAFT -> APPROVED is not a transition at all.
//   * the actor who submitted a draft may not approve it. That is not a
//     permission check - seller_admin simply does not hold DRAFT_REVIEW - but a
//     product_manager who submits their own draft holds both, so the rule has
//     to exist here as well.

export const DRAFT_STATES = Object.freeze({
  IMPORTED: "IMPORTED",
  DRAFT: "DRAFT",
  IN_REVIEW: "IN_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  ARCHIVED: "ARCHIVED",
});

export const PUBLICATION_STATES = Object.freeze({
  UNPUBLISHED: "UNPUBLISHED",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
});

const D = DRAFT_STATES;

// What each state may become. Anything absent is refused with 409.
const DRAFT_TRANSITIONS = Object.freeze({
  [D.IMPORTED]: Object.freeze([D.DRAFT, D.ARCHIVED]),
  // No APPROVED here: review may not be skipped.
  [D.DRAFT]: Object.freeze([D.IN_REVIEW, D.ARCHIVED]),
  [D.IN_REVIEW]: Object.freeze([D.APPROVED, D.REJECTED, D.DRAFT]),
  // An approved draft can be reopened for editing, which returns it to DRAFT.
  [D.APPROVED]: Object.freeze([D.DRAFT]),
  // A rejected draft has to go back through DRAFT and IN_REVIEW; it cannot be
  // approved directly from here.
  [D.REJECTED]: Object.freeze([D.DRAFT, D.ARCHIVED]),
  // Terminal.
  [D.ARCHIVED]: Object.freeze([]),
});

export const isDraftTransitionAllowed = (from, to) =>
  (DRAFT_TRANSITIONS[String(from ?? "")] || []).includes(String(to ?? ""));

export const allowedDraftTransitions = (from) => [...(DRAFT_TRANSITIONS[String(from ?? "")] || [])];

/**
 * Whether `actorId` may approve a draft submitted by `submittedBy`.
 *
 * The submitter may not. A reviewer approving their own submission is a review
 * that did not happen, and the fact that it would be logged does not make it a
 * review.
 *
 * A null submitter (a draft that reached IN_REVIEW without one recorded) is
 * treated as NOT approvable by anybody, because the guard cannot be evaluated -
 * fail closed rather than assume it was somebody else.
 */
export const maySelfApprove = () => false;

export const mayApproveDraft = (actorId, submittedBy) => {
  if (!submittedBy) return false;
  if (!actorId) return false;
  return String(actorId) !== String(submittedBy);
};

/**
 * The conditions a draft must meet to enter review. Mirrors the CHECK
 * constraint in migration 0043, so the API can explain the refusal instead of
 * surfacing a constraint violation.
 */
export const draftSubmissionBlockers = (draft) => {
  const blockers = [];
  if (!String(draft?.name ?? "").trim()) blockers.push("missing_name");
  if (!draft?.category_id) blockers.push("missing_category");
  return blockers;
};

/**
 * Publication is allowed only from UNPUBLISHED, and only when the gate passes.
 * The gate itself is computed from live rows elsewhere; this is the transition
 * half.
 */
export const isPublicationTransitionAllowed = (from, to) => {
  const table = {
    [PUBLICATION_STATES.UNPUBLISHED]: [PUBLICATION_STATES.PUBLISHED, PUBLICATION_STATES.ARCHIVED],
    [PUBLICATION_STATES.PUBLISHED]: [PUBLICATION_STATES.UNPUBLISHED, PUBLICATION_STATES.ARCHIVED],
    [PUBLICATION_STATES.ARCHIVED]: [],
  };
  return (table[String(from ?? "")] || []).includes(String(to ?? ""));
};
