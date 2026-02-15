/**
 * InsuranceUpsell — Shows Libra Insurance recommendation in checkout for high-risk breeds.
 * Emphasized more for breeds with known health issues.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, ChevronLeft } from "lucide-react";
import { useActivePet } from "@/hooks/useActivePet";
import { useNavigate } from "react-router-dom";

const HIGH_RISK_BREEDS = [
  "בולדוג", "bulldog", "פאג", "pug", "גרמן שפרד", "german shepherd",
  "רוטווילר", "rottweiler", "דוברמן", "doberman", "בוקסר", "boxer",
  "גולדן רטריבר", "golden retriever", "לברדור", "labrador",
  "קאבליר", "cavalier", "ברנזי", "bernese", "דני ענק", "great dane",
  "שר-פיי", "shar pei", "דלמטי", "dalmatian", "האסקי", "husky",
];

const LIBRA_BLUE = "210 90% 45%";

export const InsuranceUpsell = () => {
  const { pet } = useActivePet();
  const navigate = useNavigate();

  const isHighRisk = useMemo(() => {
    if (!pet?.breed) return false;
    const breedLower = pet.breed.toLowerCase();
    return HIGH_RISK_BREEDS.some(b => breedLower.includes(b));
  }, [pet]);

  const hasMedicalConditions = pet?.medical_conditions && pet.medical_conditions.length > 0;

  // Show for high-risk breeds or pets with medical conditions
  if (!pet || (!isHighRisk && !hasMedicalConditions)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto"
    >
      <button
        onClick={() => navigate("/insurance")}
        className="w-full p-4 rounded-2xl border-2 text-right transition-all hover:shadow-md"
        style={{
          borderColor: `hsl(${LIBRA_BLUE} / 0.3)`,
          background: `linear-gradient(135deg, hsl(${LIBRA_BLUE} / 0.05), hsl(${LIBRA_BLUE} / 0.1))`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: `hsl(${LIBRA_BLUE} / 0.15)` }}
            >
              <Shield className="w-4 h-4" style={{ color: `hsl(${LIBRA_BLUE})` }} strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                ביטוח Libra ל{pet.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isHighRisk
                  ? `${pet.breed} נחשב גזע בסיכון גבוה — ביטוח מומלץ במיוחד`
                  : "כיסוי רפואי מותאם למצב הבריאותי"}
              </p>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    </motion.div>
  );
};
