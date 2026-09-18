/**
 * Opening a customer by hand.
 *
 * A shop_customers row is born in exactly one place today: the checkout, at
 * index.js:6143, with `on conflict (lower(email)) do update`. Somebody who
 * rang up about a rabbit and left a mobile number has never checked out, so
 * until 0057 they could not be represented in this table at all.
 *
 * THE DEDUPLICATION LIVES HERE RATHER THAN IN AN INDEX, and the reason is in
 * 0057's comment: an email is an identity, a phone number is an address. One
 * mailbox is one person; one phone number is a household, a couple, or
 * everyone behind one counter. A unique index on the phone would refuse the
 * second real customer at the same landline, and no message a constraint can
 * emit makes that the right answer.
 *
 * So the two matches are treated differently, because they mean different
 * things:
 *
 *   EMAIL matches   -> that IS the customer. Return them, create nothing.
 *   PHONE matches   -> that MIGHT be the customer, or their partner. Return
 *                      the candidates and let a person decide.
 *
 * The second case is the same shape as the account-link decision the owner
 * made under D-2: show it, do not resolve it.
 */

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mirrors public.mipo_normalize_phone and toWhatsAppNumber in
 * src/lib/customerContact.ts. The parameter is named `phone` to match the
 * browser's copy exactly: a test compares the two bodies as code, and a rule
 * that is the same rule should read as the same rule.
 */
export const normalizePhone = (phone) => {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("972")) {
    if (digits.length === 13 && digits[3] === "0") digits = `972${digits.slice(4)}`;
  } else if (digits.startsWith("0")) {
    digits = `972${digits.slice(1)}`;
  }

  return digits.length >= 10 ? digits : null;
};

const CUSTOMER_COLUMNS = "id, email, full_name, phone, user_id, last_order_at, created_at, updated_at";

export const parseNewCustomer = (body) => {
  const fullName = String(body?.full_name ?? body?.fullName ?? "").trim();
  const rawEmail = String(body?.email ?? "").trim().toLowerCase();
  const rawPhone = String(body?.phone ?? "").trim();

  if (!fullName) {
    const error = new Error("A customer needs a name");
    error.statusCode = 400;
    throw error;
  }
  if (rawEmail && !EMAIL_SHAPE.test(rawEmail)) {
    const error = new Error("That does not look like an email address");
    error.statusCode = 400;
    throw error;
  }

  const phone = rawPhone || null;
  const phoneNormalized = normalizePhone(rawPhone);

  if (rawPhone && !phoneNormalized) {
    const error = new Error("That phone number is too short to reach anyone");
    error.statusCode = 400;
    throw error;
  }

  // One of the two, because a row with neither is a name nobody can contact
  // and nothing can ever match against - a guaranteed duplicate the next time
  // the same person is entered.
  if (!rawEmail && !phoneNormalized) {
    const error = new Error("A customer needs an email address or a phone number");
    error.statusCode = 400;
    throw error;
  }

  return {
    fullName,
    email: rawEmail || null,
    phone,
    phoneNormalized,
    // Set by the caller after they have seen the phone candidates.
    acceptDuplicatePhone: body?.accept_duplicate_phone === true,
  };
};

export const createAdminCustomer = async ({ pool, audit, admin }, body) => {
  const input = parseNewCustomer(body);
  const client = await pool.connect();

  try {
    await client.query("begin");

    // ─── an email is an identity ───────────────────────────────────────────
    if (input.email) {
      const existing = await client.query(
        `select ${CUSTOMER_COLUMNS} from public.shop_customers where lower(email) = $1 limit 1`,
        [input.email],
      );
      if (existing.rowCount > 0) {
        await client.query("commit");
        return {
          status: 200,
          body: { customer: existing.rows[0], created: false, matched_by: "email" },
        };
      }
    }

    // ─── a phone is an address ─────────────────────────────────────────────
    //
    // Reported, never resolved. The admin says whether this is the same person
    // by sending accept_duplicate_phone on a second request - which is a
    // different body, so it needs its own Idempotency-Key, which is correct:
    // it is a different decision.
    if (input.phoneNormalized && !input.acceptDuplicatePhone) {
      const sharing = await client.query(
        `select ${CUSTOMER_COLUMNS} from public.shop_customers
          where phone_normalized = $1 order by created_at limit 5`,
        [input.phoneNormalized],
      );
      if (sharing.rowCount > 0) {
        await client.query("commit");
        return {
          status: 200,
          body: {
            created: false,
            matched_by: "phone",
            candidates: sharing.rows,
            message: "מספר הטלפון הזה כבר רשום. אותו אדם, או מישהו אחר באותו בית?",
          },
        };
      }
    }

    // ─── does this email belong to an account ──────────────────────────────
    //
    // Surfaced, NOT linked. D-2: a manual create never decides that two
    // records are the same person, because being wrong about that is silent
    // and it attaches somebody's order history to a stranger.
    let accountMatch = null;
    if (input.email) {
      const account = await client.query(
        "select id, email from public.app_users where lower(email) = $1 limit 1",
        [input.email],
      );
      if (account.rowCount > 0) {
        accountMatch = { user_id: account.rows[0].id, email: account.rows[0].email };
      }
    }

    // last_order_at IS NOT WRITTEN. The checkout sets it to now() because a
    // checkout is an order; opening a customer is not, and writing it would
    // put a customer who has never bought anything at the top of a list
    // sorted by recency, claiming a sale that did not happen.
    //
    // DO NOTHING, NOT DO UPDATE. The only way to reach this conflict is a
    // race: two agents entering the same person at the same moment, both
    // selects finding nothing. The first version updated on conflict, which
    // meant the loser of that race overwrote a real customer's name and phone
    // and reported `created: true` - the exact opposite of the rule the email
    // branch above states, reached by a path nobody can see. Doing nothing and
    // re-reading gives the race the SAME answer as the calm case, out of one
    // definition instead of two that can drift.
    //
    // It also removes a guard I could not falsify: a `coalesce` protecting the
    // account link on a branch no test can drive is a line that could be
    // deleted with every test still green.
    const inserted = await client.query(
      `
        insert into public.shop_customers (email, full_name, phone)
        values ($1, $2, $3)
        on conflict (lower(email)) do nothing
        returning ${CUSTOMER_COLUMNS}
      `,
      [input.email, input.fullName, input.phone],
    );

    if (inserted.rowCount === 0) {
      const raced = await client.query(
        `select ${CUSTOMER_COLUMNS} from public.shop_customers where lower(email) = $1 limit 1`,
        [input.email],
      );
      await client.query("commit");
      return {
        status: 200,
        body: { customer: raced.rows[0], created: false, matched_by: "email" },
      };
    }

    await client.query("commit");

    const customer = inserted.rows[0];

    await audit.record({
      actorType: "admin",
      actor: admin,
      actionType: "customer.created",
      entityType: "shop_customer",
      entityId: customer.id,
      newValues: { email: customer.email, full_name: customer.full_name, phone: customer.phone },
      metadata: {
        accepted_duplicate_phone: input.acceptDuplicatePhone || undefined,
        account_match: accountMatch?.user_id || undefined,
      },
    });

    return {
      status: 201,
      body: { customer, created: true, account_match: accountMatch },
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};
