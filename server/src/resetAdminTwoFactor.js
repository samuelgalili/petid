// Clears one admin's authenticator enrolment.
//
// This is the owner recovery path for a lost device AND lost recovery codes.
// It needs DATABASE_URL on the host. It is a script, not an HTTP route: a
// route that could clear a second factor would be a way around the factor.
//
// The password is left as it is. Re-provisioning (admin:provision) is the
// separate path that also rotates the password.

import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { clearAdminTwoFactor } from "./adminTwoFactor.js";

const parseArgs = (args) => {
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--")) continue;
    values.set(key.slice(2), args[index + 1]);
    index += 1;
  }
  return values;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.get("email") || "").trim().toLowerCase();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!email || !email.includes("@")) throw new Error("--email must be a valid email address");

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === "false"
      ? false
      : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
  });

  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query(
      "select id, email from public.admin_users where lower(email) = $1 for update",
      [email],
    );
    if (existing.rowCount === 0) throw new Error(`No admin user uses ${email}`);
    if (existing.rowCount > 1) throw new Error(`Multiple admin users use the normalized email ${email}`);

    const cleared = await clearAdminTwoFactor(client, existing.rows[0].id);
    await client.query(
      `
        insert into public.admin_audit_log (
          action_type,
          entity_type,
          entity_id,
          new_values,
          metadata,
          actor_email,
          actor_role,
          actor_type
        )
        values ('admin.mfa_reset', 'admin_user', $1, $2::jsonb, $3::jsonb, 'reset-2fa-script', 'system', 'system')
      `,
      [
        cleared.id,
        JSON.stringify({ email: cleared.email, totp_enrolled_at: null }),
        JSON.stringify({
          mfa_enrolment_cleared: true,
          recovery_codes_deleted: true,
          sessions_revoked: true,
          password_changed: false,
        }),
      ],
    );
    await client.query("commit");

    console.log(JSON.stringify({
      id: cleared.id,
      email: cleared.email,
      mfa_enrolment_cleared: true,
      password_changed: false,
      sessions_revoked: true,
    }, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
