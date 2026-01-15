import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  BarChart3, 
  HelpCircle, 
  Timer, 
  Smile, 
  Hash,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface InteractiveSticker {
  type: 'poll' | 'question' | 'countdown' | 'emoji_slider' | 'quiz';
  data: any;
  positionX: number;
  positionY: number;
}

interface InteractiveStickerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSticker: (sticker: InteractiveSticker) => void;
}

export const InteractiveStickerPicker = ({
  open,
  onOpenChange,
  onAddSticker
}: InteractiveStickerPickerProps) => {
  // Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Question state
  const [questionText, setQuestionText] = useState('');

  // Countdown state
  const [countdownTitle, setCountdownTitle] = useState('');
  const [countdownDate, setCountdownDate] = useState('');

  // Emoji slider state
  const [sliderQuestion, setSliderQuestion] = useState('');
  const [sliderEmoji, setSliderEmoji] = useState('❤️');

  // Quiz state
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);

  const resetAll = () => {
    setPollQuestion('');
    setPollOptions(['', '']);
    setQuestionText('');
    setCountdownTitle('');
    setCountdownDate('');
    setSliderQuestion('');
    setSliderEmoji('❤️');
    setQuizQuestion('');
    setQuizOptions(['', '', '', '']);
    setCorrectAnswer(0);
  };

  const handleAddPoll = () => {
    if (pollQuestion && pollOptions.filter(o => o.trim()).length >= 2) {
      onAddSticker({
        type: 'poll',
        data: {
          question: pollQuestion,
          options: pollOptions.filter(o => o.trim())
        },
        positionX: 50,
        positionY: 50
      });
      resetAll();
      onOpenChange(false);
    }
  };

  const handleAddQuestion = () => {
    if (questionText.trim()) {
      onAddSticker({
        type: 'question',
        data: { question: questionText },
        positionX: 50,
        positionY: 50
      });
      resetAll();
      onOpenChange(false);
    }
  };

  const handleAddCountdown = () => {
    if (countdownTitle && countdownDate) {
      onAddSticker({
        type: 'countdown',
        data: {
          title: countdownTitle,
          endDate: countdownDate
        },
        positionX: 50,
        positionY: 50
      });
      resetAll();
      onOpenChange(false);
    }
  };

  const handleAddEmojiSlider = () => {
    if (sliderQuestion.trim()) {
      onAddSticker({
        type: 'emoji_slider',
        data: {
          question: sliderQuestion,
          emoji: sliderEmoji
        },
        positionX: 50,
        positionY: 50
      });
      resetAll();
      onOpenChange(false);
    }
  };

  const handleAddQuiz = () => {
    if (quizQuestion && quizOptions.filter(o => o.trim()).length >= 2) {
      onAddSticker({
        type: 'quiz',
        data: {
          question: quizQuestion,
          options: quizOptions.filter(o => o.trim()),
          correctAnswer
        },
        positionX: 50,
        positionY: 50
      });
      resetAll();
      onOpenChange(false);
    }
  };

  const emojis = ['❤️', '😍', '🔥', '👏', '😂', '😢', '😡', '🎉', '💯', '⭐'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>הוספת סטיקר אינטראקטיבי</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="poll" className="w-full">
          <TabsList className="grid grid-cols-5 w-full h-auto p-1">
            <TabsTrigger value="poll" className="flex flex-col gap-1 py-2 text-xs">
              <BarChart3 className="w-4 h-4" />
              סקר
            </TabsTrigger>
            <TabsTrigger value="question" className="flex flex-col gap-1 py-2 text-xs">
              <HelpCircle className="w-4 h-4" />
              שאלה
            </TabsTrigger>
            <TabsTrigger value="countdown" className="flex flex-col gap-1 py-2 text-xs">
              <Timer className="w-4 h-4" />
              ספירה
            </TabsTrigger>
            <TabsTrigger value="slider" className="flex flex-col gap-1 py-2 text-xs">
              <Smile className="w-4 h-4" />
              סליידר
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex flex-col gap-1 py-2 text-xs">
              <Hash className="w-4 h-4" />
              חידון
            </TabsTrigger>
          </TabsList>

          {/* Poll Tab */}
          <TabsContent value="poll" className="space-y-4 mt-4">
            <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 p-4 rounded-xl">
              <Label className="text-sm font-medium">שאלת הסקר</Label>
              <Input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="שאל שאלה..."
                className="mt-2 bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">אפשרויות ({pollOptions.length}/4)</Label>
              <AnimatePresence>
                {pollOptions.map((option, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollOptions];
                        newOptions[index] = e.target.value;
                        setPollOptions(newOptions);
                      }}
                      placeholder={`אפשרות ${index + 1}`}
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPollOptions(pollOptions.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {pollOptions.length < 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  הוסף אפשרות
                </Button>
              )}
            </div>

            <Button 
              className="w-full" 
              onClick={handleAddPoll}
              disabled={!pollQuestion || pollOptions.filter(o => o.trim()).length < 2}
            >
              הוסף סקר
            </Button>
          </TabsContent>

          {/* Question Tab */}
          <TabsContent value="question" className="space-y-4 mt-4">
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 rounded-xl">
              <Label className="text-sm font-medium">השאלה שלך</Label>
              <Input
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="שאל אותי משהו..."
                className="mt-2 bg-background"
              />
              <p className="text-xs text-muted-foreground mt-2">
                העוקבים שלך יוכלו לשלוח תשובות אנונימיות
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={handleAddQuestion}
              disabled={!questionText.trim()}
            >
              הוסף שאלה
            </Button>
          </TabsContent>

          {/* Countdown Tab */}
          <TabsContent value="countdown" className="space-y-4 mt-4">
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 rounded-xl space-y-4">
              <div>
                <Label className="text-sm font-medium">כותרת הספירה</Label>
                <Input
                  value={countdownTitle}
                  onChange={(e) => setCountdownTitle(e.target.value)}
                  placeholder="יום הולדת, אירוע..."
                  className="mt-2 bg-background"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">תאריך ושעה</Label>
                <Input
                  type="datetime-local"
                  value={countdownDate}
                  onChange={(e) => setCountdownDate(e.target.value)}
                  className="mt-2 bg-background"
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleAddCountdown}
              disabled={!countdownTitle || !countdownDate}
            >
              הוסף ספירה לאחור
            </Button>
          </TabsContent>

          {/* Emoji Slider Tab */}
          <TabsContent value="slider" className="space-y-4 mt-4">
            <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 p-4 rounded-xl space-y-4">
              <div>
                <Label className="text-sm font-medium">השאלה</Label>
                <Input
                  value={sliderQuestion}
                  onChange={(e) => setSliderQuestion(e.target.value)}
                  placeholder="כמה אתם אוהבים את..."
                  className="mt-2 bg-background"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">בחר אימוג'י</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSliderEmoji(emoji)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        sliderEmoji === emoji 
                          ? 'bg-primary/20 ring-2 ring-primary scale-110' 
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-sm text-center mb-3">{sliderQuestion || 'השאלה שלך'}</p>
                <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary/40 to-transparent" />
                  <div className="absolute top-1/2 right-1/2 -translate-y-1/2 text-2xl">
                    {sliderEmoji}
                  </div>
                </div>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleAddEmojiSlider}
              disabled={!sliderQuestion.trim()}
            >
              הוסף סליידר
            </Button>
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="space-y-4 mt-4">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-xl">
              <Label className="text-sm font-medium">שאלת החידון</Label>
              <Input
                value={quizQuestion}
                onChange={(e) => setQuizQuestion(e.target.value)}
                placeholder="מה התשובה הנכונה?"
                className="mt-2 bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">תשובות (לחץ על הנכונה)</Label>
              {quizOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Button
                    variant={correctAnswer === index ? "default" : "outline"}
                    size="icon"
                    onClick={() => setCorrectAnswer(index)}
                    className="shrink-0"
                  >
                    {correctAnswer === index ? '✓' : String.fromCharCode(65 + index)}
                  </Button>
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...quizOptions];
                      newOptions[index] = e.target.value;
                      setQuizOptions(newOptions);
                    }}
                    placeholder={`תשובה ${String.fromCharCode(65 + index)}`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                לחץ על האות כדי לסמן את התשובה הנכונה
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={handleAddQuiz}
              disabled={!quizQuestion || quizOptions.filter(o => o.trim()).length < 2}
            >
              הוסף חידון
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
