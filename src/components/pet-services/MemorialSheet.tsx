/**
 * MemorialSheet - Memorial and burial services for pets
 * Handles end-of-life services with dignity
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Phone, ChevronLeft, Flower } from "lucide-react";
import { ServiceBottomSheet } from "./ServiceBottomSheet";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
}

interface MemorialSheetProps {
  pet: Pet;
  lifeExpectancy?: string;
  isOpen: boolean;
  onClose: () => void;
}

const memorialServices = [
  {
    id: 'burial',
    name: 'שירות קבורה',
    description: 'קבורה מכובדת בבית עלמין לחיות',
    icon: Flower,
    phone: '1-800-PET-REST',
  },
  {
    id: 'cremation',
    name: 'שירות שריפה',
    description: 'שריפה כבודית עם אפשרות לקבלת אפר',
    icon: Heart,
    phone: '1-800-PET-REST',
  },
  {
    id: 'memorial',
    name: 'הנצחה דיגיטלית',
    description: 'יצירת עמוד הנצחה לזכרון חיית המחמד',
    icon: Heart,
    phone: null,
  },
];

export const MemorialSheet = ({ pet, lifeExpectancy, isOpen, onClose }: MemorialSheetProps) => {
  const navigate = useNavigate();

  const handleContact = (phone: string | null, serviceId: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else if (serviceId === 'memorial') {
      // Navigate to memorial page
      navigate(`/`);
      onClose();
    }
  };

  const infoContent = lifeExpectancy ? (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Heart className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground">תוחלת חיים משוערת</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {lifeExpectancy} שנים
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        המידע מבוסס על נתונים סטטיסטיים לגזע. תזונה נכונה ובריאות טובה יכולים להאריך את תוחלת החיים.
      </p>
    </div>
  ) : null;

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="שירותי הנצחה"
      infoContent={infoContent}
    >
      <div className="space-y-4">
        {/* Sensitive notice */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/30 rounded-xl p-4 border border-border/30"
        >
          <p className="text-sm text-muted-foreground text-center">
            אנו מבינים שזה נושא רגיש. השירותים להלן זמינים כדי לסייע לך בזמן קשה.
          </p>
        </motion.div>

        {/* Services list */}
        <div className="space-y-3">
          {memorialServices.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl border border-border p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <service.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{service.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {service.description}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 rounded-full"
                onClick={() => handleContact(service.phone, service.id)}
              >
                {service.phone ? (
                  <>
                    <Phone className="w-4 h-4 ml-2" />
                    צור קשר
                  </>
                ) : (
                  <>
                    יצירת עמוד הנצחה
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Report passing */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4 border-t border-border"
        >
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => {
              navigate(`/`);
              onClose();
            }}
          >
            דיווח על פטירה של {pet.name}
          </Button>
        </motion.div>
      </div>
    </ServiceBottomSheet>
  );
};
