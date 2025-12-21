import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Note {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  expires_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const NotesSection = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [myNote, setMyNote] = useState<Note | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    try {
      // Fetch all non-expired notes
      const { data: notesData } = await supabase
        .from('user_notes')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (notesData && notesData.length > 0) {
        // Fetch profiles for notes
        const userIds = [...new Set(notesData.map(n => n.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        const enrichedNotes = notesData.map(note => ({
          ...note,
          profile: profileMap.get(note.user_id)
        }));

        setNotes(enrichedNotes.filter(n => n.user_id !== user?.id));
        setMyNote(enrichedNotes.find(n => n.user_id === user?.id) || null);
      } else {
        setNotes([]);
        setMyNote(null);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!user || !newNoteContent.trim()) return;
    setSaving(true);

    try {
      // Delete existing note if any
      await supabase
        .from('user_notes')
        .delete()
        .eq('user_id', user.id);

      // Create new note
      const { data, error } = await supabase
        .from('user_notes')
        .insert({
          user_id: user.id,
          content: newNoteContent.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setMyNote(data);
      setNewNoteContent("");
      setShowCreateDialog(false);
      toast.success("הסטטוס נוצר!");
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("שגיאה ביצירת הסטטוס");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async () => {
    if (!user || !myNote) return;

    try {
      await supabase
        .from('user_notes')
        .delete()
        .eq('id', myNote.id);

      setMyNote(null);
      toast.success("הסטטוס נמחק");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("שגיאה במחיקת הסטטוס");
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const hours = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return `${hours} שעות`;
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 px-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full bg-muted" />
            <div className="w-12 h-2 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2 px-4 scrollbar-hide">
        {/* My Note / Create Note */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => myNote ? setShowCreateDialog(true) : setShowCreateDialog(true)}
          className="flex flex-col items-center gap-1 min-w-[72px]"
        >
          <div className="relative">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              myNote 
                ? "bg-gradient-to-br from-primary to-accent p-[2px]" 
                : "border-2 border-dashed border-muted-foreground/50"
            }`}>
              {myNote ? (
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <span className="text-lg">{myNote.content.slice(0, 2)}</span>
                </div>
              ) : (
                <Plus className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            {myNote && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote();
                }}
                className="absolute -top-1 -left-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {myNote ? getTimeRemaining(myNote.expires_at) : "הסטטוס שלך"}
          </span>
        </motion.button>

        {/* Other Notes */}
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-1 min-w-[72px]"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-[2px]">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={note.profile?.avatar_url || undefined} />
                    <AvatarFallback>{note.profile?.full_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-background rounded-lg px-2 py-0.5 shadow-md max-w-[80px]">
                  <p className="text-[10px] text-foreground truncate">{note.content}</p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground truncate max-w-[64px] mt-2">
                {note.profile?.full_name?.split(' ')[0] || "משתמש"}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create/Edit Note Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">
              {myNote ? "עדכן סטטוס" : "סטטוס חדש"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              שתף מה עובר עלייך עכשיו - הסטטוס יימחק אחרי 24 שעות
            </p>

            <Input
              placeholder="מה קורה? 💭"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value.slice(0, 60))}
              maxLength={60}
              className="text-center text-lg rounded-xl"
            />

            <p className="text-xs text-muted-foreground text-center">
              {newNoteContent.length}/60
            </p>

            <Button
              className="w-full rounded-xl"
              onClick={createNote}
              disabled={!newNoteContent.trim() || saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "שתף"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
