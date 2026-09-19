// Opening a customer by hand, without making the duplicates problem worse.
//
// A shop_customers row is born in exactly one place today: the checkout, at
// index.js:6143. The table already carries duplicates - index.js:6611 uses
// `distinct on` and says so in a comment - so a second way to create rows is
// a second way to make that worse, unless it recognises people first.
//
// The two matches are not the same kind of thing and the tests below are
// mostly about that difference:
//
//   an email IS an identity   -> return the customer, create nothing
//   a phone IS an address     -> report the candidates, decide nothing
//
// A unique index on the phone would have refused the second real customer at
// a shared landline. 0057 carries the reasoning; this file carries the
// behaviour.

import assert from "node:assert/strict";
import test from "node:test";

import { createAdminCustomer, normalizePhone, parseNewCustomer } from "../src/adminOs/customers.js";
import { createAuditService } from "../src/adminOs/auditService.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const ADMIN = { id: null, email: "ops@mipo.pet", role: "admin" };

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const tag = `t${Math.random().toString(36).slice(2, 8)}`;
  const audit = createAuditService({ pool, logger: { error: () => {} } });
  try {
    await fn({ pool, audit, tag });
  } finally {
    // shop_customers first: its user_id points at app_users.
    await pool.query("delete from public.shop_customers where email like $1 or full_name like $1", [`%${tag}%`])
      .catch(() => {});
    await pool.query("delete from public.app_users where email like $1", [`%${tag}%`]).catch(() => {});
    await pool.query("delete from public.admin_audit_log where entity_type = 'shop_customer'").catch(() => {});
    await pool.end();
  }
};

const create = ({ pool, audit }, body) => createAdminCustomer({ pool, audit, admin: ADMIN }, body);

// ─── the normaliser agrees with the other two copies of itself ───────────────

test("every spelling of one Israeli number normalises the same", () => {
  // The SQL function in 0057 and toWhatsAppNumber in the browser implement the
  // same rule. Three copies that disagree means the index finds nothing the
  // endpoint was looking for.
  const expected = "972501234567";
  for (const spelling of ["050-123-4567", "+972 50 123 4567", "00972501234567", "+972 050 123 4567"]) {
    assert.equal(normalizePhone(spelling), expected, spelling);
  }
});

test("something too short to dial is not an identity", () => {
  assert.equal(normalizePhone("123"), null);
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone(null), null);
});

const SPELLINGS = [
  "050-123-4567", "+972 50 123 4567", "00972501234567", "+972 050 123 4567",
  "0501234567", "972501234567", "03-1234567", "+972-3-123-4567",
  "  050 123 4567  ", "123", "", "not a number",
];

dbTest("the SQL normaliser and the JavaScript one give the same answer", async () => {
  await withDb(async ({ pool }) => {
    // THIS IS THE ONE THAT MATTERS. The generated phone_normalized column is
    // written by mipo_normalize_phone in the database; the lookup above is a
    // value computed here. If the two disagree by one spelling, the endpoint
    // searches for a string the index does not contain, reports no candidates,
    // and creates the duplicate it exists to prevent - silently, and only for
    // the spellings where they differ.
    for (const spelling of SPELLINGS) {
      const { rows } = await pool.query("select public.mipo_normalize_phone($1) as normalized", [spelling]);
      assert.equal(
        rows[0].normalized,
        normalizePhone(spelling),
        `the database and the endpoint disagree about ${JSON.stringify(spelling)}`,
      );
    }
  });
});

test("the browser's copy of the normaliser is the same rule", async () => {
  // src/lib/customerContact.ts holds a third copy, for the WhatsApp deep link.
  // It cannot be imported here - it is TypeScript, and this runner is node
  // --test - so the two bodies are compared as code. An edit to either one
  // turns this red, which is the whole point: three copies that drift are how
  // a number reachable on WhatsApp becomes unfindable in search.
  const { readFile } = await import("node:fs/promises");
  const bodyOf = (source, marker) => source
    .slice(source.indexOf(marker))
    .slice(0, source.indexOf("};", source.indexOf(marker)) - source.indexOf(marker))
    .replace(/\/\/[^\n]*/g, "")          // comments differ; the rule must not
    .replace(/\s+/g, " ")
    .trim();

  const browser = bodyOf(
    await readFile(new URL("../../src/lib/customerContact.ts", import.meta.url), "utf8"),
    "let digits",
  );
  const server = bodyOf(
    await readFile(new URL("../src/adminOs/customers.js", import.meta.url), "utf8"),
    "let digits",
  );

  assert.equal(server, browser, "the server and the browser normalise phone numbers differently");
});

// ─── what a customer must have ───────────────────────────────────────────────

test("a customer needs a name", () => {
  assert.throws(() => parseNewCustomer({ email: "a@b.com" }), /needs a name/);
});

