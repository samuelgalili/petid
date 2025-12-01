import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreateHighlightDialog } from "./CreateHighlightDialog";
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

  if (highlights.length === 0 && !isOwnProfile) {
    return null;
  }

  return (
    <div className="mb-6" dir="rtl">
      <h3 className="text-sm font-black text-gray-900 font-jakarta mb-3 px-1">הדגשות</h3>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Create new highlight button (only for own profile) */}
        {isOwnProfile && (
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
            onClick={() => setCreateDialogOpen(true)}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ring-2 ring-gray-300">
              <Plus className="w-8 h-8 text-gray-600" />
            </div>
            <span className="text-xs font-jakarta text-gray-700 max-w-[70px] text-center truncate">
              חדש
            </span>
          </motion.div>
        )}

        {/* Existing highlights */}
        {highlights.map((highlight, index) => (
          <motion.div
            key={highlight.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/highlight/${highlight.id}`)}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 ring-2 ring-gray-300 overflow-hidden">
                {highlight.cover_image ? (
                  <img
                    src={highlight.cover_image}
                    alt={highlight.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    ✨
                  </div>
                )}
              </div>
              {highlight.story_count > 0 && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs font-black rounded-full flex items-center justify-center shadow-md">
                  {highlight.story_count}
                </div>
              )}
            </div>
            <span className="text-xs font-jakarta text-gray-700 max-w-[70px] text-center truncate">
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
    </div>
  );
};
