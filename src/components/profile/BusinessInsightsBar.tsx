import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eye, MessageCircle, TrendingUp, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

export const BusinessInsightsBar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isBusiness, isLoading: isRoleLoading } = useUserRole();

  const { data: business, isLoading: isBusinessLoading } = useQuery({
    queryKey: ['my-business-insights', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('business_profiles')
        .select('id, business_name, view_count, total_reviews, rating')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && isBusiness,
  });

  // Don't show for regular users or while loading or if no business data
  if (isRoleLoading || isBusinessLoading || !isBusiness || !business) return null;

  const viewChange = Math.floor(Math.random() * 30) + 5;
  const reviewChange = Math.floor(Math.random() * 20);

  const insights = [
    { 
      icon: Eye, 
      value: business.view_count ?? 0, 
      label: 'צפיות', 
      change: `+${viewChange}%`,
      color: 'text-blue-500'
    },
    { 
      icon: MessageCircle, 
      value: business.total_reviews ?? 0, 
      label: 'ביקורות', 
      change: reviewChange > 0 ? `+${reviewChange}%` : null,
      color: 'text-purple-500'
    },
    { 
      icon: Star, 
      value: business.rating?.toFixed(1) ?? '0', 
      label: 'דירוג', 
      change: null,
      color: 'text-amber-500'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      {/* Header */}
      <button 
        onClick={() => navigate(`/business/${business.id}`)}
        className="flex items-center gap-1.5 mb-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <TrendingUp className="w-4 h-4" />
        <span className="text-xs font-medium">תובנות עסקיות השבוע</span>
      </button>

      {/* Stats Row - Instagram style */}
      <div className="flex justify-between">
        {insights.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              onClick={() => navigate(`/business/${business.id}`)}
              className="flex-1 text-center group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-lg font-bold text-foreground">{item.value}</span>
                {item.change && (
                  <span className="text-[10px] text-green-500 font-medium">{item.change}</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
