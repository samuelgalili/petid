import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X, Loader2, Type, Smile, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

interface Sticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryCreated: () => void;
}

export const CreateStoryDialog = ({ open, onOpenChange, onStoryCreated }: CreateStoryDialogProps) => {
  const { user } = useAuth();
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [filter, setFilter] = useState<string>("none");
  const [showTextInput, setShowTextInput] = useState(false);
  const [newText, setNewText] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's image or video
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast.error("נא לבחור קובץ תמונה או וידאו");
        return;
      }

      setSelectedMedia(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setPreviewUrl(null);
    setEditMode(false);
    setTexts([]);
    setStickers([]);
    setFilter("none");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const stickersEmojis = ["😀", "😍", "🐶", "🐱", "❤️", "⭐", "🎉", "🔥", "👍", "💯"];

  const filters = [
    { name: "none", label: "ללא" },
    { name: "grayscale", label: "שחור לבן" },
    { name: "sepia", label: "ספיה" },
    { name: "brightness", label: "בהיר" },
    { name: "contrast", label: "ניגוד" },
  ];

  useEffect(() => {
    if (editMode && previewUrl && previewCanvasRef.current) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Apply filter
        if (filter === "grayscale") {
          ctx.filter = "grayscale(100%)";
        } else if (filter === "sepia") {
          ctx.filter = "sepia(100%)";
        } else if (filter === "brightness") {
          ctx.filter = "brightness(1.3)";
        } else if (filter === "contrast") {
          ctx.filter = "contrast(1.3)";
        } else {
          ctx.filter = "none";
        }
        
        ctx.drawImage(img, 0, 0);
        ctx.filter = "none";

        // Draw texts
        texts.forEach((text) => {
          ctx.fillStyle = text.color;
          ctx.font = `bold ${text.fontSize}px Plus Jakarta Sans`;
          ctx.textAlign = "center";
          ctx.fillText(text.text, text.x, text.y);
        });

        // Draw stickers
        stickers.forEach((sticker) => {
          ctx.font = `${sticker.size}px Arial`;
          ctx.fillText(sticker.emoji, sticker.x, sticker.y);
        });
      };
      img.src = previewUrl;
    }
  }, [editMode, previewUrl, texts, stickers, filter]);

  const addText = () => {
    if (!newText.trim()) return;
    setTexts([
      ...texts,
      {
        id: Date.now().toString(),
        text: newText,
        x: 200,
        y: 200,
        color: textColor,
        fontSize: 40,
      },
    ]);
    setNewText("");
    setShowTextInput(false);
  };

  const addSticker = (emoji: string) => {
    setStickers([
      ...stickers,
      {
        id: Date.now().toString(),
        emoji,
        x: 200,
        y: 300,
        size: 60,
      },
    ]);
  };

  const removeText = (id: string) => {
    setTexts(texts.filter((t) => t.id !== id));
  };

  const removeSticker = (id: string) => {
    setStickers(stickers.filter((s) => s.id !== id));
  };

  const handleCreateStory = async () => {
    if (!user || !selectedMedia) {
      toast.error("נא לבחור תמונה או וידאו");
      return;
    }

    setUploading(true);

    try {
      let fileToUpload: File | Blob = selectedMedia;

      // If image with edits, render canvas to blob
      if (selectedMedia.type.startsWith('image/') && (texts.length > 0 || stickers.length > 0 || filter !== "none")) {
        if (!previewCanvasRef.current) throw new Error("Canvas not ready");
        
        const blob = await new Promise<Blob | null>((resolve) => {
          previewCanvasRef.current?.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
        });
        
        if (!blob) throw new Error("Failed to create image blob");
        fileToUpload = blob;
      }

      // Upload media to avatars bucket
      const fileExt = selectedMedia.name.split(".").pop();
      const fileName = `${user.id}/stories/${Date.now()}.${fileExt}`;
      const mediaType = selectedMedia.type.startsWith('image/') ? 'image' : 'video';
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      // Create story in database
      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: mediaType,
        });

      if (insertError) throw insertError;

      toast.success("הסטורי פורסם בהצלחה!");
      
      // Reset form
      setSelectedMedia(null);
      setPreviewUrl(null);
      setEditMode(false);
      setTexts([]);
      setStickers([]);
      setFilter("none");
      onOpenChange(false);
      onStoryCreated();
    } catch (error: any) {
      console.error("Error creating story:", error);
      toast.error("שגיאה בפרסום הסטורי");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden font-jakarta" dir="rtl">
        {previewUrl ? (
          editMode ? (
            // Edit Mode
            <div className="relative w-full aspect-[9/16] bg-black">
              <canvas
                ref={previewCanvasRef}
                className="w-full h-full object-contain"
              />

              {/* Edit Tools */}
              <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 px-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={() => setShowTextInput(!showTextInput)}
                >
                  <Type className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={() => {
                    const dropdown = document.getElementById("sticker-dropdown");
                    if (dropdown) dropdown.classList.toggle("hidden");
                  }}
                >
                  <Smile className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={() => {
                    const dropdown = document.getElementById("filter-dropdown");
                    if (dropdown) dropdown.classList.toggle("hidden");
                  }}
                >
                  <Sparkles className="w-5 h-5" />
                </Button>
              </div>

              {/* Sticker Dropdown */}
              <div
                id="sticker-dropdown"
                className="hidden absolute top-16 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg p-3 grid grid-cols-5 gap-2 max-w-xs"
              >
                {stickersEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addSticker(emoji)}
                    className="text-3xl hover:scale-110 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Filter Dropdown */}
              <div
                id="filter-dropdown"
                className="hidden absolute top-16 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg p-2 flex flex-col gap-1"
              >
                {filters.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setFilter(f.name)}
                    className={`px-4 py-2 rounded text-white text-sm ${
                      filter === f.name ? "bg-blue-500" : "hover:bg-white/10"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Text Input */}
              {showTextInput && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg p-3 w-64">
                  <Input
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="הוסף טקסט..."
                    className="mb-2 text-white bg-white/10 border-white/30"
                    dir="rtl"
                  />
                  <div className="flex gap-2 mb-2">
                    {["#FFFFFF", "#000000", "#FF6B6B", "#4ECDC4", "#FFD93D", "#6C5CE7"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setTextColor(c)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          textColor === c ? "border-white" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <Button onClick={addText} className="w-full" size="sm">
                    הוסף
                  </Button>
                </div>
              )}

              {/* Added Texts List */}
              {texts.length > 0 && (
                <div className="absolute top-4 right-4 bg-black/50 rounded-lg p-2 max-w-[150px]">
                  {texts.map((text) => (
                    <div key={text.id} className="flex items-center justify-between mb-1">
                      <span className="text-white text-xs truncate">{text.text}</span>
                      <button onClick={() => removeText(text.id)} className="text-red-400 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Added Stickers List */}
              {stickers.length > 0 && (
                <div className="absolute bottom-20 right-4 bg-black/50 rounded-lg p-2">
                  {stickers.map((sticker) => (
                    <div key={sticker.id} className="flex items-center mb-1">
                      <span className="text-2xl">{sticker.emoji}</span>
                      <button onClick={() => removeSticker(sticker.id)} className="text-red-400 mr-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30"
                    onClick={() => setEditMode(false)}
                    disabled={uploading}
                  >
                    חזור
                  </Button>
                  <Button
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                    onClick={handleCreateStory}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        מפרסם...
                      </>
                    ) : (
                      "פרסם סטורי"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Preview Mode
            <div className="relative w-full aspect-[9/16] bg-black">
              {selectedMedia?.type.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  src={previewUrl}
                  className="w-full h-full object-contain"
                  controls
                />
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white rounded-full"
                onClick={handleRemoveMedia}
              >
                <X className="w-5 h-5" />
              </Button>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30"
                    onClick={handleRemoveMedia}
                    disabled={uploading}
                  >
                    בחר אחר
                  </Button>
                  {selectedMedia?.type.startsWith('image/') && (
                    <Button
                      variant="outline"
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30"
                      onClick={() => setEditMode(true)}
                      disabled={uploading}
                    >
                      ערוך
                    </Button>
                  )}
                  <Button
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                    onClick={handleCreateStory}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        מפרסם...
                      </>
                    ) : (
                      "פרסם סטורי"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-center mb-6">צור סטורי חדש</h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleMediaSelect}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                className="hidden"
                onChange={handleMediaSelect}
              />
              
              <Button
                variant="outline"
                className="h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed hover:border-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="w-10 h-10 text-gray-500" />
                <span className="text-sm text-gray-600">בחר מהגלריה</span>
              </Button>

              <Button
                variant="outline"
                className="h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed hover:border-primary"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-10 h-10 text-gray-500" />
                <span className="text-sm text-gray-600">צלם</span>
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              הסטורי יהיה זמין ל-24 שעות
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};