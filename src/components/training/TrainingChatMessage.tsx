import { motion } from "framer-motion";
import { Bot, User, Check, X, Camera, Play, Clock, Star, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrainingChatMessageProps {
  type: 'bot' | 'user' | 'system';
  content?: string;
  timestamp?: Date;
  children?: React.ReactNode;
  showAvatar?: boolean;
}

export const TrainingChatMessage = ({ 
  type, 
  content, 
  timestamp,
  children,
  showAvatar = true 
}: TrainingChatMessageProps) => {
  const isBot = type === 'bot' || type === 'system';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}
    >
      {showAvatar && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isBot ? 'bg-gray-100' : 'bg-gray-900'
        }`}>
          {isBot ? (
            <Bot className="w-4 h-4 text-gray-600" />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
      )}
      
      <div className={`max-w-[80%] ${!showAvatar && isBot ? 'mr-10' : ''} ${!showAvatar && !isBot ? 'ml-10' : ''}`}>
        <div className={`rounded-2xl px-4 py-2.5 ${
          isBot 
            ? 'bg-gray-100 text-gray-900 rounded-tl-sm' 
            : 'bg-gray-900 text-white rounded-tr-sm'
        }`}>
          {content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>}
          {children}
        </div>
        {timestamp && (
          <p className={`text-[10px] text-gray-400 mt-1 ${isBot ? 'text-right' : 'text-left'}`}>
            {timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </motion.div>
  );
};

interface LessonCardProps {
  title: string;
  description: string;
  duration: number;
  xp: number;
  onStart: () => void;
  isLocked?: boolean;
  isCompleted?: boolean;
}

export const LessonCard = ({ 
  title, 
  description, 
  duration, 
  xp, 
  onStart,
  isLocked,
  isCompleted 
}: LessonCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white border rounded-xl p-4 ${
        isLocked ? 'opacity-50 border-gray-200' : 'border-gray-200 hover:border-gray-300'
      } ${isCompleted ? 'border-green-200 bg-green-50/30' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
        {isCompleted && <Check className="w-5 h-5 text-green-500" />}
        {isLocked && <span className="text-xs text-gray-400">🔒</span>}
      </div>
      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {duration} דק׳
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500" />
            +{xp} XP
          </span>
        </div>
        <Button
          size="sm"
          onClick={onStart}
          disabled={isLocked}
          className={`h-7 text-xs rounded-full ${
            isCompleted 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-gray-900 hover:bg-gray-800'
          }`}
        >
          {isCompleted ? 'תרגול נוסף' : isLocked ? 'נעול' : 'התחל'}
        </Button>
      </div>
    </motion.div>
  );
};

interface ModuleCardProps {
  icon: string;
  title: string;
  lessonsCount: number;
  completedCount: number;
  xp: number;
  onClick: () => void;
  isActive?: boolean;
}

export const ModuleCard = ({ 
  icon, 
  title, 
  lessonsCount, 
  completedCount, 
  xp,
  onClick,
  isActive 
}: ModuleCardProps) => {
  const progress = lessonsCount > 0 ? (completedCount / lessonsCount) * 100 : 0;
  
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-right bg-white border rounded-xl p-4 transition-all ${
        isActive ? 'border-gray-900 shadow-sm' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
          <p className="text-xs text-gray-500">{completedCount}/{lessonsCount} שיעורים</p>
        </div>
        <ArrowLeft className="w-4 h-4 text-gray-400" />
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div 
          className="bg-gray-900 h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.button>
  );
};

interface ProductRecommendationProps {
  name: string;
  reason: string;
  onViewProduct: () => void;
}

export const ProductRecommendation = ({ name, reason, onViewProduct }: ProductRecommendationProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-50 border border-amber-100 rounded-xl p-3"
    >
      <div className="flex items-start gap-2">
        <ShoppingBag className="w-4 h-4 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs text-amber-800 mb-1">💡 מוצר מומלץ להשלמת התרגיל:</p>
          <p className="font-medium text-sm text-gray-900">{name}</p>
          <p className="text-xs text-gray-600 mt-1">{reason}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={onViewProduct}
            className="mt-2 h-7 text-xs rounded-full border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            צפה בחנות
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

interface UploadPromptProps {
  onUploadPhoto: () => void;
  onUploadVideo: () => void;
  isUploading?: boolean;
}

export const UploadPrompt = ({ onUploadPhoto, onUploadVideo, isUploading }: UploadPromptProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-50 border border-gray-200 rounded-xl p-4"
    >
      <p className="text-sm text-gray-700 mb-3 text-center">📸 העלה הוכחה לביצוע התרגיל</p>
      <div className="flex gap-2">
        <Button
          onClick={onUploadPhoto}
          disabled={isUploading}
          className="flex-1 h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-full text-sm"
        >
          <Camera className="w-4 h-4 ml-2" />
          צלם תמונה
        </Button>
        <Button
          onClick={onUploadVideo}
          disabled={isUploading}
          variant="outline"
          className="flex-1 h-10 border-gray-300 rounded-full text-sm"
        >
          <Play className="w-4 h-4 ml-2" />
          סרטון קצר
        </Button>
      </div>
    </motion.div>
  );
};

interface FeedbackCardProps {
  approved: boolean;
  feedback: string;
  tips?: string[];
  xpEarned?: number;
  onRetry?: () => void;
  onContinue?: () => void;
}

export const FeedbackCard = ({ 
  approved, 
  feedback, 
  tips, 
  xpEarned,
  onRetry,
  onContinue 
}: FeedbackCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`border rounded-xl p-4 ${
        approved 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {approved ? (
          <>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-bold text-green-800">אושר! 🎉</span>
            {xpEarned && (
              <span className="text-sm text-green-600 mr-auto">+{xpEarned} XP</span>
            )}
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <span className="font-bold text-red-800">נסה שוב</span>
          </>
        )}
      </div>
      
      <p className={`text-sm mb-3 ${approved ? 'text-green-800' : 'text-red-800'}`}>
        {feedback}
      </p>
      
      {!approved && tips && tips.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-700 mb-1">טיפים לשיפור:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-1">
                <span>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex gap-2">
        {approved ? (
          <Button
            onClick={onContinue}
            className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm"
          >
            המשך לשיעור הבא
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        ) : (
          <Button
            onClick={onRetry}
            className="flex-1 h-9 bg-gray-900 hover:bg-gray-800 text-white rounded-full text-sm"
          >
            נסה שוב
            <Camera className="w-4 h-4 mr-2" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};
