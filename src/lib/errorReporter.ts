interface ErrorReport {
  message: string;
  stack_trace?: string;
  component?: string;
  route?: string;
  error_source?: "client" | "edge_function" | "database";
  error_type?: "runtime" | "network" | "rls" | "constraint" | "timeout";
  severity?: "warning" | "error" | "critical";
  metadata?: Record<string, unknown>;
}

const recentErrors = new Set<string>();

export const reportError = async (report: ErrorReport) => {
  const key = `${report.message}::${report.component || ""}`;
  if (recentErrors.has(key)) return;
  recentErrors.add(key);
  setTimeout(() => recentErrors.delete(key), 30_000);

  try {
    await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content_type: "client_error",
        content_id: report.component || report.route || "app",
        reason: report.severity || "error",
        description: report.message.slice(0, 500),
      }),
      keepalive: true,
    });
  } catch {
    // Silent — don't recurse on error reporting failure.
  }
};

export const initGlobalErrorReporter = () => {
  window.addEventListener("error", (event) => {
    reportError({
      message: event.message || "Unknown error",
      stack_trace: event.error?.stack,
      error_source: "client",
      error_type: "runtime",
      severity: "error",
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    reportError({
      message: reason?.message || String(reason) || "Unhandled promise rejection",
      stack_trace: reason?.stack,
      error_source: "client",
      error_type: "runtime",
      severity: "error",
    });
  });
};
