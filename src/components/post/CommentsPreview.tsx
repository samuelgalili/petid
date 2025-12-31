import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

interface CommentsPreviewProps {
  postId: string;
  totalComments: number;
  maxPreview?: number;
}

export const CommentsPreview = ({ 
  postId, 
  totalComments, 
  maxPreview = 2 
}: CommentsPreviewProps) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreviewComments = async () => {
      if (totalComments === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: commentsData } = await supabase
          .from('post_comments')
          .select('id, user_id, comment_text, created_at')
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .limit(maxPreview);

        if (commentsData && commentsData.length > 0) {
          const userIds = [...new Set(commentsData.map(c => c.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

          setComments(
            commentsData.map(comment => ({
              id: comment.id,
              user_id: comment.user_id,
              comment_text: comment.comment_text,
              created_at: comment.created_at,
              user: {
                id: profilesMap.get(comment.user_id)?.id || '',
                full_name: profilesMap.get(comment.user_id)?.full_name || 'משתמש',
                avatar_url: profilesMap.get(comment.user_id)?.avatar_url || '',
              },
            })).reverse()
          );
        }
      } catch (error) {
        console.error('Error fetching preview comments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreviewComments();
  }, [postId, totalComments, maxPreview]);

  if (totalComments === 0 || isLoading) return null;

  return (
    <div className="space-y-1.5">
      {/* View all comments link */}
      {totalComments > maxPreview && (
        <button 
          className="text-[#8E8E8E] text-sm block"
          onClick={() => navigate(`/post/${postId}`)}
        >
          הצג את כל {totalComments} התגובות
        </button>
      )}
      
      {/* Preview comments */}
      {comments.map((comment) => (
        <div key={comment.id} className="flex items-start gap-2">
          <p className="text-[#262626] text-sm leading-[18px]">
            <span 
              className="font-semibold cursor-pointer hover:underline"
              onClick={() => navigate(`/user/${comment.user.id}`)}
            >
              {comment.user.full_name}
            </span>{' '}
            <span className="text-[#262626]/90">
              {comment.comment_text.length > 80 
                ? `${comment.comment_text.slice(0, 80)}...` 
                : comment.comment_text
              }
            </span>
          </p>
        </div>
      ))}
    </div>
  );
};
