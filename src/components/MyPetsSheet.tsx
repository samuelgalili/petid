import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MyPetsSection } from "@/components/home/MyPetsSection";
import { PawPrint } from "lucide-react";

interface MyPetsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pets: any[];
  newlyAddedPetIds: Set<string>;
  onPetLongPressStart: (pet: any) => void;
  onPetLongPressEnd: () => void;
}

export const MyPetsSheet = ({
  open,
  onOpenChange,
  pets,
  newlyAddedPetIds,
  onPetLongPressStart,
  onPetLongPressEnd,
}: MyPetsSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[320px] sm:w-[380px] p-0 overflow-hidden" dir="rtl">
        <SheetHeader className="p-4 border-b border-border bg-gradient-to-br from-white via-[#4ECDC4]/5 to-[#1E5799]/5">
          <SheetTitle className="flex items-center gap-2.5 text-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4ECDC4] to-[#1E5799] flex items-center justify-center shadow-md">
              <PawPrint className="w-4.5 h-4.5 text-white" />
            </div>
            חיות המחמד שלי
          </SheetTitle>
        </SheetHeader>
        
        <div className="overflow-y-auto max-h-[calc(100vh-80px)] py-4 bg-gradient-to-br from-white via-[#4ECDC4]/5 to-[#1E5799]/5">
          <MyPetsSection 
            pets={pets} 
            newlyAddedPetIds={newlyAddedPetIds} 
            onPetLongPressStart={onPetLongPressStart} 
            onPetLongPressEnd={onPetLongPressEnd} 
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
