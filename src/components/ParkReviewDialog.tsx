import { useState } from "react";
import { Star, X, Upload, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface ParkReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parkId: string;
  parkName: string;
  onReviewSubmitted: () => void;
}

export const ParkReviewDialog = ({
  open,
  onOpenChange,
  parkId,
  parkName,
  onReviewSubmitted,
}: ParkReviewDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 5) {
      toast({
        title: "מקסימום 5 תמונות",
        description: "ניתן להעלות עד 5 תמונות בביקורת",
        variant: "destructive",
      });
      return;
    }

    setPhotos([...photos, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "נא לבחור דירוג",
        description: "עליך לבחור דירוג בין 1 ל-5 כוכבים",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "נדרשת התחברות",
          description: "עליך להתחבר כדי להוסיף ביקורת",
          variant: "destructive",
        });
        return;
      }

      // Upload photos to storage
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('park-photos')
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('park-photos')
          .getPublicUrl(fileName);
        
        photoUrls.push(publicUrl);
      }

      // Insert review
      const { error: insertError } = await supabase
        .from('park_reviews')
        .insert({
          user_id: user.id,
          park_id: parkId,
          rating,
          review_text: reviewText || null,
          photos: photoUrls,
        });

      if (insertError) throw insertError;

      toast({
        title: "הביקורת נשמרה בהצלחה",
        description: "תודה על שיתוף הפעולה!",
      });

      onReviewSubmitted();
      onOpenChange(false);
      
      // Reset form
      setRating(0);
      setReviewText("");
      setPhotos([]);
      setPhotoPreviews([]);
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "שגיאה בשמירת הביקורת",
        description: error.message || "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white text-gray-900 rounded-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-gray-900 font-jakarta">
            ביקורת עבור {parkName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">דירוג</label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoveredRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300"
                    }`}
                  />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">הביקורת שלך (אופציונלי)</label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="שתף את חוויית הביקור שלך בגינה..."
              className="min-h-[120px] rounded-2xl border-gray-300 focus:border-gray-900"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 text-left">{reviewText.length}/500</p>
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900">תמונות (עד 5)</label>
            
            <div className="grid grid-cols-3 gap-2">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={preview} alt={`תמונה ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {photos.length < 5 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500">העלה תמונה</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={uploading || rating === 0}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-jakarta"
            >
              {uploading ? "שומר..." : "פרסם ביקורת"}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={uploading}
              className="flex-1 rounded-full border-gray-300 text-gray-900 hover:bg-gray-100"
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
