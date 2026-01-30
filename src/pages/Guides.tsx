import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, Plus, Search, MapPin, ShoppingBag, Image, 
  Bookmark, BookmarkCheck, Eye, ChevronLeft, MoreHorizontal,
  Heart, Share2, Trash2, Edit, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import BottomNav from "@/components/BottomNav";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ContentGuide {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  guide_type: "places" | "products" | "posts";
  is_published: boolean;
  view_count: number;
  save_count: number;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  items_count?: number;
  is_saved?: boolean;
}

interface GuideItem {
  id: string;
  guide_id: string;
  item_type: string;
  item_id: string;
  display_order: number;
  note: string | null;
  item_data?: any;
}

const guideTypeIcons = {
  places: MapPin,
  products: ShoppingBag,
  posts: Image,
};

const guideTypeLabels = {
  places: "מקומות",
  products: "מוצרים",
  posts: "פוסטים",
};

const Guides = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [guides, setGuides] = useState<ContentGuide[]>([]);
  const [myGuides, setMyGuides] = useState<ContentGuide[]>([]);
  const [savedGuides, setSavedGuides] = useState<ContentGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"discover" | "my" | "saved">("discover");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<ContentGuide | null>(null);
  const [guideItems, setGuideItems] = useState<GuideItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Create guide form
  const [newGuide, setNewGuide] = useState({
    title: "",
    description: "",
    guide_type: "places" as "places" | "products" | "posts",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchGuides();
    if (user) {
      fetchMyGuides();
      fetchSavedGuides();
    }
  }, [user]);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("content_guides")
        .select("*")
        .eq("is_published", true)
        .order("view_count", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user profiles and items count for each guide
      const guidesWithData = await Promise.all(
        (data || []).map(async (guide) => {
          // Get profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", guide.user_id)
            .single();

          // Get items count
          const { count } = await supabase
            .from("guide_items")
            .select("id", { count: "exact", head: true })
            .eq("guide_id", guide.id);

          // Check if saved
          let is_saved = false;
          if (user) {
            const { data: saved } = await supabase
              .from("saved_guides")
              .select("id")
              .eq("guide_id", guide.id)
              .eq("user_id", user.id)
              .maybeSingle();
            is_saved = !!saved;
          }

          return {
            ...guide,
            profile: profileData || undefined,
            items_count: count || 0,
            is_saved,
          };
        })
      );

      setGuides(guidesWithData as ContentGuide[]);
    } catch (error) {
      console.error("Error fetching guides:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGuides = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("content_guides")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const guidesWithCounts = await Promise.all(
        (data || []).map(async (guide) => {
          const { count } = await supabase
            .from("guide_items")
            .select("id", { count: "exact", head: true })
            .eq("guide_id", guide.id);
          return { ...guide, items_count: count || 0 };
        })
      );

      setMyGuides(guidesWithCounts as ContentGuide[]);
    } catch (error) {
      console.error("Error fetching my guides:", error);
    }
  };

  const fetchSavedGuides = async () => {
    if (!user) return;
    try {
      // Get saved guide IDs first
      const { data: savedData, error: savedError } = await supabase
        .from("saved_guides")
        .select("guide_id")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (savedError) throw savedError;

      if (!savedData || savedData.length === 0) {
        setSavedGuides([]);
        return;
      }

      // Fetch the actual guides
      const guideIds = savedData.map((s) => s.guide_id);
      const { data: guidesData, error: guidesError } = await supabase
        .from("content_guides")
        .select("*")
        .in("id", guideIds);

      if (guidesError) throw guidesError;

      // Get profile data for each guide
      const guidesWithProfiles = await Promise.all(
        (guidesData || []).map(async (guide) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", guide.user_id)
            .single();
          return { ...guide, profile: profileData || undefined, is_saved: true };
        })
      );

      setSavedGuides(guidesWithProfiles as ContentGuide[]);
    } catch (error) {
      console.error("Error fetching saved guides:", error);
    }
  };

  const createGuide = async () => {
    if (!user || !newGuide.title.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("content_guides")
        .insert({
          user_id: user.id,
          title: newGuide.title,
          description: newGuide.description || null,
          guide_type: newGuide.guide_type,
          is_published: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "המדריך נוצר בהצלחה! 📚" });
      setCreateDialogOpen(false);
      setNewGuide({ title: "", description: "", guide_type: "places" });
      fetchMyGuides();
      setActiveTab("my");
    } catch (error) {
      console.error("Error creating guide:", error);
      toast({
        title: "שגיאה ביצירת המדריך",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleSaveGuide = async (guide: ContentGuide) => {
    if (!user) {
      toast({ title: "יש להתחבר כדי לשמור מדריכים" });
      return;
    }

    try {
      if (guide.is_saved) {
        await supabase
          .from("saved_guides")
          .delete()
          .eq("guide_id", guide.id)
          .eq("user_id", user.id);

        toast({ title: "המדריך הוסר מהשמורים" });
      } else {
        await supabase
          .from("saved_guides")
          .insert({ guide_id: guide.id, user_id: user.id });

        toast({ title: "המדריך נשמר! 🔖" });
      }

      // Update local state
      setGuides((prev) =>
        prev.map((g) =>
          g.id === guide.id ? { ...g, is_saved: !g.is_saved } : g
        )
      );
      fetchSavedGuides();
    } catch (error) {
      console.error("Error toggling save:", error);
    }
  };

  const deleteGuide = async (guideId: string) => {
    if (!user) return;

    try {
      await supabase.from("content_guides").delete().eq("id", guideId);
      toast({ title: "המדריך נמחק" });
      fetchMyGuides();
    } catch (error) {
      console.error("Error deleting guide:", error);
    }
  };

  const openGuideDetail = async (guide: ContentGuide) => {
    setSelectedGuide(guide);
    setLoadingItems(true);

    // Increment view count
    await supabase
      .from("content_guides")
      .update({ view_count: (guide.view_count || 0) + 1 })
      .eq("id", guide.id);

    // Fetch items
    try {
      const { data, error } = await supabase
        .from("guide_items")
        .select("*")
        .eq("guide_id", guide.id)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Fetch item data based on type
      const itemsWithData = await Promise.all(
        (data || []).map(async (item) => {
          let item_data = null;
          
          if (item.item_type === "post") {
            const { data: post } = await supabase
              .from("posts")
              .select("id, image_url, caption")
              .eq("id", item.item_id)
              .single();
            item_data = post;
          } else if (item.item_type === "product") {
            const { data: product } = await supabase
              .from("business_products")
              .select("id, name, image_url, price")
              .eq("id", item.item_id)
              .single();
            item_data = product;
          } else if (item.item_type === "park") {
            const { data: park } = await supabase
              .from("dog_parks")
              .select("id, name, city, rating")
              .eq("id", item.item_id)
              .single();
            item_data = park;
          } else if (item.item_type === "business") {
            const { data: business } = await supabase
              .from("business_profiles")
              .select("id, business_name, logo_url, city")
              .eq("id", item.item_id)
              .single();
            item_data = business;
          }

          return { ...item, item_data };
        })
      );

      setGuideItems(itemsWithData);
    } catch (error) {
      console.error("Error fetching guide items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const filteredGuides = (
    activeTab === "my" ? myGuides : activeTab === "saved" ? savedGuides : guides
  ).filter(
    (guide) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <AppHeader title="מדריכים" showBackButton />

      {/* Tabs */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="px-4 py-3">
          <div className="flex gap-2">
            {[
              { id: "discover", label: "גלה" },
              { id: "my", label: "שלי" },
              { id: "saved", label: "שמורים" },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="rounded-full"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש מדריכים..."
              className="pr-10 rounded-xl bg-muted/50 border-0"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Create Button (for logged in users) */}
        {user && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mb-4 p-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center gap-2 text-primary font-medium"
              >
                <Plus className="w-5 h-5" />
                צור מדריך חדש
              </motion.button>
            </DialogTrigger>
            <DialogContent className="max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>מדריך חדש</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>שם המדריך</Label>
                  <Input
                    value={newGuide.title}
                    onChange={(e) =>
                      setNewGuide({ ...newGuide, title: e.target.value })
                    }
                    placeholder="לדוגמה: גינות כלבים מומלצות בתל אביב"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>תיאור (אופציונלי)</Label>
                  <Textarea
                    value={newGuide.description}
                    onChange={(e) =>
                      setNewGuide({ ...newGuide, description: e.target.value })
                    }
                    placeholder="ספר על המדריך שלך..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>סוג המדריך</Label>
                  <RadioGroup
                    value={newGuide.guide_type}
                    onValueChange={(value: any) =>
                      setNewGuide({ ...newGuide, guide_type: value })
                    }
                    className="mt-2 grid grid-cols-3 gap-2"
                  >
                    {Object.entries(guideTypeLabels).map(([type, label]) => {
                      const Icon = guideTypeIcons[type as keyof typeof guideTypeIcons];
                      return (
                        <div key={type}>
                          <RadioGroupItem
                            value={type}
                            id={type}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={type}
                            className="flex flex-col items-center gap-2 rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-sm">{label}</span>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
                <Button
                  onClick={createGuide}
                  disabled={!newGuide.title.trim() || creating}
                  className="w-full"
                >
                  {creating ? "יוצר..." : "צור מדריך"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Guides Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-2xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : filteredGuides.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {activeTab === "my"
                ? "עדיין לא יצרת מדריכים"
                : activeTab === "saved"
                ? "עדיין לא שמרת מדריכים"
                : "לא נמצאו מדריכים"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredGuides.map((guide) => {
              const Icon = guideTypeIcons[guide.guide_type];
              return (
                <motion.div
                  key={guide.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openGuideDetail(guide)}
                  className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-border/30 cursor-pointer group"
                >
                  {/* Cover Image */}
                  {guide.cover_image_url ? (
                    <img
                      src={guide.cover_image_url}
                      alt={guide.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="w-12 h-12 text-primary/30" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Type Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="secondary"
                      className="bg-black/40 text-white border-0 backdrop-blur-sm"
                    >
                      <Icon className="w-3 h-3 ml-1" />
                      {guideTypeLabels[guide.guide_type]}
                    </Badge>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSaveGuide(guide);
                    }}
                    className="absolute top-3 left-3 p-2 rounded-full bg-black/40 backdrop-blur-sm"
                  >
                    {guide.is_saved ? (
                      <BookmarkCheck className="w-4 h-4 text-white fill-white" />
                    ) : (
                      <Bookmark className="w-4 h-4 text-white" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="absolute bottom-0 right-0 left-0 p-3">
                    <h3 className="font-bold text-white text-sm line-clamp-2 mb-1">
                      {guide.title}
                    </h3>
                    {guide.profile && (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={guide.profile.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {guide.profile.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white/80 truncate">
                          {guide.profile.full_name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {guide.view_count}
                      </span>
                      <span>{guide.items_count} פריטים</span>
                    </div>
                  </div>

                  {/* Delete button for own guides */}
                  {activeTab === "my" && guide.user_id === user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-3 left-10 p-2 rounded-full bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4 text-white" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGuide(guide.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          מחק
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guide Detail Modal */}
      <AnimatePresence>
        {selectedGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30">
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={() => setSelectedGuide(null)}
                  className="p-2 -m-2"
                >
                  <X className="w-6 h-6" />
                </button>
                <h1 className="font-semibold">{selectedGuide.title}</h1>
                <div className="w-6" />
              </div>
            </div>

            {/* Cover */}
            <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
              {selectedGuide.cover_image_url ? (
                <img
                  src={selectedGuide.cover_image_url}
                  alt={selectedGuide.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  {(() => {
                    const Icon = guideTypeIcons[selectedGuide.guide_type];
                    return <Icon className="w-16 h-16 text-primary/30" />;
                  })()}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>

            {/* Info */}
            <div className="p-4 -mt-8 relative">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedGuide.title}</h2>
                  {selectedGuide.description && (
                    <p className="text-muted-foreground mt-1">
                      {selectedGuide.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleSaveGuide(selectedGuide)}
                  className="p-2 rounded-full bg-muted"
                >
                  {selectedGuide.is_saved ? (
                    <BookmarkCheck className="w-5 h-5 text-primary fill-primary" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                </button>
              </div>

              {selectedGuide.profile && (
                <div className="flex items-center gap-2 mt-4">
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={selectedGuide.profile.avatar_url || undefined}
                    />
                    <AvatarFallback>
                      {selectedGuide.profile.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {selectedGuide.profile.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {guideItems.length} פריטים • {selectedGuide.view_count} צפיות
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="p-4 space-y-3">
              {loadingItems ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : guideItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>המדריך ריק</p>
                </div>
              ) : (
                guideItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/50"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {item.item_data?.image_url ||
                      item.item_data?.logo_url ? (
                        <img
                          src={
                            item.item_data.image_url ||
                            item.item_data.logo_url
                          }
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {item.item_type === "post" && <Image className="w-6 h-6" />}
                          {item.item_type === "product" && <ShoppingBag className="w-6 h-6" />}
                          {item.item_type === "park" && <MapPin className="w-6 h-6" />}
                          {item.item_type === "business" && <MapPin className="w-6 h-6" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.item_data?.name ||
                          item.item_data?.business_name ||
                          item.item_data?.caption?.slice(0, 30) ||
                          "פריט"}
                      </p>
                      {item.note && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.note}
                        </p>
                      )}
                      {item.item_data?.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {item.item_data.city}
                        </p>
                      )}
                      {item.item_data?.price && (
                        <p className="text-sm font-medium text-primary mt-1">
                          ₪{item.item_data.price}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {index + 1}
                    </Badge>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Guides;
