import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PetPhotoGalleryProps {
  petId: string;
  petAvatar?: string;
  petName: string;
}

export const PetPhotoGallery = ({ petId, petAvatar, petName }: PetPhotoGalleryProps) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      // Start with avatar
      const photoList: string[] = [];
      if (petAvatar) photoList.push(petAvatar);

      const { data } = await supabase
        .from('pet_photos')
        .select('photo_url')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        photoList.push(...data.map(p => p.photo_url));
      }

      setPhotos(photoList);
    };

    fetchPhotos();
  }, [petId, petAvatar]);

  if (photos.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -150 : 150;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mx-4 mb-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">גלריה</span>
          <span className="text-[10px] text-muted-foreground">({photos.length})</span>
        </div>
        {photos.length > 3 && (
          <div className="flex gap-1">
            <button onClick={() => scroll('right')} className="p-1 rounded-full hover:bg-muted transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => scroll('left')} className="p-1 rounded-full hover:bg-muted transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory"
      >
        {photos.map((photo, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-border/20 snap-start shadow-sm"
          >
            <img 
              src={photo} 
              alt={`${petName} ${i + 1}`}
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
