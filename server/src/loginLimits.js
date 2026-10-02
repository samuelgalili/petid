// Login failures are counted twice, on purpose, and the two caps are not the
// same. The account cap is the lock that matters (an admin stays at 8). The
// address cap is only there to stop one network from trying forever, and it
// has to sit far above the account cap: a shared connection or CGNAT address
// must not lock every other account after a handful of wrong passwords.

export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;

export const DEFAULT_ADMIN_LOGIN_ACCOUNT_LIMIT = 8;
export const DEFAULT_USER_LOGIN_ACCOUNT_LIMIT = 20;
export const DEFAULT_LOGIN_IP_FAILURE_LIMIT = 100;

const readLimit = (value, fallback, min, max) => {
  if (value == null || String(value).trim() === "") return fallback;
  const parsed = Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
};

// An override above 8 is ignored. Raising this is how admin login would get
// weaker, so an invalid or too-high value keeps 8.
export const adminLoginAccountLimit = (env = process.env) => readLimit(
  env.ADMIN_LOGIN_ACCOUNT_LIMIT,
  DEFAULT_ADMIN_LOGIN_ACCOUNT_LIMIT,
  1,
  DEFAULT_ADMIN_LOGIN_ACCOUNT_LIMIT,
);

// Same idea for customers: the default is 20, and a higher setting is ignored.
export const userLoginAccountLimit = (env = process.env) => readLimit(
  env.USER_LOGIN_ACCOUNT_LIMIT,
  DEFAULT_USER_LOGIN_ACCOUNT_LIMIT,
  1,
  DEFAULT_USER_LOGIN_ACCOUNT_LIMIT,
);

// Below 50 the address cap collapses back toward the account cap and one
// network can lock everyone else again. Above 500 it stops being a cap.
export const loginIpFailureLimit = (env = process.env) => readLimit(
  env.LOGIN_IP_FAILURE_LIMIT,
  DEFAULT_LOGIN_IP_FAILURE_LIMIT,
  50,
  500,
);

const windowed = (limit) => ({ limit, windowMs: LOGIN_FAILURE_WINDOW_MS });

export const adminLoginLimits = (env = process.env) => ({
  ip: windowed(loginIpFailureLimit(env)),
  account: windowed(adminLoginAccountLimit(env)),
});

export const userLoginLimits = (env = process.env) => ({
  ip: windowed(loginIpFailureLimit(env)),
  account: windowed(userLoginAccountLimit(env)),
});
