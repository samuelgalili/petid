import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CreateHighlightDialog } from "./CreateHighlightDialog";
import { EditHighlightDialog } from "./EditHighlightDialog";
import { useNavigate } from "react-router-dom";

interface Highlight {
  id: string;
  title: string;
  cover_image: string | null;
  story_count: number;
}

interface HighlightsSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

export const HighlightsSection = ({ userId, isOwnProfile }: HighlightsSectionProps) => {
  const navigate = useNavigate();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressedHighlightId, setPressedHighlightId] = useState<string | null>(null);

  useEffect(() => {
    fetchHighlights();
  }, [userId]);

  const fetchHighlights = async () => {
    const { data: highlightsData } = await supabase
      .from("story_highlights")
      .select(`
        id,
        title,
        cover_image,
        highlight_stories(count)
      `)
      .eq("user_id", userId)
      .order("display_order", { ascending: true });

    if (highlightsData) {
      setHighlights(
        highlightsData.map((h: any) => ({
          id: h.id,
          title: h.title,
          cover_image: h.cover_image,
          story_count: h.highlight_stories?.[0]?.count || 0,
        }))
      );
    }
  };

  const handleLongPressStart = (highlight: Highlight) => {
    if (!isOwnProfile) return;
    
    setPressedHighlightId(highlight.id);
    longPressTimerRef.current = setTimeout(() => {
      setSelectedHighlight(highlight);
      setEditDialogOpen(true);
      setPressedHighlightId(null);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPressedHighlightId(null);
  };

  const handleHighlightClick = (highlightId: string) => {
    if (!pressedHighlightId) {
      navigate(`/highlight/${highlightId}`);
    }
  };

  if (highlights.length === 0 && !isOwnProfile) {
    return null;
  }

  return (
    <motion.div 
      className="py-3 border-t border-gray-100" 
      dir="rtl"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex gap-4 overflow-x-auto pb-2 px-4 scrollbar-hide">
        {/* Create new highlight button (only for own profile) */}
        {isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
            onClick={() => setCreateDialogOpen(true)}
          >
            <motion.div 
              className="w-[64px] h-[64px] rounded-full border border-gray-300 border-dashed flex items-center justify-center bg-white"
              whileHover={{ borderColor: "#9ca3af", rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
            </motion.div>
            <span className="text-[11px] text-[#262626] max-w-[64px] text-center truncate">
              חדש
            </span>
          </motion.div>
        )}

        {/* Existing highlights */}
        {highlights.map((highlight, index) => (
          <motion.div
            key={highlight.id}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
              duration: 0.3, 
              delay: isOwnProfile ? (index + 1) * 0.08 + 0.1 : index * 0.08,
              ease: "easeOut"
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer ${
              pressedHighlightId === highlight.id ? "opacity-70" : ""
            }`}
            onClick={() => handleHighlightClick(highlight.id)}
            onMouseDown={() => handleLongPressStart(highlight)}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            onTouchStart={() => handleLongPressStart(highlight)}
            onTouchEnd={handleLongPressEnd}
            onTouchCancel={handleLongPressEnd}
          >
            {/* PetID gradient ring */}
            <div 
              className={`relative p-[3px] rounded-full ${
                highlight.story_count > 0 
                  ? "bg-gradient-to-tr from-petid-gold via-petid-blue to-petid-gold-dark" 
                  : "bg-gray-200"
              }`}
            >
              <motion.div 
                className="w-[64px] h-[64px] rounded-full overflow-hidden bg-white p-[2px]"
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-50">
                  {highlight.cover_image ? (
                    <img
                      src={highlight.cover_image}
                      alt={highlight.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-gray-100 to-gray-200">
                      ✨
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
            <span className="text-[11px] font-medium text-[#262626] max-w-[64px] text-center truncate">
              {highlight.title}
            </span>
          </motion.div>
        ))}
      </div>

      <CreateHighlightDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchHighlights}
      />

      {selectedHighlight && (
        <EditHighlightDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          highlightId={selectedHighlight.id}
          currentTitle={selectedHighlight.title}
          currentCoverImage={selectedHighlight.cover_image}
          onSuccess={fetchHighlights}
        />
      )}
    </motion.div>
  );
};
