import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MusicPicker, type SelectedMusic } from "@/components/MusicPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Camera, Image as ImageIcon, X, Loader2, Sparkles, Video, MapPin, PawPrint, Users, Calendar, Eye, FileText, ChevronRight, ArrowRight, Music, Hash, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { validateImageFile, compressImage } from "@/lib/validators";
import { VideoUploader } from "@/components/VideoUploader";
import { PetTagSelector } from "@/components/PetTagSelector";
import LocationPicker from "@/components/LocationPicker";
import HashtagInput from "@/components/HashtagInput";
import { CollaborativePostInvite } from "@/components/CollaborativePostInvite";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { VideoAIPanel, RewardVisualization, SafetyBlockOverlay } from "@/components/content/VideoAIPanel";

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
  const [step, setStep] = useState<"media" | "details">("media");
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [altText, setAltText] = useState("");
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [showCollabInvite, setShowCollabInvite] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<SelectedMusic | null>(null);
  
  // Expandable sections
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // AI Content Creator state
  const [taggedProducts, setTaggedProducts] = useState<any[]>([]);
  const [safetyBlock, setSafetyBlock] = useState<string | null>(null);
  const [petInfo, setPetInfo] = useState<{ name: string | null; breed: string | null }>({ name: null, breed: null });

  // Fetch pet info when dialog opens
  useState(() => {
    if (!user) return;
    (supabase as any)
      .from("pets")
      .select("name, breed")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }: any) => {
        if (data?.[0]) {
          setPetInfo({ name: data[0].name, breed: data[0].breed });
        }
      });
  });

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
      // Auto-advance to details
      setTimeout(() => setStep("details"), 300);
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
    setStep("media");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const resetForm = () => {
    setStep("media");
    setCaption("");
    setMediaType("image");
    setSelectedImage(null);
    setImagePreview(null);
    setVideoFile(null);
    setVideoPreview(null);
    setSelectedPets([]);
    setLocation(null);
    setHashtags([]);
    setAltText("");
    setCollaborators([]);
    setScheduleDate(undefined);
    setSelectedMusic(null);
    setExpandedSection(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const saveDraft = async () => {
    if (!user) return;
    try {
      await supabase
        .from('draft_posts')
        .insert({
          user_id: user.id,
          caption,
          image_url: imagePreview,
          alt_text: altText,
          pet_id: selectedPets[0] || null
        });
      toast.success("נשמר כטיוטה");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("שגיאה בשמירת הטיוטה");
    }
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
        mediaUrl = imagePreview;
      } else if (mediaType === "video" && videoFile && videoPreview) {
        toast.error("העלאת וידאו אינה זמינה כרגע");
        setUploading(false);
        return;
      }

      let fullCaption = caption.trim();
      if (hashtags.length > 0) {
        fullCaption += "\n\n" + hashtags.map(h => `#${h}`).join(" ");
      }

      if (scheduleDate && scheduleDate > new Date()) {
        await supabase
          .from('scheduled_posts')
          .insert({
            user_id: user.id,
            caption: fullCaption,
            image_url: mediaUrl,
            alt_text: altText || null,
            pet_id: selectedPets[0] || null,
            scheduled_for: scheduleDate.toISOString()
          });
        
        toast.success("הפוסט תוזמן בהצלחה!");
        resetForm();
        onOpenChange(false);
        return;
      }

      const postData: any = {
        user_id: user.id,
        image_url: mediaUrl,
        caption: fullCaption || null,
        media_type: mediaType,
        location_id: location?.id || null,
        pet_id: selectedPets.length > 0 ? selectedPets[0] : null,
        alt_text: altText || null,
        music_id: selectedMusic?.id || null,
        music_url: selectedMusic?.audio_url || null,
        music_title: selectedMusic?.title || null,
        music_artist: selectedMusic?.artist || null,
      };

      if (mediaType === "video") {
        postData.video_url = mediaUrl;
      }

      const { data: newPost, error: insertError } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();

      if (insertError) throw insertError;

      if (collaborators.length > 0 && newPost) {
        for (const collabId of collaborators) {
          await supabase
            .from('post_collaborators')
            .insert({
              post_id: newPost.id,
              collaborator_id: collabId,
              status: 'pending'
            });
        }
      }

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

      // Auto-save to album
      if (mediaUrl) {
        const { autoSaveToAlbum } = await import("@/lib/autoSaveUpload");
        await autoSaveToAlbum({
          userId: user.id,
          petId: postData.pet_id || null,
          mediaUrl,
          caption: fullCaption || null,
          mediaType,
        });
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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-hidden p-0 font-jakarta bg-background rounded-3xl border-border/30" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <button
            onClick={() => {
              if (step === "details") {
                setStep("media");
              } else {
                resetForm();
                onOpenChange(false);
              }
            }}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {step === "details" ? (
              <div className="flex items-center gap-1">
                <ChevronRight className="w-4 h-4" />
                חזרה
              </div>
            ) : "ביטול"}
          </button>

          <h2 className="text-base font-bold text-foreground">פוסט חדש</h2>
          
          {step === "details" ? (
            <button
              onClick={handleCreatePost}
              disabled={!hasMedia || uploading}
              className={cn(
                "text-sm font-bold transition-colors",
                hasMedia && !uploading
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground/50"
              )}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : scheduleDate ? "תזמן" : "שתף"}
            </button>
          ) : (
            <div className="w-10" /> // spacer
          )}
        </div>

        {/* Step indicator */}
        <div className="px-4 pt-1 pb-2 flex gap-2">
          <div className={cn("h-0.5 flex-1 rounded-full transition-colors", step === "media" || step === "details" ? "bg-primary" : "bg-border/50")} />
          <div className={cn("h-0.5 flex-1 rounded-full transition-colors", step === "details" ? "bg-primary" : "bg-border/50")} />
        </div>

        <div className="overflow-y-auto max-h-[calc(92vh-100px)]">
          <AnimatePresence mode="wait">
            {step === "media" ? (
              <motion.div
                key="media"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="px-4 pb-6 space-y-5"
              >
                {/* Media type selector */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setMediaType("image"); handleRemoveMedia(); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      mediaType === "image"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted/50 text-muted-foreground border border-transparent"
                    )}
                  >
                    <ImageIcon className="w-4 h-4" strokeWidth={1.5} />
                    תמונה
                  </button>
                  <button
                    onClick={() => { setMediaType("video"); handleRemoveMedia(); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      mediaType === "video"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted/50 text-muted-foreground border border-transparent"
                    )}
                  >
                    <Video className="w-4 h-4" strokeWidth={1.5} />
                    וידאו
                  </button>
                </div>

                {mediaType === "image" ? (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

                    {/* Upload area */}
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="relative flex flex-col items-center justify-center gap-4 py-16 rounded-3xl border-2 border-dashed border-border/60 hover:border-primary/40 bg-muted/20 hover:bg-primary/5 cursor-pointer transition-all group"
                    >
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-9 h-9 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-base font-bold text-foreground">בחר תמונה מהגלריה</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG עד 10MB</p>
                      </div>
                    </motion.div>

                    {/* Camera button */}
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <Camera className="w-5 h-5 text-accent-foreground" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm font-semibold text-foreground">צלם תמונה</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground mr-auto rotate-180" />
                    </button>
                  </>
                ) : (
                  <VideoUploader
                    videoFile={videoFile}
                    videoPreview={videoPreview}
                    onVideoSelect={(file, preview) => {
                      setVideoFile(file);
                      setVideoPreview(preview);
                      setTimeout(() => setStep("details"), 300);
                    }}
                    onVideoRemove={() => {
                      setVideoFile(null);
                      setVideoPreview(null);
                    }}
                    maxDurationSeconds={90}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="pb-6"
              >
                {/* Media preview + caption */}
                <div className="flex gap-3 px-4 py-3 border-b border-border/20">
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0">
                    {imagePreview && (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-xl"
                        />
                        <button
                          onClick={handleRemoveMedia}
                          className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {videoPreview && (
                      <div className="relative">
                        <video ref={videoRef} src={videoPreview} className="w-20 h-20 object-cover rounded-xl" />
                        <button
                          onClick={handleRemoveMedia}
                          className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1">
                          <Video className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Caption input */}
                  <div className="flex-1 min-w-0">
                    <textarea
                      placeholder="כתוב כיתוב... 🐾"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[72px]"
                      maxLength={500}
                    />
                    <div className="text-[10px] text-muted-foreground/60 text-left">
                      {caption.length}/500
                    </div>
                  </div>
                </div>

                {/* AI Video Analysis Panel */}
                {mediaType === "video" && videoPreview && (
                  <div className="px-4 py-3 border-b border-border/20 relative">
                    {safetyBlock && (
                      <SafetyBlockOverlay
                        message={safetyBlock}
                        onDismiss={() => {
                          setSafetyBlock(null);
                          handleRemoveMedia();
                        }}
                      />
                    )}
                    <VideoAIPanel
                      videoElement={videoRef.current}
                      petName={petInfo.name}
                      petBreed={petInfo.breed}
                      userId={user?.id || null}
                      onProductsTagged={setTaggedProducts}
                      onSafetyBlock={setSafetyBlock}
                    />
                    <div className="mt-2">
                      <RewardVisualization
                        petBreed={petInfo.breed}
                        taggedProductsCount={taggedProducts.length}
                      />
                    </div>
                  </div>
                )}

                {/* Options list */}
                <div className="divide-y divide-border/20">
                  {/* Pet Tag */}
                  <OptionRow
                    icon={<PawPrint className="w-5 h-5" strokeWidth={1.5} />}
                    label="תייג חיית מחמד"
                    value={selectedPets.length > 0 ? `${selectedPets.length} תויגו` : undefined}
                    expanded={expandedSection === "pets"}
                    onToggle={() => toggleSection("pets")}
                  >
                    <PetTagSelector selectedPets={selectedPets} onChange={setSelectedPets} />
                  </OptionRow>

                  {/* Location */}
                  <OptionRow
                    icon={<MapPin className="w-5 h-5" strokeWidth={1.5} />}
                    label="הוסף מיקום"
                    value={location?.name}
                    expanded={expandedSection === "location"}
                    onToggle={() => toggleSection("location")}
                  >
                    <LocationPicker value={location} onChange={setLocation} />
                  </OptionRow>

                  {/* Hashtags */}
                  <OptionRow
                    icon={<Hash className="w-5 h-5" strokeWidth={1.5} />}
                    label="האשטאגים"
                    value={hashtags.length > 0 ? hashtags.map(h => `#${h}`).join(" ") : undefined}
                    expanded={expandedSection === "hashtags"}
                    onToggle={() => toggleSection("hashtags")}
                  >
                    <HashtagInput value={hashtags} onChange={setHashtags} maxTags={10} />
                  </OptionRow>

                  {/* Music */}
                  <OptionRow
                    icon={<Music className="w-5 h-5" strokeWidth={1.5} />}
                    label="הוסף מוזיקה"
                    value={selectedMusic?.title}
                    expanded={expandedSection === "music"}
                    onToggle={() => toggleSection("music")}
                  >
                    <MusicPicker selectedMusic={selectedMusic} onSelect={setSelectedMusic} />
                  </OptionRow>

                  {/* Alt Text */}
                  <OptionRow
                    icon={<Type className="w-5 h-5" strokeWidth={1.5} />}
                    label="טקסט חלופי"
                    value={altText || undefined}
                    expanded={expandedSection === "alt"}
                    onToggle={() => toggleSection("alt")}
                  >
                    <Input
                      placeholder="תאר את התמונה לאנשים עם לקות ראייה..."
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      className="rounded-xl text-sm"
                      maxLength={200}
                    />
                  </OptionRow>

                  {/* Collaborators */}
                  <OptionRow
                    icon={<Users className="w-5 h-5" strokeWidth={1.5} />}
                    label="פוסט משותף"
                    value={collaborators.length > 0 ? `${collaborators.length} שותפים` : undefined}
                    expanded={false}
                    onToggle={() => setShowCollabInvite(true)}
                  />

                  {/* Schedule */}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-sm font-medium text-foreground">
                        {scheduleDate ? `מתוזמן ל-${scheduleDate.toLocaleDateString('he-IL')}` : "תזמן פרסום"}
                      </span>
                    </div>
                    <Popover open={showSchedulePicker} onOpenChange={setShowSchedulePicker}>
                      <PopoverTrigger asChild>
                        <button className="text-xs font-semibold text-primary">
                          {scheduleDate ? "שנה" : "בחר"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={scheduleDate}
                          onSelect={(date) => {
                            setScheduleDate(date);
                            setShowSchedulePicker(false);
                          }}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Bottom actions */}
                <div className="px-4 pt-4 flex gap-2">
                  <button
                    onClick={saveDraft}
                    disabled={uploading || !hasMedia}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground bg-muted/50 hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    <FileText className="w-4 h-4 inline ml-1" strokeWidth={1.5} />
                    טיוטה
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={!hasMedia || uploading}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-bold text-primary-foreground transition-all",
                      hasMedia && !uploading
                        ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        מפרסם...
                      </span>
                    ) : scheduleDate ? (
                      <span className="flex items-center justify-center gap-2">
                        <Calendar className="w-4 h-4" strokeWidth={1.5} />
                        תזמן פרסום
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                        פרסם עכשיו
                      </span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <CollaborativePostInvite
          open={showCollabInvite}
          onOpenChange={setShowCollabInvite}
          onCollaboratorAdded={(userId) => {
            setCollaborators([...collaborators, userId]);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

/* Expandable option row */
interface OptionRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const OptionRow = ({ icon, label, value, expanded, onToggle, children }: OptionRowProps) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-xs text-primary font-medium truncate max-w-[120px]">{value}</span>
        )}
        <ChevronRight className={cn(
          "w-4 h-4 text-muted-foreground transition-transform",
          expanded && "rotate-90"
        )} />
      </div>
    </button>
    <AnimatePresence>
      {expanded && children && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-3">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
