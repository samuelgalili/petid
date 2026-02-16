import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Utensils, 
  Cookie, 
  Building2, 
  Sparkles,
  ChevronLeft,
  PawPrint,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
  size?: string;
  avatar_url?: string;
}

interface PetRecommendationsInlineProps {
  selectedPet: Pet | null;
  points?: number;
}

type TabType = 'insurance' | 'food' | 'treats' | 'boarding' | 'services';

const tabs: { id: TabType; label: string; icon: typeof Shield }[] = [
  { id: 'insurance', label: 'ביטוח', icon: Shield },
  { id: 'food', label: 'מזון', icon: Utensils },
  { id: 'treats', label: 'חטיפים', icon: Cookie },
  { id: 'boarding', label: 'פנסיון', icon: Building2 },
  { id: 'services', label: 'שירותים', icon: Sparkles },
];

// Skeleton loader component
const RecommendationSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Empty state component
const EmptyState = ({ petName, onUpdate }: { petName: string; onUpdate: () => void }) => (
  <motion.div 
    className="flex flex-col items-center justify-center py-8 px-6"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
      <PawPrint className="w-6 h-6 text-muted-foreground" />
    </div>
    <p className="text-muted-foreground text-center text-sm mb-3">
      אין התאמות כרגע ל{petName}
    </p>
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onUpdate}
      className="rounded-full text-xs"
    >
      עדכן פרטי חיה
    </Button>
  </motion.div>
);

// Recommendation card - clean style matching reference
const RecommendationCard = ({ 
  title, 
  description, 
  imageUrl,
  onView 
}: { 
  title: string;
  description: string;
  imageUrl?: string;
  onView: () => void;
}) => (
  <motion.div 
    className="bg-card rounded-2xl p-4 shadow-sm border border-border/10"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="flex items-center gap-3">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-10 h-10 rounded-full object-cover bg-muted"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
      </div>
      <Button 
        size="sm"
        className="rounded-full h-8 px-4 text-xs bg-primary hover:bg-primary/90"
        onClick={onView}
      >
        צפה
        <ChevronLeft className="w-3 h-3 mr-0.5" />
      </Button>
    </div>
  </motion.div>
);

// Promotional banner matching reference
const PromoBanner = ({ petName }: { petName: string }) => (
  <motion.div 
    className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 rounded-2xl p-4 mt-3 border border-primary/10"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
  >
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <PawPrint className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary">PetCare</span>
        </div>
        <h4 className="font-bold text-foreground text-base mb-0.5">ביטוח מלא ל{petName}</h4>
        <p className="text-xs text-muted-foreground">ביסוח ללבן לובך</p>
        <Button 
          size="sm"
          className="mt-3 rounded-full h-8 px-4 text-xs bg-primary hover:bg-primary/90"
        >
          רכוש עכשיו
          <ChevronLeft className="w-3 h-3 mr-0.5" />
        </Button>
      </div>
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted/50">
        <div className="w-full h-full flex items-center justify-center">
          <PawPrint className="w-8 h-8 text-primary/30" />
        </div>
      </div>
    </div>
  </motion.div>
);

export const PetRecommendationsInline = ({ selectedPet, points = 0 }: PetRecommendationsInlineProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('insurance');

  // Fetch products based on selected pet and tab
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['pet-recommendations-inline', selectedPet?.id, activeTab],
    queryFn: async () => {
      if (!selectedPet) return [];

      const categoryMap: Record<TabType, string[]> = {
        insurance: ['insurance', 'ביטוח'],
        food: ['food', 'מזון', 'מזון יבש', 'מזון רטוב'],
        treats: ['treats', 'חטיפים', 'חטיף'],
        boarding: ['boarding', 'פנסיון'],
        services: ['services', 'שירותים', 'טיפוח', 'וטרינריה'],
      };

      const categories = categoryMap[activeTab];
      
      const { data, error } = await supabase
        .from('business_products')
        .select('id, name, description, price, image_url, category, pet_type')
        .or(categories.map(c => `category.ilike.%${c}%`).join(','))
        .limit(3);

      if (error) {
        console.error('Error fetching recommendations:', error);
        return [];
      }

      const filtered = data?.filter(p => {
        if (!p.pet_type) return true;
        return p.pet_type === selectedPet.type;
      }) || [];

      return filtered;
    },
    enabled: !!selectedPet,
  });

  if (!selectedPet) {
    return null;
  }

  return (
    <div className="px-5 py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">
          התאמות ל{selectedPet.name}
        </h3>
        <button className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>{points} נקוד ות</span>
          <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* Tabs - Clean style */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RecommendationSkeleton />
          </motion.div>
        ) : recommendations && recommendations.length > 0 ? (
          <motion.div
            key={`${selectedPet.id}-${activeTab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {recommendations.map((item: any, index: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <RecommendationCard
                  title={item.name}
                  description={item.description || 'תכחות חולמה ללבר לככל שנה כן שנה+'}
                  imageUrl={item.image_url}
                  onView={() => navigate(`/product/${item.id}?petId=${selectedPet.id}`)}
                />
              </motion.div>
            ))}
            
            {/* Promo Banner */}
            <PromoBanner petName={selectedPet.name} />
          </motion.div>
        ) : (
          <EmptyState 
            petName={selectedPet.name} 
            onUpdate={() => navigate(`/edit-pet/${selectedPet.id}`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
