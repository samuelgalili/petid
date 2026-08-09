import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ADMIN_ROLES, isSupportedAdminRole } from "./adminPermissions.js";
import { hashPassword } from "./passwords.js";

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

const args = parseArgs(process.argv.slice(2));
const email = String(args.get("email") || "").trim().toLowerCase();
const role = String(args.get("role") || ADMIN_ROLES.PRODUCT_MANAGER).trim();
const displayName = String(args.get("display-name") || "Product manager").trim();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!email || !email.includes("@")) throw new Error("--email must be a valid email address");
if (!isSupportedAdminRole(role)) throw new Error(`Unsupported admin role: ${role}`);

const temporaryPassword = randomBytes(18).toString("base64url");
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
    "select id from public.admin_users where lower(email) = $1 for update",
    [email],
  );
  if (existing.rowCount > 1) throw new Error(`Multiple admin users use the normalized email ${email}`);

  const passwordHash = hashPassword(temporaryPassword);
  const result = existing.rowCount === 1
    ? await client.query(
      `
        update public.admin_users
        set
          email = $2,
          password_hash = $3,
          display_name = $4,
          role = $5,
          is_active = true,
          must_change_password = true,
          updated_at = now()
        where id = $1
        returning id, email, display_name, role
      `,
      [existing.rows[0].id, email, passwordHash, displayName, role],
    )
    : await client.query(
      `
        insert into public.admin_users (
          email,
          password_hash,
          display_name,
          role,
          is_active,
          must_change_password
        )
        values ($1, $2, $3, $4, true, true)
        returning id, email, display_name, role
      `,
      [email, passwordHash, displayName, role],
    );
  await client.query(
    "delete from public.admin_sessions where admin_user_id = $1",
    [result.rows[0].id],
  );
  await client.query(
    `
      insert into public.admin_audit_log (
        action_type,
        entity_type,
        entity_id,
        new_values,
        metadata,
        actor_email,
        actor_role
      )
      values ($1, 'admin_user', $2, $3::jsonb, $4::jsonb, 'provisioning-script', 'system')
    `,
    [
      existing.rowCount === 1 ? "admin.reprovisioned" : "admin.provisioned",
      result.rows[0].id,
      JSON.stringify({ email, display_name: displayName, role, is_active: true }),
      JSON.stringify({ must_change_password: true, sessions_revoked: true }),
    ],
  );
  await client.query("commit");

  console.log(JSON.stringify({
    ...result.rows[0],
    temporary_password: temporaryPassword,
    must_change_password: true,
  }, null, 2));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
