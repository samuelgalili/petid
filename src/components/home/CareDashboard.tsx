/**
 * Care Dashboard - דשבורד דאגה
 * מסך בית מותאם אישית - לא מסך מכירות, מסך ליווי
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PawPrint, Heart, Bell, ShoppingBag, Sparkles, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  getTimeGreeting, 
  HOME, 
  REMINDERS, 
  ACTIONS,
  calculateDaysUntilReorder 
} from "@/lib/brandVoice";

interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string | null;
  avatar_url?: string | null;
  birth_date?: string | null;
}

interface CareDashboardProps {
  className?: string;
}

export const CareDashboard = ({ className = "" }: CareDashboardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [primaryPet, setPrimaryPet] = useState<Pet | null>(null);
  const [daysUntilReorder, setDaysUntilReorder] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPetsAndOrders = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: true })
        .limit(5);
      
      if (data && !error) {
        setPets(data);
        if (data.length > 0) {
          setPrimaryPet(data[0]);
          
          // Fetch last order to calculate days until reorder
          const { data: lastOrder } = await supabase
            .from("orders")
            .select("created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (lastOrder) {
            setDaysUntilReorder(calculateDaysUntilReorder(new Date(lastOrder.created_at)));
          } else {
            setDaysUntilReorder(0); // No previous orders
          }
        }
      }
      setLoading(false);
    };
    
    fetchPetsAndOrders();
  }, [user?.id]);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-32 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (!primaryPet) {
    return (
      <Card className={`p-6 text-center ${className}`} dir="rtl">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <PawPrint className="w-8 h-8 text-primary" />
        </div>
        <p className="text-foreground font-medium mb-2">עדיין אין חיות מחמד</p>
        <p className="text-sm text-muted-foreground mb-4">
          בואו נתחיל! הוסיפו את חיית המחמד הראשונה שלכם 🐕🐈
        </p>
        <Button onClick={() => navigate("/add-pet")} className="gap-2">
          <PawPrint className="w-4 h-4" />
          הוסיפו חיית מחמד
        </Button>
      </Card>
    );
  }

  const greeting = getTimeGreeting();

  return (
    <div className={`space-y-4 ${className}`} dir="rtl">
      {/* Main Care Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          {/* Greeting Section */}
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px] cursor-pointer"
              onClick={() => navigate(`/pet/${primaryPet.id}`)}
            >
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                {primaryPet.avatar_url ? (
                  <img src={primaryPet.avatar_url} alt={primaryPet.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{primaryPet.type === 'dog' ? '🐕' : '🐈'}</span>
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <p className="text-lg font-bold text-foreground">
                {greeting}, {primaryPet.name} {primaryPet.type === 'dog' ? '🐶' : '🐱'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                נשארו כ-<span className="font-semibold text-primary">{daysUntilReorder}</span> ימים למלאי
              </p>
            </div>
          </div>

          {/* Stock Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>מלאי מזון</span>
              <span>{Math.round((daysUntilReorder / 30) * 100)}%</span>
            </div>
            <Progress 
              value={(daysUntilReorder / 30) * 100} 
              className="h-2"
            />
          </div>

          {/* Quick Reorder */}
          <Button 
            onClick={() => navigate("/shop?reorder=true")}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            <Package className="w-4 h-4" />
            {HOME.orderInClick}
          </Button>
        </Card>
      </motion.div>

      {/* Care Message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {HOME.betweenPurchases}
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Tailored Tip */}
      {primaryPet.type === 'dog' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 border-l-4 border-l-accent">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {HOME.tailoredTip}
                </p>
                <p className="text-xs text-muted-foreground">
                  כלבים בגיל {primaryPet.birth_date ? 
                    `${Math.floor((Date.now() - new Date(primaryPet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365))}` : 
                    '2-5'
                  } זקוקים לחלבון איכותי לשמירה על אנרגיה 💪
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* All Pets Quick Access */}
      {pets.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">החיות שלי</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/add-pet")}
              className="text-primary text-xs"
            >
              + הוסף
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {pets.map((pet) => (
              <motion.div
                key={pet.id}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer"
                onClick={() => navigate(`/pet/${pet.id}`)}
              >
                <div className={`w-12 h-12 rounded-full p-[2px] ${
                  pet.id === primaryPet.id 
                    ? 'bg-gradient-to-br from-primary to-secondary' 
                    : 'bg-border'
                }`}>
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                    {pet.avatar_url ? (
                      <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">{pet.type === 'dog' ? '🐕' : '🐈'}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-12">{pet.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
