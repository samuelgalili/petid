import { Card } from "@/components/ui/card";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dog, Cat } from "lucide-react";

const PetSelector = () => {
  const { petType, setPetType } = usePetPreference();
  const { language } = useLanguage();

  const translations = {
    he: {
      title: "איזה חיית מחמד יש לך?",
      dog: "כלב",
      cat: "חתול",
    },
    en: {
      title: "What pet do you have?",
      dog: "Dog",
      cat: "Cat",
    },
    ar: {
      title: "أي حيوان أليف لديك؟",
      dog: "كلب",
      cat: "قطة",
    },
  };

  const t = translations[language];

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-center mb-6">{t.title}</h2>
      <div className="grid grid-cols-2 gap-4">
        <Card
          className={`p-8 cursor-pointer transition-all hover:scale-105 ${
            petType === "dog"
              ? "border-primary border-2 bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => setPetType("dog")}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Dog className="w-12 h-12 text-primary" />
            </div>
            <span className="text-xl font-semibold">{t.dog}</span>
          </div>
        </Card>
        <Card
          className={`p-8 cursor-pointer transition-all hover:scale-105 ${
            petType === "cat"
              ? "border-primary border-2 bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => setPetType("cat")}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Cat className="w-12 h-12 text-primary" />
            </div>
            <span className="text-xl font-semibold">{t.cat}</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PetSelector;
