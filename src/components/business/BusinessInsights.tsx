import { TrendingUp, TrendingDown, Eye, MessageCircle, Star, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface BusinessInsightsProps {
  viewCount: number;
  totalReviews: number;
  rating: number;
  businessId?: string;
  previousViewCount?: number;
  previousReviews?: number;
}

// Calculate percentage change
const getChange = (current: number, previous: number | undefined) => {
  if (!previous || previous === 0) return { value: 0, isPositive: true };
  const change = ((current - previous) / previous) * 100;
  return { value: Math.abs(Math.round(change)), isPositive: change >= 0 };
};

export const BusinessInsights = ({ 
  viewCount, 
  totalReviews, 
  rating,
  businessId,
  previousViewCount,
  previousReviews
}: BusinessInsightsProps) => {
  const navigate = useNavigate();
  
  const viewChange = getChange(viewCount, previousViewCount);
  const reviewChange = getChange(totalReviews, previousReviews);

  const handleDetailsClick = () => {
    // Navigate to business profile instead of admin dashboard
    if (businessId) {
      navigate(`/business/${businessId}`);
    } else {
      navigate('/profile');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 border border-primary/20"
    >
      {/* Simple Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">השבוע שלך</span>
        <button 
          onClick={handleDetailsClick}
          className="text-xs text-primary flex items-center gap-1 hover:underline"
        >
          פרטים נוספים
          <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* Simple Stats Row */}
      <div className="flex items-center justify-around">
        {/* Views */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold text-lg">{viewCount}</span>
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            {viewChange.isPositive ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className={`text-xs font-medium ${viewChange.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {viewChange.isPositive ? '+' : '-'}{viewChange.value}%
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">צפיות</span>
        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-border" />

        {/* Reviews */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold text-lg">{totalReviews}</span>
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            {reviewChange.isPositive ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className={`text-xs font-medium ${reviewChange.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {reviewChange.isPositive ? '+' : '-'}{reviewChange.value}%
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">ביקורות</span>
        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-border" />

        {/* Rating */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-lg">{rating}</span>
          </div>
          <div className="flex items-center justify-center mt-0.5">
            <span className="text-xs text-muted-foreground">מעולה!</span>
          </div>
          <span className="text-[10px] text-muted-foreground">דירוג</span>
        </div>
      </div>
    </motion.div>
  );
};
