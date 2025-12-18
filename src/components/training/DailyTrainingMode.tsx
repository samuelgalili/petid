import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Flame, Star, Clock, Sparkles, ChevronLeft, Trophy, Target, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  avatar_url: string | null;
}

interface DailyExercise {
  id: string;
  title: string;
  description: string;
  duration: number;
  xp: number;
  category: 'obedience' | 'agility' | 'socialization' | 'mental';
  breedSuitable: boolean;
  lessonId?: string;
  demoVideoUrl?: string;
  demoThumbnail?: string;
  steps?: string[];
}

interface DailyTrainingModeProps {
  pet: Pet;
  streak: number;
  totalXP: number;
  completedLessons: Set<string>;
  onStartExercise: (exercise: DailyExercise) => void;
  onBack: () => void;
}

const BREED_EXERCISE_MAP: Record<string, string[]> = {
  // High energy breeds
  'border collie': ['agility', 'mental'],
  'australian shepherd': ['agility', 'mental'],
  'labrador': ['agility', 'socialization'],
  'golden retriever': ['socialization', 'obedience'],
  'german shepherd': ['obedience', 'agility'],
  'husky': ['agility', 'mental'],
  'beagle': ['mental', 'socialization'],
  // Medium energy breeds
  'poodle': ['mental', 'obedience'],
  'bulldog': ['obedience', 'socialization'],
  'boxer': ['agility', 'obedience'],
  // Small breeds
  'chihuahua': ['obedience', 'socialization'],
  'pomeranian': ['mental', 'obedience'],
  'shih tzu': ['socialization', 'obedience'],
  'default': ['obedience', 'socialization']
};

const DAILY_EXERCISES: DailyExercise[] = [
  {
    id: 'sit-stay',
    title: 'שב והישאר',
    description: 'תרגיל בסיסי של פקודת שב עם שהייה של 10 שניות',
    duration: 5,
    xp: 15,
    category: 'obedience',
    breedSuitable: true,
    demoVideoUrl: 'https://www.youtube.com/embed/BRIoJXutfLA',
    steps: ['החזק חטיף מעל ראש הכלב', 'אמור "שב" בקול ברור', 'כשהכלב יושב, תגמל מיד', 'הגדל בהדרגה את זמן ההמתנה']
  },
  {
    id: 'come-recall',
    title: 'בוא אליי',
    description: 'קריאה לכלב ממרחק של 5 מטרים',
    duration: 5,
    xp: 15,
    category: 'obedience',
    breedSuitable: true,
    demoVideoUrl: 'https://www.youtube.com/embed/rLVfNfOqnQU',
    steps: ['התחל ממרחק קצר', 'קרא בשם הכלב + "בוא"', 'תגמל מיד כשמגיע', 'הגדל מרחק בהדרגה']
  },
  {
    id: 'down-stay',
    title: 'שכב והישאר',
    description: 'פקודת שכב עם שהייה של 15 שניות',
    duration: 5,
    xp: 20,
    category: 'obedience',
    breedSuitable: true,
    demoVideoUrl: 'https://www.youtube.com/embed/4dbzPoB7AKk',
    steps: ['התחל כשהכלב יושב', 'הנמך חטיף לרצפה', 'אמור "שכב"', 'תגמל כשהכלב שוכב']
  },
  {
    id: 'heel-walk',
    title: 'הליכה ברגל',
    description: 'הליכה צמודה ללא משיכת רצועה למשך 2 דקות',
    duration: 10,
    xp: 25,
    category: 'obedience',
    breedSuitable: true,
    demoVideoUrl: 'https://www.youtube.com/embed/sFgtqgiAKoQ',
    steps: ['התחל עם רצועה קצרה', 'החזק חטיפים בצד הכלב', 'תגמל על הליכה צמודה', 'עצור כשמושך']
  },
  {
    id: 'jump-hurdle',
    title: 'קפיצת משוכה',
    description: 'קפיצה מעל מכשול בגובה מותאם',
    duration: 8,
    xp: 30,
    category: 'agility',
    breedSuitable: false,
    demoVideoUrl: 'https://www.youtube.com/embed/hN-j3hLQMIE',
    steps: ['התחל עם משוכה נמוכה', 'הובל עם חטיף מעבר למשוכה', 'אמור "קפוץ"', 'תגמל מיד אחרי הקפיצה']
  },
  {
    id: 'weave-poles',
    title: 'סלאלום',
    description: 'מעבר בין עמודים בזיגזג',
    duration: 10,
    xp: 35,
    category: 'agility',
    breedSuitable: false,
    demoVideoUrl: 'https://www.youtube.com/embed/hDbpPf-f5os',
    steps: ['סדר עמודים במרחקים גדולים', 'הובל עם חטיף בין העמודים', 'צמצם מרחקים בהדרגה', 'תרגל מהירות']
  },
  {
    id: 'tunnel-run',
    title: 'מנהרה',
    description: 'ריצה דרך מנהרה או קשת',
    duration: 5,
    xp: 25,
    category: 'agility',
    breedSuitable: false,
    demoVideoUrl: 'https://www.youtube.com/embed/ys0fy_uRfwY',
    steps: ['התחל עם מנהרה קצרה', 'שלח חטיף לצד השני', 'עודד מהכניסה', 'תגמל ביציאה']
  },
  {
    id: 'nose-work',
    title: 'עבודת אף',
    description: 'מציאת חטיף מוסתר בחדר',
    duration: 10,
    xp: 30,
    category: 'mental',
    breedSuitable: true,
    demoVideoUrl: 'https://www.youtube.com/embed/1g_9kqjYqvw',
    steps: ['הראה לכלב את החטיף', 'החבא במקום קל', 'אמור "חפש"', 'הקשה בהדרגה']
  },
  {
    id: 'puzzle-toy',
    title: 'צעצוע חשיבה',
    description: 'פתרון צעצוע אינטראקטיבי',
    duration: 15,
    xp: 35,
    category: 'mental',
    breedSuitable: true,
    demoVideoUrl: 'https://www.youtube.com/embed/aRW10d_ryf8',
    steps: ['בחר צעצוע מתאים לרמה', 'הראה איך זה עובד', 'תן לכלב לנסות', 'עזור רק אם נתקע']
  },
  {
    id: 'name-game',
    title: 'משחק שמות',
    description: 'זיהוי צעצועים לפי שם',
    duration: 10,
    xp: 40,
    category: 'mental',
    breedSuitable: false,
    demoVideoUrl: 'https://www.youtube.com/embed/BRIoJXutfLA',
    steps: ['בחר צעצוע אחד', 'קרא לו בשם כשמשחקים', 'בקש "תביא [שם]"', 'תגמל על הבאה נכונה']
  },
  {
    id: 'dog-greeting',
    title: 'מפגש עם כלב',
    description: 'הכרות רגועה עם כלב אחר',
    duration: 15,
    xp: 30,
    category: 'socialization',
    breedSuitable: true,
    demoVideoUrl: 'https://www.youtube.com/embed/WL0s6_mTzYI',
    steps: ['בחר כלב רגוע', 'התקרב בהדרגה', 'תן להריח', 'תגמל על התנהגות רגועה']
  },
  {
    id: 'new-environment',
    title: 'סביבה חדשה',
    description: 'חשיפה למקום חדש (חנות, פארק)',
    duration: 20,
    xp: 35,
    category: 'socialization',
    breedSuitable: true,
    demoVideoUrl: 'https://www.youtube.com/embed/LT7fkC5ZsC4',
    steps: ['בחר מקום לא צפוף', 'תן לכלב להסתגל', 'תגמל על רוגע', 'צא אם מתוח מדי']
  }
];

