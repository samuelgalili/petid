import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleCreateStory = async () => {
    if (!user || !selectedMedia) {
      toast.error("נא לבחור תמונה או וידאו");
      return;
    }

    setUploading(true);

    try {
      // Upload media to avatars bucket (reusing existing bucket)
      const fileExt = selectedMedia.name.split(".").pop();
      const fileName = `${user.id}/stories/${Date.now()}.${fileExt}`;
      const mediaType = selectedMedia.type.startsWith('image/') ? 'image' : 'video';
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, selectedMedia, {
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