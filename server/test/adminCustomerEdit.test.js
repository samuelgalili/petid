// Correcting a customer's details, and the two rows that could hold them.
//
// WHICH ROW TO WRITE IS THE ENTIRE PROBLEM. A customer on the admin card is a
// row of `customer_identities`, and that view is
//
//   app_users FULL JOIN shop_customers
//     email = coalesce(au.email, sc.email)
//
// So for somebody with an account the app_users value WINS. Writing their new
// name to shop_customers updates a row, returns success, and changes nothing
// on screen - a silent no-op, which is worse than an error because the admin
// believes they fixed it and moves on.
//
// Most of this file is that distinction, exercised against a real database
// rather than reasoned about, because reasoning about a FULL JOIN and a
// coalesce is exactly how the no-op gets written in the first place.

import assert from "node:assert/strict";
import test from "node:test";

import { createAuditService } from "../src/adminOs/auditService.js";
import { parseCustomerEdit, updateAdminCustomer } from "../src/adminOs/customerEdit.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const ADMIN = { id: null, email: "ops@mipo.pet", role: "admin" };

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const tag = `e${Math.random().toString(36).slice(2, 8)}`;
  const audit = createAuditService({ pool, logger: { error: () => {} } });
  try {
    await fn({ pool, audit, tag });
  } finally {
    await pool.query("delete from public.shop_customers where email like $1 or full_name like $1", [`%${tag}%`])
      .catch(() => {});
    await pool.query("delete from public.app_users where email like $1", [`%${tag}%`]).catch(() => {});
    await pool.end();
  }
};

/** A guest: a shop_customers row and no account. */
const makeGuest = async (pool, tag) => {
  const result = await pool.query(
    "insert into public.shop_customers (email, full_name, phone) values ($1, $2, $3) returning id",
    [`guest-${tag}@example.com`, `אורח ${tag}`, "0501110000"],
  );
  return result.rows[0].id;
};

/** An account, with a shop_customers row linked to it. */
const makeAccount = async (pool, tag) => {
  const user = await pool.query(
    // password_hash is NOT NULL: an account is something somebody signs in to,
    // which is exactly why its email is not editable from the admin card.
    "insert into public.app_users (email, full_name, phone, password_hash)"
    + " values ($1, $2, $3, $4) returning id",
    [`user-${tag}@example.com`, `חשבון ${tag}`, "0502220000", "x"],
  );
  const userId = user.rows[0].id;
  await pool.query(
    "insert into public.shop_customers (email, full_name, phone, user_id) values ($1, $2, $3, $4)",
    [`shop-${tag}@example.com`, `שם ישן ${tag}`, "0509999999", userId],
  );
  return userId;
};

const identity = async (pool, id) => (await pool.query(
  "select * from public.customer_identities where identity_id = $1", [id],
)).rows[0];

// ─── what may be said at all ─────────────────────────────────────────────────

test("only the keys that are present are changed", () => {
  // Sending a phone must not blank the name. An edit form that submits one
  // field would otherwise wipe the others.
  const edit = parseCustomerEdit({ phone: "050-123-4567" });
  assert.deepEqual(Object.keys(edit), ["phone"]);
  assert.equal(edit.phone, "050-123-4567");
  // phone_normalized is a generated column. Naming it in an UPDATE is an error
  // from Postgres, so the edit must not carry one.
  assert.equal(Object.hasOwn(edit, "phone_normalized"), false);
});

test("clearing a phone is a real edit", () => {
  // Removing a wrong number beats keeping one that sends a delivery to a
  // stranger, so an empty phone is allowed where an empty name is not.
  const edit = parseCustomerEdit({ phone: "" });
  assert.equal(edit.phone, null);
});

test("a name and an email have to be one", () => {
  assert.throws(() => parseCustomerEdit({ full_name: "א" }), (error) => error.statusCode === 400);
  assert.throws(() => parseCustomerEdit({ email: "not-an-email" }), (error) => error.statusCode === 400);
  assert.throws(() => parseCustomerEdit({}), (error) => error.statusCode === 400);
});

// ─── the row that actually shows ─────────────────────────────────────────────

dbTest("editing a guest changes what the card shows", async () => {
  await withDb(async ({ pool, audit, tag }) => {
    const id = await makeGuest(pool, tag);

    await updateAdminCustomer({ pool, audit, admin: ADMIN }, {
      identity_id: id,
      full_name: `שם חדש ${tag}`,
      email: `fixed-${tag}@example.com`,
    });

    const after = await identity(pool, id);
    assert.equal(after.full_name, `שם חדש ${tag}`);
    assert.equal(after.email, `fixed-${tag}@example.com`);
  });
});

