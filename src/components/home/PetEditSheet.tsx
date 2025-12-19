import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  onAvatarUpdate?: (petId: string, newAvatarUrl: string) => void;
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
  onDeleteConfirmChange,
  onAvatarUpdate
}: PetEditSheetProps) => {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pet) return;

    if (!file.type.startsWith("image/")) {
      toast.error("נא להעלות קובץ תמונה בלבד");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("גודל הקובץ חייב להיות קטן מ-5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");

      // Create form data for edge function
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "pet");
      formData.append("petId", pet.id);

      // Upload via edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      // Update local state immediately
      setLocalAvatarUrl(result.url);
      
      // Notify parent component
      if (onAvatarUpdate) {
        onAvatarUpdate(pet.id, result.url);
      }

      toast.success("תמונת חיית המחמד עודכנה בהצלחה!");
    } catch (error: any) {
      console.error("Error uploading pet image:", error);
      toast.error(error.message || "שגיאה בהעלאת התמונה");
    } finally {
      setIsUploadingImage(false);
    }
  }, [pet, onAvatarUpdate]);

  // Reset local state when sheet closes or pet changes
  const handleClose = useCallback(() => {
    setLocalAvatarUrl(null);
    onClose();
  }, [onClose]);

  if (!pet) return null;

  const displayAvatarUrl = localAvatarUrl || pet.avatar_url;

  return (
    <>
      {/* Edit Pet Sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="font-jakarta text-xl font-bold text-foreground">
              עריכת פרטי חיית מחמד
            </SheetTitle>
            <SheetDescription className="font-jakarta text-sm text-muted-foreground">
              עדכנו את פרטי חיית המחמד שלכם
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Pet Avatar Display with Edit Button */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent/20 to-accent/10 shadow-lg overflow-hidden border-4 border-background">
                  {displayAvatarUrl ? (
                    <img src={displayAvatarUrl} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {pet.type === 'dog' || pet.pet_type === 'dog' ? '🐕' : '🐈'}
                    </div>
                  )}
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-accent rounded-full flex items-center justify-center shadow-md border-2 border-background cursor-pointer hover:bg-accent-hover transition-colors">
                  <Camera className="w-4 h-4 text-accent-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                </label>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isUploadingImage}
                />
                <span className="text-sm text-accent font-semibold font-jakarta hover:underline">
                  {isUploadingImage ? "מעלה..." : "שנה תמונה"}
                </span>
              </label>
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="pet-name" className="font-jakarta font-semibold text-foreground">
                שם חיית המחמד
              </Label>
              <Input
                id="pet-name"
                value={editFormData.name}
                onChange={(e) => onFormDataChange({ ...editFormData, name: e.target.value })}
                placeholder="הכנס שם"
                className="font-jakarta h-12 rounded-xl border-2 focus:border-accent focus:ring-accent"
              />
            </div>

            {/* Breed Field */}
            <div className="space-y-2">
              <Label htmlFor="pet-breed" className="font-jakarta font-semibold text-foreground">
                גזע
              </Label>
              <Input
                id="pet-breed"
                value={editFormData.breed}
                onChange={(e) => onFormDataChange({ ...editFormData, breed: e.target.value })}
                placeholder="הכנס גזע"
                className="font-jakarta h-12 rounded-xl border-2 focus:border-accent focus:ring-accent"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-12 rounded-xl font-jakarta font-bold border-2"
                >
                  ביטול
                </Button>
                <Button
                  onClick={onSave}
                  className="flex-1 h-12 rounded-xl font-jakarta font-bold bg-accent hover:bg-accent-hover text-accent-foreground shadow-md"
                >
                  שמור שינויים
                </Button>
              </div>

              {/* Delete Button */}
              <Button
                variant="destructive"
                onClick={() => onDeleteConfirmChange(true)}
                className="w-full h-12 rounded-xl font-jakarta font-bold"
              >
                העבר לארכיון
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={onDeleteConfirmChange}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] w-full mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-jakarta text-xl font-bold text-foreground">
              להעביר את {pet.name} לארכיון?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-jakarta text-muted-foreground text-base">
              {pet.name} יועבר לאזור הארכיון. תוכל לשחזר את חיית המחמד בכל עת מדף חיות המחמד בארכיון.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto border-2">
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              העבר לארכיון
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