const CATEGORY_INFO = {
  obedience: { icon: '🎓', label: 'משמעת', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  agility: { icon: '🏃', label: 'זריזות', color: 'bg-green-50 text-green-700 border-green-200' },
  mental: { icon: '🧠', label: 'חשיבה', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  socialization: { icon: '🤝', label: 'חברות', color: 'bg-orange-50 text-orange-700 border-orange-200' }
};

export const DailyTrainingMode = ({
  pet,
  streak,
  totalXP,
  completedLessons,
  onStartExercise,
  onBack
}: DailyTrainingModeProps) => {
  const [dailyExercises, setDailyExercises] = useState<DailyExercise[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [dailyGoal] = useState(3);
  const [loading, setLoading] = useState(true);
  const [selectedExerciseForDemo, setSelectedExerciseForDemo] = useState<DailyExercise | null>(null);

  useEffect(() => {
    generateDailyPlan();
    fetchTodayProgress();
  }, [pet]);

  const fetchTodayProgress = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_training_sessions')
      .select('*')
      .eq('pet_id', pet.id)
      .eq('session_date', today)
      .maybeSingle();

    if (data) {
      // Mark exercises as completed based on lessons_completed count
      // This is simplified - in production you'd track specific exercise IDs
    }
  };

  const generateDailyPlan = () => {
    setLoading(true);
    
    // Get breed-appropriate categories
    const breedLower = pet.breed?.toLowerCase() || 'default';
    let preferredCategories = BREED_EXERCISE_MAP['default'];
    
    for (const [breed, categories] of Object.entries(BREED_EXERCISE_MAP)) {
      if (breedLower.includes(breed)) {
        preferredCategories = categories;
        break;
      }
    }

    // Select exercises based on breed and variety
    const selected: DailyExercise[] = [];
    const categories = ['obedience', 'agility', 'mental', 'socialization'];
    
    // Always include one obedience exercise
    const obedienceExercises = DAILY_EXERCISES.filter(e => e.category === 'obedience');
    selected.push(obedienceExercises[Math.floor(Math.random() * obedienceExercises.length)]);
    
    // Add breed-preferred exercises
    preferredCategories.forEach(cat => {
      const catExercises = DAILY_EXERCISES.filter(
        e => e.category === cat && !selected.find(s => s.id === e.id)
      );
      if (catExercises.length > 0) {
        const exercise = catExercises[Math.floor(Math.random() * catExercises.length)];
        // Mark as breed suitable if it's in preferred categories
        selected.push({ ...exercise, breedSuitable: true });
      }
    });

    // Fill remaining slots with random exercises
    while (selected.length < 5) {
      const remaining = DAILY_EXERCISES.filter(e => !selected.find(s => s.id === e.id));
      if (remaining.length === 0) break;
      selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
    }

    // Shuffle and limit to 5
    setDailyExercises(selected.sort(() => Math.random() - 0.5).slice(0, 5));
    setLoading(false);
  };

  const progress = (completedToday.size / dailyGoal) * 100;
  const totalDailyXP = dailyExercises.reduce((sum, e) => sum + e.xp, 0);
  const earnedXP = dailyExercises
    .filter(e => completedToday.has(e.id))
    .reduce((sum, e) => sum + e.xp, 0);

  const handleStartExercise = (exercise: DailyExercise) => {
    onStartExercise(exercise);
  };

  const markAsCompleted = (exerciseId: string) => {
    setCompletedToday(prev => new Set([...prev, exerciseId]));
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-amber-50/50 to-white">
      {/* Video Demo Modal */}
      <AnimatePresence>
        {selectedExerciseForDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedExerciseForDemo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Play className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{selectedExerciseForDemo.title}</h3>
                    <p className="text-xs text-gray-500">סרטון הדגמה</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedExerciseForDemo(null)}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Video Player */}
              <div className="aspect-video bg-black">
                <iframe
                  src={`${selectedExerciseForDemo.demoVideoUrl}?autoplay=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Steps */}
              {selectedExerciseForDemo.steps && selectedExerciseForDemo.steps.length > 0 && (
                <div className="p-4 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">שלבי ביצוע:</h4>
                  <ol className="space-y-2">
                    {selectedExerciseForDemo.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Actions */}
              <div className="p-4 border-t border-gray-100">
                <Button
                  onClick={() => {
                    setSelectedExerciseForDemo(null);
                    handleStartExercise(selectedExerciseForDemo);
                    markAsCompleted(selectedExerciseForDemo.id);
                  }}
                  className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-full"
                >
                  התחל תרגיל
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-gray-600 -mr-2"
          >
            <ChevronLeft className="w-5 h-5" />
            חזרה
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-700">{totalXP}</span>
            </div>
            <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-medium text-orange-700">{streak}</span>
            </div>
          </div>
        </div>

        {/* Daily Progress */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">אימון יומי</h3>
                <p className="text-xs text-gray-600">
                  {new Date().toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-amber-700">{completedToday.size}/{dailyGoal}</p>
              <p className="text-xs text-gray-600">תרגילים</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">התקדמות יומית</span>
              <span className="text-xs font-medium text-amber-700">{earnedXP}/{totalDailyXP} XP</span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pet Info */}
      <div className="px-4 py-3">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden">
            {pet.avatar_url ? (
              <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🐕</div>
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{pet.name}</h4>
            <p className="text-xs text-gray-500">{pet.breed || 'כלב'}</p>
          </div>
          <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-full">
            <Sparkles className="w-3 h-3 text-purple-500" />
            <span className="text-xs font-medium text-purple-700">מותאם אישית</span>
          </div>
        </motion.div>
      </div>

      {/* Exercises List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-gray-500" />
          <h4 className="font-semibold text-gray-900 text-sm">תרגילים מומלצים להיום</h4>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {dailyExercises.map((exercise, index) => {
              const isCompleted = completedToday.has(exercise.id);
              const categoryInfo = CATEGORY_INFO[exercise.category];

              return (
                <motion.div
                  key={exercise.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white border rounded-xl p-4 transition-all ${
                    isCompleted
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                      isCompleted ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {isCompleted ? '✅' : categoryInfo.icon}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-gray-900 text-sm">{exercise.title}</h5>
                        {exercise.breedSuitable && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                            מתאים לגזע
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{exercise.description}</p>
                      
                      <div className="flex items-center gap-3 mb-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {exercise.duration} דק׳
                        </span>
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Star className="w-3 h-3" />
                          +{exercise.xp} XP
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {exercise.demoVideoUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedExerciseForDemo(exercise)}
                            className="h-7 text-xs rounded-full px-3 border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            <Play className="w-3 h-3 ml-1" />
                            צפה בהדגמה
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            handleStartExercise(exercise);
                            markAsCompleted(exercise.id);
                          }}
                          disabled={isCompleted}
                          className={`h-7 text-xs rounded-full px-4 ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-900 hover:bg-gray-800 text-white'
                          }`}
                        >
                          {isCompleted ? 'הושלם' : 'התחל תרגיל'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Daily Goal Achievement */}
        {completedToday.size >= dailyGoal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 text-center"
          >
            <Trophy className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <h4 className="font-bold text-green-800 mb-1">כל הכבוד! 🎉</h4>
            <p className="text-sm text-green-700">השלמת את יעד האימון היומי</p>
            <p className="text-xs text-green-600 mt-1">+{earnedXP} XP נצברו היום</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
