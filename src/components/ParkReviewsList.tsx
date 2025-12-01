import { useState, useEffect } from "react";
import { Star, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  photos: string[];
  created_at: string;
  user_name?: string | null;
}

interface ParkReviewsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parkId: string;
  parkName: string;
}

export const ParkReviewsList = ({
  open,
  onOpenChange,
  parkId,
  parkName,
}: ParkReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchReviews();
    }
  }, [open, parkId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data: reviewsData, error } = await supabase
        .from('park_reviews')
        .select('*')
        .eq('park_id', parkId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const reviewsWithNames = await Promise.all(
        (reviewsData || []).map(async (review) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', review.user_id)
            .single();

          return {
            ...review,
            user_name: profile?.full_name || null,
          };
        })
      );

      setReviews(reviewsWithNames);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "שגיאה בטעינת ביקורות",
        description: "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-white text-gray-900 rounded-3xl max-h-[85vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900 font-jakarta">
              ביקורות עבור {parkName}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="text-gray-600 mt-2 font-jakarta">טוען ביקורות...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 px-6">
                <p className="text-gray-600 font-jakarta">אין עדיין ביקורות לגינה זו</p>
                <p className="text-sm text-gray-500 mt-2">היה הראשון לכתוב ביקורת!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 rounded-2xl p-5 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 font-jakarta">
                            {review.user_name || "משתמש אנונימי"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(review.created_at), "d MMMM yyyy", { locale: he })}
                          </p>
                        </div>
                      </div>
                      {renderStars(review.rating)}
                    </div>

                    {/* Review Text */}
                    {review.review_text && (
                      <p className="text-sm text-gray-700 leading-relaxed">{review.review_text}</p>
                    )}

                    {/* Photos */}
                    {review.photos && review.photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {review.photos.map((photo, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedPhoto(photo)}
                            className="aspect-square rounded-lg overflow-hidden bg-gray-200 hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={photo}
                              alt={`תמונה ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl bg-black/95 border-0 p-0">
            <img
              src={selectedPhoto}
              alt="תמונת ביקורת"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
