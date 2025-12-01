import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, Image as ImageIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EditHighlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightId: string;
  currentTitle: string;
  currentCoverImage: string | null;
  onSuccess: () => void;
}

interface Story {
  id: string;
  media_url: string;
  media_type: string;
}

export const EditHighlightDialog = ({
  open,
  onOpenChange,
  highlightId,
  currentTitle,
  currentCoverImage,
  onSuccess,
}: EditHighlightDialogProps) => {
  const [title, setTitle] = useState(currentTitle);
  const [coverImage, setCoverImage] = useState<string | null>(currentCoverImage);
  const [stories, setStories] = useState<Story[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCoverSelector, setShowCoverSelector] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setCoverImage(currentCoverImage);
      fetchHighlightStories();
    }
  }, [open, currentTitle, currentCoverImage]);

  const fetchHighlightStories = async () => {
    const { data } = await supabase
      .from("highlight_stories")
      .select(`
        stories(id, media_url, media_type)
      `)
      .eq("highlight_id", highlightId);

    if (data) {
      const storiesData = data
        .map((hs: any) => hs.stories)
        .filter((s: any) => s !== null && s.media_type === 'image');
      setStories(storiesData);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      toast.error("נא להזין שם להדגשה");
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("story_highlights")
        .update({
          title: title.trim(),
          cover_image: coverImage,
        })
        .eq("id", highlightId);

      if (error) throw error;

      toast.success("ההדגשה עודכנה בהצלחה!");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating highlight:", error);
      toast.error("שגיאה בעדכון ההדגשה");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Delete all stories in highlight first (cascade should handle this but being explicit)
      await supabase
        .from("highlight_stories")
        .delete()
        .eq("highlight_id", highlightId);

      // Delete the highlight
      const { error } = await supabase
        .from("story_highlights")
        .delete()
        .eq("id", highlightId);

      if (error) throw error;

      toast.success("ההדגשה נמחקה בהצלחה!");
      setShowDeleteDialog(false);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error deleting highlight:", error);
      toast.error("שגיאה במחיקת ההדגשה");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md font-jakarta max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">ערוך הדגשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="font-bold text-gray-700">
                שם ההדגשה
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={30}
                className="font-jakarta"
              />
              <p className="text-xs text-gray-500">{title.length}/30 תווים</p>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">תמונת כיסוי</Label>
              <div className="flex items-center gap-3">
                {coverImage ? (
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-secondary ring-2 ring-gray-300">
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ring-2 ring-gray-300">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowCoverSelector(!showCoverSelector)}
                  className="flex-1"
                >
                  {showCoverSelector ? "סגור בחירה" : "בחר תמונה"}
                </Button>
              </div>

              {/* Cover Image Selector */}
              {showCoverSelector && (
                <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-xl max-h-48 overflow-y-auto">
                  {stories.length === 0 ? (
                    <p className="col-span-4 text-center text-sm text-gray-500 py-4">
                      אין תמונות זמינות
                    </p>
                  ) : (
                    stories.map((story) => (
                      <button
                        key={story.id}
                        onClick={() => {
                          setCoverImage(story.media_url);
                          setShowCoverSelector(false);
                        }}
                        className={`aspect-square rounded-lg overflow-hidden ring-2 transition-all ${
                          coverImage === story.media_url
                            ? "ring-accent ring-offset-2"
                            : "ring-gray-200 hover:ring-gray-400"
                        }`}
                      >
                        <img
                          src={story.media_url}
                          alt="Story"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleUpdate}
                disabled={!title.trim() || isUpdating}
                className="w-full bg-gradient-primary hover:bg-gradient-primary-hover text-gray-900 font-black"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעדכן...
                  </>
                ) : (
                  "שמור שינויים"
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                ביטול
              </Button>

              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק הדגשה
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="font-jakarta" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">מחיקת הדגשה</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              האם אתה בטוח שברצונך למחוק את ההדגשה "{currentTitle}"? פעולה זו תמחק את ההדגשה אך
              לא את הסטוריז המקוריים. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מוחק...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק לצמיתות
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};