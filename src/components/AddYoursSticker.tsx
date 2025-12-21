import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Image as ImageIcon } from "lucide-react";

interface AddYoursStickerProps {
  prompt: string;
  onRespond?: () => void;
  responseCount?: number;
}

export const AddYoursSticker = ({ prompt, onRespond, responseCount = 0 }: AddYoursStickerProps) => {
  return (
    <button
      onClick={onRespond}
      className="bg-gradient-to-r from-purple-500/90 to-pink-500/90 backdrop-blur-sm rounded-2xl p-4 text-white text-right min-w-[200px] shadow-lg"
    >
      <div className="flex items-center gap-2 mb-2">
        <Plus className="w-4 h-4" />
        <span className="text-xs font-medium">הוסף שלך</span>
      </div>
      <p className="font-bold text-sm">{prompt}</p>
      {responseCount > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs opacity-80">
          <ImageIcon className="w-3 h-3" />
          <span>{responseCount} תגובות</span>
        </div>
      )}
    </button>
  );
};

interface AddYoursStickerCreatorProps {
  onAdd: (prompt: string) => void;
}

export const AddYoursStickerCreator = ({ onAdd }: AddYoursStickerCreatorProps) => {
  const [prompt, setPrompt] = useState("");

  const handleAdd = () => {
    if (prompt.trim()) {
      onAdd(prompt.trim());
      setPrompt("");
    }
  };

  const suggestions = [
    "התמונה הראשונה בגלריה",
    "חיית המחמד שלי עכשיו",
    "הנוף מהחלון שלי",
    "הארוחה האחרונה שלי"
  ];

  return (
    <div className="space-y-4">
      <Input
        placeholder="כתוב אתגר..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="rounded-xl"
        maxLength={50}
      />
      
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => setPrompt(s)}
            className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-muted/80"
          >
            {s}
          </button>
        ))}
      </div>

      <Button
        onClick={handleAdd}
        disabled={!prompt.trim()}
        className="w-full rounded-xl"
      >
        <Plus className="w-4 h-4 ml-2" />
        הוסף סטיקר
      </Button>
    </div>
  );
};