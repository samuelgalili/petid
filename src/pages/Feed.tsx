import { Heart, MessageCircle, Share2, Bookmark, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

const Feed = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([
    {
      id: 1,
      userName: "שרה כהן",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      petName: "מקס",
      petType: "dog",
      image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&h=600&fit=crop",
      caption: "יום מקסים בפארק! 🐕 המזג היה מושלם והיינו עם חברים",
      likes: 124,
      comments: 18,
      timeAgo: "לפני 2 שעות",
      liked: false
    },
    {
      id: 2,
      userName: "דני לוי",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=danny",
      petName: "מיטל",
      petType: "cat",
      image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600&h=600&fit=crop",
      caption: "זמן תנומה 😸 החתולה שלי יודעת איך להירגע",
      likes: 89,
      comments: 12,
      timeAgo: "לפני 4 שעות",
      liked: false
    },
    {
      id: 3,
      userName: "מיכל אברהם",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michal",
      petName: "צ'רלי",
      petType: "dog",
      image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop",
      caption: "הגור החדש שלנו! 🐶 ברוכים הבאים לבית",
      likes: 201,
      comments: 35,
      timeAgo: "לפני 6 שעות",
      liked: true
    }
  ]);

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  return (
    <div className="min-h-screen bg-white pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 font-jakarta">
            רשת חיות המחמד
          </h1>
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full"
            onClick={() => {/* Add post functionality */}}
          >
            <Camera className="w-6 h-6 text-gray-700" />
          </Button>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto">
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white mb-1 border-b border-gray-100"
          >
            {/* Post Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-400"
                  style={{
                    backgroundImage: `url(${post.userAvatar})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div>
                  <p className="font-semibold text-gray-900 font-jakarta">{post.userName}</p>
                  <p className="text-sm text-gray-500 font-jakarta">{post.timeAgo}</p>
                </div>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                <span className="text-2xl">⋯</span>
              </button>
            </div>

            {/* Post Image */}
            <div className="w-full aspect-square bg-gray-100 relative overflow-hidden">
              <img 
                src={post.image} 
                alt={post.petName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Post Actions */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      post.liked ? 'text-red-500' : 'text-gray-700 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-6 h-6 ${post.liked ? 'fill-current' : ''}`} />
                    <span className="font-semibold font-jakarta">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-700 hover:text-blue-500 transition-colors">
                    <MessageCircle className="w-6 h-6" />
                    <span className="font-semibold font-jakarta">{post.comments}</span>
                  </button>
                  <button className="text-gray-700 hover:text-green-500 transition-colors">
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
                <button className="text-gray-700 hover:text-yellow-500 transition-colors">
                  <Bookmark className="w-6 h-6" />
                </button>
              </div>

              {/* Post Caption */}
              <div>
                <p className="text-gray-900 font-jakarta">
                  <span className="font-semibold">{post.userName}</span> {post.caption}
                </p>
              </div>

              {/* View Comments */}
              {post.comments > 0 && (
                <button className="text-gray-500 text-sm mt-2 font-jakarta hover:text-gray-700">
                  הצג את כל {post.comments} התגובות
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State Hint */}
      <div className="text-center py-8 px-4">
        <p className="text-gray-500 font-jakarta text-sm">
          שתפו תמונות וסיפורים של חיות המחמד שלכם 🐕🐈
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Feed;
