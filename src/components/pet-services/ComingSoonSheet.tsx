import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface ComingSoonSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export const ComingSoonSheet = ({ isOpen, onClose, title }: ComingSoonSheetProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[50vh]" dir="rtl">
        <SheetHeader className="text-center pb-2">
          <SheetTitle className="text-lg font-bold">{title}</SheetTitle>
          <SheetDescription className="sr-only">בקרוב</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Clock className="w-12 h-12 text-primary/50" strokeWidth={1.5} />
          </motion.div>
          <p className="text-muted-foreground text-sm font-medium">בקרוב אצלכם 🐾</p>
          <p className="text-muted-foreground/60 text-xs text-center max-w-[240px]">
            אנחנו עובדים על זה! הפיצ׳ר הזה יהיה זמין בקרוב.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
