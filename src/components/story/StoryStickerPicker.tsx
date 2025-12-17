import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, HelpCircle, Timer, MapPin, AtSign } from 'lucide-react';

interface StoryStickerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSticker: (sticker: {
    type: 'poll' | 'question' | 'countdown' | 'mention' | 'location';
    data: any;
  }) => void;
}

const StoryStickerPicker: React.FC<StoryStickerPickerProps> = ({
  open,
  onOpenChange,
  onAddSticker
}) => {
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [questionText, setQuestionText] = useState('');
  const [countdownTitle, setCountdownTitle] = useState('');
  const [countdownDate, setCountdownDate] = useState('');

  const handleAddPoll = () => {
    if (pollQuestion && pollOptions.filter(o => o.trim()).length >= 2) {
      onAddSticker({
        type: 'poll',
        data: {
          question: pollQuestion,
          options: pollOptions.filter(o => o.trim())
        }
      });
      setPollQuestion('');
      setPollOptions(['', '']);
      onOpenChange(false);
    }
  };

  const handleAddQuestion = () => {
    if (questionText.trim()) {
      onAddSticker({
        type: 'question',
        data: { question: questionText }
      });
      setQuestionText('');
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
        }
      });
      setCountdownTitle('');
      setCountdownDate('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">הוספת סטיקר</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="poll" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="poll" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              סקר
            </TabsTrigger>
            <TabsTrigger value="question" className="flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              שאלה
            </TabsTrigger>
            <TabsTrigger value="countdown" className="flex items-center gap-1">
              <Timer className="w-4 h-4" />
              ספירה
            </TabsTrigger>
          </TabsList>

          {/* Poll Tab */}
          <TabsContent value="poll" className="space-y-4 mt-4">
            <div>
              <Label>שאלת הסקר</Label>
              <Input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="שאל שאלה..."
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label>אפשרויות</Label>
              {pollOptions.map((option, index) => (
                <Input
                  key={index}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...pollOptions];
                    newOptions[index] = e.target.value;
                    setPollOptions(newOptions);
                  }}
                  placeholder={`אפשרות ${index + 1}`}
                />
              ))}
              {pollOptions.length < 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                >
                  + הוסף אפשרות
                </Button>
              )}
            </div>
            <Button className="w-full" onClick={handleAddPoll}>
              הוסף סקר
            </Button>
          </TabsContent>

          {/* Question Tab */}
          <TabsContent value="question" className="space-y-4 mt-4">
            <div>
              <Label>שאלה</Label>
              <Input
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="שאל אותי משהו..."
                className="mt-1"
              />
            </div>
            <Button className="w-full" onClick={handleAddQuestion}>
              הוסף שאלה
            </Button>
          </TabsContent>

          {/* Countdown Tab */}
          <TabsContent value="countdown" className="space-y-4 mt-4">
            <div>
              <Label>כותרת</Label>
              <Input
                value={countdownTitle}
                onChange={(e) => setCountdownTitle(e.target.value)}
                placeholder="יום הולדת, אירוע..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תאריך ושעה</Label>
              <Input
                type="datetime-local"
                value={countdownDate}
                onChange={(e) => setCountdownDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button className="w-full" onClick={handleAddCountdown}>
              הוסף ספירה לאחור
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StoryStickerPicker;
