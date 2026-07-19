import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Bot,
  ChevronLeft,
  FileHeart,
  HeartPulse,
  Plus,
  Settings2,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react";
import { motion } from "framer-motion";

import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import { PetidLogo } from "@/components/PetidLogo";
import { usePetPreference } from "@/contexts/PetPreferenceContext";

const moods = [
  { emoji: "🥰", label: "שמחה" },
  { emoji: "😌", label: "רגועה" },
  { emoji: "🤪", label: "שובבה" },
  { emoji: "😴", label: "עייפה" },
];

const MipoHome = () => {
  const navigate = useNavigate();
  const { activePet, loading } = usePetPreference();
  const petName = activePet?.name || "החבר שלך";
  const firstName = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "בוקר טוב";
    if (hour < 18) return "צהריים טובים";
    return "ערב טוב";
  }, []);

  return (
    <main className="mipo-screen min-h-screen pb-28" dir="rtl">
      <div className="mipo-shell min-h-screen overflow-hidden pb-24">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/[0.05] bg-white/85 px-5 py-3 backdrop-blur-xl">
          <button className="mipo-icon-button" onClick={() => navigate("/profile")} aria-label="פרופיל משתמש">
            <UserRound className="h-5 w-5" strokeWidth={1.7} />
          </button>
          <PetidLogo variant="horizontal" size="sm" showAnimals={false} />
          <button className="mipo-icon-button" onClick={() => navigate("/notifications")} aria-label="התראות">
            <Bell className="h-5 w-5" strokeWidth={1.7} />
          </button>
        </header>

        <section className="px-5 pb-5 pt-7 text-center">
          <p className="text-sm font-medium text-mipo-muted">{firstName}</p>
          <h1 className="mt-1 text-[2rem] font-semibold leading-tight tracking-[-0.035em] text-mipo-ink">
            איך {petName} מרגיש{activePet?.pet_type === "cat" ? "ה" : ""} היום?
          </h1>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => activePet ? navigate(`/pet-profile/${activePet.id}`) : navigate("/add-pet")}
            className="mx-auto mt-6 block"
            aria-label={activePet ? `פתיחת הפרופיל של ${petName}` : "הוספת חיית מחמד"}
          >
            <div className="mipo-gradient-ring h-36 w-36 shadow-[0_18px_42px_rgba(96,165,250,0.22)]">
              <div className="h-full w-full overflow-hidden rounded-full border-[5px] border-white bg-mipo-soft">
                {loading ? (
                  <div className="h-full w-full animate-pulse bg-mipo-soft" />
                ) : (
                  <img
                    src={activePet?.avatar_url || defaultPetAvatar}
                    alt={petName}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>
          </motion.button>

          <div className="mt-5 flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {moods.map((mood) => (
              <button
                key={mood.label}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-black/[0.07] bg-white px-3.5 text-sm font-medium text-mipo-ink shadow-sm active:scale-95"
              >
                <span aria-hidden="true">{mood.emoji}</span>
                {mood.label}
              </button>
            ))}
          </div>
        </section>

        <section className="px-5">
          <div className="mipo-card overflow-hidden p-5 text-right">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#F7F7F5] px-3 py-1 text-xs font-semibold text-mipo-muted">
                  <Sparkles className="h-3.5 w-3.5 text-mipo-violet" />
                  התובנה של Mipo
                </div>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-mipo-ink">
                  יום טוב לתנועה עדינה
                </h2>
                <p className="mt-2 text-sm leading-6 text-mipo-muted">
                  לפי הפרופיל של {petName}, טיול רגוע ומשחק קצר יעזרו לשמור על שגרה מאוזנת.
                </p>
              </div>
              <div className="mipo-gradient-ring shrink-0 p-[2px]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
                  <Bot className="h-5 w-5 text-mipo-ink" />
                </div>
              </div>
            </div>
            <button onClick={() => navigate("/chat")} className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-mipo-ink">
              לשאול את Mipo
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="px-5 pb-4 pt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-mipo-ink">הכל במקום אחד</h2>
            <button onClick={() => navigate("/pet-profile")} className="text-sm font-medium text-mipo-muted">
              לכל הפרטים
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <QuickCard icon={HeartPulse} label="בריאות" detail="מעקב וטיפולים" color="#FB7185" onClick={() => navigate("/pet-profile")} />
            <QuickCard icon={FileHeart} label="מסמכים" detail="הכספת של Mipo" color="#A78BFA" onClick={() => navigate("/documents")} />
            <QuickCard icon={ShoppingBag} label="חנות" detail="מותאם אישית" color="#60A5FA" onClick={() => navigate("/shop")} />
            <QuickCard icon={Settings2} label="העדפות" detail="פרטים ושגרה" color="#22D3EE" onClick={() => navigate(activePet ? `/edit-pet/${activePet.id}` : "/add-pet")} />
          </div>

          {!activePet && !loading && (
            <button onClick={() => navigate("/add-pet")} className="mipo-gradient-button mt-5 w-full px-5">
              <Plus className="h-5 w-5" />
              הוספת חיית המחמד הראשונה
            </button>
          )}
        </section>
      </div>
    </main>
  );
};

const QuickCard = ({
  icon: Icon,
  label,
  detail,
  color,
  onClick,
}: {
  icon: typeof HeartPulse;
  label: string;
  detail: string;
  color: string;
  onClick: () => void;
}) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="mipo-card min-h-36 p-4 text-right"
  >
    <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1F` }}>
      <Icon className="h-5 w-5" style={{ color }} strokeWidth={1.8} />
    </span>
    <strong className="block text-base font-semibold text-mipo-ink">{label}</strong>
    <span className="mt-0.5 block text-xs text-mipo-muted">{detail}</span>
  </motion.button>
);

export default MipoHome;
