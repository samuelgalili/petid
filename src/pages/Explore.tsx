import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp, Hash, MapPin, Grid3X3, Play, Heart, MessageCircle, Trees, Tag, Star, Sparkles, Lightbulb, Flame, Dog, Cat, PawPrint, Filter, ShoppingBag, ArrowLeft, Compass, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PetSearch } from "@/components/PetSearch";

// Park images
import parkImage1 from "@/assets/parks/dog-park-1.jpg";
import parkImage2 from "@/assets/parks/dog-park-2.jpg";
import parkImage3 from "@/assets/parks/dog-park-3.jpg";
import parkImage4 from "@/assets/parks/dog-park-4.jpg";
import parkImage5 from "@/assets/parks/dog-park-5.jpg";
import parkImage6 from "@/assets/parks/dog-park-6.jpg";

// Product images for deals
import dogFood from "@/assets/products/dog-food.jpg";
import catFood from "@/assets/products/cat-food.jpg";
import dogTreats from "@/assets/products/dog-treats.jpg";
import dogToys from "@/assets/products/dog-toys.jpg";
import petBed from "@/assets/products/pet-bed.jpg";
import petCollar from "@/assets/products/pet-collar.jpg";

// Pet default avatar
import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import petidIcon from "@/assets/petid-icon.png";

const parkImages = [parkImage1, parkImage2, parkImage3, parkImage4, parkImage5, parkImage6];
const productImages = [dogFood, catFood, dogTreats, dogToys, petBed, petCollar];

// Common dog breeds in Hebrew
const dogBreeds = [
  "כל הגזעים",
  "מעורב",
  "לברדור רטריבר",
  "גולדן רטריבר",
  "בולדוג צרפתי",
  "פודל",
  "ביגל",
  "רוטווילר",
  "יורקשייר טרייר",
  "בוקסר",
  "שיצו",
  "האסקי סיבירי",
  "גרמן שפרד",
  "מלינואה",
  "פיטבול",
  "צ'יוואווה",
  "שיבה אינו",
  "קוקר ספניאל",
  "בורדר קולי",
  "ג'ק ראסל",
  "פומרניאן",
];

// Common cat breeds in Hebrew
const catBreeds = [
  "כל הגזעים",
  "מעורב",
  "חתול בית",
  "פרסי",
  "סיאמי",
  "מיין קון",
  "בריטי קצר שיער",
  "רגדול",
  "בנגלי",
  "אביסיני",
  "סקוטי מקופל",
  "בירמן",
  "ספינקס",
  "רוסי כחול",
  "נורווגי יער",
];

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

