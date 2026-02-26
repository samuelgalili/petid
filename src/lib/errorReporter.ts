import { supabase } from "@/integrations/supabase/client";

interface ErrorReport {
  message: string;
  stack_trace?: string;
  component?: string;
  route?: string;
  error_source?: "client" | "edge_function" | "database";
  error_type?: "runtime" | "network" | "rls" | "constraint" | "timeout";
  severity?: "warning" | "error" | "critical";
  metadata?: Record<string, any>;
}

const recentErrors = new Set<string>();

export const reportError = async (report: ErrorReport) => {
  // Deduplicate within 30s window
  const key = `${report.message}::${report.component || ""}`;
  if (recentErrors.has(key)) return;
  recentErrors.add(key);
  setTimeout(() => recentErrors.delete(key), 30_000);

  try {
    await supabase.from("system_error_logs" as any).insert({
      message: report.message.slice(0, 500),
      stack_trace: report.stack_trace?.slice(0, 2000),
      component: report.component,
      route: report.route || window.location.pathname,
      error_source: report.error_source || "client",
      error_type: report.error_type || "runtime",
      severity: report.severity || "error",
      metadata: report.metadata,
    } as any);
  } catch {
    // Silent — don't recurse on error reporting failure
  }
};

// Global error handler
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
