import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop";
import {
  X,
  Upload,
  RotateCw,
  Check,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentImageUrl?: string | null;
  onImageUpdated: (url: string) => void;
}

export const ProfileImageEditor = ({
  isOpen,
  onClose,
  currentImageUrl,
  onImageUpdated,
}: ProfileImageEditorProps) => {
  const { toast } = useToast();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "שגיאה",
        description: "נא להעלות קובץ תמונה בלבד",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "שגיאה",
        description: "גודל הקובץ חייב להיות קטן מ-5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation: number
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, "image/jpeg");
    });
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast({
        title: "שגיאה",
        description: "נא לבחור ולערוך תמונה",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );

      // Delete old avatar if exists
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("avatars")
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedImage, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting timestamp
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);
      
      // Add timestamp to bust browser cache
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: cacheBustedUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      onImageUpdated(cacheBustedUrl);
      toast({
        title: "הצלחה!",
        description: "תמונת הפרופיל עודכנה בהצלחה",
      });
      handleClose();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בהעלאת התמונה",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[200]"
            onClick={handleClose}
          />

          {/* Editor Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-primary p-6 flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900 font-jakarta">
                  עריכת תמונת פרופיל
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="rounded-full hover:bg-white/30"
                >
                  <X className="w-6 h-6 text-gray-900" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6">
                {!imageSrc ? (
                  <div className="space-y-4">
                    <div className="bg-secondary rounded-3xl p-12 text-center border-2 border-dashed border-border">
                      <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground font-jakarta mb-6">
                        בחר תמונה להעלאה
                      </p>
                      <div className="flex flex-col gap-3">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <div className="bg-accent text-white px-6 py-3 rounded-2xl font-bold font-jakarta inline-flex items-center gap-2 hover:bg-accent-hover transition-colors">
                            <Upload className="w-5 h-5" />
                            העלה מהגלריה
                          </div>
                        </label>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold font-jakarta inline-flex items-center gap-2 hover:bg-gray-800 transition-colors">
                            <Camera className="w-5 h-5" />
                            צלם תמונה
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Cropper */}
                    <div className="relative h-96 bg-gray-900 rounded-2xl overflow-hidden">
                      <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    </div>

                    {/* Controls */}
                    <div className="space-y-4">
                      {/* Zoom */}
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2 font-jakarta">
                          זום
                        </label>
                        <Slider
                          value={[zoom]}
                          onValueChange={(value) => setZoom(value[0])}
                          min={1}
                          max={3}
                          step={0.1}
                          className="w-full"
                        />
                      </div>

                      {/* Rotation */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-bold text-gray-900 font-jakarta">
                            סיבוב
                          </label>
                          <button
                            onClick={() => setRotation((r) => r + 90)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <RotateCw className="w-5 h-5 text-gray-700" />
                          </button>
                        </div>
                        <Slider
                          value={[rotation]}
                          onValueChange={(value) => setRotation(value[0])}
                          min={0}
                          max={360}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setImageSrc(null)}
                        className="flex-1 rounded-2xl py-6 font-bold font-jakarta"
                      >
                        בחר תמונה אחרת
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isUploading}
                        className="flex-1 bg-success hover:bg-success-dark text-white rounded-2xl py-6 font-bold font-jakarta"
                      >
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="w-5 h-5 ml-2" />
                            שמור תמונה
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};