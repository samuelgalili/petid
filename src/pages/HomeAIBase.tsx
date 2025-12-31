import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { 
  Search, 
  Heart, 
  Send, 
  ShoppingCart, 
  PawPrint,
  Home,
  Compass,
  User,
  Plus,
  Bookmark,
  X,
  MessageCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePoints } from "@/contexts/PointsContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { StoriesBar } from "@/components/StoriesBar";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { toast } from "sonner";
import { CareDashboard } from "@/components/home/CareDashboard";
import { ReminderBanner } from "@/components/home/ReminderFlow";
import { CommunitySection } from "@/components/club/CommunitySection";

// Category icons mapping
const categoryIcons: Record<string, string> = {
  'מזון': '🍖',
  'צעצועים': '🎾',
  'טיפוח': '🛁',
  'בריאות': '💊'
};

// Category to shop filter mapping
const categoryFilters: Record<string, string> = {
  'מזון': 'dry-food',
  'צעצועים': 'toys',
  'טיפוח': 'grooming',
  'בריאות': 'health'
};

// Types
interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string | null;
  avatar_url?: string | null;
  age?: number | null;
  gender?: string | null;
}

interface Post {
  id: string;
  caption?: string | null;
  image_url?: string | null;
  created_at: string;
  user_id: string;
  pet_id?: string | null;
  profiles?: {
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  pets?: {
    name?: string | null;
    avatar_url?: string | null;
  } | null;
  is_liked?: boolean;
  likes_count?: number;
}

export default function HomeAIBase() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { totalPoints } = usePoints();
  const { items: cartItems } = useCart();
  
  // State
  const [pets, setPets] = useState<Pet[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"forYou" | "following">("forYou");
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  
  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch user's pets
  useEffect(() => {
    const fetchPets = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false });
      
      if (data && !error) {
        setPets(data);
      }
    };
    
