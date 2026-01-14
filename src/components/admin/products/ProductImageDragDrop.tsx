import { useState, useRef, useCallback } from "react";
import { 
  Upload, 
  X, 
  GripVertical, 
  Image as ImageIcon,
  Loader2,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductImageDragDropProps {
  images: string[];
  mainImage: string;
  onImagesChange: (images: string[]) => void;
  onMainImageChange: (url: string) => void;
}

export function ProductImageDragDrop({
  images,
  mainImage,
  onImagesChange,
  onMainImageChange
}: ProductImageDragDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allImages = [mainImage, ...images].filter(Boolean);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newImages = [...allImages];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedImage);

    // Update main image (first) and additional images
    onMainImageChange(newImages[0]);
    onImagesChange(newImages.slice(1));
    setDraggedIndex(targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setIsDragging(false);
  };

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.type.startsWith('image/')
    );

    if (files.length === 0) return;

    await uploadFiles(files);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // If no main image, set the first one
      if (!mainImage && uploadedUrls.length > 0) {
        onMainImageChange(uploadedUrls[0]);
        onImagesChange([...images, ...uploadedUrls.slice(1)]);
      } else {
        onImagesChange([...images, ...uploadedUrls]);
      }

      toast.success(`${uploadedUrls.length} תמונות הועלו בהצלחה`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('שגיאה בהעלאת התמונות');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    if (index === 0) {
      // Removing main image - promote next image
      if (allImages.length > 1) {
        onMainImageChange(allImages[1]);
        onImagesChange(allImages.slice(2));
      } else {
        onMainImageChange('');
        onImagesChange([]);
      }
    } else {
      const newImages = images.filter((_, i) => i !== index - 1);
      onImagesChange(newImages);
    }
  };

  const setAsMain = (index: number) => {
    if (index === 0) return;
    
    const newMain = allImages[index];
    const newImages = allImages.filter((_, i) => i !== index);
    newImages.splice(0, 0, newMain);
    
    onMainImageChange(newImages[0]);
    onImagesChange(newImages.slice(1));
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          "hover:border-primary/50"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">מעלה תמונות...</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              גרור תמונות לכאן או
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              בחר קבצים
            </Button>
          </>
        )}
      </div>

      {/* Image Grid */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {allImages.map((url, index) => (
            <div
              key={`${url}-${index}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative group aspect-square rounded-lg overflow-hidden border-2 cursor-move",
                index === 0 ? "border-primary" : "border-transparent",
                draggedIndex === index && "opacity-50"
              )}
            >
              <img
                src={url}
                alt={`תמונה ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Drag handle */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/50 rounded p-1">
                  <GripVertical className="h-3 w-3 text-white" />
                </div>
              </div>

              {/* Main badge */}
              {index === 0 && (
                <div className="absolute top-1 left-1">
                  <div className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                    ראשית
                  </div>
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {index !== 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7"
                    onClick={() => setAsMain(index)}
                    title="הגדר כראשית"
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7"
                  onClick={() => removeImage(index)}
                  title="הסר"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        גרור לשינוי סדר • התמונה הראשונה תהיה התמונה הראשית
      </p>
    </div>
  );
}