interface DogPark {
  id: string;
  name: string;
  address: string;
  city: string;
  rating: number | null;
  total_reviews: number | null;
  water: boolean | null;
  shade: boolean | null;
  fencing: boolean | null;
  latitude: number | null;
  longitude: number | null;
  distance?: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface ProductDeal {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  category: string | null;
}

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  avatar_url: string | null;
  user_id: string;
  gender: string | null;
  age: number | null;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

const trendingTags = [
  { tag: "כלבים_שמחים", posts: 12400 },
  { tag: "חתולים_חמודים", posts: 8900 },
  { tag: "אימוץ_חיות", posts: 5600 },
  { tag: "טיפים_לכלבים", posts: 4200 },
  { tag: "חיות_מחמד", posts: 15800 },
  { tag: "גורים", posts: 9300 },
];

interface AIInsight {
  type: "trend" | "recommendation" | "highlight";
  title: string;
  description: string;
  relevance_score: number;
}

interface SmartDiscoveryResult {
  insights: AIInsight[];
  trending_topics: string[];
  summary: string;
}

const Explore = () => {
  const navigate = useNavigate();
  const { checkAuth } = useRequireAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState("top");
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [parks, setParks] = useState<DogPark[]>([]);
  const [deals, setDeals] = useState<ProductDeal[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<SmartDiscoveryResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [doubleTapPostId, setDoubleTapPostId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Pet filters
  const [petTypeFilter, setPetTypeFilter] = useState<"all" | "dog" | "cat">("all");
  const [breedFilter, setBreedFilter] = useState("כל הגזעים");
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "כלבי גולדן",
    "חתולים פרסיים",
    "אימוץ בתל אביב"
  ]);

  // Calculate distance between two coordinates in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          console.log("Geolocation error:", error.message);
          setLocationError("לא ניתן לקבל מיקום");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  const fetchSmartDiscovery = async (type: string) => {
    try {
      setLoadingInsights(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await supabase.functions.invoke("smart-discovery", {
        body: { type, userId: user?.id },
      });

      if (response.data?.ai_insights) {
        setAiInsights(response.data.ai_insights);
      }
    } catch (error) {
      console.error("Error fetching smart discovery:", error);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Fetch pets based on filters
  const fetchPets = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("pets")
        .select(`
          id,
          name,
          type,
          breed,
          avatar_url,
          user_id,
          gender,
          age
        `)
        .eq("archived", false);

      // Apply type filter
      if (petTypeFilter !== "all") {
        query = query.eq("type", petTypeFilter);
      }

      // Apply breed filter
      if (breedFilter !== "כל הגזעים") {
        query = query.ilike("breed", `%${breedFilter}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error("Error fetching pets:", error);
    } finally {
      setLoading(false);
    }
  }, [petTypeFilter, breedFilter]);

  useEffect(() => {
    if (activeTab === "pets") {
      fetchPets();
      fetchSmartDiscovery("pets");
    } else if (activeTab === "parks") {
      fetchParks();
      fetchSmartDiscovery("parks");
    } else if (activeTab === "deals") {
      fetchDeals();
      fetchSmartDiscovery("deals");
    } else if (activeTab === "top" || activeTab === "feeds") {
      fetchExplorePosts();
      fetchSmartDiscovery("posts");
    }
  }, [activeTab, userLocation, fetchPets]);

  const fetchParks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dog_parks")
        .select("id, name, address, city, rating, total_reviews, water, shade, fencing, latitude, longitude")
        .eq("status", "approved")
        .limit(50);

      if (error) throw error;
      
      let parksData = data || [];
      
      // Calculate distance and sort by proximity if user location is available
      if (userLocation && parksData.length > 0) {
        parksData = parksData.map(park => ({
          ...park,
          distance: park.latitude && park.longitude 
            ? calculateDistance(userLocation.latitude, userLocation.longitude, park.latitude, park.longitude)
            : 999999
        })).sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
      } else {
        // Sort by rating if no location
        parksData = parksData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }
      
      setParks(parksData.slice(0, 20));
    } catch (error) {
      console.error("Error fetching parks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("business_products")
        .select("id, name, price, sale_price, image_url, category")
        .not("sale_price", "is", null)
        .eq("in_stock", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24" dir="rtl">
      {/* Hero Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/20">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
          <div className="flex items-center gap-3">
            <img src={petidIcon} alt="PetID" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-foreground">גלה</h1>
              <p className="text-xs text-muted-foreground">חקור את עולם החיות</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/notifications")}
            className="w-10 h-10 rounded-2xl hover:bg-muted/80"
          >
            <Zap className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-2">
          <div className="relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Search className="w-4 h-4 text-primary" />
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="חפש חיות, גזעים, בעלים..."
              className="pr-14 pl-12 h-12 rounded-2xl bg-card border-2 border-border/30 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all text-base font-sans"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs - Pill Style */}
        {!isSearchFocused && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {[
                { id: "top", label: "מובילים", icon: TrendingUp, color: "purple" },
                { id: "parks", label: "גינות", icon: Trees, color: "green" },
                { id: "deals", label: "מבצעים", icon: Tag, color: "orange" },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-card border border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Pet Filters - Only show when pets tab is active */}
        {!isSearchFocused && activeTab === "pets" && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 space-y-3 border-t border-border/20 bg-gradient-to-b from-muted/20 to-transparent"
          >
            {/* Pet Type Filter */}
            <div className="flex gap-2">
              <Button
                variant={petTypeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPetTypeFilter("all");
                  setBreedFilter("כל הגזעים");
                }}
                className={`rounded-2xl gap-2 h-10 px-4 transition-all duration-200 ${
                  petTypeFilter === "all" 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "bg-card border-border/50 hover:bg-muted/50 hover:border-primary/30"
                }`}
              >
                <PawPrint className="w-4 h-4" />
                הכל
              </Button>
              <Button
                variant={petTypeFilter === "dog" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPetTypeFilter("dog");
                  setBreedFilter("כל הגזעים");
                }}
                className={`rounded-2xl gap-2 h-10 px-4 transition-all duration-200 ${
                  petTypeFilter === "dog" 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "bg-card border-border/50 hover:bg-muted/50 hover:border-primary/30"
                }`}
              >
                <Dog className="w-4 h-4" />
                כלבים
              </Button>
              <Button
                variant={petTypeFilter === "cat" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPetTypeFilter("cat");
                  setBreedFilter("כל הגזעים");
                }}
                className={`rounded-2xl gap-2 h-10 px-4 transition-all duration-200 ${
                  petTypeFilter === "cat" 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "bg-card border-border/50 hover:bg-muted/50 hover:border-primary/30"
                }`}
              >
                <Cat className="w-4 h-4" />
                חתולים
              </Button>
            </div>

            {/* Breed Filter */}
            {petTypeFilter !== "all" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4 text-primary/60" />
                <Select value={breedFilter} onValueChange={setBreedFilter}>
                  <SelectTrigger className="w-[180px] h-10 rounded-2xl text-sm border-border/50 bg-card shadow-soft">
                    <SelectValue placeholder="בחר גזע" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-card border-border/50 shadow-elevated z-50">
                    {(petTypeFilter === "dog" ? dogBreeds : catBreeds).map((breed) => (
                      <SelectItem key={breed} value={breed} className="rounded-lg">
                        {breed}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </motion.div>
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

      {/* Points Missions Section */}
      {!isSearchFocused && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2"
        >
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: "share-post", icon: Heart, title: "שתף רגע מתוק", points: 10, color: "bg-pink-100 dark:bg-pink-900/30", iconColor: "text-pink-500", link: "/tasks" },
              { id: "add-pet-photo", icon: PawPrint, title: "העלה תמונה", points: 15, color: "bg-primary/10", iconColor: "text-primary", link: "/tasks" },
              { id: "breed-info", icon: Dog, title: "גלה על הגזע", points: 10, color: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-500", link: "/breed-history" },
              { id: "visit-park", icon: Trees, title: "טייל בגינה", points: 20, color: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-500", link: "/parks" },
              { id: "invite-friend", icon: Star, title: "הזמן חבר", points: 50, color: "bg-yellow-100 dark:bg-yellow-900/30", iconColor: "text-yellow-500", link: "/tasks" },
            ].map((mission, idx) => {
              const Icon = mission.icon;
              return (
                <motion.div 
                  key={mission.id} 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => navigate(mission.link)}
                  className="flex-shrink-0 w-44 bg-card rounded-xl px-3 py-2.5 border border-border/40 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${mission.color}`}>
                        <Icon className={`w-3.5 h-3.5 ${mission.iconColor}`} />
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate">{mission.title}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-primary font-bold text-left">+{mission.points} נקודות</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Content based on active tab */}
      {!isSearchFocused && (
        <div className="px-4 pb-4">
          {loading ? (
            /* Enhanced Skeleton Grid */
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="aspect-[4/5] bg-gradient-to-br from-muted to-muted/50 rounded-3xl animate-pulse"
                />
              ))}
            </div>
          ) : activeTab === "pets" ? (
            /* Pets Tab - Enhanced Card Design */
            <div className="space-y-4">
              {/* Pet Search Component */}
              <PetSearch className="" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {pets.length} חיות נמצאו
                  {petTypeFilter !== "all" && ` • ${petTypeFilter === "dog" ? "כלבים" : "חתולים"}`}
                  {breedFilter !== "כל הגזעים" && ` • ${breedFilter}`}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {pets.length > 0 ? (
                  pets.map((pet, index) => (
                    <motion.div
                      key={pet.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => navigate(`/pet/${pet.id}`)}
                      className="relative cursor-pointer group"
                    >
                      <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-card border border-border/30 shadow-sm hover:shadow-lg transition-all duration-300">
                        <img
                          src={pet.avatar_url || defaultPetAvatar}
                          alt={pet.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        {/* Pet type badge */}
                        <div className="absolute top-3 right-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center backdrop-blur-md ${
                            pet.type === "dog" 
                              ? "bg-amber-500/80" 
                              : "bg-purple-500/80"
                          }`}>
                            {pet.type === "dog" ? (
                              <Dog className="w-5 h-5 text-white" />
                            ) : (
                              <Cat className="w-5 h-5 text-white" />
                            )}
                          </div>
                        </div>
                        
                        {/* Pet info */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-bold text-lg mb-1">{pet.name}</h3>
                          {pet.breed && (
                            <p className="text-white/80 text-sm mb-2">{pet.breed}</p>
                          )}
                          <div className="flex items-center gap-2">
                            {pet.gender && (
                              <span className="text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-lg">
                                {pet.gender === "male" ? "זכר" : "נקבה"}
                              </span>
                            )}
                            {pet.age && (
                              <span className="text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-lg">
                                {pet.age} שנים
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="col-span-2 text-center py-16 px-6"
                  >
                    <div className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "reverse"
                        }}
                      >
                        <PawPrint className="w-14 h-14 text-primary/50" />
                      </motion.div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      לא נמצאו חיות 🐾
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      נסו לשנות את הפילטרים או לחפש משהו אחר
                    </p>
                    <Button
                      onClick={() => {
                        setPetTypeFilter("all");
                        setBreedFilter("כל הגזעים");
                      }}
                      className="rounded-2xl gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                    >
                      <X className="w-4 h-4" />
                      נקה פילטרים
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          ) : activeTab === "parks" ? (
            /* Parks - Enhanced Card Design */
            <div className="space-y-4">
              {userLocation && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-2xl p-3">
                  <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm text-green-700 dark:text-green-300">ממויין לפי קרבה אליך</span>
                </div>
              )}
              {!userLocation && locationError && (
                <div className="flex items-center gap-2 bg-muted/50 rounded-2xl p-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">ממויין לפי דירוג</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                {parks.length > 0 ? (
                  parks.map((park, index) => (
                    <motion.div
                      key={park.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => navigate("/parks")}
                      className="relative cursor-pointer group"
                    >
                      <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-card border border-border/30 shadow-sm hover:shadow-lg transition-all duration-300">
                        <img
                          src={parkImages[index % parkImages.length]}
                          alt={park.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        {/* Distance badge */}
                        {park.distance !== undefined && park.distance < 999999 && (
                          <div className="absolute top-3 left-3">
                            <div className="bg-white/90 backdrop-blur-md rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
                              <MapPin className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-xs font-semibold text-foreground">{park.distance.toFixed(1)} ק״מ</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Park icon */}
                        <div className="absolute top-3 right-3">
                          <div className="w-9 h-9 rounded-2xl bg-green-500/80 backdrop-blur-md flex items-center justify-center">
                            <Trees className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        
                        {/* Park info */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">{park.name}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-3.5 h-3.5 text-white/80" />
                            <span className="text-white/80 text-sm">{park.city}</span>
                          </div>
                          {park.rating && (
                            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1 w-fit">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              <span className="text-white text-sm font-medium">{park.rating.toFixed(1)}</span>
                              {park.total_reviews && (
                                <span className="text-white/70 text-xs">({park.total_reviews})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="col-span-2 text-center py-16 px-6"
                  >
                    <div className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 flex items-center justify-center">
                      <Trees className="w-14 h-14 text-green-500/50" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">אין גינות כלבים 🌳</h3>
                    <p className="text-muted-foreground">לא נמצאו גינות כלבים באזורך</p>
                  </motion.div>
                )}
              </div>
            </div>
          ) : activeTab === "deals" ? (
            /* Deals - Real Products on Sale */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {deals.length > 0 ? (
                  deals.map((deal, index) => {
                    const discountPercent = deal.sale_price ? Math.round((1 - deal.sale_price / deal.price) * 100) : 0;
                    return (
                      <motion.div
                        key={deal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => navigate(`/product/${deal.id}`)}
                        className="relative cursor-pointer group"
                      >
                        <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-card border border-border/30 shadow-sm hover:shadow-lg transition-all duration-300">
                          <img
                            src={deal.image_url || productImages[index % productImages.length]}
                            alt={deal.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          
                          {/* Deal badge */}
                          <div className="absolute top-3 right-3">
                            <div className="bg-red-500 text-white rounded-xl px-3 py-1.5 font-bold text-sm shadow-lg">
                              {discountPercent}% הנחה
                            </div>
                          </div>
                          
                          {/* Deal info */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">{deal.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white font-bold text-lg">₪{deal.sale_price}</span>
                              <span className="text-white/60 line-through text-sm">₪{deal.price}</span>
                            </div>
                            {deal.category && (
                              <span className="text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-lg">
                                {deal.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="col-span-2 text-center py-16 px-6"
                  >
                    <div className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 flex items-center justify-center">
                      <Tag className="w-14 h-14 text-orange-500/50" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">אין מבצעים כרגע 🏷️</h3>
                    <p className="text-muted-foreground mb-6">חזרו בקרוב לעדכונים על מבצעים חדשים</p>
                    <Button
                      onClick={() => navigate("/shop")}
                      className="rounded-2xl gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      לחנות
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          ) : (
            /* Posts Grid - Enhanced Design for top tab */
            <div className="space-y-4">
              {posts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative cursor-pointer group"
                      onClick={() => navigate(`/post/${post.id}`)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleDoubleTap(post.id);
                      }}
                    >
                      <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-card border border-border/30 shadow-sm hover:shadow-lg transition-all duration-300">
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        
                        {/* Video indicator */}
                        {post.media_type === "video" && (
                          <div className="absolute top-3 left-3">
                            <div className="w-9 h-9 rounded-2xl bg-black/50 backdrop-blur-md flex items-center justify-center">
                              <Play className="w-5 h-5 text-white" fill="white" />
                            </div>
                          </div>
                        )}

                        {/* Stats overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-white">
                              <Heart className="w-5 h-5" fill="white" />
                              <span className="text-sm font-semibold">{post.likes_count}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-white">
                              <MessageCircle className="w-5 h-5" fill="white" />
                              <span className="text-sm font-semibold">{post.comments_count}</span>
                            </div>
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
                                className="w-24 h-24 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
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
                              {[...Array(8)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="absolute w-2.5 h-2.5 rounded-full bg-white"
                                  initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                  animate={{ 
                                    scale: [0, 1, 0],
                                    x: Math.cos((i / 8) * Math.PI * 2) * 60,
                                    y: Math.sin((i / 8) * Math.PI * 2) * 60,
                                    opacity: [1, 1, 0]
                                  }}
                                  transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                                />
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 px-6"
                >
                  <div className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 flex items-center justify-center">
                    <TrendingUp className="w-14 h-14 text-purple-500/50" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">אין פוסטים מובילים 📈</h3>
                  <p className="text-muted-foreground">חזרו בקרוב לראות תוכן טרנדי</p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Explore;
