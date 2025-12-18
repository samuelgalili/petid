import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Dog, Star, Trophy, Flame } from "lucide-react";
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

type ChatPhase = 'welcome' | 'select-pet' | 'modules' | 'lessons' | 'lesson-active' | 'upload' | 'reviewing' | 'feedback';

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

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat
  useEffect(() => {
    if (user) {
      fetchPets();
      fetchModules();
      fetchProgress();
    }
    
    // Add welcome message
    setTimeout(() => {
      addMessage({
        type: 'bot',
        content: `שלום! 🐕 אני המאלף הדיגיטלי שלך.
        
אני כאן כדי לעזור לך לאלף את הכלב שלך בצורה מקצועית ומהנה.

כל שיעור כולל הדגמה, הוראות ברורות, ובסוף - תעלה תמונה או סרטון קצר והבינה המלאכותית שלי תבדוק אם הכלב ביצע נכון.

מוכן להתחיל? 💪`
      });
      setPhase('select-pet');
    }, 500);
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

בחר מודול אימון להתחלה:`
      });
      addMessage({
        type: 'system',
        component: 'modules'
      });
      setPhase('modules');
    }, 500);
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {selectedPet ? (
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
              {selectedPet.avatar_url ? (
                <img src={selectedPet.avatar_url} alt={selectedPet.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Dog className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
              <Dog className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {selectedPet ? `אימון ${selectedPet.name}` : 'מאלף דיגיטלי'}
            </h3>
            <p className="text-xs text-gray-500">
              {selectedModule ? selectedModule.title_he : 'מוכן לאימון'}
            </p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-3">
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

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Pet Selection */}
        {phase === 'select-pet' && pets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 rounded-xl p-4"
          >
            <p className="text-sm text-gray-700 mb-3">בחר את הכלב לאימון:</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {pets.map(pet => (
                <button
                  key={pet.id}
                  onClick={() => handleSelectPet(pet)}
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 overflow-hidden hover:border-gray-900 transition-colors">
                    {pet.avatar_url ? (
                      <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dog className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{pet.name}</span>
                </button>
              ))}
            </div>
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

        {/* Loading indicator */}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-gray-500"
          >
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs">מנתח...</span>
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
