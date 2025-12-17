import { useState } from "react";
import { Star, X, Upload, Camera, Sparkles, Image } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

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

  const ratingLabels = ["", "😕 לא טוב", "😐 בסדר", "🙂 טוב", "😊 מעולה", "🤩 מושלם!"];

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

      const photoUrls: string[] = [];
      for (const photo of photos) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('park-photos')
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('park-photos')
          .getPublicUrl(fileName);
        
        photoUrls.push(publicUrl);
      }

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
        title: "🎉 הביקורת נשמרה בהצלחה",
        description: "תודה על שיתוף הפעולה!",
      });

      onReviewSubmitted();
      onOpenChange(false);
      
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
      <DialogContent className="max-w-md p-0 bg-white text-gray-900 rounded-3xl overflow-hidden border-0" dir="rtl">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-l from-amber-400 via-orange-400 to-pink-500 p-6 pb-12">
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-4 left-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full mb-3">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">שתף את החוויה שלך</span>
            </div>
            <h2 className="text-2xl font-black text-white drop-shadow-sm">
              {parkName}
            </h2>
          </motion.div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 -mt-6">
          {/* Rating Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 mb-5"
          >
            <p className="text-center text-gray-600 text-sm mb-4">איך הייתה החוויה?</p>
            
            <div className="flex gap-2 justify-center mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  whileHover={{ scale: 1.15, rotate: star % 2 === 0 ? 5 : -5 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="relative"
                >
                  <Star
                    className={`w-11 h-11 transition-all duration-200 ${
                      star <= (hoveredRating || rating)
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.4)]"
                        : "text-gray-200"
                    }`}
                  />
                  {star <= rating && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-2 h-2 bg-amber-200 rounded-full animate-ping" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {(hoveredRating || rating) > 0 && (
                <motion.p
                  key={hoveredRating || rating}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="text-center text-lg font-bold text-gray-800"
                >
                  {ratingLabels[hoveredRating || rating]}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Review Text */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-5"
          >
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              ספר לנו עוד (אופציונלי)
            </label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="מה אהבת? מה פחות? איך הייתה האווירה? 🐕"
              className="min-h-[100px] rounded-2xl border-gray-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none bg-gray-50"
              maxLength={500}
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-400">💡 ביקורות מפורטות עוזרות לאחרים</span>
              <span className="text-xs text-gray-400">{reviewText.length}/500</span>
            </div>
          </motion.div>

          {/* Photo Upload */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              הוסף תמונות (עד 5)
            </label>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photoPreviews.map((preview, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden shadow-md"
                >
                  <img src={preview} alt={`תמונה ${index + 1}`} className="w-full h-full object-cover" />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                </motion.div>
              ))}
              
              {photos.length < 5 && (
                <div className="flex gap-2 flex-shrink-0">
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-amber-300 hover:border-amber-400 cursor-pointer flex flex-col items-center justify-center gap-1 bg-amber-50/50 hover:bg-amber-50 transition-all group">
                    <Camera className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-amber-600 font-medium">צלם</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 cursor-pointer flex flex-col items-center justify-center gap-1 bg-gray-50/50 hover:bg-gray-50 transition-all group">
                    <Image className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-gray-500 font-medium">גלריה</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-3"
          >
            <Button
              onClick={handleSubmit}
              disabled={uploading || rating === 0}
              className="flex-1 bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl h-12 font-bold text-base shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:shadow-none"
            >
              {uploading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Star className="w-5 h-5 ml-2 fill-white" />
                  פרסם ביקורת
                </>
              )}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={uploading}
              className="rounded-xl h-12 px-6 border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              ביטול
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
