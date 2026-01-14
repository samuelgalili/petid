import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AdminNote {
  id: string;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple';
  createdAt: Date;
  updatedAt: Date;
  pinned: boolean;
}

const STORAGE_KEY = 'admin_notes';

export const useAdminNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<AdminNote[]>([]);

  useEffect(() => {
    loadNotes();
  }, [user?.id]);

  const loadNotes = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotes(parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
        })));
      } catch {
        setNotes([]);
      }
    }
  }, []);

  const saveNotes = useCallback((newNotes: AdminNote[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
    setNotes(newNotes);
  }, []);

  const addNote = useCallback((content: string, color: AdminNote['color'] = 'yellow') => {
    const newNote: AdminNote = {
      id: `note_${Date.now()}`,
      content,
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
      pinned: false,
    };
    saveNotes([newNote, ...notes]);
    return newNote;
  }, [notes, saveNotes]);

  const updateNote = useCallback((id: string, updates: Partial<AdminNote>) => {
    saveNotes(notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n));
  }, [notes, saveNotes]);

  const deleteNote = useCallback((id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  }, [notes, saveNotes]);

  const togglePin = useCallback((id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      updateNote(id, { pinned: !note.pinned });
    }
  }, [notes, updateNote]);

  const pinnedNotes = notes.filter(n => n.pinned);
  const unpinnedNotes = notes.filter(n => !n.pinned);

  return {
    notes,
    pinnedNotes,
    unpinnedNotes,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
  };
};
