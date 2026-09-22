/**
 * A screen that does not exist yet, saying so.
 *
 * Thirteen of the admin's twenty-four destinations have NO TABLE behind them.
 * Not an empty table - no table: leads, tasks, approvals, workflows,
 * suppliers, purchase orders, returns, documents, expenses, employees. The
 * owner asked for them in the sidebar anyway, and was told the trade-off.
 *
 * ─── WHY NOT "COMING SOON" ──────────────────────────────────────────────────
 *
 * A blank "coming soon" is a dead end that teaches people to stop pressing
 * things. And the alternative the brief forbids outright - a handsome screen
 * over invented data - is worse than either: somebody eventually reads a
 * number off it and acts.
 *
 * So each of these says two true things: what the screen will do, and what has
 * to exist before it can. The second list is the honest part. "טבלת suppliers"
 * is not a caveat, it is the work, and seeing it written down is how the owner
 * decides which of the thirteen is worth building first.
 *
 * ─── AND IT NAMES WHAT IS ALREADY THERE ─────────────────────────────────────
 *
 * Some of these are closer than others. Inventory has a table with quantities
 * and thresholds and is missing warehouses; Transactions has cardcom_events
 * and is missing the normalised rows above them. A screen that says "יש X,
 * חסר Y" is worth more than one that says nothing, because it is the
 * difference between a month of work and an afternoon.
 */

import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Hammer } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { screenForPath } from "@/components/admin/adminNavigation";
import { Button } from "@/components/ui/button";

export const AdminPlannedScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const screen = screenForPath(location.pathname);

  // Only a planned screen routes here, so a missing plan is a navigation entry
  // that forgot one rather than a state a person should see explained away.
  const plan = screen?.plan;

  return (
    <AdminLayout
      title={screen?.hebrew ?? "בקרוב"}
      icon={screen?.icon ?? Hammer}
      breadcrumbs={screen ? [{ label: screen.domain.hebrew }, { label: screen.hebrew }] : []}
    >
      <div className="max-w-2xl space-y-4">
        <div className="admin-card p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-admin-warning-soft text-admin-warning">
              <Hammer className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <h2 className="admin-section">המסך הזה עדיין לא נבנה</h2>
          </div>

          {plan && (
            <p className="admin-body pt-3">{plan.does}</p>
          )}
        </div>

        {plan && (
          <div className="admin-card p-5">
            <h3 className="admin-section">מה צריך לקרות קודם</h3>
            <p className="admin-label pt-1">
              זאת לא הסתייגות — זאת העבודה עצמה, ולפיה אפשר להחליט מה לבנות ראשון.
            </p>
            <ul className="space-y-2 pt-3">
              {plan.needs.map((need) => (
                <li key={need} className="admin-body flex gap-2.5">
                  <span
                    className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-admin-ink-subtle"
                    aria-hidden
                  />
                  <span>{need}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="admin-focus gap-1.5"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-4 w-4" />
            חזרה למרכז הבקרה
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPlannedScreen;
