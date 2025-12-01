import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
      // Upload image to avatars bucket (reusing existing bucket)
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

      toast.success("הפוסט פורסם בהצלחה!");
      
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
      <DialogContent className="sm:max-w-lg font-jakarta" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">פוסט חדש</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview or Upload Options */}
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full aspect-square object-cover rounded-lg"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                onClick={handleRemoveImage}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
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
              
              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="w-8 h-8 text-gray-500" />
                <span className="text-sm text-gray-600">בחר מהגלריה</span>
              </Button>

              <Button
                variant="outline"
                className="h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-primary"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-8 h-8 text-gray-500" />
                <span className="text-sm text-gray-600">צלם תמונה</span>
              </Button>
            </div>
          )}

          {/* Caption Input */}
          <Textarea
            placeholder="כתוב כיתוב לפוסט..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={500}
          />
          <div className="text-xs text-gray-500 text-left">
            {caption.length}/500
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              ביטול
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={handleCreatePost}
              disabled={!selectedImage || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מפרסם...
                </>
              ) : (
                "פרסם"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};