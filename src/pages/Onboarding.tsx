import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGame } from "@/contexts/GameContext";
import confetti from "canvas-confetti";
import { Dog, Cat, Heart, Camera, MapPin } from "lucide-react";
import { fadeIn, slideUp } from "@/lib/animations";

const PERSONALITY_TAGS = [
  { value: "playful", label: "שובב", emoji: "🎾" },
  { value: "calm", label: "רגוע", emoji: "😌" },
  { value: "friendly", label: "חברותי", emoji: "🤗" },
  { value: "shy", label: "ביישן", emoji: "🙈" },
  { value: "energetic", label: "אנרגטי", emoji: "⚡" },
  { value: "sleepy", label: "אוהב לישון", emoji: "😴" }
];

const ACTIVITIES = [
  { value: "walks", label: "טיולים", emoji: "🚶" },
  { value: "beach", label: "חוף ים", emoji: "🏖️" },
  { value: "parks", label: "גינות עירוניות", emoji: "🌳" },
  { value: "fetch", label: "משחקי כדור", emoji: "🎾" },
  { value: "training", label: "אילוף", emoji: "🎓" }
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [petType, setPetType] = useState<"dog" | "cat" | null>(null);
  const [petName, setPetName] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [healthNotes, setHealthNotes] = useState("");
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { awardBadge, updateStreak } = useGame();

  const totalSteps = 9;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (tag: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const requestLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationPermission(true),
        () => setLocationPermission(false)
      );
    } else {
      setLocationPermission(false);
    }
  };

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let avatarUrl = "";
      
      // Upload avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      // Create pet
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - parseInt(petAge || "0"));

      const { error: petError } = await supabase
        .from('pets')
        .insert({
          user_id: user.id,
          name: petName,
          type: petType,
          breed: petBreed,
          birth_date: birthDate.toISOString().split('T')[0],
          avatar_url: avatarUrl,
          personality_tags: personalityTags,
          favorite_activities: activities,
          health_notes: healthNotes
        });

      if (petError) throw petError;

      // Award welcome badge
      const { data: welcomeBadge } = await supabase
        .from('badges')
        .select('id')
        .eq('condition_type', 'onboarding_complete')
        .single();

      if (welcomeBadge) {
        await awardBadge(welcomeBadge.id);
      }

      // Update streak
      await updateStreak();

      // Trigger confetti
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });

      toast({
        title: "🎉 מזל טוב!",
        description: `הפרופיל של ${petName} מוכן! קיבלת 50 נקודות ובאדג׳ ברוך הבא`,
      });

      // Save onboarding completion to localStorage
      localStorage.setItem('onboardingCompleted', 'true');

      setTimeout(() => navigate('/home'), 2000);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת הפרטים",
        variant: "destructive"
      });
    }
  };

  const nextStep = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const skipOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={fadeIn}
            className="bg-card rounded-3xl shadow-2xl p-8"
          >
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>שלב {step + 1} מתוך {totalSteps}</span>
                <button onClick={skipOnboarding} className="text-primary hover:underline">
                  דלג
                </button>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Step 0: Welcome */}
            {step === 0 && (
              <motion.div variants={slideUp} className="text-center space-y-6">
                <div className="text-6xl mb-4">🐾</div>
                <h1 className="text-3xl font-bold">ברוכים הבאים!</h1>
                <p className="text-muted-foreground text-lg">
                  הבית הדיגיטלי של החבר על ארבע שלכם
                </p>
                <Button onClick={nextStep} size="lg" className="w-full">
                  בואו נתחיל
                </Button>
              </motion.div>
            )}

            {/* Step 1: Pet Type */}
            {step === 1 && (
              <motion.div variants={slideUp} className="space-y-6">
                <h2 className="text-2xl font-bold text-center">איזו חיה יש לך?</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { setPetType("dog"); nextStep(); }}
                    className={`p-8 rounded-2xl border-2 transition-all hover:scale-105 ${
                      petType === "dog" ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <Dog className="w-16 h-16 mx-auto mb-2" />
                    <p className="font-semibold">כלב</p>
                  </button>
                  <button
                    onClick={() => { setPetType("cat"); nextStep(); }}
                    className={`p-8 rounded-2xl border-2 transition-all hover:scale-105 ${
                      petType === "cat" ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <Cat className="w-16 h-16 mx-auto mb-2" />
                    <p className="font-semibold">חתול</p>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Name & Photo */}
            {step === 2 && (
              <motion.div variants={slideUp} className="space-y-6">
                <h2 className="text-2xl font-bold text-center">בואו נכיר!</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="petName">שם החיה</Label>
                    <Input
                      id="petName"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="מה שמו?"
                      className="text-lg"
                    />
                  </div>
                  
                  <div className="text-center">
                    <Label className="block mb-2">תמונת פרופיל</Label>
                    <label className="cursor-pointer inline-block">
                      <div className="w-32 h-32 mx-auto rounded-full border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-12 h-12 text-muted-foreground" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={prevStep} variant="outline" className="flex-1">
                    חזור
                  </Button>
                  <Button onClick={nextStep} disabled={!petName} className="flex-1">
                    המשך
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Breed & Age */}
            {step === 3 && (
              <motion.div variants={slideUp} className="space-y-6">
                <h2 className="text-2xl font-bold text-center">עוד כמה פרטים</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="breed">גזע</Label>
                    <Input
                      id="breed"
                      value={petBreed}
                      onChange={(e) => setPetBreed(e.target.value)}
                      placeholder="מה הגזע?"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="age">גיל (שנים)</Label>
                      <Input
                        id="age"
                        type="number"
                        value={petAge}
                        onChange={(e) => setPetAge(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight">משקל (ק״ג)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={petWeight}
                        onChange={(e) => setPetWeight(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={prevStep} variant="outline" className="flex-1">
                    חזור
                  </Button>
                  <Button onClick={nextStep} className="flex-1">
                    המשך
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Personality Tags */}
            {step === 4 && (
              <motion.div variants={slideUp} className="space-y-6">
                <h2 className="text-2xl font-bold text-center">איזה אופי יש ל{petName}?</h2>
                <div className="grid grid-cols-2 gap-3">
                  {PERSONALITY_TAGS.map(tag => (
                    <button
                      key={tag.value}
                      onClick={() => toggleTag(tag.value, setPersonalityTags)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        personalityTags.includes(tag.value)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-3xl mb-1">{tag.emoji}</div>
                      <div className="text-sm font-medium">{tag.label}</div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button onClick={prevStep} variant="outline" className="flex-1">
                    חזור
                  </Button>
                  <Button onClick={nextStep} className="flex-1">
                    המשך
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Favorite Activities */}
            {step === 5 && (
              <motion.div variants={slideUp} className="space-y-6">
                <h2 className="text-2xl font-bold text-center">מה {petName} אוהב לעשות?</h2>
                <div className="space-y-3">
                  {ACTIVITIES.map(activity => (
                    <button
                      key={activity.value}
                      onClick={() => toggleTag(activity.value, setActivities)}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        activities.includes(activity.value)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-2xl">{activity.emoji}</div>
                      <div className="text-lg font-medium">{activity.label}</div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button onClick={prevStep} variant="outline" className="flex-1">
                    חזור
                  </Button>
                  <Button onClick={nextStep} className="flex-1">
                    המשך
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 6: Health Notes */}
            {step === 6 && (
              <motion.div variants={slideUp} className="space-y-6">
                <h2 className="text-2xl font-bold text-center">מידע בריאותי</h2>
                <p className="text-muted-foreground text-center text-sm">
                  (אופציונלי - אפשר לדלג)
                </p>
                <div>
                  <Label htmlFor="health">רגישויות או בעיות רפואיות</Label>
                  <textarea
                    id="health"
                    value={healthNotes}
                    onChange={(e) => setHealthNotes(e.target.value)}
                    placeholder="למשל: רגיש למזון מסוים, בעיות עור..."
                    className="w-full min-h-[120px] p-3 rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={prevStep} variant="outline" className="flex-1">
                    חזור
                  </Button>
                  <Button onClick={nextStep} className="flex-1">
                    המשך
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 7: Location Permission */}
            {step === 7 && (
              <motion.div variants={slideUp} className="space-y-6 text-center">
                <MapPin className="w-16 h-16 mx-auto text-primary" />
                <h2 className="text-2xl font-bold">הרשאת מיקום</h2>
                <p className="text-muted-foreground">
                  נשתמש במיקום שלך כדי להמליץ על גינות כלבים קרובות ומקומות מעניינים
                </p>
                {locationPermission === null ? (
                  <Button onClick={requestLocationPermission} size="lg" className="w-full">
                    אפשר גישה למיקום
                  </Button>
                ) : locationPermission ? (
                  <div className="text-green-600">✓ הרשאה ניתנה בהצלחה</div>
                ) : (
                  <div className="text-muted-foreground">ניתן להוסיף מאוחר יותר בהגדרות</div>
                )}
                <div className="flex gap-3">
                  <Button onClick={prevStep} variant="outline" className="flex-1">
                    חזור
                  </Button>
                  <Button onClick={nextStep} className="flex-1">
                    המשך
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 8: Celebration */}
            {step === 8 && (
              <motion.div variants={slideUp} className="space-y-6 text-center">
                <div className="text-6xl mb-4">🎉</div>
                {avatarPreview && (
                  <img 
                    src={avatarPreview} 
                    alt={petName}
                    className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-primary"
                  />
                )}
                <h1 className="text-3xl font-bold">הפרופיל של {petName} מוכן!</h1>
                <div className="bg-primary/10 rounded-2xl p-6 space-y-2">
                  <div className="text-4xl">🎁</div>
                  <p className="text-lg font-semibold">קיבלת 50 נקודות התחלתיות</p>
                  <p className="text-sm text-muted-foreground">ובאדג׳ "ברוך הבא" 🏆</p>
                </div>
                <Button onClick={handleComplete} size="lg" className="w-full">
                  בואו נתחיל! 🐾
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
