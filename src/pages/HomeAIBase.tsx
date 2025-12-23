import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { 
  Search, 
  Heart, 
  Send, 
  ShoppingCart, 
  PawPrint,
  Coins,
  Sparkles,
  ChevronLeft,
  Home,
  Compass,
  User,
  Plus,
  Bookmark
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePoints } from "@/contexts/PointsContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StoriesBar } from "@/components/StoriesBar";
import giftIcon from "@/assets/gift-icon.gif";

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

  // Fetch posts
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
        setPosts(data as unknown as Post[]);
      }
      setIsLoading(false);
    };
    
    fetchPosts();
  }, [activeTab]);

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

  // Calculate cashback progress
  const cashbackProgress = Math.min((totalPoints * 0.01) / 50 * 100, 100);
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ==================== HEADER - 80px ==================== */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white border-b border-border px-4 z-50 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <h1 
            className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            🐾 PetID
          </h1>
        </div>
        
        {/* Profile Icon - Right */}
        <button 
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <User className="w-6 h-6 text-foreground" />
        </button>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-20" />

      {/* Main Content */}
      <div ref={scrollContainerRef} className="overflow-y-auto">
        
        {/* ==================== WALLET CONTAINER ==================== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-4 rounded-xl"
          style={{ backgroundColor: '#F5F5F5' }}
          dir="rtl"
        >
          <p className="text-sm text-foreground text-center">
            חסכת כבר <span className="font-bold text-primary">₪{(totalPoints * 0.01).toFixed(2)}</span> מהקניות האחרונות שלך
          </p>
        </motion.section>

        {/* ==================== XP CONTAINER ==================== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-4 mt-4 p-4 bg-card rounded-xl border border-border"
          dir="rtl"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">XP Level</span>
            <span className="text-primary font-bold">{totalPoints} XP</span>
          </div>
          <Progress value={xpProgress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            רמה {Math.floor(totalPoints / 1000) + 1}
          </p>
        </motion.section>

        {/* ==================== PRODUCTS/CATEGORIES GRID ==================== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mx-4 mt-4"
          dir="rtl"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">קטגוריות</h3>
          <div className="grid grid-cols-4 gap-3">
            {['מזון', 'צעצועים', 'טיפוח', 'בריאות'].map((category, index) => (
              <motion.div
                key={category}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="aspect-square bg-muted rounded-xl flex items-center justify-center cursor-pointer"
                onClick={() => navigate('/shop')}
              >
                <span className="text-xs text-muted-foreground">{category}</span>
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
            className="px-4 mb-4"
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
        <section className="sticky top-11 bg-background z-40 border-b border-border">
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
                  onClick={() => navigate(`/post/${post.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ==================== BOTTOM NAV ==================== */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-background border-t border-border flex items-center justify-around z-50">
        <Link to="/" className="flex flex-col items-center justify-center flex-1 py-2">
          <Home className="w-6 h-6 text-foreground" />
        </Link>
        <Link to="/explore" className="flex flex-col items-center justify-center flex-1 py-2">
          <Compass className="w-6 h-6 text-muted-foreground" />
        </Link>
        <button className="flex flex-col items-center justify-center flex-1 py-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Plus className="w-6 h-6 text-primary-foreground" />
          </div>
        </button>
        <Link to="/shop" className="flex flex-col items-center justify-center flex-1 py-2">
          <ShoppingCart className="w-6 h-6 text-muted-foreground" />
        </Link>
        <Link to="/profile" className="flex flex-col items-center justify-center flex-1 py-2">
          <User className="w-6 h-6 text-muted-foreground" />
        </Link>
      </nav>
    </div>
  );
}

// Simple Post Card Component
interface SimplePostCardProps {
  post: Post;
  getTimeAgo: (dateString: string) => string;
  onClick: () => void;
}

const SimplePostCard = ({ post, getTimeAgo, onClick }: SimplePostCardProps) => {
  const [liked, setLiked] = useState(false);
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
          <button onClick={() => setLiked(!liked)}>
            <Heart 
              className={`w-6 h-6 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} 
            />
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
