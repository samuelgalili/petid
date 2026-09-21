/**
 * An order taken by a person, for a person who is not at a keyboard.
 *
 * The owner asked for this in one line: open a customer by hand, make them an
 * order, and take the money - with the option of settling it off the books,
 * which he described precisely:
 *
 *   "שהלקוח שילם בדרך עקיפה לאחד מהאדמינים והוא מאשר קבלת תשלום הלקוח
 *    בפרטי ואפשר להתקדם ליצירת תווית למחסן"
 *
 * So the money arrives by a route the system never sees - Bit, a transfer,
 * cash in hand - an admin says it arrived, and that releases the order to the
 * warehouse.
 *
 * ─── WHY THIS DELEGATES TO createOrder RATHER THAN INSERTING ────────────────
 *
 * The obvious shape for this file is its own INSERT into orders: the admin has
 * the customer, the lines and the total, and writing them is twenty lines.
 *
 * That would have been a second way to make an order, and every rule the first
 * one enforces would have had to be re-enforced here or silently lost. There
 * are five, and each is a real incident if it goes missing:
 *
 *   * THE SERVER'S PRICE WINS. Line prices are resolved from the catalogue,
 *     never taken from the caller. An admin screen is a caller.
 *   * ONE SELLER PER ORDER, and no mixing marketplace lines with legacy ones -
 *     otherwise an order has no honest answer to "who sold this".
 *   * THE COMMISSION RATE is read once and snapshotted onto every line, so a
 *     later rate change cannot rewrite what a past order earned.
 *   * expected_total MUST MATCH what the server computes, which is what stops
 *     a screen quietly disagreeing with the books.
 *   * The stock, coupon and address checks that go with all of the above.
 *
 * A parallel path does not stay parallel. It diverges on the first change
 * somebody makes to one of them, and the divergence is invisible until an
 * order is wrong. So this module's entire job is to say WHO is placing the
 * order and HOW it was paid, and to hand the rest to the one function that
 * already knows what an order is.
 */

import { ACTOR_TYPES } from "./auditService.js";

/** Payment routes an admin may choose when taking an order. */
export const ADMIN_PAYMENT_METHODS = Object.freeze({
  // Nothing is collected now. The order is created unpaid and settled later -
  // the admin marks it paid when the money turns up, or sends a link.
  RECORD_ONLY: "credit-card",
  // Money already arrived, by a route the system never saw. An admin says so,
  // and the order becomes paid on their word. payment_attested_by and the note
  // are what make that word attributable afterwards.
  ATTESTED: "admin-attested",
  // Collected on delivery, exactly as a customer's own order would be.
  ON_DELIVERY: "cash-on-delivery",
});

const asText = (value, limit) => String(value ?? "").trim().slice(0, limit);

/**
 * Build the body createOrder expects from what an admin screen sends.
 *
 * Kept separate from the call so it can be tested without a database: the
 * mapping is where a manual order could quietly lose the customer it was for.
 */
export const manualOrderBody = (payload) => {
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return {
    ...payload,
    items: items.map((item) => ({
      // Only the identity and the count. A price sent from a screen is
      // ignored by resolveCatalogOrderItems, and passing one through here
      // would suggest otherwise to the next person reading this.
      product_id: item?.product_id ?? item?.id,
      product_source: item?.product_source ?? item?.source,
      variant_id: item?.variant_id ?? item?.product_variant_id,
      quantity: Number(item?.quantity) || 1,
    })),
    payment_method: payload?.payment_method || ADMIN_PAYMENT_METHODS.RECORD_ONLY,
    payment_attestation_note: asText(payload?.payment_attestation_note, 500),
    special_instructions: asText(payload?.special_instructions, 2000) || undefined,
  };
};

/**
 * Place an order on a customer's behalf.
 *
 * `customer` is the person the order is FOR. `admin` is the person placing it.
 * Conflating the two is the mistake this signature exists to prevent: an order
 * whose user_id is an admin account is an order nobody can find from the
 * customer's own card.
 */
export const createManualOrder = async ({ createOrder, audit, admin }, payload) => {
  if (!admin?.id) {
    const error = new Error("An admin identity is required to place an order by hand");
    error.statusCode = 401;
    throw error;
  }

  const body = manualOrderBody(payload);
  if (body.items.length === 0) {
    const error = new Error("An order needs at least one line");
    error.statusCode = 400;
    throw error;
  }

  // The customer the order is FOR, never the admin placing it.
  const customer = payload?.customer_user_id
    ? { id: payload.customer_user_id, email_verified_at: null }
    : null;

  const result = await createOrder(body, customer, "admin", {
    placedByAdmin: { id: admin.id, email: admin.email },
  });

  // Recorded whatever the payment route was, because "an admin made this
  // order" is itself the fact worth keeping - an order that appeared without a
  // customer session is otherwise indistinguishable from one that did not.
  await audit.record({
    actorType: ACTOR_TYPES.ADMIN,
    actor: admin,
    actionType: "order.created_manually",
    entityType: "order",
    entityId: result?.order?.id ?? result?.id ?? null,
    metadata: {
      payment_method: body.payment_method,
      // The note is the whole substance of an attested payment, so it is kept
      // here too: the orders row can be edited, the audit log is append-only.
      attested: body.payment_method === ADMIN_PAYMENT_METHODS.ATTESTED
        ? { note: body.payment_attestation_note }
        : undefined,
      line_count: body.items.length,
    },
  });

  return result;
};
