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
  media_urls: string[];
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
  is_saved: boolean;
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
      .select("*")
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
      let isSaved = false;
      if (user) {
        const { data: likeData } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        
        isLiked = !!likeData;

        const { data: savedData } = await supabase
          .from("saved_posts")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        
        isSaved = !!savedData;
      }

      setPost({
        id: postData.id,
        user_id: postData.user_id,
        image_url: postData.image_url,
        media_urls: postData.media_urls || [],
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
        is_saved: isSaved,
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
      toast.success("אהבת את הפוסט ❤️");
    }
  };

  const handleSave = async () => {
    if (!user || !post) return;

    if (post.is_saved) {
      // Unsave
      await supabase
        .from("saved_posts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      
      setPost({ ...post, is_saved: false });
      toast.success("הפוסט הוסר מהשמורים");
    } else {
      // Save
      await supabase
        .from("saved_posts")
        .insert({ post_id: postId, user_id: user.id });
      
      setPost({ ...post, is_saved: true });
      toast.success("הפוסט נשמר בהצלחה 🔖");
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
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowRight className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-jakarta font-black">פוסט</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4"
        >
          {/* Post Header */}
          <div className="flex items-center justify-between p-4">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate(`/user/${post.user.id}`)}
            >
              <div className="w-11 h-11 rounded-full bg-gradient-instagram p-[2px]">
                <Avatar className="w-full h-full ring-2 ring-white">
                  <AvatarImage src={post.user.avatar_url} />
                  <AvatarFallback className="bg-gradient-instagram text-white font-black text-sm">
                    {post.user.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <p className="font-black text-gray-900 font-jakarta text-[15px]">{post.user.full_name}</p>
                <p className="text-xs text-gray-500 font-jakarta">{getTimeAgo(post.created_at)}</p>
              </div>
            </div>
            <button className="text-gray-600 hover:text-gray-900 p-2 transition-colors">
              <MoreVertical className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Post Image */}
          <div className="w-full aspect-square bg-gray-100 relative">
            <img 
              src={post.media_urls?.[0] || post.image_url} 
              alt={post.caption || ""}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Post Actions */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-5">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLike}
                  className={`flex items-center gap-2 transition-all ${
                    post.is_liked ? 'text-instagram-pink' : 'text-gray-700 hover:text-gray-500'
                  }`}
                >
                  <Heart className={`w-7 h-7 ${post.is_liked ? 'fill-current' : ''}`} strokeWidth={1.5} />
                  {post.likes_count > 0 && (
                    <span className="font-black font-jakarta">{post.likes_count}</span>
                  )}
                </motion.button>
                <div className="flex items-center gap-2 text-gray-700">
                  <MessageCircle className="w-7 h-7" strokeWidth={1.5} />
                  {post.comments_count > 0 && (
                    <span className="font-black font-jakarta">{post.comments_count}</span>
                  )}
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  className="text-gray-700 hover:text-gray-500 transition-colors"
                >
                  <Share2 className="w-7 h-7" strokeWidth={1.5} />
                </motion.button>
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleSave}
                className={`transition-colors ${post.is_saved ? 'text-instagram-orange' : 'text-gray-700 hover:text-gray-500'}`}
              >
                <Bookmark className={`w-7 h-7 ${post.is_saved ? 'fill-current' : ''}`} strokeWidth={1.5} />
              </motion.button>
            </div>

            {/* Likes count */}
            {post.likes_count > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-900 font-jakarta">
                  <span className="font-black">
                    {post.likes_count} {post.likes_count === 1 ? 'לייק' : 'לייקים'}
                  </span>
                </p>
              </div>
            )}

            {/* Post Caption */}
            {post.caption && (
              <div className="mb-2">
                <p className="text-gray-900 font-jakarta text-[15px]">
                  <span 
                    className="font-black cursor-pointer hover:text-instagram-pink transition-colors"
                    onClick={() => navigate(`/user/${post.user.id}`)}
                  >
                    {post.user.full_name}
                  </span>{" "}
                  {post.caption}
                </p>
              </div>
            )}

            {/* View all comments link */}
            {post.comments_count > 0 && (
              <button 
                className="text-gray-500 text-sm font-jakarta hover:text-gray-700 font-semibold transition-colors mb-2"
                onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                הצג את כל {post.comments_count} התגובות
              </button>
            )}
          </div>

          {/* Comments Section */}
          <div id="comments-section" className="border-t border-gray-100">
            <div className="p-4 bg-gray-50/50">
              <h3 className="font-black text-gray-900 font-jakarta text-lg">תגובות ({post.comments_count})</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <AnimatePresence>
                {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-instagram p-[2px] flex-shrink-0">
                      <Avatar 
                        className="w-full h-full cursor-pointer ring-2 ring-white"
                        onClick={() => navigate(`/user/${comment.user.id}`)}
                      >
                        <AvatarImage src={comment.user.avatar_url} />
                        <AvatarFallback className="bg-gradient-instagram text-white text-xs font-black">
                          {comment.user.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p 
                            className="font-black text-sm text-gray-900 font-jakarta cursor-pointer hover:text-instagram-pink transition-colors"
                            onClick={() => navigate(`/user/${comment.user.id}`)}
                          >
                            {comment.user.full_name}
                          </p>
                        
                          {editingCommentId === comment.id ? (
                            <div className="mt-2 space-y-2">
                              <Textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="min-h-[60px] resize-none text-sm font-jakarta"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditComment(comment.id)}
                                  className="bg-gradient-instagram text-white hover:opacity-90 font-jakarta"
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
                                  className="font-jakarta"
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
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-jakarta font-bold">אין תגובות עדיין</p>
                <p className="text-gray-400 font-jakarta text-sm mt-1">היה הראשון להגיב 💬</p>
              </div>
            )}
          </div>
        </div>
        </motion.div>
      </div>

      {/* Add Comment Input - Fixed at bottom */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 shadow-lg">
          <div className="max-w-2xl mx-auto flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-instagram p-[2px] flex-shrink-0">
              <Avatar className="w-full h-full ring-2 ring-white">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-instagram text-white font-black text-sm">
                  {user.user_metadata?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="הוסף תגובה... 💬"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[48px] max-h-[100px] resize-none rounded-full border border-gray-300 focus:border-instagram-pink font-jakarta px-4 py-3"
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
                className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-instagram hover:opacity-90 text-white shadow-md disabled:opacity-50"
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