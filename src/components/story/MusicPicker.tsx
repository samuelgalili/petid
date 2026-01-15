import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Play, Pause, Music, TrendingUp, Heart, Check, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string | null;
  duration_seconds: number;
  preview_url: string;
  cover_art_url: string | null;
  is_trending: boolean;
}

interface MusicPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTrack: (track: MusicTrack) => void;
  selectedTrackId?: string | null;
}

export const MusicPicker = ({ open, onOpenChange, onSelectTrack, selectedTrackId }: MusicPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('trending');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch all tracks
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['music-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*')
        .order('play_count', { ascending: false });
      
      if (error) throw error;
      return data as MusicTrack[];
    },
    enabled: open,
  });

  // Filter tracks based on search and tab
  const filteredTracks = tracks.filter(track => {
    const matchesSearch = !searchQuery || 
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.genre?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'trending') return matchesSearch && track.is_trending;
    return matchesSearch;
  });

  // Handle audio playback
  const togglePlay = (track: MusicTrack) => {
    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(track.preview_url);
      audioRef.current.volume = 0.5;
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingTrackId(null);
      setPlayingTrackId(track.id);
    }
  };

  // Stop audio when dialog closes
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    }
  }, [open]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectTrack = (track: MusicTrack) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onSelectTrack(track);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[600px] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            הוספת מוזיקה
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חפש שירים, אמנים או ז'אנרים..."
            className="pr-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="trending" className="gap-1">
              <TrendingUp className="w-4 h-4" />
              פופולרי
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1">
              <Music className="w-4 h-4" />
              הכל
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Track list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 pb-4">
            <AnimatePresence>
              {filteredTracks.map((track, index) => {
                const isPlaying = playingTrackId === track.id;
                const isSelected = selectedTrackId === track.id;

                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-primary/10 border-2 border-primary' 
                        : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                    }`}
                    onClick={() => handleSelectTrack(track)}
                  >
                    {/* Album Art with Play Button */}
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-lg overflow-hidden ${isPlaying ? 'ring-2 ring-primary' : ''}`}>
                        {track.cover_art_url ? (
                          <img 
                            src={track.cover_art_url} 
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                            <Music className="w-6 h-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(track);
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition-opacity"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 text-white" fill="white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" fill="white" />
                        )}
                      </button>
                      
                      {/* Playing indicator */}
                      {isPlaying && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Volume2 className="w-3 h-3 text-white animate-pulse" />
                        </div>
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{track.title}</p>
                        {track.is_trending && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            🔥
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {track.genre && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {track.genre}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(track.duration_seconds)}
                        </span>
                      </div>
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredTracks.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>לא נמצאו שירים</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Clear selection button */}
        {selectedTrackId && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onSelectTrack(null as any);
              onOpenChange(false);
            }}
          >
            הסר מוזיקה
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};
