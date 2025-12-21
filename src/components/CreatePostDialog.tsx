import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Camera, Image as ImageIcon, X, Loader2, Sparkles, Video, MapPin, PawPrint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { validateImageFile, compressImage } from "@/lib/validators";
import { VideoUploader } from "@/components/VideoUploader";
import { PetTagSelector } from "@/components/PetTagSelector";
import LocationPicker from "@/components/LocationPicker";
import HashtagInput from "@/components/HashtagInput";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
}

export const CreatePostDialog = ({ open, onOpenChange, onPostCreated }: CreatePostDialogProps) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  
  // Image state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
  // Additional metadata
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "קובץ תמונה לא תקין");
      return;
    }

    try {
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: file.type });
      
      setSelectedImage(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
      
      toast.success("התמונה נטענה בהצלחה");
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("שגיאה בעיבוד התמונה");
    }
  };

  const handleRemoveMedia = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setVideoFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const resetForm = () => {
    setCaption("");
    setMediaType("image");
    setSelectedImage(null);
    setImagePreview(null);
    setVideoFile(null);
    setVideoPreview(null);
    setSelectedPets([]);
    setLocation(null);
    setHashtags([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleCreatePost = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי לפרסם");
      return;
    }

    const hasMedia = mediaType === "image" ? selectedImage : videoFile;
    if (!hasMedia) {
      toast.error("נא לבחור תמונה או וידאו");
      return;
    }

    setUploading(true);

    try {
      let mediaUrl = "";
      
      if (mediaType === "image" && selectedImage && imagePreview) {
        // Use the base64 preview directly as the image URL
        mediaUrl = imagePreview;
      } else if (mediaType === "video" && videoFile && videoPreview) {
        // For video, we need storage - show error
        toast.error("העלאת וידאו אינה זמינה כרגע");
        setUploading(false);
        return;
      }

      // Build caption with hashtags
      let fullCaption = caption.trim();
      if (hashtags.length > 0) {
        fullCaption += "\n\n" + hashtags.map(h => `#${h}`).join(" ");
      }

      // Create post
      const postData: any = {
        user_id: user.id,
        image_url: mediaUrl,
        caption: fullCaption || null,
        media_type: mediaType,
        location_id: location?.id || null,
        pet_id: selectedPets.length > 0 ? selectedPets[0] : null,
      };

      if (mediaType === "video") {
        postData.video_url = mediaUrl;
      }

      const { error: insertError } = await supabase
        .from("posts")
        .insert(postData);

      if (insertError) throw insertError;

      // Update hashtag counts
      for (const tag of hashtags) {
        const { data: existing } = await supabase
          .from('hashtags')
          .select('id, post_count')
          .eq('name', tag)
          .maybeSingle();
        
        if (existing) {
          await supabase
            .from('hashtags')
            .update({ post_count: (existing.post_count || 0) + 1 })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('hashtags')
            .insert({ name: tag, post_count: 1 });
        }
      }

      toast.success("🎉 הפוסט פורסם בהצלחה!");
      resetForm();
      onOpenChange(false);
      onPostCreated();
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error(error.message || "שגיאה בפרסום הפוסט");
    } finally {
      setUploading(false);
    }
  };

  const hasMedia = mediaType === "image" ? imagePreview : videoPreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto font-jakarta bg-background rounded-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-center flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-instagram-pink" strokeWidth={1.5} />
            פוסט חדש
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Media Type Tabs */}
          <Tabs value={mediaType} onValueChange={(v) => { setMediaType(v as "image" | "video"); handleRemoveMedia(); }}>
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 rounded-2xl">
              <TabsTrigger value="image" className="rounded-xl data-[state=active]:bg-background">
                <ImageIcon className="w-4 h-4 ml-2" />
                תמונה
              </TabsTrigger>
              <TabsTrigger value="video" className="rounded-xl data-[state=active]:bg-background">
                <Video className="w-4 h-4 ml-2" />
                וידאו
              </TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="mt-4">
              {imagePreview ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative"
                >
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full aspect-square object-cover rounded-2xl shadow-lg"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-lg w-10 h-10"
                    onClick={handleRemoveMedia}
                  >
                    <X className="w-5 h-5" strokeWidth={1.5} />
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
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      className="w-full h-32 flex flex-col items-center justify-center gap-3 border-2 border-dashed hover:border-petid-blue hover:bg-petid-blue/5 rounded-2xl transition-all"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-12 h-12 bg-gradient-petid rounded-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm font-bold">גלריה</span>
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      className="w-full h-32 flex flex-col items-center justify-center gap-3 border-2 border-dashed hover:border-instagram-pink hover:bg-gradient-instagram-soft rounded-2xl transition-all"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <div className="w-12 h-12 bg-gradient-instagram rounded-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm font-bold">מצלמה</span>
                    </Button>
                  </motion.div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="video" className="mt-4">
              <VideoUploader
                videoFile={videoFile}
                videoPreview={videoPreview}
                onVideoSelect={(file, preview) => {
                  setVideoFile(file);
                  setVideoPreview(preview);
                }}
                onVideoRemove={() => {
                  setVideoFile(null);
                  setVideoPreview(null);
                }}
                maxDurationSeconds={90}
              />
            </TabsContent>
          </Tabs>

          {/* Caption */}
          <div className="space-y-2">
            <Textarea
              placeholder="שתף משהו על חיית המחמד שלך... 🐾"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[100px] resize-none rounded-2xl border-2 focus:border-accent"
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-left">
              {caption.length}/500
            </div>
          </div>

          {/* Pet Tagging */}
          <PetTagSelector
            selectedPets={selectedPets}
            onChange={setSelectedPets}
          />

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>מיקום</span>
            </div>
            <LocationPicker
              value={location}
              onChange={setLocation}
            />
          </div>

          {/* Hashtags */}
          <HashtagInput
            value={hashtags}
            onChange={setHashtags}
            maxTags={10}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl font-bold h-12"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              ביטול
            </Button>
            <Button
              className="flex-1 rounded-2xl font-bold h-12 bg-gradient-instagram text-white shadow-lg hover:shadow-xl"
              onClick={handleCreatePost}
              disabled={!hasMedia || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" strokeWidth={1.5} />
                  מפרסם...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 ml-2" strokeWidth={1.5} />
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
