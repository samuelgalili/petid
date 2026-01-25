import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Utensils, 
  Cookie, 
  Building2, 
  Sparkles,
  ChevronLeft,
  PawPrint
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import dogIcon from '@/assets/dog-official.svg';
import catIcon from '@/assets/cat-official.png';

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

interface PetRecommendationsProps {
  selectedPet: Pet | null;
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
      <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-muted"></div>
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
    className="flex flex-col items-center justify-center py-10 px-6"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
      <PawPrint className="w-8 h-8 text-muted-foreground" />
    </div>
    <p className="text-muted-foreground text-center text-sm mb-4">
      אין התאמות כרגע ל{petName} — נסה לעדכן פרטים
    </p>
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onUpdate}
      className="rounded-full"
    >
      עדכן פרטי חיה
    </Button>
  </motion.div>
);

// Recommendation card component
const RecommendationCard = ({ 
  title, 
  description, 
  price, 
  imageUrl,
  onView 
}: { 
  title: string;
  description: string;
  price?: string;
  imageUrl?: string;
  onView: () => void;
}) => (
  <motion.div 
    className="bg-card rounded-xl p-4 shadow-sm border border-border/30 hover:shadow-md transition-shadow"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-3">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-14 h-14 rounded-lg object-cover bg-muted"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
          <PawPrint className="w-6 h-6 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground text-sm truncate">{title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
        {price && (
          <p className="text-xs font-semibold text-primary mt-0.5">₪{price}</p>
        )}
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 px-3 rounded-full text-xs hover:bg-primary/10 hover:text-primary"
        onClick={onView}
      >
        צפה
        <ChevronLeft className="w-3 h-3 mr-1" />
      </Button>
    </div>
  </motion.div>
);

export const PetRecommendations = ({ selectedPet }: PetRecommendationsProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('insurance');
  const [isChangingPet, setIsChangingPet] = useState(false);

  // Show skeleton briefly when changing pets
  useEffect(() => {
    if (selectedPet) {
      setIsChangingPet(true);
      const timer = setTimeout(() => setIsChangingPet(false), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedPet?.id]);

  // Fetch products based on selected pet and tab
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['pet-recommendations', selectedPet?.id, activeTab],
    queryFn: async () => {
      if (!selectedPet) return [];

      // Map tab to category
      const categoryMap: Record<TabType, string[]> = {
        insurance: ['insurance', 'ביטוח'],
        food: ['food', 'מזון', 'מזון יבש', 'מזון רטוב'],
        treats: ['treats', 'חטיפים', 'חטיף'],
        boarding: ['boarding', 'פנסיון'],
        services: ['services', 'שירותים', 'טיפוח', 'וטרינריה'],
      };

      const categories = categoryMap[activeTab];
      
      // Query products filtered by pet type
      const { data, error } = await supabase
        .from('business_products')
        .select('id, name, description, price, image_url, category, pet_type')
        .or(categories.map(c => `category.ilike.%${c}%`).join(','))
        .limit(5);

      if (error) {
        console.error('Error fetching recommendations:', error);
        return [];
      }

      // Filter by pet type if available
      const filtered = data?.filter(p => {
        if (!p.pet_type) return true;
        return p.pet_type === selectedPet.type;
      }) || [];

      return filtered;
    },
    enabled: !!selectedPet,
  });

  if (!selectedPet) {
    return (
      <div className="px-5 py-6">
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
            <PawPrint className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center text-sm">
            בחר חיית מחמד כדי לראות המלצות מותאמות אישית
          </p>
        </div>
      </div>
    );
  }

  const petIcon = selectedPet.type === 'dog' ? dogIcon : catIcon;

  return (
    <div className="px-5 py-4">
      {/* Section Header */}
      <motion.div 
        className="flex items-center gap-2 mb-4"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
          {selectedPet.avatar_url ? (
            <img 
              src={selectedPet.avatar_url} 
              alt={selectedPet.name} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <img src={petIcon} alt={selectedPet.type} className="w-5 h-5" />
          )}
        </div>
        <h3 className="text-base font-bold text-foreground">
          התאמות ל{selectedPet.name}
        </h3>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading || isChangingPet ? (
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {recommendations.map((item: any) => (
              <RecommendationCard
                key={item.id}
                title={item.name}
                description={item.description || 'מותאם לחיית המחמד שלך'}
                price={item.price?.toString()}
                imageUrl={item.image_url}
                onView={() => navigate(`/product/${item.id}?petId=${selectedPet.id}`)}
              />
            ))}
            
            {/* View All Button */}
            <Button 
              variant="outline" 
              className="w-full mt-3 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => navigate(`/shop?petId=${selectedPet.id}&category=${activeTab}`)}
            >
              הצג הכל
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          </motion.div>
        ) : (
          <EmptyState 
            petName={selectedPet.name} 
            onUpdate={() => navigate(`/pet/${selectedPet.id}/edit`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