    fetchPets();
  }, [user?.id]);

  // Fetch posts with like status
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          caption,
          image_url,
          created_at,
          user_id,
          pet_id,
          profiles:user_id(username, avatar_url),
          pets:pet_id(name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (data && !error) {
        // Fetch like status for each post if user is logged in
        if (user?.id) {
          const postIds = data.map(p => p.id);
          const { data: likes } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds);
          
          const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
          
          // Get like counts
          const { data: likeCounts } = await supabase
            .from("post_likes")
            .select("post_id")
            .in("post_id", postIds);
          
          const countMap: Record<string, number> = {};
          likeCounts?.forEach(l => {
            countMap[l.post_id] = (countMap[l.post_id] || 0) + 1;
          });
          
          const postsWithLikes = data.map(post => ({
            ...post,
            is_liked: likedPostIds.has(post.id),
            likes_count: countMap[post.id] || 0
          }));
          
          setPosts(postsWithLikes as unknown as Post[]);
        } else {
          setPosts(data as unknown as Post[]);
        }
      }
      setIsLoading(false);
    };
    
    fetchPosts();
  }, [activeTab, user?.id]);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setIsScrolled(scrollContainerRef.current.scrollTop > 50);
      }
    };
    
    const container = scrollContainerRef.current;
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle like
  const handleLike = useCallback(async (postId: string) => {
    if (!user) {
      toast.error("יש להתחבר כדי לאהוב פוסטים");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.is_liked;

    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, is_liked: !wasLiked, likes_count: (p.likes_count || 0) + (wasLiked ? -1 : 1) }
        : p
    ));

    try {
      if (wasLiked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      }
    } catch (error) {
      // Revert on error
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, is_liked: wasLiked, likes_count: (p.likes_count || 0) + (wasLiked ? 1 : -1) }
          : p
      ));
      toast.error("שגיאה בשמירת הלייק");
    }
  }, [user, posts]);

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Handle category click
  const handleCategoryClick = (category: string) => {
    const filter = categoryFilters[category];
    if (filter) {
      navigate(`/shop?category=${filter}`);
    } else {
      navigate('/shop');
    }
  };

  // Calculate XP progress
  const xpProgress = Math.min(totalPoints / 1000 * 100, 100);

  // Time ago helper
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "עכשיו";
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    return `לפני ${diffDays} ימים`;
  };

  // Refresh posts after creation
  const handlePostCreated = () => {
    setShowCreatePost(false);
    // Trigger refetch
    setActiveTab(prev => prev);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ==================== HEADER - 80px ==================== */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-card border-b border-border px-4 z-50 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <h1 
            className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            🐾 PetID
          </h1>
        </div>
        
        {/* Search & Profile */}
        <div className="flex items-center gap-2">
          {showSearch ? (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "200px", opacity: 1 }}
              className="flex items-center gap-2"
            >
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש..."
                className="h-9 text-sm"
                dir="rtl"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </motion.div>
          ) : (
            <button 
              onClick={() => setShowSearch(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Search className="w-5 h-5 text-foreground" />
            </button>
          )}
          
          <button 
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            <User className="w-6 h-6 text-foreground" />
          </button>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-20" />

      {/* Main Content */}
      <div ref={scrollContainerRef} className="overflow-y-auto">

        {/* ==================== REMINDER BANNER ==================== */}
        <ReminderBanner 
          daysLeft={6} 
          onOrder={() => navigate("/shop?reorder=true")} 
        />
        
        {/* ==================== CARE DASHBOARD ==================== */}
        {isAuthenticated && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 mt-4"
          >
            <CareDashboard />
          </motion.section>
        )}

        {/* ==================== WALLET CONTAINER (for non-authenticated) ==================== */}
        {!isAuthenticated && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 p-4 rounded-xl bg-muted"
            dir="rtl"
          >
            <p className="text-sm text-foreground text-center">
              חסכת כבר <span className="font-bold text-primary">₪{(totalPoints * 0.01).toFixed(2)}</span> מהקניות האחרונות שלך
            </p>
          </motion.section>
        )}

        {/* ==================== CATEGORIES GRID ==================== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mx-4 mt-4"
          dir="rtl"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">קטגוריות</h3>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(categoryIcons).map(([category, icon]) => (
              <motion.div
                key={category}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="aspect-square bg-card rounded-xl flex flex-col items-center justify-center cursor-pointer border border-border hover:border-primary transition-colors gap-1"
                onClick={() => handleCategoryClick(category)}
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs text-foreground font-medium">{category}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ==================== MY PETS ==================== */}
        {isAuthenticated && pets.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-4 mt-4 mb-4"
          >
            <div className="flex items-center justify-between mb-3" dir="rtl">
              <div className="flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">החיות שלי</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/add-pet")}
                className="text-primary text-xs"
              >
                + הוסף חיה
              </Button>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {pets.map((pet) => (
                <motion.div
                  key={pet.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => navigate(`/pet/${pet.id}`)}
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                      {pet.avatar_url ? (
                        <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <PawPrint className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-foreground font-medium truncate max-w-16">{pet.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ==================== STORIES BAR ==================== */}
        {!isScrolled && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="border-b border-border bg-card"
          >
            <StoriesBar />
          </motion.section>
        )}

        {/* ==================== FEED TABS ==================== */}
        <section className="sticky top-20 bg-background z-40 border-b border-border">
          <div className="flex" dir="rtl">
            <button
              onClick={() => setActiveTab("forYou")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "forYou"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground"
              }`}
            >
              עבורך
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "following"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground"
              }`}
            >
              עוקב
            </button>
          </div>
        </section>

        {/* ==================== FEED POSTS ==================== */}
        <section className="py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <PawPrint className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>אין פוסטים עדיין</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <SimplePostCard
                  key={post.id}
                  post={post}
                  getTimeAgo={getTimeAgo}
                  onLike={() => handleLike(post.id)}
                  onClick={() => navigate(`/post/${post.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ==================== COMMUNITY SECTION ==================== */}
        {isAuthenticated && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 pb-4"
          >
            <CommunitySection 
              points={totalPoints}
              streak={3}
              level={Math.floor(totalPoints / 500) + 1}
            />
          </motion.section>
        )}
      </div>

      {/* ==================== BOTTOM NAV ==================== */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-background border-t border-border flex items-center justify-around z-50">
        <Link to="/" className="flex flex-col items-center justify-center flex-1 py-2">
          <Home className="w-6 h-6 text-primary" />
        </Link>
        <Link to="/explore" className="flex flex-col items-center justify-center flex-1 py-2">
          <Compass className="w-6 h-6 text-muted-foreground" />
        </Link>
        <button 
          onClick={() => {
            if (!isAuthenticated) {
              toast.error("יש להתחבר כדי ליצור פוסט");
              navigate("/auth");
              return;
            }
            setShowCreatePost(true);
          }}
          className="flex flex-col items-center justify-center flex-1 py-2"
        >
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-lg">
            <Plus className="w-6 h-6 text-primary-foreground" />
          </div>
        </button>
        <Link to="/shop" className="flex flex-col items-center justify-center flex-1 py-2 relative">
          <ShoppingCart className="w-6 h-6 text-muted-foreground" />
          {cartItems.length > 0 && (
            <span className="absolute -top-1 right-4 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {cartItems.length}
            </span>
          )}
        </Link>
        <Link to="/profile" className="flex flex-col items-center justify-center flex-1 py-2">
          <User className="w-6 h-6 text-muted-foreground" />
        </Link>
      </nav>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={showCreatePost}
        onOpenChange={setShowCreatePost}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}

// Simple Post Card Component
interface SimplePostCardProps {
  post: Post;
  getTimeAgo: (dateString: string) => string;
  onLike: () => void;
  onClick: () => void;
}

const SimplePostCard = ({ post, getTimeAgo, onLike, onClick }: SimplePostCardProps) => {
  const [saved, setSaved] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border-y border-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary p-[1px]">
            <div className="w-full h-full rounded-full bg-background overflow-hidden">
              {post.profiles?.avatar_url ? (
                <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{post.profiles?.username || "משתמש"}</p>
            {post.pets?.name && (
              <p className="text-xs text-muted-foreground">{post.pets.name}</p>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{getTimeAgo(post.created_at)}</span>
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="aspect-square cursor-pointer" onClick={onClick}>
          <img 
            src={post.image_url} 
            alt={post.caption || ""} 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <button onClick={onLike} className="flex items-center gap-1">
            <Heart 
              className={`w-6 h-6 transition-colors ${post.is_liked ? "fill-red-500 text-red-500" : "text-foreground"}`} 
            />
            {(post.likes_count || 0) > 0 && (
              <span className="text-sm text-foreground">{post.likes_count}</span>
            )}
          </button>
          <button onClick={onClick}>
            <MessageCircle className="w-6 h-6 text-foreground" />
          </button>
          <button onClick={onClick}>
            <Send className="w-6 h-6 text-foreground" />
          </button>
        </div>
        <button onClick={() => setSaved(!saved)}>
          <Bookmark 
            className={`w-6 h-6 transition-colors ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} 
          />
        </button>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-3 pb-3" dir="rtl">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{post.profiles?.username || "משתמש"}</span>{" "}
            {post.caption}
          </p>
        </div>
      )}
    </motion.article>
  );
};
