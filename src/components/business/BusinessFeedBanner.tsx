import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, MessageCircle, ChevronLeft, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const BusinessFeedBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isBusiness } = useUserRole();

  const { data: business } = useQuery({
    queryKey: ['my-business-banner', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('business_profiles')
        .select('id, business_name, logo_url, view_count, total_reviews, rating')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && isBusiness,
  });

  if (!isBusiness || !business) return null;

  // Mock change percentages (in real app, compare to previous period)
  const viewChange = Math.floor(Math.random() * 30) + 5;
  const reviewChange = Math.floor(Math.random() * 20);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 bg-gradient-to-l from-primary/15 via-primary/5 to-background rounded-2xl p-3 border border-primary/20 cursor-pointer"
      onClick={() => navigate(`/business/${business.id}`)}
    >
      <div className="flex items-center gap-3">
        {/* Business Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 p-0.5 flex-shrink-0">
          <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
            {business.logo_url ? (
              <Avatar className="w-full h-full">
                <AvatarImage src={business.logo_url} />
                <AvatarFallback>{business.business_name.charAt(0)}</AvatarFallback>
              </Avatar>
            ) : (
              <Store className="w-5 h-5 text-primary" />
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold text-sm">{business.view_count || 0}</span>
            <span className="text-[10px] text-green-600 font-medium">+{viewChange}%</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold text-sm">{business.total_reviews || 0}</span>
            {reviewChange > 0 && (
              <span className="text-[10px] text-green-600 font-medium">+{reviewChange}%</span>
            )}
          </div>

          {business.rating && (
            <div className="flex items-center gap-0.5">
              <span className="font-bold text-sm">{business.rating}</span>
              <span className="text-yellow-500">⭐</span>
            </div>
          )}
        </div>

        {/* Arrow */}
        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Quick tip */}
      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        הנתונים שלך השבוע • לחץ לפרטים
      </p>
    </motion.div>
  );
};
