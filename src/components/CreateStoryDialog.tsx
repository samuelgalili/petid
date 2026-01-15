import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X, Loader2, Type, Smile, Sparkles, ShoppingBag, Music, Sticker, Pause, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { StoryProductTagger } from "@/components/shop/StoryProductTagger";
import { MusicPicker } from "@/components/story/MusicPicker";
import { InteractiveStickerPicker, InteractiveSticker } from "@/components/story/InteractiveStickerPicker";

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string | null;
  duration_seconds: number;
  preview_url: string;
  cover_art_url: string | null;
  is_trending: boolean;
}

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
  const [showProductTagger, setShowProductTagger] = useState(false);
  const [taggedProducts, setTaggedProducts] = useState<Array<{ productId: string; positionX: number; positionY: number }>>([]);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [interactiveStickers, setInteractiveStickers] = useState<InteractiveSticker[]>([]);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
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
    setSelectedMusic(null);
    setInteractiveStickers([]);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const toggleMusicPreview = () => {
    if (!selectedMusic) return;
    
    if (isPlayingPreview) {
      audioPreviewRef.current?.pause();
      setIsPlayingPreview(false);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio(selectedMusic.preview_url);
        audioPreviewRef.current.volume = 0.5;
        audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
      }
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleAddInteractiveSticker = (sticker: InteractiveSticker) => {
    setInteractiveStickers(prev => [...prev, sticker]);
  };

  const removeInteractiveSticker = (index: number) => {
    setInteractiveStickers(prev => prev.filter((_, i) => i !== index));
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
      const { data: storyData, error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: mediaType,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Save product tags if any
      if (taggedProducts.length > 0 && storyData) {
        const productTags = taggedProducts.map(tag => ({
          story_id: storyData.id,
          product_id: tag.productId,
          position_x: tag.positionX,
          position_y: tag.positionY,
        }));
        
        await supabase.from("story_product_tags").insert(productTags);
      }

      toast.success("הסטורי פורסם בהצלחה!");
      
      // Reset form
      setSelectedMedia(null);
      setPreviewUrl(null);
      setEditMode(false);
      setTexts([]);
      setStickers([]);
      setFilter("none");
      setTaggedProducts([]);
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
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden font-jakarta bg-gradient-to-br from-gray-50 to-white border-4 border-transparent bg-clip-padding" dir="rtl">
        <AnimatePresence mode="wait">
          {previewUrl ? (
            editMode ? (
              // Edit Mode
              <motion.div 
                key="edit-mode"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="relative w-full aspect-[9/16] bg-black"
              >
                <canvas
                  ref={previewCanvasRef}
                  className="w-full h-full object-contain"
                />

              {/* Edit Tools */}
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="absolute top-4 left-0 right-0 flex justify-center gap-2 px-4"
              >
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md"
                    onClick={() => setShowTextInput(!showTextInput)}
                  >
                    <Type className="w-5 h-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md"
                    onClick={() => {
                      const dropdown = document.getElementById("sticker-dropdown");
                      if (dropdown) dropdown.classList.toggle("hidden");
                    }}
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md"
                    onClick={() => {
                      const dropdown = document.getElementById("filter-dropdown");
                      if (dropdown) dropdown.classList.toggle("hidden");
                    }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md"
                    onClick={() => setShowProductTagger(true)}
                  >
                    <ShoppingBag className="w-5 h-5" />
                  </Button>
                </motion.div>
                {/* Music Button */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md ${selectedMusic ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setShowMusicPicker(true)}
                  >
                    <Music className="w-5 h-5" />
                  </Button>
                </motion.div>
                {/* Interactive Stickers Button */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md ${interactiveStickers.length > 0 ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setShowStickerPicker(true)}
                  >
                    <Sticker className="w-5 h-5" />
                  </Button>
                </motion.div>
              </motion.div>

              {/* Music Picker Dialog */}
              <MusicPicker
                open={showMusicPicker}
                onOpenChange={setShowMusicPicker}
                onSelectTrack={(track) => setSelectedMusic(track)}
                selectedTrackId={selectedMusic?.id}
              />

              {/* Interactive Sticker Picker Dialog */}
              <InteractiveStickerPicker
                open={showStickerPicker}
                onOpenChange={setShowStickerPicker}
                onAddSticker={handleAddInteractiveSticker}
              />

              {/* Selected Music Display */}
              {selectedMusic && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-16 right-4 bg-black/80 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 max-w-[200px]"
                >
                  <button
                    onClick={toggleMusicPreview}
                    className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative"
                  >
                    {selectedMusic.cover_art_url ? (
                      <img src={selectedMusic.cover_art_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      {isPlayingPreview ? (
                        <Pause className="w-4 h-4 text-white" fill="white" />
                      ) : (
                        <Play className="w-4 h-4 text-white" fill="white" />
                      )}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{selectedMusic.title}</p>
                    <p className="text-white/60 text-xs truncate">{selectedMusic.artist}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMusic(null);
                      if (audioPreviewRef.current) {
                        audioPreviewRef.current.pause();
                        audioPreviewRef.current = null;
                      }
                      setIsPlayingPreview(false);
                    }}
                    className="text-white/60 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Interactive Stickers Preview */}
              {interactiveStickers.length > 0 && (
                <div className="absolute bottom-24 right-4 space-y-2">
                  {interactiveStickers.map((sticker, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-black/70 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2"
                    >
                      <span className="text-white text-xs capitalize">
                        {sticker.type === 'poll' ? '📊 סקר' :
                         sticker.type === 'question' ? '❓ שאלה' :
                         sticker.type === 'countdown' ? '⏱️ ספירה' :
                         sticker.type === 'emoji_slider' ? '😍 סליידר' :
                         '🎯 חידון'}
                      </span>
                      <button
                        onClick={() => removeInteractiveSticker(index)}
                        className="text-white/60 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Product Tagger */}
              <StoryProductTagger
                onTagProduct={(tag) => {
                  setTaggedProducts(prev => [...prev, { 
                    productId: tag.productId, 
                    positionX: tag.positionX, 
                    positionY: tag.positionY 
                  }]);
                }}
                onRemoveTag={(productId) => {
                  setTaggedProducts(prev => prev.filter(t => t.productId !== productId));
                }}
                tags={taggedProducts.map(t => ({ 
                  productId: t.productId, 
                  productName: '', 
                  productPrice: 0, 
                  productImage: '', 
                  positionX: t.positionX, 
                  positionY: t.positionY 
                }))}
                isActive={showProductTagger}
                onToggle={() => setShowProductTagger(!showProductTagger)}
              />

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
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-2"
                >
                  <Button
                    variant="outline"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold font-jakarta rounded-2xl backdrop-blur-md"
                    onClick={() => setEditMode(false)}
                    disabled={uploading}
                  >
                    חזור
                  </Button>
                  <motion.div 
                    className="flex-1"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      className="w-full bg-gradient-to-r from-instagram-pink to-instagram-purple hover:from-instagram-purple hover:to-instagram-pink text-white font-black font-jakarta rounded-2xl shadow-2xl"
                      onClick={handleCreateStory}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                          מפרסם...
                        </>
                      ) : (
                        "פרסם סטורי"
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            // Preview Mode
            <motion.div 
              key="preview-mode"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative w-full aspect-[9/16] bg-black"
            >
              {selectedMedia?.type.startsWith('image/') ? (
                <motion.img
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
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
              
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md"
                  onClick={handleRemoveMedia}
                >
                  <X className="w-5 h-5" />
                </Button>
              </motion.div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-2"
                >
                  <Button
                    variant="outline"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold font-jakarta rounded-2xl backdrop-blur-md"
                    onClick={handleRemoveMedia}
                    disabled={uploading}
                  >
                    בחר אחר
                  </Button>
                  {selectedMedia?.type.startsWith('image/') && (
                    <motion.div 
                      className="flex-1"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold font-jakarta rounded-2xl backdrop-blur-md"
                        onClick={() => setEditMode(true)}
                        disabled={uploading}
                      >
                        ערוך
                      </Button>
                    </motion.div>
                  )}
                  <motion.div 
                    className="flex-1"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      className="w-full bg-gradient-to-r from-instagram-pink to-instagram-purple hover:from-instagram-purple hover:to-instagram-pink text-white font-black font-jakarta rounded-2xl shadow-2xl"
                      onClick={handleCreateStory}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                          מפרסם...
                        </>
                      ) : (
                        "פרסם סטורי"
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          )
        ) : (
          <motion.div 
            key="upload-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="p-8 bg-gradient-to-br from-white to-gray-50"
          >
            <motion.h2 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-black text-center mb-2 text-gray-900 font-jakarta"
            >
              צור סטורי חדש
            </motion.h2>
            <motion.p 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center text-gray-600 font-jakarta text-sm mb-8"
            >
              שתף רגע מחיות המחמד שלך 📸
            </motion.p>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-4"
            >
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
                className="h-44 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-300 hover:border-accent hover:bg-gradient-to-br hover:from-yellow-50 hover:to-amber-50 rounded-3xl shadow-sm hover:shadow-xl transition-all group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-accent group-hover:to-accent-hover flex items-center justify-center transition-all">
                  <ImageIcon className="w-8 h-8 text-gray-600 group-hover:text-text-inverse transition-colors" />
                </div>
                <span className="text-sm font-black text-gray-900 font-jakarta">בחר מהגלריה</span>
              </Button>

              <Button
                variant="outline"
                className="h-44 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-300 hover:border-accent hover:bg-gradient-to-br hover:from-yellow-50 hover:to-amber-50 rounded-3xl shadow-sm hover:shadow-xl transition-all group"
                onClick={() => cameraInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-accent group-hover:to-accent-hover flex items-center justify-center transition-all">
                  <Camera className="w-8 h-8 text-gray-600 group-hover:text-text-inverse transition-colors" />
                </div>
                <span className="text-sm font-black text-gray-900 font-jakarta">צלם תמונה</span>
              </Button>
            </motion.div>
            <motion.p 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-gray-500 text-center mt-4"
            >
              הסטורי יהיה זמין ל-24 שעות
            </motion.p>
          </motion.div>
        )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};