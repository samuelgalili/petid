import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Heart, MessageCircle, Share2, Bookmark, Send, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

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

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    fetchPostData();
  }, [postId]);

  const fetchPostData = async () => {
    setLoading(true);

    // Fetch post details
    const { data: postData } = await supabase
      .from("posts")
      .select(`
        id,
        user_id,
        image_url,
        caption,
        created_at
      `)
      .eq("id", postId)
      .single();
    
    // Fetch user profile separately
    let userProfile = null;
    if (postData) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", postData.user_id)
        .single();
      
      userProfile = profileData;
    }

    if (postData) {
      // Count likes
      const { count: likesCount } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      // Count comments
      const { count: commentsCount } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      // Check if user liked
      let isLiked = false;
      if (user) {
        const { data: likeData } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .single();
        
        isLiked = !!likeData;
      }

      setPost({
        id: postData.id,
        user_id: postData.user_id,
        image_url: postData.image_url,
        caption: postData.caption,
        created_at: postData.created_at,
        user: {
          id: userProfile?.id || "",
          full_name: userProfile?.full_name || "",
          avatar_url: userProfile?.avatar_url || "",
        },
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        is_liked: isLiked,
      });
    }

    // Fetch comments
    await fetchComments();

    setLoading(false);
  };

  const fetchComments = async () => {
    const { data: commentsData } = await supabase
      .from("post_comments")
      .select("id, user_id, comment_text, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (commentsData) {
      // Fetch user profiles for all comments
      const userIds = [...new Set(commentsData.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setComments(
        commentsData.map((comment: any) => {
          const profile = profilesMap.get(comment.user_id);
          return {
            id: comment.id,
            user_id: comment.user_id,
            comment_text: comment.comment_text,
            created_at: comment.created_at,
            user: {
              id: profile?.id || "",
              full_name: profile?.full_name || "",
              avatar_url: profile?.avatar_url || "",
            },
          };
        })
      );
    }
  };

  const handleLike = async () => {
    if (!user || !post) return;

    if (post.is_liked) {
      // Unlike
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      
      setPost({ ...post, is_liked: false, likes_count: post.likes_count - 1 });
    } else {
      // Like
      await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: user.id });
      
      setPost({ ...post, is_liked: true, likes_count: post.likes_count + 1 });
    }
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          comment_text: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      await fetchComments();
      if (post) {
        setPost({ ...post, comments_count: post.comments_count + 1 });
      }
      toast.success("התגובה נוספה בהצלחה");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("שגיאה בהוספת התגובה");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    try {
      const { error } = await supabase
        .from("post_comments")
        .update({ comment_text: editingCommentText.trim() })
        .eq("id", commentId);

      if (error) throw error;

      await fetchComments();
      setEditingCommentId(null);
      setEditingCommentText("");
      toast.success("התגובה עודכנה בהצלחה");
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("שגיאה בעדכון התגובה");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      await fetchComments();
      if (post) {
        setPost({ ...post, comments_count: post.comments_count - 1 });
      }
      setDeletingCommentId(null);
      toast.success("התגובה נמחקה בהצלחה");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("שגיאה במחיקת התגובה");
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "עכשיו";
    if (seconds < 3600) return `לפני ${Math.floor(seconds / 60)} דקות`;
    if (seconds < 86400) return `לפני ${Math.floor(seconds / 3600)} שעות`;
    if (seconds < 604800) return `לפני ${Math.floor(seconds / 86400)} ימים`;
    return date.toLocaleDateString("he-IL");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="w-full aspect-square" />
          <div className="p-4 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <p className="text-gray-500 font-jakarta">פוסט לא נמצא</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFD700] to-[#FFC107] sticky top-0 z-10 px-4 py-4 shadow-md">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-white/20"
          >
            <ArrowRight className="w-6 h-6 text-gray-900" />
          </Button>
          <h1 className="text-xl font-black text-gray-900 font-jakarta">פוסט</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          {/* Post Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate(`/user/${post.user.id}`)}
            >
              <Avatar className="w-12 h-12 ring-2 ring-gray-100">
                <AvatarImage src={post.user.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white font-black">
                  {post.user.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-black text-gray-900 font-jakarta">{post.user.full_name}</p>
                <p className="text-sm text-gray-500 font-jakarta">{getTimeAgo(post.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Post Image */}
          <div className="w-full aspect-square bg-gray-100 relative">
            <img 
              src={post.image_url} 
              alt={post.caption || ""}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Post Actions */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-5">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLike}
                  className={`flex items-center gap-2 transition-colors ${
                    post.is_liked ? 'text-red-500' : 'text-gray-700'
                  }`}
                >
                  <Heart className={`w-7 h-7 ${post.is_liked ? 'fill-current' : ''}`} />
                  {post.likes_count > 0 && (
                    <span className="font-black font-jakarta">{post.likes_count}</span>
                  )}
                </motion.button>
                <div className="flex items-center gap-2 text-gray-700">
                  <MessageCircle className="w-7 h-7" />
                  {post.comments_count > 0 && (
                    <span className="font-black font-jakarta">{post.comments_count}</span>
                  )}
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  className="text-gray-700"
                >
                  <Share2 className="w-7 h-7" />
                </motion.button>
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                className="text-gray-700 hover:text-yellow-500 transition-colors"
              >
                <Bookmark className="w-7 h-7" />
              </motion.button>
            </div>

            {/* Post Caption */}
            {post.caption && (
              <div className="mb-2">
                <p className="text-gray-900 font-jakarta">
                  <span 
                    className="font-black cursor-pointer hover:underline"
                    onClick={() => navigate(`/user/${post.user.id}`)}
                  >
                    {post.user.full_name}
                  </span>{" "}
                  {post.caption}
                </p>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="max-h-[400px] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-black text-gray-900 font-jakarta">תגובות</h3>
            </div>
            <AnimatePresence>
              {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 border-b border-gray-100"
              >
                <div className="flex gap-3">
                  <Avatar 
                    className="w-9 h-9 cursor-pointer"
                    onClick={() => navigate(`/user/${comment.user.id}`)}
                  >
                    <AvatarImage src={comment.user.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white text-sm">
                      {comment.user.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p 
                          className="font-semibold text-sm text-gray-900 font-jakarta cursor-pointer hover:underline"
                          onClick={() => navigate(`/user/${comment.user.id}`)}
                        >
                          {comment.user.full_name}
                        </p>
                        
                        {editingCommentId === comment.id ? (
                          <div className="mt-2 space-y-2">
                            <Textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="min-h-[60px] resize-none text-sm"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditComment(comment.id)}
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                שמור
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText("");
                                }}
                              >
                                ביטול
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 font-jakarta mt-1">{comment.comment_text}</p>
                        )}
                        
                        <p className="text-xs text-gray-500 font-jakarta mt-1">
                          {getTimeAgo(comment.created_at)}
                        </p>
                      </div>

                      {user && user.id === comment.user_id && editingCommentId !== comment.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="font-jakarta">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.comment_text);
                              }}
                            >
                              <Edit2 className="w-4 h-4 ml-2" />
                              ערוך
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingCommentId(comment.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {comments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 font-jakarta">אין תגובות עדיין</p>
              <p className="text-gray-400 font-jakarta text-sm mt-1">היה הראשון להגיב</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>

      {/* Add Comment Input - Fixed at bottom */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 z-10 shadow-2xl">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-gray-200">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white font-black">
                {user.user_metadata?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="כתוב תגובה... 💬"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[48px] max-h-[100px] resize-none rounded-2xl border-2 focus:border-[#FFD700] font-jakarta"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || submitting}
                size="icon"
                className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFC107] hover:from-[#FFC107] hover:to-[#FFB700] text-gray-900 shadow-lg"
              >
                {submitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Send className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCommentId} onOpenChange={() => setDeletingCommentId(null)}>
        <AlertDialogContent className="font-jakarta" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תגובה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את התגובה? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCommentId && handleDeleteComment(deletingCommentId)}
              className="bg-red-500 hover:bg-red-600"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PostDetail;