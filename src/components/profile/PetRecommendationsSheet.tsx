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
  X
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

interface PetRecommendationsSheetProps {
  pet: Pet | null;
  isOpen: boolean;
  onClose: () => void;
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
      <div key={i} className="bg-muted/40 rounded-xl p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-muted"></div>
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
    <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
      <PawPrint className="w-7 h-7 text-muted-foreground" />
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
    className="bg-card rounded-xl p-3.5 shadow-sm border border-border/20 hover:shadow-md transition-all"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileTap={{ scale: 0.98 }}
    onClick={onView}
  >
    <div className="flex items-center gap-3">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-14 h-14 rounded-xl object-cover bg-muted"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
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
      <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  </motion.div>
);

export const PetRecommendationsSheet = ({ pet, isOpen, onClose }: PetRecommendationsSheetProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('insurance');

  // Fetch products based on selected pet and tab
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['pet-recommendations-sheet', pet?.id, activeTab],
    queryFn: async () => {
      if (!pet) return [];

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
        .limit(5);

      if (error) {
        console.error('Error fetching recommendations:', error);
        return [];
      }

      const filtered = data?.filter(p => {
        if (!p.pet_type) return true;
        return p.pet_type === pet.type;
      }) || [];

      return filtered;
    },
    enabled: !!pet && isOpen,
  });

  if (!pet) return null;

  const petIcon = pet.type === 'dog' ? dogIcon : catIcon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            className="fixed left-0 right-0 bottom-0 z-50 bg-background rounded-t-3xl max-h-[80vh] overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ paddingBottom: '80px' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-br from-primary via-accent to-primary-light">
                  <div className="w-full h-full rounded-full bg-background p-[1px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {pet.avatar_url ? (
                        <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <img src={petIcon} alt={pet.type} className="w-6 h-6" />
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">התאמות ל{pet.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {pet.breed || (pet.type === 'dog' ? 'כלב' : 'חתול')}
                    {pet.age_years ? ` • ${pet.age_years} שנים` : ''}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto px-5 pb-4 scrollbar-hide">
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
            <div className="px-5 pb-6 overflow-y-auto max-h-[calc(80vh-200px)]">
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
                    key={`${pet.id}-${activeTab}`}
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
                        onView={() => {
                          onClose();
                          navigate(`/product/${item.id}?petId=${pet.id}`);
                        }}
                      />
                    ))}
                    
                    {/* View All Button */}
                    <Button 
                      variant="outline" 
                      className="w-full mt-3 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => {
                        onClose();
                        navigate(`/shop?petId=${pet.id}&category=${activeTab}`);
                      }}
                    >
                      הצג הכל
                      <ChevronLeft className="w-4 h-4 mr-1" />
                    </Button>
                  </motion.div>
                ) : (
                  <EmptyState 
                    petName={pet.name} 
                    onUpdate={() => {
                      onClose();
                      navigate(`/pet/${pet.id}/edit`);
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
