import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Two panes, side by side: what you are looking through, and what you are
 * working on.
 *
 * The admin opened its detail views in a Sheet - an overlay that slides across
 * and covers the list behind it. That makes every record a round trip: open
 * the customer, read it, close it, find your place again, open the next one.
 * You cannot see the row you came from while you write about it.
 *
 * So above the breakpoint the detail is not an overlay at all. It is a second
 * column beside the list, the list narrows to make room, and both stay live -
 * click another row and the right-hand pane switches without anything closing.
 * It is the shape of a conversation next to its subject.
 *
 * Below it there is no room for two columns, so it falls back to the Sheet.
 * That is not a lesser path: on a phone, covering the list IS the side-by-side
 * layout, one pane at a time.
 *
 * RTL: the app is `dir="rtl"`, so `flex-row` already puts the list on the
 * right and the detail on its left. No side has to be named.
 */

/**
 * ONE breakpoint, in JS, deciding which of the two renders.
 *
 * The obvious build of this used `hidden lg:block` on the column and
 * `lg:hidden` on the sheet, and reused the app's useIsMobile() for the sheet's
 * open state. Those are two different numbers - Tailwind's lg is 1024, that
 * hook is 768 - so between them the column was hidden by CSS while the sheet
 * considered itself desktop and never opened: a window 900px wide could select
 * a customer and be shown nothing at all. A CSS breakpoint and a JS breakpoint
 * describing the same split have to be the same value, and the way to be sure
 * of that is for there to be only one.
 */
const WORKSPACE_BREAKPOINT = 1024;

const useSideBySide = () => {
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= WORKSPACE_BREAKPOINT,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${WORKSPACE_BREAKPOINT}px)`);
    const onChange = () => setWide(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return wide;
};

export interface AdminWorkspaceProps {
  /** The list, table or board. Always present. */
  children: ReactNode;
  /** The pane that opens beside it. Rendered only while `open`. */
  detail: ReactNode;
  open: boolean;
  onClose: () => void;
  /** Width of the detail column when side by side. */
  detailWidth?: string;
  className?: string;
}

export const AdminWorkspace = ({
  children,
  detail,
  open,
  onClose,
  detailWidth = "26rem",
  className,
}: AdminWorkspaceProps) => {
  const sideBySide = useSideBySide();

  return (
    <div className={cn("flex w-full items-start gap-4", className)}>
      {/* min-w-0 or a wide table refuses to shrink and pushes the detail pane
          off the screen instead of sharing the row with it. */}
      <div className="min-w-0 flex-1">{children}</div>

      {sideBySide ? (
        <AnimatePresence initial={false}>
          {open && (
            <motion.aside
              key="detail"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: detailWidth }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="shrink-0 overflow-hidden"
            >
              {/* Sticky, and scrolling on its own: the list beside it is
                  usually far longer, and a detail pane that scrolls away with
                  the page is a detail pane you cannot read. */}
              <div
                className="relative sticky top-4 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-mipo-line bg-mipo-surface"
                style={{ width: detailWidth }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="סגירת החלון"
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-mipo-line bg-mipo-surface text-mipo-muted transition-colors hover:bg-mipo-soft"
                >
                  <X className="h-4 w-4" />
                </button>
                {detail}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      ) : (
        // Mounted only when narrow. A Sheet left mounted on a wide screen
        // keeps its overlay in the tree, which swallows clicks on the list
        // it is supposed to be sitting beside.
        <Sheet
          open={open}
          onOpenChange={(next) => {
            if (!next) onClose();
          }}
        >
          <SheetContent side="left" className="w-full p-0">
            {detail}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default AdminWorkspace;
