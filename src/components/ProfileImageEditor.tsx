import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
      }, "image/jpeg", 0.7); // 70% quality for compression
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
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");

      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );

      // Create form data for edge function
      const formData = new FormData();
      formData.append("file", croppedImage, "avatar.jpg");
      formData.append("type", "profile");

      // Upload via edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      onImageUpdated(result.url);
      toast({
        title: "הצלחה!",
        description: "תמונת הפרופיל עודכנה בהצלחה",
      });
      handleClose();
      navigate(-1);
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
              className="bg-background rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-border/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  עריכת תמונת פרופיל
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="rounded-full hover:bg-muted h-8 w-8"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-4">
                {!imageSrc ? (
                  <div className="space-y-3">
                    <div className="bg-muted/50 rounded-xl p-8 text-center border border-dashed border-border">
                      <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">
                        בחר תמונה להעלאה
                      </p>
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <div 
                            className="text-white px-4 py-2.5 rounded-xl font-medium text-sm inline-flex items-center gap-2 transition-opacity hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg, #1E5799, #4ECDC4)' }}
                          >
                            <Upload className="w-4 h-4" />
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
                          <div className="bg-muted text-foreground px-4 py-2.5 rounded-xl font-medium text-sm inline-flex items-center gap-2 hover:bg-muted/80 transition-colors border border-border">
                            <Camera className="w-4 h-4" />
                            צלם תמונה
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Cropper */}
                    <div className="relative h-72 bg-muted rounded-xl overflow-hidden">
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
                    <div className="space-y-3">
                      {/* Zoom */}
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">
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
                          <label className="text-xs font-medium text-muted-foreground">
                            סיבוב
                          </label>
                          <button
                            onClick={() => setRotation((r) => r + 90)}
                            className="p-1.5 hover:bg-muted rounded-full transition-colors"
                          >
                            <RotateCw className="w-4 h-4 text-muted-foreground" />
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
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setImageSrc(null)}
                        className="flex-1 rounded-xl h-10 text-sm font-medium"
                      >
                        בחר תמונה אחרת
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isUploading}
                        className="flex-1 text-white rounded-xl h-10 text-sm font-medium"
                        style={{ background: 'linear-gradient(135deg, #1E5799, #4ECDC4)' }}
                      >
                        {isUploading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 ml-2" />
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