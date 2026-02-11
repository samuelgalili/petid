import { useState, useRef, useEffect } from "react";
import { Music, Play, Pause, Upload, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface SelectedMusic {
  id?: string;
  title: string;
  artist: string;
  audio_url: string;
}

interface MusicPickerProps {
  selectedMusic: SelectedMusic | null;
  onSelect: (music: SelectedMusic | null) => void;
}

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  category: string;
}

export const MusicPicker = ({ selectedMusic, onSelect }: MusicPickerProps) => {
  const [open, setOpen] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) fetchTracks();
  }, [open]);

  const fetchTracks = async () => {
    const { data } = await supabase
      .from("music_library")
      .select("*")
      .eq("is_active", true)
      .order("use_count", { ascending: false });
    if (data) setTracks(data);
  };

  const togglePlay = (track: MusicTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(track.audio_url);
      audioRef.current.play().catch(() => {});
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(track.id);
    }
  };

  const handleSelect = (track: MusicTrack) => {
    audioRef.current?.pause();
    setPlayingId(null);
    onSelect({ id: track.id, title: track.title, artist: track.artist, audio_url: track.audio_url });
    setOpen(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast.error("נא לבחור קובץ אודיו");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי (מקסימום 10MB)");
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const filePath = `${userId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("music")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("music").getPublicUrl(filePath);
      const title = file.name.replace(/\.[^/.]+$/, "");
      
      onSelect({ title, artist: "Custom", audio_url: urlData.publicUrl });
      toast.success("המוזיקה הועלתה!");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעלאה");
    } finally {
      setUploading(false);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const filtered = tracks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Trigger button */}
      <div
        className="flex items-center justify-between p-3 rounded-xl border border-border cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {selectedMusic ? `♫ ${selectedMusic.title} — ${selectedMusic.artist}` : "הוסף מוזיקה"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selectedMusic && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={(e) => { e.stopPropagation(); onSelect(null); }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
            {selectedMusic ? "שנה" : "בחר"}
          </Button>
        </div>
      </div>

      {/* Sheet */}
      <Sheet open={open} onOpenChange={(v) => { if (!v) audioRef.current?.pause(); setPlayingId(null); setOpen(v); }}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl px-4 pt-4" dir="rtl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              בחר מוזיקה
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חפש שירים..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 rounded-xl"
              />
            </div>

            {/* Upload */}
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4" />
              {uploading ? "מעלה..." : "העלה מוזיקה מהמכשיר"}
            </Button>

            {/* Track list */}
            <div className="space-y-1 max-h-[40vh] overflow-y-auto">
              {filtered.map((track) => (
                <motion.div
                  key={track.id}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer",
                    selectedMusic?.id === track.id ? "bg-primary/10" : "hover:bg-accent/50"
                  )}
                  onClick={() => handleSelect(track)}
                >
                  <button
                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); togglePlay(track); }}
                  >
                    {playingId === track.id ? (
                      <Pause className="w-4 h-4 text-primary" />
                    ) : (
                      <Play className="w-4 h-4 text-primary mr-[-2px]" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground">{track.artist}</p>
                  </div>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                    {track.category}
                  </span>
                </motion.div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">לא נמצאו שירים</p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
