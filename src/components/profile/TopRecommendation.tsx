import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Dog, Cat, Calendar, Ruler, Weight, User, MessageCircle, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
  size?: string;
  weight?: number;
  avatar_url?: string;
  user_id?: string;
}

interface OwnerProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TopRecommendationProps {
  pet: Pet;
  onViewPolicy: () => void;
}

export const TopRecommendation = ({ pet }: TopRecommendationProps) => {
  const navigate = useNavigate();
  const [owner, setOwner] = useState<OwnerProfile | null>(null);

  // Fetch owner profile
  useEffect(() => {
    const fetchOwner = async () => {
      if (!pet.user_id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', pet.user_id)
        .maybeSingle();
      
      if (data) {
        setOwner(data);
      }
    };

    fetchOwner();
  }, [pet.user_id]);

  // Format age display
  const getAgeDisplay = () => {
    if (pet.age_years && pet.age_years > 0) {
      const years = pet.age_years === 1 ? 'שנה' : 'שנים';
      if (pet.age_months && pet.age_months > 0) {
        return `${pet.age_years} ${years} ו-${pet.age_months} חודשים`;
      }
      return `${pet.age_years} ${years}`;
    }
    if (pet.age_months && pet.age_months > 0) {
      return `${pet.age_months} חודשים`;
    }
    return 'לא צוין';
  };

  // Get size display in Hebrew
  const getSizeDisplay = () => {
    const sizes: Record<string, string> = {
      'small': 'קטן',
      'medium': 'בינוני',
      'large': 'גדול',
      'extra_large': 'ענק',
    };
    return sizes[pet.size || ''] || pet.size || 'לא צוין';
  };

  // Handle send message to owner
  const handleMessageOwner = () => {
    if (owner?.id) {
      navigate(`/messages?userId=${owner.id}`);
    }
  };

  const petTypeHe = pet.type === 'dog' ? 'כלב' : 'חתול';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mx-4 p-4 bg-card rounded-xl border border-border/30"
    >
      {/* Pet Header */}
      <div className="flex items-center gap-3 mb-4">
        {/* Pet Avatar */}
        <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-border flex-shrink-0">
          {pet.avatar_url ? (
            <img 
              src={pet.avatar_url} 
              alt={pet.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={pet.type === 'dog' ? dogIcon : catIcon} 
                alt={petTypeHe} 
                className="w-8 h-8 opacity-60" 
              />
            </div>
          )}
        </div>
        
        {/* Name & Type */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-lg">{pet.name}</h3>
          <p className="text-xs text-muted-foreground">
            {pet.breed || petTypeHe}
          </p>
        </div>

        {/* Type Icon */}
        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
          {pet.type === 'dog' ? (
            <Dog className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Cat className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {/* Pet Details Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Age */}
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
          <Calendar className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-[10px] text-muted-foreground">גיל</span>
          <span className="text-xs font-semibold text-foreground text-center leading-tight">{getAgeDisplay()}</span>
        </div>
        
        {/* Size */}
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
          <Ruler className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-[10px] text-muted-foreground">גודל</span>
          <span className="text-xs font-semibold text-foreground">{getSizeDisplay()}</span>
        </div>
        
        {/* Weight */}
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
          <Weight className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-[10px] text-muted-foreground">משקל</span>
          <span className="text-xs font-semibold text-foreground">
            {pet.weight ? `${pet.weight} ק"ג` : 'לא צוין'}
          </span>
        </div>

        {/* Owner - Clickable to send message */}
        <button
          onClick={handleMessageOwner}
          disabled={!owner}
          className="flex flex-col items-center p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="relative">
            <User className="w-4 h-4 text-primary mb-1" />
            <MessageCircle className="w-2.5 h-2.5 text-primary absolute -bottom-0.5 -left-1" />
          </div>
          <span className="text-[10px] text-primary">בעלים</span>
          <span className="text-xs font-semibold text-primary truncate max-w-full">
            {owner?.full_name?.split(' ')[0] || 'אני'}
          </span>
        </button>
      </div>
    </motion.div>
  );
};