dbTest("editing an account changes what the card shows, not a row it hides", async () => {
  // THE NO-OP THIS EXISTS TO PREVENT. The view coalesces to app_users first,
  // so writing only shop_customers would leave the screen exactly as it was
  // while reporting success.
  await withDb(async ({ pool, audit, tag }) => {
    const userId = await makeAccount(pool, tag);

    await updateAdminCustomer({ pool, audit, admin: ADMIN }, {
      identity_id: userId,
      full_name: `מתוקן ${tag}`,
      phone: "0503334444",
    });

    const after = await identity(pool, userId);
    assert.equal(after.full_name, `מתוקן ${tag}`, "the account's own row was not updated");
    assert.equal(after.phone, "0503334444");
  });
});

dbTest("the two rows for one person are not left disagreeing", async () => {
  // The shop_customers values are hidden behind the account's, so leaving them
  // stale is invisible here and surfaces somewhere that does not coalesce.
  await withDb(async ({ pool, audit, tag }) => {
    const userId = await makeAccount(pool, tag);

    await updateAdminCustomer({ pool, audit, admin: ADMIN }, {
      identity_id: userId,
      full_name: `אחיד ${tag}`,
    });

    const linked = await pool.query(
      "select full_name from public.shop_customers where user_id = $1", [userId],
    );
    assert.equal(linked.rows[0].full_name, `אחיד ${tag}`, "the linked shop row still holds the old name");
  });
});

// ─── the email, which is an identity ─────────────────────────────────────────

dbTest("an account's login address cannot be changed from this screen", async () => {
  // An admin who can point somebody's login at an address they control can
  // then use password recovery. That is an account takeover whose audit trail
  // reads like an administrator fixing a typo.
  await withDb(async ({ pool, audit, tag }) => {
    const userId = await makeAccount(pool, tag);

    await assert.rejects(
      updateAdminCustomer({ pool, audit, admin: ADMIN }, {
        identity_id: userId,
        email: `stolen-${tag}@example.com`,
      }),
      (error) => error.code === "EMAIL_IS_A_LOGIN" && error.statusCode === 409,
    );

    const after = await identity(pool, userId);
    assert.equal(after.email, `user-${tag}@example.com`, "the login address was changed anyway");
  });
});

dbTest("an email another customer already uses is refused, not merged", async () => {
  // Two people sharing an address is not something this screen can decide:
  // one of them is wrong, and which one is a question for somebody who can ask
  // them. Merging silently picks an answer and loses the other person.
  await withDb(async ({ pool, audit, tag }) => {
    const first = await makeGuest(pool, tag);
    const second = await pool.query(
      "insert into public.shop_customers (email, full_name) values ($1, $2) returning id",
      [`other-${tag}@example.com`, `שני ${tag}`],
    );

    await assert.rejects(
      updateAdminCustomer({ pool, audit, admin: ADMIN }, {
        identity_id: second.rows[0].id,
        email: `guest-${tag}@example.com`,
      }),
      (error) => error.code === "EMAIL_TAKEN" && error.statusCode === 409,
    );

    const untouched = await identity(pool, first);
    assert.equal(untouched.email, `guest-${tag}@example.com`);
  });
});

dbTest("a customer may keep their own email while changing a name", async () => {
  // The uniqueness check must not trip over the row being edited.
  await withDb(async ({ pool, audit, tag }) => {
    const id = await makeGuest(pool, tag);

    await updateAdminCustomer({ pool, audit, admin: ADMIN }, {
      identity_id: id,
      email: `guest-${tag}@example.com`,
      full_name: `אותו אדם ${tag}`,
    });

    const after = await identity(pool, id);
    assert.equal(after.full_name, `אותו אדם ${tag}`);
  });
});

// ─── the record of it ────────────────────────────────────────────────────────

dbTest("an edit records what it was before", async () => {
  // "Who changed this and what was it" is the question asked when a customer
  // says their details are wrong, and the answer has to survive the change.
  await withDb(async ({ pool, audit, tag }) => {
    const id = await makeGuest(pool, tag);
    const recorded = [];
    const spy = { record: async (entry) => { recorded.push(entry); } };

    await updateAdminCustomer({ pool, audit: spy, admin: ADMIN }, {
      identity_id: id,
      full_name: `שונה ${tag}`,
    });

    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].actionType, "customer.updated");
    assert.equal(recorded[0].oldValues.full_name, `אורח ${tag}`);
    assert.equal(recorded[0].newValues.full_name, `שונה ${tag}`);
  });
});

dbTest("an unknown customer is a 404, not a silent success", async () => {
  await withDb(async ({ pool, audit }) => {
    await assert.rejects(
      updateAdminCustomer({ pool, audit, admin: ADMIN }, {
        identity_id: "00000000-0000-4000-8000-000000000000",
        full_name: "מישהו",
      }),
      (error) => error.statusCode === 404,
    );
  });
});
