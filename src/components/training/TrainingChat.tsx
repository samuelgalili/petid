import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Dog, Star, Trophy, Flame, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  TrainingChatMessage, 
  LessonCard, 
  ModuleCard, 
  ProductRecommendation,
  UploadPrompt,
  FeedbackCard
} from "./TrainingChatMessage";
import { DailyTrainingMode } from "./DailyTrainingMode";

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  avatar_url: string | null;
}

interface Module {
  id: string;
  module_number: number;
  title_he: string;
  icon: string;
  total_lessons: number;
  xp_reward: number;
}

interface Lesson {
  id: string;
  module_id: string;
  lesson_number: number;
  title_he: string;
  description_he: string | null;
  instructions_he: string | null;
  demo_video_url: string | null;
  demo_image_url: string | null;
  duration_minutes: number;
  xp_reward: number;
  recommended_product_name: string | null;
  recommended_product_reason: string | null;
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'system';
  content?: string;
  component?: 'modules' | 'lessons' | 'lesson-detail' | 'upload' | 'feedback' | 'product' | 'xp-earned';
  data?: any;
  timestamp: Date;
}

type ChatPhase = 'welcome' | 'select-pet' | 'mode-select' | 'daily' | 'modules' | 'lessons' | 'lesson-active' | 'upload' | 'reviewing' | 'feedback';

