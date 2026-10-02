/**
 * An email address is not proof that the person who typed it holds it.
 *
 * Signup used to attach the guest customer for that address immediately, and
 * deleting the new account then cleared the name, phone, and shipping address
 * on every order that used the address. The claim now runs only after the
 * verification code checks out. Deletion matches by address only when that
 * proof is already stored on the account.
 */

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

/** First word of the name typed at signup, safe to place in the HTML mail. */
export const verificationGreetingHtml = (fullName) => {
  const name = escapeHtml(String(fullName || "").trim().split(" ")[0]);
  return name ? `היי ${name},` : "היי,";
};

/**
 * Address match is allowed only for a real boolean true and a real address.
 * Anything else (missing, a string, a Date) stays closed.
 */
const provenEmail = (email, emailVerified) => {
  if (emailVerified !== true) return null;
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) return null;
  return normalized;
};

/**
 * Attach the unclaimed guest customer, and guest orders of this address, to
 * the account that just proved it. A row that already names an account is
 * left alone.
 */
export const claimVerifiedGuestCommerce = async (client, { userId, email } = {}) => {
  const normalized = normalizeEmail(email);
  if (!userId || !normalized.includes("@")) return { customers: 0, orders: 0 };

  const customers = await client.query(
    `
      update public.shop_customers
      set user_id = $1,
          updated_at = now()
      where lower(email) = $2
        and user_id is null
    `,
    [userId, normalized],
  );

  const orders = await client.query(
    `
      update public.orders
      set user_id = $1,
          updated_at = now()
      where user_id is null
        and lower(customer_email) = $2
    `,
    [userId, normalized],
  );

  return {
    customers: customers.rowCount ?? 0,
    orders: orders.rowCount ?? 0,
  };
};

const ORDER_ANONYMIZE_SQL = `
  update public.orders
  set
    user_id = null,
    customer_name = 'Deleted user',
    customer_email = null,
    customer_phone = null,
    shipping_address = '{}'::jsonb,
    updated_at = now()
`;

/**
 * Financial rows stay. Personal details are cleared only on orders that
 * belong to this account (user_id), plus guest orders of an address this
 * account has verified. An order owned by somebody else is never included,
 * and an unverified address never matches a guest order on its own.
 */
export const anonymizeOrdersForDeletedAccount = async (
  client,
  { userId, email, emailVerified } = {},
) => {
  const proven = provenEmail(email, emailVerified);
  if (proven) {
    return client.query(
      `${ORDER_ANONYMIZE_SQL}
       where user_id = $1
          or (user_id is null and lower(customer_email) = $2)`,
      [userId, proven],
    );
  }
  return client.query(
    `${ORDER_ANONYMIZE_SQL} where user_id = $1`,
    [userId],
  );
};

/**
 * A commerce row linked by user_id belongs to the account, including one
 * created under a second checkout address. A guest row (no account yet) is
 * removed only when this account has verified that address. A row already
 * linked to a different account is left alone.
 */
export const deleteShopCustomersForDeletedAccount = async (
  client,
  { userId, email, emailVerified } = {},
) => {
  const proven = provenEmail(email, emailVerified);
  if (proven) {
    return client.query(
      `
        delete from public.shop_customers
        where user_id = $1
           or (user_id is null and lower(email) = $2)
      `,
      [userId, proven],
    );
  }
  return client.query(
    "delete from public.shop_customers where user_id = $1",
    [userId],
  );
};

/** Lock the account row so verification cannot commit a claim under this delete. */
export const readAccountEmailProof = async (client, userId) => {
  const result = await client.query(
    "select email, email_verified_at from public.app_users where id = $1 for update",
    [userId],
  );
  const row = result.rows[0];
  return {
    email: normalizeEmail(row?.email),
    emailVerified: Boolean(row?.email_verified_at),
  };
};
