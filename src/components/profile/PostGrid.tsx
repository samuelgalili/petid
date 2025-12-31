import { motion } from 'framer-motion';
import { Heart, MessageCircle, Film, Images, Pin } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Post {
  id: string;
  image_url: string;
  alt_text?: string;
  media_type?: string;
  media_urls?: string[];
  is_pinned?: boolean;
  likes_count?: number;
  comments_count?: number;
}

interface PostGridProps {
  posts: Post[];
}

export const PostGrid = ({ posts }: PostGridProps) => {
  const navigate = useNavigate();
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);

  if (!posts || posts.length === 0) return null;

  // Sort pinned posts first
  const sortedPosts = [...posts].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {sortedPosts.map((post, index) => (
        <motion.button
          key={post.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03, duration: 0.2 }}
          className="aspect-square relative overflow-hidden bg-muted group"
          onClick={() => navigate(`/post/${post.id}`)}
          onMouseEnter={() => setHoveredPost(post.id)}
          onMouseLeave={() => setHoveredPost(null)}
          onTouchStart={() => setHoveredPost(post.id)}
          onTouchEnd={() => setTimeout(() => setHoveredPost(null), 200)}
        >
          <img 
            src={post.image_url} 
            alt={post.alt_text || ""} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Hover Overlay with Stats */}
          <motion.div 
            initial={false}
            animate={{ opacity: hoveredPost === post.id ? 1 : 0 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4"
          >
            <div className="flex items-center gap-1.5 text-white font-semibold">
              <Heart className="w-5 h-5 fill-white" />
              <span>{post.likes_count?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white font-semibold">
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>{post.comments_count?.toLocaleString() || 0}</span>
            </div>
          </motion.div>

          {/* Pinned Badge */}
          {post.is_pinned && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg">
                <Pin className="w-3 h-3 text-[#262626]" />
              </div>
            </div>
          )}

          {/* Video Badge */}
          {post.media_type === 'video' && (
            <div className="absolute top-2 left-2 z-10">
              <Film className="w-5 h-5 text-white drop-shadow-lg" />
            </div>
          )}

          {/* Multiple Images Badge */}
          {post.media_urls && post.media_urls.length > 1 && (
            <div className="absolute top-2 left-2 z-10">
              <Images className="w-5 h-5 text-white drop-shadow-lg" />
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
};
