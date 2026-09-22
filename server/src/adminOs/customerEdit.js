/**
 * Correcting a customer's details by hand.
 *
 * The owner asked for it while trying to place a manual order for somebody
 * whose email was missing - which is the honest reason this belongs on the
 * card: a detail that is wrong is wrong everywhere it is used, and fixing it
 * inside one order fixes it for one order.
 *
 * ─── WHICH ROW TO WRITE, WHICH IS THE WHOLE PROBLEM ─────────────────────────
 *
 * A customer on this screen is a row of `customer_identities`, and that view is
 *
 *   app_users FULL JOIN shop_customers
 *     email = coalesce(au.email, sc.email)
 *
 * So for somebody with an ACCOUNT, the app_users value WINS. Writing their new
 * name to shop_customers would update a row, return success, and change
 * nothing on the screen - the silent no-op, which is worse than an error
 * because the admin believes they fixed it.
 *
 * Hence: an account is edited on app_users, a guest on shop_customers, and
 * when an account has a shop_customers row linked to it both are written so
 * the two cannot drift into disagreeing about the same person.
 *
 * ─── WHY THE EMAIL IS NOT EDITABLE FOR AN ACCOUNT ───────────────────────────
 *
 * For a guest, an email is a way to reach them. For somebody with an account
 * it is their LOGIN, and an admin who can change it can point it at an address
 * they control and then use password recovery. That is an account takeover
 * with an audit trail that reads like an administrator fixing a typo.
 *
 * Changing the address somebody signs in with belongs in account recovery,
 * where it can require proof from the person it belongs to. So this refuses,
 * and says why, rather than leaving the field quietly inert.
 */

import { ACTOR_TYPES } from "./auditService.js";

const text = (value, limit) => String(value ?? "").trim().slice(0, limit);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What the caller asked to change, and whether it is sayable.
 *
 * Only the keys actually present are treated as edits: sending `{ phone }`
 * changes the phone and leaves the name alone, rather than clearing it.
 */
export const parseCustomerEdit = (body) => {
  const edit = {};

  if (Object.hasOwn(body ?? {}, "full_name")) {
    const fullName = text(body.full_name, 100);
    if (fullName.length < 2) {
      const error = new Error("A customer needs a name of at least two characters");
      error.statusCode = 400;
      throw error;
    }
    edit.full_name = fullName;
  }

  if (Object.hasOwn(body ?? {}, "phone")) {
    // An empty phone is a real edit - removing a wrong number is better than
    // keeping one that sends a delivery to a stranger.
    // phone_normalized is NOT set here. It is a GENERATED column -
    // mipo_normalize_phone(phone) - and Postgres refuses an update that names
    // it, so the dedupe lookup stays derived from the phone rather than from
    // whatever a caller thought the normal form was.
    const phone = text(body.phone, 30);
    edit.phone = phone || null;
  }

  if (Object.hasOwn(body ?? {}, "email")) {
    const email = text(body.email, 255).toLowerCase();
    if (!EMAIL.test(email)) {
      const error = new Error("That is not an email address");
      error.statusCode = 400;
      throw error;
    }
    edit.email = email;
  }

  if (Object.keys(edit).length === 0) {
    const error = new Error("Nothing to change");
    error.statusCode = 400;
    throw error;
  }

  return edit;
};

const assign = (edit, keys, values) => keys
  .filter((key) => Object.hasOwn(edit, key))
  .map((key, index) => {
    values.push(edit[key]);
    return `${key} = $${values.length}`;
  });

export const updateAdminCustomer = async ({ pool, audit, admin }, body) => {
  const identityId = text(body?.identity_id, 64);
  if (!identityId) {
    const error = new Error("Which customer?");
    error.statusCode = 400;
    throw error;
  }

  const edit = parseCustomerEdit(body);

  const client = await pool.connect();
  try {
    await client.query("begin");

    const before = await client.query(
      "select identity_id, identity_kind, user_id, shop_customer_id, email, full_name, phone"
      + " from public.customer_identities where identity_id = $1",
      [identityId],
    );
    if (before.rowCount === 0) {
      const error = new Error("No such customer");
      error.statusCode = 404;
      throw error;
    }

    const customer = before.rows[0];

    // See the header. An account's email is the address it signs in with.
    if (Object.hasOwn(edit, "email") && customer.user_id) {
      const error = new Error(
        "This customer signs in with that address, so it cannot be changed from here.",
      );
      error.statusCode = 409;
      error.code = "EMAIL_IS_A_LOGIN";
      throw error;
    }

    if (Object.hasOwn(edit, "email")) {
      // REFUSED, NEVER MERGED. Two people sharing an address is not something
      // this screen can decide: one of them is wrong, and which one is a
      // question for a person who can ask them.
      const taken = await client.query(
        "select id from public.shop_customers where lower(email) = $1 and id <> $2 limit 1",
        [edit.email, customer.shop_customer_id],
      );
      if (taken.rowCount > 0) {
        const error = new Error("Another customer already uses that email address");
        error.statusCode = 409;
        error.code = "EMAIL_TAKEN";
        throw error;
      }
    }

    if (customer.user_id) {
      // The account row is the one the view reads, so it is the one that has
      // to change for the screen to change.
      const values = [];
      const sets = assign(edit, ["full_name", "phone"], values);
      if (sets.length > 0) {
        values.push(customer.user_id);
        await client.query(
          `update public.app_users set ${sets.join(", ")}, updated_at = now() where id = $${values.length}`,
          values,
        );
      }
    }

    // Written for a guest, and ALSO for an account that has one linked: the
    // view hides the shop_customers values behind the account's, and two
    // records of the same person disagreeing is how the wrong one surfaces
    // later somewhere that does not coalesce.
    if (customer.shop_customer_id) {
      const values = [];
      const sets = assign(edit, ["full_name", "phone", "email"], values);
      if (sets.length > 0) {
        values.push(customer.shop_customer_id);
        await client.query(
          `update public.shop_customers set ${sets.join(", ")}, updated_at = now() where id = $${values.length}`,
          values,
        );
      }
    }

    const after = await client.query(
      "select identity_id, identity_kind, user_id, shop_customer_id, email, full_name, phone"
      + " from public.customer_identities where identity_id = $1",
      [identityId],
    );

    await client.query("commit");

    await audit.record({
      actorType: ACTOR_TYPES.ADMIN,
      actor: admin,
      actionType: "customer.updated",
      entityType: "customer_identity",
      entityId: identityId,
      // Both sides, because "who changed this and what was it before" is the
      // question asked when a customer says their details are wrong.
      oldValues: { email: customer.email, full_name: customer.full_name, phone: customer.phone },
      newValues: { email: after.rows[0]?.email, full_name: after.rows[0]?.full_name, phone: after.rows[0]?.phone },
    });

    return { status: 200, body: { customer: after.rows[0] } };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};
