import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FolderPlus, Check, Bookmark, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface PostCollection {
  id: string;
  name: string;
  cover_image_url: string | null;
  posts_count?: number;
}

interface PostCollectionsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string; // If provided, we're saving a post to collection
  onSaveToCollection?: (collectionId: string | null) => void;
}

export const PostCollectionsManager = ({ 
  open, 
  onOpenChange, 
  postId,
  onSaveToCollection 
}: PostCollectionsManagerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Fetch user's collections
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['post-collections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('post_collections')
        .select(`
          id,
          name,
          cover_image_url
        `)
        .eq('user_id', user.id)
        .order('display_order');
      
      if (error) throw error;

      // Get post counts for each collection
      const collectionsWithCounts = await Promise.all(
        (data || []).map(async (collection) => {
          const { count } = await supabase
            .from('saved_posts')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', collection.id);
          
          return {
            ...collection,
            posts_count: count || 0
          };
        })
      );

      return collectionsWithCounts as PostCollection[];
    },
    enabled: !!user && open,
  });

  // Get current collection for the post
  const { data: currentCollectionId } = useQuery({
    queryKey: ['post-collection', postId],
    queryFn: async () => {
      if (!user || !postId) return null;
      
      const { data } = await supabase
        .from('saved_posts')
        .select('collection_id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();
      
      return data?.collection_id || null;
    },
    enabled: !!user && !!postId && open,
  });

  // Create new collection
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user || !newCollectionName.trim()) return;
      
      const { data, error } = await supabase
        .from('post_collections')
        .insert({
          user_id: user.id,
          name: newCollectionName.trim(),
          display_order: collections.length
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['post-collections'] });
      setNewCollectionName('');
      setIsCreating(false);
      toast.success('התיקייה נוצרה בהצלחה');
      
      // If we have a postId, save to the new collection
      if (postId && data) {
        handleSaveToCollection(data.id);
      }
    },
    onError: () => {
      toast.error('שגיאה ביצירת התיקייה');
    }
  });

  // Save post to collection
  const handleSaveToCollection = async (collectionId: string | null) => {
    if (!user || !postId) return;

    try {
      const { error } = await supabase
        .from('saved_posts')
        .update({ collection_id: collectionId })
        .eq('user_id', user.id)
        .eq('post_id', postId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['post-collections'] });
      queryClient.invalidateQueries({ queryKey: ['post-collection', postId] });
      
      toast.success(collectionId ? 'הפוסט נשמר בתיקייה' : 'הפוסט הוסר מהתיקייה');
      onSaveToCollection?.(collectionId);
      onOpenChange(false);
    } catch (error) {
      toast.error('שגיאה בשמירת הפוסט');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5" />
            {postId ? 'שמור לתיקייה' : 'התיקיות שלי'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 p-1">
            {/* Default "All Saved" option */}
            {postId && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSaveToCollection(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  currentCollectionId === null 
                    ? 'bg-primary/10 border-2 border-primary' 
                    : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <Bookmark className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-medium">כל הפוסטים השמורים</p>
                  <p className="text-sm text-muted-foreground">ללא תיקייה</p>
                </div>
                {currentCollectionId === null && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </motion.button>
            )}

            {/* Collections list */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <AnimatePresence>
                {collections.map((collection, index) => (
                  <motion.button
                    key={collection.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => postId && handleSaveToCollection(collection.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      currentCollectionId === collection.id 
                        ? 'bg-primary/10 border-2 border-primary' 
                        : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                      {collection.cover_image_url ? (
                        <img 
                          src={collection.cover_image_url} 
                          alt={collection.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderPlus className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-medium">{collection.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {collection.posts_count} פוסטים
                      </p>
                    </div>
                    {currentCollectionId === collection.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            )}

            {/* Create new collection */}
            {isCreating ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 bg-muted/50 rounded-xl space-y-3"
              >
                <Input
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="שם התיקייה..."
                  className="text-right"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setIsCreating(false);
                      setNewCollectionName('');
                    }}
                  >
                    ביטול
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => createMutation.mutate()}
                    disabled={!newCollectionName.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'צור'
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto p-3"
                onClick={() => setIsCreating(true)}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <span className="font-medium">תיקייה חדשה</span>
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