test("a customer needs a way to be recognised again", () => {
  // A row with neither is a name that can never be matched against, which
  // guarantees a duplicate the next time the same person is entered.
  assert.throws(() => parseNewCustomer({ full_name: "דנה" }), /email address or a phone number/);
});

test("a phone alone is enough, now that email is nullable", () => {
  const parsed = parseNewCustomer({ full_name: "דנה", phone: "050-123-4567" });
  assert.equal(parsed.email, null);
  assert.equal(parsed.phoneNormalized, "972501234567");
});

test("a malformed email is refused rather than stored", () => {
  assert.throws(() => parseNewCustomer({ full_name: "דנה", email: "not-an-email" }), /email address/);
});

// ─── the key belongs to the submission, not to the call ──────────────────────

test("the browser sends an Idempotency-Key it did not invent", async () => {
  // The route is declared idempotent, which does nothing unless the caller
  // sends the same key twice for the same submission. Minting the key inside
  // the api function is the tempting simplification and it silently removes
  // the whole protection: every retry becomes a new request, and a
  // double-click opens two customers. Nothing else in the suite would notice -
  // the server would be behaving correctly on each of the two calls.
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../../src/lib/mipoApi.ts", import.meta.url), "utf8");
  // With the paren: createAdminCustomerNote is declared earlier and
  // createAdminCustomer is a prefix of it, so the name alone finds the wrong
  // function and every assertion below reads a body it was not written about.
  const fn = source.slice(source.indexOf("export async function createAdminCustomer("));
  const body = fn.slice(0, fn.indexOf("\n}\n"));

  assert.match(body, /idempotencyKey: string/, "the key is not a parameter");
  assert.match(body, /"Idempotency-Key": idempotencyKey/, "the key is not sent");
  assert.doesNotMatch(body, /createClientId|randomUUID/, "the key is minted inside the call");
});

// ─── an email is an identity ─────────────────────────────────────────────────

dbTest("an existing email returns the existing customer and creates nothing", async () => {
  await withDb(async (context) => {
    const email = `dana.${context.tag}@example.com`;

    const first = await create(context, { full_name: `דנה ${context.tag}`, email });
    assert.equal(first.status, 201);
    assert.equal(first.body.created, true);

    const second = await create(context, { full_name: "מישהו אחר", email });
    assert.equal(second.body.created, false);
    assert.equal(second.body.matched_by, "email");
    assert.equal(second.body.customer.id, first.body.customer.id);

    const { rows } = await context.pool.query(
      "select count(*)::int as count from public.shop_customers where lower(email) = $1",
      [email.toLowerCase()],
    );
    assert.equal(rows[0].count, 1, "a second row was created for one email address");
  });
});

dbTest("a manual customer has never ordered", async () => {
  await withDb(async (context) => {
    // The checkout writes last_order_at = now() because a checkout IS an
    // order. Opening a customer is not one, and writing it would put somebody
    // who has never bought anything at the top of a list sorted by recency.
    const created = await create(context, {
      full_name: `דנה ${context.tag}`,
      email: `dana.${context.tag}@example.com`,
    });
    assert.equal(created.body.customer.last_order_at, null);
  });
});

dbTest("a manual create never unlinks an account", async () => {
  await withDb(async (context) => {
    const email = `linked.${context.tag}@example.com`;

    // A REAL app_users row: shop_customers.user_id carries a foreign key, so an
    // invented uuid tests the fixture rather than the endpoint.
    const { rows: users } = await context.pool.query(
      "insert into public.app_users (email, password_hash) values ($1, 'x') returning id",
      [email],
    );
    const userId = users[0].id;

    await context.pool.query(
      "insert into public.shop_customers (email, full_name, user_id) values ($1, $2, $3)",
      [email, `לקוח ${context.tag}`, userId],
    );

    await create(context, { full_name: "שם חדש", email });

    const { rows } = await context.pool.query(
      "select user_id from public.shop_customers where lower(email) = $1",
      [email.toLowerCase()],
    );
    assert.equal(
      rows[0].user_id,
      userId,
      "the account link was dropped. That is the quietest damage this endpoint can do:\n" +
        "the person keeps their orders and loses their login, or the reverse.",
    );
  });
});

