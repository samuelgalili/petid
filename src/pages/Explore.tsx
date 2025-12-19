import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp, Hash, MapPin, Users, Grid3X3, Play, Heart, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface Post {
  id: string;
  image_url: string;
  media_type?: string;
  likes_count: number;
  comments_count: number;
  user_id: string;
  is_liked?: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

interface User {
  id: string;
  full_name: string;
  avatar_url: string;
}

const trendingTags = [
  { tag: "כלבים_שמחים", posts: 12400 },
  { tag: "חתולים_חמודים", posts: 8900 },
  { tag: "אימוץ_חיות", posts: 5600 },
  { tag: "טיפים_לכלבים", posts: 4200 },
  { tag: "חיות_מחמד", posts: 15800 },
  { tag: "גורים", posts: 9300 },
];

const Explore = () => {
  const navigate = useNavigate();
  const { checkAuth } = useRequireAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState("top");
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [doubleTapPostId, setDoubleTapPostId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "כלבי גולדן",
    "חתולים פרסיים",
    "אימוץ בתל אביב"
  ]);

  useEffect(() => {
    fetchExplorePosts();
  }, []);

  const fetchExplorePosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          image_url,
          media_type,
          user_id,
          profiles!posts_user_id_fkey_profiles (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      // Get likes and comments count for each post
      const postsWithCounts = await Promise.all(
        (data || []).map(async (post) => {
          const [likesRes, commentsRes] = await Promise.all([
            supabase.from("post_likes").select("id", { count: "exact" }).eq("post_id", post.id),
            supabase.from("post_comments").select("id", { count: "exact" }).eq("post_id", post.id)
          ]);
          
          return {
            ...post,
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
            profiles: post.profiles as Post["profiles"]
          };
        })
      );

      setPosts(postsWithCounts);
    } catch (error) {
      console.error("Error fetching explore posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .ilike("full_name", `%${query}%`)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
    setUsers([]);
    setIsSearchFocused(false);
  };

  const handleDoubleTap = useCallback(async (postId: string) => {
    if (!checkAuth("כדי לסמן לייק, יש להתחבר")) return;
    
    // Show animation
    setDoubleTapPostId(postId);
    
    // Like the post
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Check if already liked
      const { data: existingLike } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single();
      
      if (!existingLike) {
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id
        });
        
        // Update local state
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, likes_count: post.likes_count + 1, is_liked: true }
            : post
        ));
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
    
    // Hide animation after delay
    setTimeout(() => setDoubleTapPostId(null), 1000);
  }, [checkAuth]);

  const handleSearchSelect = (query: string) => {
    setSearchQuery(query);
    if (!recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
  };

  const removeRecentSearch = (search: string) => {
    setRecentSearches(prev => prev.filter(s => s !== search));
  };

  // Create Instagram-style grid layout
  const gridItems = useMemo(() => {
    const items: { post: Post; span: string }[] = [];
    posts.forEach((post, index) => {
      // Every 5th item (starting from 0) spans 2 rows
      const isLarge = index % 5 === 0;
      items.push({
        post,
        span: isLarge ? "row-span-2" : ""
      });
    });
    return items;
  }, [posts]);

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Search Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="חיפוש"
              className="pr-10 pl-10 h-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {!isSearchFocused && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pb-2">
            <TabsList className="w-full bg-transparent h-auto p-0 gap-2">
              <TabsTrigger 
                value="top" 
                className="flex-1 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-full py-2 text-sm"
              >
                מובילים
              </TabsTrigger>
              <TabsTrigger 
                value="accounts" 
                className="flex-1 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-full py-2 text-sm"
              >
                חשבונות
              </TabsTrigger>
              <TabsTrigger 
                value="tags" 
                className="flex-1 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-full py-2 text-sm"
              >
                תגיות
              </TabsTrigger>
              <TabsTrigger 
                value="places" 
                className="flex-1 data-[state=active]:bg-foreground data-[state=active]:text-background rounded-full py-2 text-sm"
              >
                מקומות
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchFocused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-[72px] bg-background z-40 overflow-y-auto pb-20"
          >
            {searchQuery ? (
              /* Search Results */
              <div className="p-4">
                {users.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">משתמשים</h3>
                    {users.map((user) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(`/user/${user.id}`)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback>{user.full_name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user.full_name || "משתמש"}</p>
                          <p className="text-sm text-muted-foreground">פרופיל</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">לא נמצאו תוצאות</p>
                  </div>
                )}
              </div>
            ) : (
              /* Recent Searches & Trending */
              <div className="p-4 space-y-6">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">חיפושים אחרונים</h3>
                      <button 
                        onClick={() => setRecentSearches([])}
                        className="text-sm text-primary font-medium"
                      >
                        נקה הכל
                      </button>
                    </div>
                    <div className="space-y-2">
                      {recentSearches.map((search) => (
                        <div 
                          key={search}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleSearchSelect(search)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <Search className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <span>{search}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentSearch(search);
                            }}
                          >
                            <X className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Tags */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">מגמות</h3>
                  </div>
                  <div className="space-y-2">
                    {trendingTags.map((item) => (
                      <div 
                        key={item.tag}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleSearchSelect(item.tag)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                            <Hash className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">#{item.tag}</p>
                            <p className="text-sm text-muted-foreground">{item.posts.toLocaleString()} פוסטים</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explore Grid */}
      {!isSearchFocused && (
        <div className="p-0.5">
          {loading ? (
            /* Skeleton Grid */
            <div className="grid grid-cols-3 gap-0.5">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className={`aspect-square bg-muted animate-pulse ${i % 5 === 0 ? 'row-span-2' : ''}`}
                />
              ))}
            </div>
          ) : (
            /* Posts Grid */
            <div className="grid grid-cols-3 gap-0.5 auto-rows-fr">
              {gridItems.map(({ post, span }, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className={`relative cursor-pointer group ${span}`}
                  onClick={() => navigate(`/post/${post.id}`)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleDoubleTap(post.id);
                  }}
                >
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Video indicator */}
                  {post.media_type === "video" && (
                    <div className="absolute top-2 left-2">
                      <Play className="w-6 h-6 text-white drop-shadow-lg" fill="white" />
                    </div>
                  )}

                  {/* Hover overlay with stats */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 pointer-events-none">
                    <div className="flex items-center gap-1.5 text-white font-semibold">
                      <Heart className="w-5 h-5" fill="white" />
                      <span>{post.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white font-semibold">
                      <MessageCircle className="w-5 h-5" fill="white" />
                      <span>{post.comments_count}</span>
                    </div>
                  </div>

                  {/* Double Tap Heart Animation */}
                  <AnimatePresence>
                    {doubleTapPostId === post.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                      >
                        <motion.svg
                          viewBox="0 0 24 24"
                          className="w-20 h-20 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                          initial={{ scale: 0, rotate: -15 }}
                          animate={{ 
                            scale: [0, 1.3, 1.1, 1.2, 1],
                            rotate: [-15, 10, -5, 5, 0]
                          }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ 
                            duration: 0.6,
                            times: [0, 0.3, 0.5, 0.7, 1],
                            ease: "easeOut"
                          }}
                        >
                          <motion.path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                            fill="white"
                            stroke="white"
                            strokeWidth="0.5"
                          />
                        </motion.svg>
                        
                        {/* Particle effects */}
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full bg-white"
                            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                            animate={{ 
                              scale: [0, 1, 0],
                              x: Math.cos((i / 6) * Math.PI * 2) * 50,
                              y: Math.sin((i / 6) * Math.PI * 2) * 50,
                              opacity: [1, 1, 0]
                            }}
                            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}

          {posts.length === 0 && !loading && (
            <div className="text-center py-20">
              <Grid3X3 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">אין פוסטים להצגה</p>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Explore;
