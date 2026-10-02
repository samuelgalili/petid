import { handleContentReport, isClientErrorReport } from "./contentReports.js";

// Content reports stay at 10 per hour, now per signed-in user as well as per
// IP. Client errors used to share that bucket and fill the moderation table;
// they get their own limit and are not stored.
const LIMITS = {
  clientError: { limit: 30, windowMs: 60 * 60 * 1000 },
  ip: { limit: 10, windowMs: 60 * 60 * 1000 },
  user: { limit: 10, windowMs: 60 * 60 * 1000 },
};

export const createContentReportRoutes = ({
  pool,
  sendJson,
  readBody,
  requireUser,
  enforceRateLimit,
  emitEvent,
}) => async (request, response, url) => {
  if (request.method !== "POST" || url.pathname !== "/api/reports") return false;

  const body = await readBody(request, 16 * 1024);
  if (isClientErrorReport(body)) {
    if (!enforceRateLimit(request, response, "client-error-report", LIMITS.clientError)) return true;
    response.writeHead(204);
    response.end();
    return true;
  }

  if (!enforceRateLimit(request, response, "report-create", LIMITS.ip)) return true;
  const auth = await requireUser(request, response);
  if (!auth?.user?.id) return true;
  if (!enforceRateLimit(request, response, "report-create-user", LIMITS.user, auth.user.id)) return true;

  const result = await handleContentReport(pool, {
    body,
    reporterId: auth.user.id,
    emit: emitEvent,
  });
  sendJson(response, result.status, result.body);
  return true;
};
