/**
 * Category Recommendations - המלצות מותאמות לפי קטגוריה
 * ביטוח, אילוף, פנסיון
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  GraduationCap, 
  Home,
  ChevronLeft,
  Star,
  Clock,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CategoryRecommendationsProps {
  petId: string;
  petName: string;
  petType: string;
  petBreed: string | null;
  petAge: string;
}

interface RecommendationCard {
  id: string;
  category: 'insurance' | 'training' | 'pension';
  title: string;
  subtitle: string;
  price?: string;
  rating?: number;
  features: string[];
  icon: typeof Shield;
  iconBg: string;
  route: string;
  badge?: string;
}

export const CategoryRecommendations = ({ 
  petId, 
  petName, 
  petType, 
  petBreed,
  petAge 
}: CategoryRecommendationsProps) => {
  const navigate = useNavigate();

  // המלצות מותאמות
  const recommendations: RecommendationCard[] = [
    // ביטוח
    {
      id: 'insurance-1',
      category: 'insurance',
      title: 'ביטוח בריאות מלא',
      subtitle: 'כיסוי מקיף לכל מצב',
      price: '₪89/חודש',
      rating: 4.8,
      features: ['טיפולי חירום', 'ניתוחים', 'תרופות'],
      icon: Shield,
      iconBg: 'bg-success/10',
      route: '/chat',
      badge: 'מומלץ'
    },
    {
      id: 'insurance-2',
      category: 'insurance',
      title: 'ביטוח בסיסי',
      subtitle: 'הגנה לאירועים חריגים',
      price: '₪49/חודש',
      features: ['תאונות', 'אשפוז'],
      icon: Shield,
      iconBg: 'bg-success/10',
      route: '/chat',
    },
    // אילוף
    {
      id: 'training-1',
      category: 'training',
      title: 'קורס אילוף בסיסי',
      subtitle: 'פקודות יסוד והתנהגות',
      price: '₪350',
      rating: 4.9,
      features: ['8 שיעורים', 'מאלף מוסמך', 'תעודה'],
      icon: GraduationCap,
      iconBg: 'bg-primary/10',
      route: '/chat',
      badge: 'הכי נמכר'
    },
    {
      id: 'training-2',
      category: 'training',
      title: 'אילוף מתקדם',
      subtitle: 'טריקים וציות גבוה',
      price: '₪480',
      features: ['12 שיעורים', 'הליכה ברצועה'],
      icon: GraduationCap,
      iconBg: 'bg-primary/10',
      route: '/training',
    },
    // פנסיון
    {
      id: 'pension-1',
      category: 'pension',
      title: 'פנסיון פרימיום',
      subtitle: 'חופשה ברמה גבוהה',
      price: '₪150/לילה',
      rating: 4.7,
      features: ['חדר פרטי', 'טיולים יומיים', 'מצלמה'],
      icon: Home,
      iconBg: 'bg-accent/10',
      route: '/experiences',
      badge: 'פופולרי'
    },
    {
      id: 'pension-2',
      category: 'pension',
      title: 'פנסיון משפחתי',
      subtitle: 'אווירה ביתית וחמה',
      price: '₪95/לילה',
      features: ['משחקים', 'גינה'],
      icon: Home,
      iconBg: 'bg-accent/10',
      route: '/experiences',
    },
  ];

  const categories = [
    { key: 'insurance', title: 'ביטוח', icon: Shield, color: 'text-success' },
    { key: 'training', title: 'אילוף', icon: GraduationCap, color: 'text-primary' },
    { key: 'pension', title: 'פנסיון', icon: Home, color: 'text-accent' },
  ];

  const handleNavigate = (route: string) => {
    navigate(route, { 
      state: { 
        petId, 
        petBreed, 
        petAge, 
        petType, 
        petName 
      } 
    });
  };

  return (
    <div className="space-y-5" dir="rtl">
      {categories.map((category) => {
        const categoryCards = recommendations.filter(r => r.category === category.key);
        const Icon = category.icon;
        
        return (
          <div key={category.key}>
            {/* כותרת קטגוריה */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${category.color}`} />
                <h3 className="text-sm font-semibold">{category.title} מומלץ</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground h-7 px-2"
                onClick={() => handleNavigate(categoryCards[0]?.route || '/')}
              >
                הכל
                <ChevronLeft className="w-3 h-3 mr-1" />
              </Button>
            </div>

            {/* כרטיסי המלצות בגלילה */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
              {categoryCards.map((card) => {
                const CardIcon = card.icon;
                return (
                  <Card 
                    key={card.id}
                    className="flex-shrink-0 w-[200px] p-3 bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => handleNavigate(card.route)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                        <CardIcon className={`w-4 h-4 ${category.color}`} />
                      </div>
                      {card.badge && (
                        <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {card.badge}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <h4 className="text-sm font-semibold mb-0.5">{card.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{card.subtitle}</p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {card.features.slice(0, 2).map((feature, idx) => (
                        <span 
                          key={idx}
                          className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md"
                        >
                          {feature}
                        </span>
                      ))}
                      {card.features.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{card.features.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                      {card.price && (
                        <span className="text-sm font-bold text-foreground">{card.price}</span>
                      )}
                      {card.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs text-muted-foreground">{card.rating}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryRecommendations;
