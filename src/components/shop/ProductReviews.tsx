import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, Camera, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface ProductReviewsProps {
  productId: string;
  averageRating?: number;
  reviewCount?: number;
}

export const ProductReviews = ({ productId, averageRating = 0, reviewCount = 0 }: ProductReviewsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          profiles:user_id(full_name, avatar_url)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: userReview } = useQuery({
    queryKey: ['user-product-review', productId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const createReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('product_reviews')
        .upsert({
          user_id: user.id,
          product_id: productId,
          rating,
          review_text: reviewText || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['user-product-review', productId] });
      setShowWriteReview(false);
      setRating(0);
      setReviewText('');
      toast.success('הביקורת נשלחה בהצלחה!');
    },
    onError: () => {
      toast.error('שגיאה בשליחת הביקורת');
    },
  });

  const helpfulMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('product_reviews')
        .update({ helpful_count: reviews.find((r: any) => r.id === reviewId)?.helpful_count + 1 })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
    },
  });

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter((r: any) => r.rating === star).length,
    percent: reviews.length > 0 
      ? (reviews.filter((r: any) => r.rating === star).length / reviews.length) * 100 
      : 0,
  }));

  return (
    <div className="space-y-4">
      {/* Rating Summary */}
      <div className="bg-muted/30 rounded-xl p-4">
        <div className="flex items-start gap-6">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(averageRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{reviewCount} ביקורות</p>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-1">
            {ratingDistribution.map(({ star, count, percent }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3">{star}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <Progress value={percent} className="flex-1 h-2" />
                <span className="w-6 text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Write Review Button */}
      {user && !userReview && !showWriteReview && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowWriteReview(true)}
        >
          <Star className="w-4 h-4 ml-2" />
          כתוב ביקורת
        </Button>
      )}

      {/* Write Review Form */}
      <AnimatePresence>
        {showWriteReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border rounded-xl p-4 space-y-4"
          >
            <div className="text-center">
              <p className="text-sm mb-2">דרג את המוצר</p>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              placeholder="ספר על החוויה שלך עם המוצר..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowWriteReview(false)}
              >
                ביטול
              </Button>
              <Button
                className="flex-1"
                onClick={() => createReviewMutation.mutate()}
                disabled={rating === 0 || createReviewMutation.isPending}
              >
                <Send className="w-4 h-4 ml-2" />
                שלח ביקורת
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">טוען ביקורות...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-muted-foreground">אין ביקורות עדיין</p>
          <p className="text-xs text-muted-foreground">היה הראשון לכתוב ביקורת!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={review.profiles?.avatar_url} />
                  <AvatarFallback>
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {review.profiles?.full_name || 'משתמש'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(review.created_at), 'dd/MM/yy', { locale: he })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                    {review.is_verified_purchase && (
                      <span className="text-[10px] text-green-600 mr-2">✓ רכישה מאומתת</span>
                    )}
                  </div>

                  {review.review_text && (
                    <p className="text-sm mt-2 text-muted-foreground leading-relaxed">
                      {review.review_text}
                    </p>
                  )}

                  {review.photos?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {review.photos.map((photo: string, i: number) => (
                        <img
                          key={i}
                          src={photo}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => helpfulMutation.mutate(review.id)}
                    className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    מועיל ({review.helpful_count})
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
