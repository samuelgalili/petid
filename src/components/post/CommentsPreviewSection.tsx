import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Comment {
  id: string;
  comment_text: string;
  user_id: string;
  created_at: string;
  user: {
    full_name: string;
  };
}

interface CommentsPreviewSectionProps {
  postId: string;
  commentsCount: number;
}

export const CommentsPreviewSection = ({ postId, commentsCount }: CommentsPreviewSectionProps) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      if (commentsCount === 0) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("post_comments")
        .select(`
          id,
          comment_text,
          user_id,
          created_at,
          profiles!post_comments_user_id_fkey (full_name)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(2);

      if (data) {
        const formattedComments = data.map((c: any) => ({
          id: c.id,
          comment_text: c.comment_text,
          user_id: c.user_id,
          created_at: c.created_at,
          user: {
            full_name: c.profiles?.full_name || "משתמש"
          }
        }));
        setComments(formattedComments);
      }
      setLoading(false);
    };

    fetchComments();
  }, [postId, commentsCount]);

  if (loading || commentsCount === 0) return null;

  return (
    <div className="px-3 pb-2">
      {/* View all comments link */}
      {commentsCount > 2 && (
        <button
          onClick={() => navigate(`/post/${postId}`)}
          className="text-[13px] text-[#8E8E8E] mb-1 block"
        >
          הצג את כל {commentsCount} התגובות
        </button>
      )}

      {/* Preview comments */}
      <div className="space-y-0.5">
        {comments.map((comment) => (
          <div key={comment.id} className="text-[14px]">
            <button
              onClick={() => navigate(`/user/${comment.user_id}`)}
              className="font-semibold text-neutral-900 ml-1 hover:underline"
            >
              {comment.user.full_name}
            </button>
            <span className="text-neutral-800 line-clamp-1">
              {comment.comment_text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
