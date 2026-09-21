/**
 * Connectors — a third party's credential, held by us.
 *
 * Phase 7, unblocked the day secretStore.js existed. The shape of this module
 * is downstream of one rule from D-4, quoted because it is the rule that is
 * easiest to break by accident:
 *
 *   "the frontend receives connected, provider, account name, scopes,
 *    last_verified, expires_at, health — and never a secret, not even masked
 *    from the server side. `••••••••` is rendered from nothing, not from a
 *    truncated real value."
 *
 * So there is no code path here that returns a decrypted secret to a caller.
 * The only function that decrypts is `verifyConnector`, which hands the
 * plaintext to an outbound request and never to a response body. A column list
 * is used rather than `select *` for exactly this reason: `select *` is how
 * the sealed record ends up in a response the day someone adds a field.
 *
 * WHAT A PROVIDER IS HERE. A name, how to reach it, and how to check a key is
 * good. The base URL and API version are STORED, not compiled in, because
 * getting them wrong produces a 401 the owner reads as "my key is bad" - a
 * support incident rather than a bug. Stored, they are a one-minute fix on the
 * admin screen instead of a deploy.
 */

import { decryptSecret, describeSecret, encryptSecret, isSecretStoreConfigured } from "../secretStore.js";

/** Everything the client may see. `secret` is deliberately absent. */
const CONNECTOR_COLUMNS = `
  id, provider, label, settings, status, last_error, last_verified_at,
  created_by, updated_by, created_at, updated_at
`;

/**
 * The providers this build knows how to talk to.
 *
 * `verify` describes a request whose only job is to answer "is this key
 * accepted". It must be a READ: a verification that creates something bills
 * the owner for pressing a button labelled "check".
 */
export const PROVIDERS = {
  runway: {
    label: "Runway",
    /**
     * COULD NOT BE VERIFIED AGAINST THE DOCUMENTATION. docs.dev.runwayml.com
     * is blocked by this environment's network policy, so these two values are
     * from the shape Runway's API is known to use rather than from a page that
     * was read. They are stored on the connector precisely so that being wrong
     * costs an edit rather than a deploy - and the screen says so next to the
     * fields.
     */
    defaults: {
      baseUrl: "https://api.dev.runwayml.com/v1",
      apiVersion: "2024-11-06",
    },
    /** Bearer auth plus a version header. The version is read from settings. */
    buildVerifyRequest: ({ secret, settings }) => ({
      url: `${String(settings.baseUrl || "").replace(/\/+$/, "")}/organization`,
      method: "GET",
      headers: {
        authorization: `Bearer ${secret}`,
        "x-runway-version": String(settings.apiVersion || ""),
        accept: "application/json",
      },
    }),
  },
};

export const isKnownProvider = (provider) => Object.hasOwn(PROVIDERS, String(provider || ""));

/**
 * The connectors, as the client may see them.
 *
 * `secret` never appears. `secret_state` is computed through
 * describeSecret, which returns only whether something is stored.
 */
export const listConnectors = async ({ pool }) => {
  const { rows } = await pool.query(
    `select ${CONNECTOR_COLUMNS}, secret from public.admin_connectors order by provider`,
  );

  return rows.map(({ secret, ...connector }) => ({
    ...connector,
    ...describeSecret(secret),
    // A provider this build no longer knows how to talk to is shown as such
    // rather than silently offering a verify button that cannot work.
    known_provider: isKnownProvider(connector.provider),
  }));
};

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

/**
 * Store or replace a provider's credential.
 *
 * An empty `api_key` keeps whatever is stored, so the owner can correct a base
 * URL without re-pasting a key they may not have to hand. That is not a
 * convenience: making someone re-enter a secret to fix an unrelated typo is
 * how secrets end up in a note on a desktop.
 */