dbTest("two agents entering the same person at once produce one customer", async () => {
  await withDb(async (context) => {
    // The race is the only way to reach the insert's conflict clause, because
    // the email branch above catches every calm case. It used to `do update`
    // there: the loser overwrote a real customer's name and phone and reported
    // created: true. This asserts the outcome that holds however the race
    // resolves - one row, one id, one creation - so it is not timing-flaky.
    const email = `race.${context.tag}@example.com`;

    const [a, b] = await Promise.all([
      create(context, { full_name: `דנה ${context.tag}`, email, phone: "050-111-2222" }),
      create(context, { full_name: `דנה כהן ${context.tag}`, email, phone: "050-333-4444" }),
    ]);

    const { rows } = await context.pool.query(
      "select id, full_name, phone from public.shop_customers where lower(email) = $1",
      [email.toLowerCase()],
    );
    assert.equal(rows.length, 1, "the race created two customers for one email address");
    assert.equal(a.body.customer.id, b.body.customer.id, "the two calls disagree about who this is");
    assert.equal(
      [a, b].filter((result) => result.body.created).length,
      1,
      "both calls claimed to have created the customer, or neither did",
    );

    // Whoever lost must not have rewritten the winner's row.
    const winner = [a, b].find((result) => result.body.created);
    assert.equal(rows[0].full_name, winner.body.customer.full_name);
    assert.equal(rows[0].phone, winner.body.customer.phone);
  });
});

// ─── a phone is an address ───────────────────────────────────────────────────

dbTest("a shared phone reports the candidates instead of deciding", async () => {
  await withDb(async (context) => {
    const phone = "050-765-4321";

    const first = await create(context, { full_name: `אבי ${context.tag}`, phone, email: `avi.${context.tag}@example.com` });
    assert.equal(first.body.created, true);

    // The partner, at the same landline. A unique index would have refused
    // this person outright.
    const second = await create(context, { full_name: `רותי ${context.tag}`, phone });
    assert.equal(second.body.created, false);
    assert.equal(second.body.matched_by, "phone");
    assert.equal(second.body.candidates.length, 1);
    assert.equal(second.body.candidates[0].id, first.body.customer.id);
  });
});

dbTest("the admin can say it is a different person, and then it is", async () => {
  await withDb(async (context) => {
    const phone = "050-765-4321";
    await create(context, { full_name: `אבי ${context.tag}`, phone, email: `avi.${context.tag}@example.com` });

    const confirmed = await create(context, {
      full_name: `רותי ${context.tag}`,
      phone,
      accept_duplicate_phone: true,
    });

    assert.equal(confirmed.status, 201);
    assert.equal(confirmed.body.created, true);

    const { rows } = await context.pool.query(
      "select count(*)::int as count from public.shop_customers where phone_normalized = $1",
      [normalizePhone(phone)],
    );
    assert.equal(rows[0].count, 2, "the confirmed second person at the same number was not created");
  });
});

dbTest("the phone lookup matches across spellings, not across strings", async () => {
  await withDb(async (context) => {
    await create(context, {
      full_name: `אבי ${context.tag}`,
      phone: "+972 50 765 4321",
      email: `avi.${context.tag}@example.com`,
    });

    // Typed differently by a different agent. Same person.
    const second = await create(context, { full_name: `אבי ${context.tag}`, phone: "050-765-4321" });
    assert.equal(
      second.body.matched_by,
      "phone",
      "the same number written two ways was treated as two people. That is what\n" +
        "the generated phone_normalized column exists to prevent.",
    );
  });
});

// ─── the account link is shown, not made ─────────────────────────────────────

dbTest("an email belonging to an account is reported and not linked", async () => {
  await withDb(async (context) => {
    const email = `account.${context.tag}@example.com`;
    const { rows: users } = await context.pool.query(
      `insert into public.app_users (email, password_hash) values ($1, 'x') returning id`,
      [email],
    ).catch(() => ({ rows: [] }));

    if (users.length === 0) return; // app_users shape differs; the assertion below is the point

    const created = await create(context, { full_name: `לקוח ${context.tag}`, email });

    assert.equal(created.body.account_match?.user_id, users[0].id, "the account was not reported");
    assert.equal(
      created.body.customer.user_id,
      null,
      "the manual create LINKED the customer to an account. D-2 says show it and\n" +
        "let a person decide - being wrong about two records being one person is\n" +
        "silent and attaches somebody's order history to a stranger.",
    );

    await context.pool.query("delete from public.app_users where id = $1", [users[0].id]).catch(() => {});
  });
});

// ─── it is written down ──────────────────────────────────────────────────────

dbTest("creating a customer is audited as an admin action", async () => {
  await withDb(async (context) => {
    const created = await create(context, {
      full_name: `דנה ${context.tag}`,
      email: `dana.${context.tag}@example.com`,
    });

    const entries = await context.audit.list({ entityType: "shop_customer", entityId: created.body.customer.id });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].action_type, "customer.created");
    assert.equal(entries[0].actor_type, "admin");
    assert.equal(entries[0].actor_email, ADMIN.email);
  });
});

dbTest("a match is not audited as a creation", async () => {
  await withDb(async (context) => {
    const email = `dana.${context.tag}@example.com`;
    const first = await create(context, { full_name: `דנה ${context.tag}`, email });
    await create(context, { full_name: `דנה ${context.tag}`, email });

    const entries = await context.audit.list({ entityType: "shop_customer", entityId: first.body.customer.id });
    assert.equal(entries.length, 1, "returning an existing customer was logged as creating one");
  });
});
