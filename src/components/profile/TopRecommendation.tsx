import { motion } from "framer-motion";
import { Shield, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface TopRecommendationProps {
  pet: Pet;
  onViewPolicy: () => void;
}

export const TopRecommendation = ({ pet, onViewPolicy }: TopRecommendationProps) => {
  // Generate recommendation based on pet data
  const getRecommendation = () => {
    const breed = pet.breed || (pet.type === 'dog' ? 'כלב' : 'חתול');
    
    // Common breed-specific health concerns
    const breedConcerns: Record<string, string> = {
      'גולדן רטריבר': 'מפרקים',
      'לברדור': 'מפרקים',
      'german shepherd': 'מפרקים',
      'גרמני': 'מפרקים',
      'בולדוג': 'נשימה',
      'פאג': 'נשימה',
      'האסקי': 'עיניים',
      'דוברמן': 'לב',
      'ביגל': 'אוזניים',
      'פרסי': 'נשימה',
      'סיאמי': 'שיניים',
    };
    
    // Find matching concern
    const lowerBreed = breed.toLowerCase();
    let concern = 'בריאות כללית';
    for (const [key, value] of Object.entries(breedConcerns)) {
      if (lowerBreed.includes(key.toLowerCase())) {
        concern = value;
        break;
      }
    }
    
    return {
      title: `ביטוח פרימיום ל${pet.name}`,
      description: `מבוסס על הגזע של ${pet.name} (${breed}), אנו ממליצים על פוליסה המכסה בעיות ${concern}.`,
    };
  };

  const recommendation = getRecommendation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mx-4 p-4 bg-muted/50 rounded-2xl border border-border/50"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground mb-1">
            המלצה מובילה
          </h3>
          <p className="text-base font-semibold text-foreground mb-1">
            {recommendation.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {recommendation.description}
          </p>
        </div>
      </div>
      
      {/* Action Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onViewPolicy}
        className="w-full mt-3 rounded-full border-foreground/20 text-foreground hover:bg-muted"
      >
        צפה בפוליסה
        <ChevronLeft className="w-4 h-4 mr-1" />
      </Button>
    </motion.div>
  );
};
