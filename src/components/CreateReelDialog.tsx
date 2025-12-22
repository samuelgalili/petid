import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Video, Upload, X, Loader2 } from 'lucide-react';
import { ReelProductTagger } from '@/components/shop/ReelProductTagger';

interface CreateReelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateReelDialog: React.FC<CreateReelDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showProductTagger, setShowProductTagger] = useState(false);
  const [taggedProducts, setTaggedProducts] = useState<Array<{
    productId: string;
    productName: string;
    productPrice: number;
    productImage: string;
    positionX: number;
    positionY: number;
    timestampSeconds?: number;
  }>>([]);

  const createReelMutation = useMutation({
    mutationFn: async () => {
      if (!user || !videoFile) throw new Error('Missing data');
      
      setIsUploading(true);

      // Upload video to storage
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reels')
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName);

      // Create reel record
      const { error: insertError } = await supabase
        .from('reels')
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          caption: caption.trim() || null
        });

      if (insertError) throw insertError;

      // If there are tagged products, we would save them here
      // For now, just log them - they would be saved to reel_product_tags table
      if (taggedProducts.length > 0) {
        console.log('Tagged products for reel:', taggedProducts);
      }
    },
    onSuccess: () => {
      toast.success('הרील נוצר בהצלחה!');
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      handleClose();
    },
    onError: (error) => {
      console.error('Error creating reel:', error);
      toast.error('שגיאה ביצירת הרील');
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video file
    if (!file.type.startsWith('video/')) {
      toast.error('יש לבחור קובץ וידאו');
      return;
    }

    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      toast.error('גודל הקובץ מקסימלי: 50MB');
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleClose = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setCaption('');
    setTaggedProducts([]);
    setShowProductTagger(false);
    onOpenChange(false);
  };

  const handleTagProduct = (tag: typeof taggedProducts[0]) => {
    setTaggedProducts([...taggedProducts, tag]);
  };

  const handleRemoveTag = (productId: string) => {
    setTaggedProducts(taggedProducts.filter(t => t.productId !== productId));
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">יצירת Reel חדש</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Upload Area */}
          {!videoPreview ? (
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">לחץ להעלאת וידאו</p>
              <p className="text-xs text-muted-foreground">MP4, MOV עד 50MB</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16]">
              <video
                src={videoPreview}
                className="w-full h-full object-contain"
                controls
                autoPlay
                muted
                loop
              />
              <button
                className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"
                onClick={removeVideo}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Caption */}
          <Textarea
            placeholder="כתוב תיאור..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="resize-none"
            rows={3}
            maxLength={2200}
          />

          {/* Product Tagging */}
          {videoPreview && (
            <ReelProductTagger
              onTagProduct={handleTagProduct}
              onRemoveTag={handleRemoveTag}
              tags={taggedProducts}
              isActive={showProductTagger}
              onToggle={() => setShowProductTagger(!showProductTagger)}
            />
          )}

          {/* Submit Button */}
          <Button
            className="w-full"
            onClick={() => createReelMutation.mutate()}
            disabled={!videoFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מעלה...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 ml-2" />
                פרסם Reel
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReelDialog;
