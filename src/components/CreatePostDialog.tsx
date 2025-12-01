import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Image as ImageIcon, X, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

export const CreatePostDialog = ({ open, onOpenChange, onPostCreated }: CreatePostDialogProps) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleCreatePost = async () => {
    if (!user || !selectedImage) {
      toast.error("נא לבחור תמונה");
      return;
    }

    setUploading(true);

    try {
      // Upload image to avatars bucket
      const fileExt = selectedImage.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, selectedImage, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      // Create post in database
      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          caption: caption.trim() || null,
        });

      if (insertError) throw insertError;

      toast.success("🎉 הפוסט פורסם בהצלחה!");
      
      // Reset form
      setCaption("");
      setSelectedImage(null);
      setPreviewUrl(null);
      onOpenChange(false);
      onPostCreated();
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error("שגיאה בפרסום הפוסט");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg font-jakarta bg-white rounded-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-center text-gray-900 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            פוסט חדש
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Image Preview or Upload Options */}
          {previewUrl ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full aspect-square object-cover rounded-2xl shadow-lg"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-lg w-10 h-10"
                onClick={handleRemoveImage}
              >
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
              />
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 hover:border-accent hover:bg-accent/10 rounded-2xl transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 bg-gradient-secondary rounded-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-700" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">בחר מהגלריה</span>
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 hover:border-accent hover:bg-accent/10 rounded-2xl transition-all"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <div className="w-16 h-16 bg-gradient-secondary-reverse rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-700" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">צלם תמונה</span>
                </Button>
              </motion.div>
            </div>
          )}

          {/* Caption Input */}
          <div className="space-y-2">
            <Textarea
              placeholder="שתף משהו על חיית המחמד שלך... 🐾"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[120px] resize-none rounded-2xl border-2 focus:border-accent font-jakarta"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-left font-jakarta">
              {caption.length}/500
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl font-bold font-jakarta h-12"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              ביטול
            </Button>
            <Button
              className="flex-1 rounded-2xl font-bold font-jakarta h-12 bg-gradient-primary hover:bg-gradient-primary-hover text-gray-900 shadow-lg"
              onClick={handleCreatePost}
              disabled={!selectedImage || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  מפרסם...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 ml-2" />
                  פרסם
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};