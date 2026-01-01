import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MyPetsSection } from "@/components/home/MyPetsSection";
import petidIcon from "@/assets/petid-icon.png";

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
            <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
              <img src={petidIcon} alt="Petid" className="w-6 h-6 object-contain" />
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