export const TrainingChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [phase, setPhase] = useState<ChatPhase>('welcome');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [showDailyMode, setShowDailyMode] = useState(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat
  useEffect(() => {
    // Add welcome message immediately
    addMessage({
      type: 'bot',
      content: `שלום! 🐕 אני המאלף הדיגיטלי שלך.
      
אני כאן כדי לעזור לך לאלף את הכלב שלך בצורה מקצועית ומהנה.

כל שיעור כולל הדגמה, הוראות ברורות, ובסוף - תעלה תמונה או סרטון קצר והבינה המלאכותית שלי תבדוק אם הכלב ביצע נכון.

מוכן להתחיל? 💪`
    });

    if (user) {
      fetchPets();
      fetchModules();
      fetchProgress();
      setPhase('select-pet');
    } else {
      // Show login prompt for non-authenticated users
      setTimeout(() => {
        addMessage({
          type: 'bot',
          content: '👋 כדי להתחיל באימון, עליך להתחבר לחשבון שלך ולהוסיף כלב לפרופיל.'
        });
      }, 1000);
    }
  }, [user]);

  const fetchPets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pets')
      .select('id, name, breed, avatar_url')
      .eq('user_id', user.id)
      .eq('archived', false);
    if (data) setPets(data);
  };

  const fetchModules = async () => {
    const { data } = await supabase
      .from('training_modules')
      .select('*')
      .order('module_number');
    if (data) setModules(data);
  };

  const fetchProgress = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_training_progress')
      .select('lesson_id, xp_earned')
      .eq('user_id', user.id)
      .eq('status', 'completed');
    
    if (data) {
      const completed = new Set(data.map(p => p.lesson_id));
      setCompletedLessons(completed);
      const xp = data.reduce((sum, p) => sum + (p.xp_earned || 0), 0);
      setTotalXP(xp);
    }
  };

  const fetchLessons = async (moduleId: string) => {
    const { data } = await supabase
      .from('training_lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('lesson_number');
    if (data) setLessons(data);
  };

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...msg,
      id: Date.now().toString(),
      timestamp: new Date()
    }]);
  };

  const handleSelectPet = (pet: Pet) => {
    setSelectedPet(pet);
    addMessage({
      type: 'user',
      content: `בחרתי את ${pet.name}`
    });
    
    setTimeout(() => {
      addMessage({
        type: 'bot',
        content: `מעולה! ${pet.name} ${pet.breed ? `(${pet.breed})` : ''} נראה מוכן לאימון! 🎯

איזה סוג אימון מתאים לך היום?`
      });
      setPhase('mode-select');
    }, 500);
  };

  const handleSelectDailyMode = () => {
    setShowDailyMode(true);
    setPhase('daily');
  };

  const handleSelectModulesMode = () => {
    addMessage({
      type: 'bot',
      content: 'בחר מודול אימון להתחלה:'
    });
    addMessage({
      type: 'system',
      component: 'modules'
    });
    setPhase('modules');
  };

  const handleDailyExerciseStart = (exercise: any) => {
    // Create a synthetic lesson for the daily exercise
    const syntheticLesson: Lesson = {
      id: exercise.id,
      module_id: 'daily',
      lesson_number: 1,
      title_he: exercise.title,
      description_he: exercise.description,
      instructions_he: exercise.description,
      demo_video_url: null,
      demo_image_url: null,
      duration_minutes: exercise.duration,
      xp_reward: exercise.xp,
      recommended_product_name: null,
      recommended_product_reason: null
    };
    
    setSelectedLesson(syntheticLesson);
    setShowDailyMode(false);
    
    addMessage({
      type: 'user',
      content: `בחרתי: ${exercise.title}`
    });
    
    setTimeout(() => {
      addMessage({
        type: 'bot',
        content: `📚 ${exercise.title}
⏱️ זמן משוער: ${exercise.duration} דקות
⭐ פרס: +${exercise.xp} XP

${exercise.description}`
      });
      
      setTimeout(() => {
        addMessage({
          type: 'system',
          component: 'upload'
        });
        setPhase('upload');
      }, 500);
    }, 300);
  };

  const handleBackFromDaily = () => {
    setShowDailyMode(false);
    setPhase('mode-select');
  };

  const handleSelectModule = async (module: Module) => {
    setSelectedModule(module);
    await fetchLessons(module.id);
    
    addMessage({
      type: 'user',
      content: `${module.icon} ${module.title_he}`
    });
    
    setTimeout(() => {
      addMessage({
        type: 'bot',
        content: `מודול "${module.title_he}" - בחר שיעור:`
      });
      addMessage({
        type: 'system',
        component: 'lessons'
      });
      setPhase('lessons');
    }, 300);
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    
    addMessage({
      type: 'user',
      content: `שיעור: ${lesson.title_he}`
    });
    
    setTimeout(() => {
      addMessage({
        type: 'bot',
        content: `📚 ${lesson.title_he}
⏱️ זמן משוער: ${lesson.duration_minutes} דקות
⭐ פרס: +${lesson.xp_reward} XP

${lesson.description_he || ''}`
      });
      
      setTimeout(() => {
        addMessage({
          type: 'bot',
          content: `📝 הוראות:

${lesson.instructions_he || 'בצע את התרגיל והעלה הוכחה.'}`
        });
        
        setTimeout(() => {
          addMessage({
            type: 'system',
            component: 'upload'
          });
          setPhase('upload');
        }, 500);
      }, 800);
    }, 300);
  };

  const handleUpload = async (type: 'photo' | 'video') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'photo' ? 'image/*' : 'video/*';
      fileInputRef.current.capture = type === 'photo' ? 'environment' : undefined;
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLesson || !selectedPet || !user) return;

    setIsUploading(true);
    setPhase('reviewing');
    
    addMessage({
      type: 'user',
      content: `📤 העלתי ${file.type.startsWith('image') ? 'תמונה' : 'סרטון'}`
    });
    
    addMessage({
      type: 'bot',
      content: '🔍 מנתח את ההגשה שלך...'
    });

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${selectedPet.id}/${selectedLesson.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('training-submissions')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
      }

      // Call AI analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        'analyze-training-submission',
        {
          body: {
            imageBase64: base64,
            lessonTitle: selectedLesson.title_he,
            expectedBehavior: selectedLesson.instructions_he,
            petName: selectedPet.name,
            petBreed: selectedPet.breed
          }
        }
      );

      if (analysisError) throw analysisError;

      const { approved, feedback, tips, confidence } = analysisData;

      // Save progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_training_progress')
        .upsert({
          user_id: user.id,
          pet_id: selectedPet.id,
          lesson_id: selectedLesson.id,
          status: approved ? 'completed' : 'in_progress',
          completed_at: approved ? new Date().toISOString() : null,
          xp_earned: approved ? selectedLesson.xp_reward : 0,
          attempts: 1
        }, {
          onConflict: 'user_id,pet_id,lesson_id'
        })
        .select()
        .single();

      // Add feedback message
      addMessage({
        type: 'system',
        component: 'feedback',
        data: {
          approved,
          feedback,
          tips,
          xpEarned: approved ? selectedLesson.xp_reward : 0
        }
      });

      if (approved) {
        setCompletedLessons(prev => new Set([...prev, selectedLesson.id]));
        setTotalXP(prev => prev + selectedLesson.xp_reward);
        
        // Show product recommendation if available
        if (selectedLesson.recommended_product_name) {
          setTimeout(() => {
            addMessage({
              type: 'system',
              component: 'product',
              data: {
                name: selectedLesson.recommended_product_name,
                reason: selectedLesson.recommended_product_reason
              }
            });
          }, 1500);
        }
      }

      setPhase('feedback');

    } catch (error) {
      console.error('Error processing submission:', error);
      addMessage({
        type: 'bot',
        content: '❌ אירעה שגיאה בניתוח. נסה שוב.'
      });
      setPhase('upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRetry = () => {
    addMessage({
      type: 'bot',
      content: '💪 בוא ננסה שוב! קח את הזמן ווודא שהכלב מבצע את התרגיל נכון.'
    });
    addMessage({
      type: 'system',
      component: 'upload'
    });
    setPhase('upload');
  };

  const handleContinue = () => {
    if (!selectedModule) return;
    
    // Find next lesson
    const currentIndex = lessons.findIndex(l => l.id === selectedLesson?.id);
    const nextLesson = lessons[currentIndex + 1];
    
    if (nextLesson) {
      addMessage({
        type: 'bot',
        content: '🎉 מעולה! נמשיך לשיעור הבא.'
      });
      handleSelectLesson(nextLesson);
    } else {
      // Module completed
      addMessage({
        type: 'bot',
        content: `🏆 כל הכבוד! סיימת את המודול "${selectedModule.title_he}"!

בחר מודול נוסף להמשך האימון.`
      });
      addMessage({
        type: 'system',
        component: 'modules'
      });
      setPhase('modules');
      setSelectedModule(null);
      setSelectedLesson(null);
    }
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setSelectedLesson(null);
    addMessage({
      type: 'system',
      component: 'modules'
    });
    setPhase('modules');
  };

  const renderComponent = (msg: ChatMessage) => {
    switch (msg.component) {
      case 'modules':
        return (
          <div className="space-y-2 max-w-sm">
            {modules.slice(0, 4).map(module => (
              <ModuleCard
                key={module.id}
                icon={module.icon}
                title={module.title_he}
                lessonsCount={module.total_lessons}
                completedCount={lessons.filter(l => 
                  l.module_id === module.id && completedLessons.has(l.id)
                ).length}
                xp={module.xp_reward}
                onClick={() => handleSelectModule(module)}
                isActive={selectedModule?.id === module.id}
              />
            ))}
          </div>
        );
      
      case 'lessons':
        return (
          <div className="space-y-2 max-w-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToModules}
              className="mb-2 text-gray-600"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              חזרה למודולים
            </Button>
            {lessons.map((lesson, index) => {
              const isLocked = index > 0 && !completedLessons.has(lessons[index - 1].id);
              const isCompleted = completedLessons.has(lesson.id);
              
              return (
                <LessonCard
                  key={lesson.id}
                  title={lesson.title_he}
                  description={lesson.description_he || ''}
                  duration={lesson.duration_minutes}
                  xp={lesson.xp_reward}
                  onStart={() => handleSelectLesson(lesson)}
                  isLocked={isLocked}
                  isCompleted={isCompleted}
                />
              );
            })}
          </div>
        );
      
      case 'upload':
        return (
          <UploadPrompt
            onUploadPhoto={() => handleUpload('photo')}
            onUploadVideo={() => handleUpload('video')}
            isUploading={isUploading}
          />
        );
      
      case 'feedback':
        return (
          <FeedbackCard
            approved={msg.data.approved}
            feedback={msg.data.feedback}
            tips={msg.data.tips}
            xpEarned={msg.data.xpEarned}
            onRetry={handleRetry}
            onContinue={handleContinue}
          />
        );
      
      case 'product':
        return (
          <ProductRecommendation
            name={msg.data.name}
            reason={msg.data.reason}
            onViewProduct={() => toast({ title: 'פתיחת חנות...' })}
          />
        );
      
      default:
        return null;
    }
  };

  // Show Daily Training Mode
  if (showDailyMode && selectedPet) {
    return (
      <DailyTrainingMode
        pet={selectedPet}
        streak={streak}
        totalXP={totalXP}
        completedLessons={completedLessons}
        onStartExercise={handleDailyExerciseStart}
        onBack={handleBackFromDaily}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header - Matching AI Chat Style */}
      <div className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3">
          {selectedPet ? (
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-petid-gold via-warning to-petid-coral p-[2.5px]">
                <div className="w-full h-full rounded-full overflow-hidden bg-card">
                  {selectedPet.avatar_url ? (
                    <img src={selectedPet.avatar_url} alt={selectedPet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Dog className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-card shadow-lg" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-petid-gold via-warning to-petid-coral p-[2.5px]">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                <Dog className="w-5 h-5 text-petid-gold" />
              </div>
            </div>
          )}
          <div className="text-right">
            <h3 className="text-base font-bold text-foreground font-heebo">
              {selectedPet ? `אימון ${selectedPet.name}` : 'מאלף דיגיטלי'}
            </h3>
            <p className="text-xs text-success font-heebo flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              {selectedModule ? selectedModule.title_he : phase === 'daily' ? 'אימון יומי' : 'מוכן לאימון'}
            </p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-petid-gold/10 px-3 py-1.5 rounded-full">
            <Star className="w-4 h-4 text-petid-gold" />
            <span className="text-xs font-bold text-petid-gold">{totalXP}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-petid-coral/10 px-3 py-1.5 rounded-full">
            <Flame className="w-4 h-4 text-petid-coral" />
            <span className="text-xs font-bold text-petid-coral">{streak}</span>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* Pet Selection - Matching AI Chat Style */}
        {phase === 'select-pet' && pets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            {pets.map((pet, index) => (
              <motion.button
                key={pet.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectPet(pet)}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-petid-gold via-warning to-petid-coral p-[2.5px] shadow-lg">
                  <div className="w-full h-full rounded-full overflow-hidden bg-card">
                    {pet.avatar_url ? (
                      <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Dog className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs font-heebo font-medium text-foreground">{pet.name}</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Mode Selection - Updated Colors */}
        {phase === 'mode-select' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSelectDailyMode}
              className="w-full bg-gradient-to-r from-petid-gold/10 to-warning/10 border border-petid-gold/30 rounded-2xl p-4 text-right hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-petid-gold to-warning flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground font-heebo">אימון יומי</h4>
                  <p className="text-xs text-muted-foreground font-heebo">תרגילים מותאמים אישית לכלב שלך</p>
                </div>
                <div className="bg-petid-gold text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">
                  מומלץ
                </div>
              </div>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSelectModulesMode}
              className="w-full bg-card border border-border/50 rounded-2xl p-4 text-right hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-petid-blue/10 to-petid-teal/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-petid-blue" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground font-heebo">קורס מלא</h4>
                  <p className="text-xs text-muted-foreground font-heebo">מודולים מובנים עם שיעורים והתקדמות</p>
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence>
          {messages.map((msg, index) => (
            <div key={msg.id}>
              {msg.component ? (
                renderComponent(msg)
              ) : (
                <TrainingChatMessage
                  type={msg.type}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  showAvatar={index === 0 || messages[index - 1]?.type !== msg.type}
                />
              )}
            </div>
          ))}
        </AnimatePresence>

        {/* Loading indicator - Matching AI Chat Style */}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-petid-gold to-warning p-[2px] shadow-md">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                <Dog className="w-3.5 h-3.5 text-petid-gold" />
              </div>
            </div>
            <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="w-2 h-2 bg-petid-gold rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-petid-gold rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-petid-gold rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                />
                <span className="text-xs text-muted-foreground font-heebo mr-2">מנתח...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  );
};
