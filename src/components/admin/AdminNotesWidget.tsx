import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pin, Trash2, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminNotes, AdminNote } from '@/hooks/admin/useAdminNotes';

const colorClasses: Record<AdminNote['color'], string> = {
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
  blue: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  green: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  pink: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
  purple: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
};

export const AdminNotesWidget = () => {
  const { notes, pinnedNotes, unpinnedNotes, addNote, updateNote, deleteNote, togglePin } = useAdminNotes();
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<AdminNote['color']>('yellow');

  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      addNote(newNoteContent.trim(), selectedColor);
      setNewNoteContent('');
      setIsAdding(false);
    }
  };

  const NoteCard = ({ note }: { note: AdminNote }) => (
    <div className={cn(
      "p-3 rounded-lg border text-sm relative group",
      colorClasses[note.color]
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="whitespace-pre-wrap flex-1 text-foreground/80">{note.content}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => togglePin(note.id)}
          >
            <Pin className={cn("w-3 h-3", note.pinned && "fill-current text-primary")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            onClick={() => deleteNote(note.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        {note.updatedAt.toLocaleDateString('he-IL')}
      </p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="w-4 h-4" />
            הערות
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-4 space-y-2">
            <Textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="הערה חדשה..."
              className="min-h-[80px] text-sm"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {(['yellow', 'blue', 'green', 'pink', 'purple'] as const).map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-5 h-5 rounded-full border-2 transition-transform",
                      colorClasses[color],
                      selectedColor === color && "scale-125 ring-2 ring-offset-1 ring-primary"
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                  ביטול
                </Button>
                <Button size="sm" onClick={handleAddNote}>
                  שמור
                </Button>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3">
            {pinnedNotes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  נעוצות
                </h4>
                {pinnedNotes.map(note => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
            
            {unpinnedNotes.length > 0 && (
              <div className="space-y-2">
                {pinnedNotes.length > 0 && (
                  <h4 className="text-xs font-medium text-muted-foreground">הערות</h4>
                )}
                {unpinnedNotes.map(note => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}

            {notes.length === 0 && !isAdding && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                אין הערות
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