export const saveConnector = async ({ pool, audit, admin }, provider, body) => {
  if (!isKnownProvider(provider)) throw badRequest(`Unknown provider: ${provider}`);

  const apiKey = typeof body?.api_key === "string" ? body.api_key.trim() : "";
  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 120) : null;

  const definition = PROVIDERS[provider];
  const settings = {
    baseUrl: String(body?.settings?.baseUrl || definition.defaults.baseUrl).trim(),
    apiVersion: String(body?.settings?.apiVersion || definition.defaults.apiVersion).trim(),
  };

  if (!/^https:\/\//i.test(settings.baseUrl)) {
    // An http:// base URL would put the key on the wire in the clear.
    throw badRequest("The base URL must be https://");
  }

  if (apiKey && !isSecretStoreConfigured()) {
    const error = new Error(
      "Secret storage is not configured, so the key was not stored. "
      + "Set SECRET_ENCRYPTION_KEY and try again.",
    );
    error.statusCode = 503;
    error.code = "SECRET_STORE_UNAVAILABLE";
    throw error;
  }

  const sealed = apiKey ? encryptSecret(apiKey) : null;

  const { rows } = await pool.query(
    `
      insert into public.admin_connectors (provider, label, settings, secret, status, created_by, updated_by)
      values ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $6)
      on conflict (provider) do update set
        label = coalesce(excluded.label, public.admin_connectors.label),
        settings = excluded.settings,
        -- A save without a key keeps the stored one.
        secret = coalesce(excluded.secret, public.admin_connectors.secret),
        -- Any save invalidates the last verification: the settings may have
        -- changed under a key that was fine, and a stale "connected" badge is
        -- worse than an honest "unverified".
        status = 'unverified',
        last_error = null,
        last_verified_at = null,
        updated_by = excluded.updated_by,
        updated_at = now()
      returning ${CONNECTOR_COLUMNS}, secret
    `,
    [provider, label, JSON.stringify(settings), sealed ? JSON.stringify(sealed) : null, "unverified", admin?.id ?? null],
  );

  const { secret, ...connector } = rows[0];

  await audit.record({
    actorType: "admin",
    actor: admin,
    actionType: apiKey ? "connector.key_stored" : "connector.settings_updated",
    entityType: "admin_connector",
    entityId: connector.id,
    // The key is not here, and neither is its length: a length narrows a
    // brute-force search and tells a reader which provider's format it is.
    newValues: { provider, label: connector.label, settings },
  });

  return { ...connector, ...describeSecret(secret), known_provider: true };
};

/**
 * Forget a provider's credential.
 *
 * The ROW stays and the secret is nulled, so the settings and the audit trail
 * survive a disconnect. Deleting the row would take the history of who
 * connected what with it.
 */
export const disconnectConnector = async ({ pool, audit, admin }, provider) => {
  const { rows } = await pool.query(
    `
      update public.admin_connectors
         set secret = null, status = 'unverified', last_error = null,
             last_verified_at = null, updated_by = $2, updated_at = now()
       where provider = $1
      returning ${CONNECTOR_COLUMNS}
    `,
    [provider, admin?.id ?? null],
  );

  if (rows.length === 0) {
    const error = new Error("Connector not found");
    error.statusCode = 404;
    throw error;
  }

  await audit.record({
    actorType: "admin",
    actor: admin,
    actionType: "connector.disconnected",
    entityType: "admin_connector",
    entityId: rows[0].id,
    newValues: { provider },
  });

  return { ...rows[0], stored: false, provider_state: null, known_provider: isKnownProvider(provider) };
};

/**
 * Ask the provider whether the key is good.
 *
 * THE ONLY PLACE A SECRET IS DECRYPTED, and it goes straight into an outbound
 * request. The response body is read for a message and then discarded; nothing
 * from it is stored except a short error string.
 *
 * `fetchImpl` is injected so a test can drive every branch without a network.
 */
export const verifyConnector = async ({ pool, audit, admin, fetchImpl = fetch }, provider) => {
  if (!isKnownProvider(provider)) throw badRequest(`Unknown provider: ${provider}`);

  const { rows } = await pool.query(
    `select ${CONNECTOR_COLUMNS}, secret from public.admin_connectors where provider = $1`,
    [provider],
  );
  if (rows.length === 0) {
    const error = new Error("Connector not found");
    error.statusCode = 404;
    throw error;
  }

  const { secret, ...connector } = rows[0];
  if (!secret) throw badRequest("No key is stored for this provider");

  let status = "error";
  let lastError = null;

  try {
    const request = PROVIDERS[provider].buildVerifyRequest({
      secret: decryptSecret(secret),
      settings: connector.settings || {},
    });

    const response = await fetchImpl(request.url, { method: request.method, headers: request.headers });

    if (response.ok) {
      status = "connected";
    } else {
      // The provider's own words, truncated. This is the most useful thing on
      // the screen and the thing most likely to be swallowed into "failed".
      const body = await response.text().catch(() => "");
      lastError = `${response.status}: ${String(body || response.statusText || "").slice(0, 300)}`;
    }
  } catch (error) {
    // A network failure is not a bad key, and saying "invalid key" here sends
    // the owner to rotate a credential that was fine.
    lastError = `לא הצלחנו להגיע לספק: ${String(error?.message || error).slice(0, 200)}`;
  }

  const { rows: updated } = await pool.query(
    `
      update public.admin_connectors
         set status = $2, last_error = $3,
             last_verified_at = case when $2 = 'connected' then now() else last_verified_at end,
             updated_at = now()
       where provider = $1
      returning ${CONNECTOR_COLUMNS}
    `,
    [provider, status, lastError],
  );

  await audit.record({
    actorType: "admin",
    actor: admin,
    actionType: "connector.verified",
    entityType: "admin_connector",
    entityId: connector.id,
    newValues: { provider, status, last_error: lastError },
  });

  return { ...updated[0], stored: true, known_provider: true };
};
