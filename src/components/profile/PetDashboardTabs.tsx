/**
 * PetDashboardTabs — Tabbed layout for pet dashboard sections.
 * Replaces the long vertical scroll with 4 organized tabs:
 * סקירה (Overview) | רפואי (Medical) | מידע (Info) | עוד (More)
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Stethoscope, Info, MoreHorizontal } from "lucide-react";
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
}

const TABS = [
  { id: "overview", label: "סקירה", icon: Heart },
  { id: "medical", label: "רפואי", icon: Stethoscope },
  { id: "info", label: "מידע", icon: Info },
  { id: "more", label: "עוד", icon: MoreHorizontal },
] as const;

type TabId = typeof TABS[number]["id"];

export const PetDashboardTabs = ({
  selectedPet,
  healthRefreshKey,
  onViewHealthDetails,
  triggerHealthRefresh,
  onOpenSmartRec,
  onOpenInsurance,
  onOpenPetShop,
}: PetDashboardTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="mb-4">
      {/* ── Tab Bar ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/20 mb-3">
        <div className="flex justify-center gap-1 px-4 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
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
            <>
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
            </>
          )}

          {activeTab === "medical" && (
            <>
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
            </>
          )}

          {activeTab === "info" && (
            <>
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
            </>
          )}

          {activeTab === "more" && (
            <>
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
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
