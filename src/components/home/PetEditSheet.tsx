import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PetEditSheetProps {
  pet: any | null;
  isOpen: boolean;
  onClose: () => void;
  editFormData: { name: string; breed: string };
  onFormDataChange: (data: { name: string; breed: string }) => void;
  onSave: () => void;
  onDelete: () => void;
  showDeleteConfirm: boolean;
  onDeleteConfirmChange: (show: boolean) => void;
}

export const PetEditSheet = ({
  pet,
  isOpen,
  onClose,
  editFormData,
  onFormDataChange,
  onSave,
  onDelete,
  showDeleteConfirm,
  onDeleteConfirmChange
}: PetEditSheetProps) => {
  if (!pet) return null;

  return (
    <>
      {/* Edit Pet Sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="font-jakarta text-xl font-bold text-gray-900">
              Edit Pet Details
            </SheetTitle>
            <SheetDescription className="font-jakarta text-sm text-gray-600">
              Long press detected - Update your pet's information
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Pet Avatar Display */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#E8F5E8] to-[#B8E3D5] shadow-lg overflow-hidden border-4 border-white">
                {pet.avatar_url ? (
                  <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    {pet.pet_type === 'dog' ? '🐕' : '🐈'}
                  </div>
                )}
              </div>
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="pet-name" className="font-jakarta font-semibold text-gray-900">
                Pet Name
              </Label>
              <Input
                id="pet-name"
                value={editFormData.name}
                onChange={(e) => onFormDataChange({ ...editFormData, name: e.target.value })}
                placeholder="Enter pet name"
                className="font-jakarta h-12 rounded-xl border-2 focus:border-secondary focus:ring-secondary"
              />
            </div>

            {/* Breed Field */}
            <div className="space-y-2">
              <Label htmlFor="pet-breed" className="font-jakarta font-semibold text-gray-900">
                Breed
              </Label>
              <Input
                id="pet-breed"
                value={editFormData.breed}
                onChange={(e) => onFormDataChange({ ...editFormData, breed: e.target.value })}
                placeholder="Enter breed"
                className="font-jakarta h-12 rounded-xl border-2 focus:border-secondary focus:ring-secondary"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl font-jakarta font-bold border-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onSave}
                  className="flex-1 h-12 rounded-xl font-jakarta font-bold bg-secondary hover:bg-secondary-dark text-gray-900 shadow-md"
                >
                  Save Changes
                </Button>
              </div>

              {/* Delete Button */}
              <Button
                variant="destructive"
                onClick={() => onDeleteConfirmChange(true)}
                className="w-full h-12 rounded-xl font-jakarta font-bold bg-warning hover:bg-warning/90 text-white shadow-md"
              >
                Archive Pet
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={onDeleteConfirmChange}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] w-full mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-jakarta text-xl font-bold text-gray-900">
              Archive {pet.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-jakarta text-gray-600 text-base">
              {pet.name} will be moved to the archived section. You can restore your pet anytime from the Archived Pets page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto border-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto bg-warning hover:bg-warning/90 text-white"
            >
              Archive Pet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
