// How a maintenance script connects, matching how the API connects.
//
// Every script in this directory built its pool with
//
//     ssl: process.env.DB_SSL === "false" ? false : undefined
//
// and `undefined` is not "use the default" - node-postgres reads it as NO TLS.
// The API, three lines of a different file away, does the opposite:
//
//     ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: ... }
//
// Production is RDS and RDS refuses an unencrypted connection, so every one of
// the eight scripts failed at the first query with
//
//     no pg_hba.conf entry for host "...", user "mipo_app", database "mipo",
//     no encryption
//
// That is the whole reason no maintenance script had ever run against
// production: not permissions, not the Dockerfile, not the workflow guards -
// they could not open a connection. The failure names pg_hba first, which
// reads like an access-list problem and sends you to the security group; the
// operative words are the last two.
//
// So the connection options live here, once, in the same shape the API uses.
// A script that needs a database asks this module for its options rather than
// spelling them out and drifting.

/**
 * Pool options for a script, mirroring server/src/index.js.
 *
 * DB_SSL=false disables TLS, for a local postgres that does not speak it.
 * DB_SSL_REJECT_UNAUTHORIZED=false keeps TLS but accepts RDS's own CA chain
 * without bundling it - the same escape hatch, spelled the same way, as the
 * API's.
 */
export const scriptPoolOptions = (env = process.env) => {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  return {
    connectionString: databaseUrl,
    ssl: env.DB_SSL === "false"
      ? false
      : { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
  };
};
