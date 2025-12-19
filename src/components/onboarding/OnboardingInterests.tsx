import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Dog, Cat, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DOG_BREEDS = [
  { value: "labrador", label: "לברדור", emoji: "🐕" },
  { value: "golden", label: "גולדן רטריבר", emoji: "🦮" },
  { value: "german_shepherd", label: "רועה גרמני", emoji: "🐕‍🦺" },
  { value: "poodle", label: "פודל", emoji: "🐩" },
  { value: "bulldog", label: "בולדוג", emoji: "🐶" },
  { value: "beagle", label: "ביגל", emoji: "🐕" },
  { value: "husky", label: "האסקי", emoji: "🐺" },
  { value: "pomeranian", label: "פומרניאן", emoji: "🐾" },
  { value: "chihuahua", label: "צ׳יוואווה", emoji: "🐕" },
  { value: "mixed", label: "מעורב", emoji: "🐶" },
];

const CAT_BREEDS = [
  { value: "persian", label: "פרסי", emoji: "🐱" },
  { value: "siamese", label: "סיאמי", emoji: "🐈" },
  { value: "maine_coon", label: "מיין קון", emoji: "🦁" },
  { value: "british_shorthair", label: "בריטי קצר שיער", emoji: "🐱" },
  { value: "ragdoll", label: "רגדול", emoji: "🐈" },
  { value: "bengal", label: "בנגלי", emoji: "🐆" },
  { value: "scottish_fold", label: "סקוטי פולד", emoji: "🐱" },
  { value: "sphynx", label: "ספינקס", emoji: "🐈‍⬛" },
  { value: "street", label: "חתול רחוב", emoji: "🐈" },
  { value: "mixed", label: "מעורב", emoji: "🐱" },
];

const INTERESTS = [
  { value: "adoption", label: "אימוץ", emoji: "❤️", icon: Heart },
  { value: "training", label: "אילוף", emoji: "🎓" },
  { value: "grooming", label: "טיפוח", emoji: "✨" },
  { value: "parks", label: "גינות כלבים", emoji: "🌳" },
  { value: "products", label: "מוצרים", emoji: "🛍️" },
  { value: "health", label: "בריאות", emoji: "🏥" },
  { value: "social", label: "קהילה", emoji: "👥" },
  { value: "travel", label: "טיולים", emoji: "✈️" },
];

interface OnboardingInterestsProps {
  selectedBreeds: string[];
  selectedInterests: string[];
  preferredPetType: 'dog' | 'cat' | null;
  onBreedsChange: (breeds: string[]) => void;
  onInterestsChange: (interests: string[]) => void;
  onPetTypeChange: (type: 'dog' | 'cat') => void;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingInterests = ({
  selectedBreeds,
  selectedInterests,
  preferredPetType,
  onBreedsChange,
  onInterestsChange,
  onPetTypeChange,
  onComplete,
  onSkip,
}: OnboardingInterestsProps) => {
  const [step, setStep] = useState<'pet' | 'breeds' | 'interests'>('pet');

  const breeds = preferredPetType === 'cat' ? CAT_BREEDS : DOG_BREEDS;

  const toggleBreed = (breed: string) => {
    if (selectedBreeds.includes(breed)) {
      onBreedsChange(selectedBreeds.filter(b => b !== breed));
    } else if (selectedBreeds.length < 5) {
      onBreedsChange([...selectedBreeds, breed]);
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      onInterestsChange(selectedInterests.filter(i => i !== interest));
    } else {
      onInterestsChange([...selectedInterests, interest]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col" dir="rtl">
      {/* Progress */}
      <div className="flex gap-2 p-4">
        {['pet', 'breeds', 'interests'].map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= ['pet', 'breeds', 'interests'].indexOf(step) ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 px-4 py-6">
        {step === 'pet' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">ברוכים הבאים! 🎉</h1>
              <p className="text-muted-foreground">איזה חיות מחמד יש לך או מעניינות אותך?</p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onPetTypeChange('dog');
                  setStep('breeds');
                }}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  preferredPetType === 'dog' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Dog className="w-16 h-16 mx-auto mb-3 text-primary" />
                <span className="font-bold">כלבים 🐕</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onPetTypeChange('cat');
                  setStep('breeds');
                }}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  preferredPetType === 'cat' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Cat className="w-16 h-16 mx-auto mb-3 text-primary" />
                <span className="font-bold">חתולים 🐈</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 'breeds' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">גזעים מועדפים</h1>
              <p className="text-muted-foreground">בחר עד 5 גזעים שמעניינים אותך</p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {breeds.map((breed) => {
                const isSelected = selectedBreeds.includes(breed.value);
                return (
                  <motion.button
                    key={breed.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleBreed(breed.value)}
                    className={`px-4 py-2.5 rounded-full border-2 transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span>{breed.emoji}</span>
                    <span className="font-medium">{breed.label}</span>
                    {isSelected && <Check className="w-4 h-4" />}
                  </motion.button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setStep('pet')} className="flex-1">
                חזרה
              </Button>
              <Button onClick={() => setStep('interests')} className="flex-1">
                המשך
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'interests' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">תחומי עניין</h1>
              <p className="text-muted-foreground">מה מעניין אותך?</p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest.value);
                return (
                  <motion.button
                    key={interest.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleInterest(interest.value)}
                    className={`px-4 py-2.5 rounded-full border-2 transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span>{interest.emoji}</span>
                    <span className="font-medium">{interest.label}</span>
                    {isSelected && <Check className="w-4 h-4" />}
                  </motion.button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setStep('breeds')} className="flex-1">
                חזרה
              </Button>
              <Button onClick={onComplete} className="flex-1">
                סיום והוספת חיה
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Skip button */}
      <div className="p-4 text-center">
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          דלג לעכשיו
        </Button>
      </div>
    </div>
  );
};

export default OnboardingInterests;
