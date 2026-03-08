/**
 * PetDashboardTabs — Clean tabbed layout for pet dashboard.
 * 4 tabs: סקירה (Overview) | רפואי (Medical) | מידע (Info) | שירותים (Services)
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Stethoscope, Info, Grid3X3, Shield, Scissors, GraduationCap, FileText, Building2, Footprints, ShoppingBag, Flame, AlertTriangle } from "lucide-react";
import { PetHealthScore } from "./PetHealthScore";
import { RecoveryBanner } from "./RecoveryBanner";
import { DangerousBreedBanner } from "./DangerousBreedBanner";
import { DiscoveryCards } from "./DiscoveryCards";
import { MemoryCard } from "./MemoryCard";
import { VaccineCountdown } from "./VaccineCountdown";
import { PuppyVaccineScheduler } from "./PuppyVaccineScheduler";
import { MedicalTimeline } from "./MedicalTimeline";
import { MedicalDocumentFAB } from "./MedicalDocumentFAB";
import { PreventiveCareEngine } from "./PreventiveCareEngine";
import { BreedHealthTips } from "./BreedHealthTips";
import { BreedStatsCard } from "./BreedStatsCard";
import { MyClinicCard } from "./MyClinicCard";
import { ClaimsHistory } from "./ClaimsHistory";
import { TopRecommendation } from "./TopRecommendation";
import { PetEssentials } from "./PetEssentials";
import { PetPhotoGallery } from "./PetPhotoGallery";
import { PetMiniCalendar } from "./PetMiniCalendar";
import { VetHistoryPDF } from "./VetHistoryPDF";

interface PetDashboardTabsProps {
  selectedPet: any;
  healthRefreshKey: number;
  onViewHealthDetails: () => void;
  triggerHealthRefresh: () => void;
  onOpenSmartRec: (cat: 'coat' | 'energy' | 'health' | 'feeding' | 'mobility' | 'digestion') => void;
  onOpenInsurance: () => void;
  onOpenPetShop: () => void;
  onOpenSheet?: (id: string) => void;
  onOpenEmergency?: () => void;
}

const TABS = [
  { id: "overview", label: "סקירה", icon: Heart },
  { id: "medical", label: "רפואי", icon: Stethoscope },
  { id: "info", label: "מידע", icon: Info },
  { id: "services", label: "שירותים", icon: Grid3X3 },
] as const;

type TabId = typeof TABS[number]["id"];

interface ServiceItem {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const SERVICES: ServiceItem[] = [
  { id: "insurance", label: "ביטוח", icon: Shield, color: "text-blue-500" },
  { id: "grooming", label: "טיפוח", icon: Scissors, color: "text-pink-500" },
  { id: "training", label: "אילוף", icon: GraduationCap, color: "text-amber-500" },
  { id: "documents", label: "מסמכים", icon: FileText, color: "text-emerald-500" },
  { id: "boarding", label: "פנסיון", icon: Building2, color: "text-violet-500" },
  { id: "dog_walker", label: "דוג ווקר", icon: Footprints, color: "text-orange-500" },
  { id: "products", label: "מוצרים", icon: ShoppingBag, color: "text-cyan-500" },
  { id: "memorial", label: "זיכרון", icon: Flame, color: "text-rose-400" },
];

export const PetDashboardTabs = ({
  selectedPet,
  healthRefreshKey,
  onViewHealthDetails,
  triggerHealthRefresh,
  onOpenSmartRec,
  onOpenInsurance,
  onOpenPetShop,
  onOpenSheet,
  onOpenEmergency,
}: PetDashboardTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="mb-4">
      {/* ── Tab Bar ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/20 mb-3">
        <div className="flex justify-center gap-1 px-3 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-full bg-primary/10 -z-10"
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && (
            <div className="space-y-4">
              <PetHealthScore
                pet={selectedPet}
                onViewDetails={onViewHealthDetails}
                refreshKey={healthRefreshKey}
              />
              <RecoveryBanner
                petId={selectedPet.id}
                petName={selectedPet.name}
                onOpenRecoveryProducts={() => onOpenSmartRec("health")}
              />
              {selectedPet.is_dangerous_breed && (
                <DangerousBreedBanner
                  breedName={selectedPet.breed}
                  licenseConditions={selectedPet.license_conditions}
                />
              )}
              <DiscoveryCards
                petId={selectedPet.id}
                petName={selectedPet.name}
                petType={selectedPet.type}
              />
              <MemoryCard petId={selectedPet.id} petName={selectedPet.name} />
            </div>
          )}

          {activeTab === "medical" && (
            <div className="space-y-4">
              <VaccineCountdown petId={selectedPet.id} petName={selectedPet.name} />
              <PuppyVaccineScheduler
                petName={selectedPet.name}
                birthDate={selectedPet.birth_date}
                breed={selectedPet.breed}
                petType={selectedPet.type}
              />
              <MedicalTimeline petId={selectedPet.id} petName={selectedPet.name} />
              <MedicalDocumentFAB
                petId={selectedPet.id}
                petName={selectedPet.name}
                petBirthDate={selectedPet.birth_date}
                petBreed={selectedPet.breed}
                onComplete={triggerHealthRefresh}
              />
              <PreventiveCareEngine
                petId={selectedPet.id}
                petName={selectedPet.name}
                breed={selectedPet.breed}
                birthDate={selectedPet.birth_date}
                petType={selectedPet.type}
              />
            </div>
          )}

          {activeTab === "info" && (
            <div className="space-y-4">
              <BreedHealthTips
                petName={selectedPet.name}
                breed={selectedPet.breed}
                ageMonths={selectedPet.age_months}
                ageYears={selectedPet.age_years}
                petType={selectedPet.type}
              />
              <BreedStatsCard pet={selectedPet} />
              {selectedPet.vet_clinic_name && (
                <MyClinicCard
                  clinicName={selectedPet.vet_clinic_name}
                  clinicPhone={selectedPet.vet_clinic_phone}
                  clinicAddress={selectedPet.vet_clinic_address}
                />
              )}
              <ClaimsHistory petId={selectedPet.id} />
              <TopRecommendation
                pet={selectedPet}
                onViewPolicy={onOpenInsurance}
                onEnergyOpen={() => onOpenSmartRec("energy")}
                onGroomingOpen={() => onOpenSmartRec("coat")}
                onFeedingOpen={() => onOpenSmartRec("feeding")}
                onMobilityOpen={() => onOpenSmartRec("mobility")}
                onDigestionOpen={() => onOpenSmartRec("digestion")}
              />
              <PetEssentials pet={selectedPet} onOpenShop={onOpenPetShop} />
            </div>
          )}

          {activeTab === "services" && (
            <div className="space-y-5">
              {/* Quick Services Grid */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 px-1">שירותים</h3>
                <div className="grid grid-cols-4 gap-2">
                  {SERVICES.map((service, index) => {
                    const Icon = service.icon;
                    return (
                      <motion.button
                        key={service.id}
                        onClick={() => onOpenSheet?.(service.id)}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-muted/30 border border-border/20 hover:bg-muted/50 active:scale-95 transition-all"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center shadow-sm">
                          <Icon className={`w-4 h-4 ${service.color}`} strokeWidth={1.5} />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">
                          {service.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Emergency Button */}
              {onOpenEmergency && (
                <motion.button
                  onClick={onOpenEmergency}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-destructive" strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-destructive">מרכז חירום</span>
                    <p className="text-[11px] text-muted-foreground">וטרינרים, הרעלות, מוקדי חירום</p>
                  </div>
                </motion.button>
              )}

              {/* Gallery, Calendar, PDF */}
              <div className="space-y-4 pt-2">
                <PetPhotoGallery
                  petId={selectedPet.id}
                  petAvatar={selectedPet.avatar_url}
                  petName={selectedPet.name}
                />
                <PetMiniCalendar
                  petId={selectedPet.id}
                  petName={selectedPet.name}
                  isOwner={true}
                />
                <VetHistoryPDF
                  petId={selectedPet.id}
                  petName={selectedPet.name}
                  petBreed={selectedPet.breed}
                  petType={selectedPet.type}
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
