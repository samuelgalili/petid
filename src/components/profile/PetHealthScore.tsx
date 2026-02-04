import { motion } from "framer-motion";
import { AlertTriangle, Activity } from "lucide-react";

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

interface PetHealthScoreProps {
  pet: Pet;
}

export const PetHealthScore = ({ pet }: PetHealthScoreProps) => {
  // Calculate a mock health score based on pet data
  // In production, this would come from actual health records, vaccinations, etc.
  const calculateHealthScore = () => {
    let score = 85; // Base score
    
    // Adjust based on age (younger pets generally have higher scores)
    if (pet.age_years) {
      if (pet.age_years < 3) score += 5;
      else if (pet.age_years > 8) score -= 5;
    }
    
    // Cap at 100
    return Math.min(100, Math.max(0, score + Math.floor(Math.random() * 10)));
  };

  const healthScore = calculateHealthScore();
  
  // Determine if there are any alerts
  const hasVaccineAlert = Math.random() > 0.5; // Mock - in production would check actual data
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-4 py-3 mb-3"
    >
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <span className="text-lg font-bold text-foreground">
          ציון בריאות: {healthScore}%
        </span>
      </div>
      
      {hasVaccineAlert && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-warning/20 rounded-full"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-medium text-warning">
            חיסון בקרוב
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};
