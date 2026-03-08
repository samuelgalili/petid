/**
 * PetDashboardTabs — Premium Vet App dashboard.
 * Clean underline tabs, generous spacing, dopamine-driven layout.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Stethoscope, Info, MoreHorizontal, Shield, Scissors, GraduationCap, FileText, Building2, Footprints, ShoppingBag, Flame, AlertTriangle } from "lucide-react";
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
  { id: "overview", label: "סקירה" },
  { id: "medical", label: "רפואי" },
  { id: "info", label: "מידע" },
  { id: "services", label: "עוד" },
] as const;

type TabId = typeof TABS[number]["id"];

interface ServiceItem {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const SERVICES: ServiceItem[] = [
  { id: "insurance", label: "ביטוח", icon: Shield, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "grooming", label: "טיפוח", icon: Scissors, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
  { id: "training", label: "אילוף", icon: GraduationCap, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "documents", label: "מסמכים", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { id: "boarding", label: "פנסיון", icon: Building2, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  { id: "dog_walker", label: "דוג ווקר", icon: Footprints, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { id: "products", label: "מוצרים", icon: ShoppingBag, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  { id: "memorial", label: "זיכרון", icon: Flame, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
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
      {/* ── Premium Tab Bar ── */}
      <div className="sticky top-0 z-20 bg-background/98 backdrop-blur-xl border-b border-border/10 mb-5">
        <div className="flex justify-center gap-0 px-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative px-5 py-3 text-sm font-medium transition-colors"
              >
                <span className={isActive ? "text-foreground" : "text-muted-foreground/60"}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-foreground rounded-full"
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {activeTab === "overview" && (
            <OverviewTab
              selectedPet={selectedPet}
              healthRefreshKey={healthRefreshKey}
              onViewHealthDetails={onViewHealthDetails}
              onOpenSmartRec={onOpenSmartRec}
            />
          )}

          {activeTab === "medical" && (
            <MedicalTab
              selectedPet={selectedPet}
              triggerHealthRefresh={triggerHealthRefresh}
            />
          )}

          {activeTab === "info" && (
            <InfoTab
              selectedPet={selectedPet}
              onOpenInsurance={onOpenInsurance}
              onOpenSmartRec={onOpenSmartRec}
              onOpenPetShop={onOpenPetShop}
            />
          )}

          {activeTab === "services" && (
            <ServicesTab
              selectedPet={selectedPet}
              onOpenSheet={onOpenSheet}
              onOpenEmergency={onOpenEmergency}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* ────────────────────────────────────────────
   Overview Tab — Hero health + smart content
   ──────────────────────────────────────────── */
const OverviewTab = ({
  selectedPet,
  healthRefreshKey,
  onViewHealthDetails,
  onOpenSmartRec,
}: {
  selectedPet: any;
  healthRefreshKey: number;
  onViewHealthDetails: () => void;
  onOpenSmartRec: (cat: 'coat' | 'energy' | 'health' | 'feeding' | 'mobility' | 'digestion') => void;
}) => (
  <div className="space-y-5">
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
);

/* ────────────────────────────────────────────
   Medical Tab
   ──────────────────────────────────────────── */
const MedicalTab = ({
  selectedPet,
  triggerHealthRefresh,
}: {
  selectedPet: any;
  triggerHealthRefresh: () => void;
}) => (
  <div className="space-y-5">
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
);

/* ────────────────────────────────────────────
   Info Tab
   ──────────────────────────────────────────── */
const InfoTab = ({
  selectedPet,
  onOpenInsurance,
  onOpenSmartRec,
  onOpenPetShop,
}: {
  selectedPet: any;
  onOpenInsurance: () => void;
  onOpenSmartRec: (cat: 'coat' | 'energy' | 'health' | 'feeding' | 'mobility' | 'digestion') => void;
  onOpenPetShop: () => void;
}) => (
  <div className="space-y-5">
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
);

/* ────────────────────────────────────────────
   Services Tab — Clean grid + utilities
   ──────────────────────────────────────────── */
const ServicesTab = ({
  selectedPet,
  onOpenSheet,
  onOpenEmergency,
}: {
  selectedPet: any;
  onOpenSheet?: (id: string) => void;
  onOpenEmergency?: () => void;
}) => (
  <div className="space-y-6">
    {/* Services Grid */}
    <div>
      <h3 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-3 px-1">
        שירותים
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {SERVICES.map((service, index) => {
          const Icon = service.icon;
          return (
            <motion.button
              key={service.id}
              onClick={() => onOpenSheet?.(service.id)}
              className="flex flex-col items-center gap-2 py-3.5 rounded-2xl hover:bg-muted/30 active:scale-[0.97] transition-all"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, ease: "easeOut" }}
            >
              <div className={`w-11 h-11 rounded-2xl ${service.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${service.color}`} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-foreground/70 text-center leading-tight">
                {service.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>

    {/* Emergency */}
    {onOpenEmergency && (
      <motion.button
        onClick={onOpenEmergency}
        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-destructive/15 bg-destructive/[0.03] hover:bg-destructive/[0.06] transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-4.5 h-4.5 text-destructive" strokeWidth={1.5} />
        </div>
        <div className="text-right flex-1">
          <span className="text-sm font-semibold text-destructive">מרכז חירום</span>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">וטרינרים, הרעלות, מוקדי חירום</p>
        </div>
      </motion.button>
    )}

    {/* Utilities */}
    <div className="space-y-4 pt-1">
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
);
