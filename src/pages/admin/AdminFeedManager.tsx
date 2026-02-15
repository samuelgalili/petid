import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tv, Plus, Upload, Image, Video, Search, Filter,
  Eye, Heart, ShoppingCart, Calendar, Clock, Tag,
  PawPrint, Baby, Stethoscope, Target, Package,
  BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight,
  MoreVertical, Trash2, Edit, Pin, Star, Globe,
  X, Check, Loader2, FileText, Sparkles, Brain,
  Wand2, Send, AlertTriangle, MapPin, Zap,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { he } from "date-fns/locale";

// ─── Types ───
interface PostWithStats {
  id: string;
  caption: string | null;
  image_url: string;
  video_url: string | null;
  media_type: string | null;
  views_count: number | null;
  is_featured: boolean | null;
  is_pinned: boolean | null;
  created_at: string;
  user_id: string;
  pet_id: string | null;
  user?: { full_name: string; avatar_url: string; username: string };
  likes_count?: number;
  comments_count?: number;
}

// ─── Constants ───
const SPECIES_OPTIONS = [
  { value: "all", label: "הכל", icon: PawPrint },
  { value: "dog", label: "כלבים", icon: PawPrint },
  { value: "cat", label: "חתולים", icon: PawPrint },
];

const AGE_OPTIONS = [
  { value: "all", label: "כל הגילאים" },
  { value: "puppy", label: "גורים (0-1)" },
  { value: "adult", label: "בוגרים (1-7)" },
  { value: "senior", label: "מבוגרים (7+)" },
];

const MEDICAL_TAGS = [
  "Joint Issues", "Urinary", "Gastro", "Skin & Coat",
  "Weight Management", "Dental", "Cardiac", "Puppy Growth",
  "Senior Care", "Allergies",
];

const AdminFeedManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── State ───
  const [activeTab, setActiveTab] = useState("posts");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "scheduled">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newTitleEn, setNewTitleEn] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [newCaptionEn, setNewCaptionEn] = useState("");
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newMediaPreview, setNewMediaPreview] = useState<string | null>(null);
  const [newMediaType, setNewMediaType] = useState<"image" | "video">("image");
  const [targetSpecies, setTargetSpecies] = useState("all");
  const [targetAge, setTargetAge] = useState("all");
  const [targetMedicalTags, setTargetMedicalTags] = useState<string[]>([]);
  const [targetBreed, setTargetBreed] = useState("");
  const [taggedProducts, setTaggedProducts] = useState<Array<{ id: string; name: string; image_url: string; price: number }>>([]);
  const [productSearch, setProductSearch] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Post Generation state
  const [aiPost, setAiPost] = useState<{
    title_he: string; title_en: string;
    caption_he: string; caption_en: string;
    target_species: string; target_age: string;
    medical_tags?: string[]; target_city?: string;
    trend_summary: string; urgency: string;
    suggested_products?: string[];
  } | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isPublishingAI, setIsPublishingAI] = useState(false);

  // ─── Queries ───
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["admin-feed-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(`
          id, caption, image_url, video_url, media_type, views_count,
          is_featured, is_pinned, created_at, user_id, pet_id,
          user:profiles!posts_user_id_fkey(full_name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data || []) as unknown as PostWithStats[];
    },
  });

  const { data: scheduledPosts = [] } = useQuery({
    queryKey: ["admin-scheduled-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scheduled_posts")
        .select("*")
        .order("scheduled_for", { ascending: true });
      return data || [];
    },
  });

  const { data: postLikes = [] } = useQuery({
    queryKey: ["admin-post-likes-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_likes")
        .select("post_id");
      return data || [];
    },
  });

  const { data: postComments = [] } = useQuery({
    queryKey: ["admin-post-comments-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("post_id");
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-feed-products", productSearch],
    queryFn: async () => {
      let q = supabase
        .from("business_products")
        .select("id, name, image_url, price")
        .limit(20);
      if (productSearch.trim()) {
        q = q.ilike("name", `%${productSearch}%`);
      }
      const { data } = await q;
      return data || [];
    },
    enabled: createDialogOpen,
  });

  const { data: breeds = [] } = useQuery({
    queryKey: ["admin-feed-breeds"],
    queryFn: async () => {
      const { data } = await supabase
        .from("breed_information")
        .select("breed_name, breed_name_he")
        .eq("is_active", true)
        .order("breed_name_he");
      return data || [];
    },
    enabled: createDialogOpen,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-feed-orders-conv"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, created_at, user_id")
        .limit(500);
      return data || [];
    },
  });

  // ─── Computed ───
  const likesMap = useMemo(() => {
    const map: Record<string, number> = {};
    postLikes.forEach(l => { map[l.post_id] = (map[l.post_id] || 0) + 1; });
    return map;
  }, [postLikes]);

  const commentsMap = useMemo(() => {
    const map: Record<string, number> = {};
    postComments.forEach(c => { map[c.post_id] = (map[c.post_id] || 0) + 1; });
    return map;
  }, [postComments]);

  const enrichedPosts = useMemo(() => {
    return posts.map(p => ({
      ...p,
      likes_count: likesMap[p.id] || 0,
      comments_count: commentsMap[p.id] || 0,
    }));
  }, [posts, likesMap, commentsMap]);

  const filteredPosts = useMemo(() => {
    return enrichedPosts.filter(p => {
      const matchSearch = !searchQuery ||
        p.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.user as any)?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [enrichedPosts, searchQuery]);

  // KPIs
  const totalViews = useMemo(() => posts.reduce((s, p) => s + (p.views_count || 0), 0), [posts]);
  const totalLikes = useMemo(() => Object.values(likesMap).reduce((s, v) => s + v, 0), [likesMap]);
  const videoPosts = useMemo(() => posts.filter(p => p.media_type === "video" || p.video_url).length, [posts]);
  const avgEngagement = useMemo(() => {
    if (posts.length === 0) return 0;
    return ((totalLikes + Object.values(commentsMap).reduce((s, v) => s + v, 0)) / posts.length).toFixed(1);
  }, [posts, totalLikes, commentsMap]);

  // ─── Handlers ───
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    setNewMediaType(isVideo ? "video" : "image");
    setNewMediaFile(file);
    setNewMediaPreview(URL.createObjectURL(file));
  };

  const toggleMedicalTag = (tag: string) => {
    setTargetMedicalTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addProduct = (product: typeof products[0]) => {
    if (!taggedProducts.find(p => p.id === product.id)) {
      setTaggedProducts([...taggedProducts, product]);
    }
  };

  const removeProduct = (id: string) => {
    setTaggedProducts(taggedProducts.filter(p => p.id !== id));
  };

  const resetForm = () => {
    setNewTitle(""); setNewTitleEn("");
    setNewCaption(""); setNewCaptionEn("");
    setNewMediaFile(null); setNewMediaPreview(null);
    setNewMediaType("image");
    setTargetSpecies("all"); setTargetAge("all");
    setTargetMedicalTags([]); setTargetBreed("");
    setTaggedProducts([]); setProductSearch("");
    setScheduledDate(""); setScheduledTime("");
  };

  const handleCreatePost = async () => {
    if (!user || !newMediaFile) {
      toast.error("נא להעלות קובץ מדיה");
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload media
      const ext = newMediaFile.name.split(".").pop();
      const path = `admin-content/${Date.now()}.${ext}`;
      const bucket = newMediaType === "video" ? "reels" : "post-images";

      const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, newMediaFile);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

      const isScheduled = scheduledDate && scheduledTime;
      const combinedCaption = [newTitle, newCaption].filter(Boolean).join("\n\n");

      if (isScheduled) {
        const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
        await supabase.from("scheduled_posts").insert({
          user_id: user.id,
          image_url: publicUrl,
          caption: combinedCaption || null,
          scheduled_for: scheduledFor,
          media_urls: newMediaType === "video" ? [publicUrl] : null,
        });
        toast.success("הפוסט תוזמן בהצלחה");
      } else {
        await supabase.from("posts").insert({
          user_id: user.id,
          image_url: publicUrl,
          caption: combinedCaption || null,
          media_type: newMediaType,
          video_url: newMediaType === "video" ? publicUrl : null,
        });
        toast.success("הפוסט פורסם בהצלחה");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-scheduled-posts"] });
      resetForm();
      setCreateDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("שגיאה ביצירת הפוסט");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await supabase.from("posts").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["admin-feed-posts"] });
      toast.success("הפוסט נמחק");
    } catch { toast.error("שגיאה במחיקה"); }
  };

  const handleTogglePin = async (id: string, current: boolean) => {
    await supabase.from("posts").update({ is_pinned: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-feed-posts"] });
    toast.success(!current ? "הפוסט הוצמד" : "הפוסט בוטל מהצמדה");
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    await supabase.from("posts").update({ is_featured: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-feed-posts"] });
    toast.success(!current ? "הפוסט סומן כמומלץ" : "הפוסט הוסר ממומלצים");
  };

  // ─── AI Post Generation ───
  const handleGenerateAIPost = async () => {
    setIsGeneratingAI(true);
    setAiPost(null);
    try {
      // Gather trends from chat feedback
      const { data: chatData } = await supabase
        .from("chat_message_feedback")
        .select("message_content")
        .order("created_at", { ascending: false })
        .limit(50);

      const trendTopics = chatData?.map(c => c.message_content).join("\n") || "No recent chat data";

      // Gather pet stats
      const { data: petData } = await supabase
        .from("pets")
        .select("type, breed, medical_conditions, birth_date")
        .limit(200);

      const dogCount = petData?.filter(p => p.type === "dog").length || 0;
      const catCount = petData?.filter(p => p.type === "cat").length || 0;
      const conditions = petData?.flatMap(p => p.medical_conditions || []) || [];
      const conditionCounts: Record<string, number> = {};
      conditions.forEach(c => { conditionCounts[c] = (conditionCounts[c] || 0) + 1; });
      const topConditions = Object.entries(conditionCounts).sort(([,a],[,b]) => b - a).slice(0, 5);

      const petStats = `Dogs: ${dogCount}, Cats: ${catCount}\nTop conditions: ${topConditions.map(([c,n]) => `${c} (${n})`).join(", ")}`;

      const { data: fnData, error: fnError } = await supabase.functions.invoke("generate-ai-post", {
        body: { trends: trendTopics, petStats },
      });

      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);

      setAiPost(fnData.post);
      toast.success("הפוסט נוצר בהצלחה על ידי AI!");
    } catch (err: any) {
      console.error("AI generation error:", err);
      if (err?.message?.includes("429") || err?.status === 429) {
        toast.error("חריגה ממגבלת בקשות. נסה שוב בעוד דקה");
      } else if (err?.message?.includes("402") || err?.status === 402) {
        toast.error("נדרש טעינת קרדיטים. עבור להגדרות Workspace");
      } else {
        toast.error("שגיאה ביצירת הפוסט");
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleApproveAndPublish = async () => {
    if (!user || !aiPost) return;
    setIsPublishingAI(true);
    try {
      const caption = `${aiPost.title_he}\n\n${aiPost.caption_he}`;
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800",
        caption,
        media_type: "image",
        is_featured: true,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-feed-posts"] });
      toast.success("הפוסט פורסם בהצלחה! 🎉");
      setAiPost(null);
      setActiveTab("posts");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בפרסום הפוסט");
    } finally {
      setIsPublishingAI(false);
    }
  };


  return (
    <AdminLayout title="ניהול פיד ותוכן" icon={Tv} breadcrumbs={[{ label: "פיד ותוכן" }]}>
      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "סה\"כ פוסטים", value: posts.length, icon: FileText, color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
          { label: "צפיות", value: totalViews.toLocaleString(), icon: Eye, color: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-500" },
          { label: "לייקים", value: totalLikes.toLocaleString(), icon: Heart, color: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-500" },
          { label: "מעורבות ממוצעת", value: avgEngagement, icon: TrendingUp, color: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-600" },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                </div>
                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", kpi.color)}>
                  <kpi.icon className={cn("w-5 h-5", kpi.iconColor)} strokeWidth={1.5} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש פוסטים..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              יצירת תוכן חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-right flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
                יצירת תוכן חדש לפיד
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* ── Section 1: Media Upload ── */}
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4" strokeWidth={1.5} />
                  העלאת מדיה
                </Label>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
                {!newMediaPreview ? (
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex items-center justify-center gap-6">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <Image className="w-6 h-6 text-blue-500" strokeWidth={1.5} />
                        </div>
                        <span className="text-xs text-muted-foreground">תמונה</span>
                      </div>
                      <div className="w-px h-12 bg-border" />
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                          <Video className="w-6 h-6 text-violet-500" strokeWidth={1.5} />
                        </div>
                        <span className="text-xs text-muted-foreground">וידאו (9:16)</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">גרור או לחץ להעלאה • תמונה עד 10MB • וידאו עד 50MB</p>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-muted">
                    {newMediaType === "video" ? (
                      <video src={newMediaPreview} className="w-full max-h-64 object-contain" controls muted />
                    ) : (
                      <img src={newMediaPreview} className="w-full max-h-64 object-contain" alt="" />
                    )}
                    <Button
                      size="icon" variant="ghost"
                      className="absolute top-2 left-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8"
                      onClick={() => { setNewMediaFile(null); setNewMediaPreview(null); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      {newMediaType === "video" ? "🎬 וידאו" : "📷 תמונה"}
                    </Badge>
                  </div>
                )}
              </div>

              {/* ── Section 2: Title & Description ── */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4" strokeWidth={1.5} />
                  כותרת ותיאור (עברית / אנגלית)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="כותרת בעברית" value={newTitle} onChange={e => setNewTitle(e.target.value)} dir="rtl" />
                  <Input placeholder="Title in English" value={newTitleEn} onChange={e => setNewTitleEn(e.target.value)} dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Textarea placeholder="תיאור בעברית..." value={newCaption} onChange={e => setNewCaption(e.target.value)} rows={3} dir="rtl" />
                  <Textarea placeholder="Description in English..." value={newCaptionEn} onChange={e => setNewCaptionEn(e.target.value)} rows={3} dir="ltr" />
                </div>
              </div>

              {/* ── Section 3: AI Targeting ── */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/30">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  מנוע טירגוט AI — מי רואה את התוכן
                </Label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">סוג חיה</Label>
                    <Select value={targetSpecies} onValueChange={setTargetSpecies}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SPECIES_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">טווח גילאים</Label>
                    <Select value={targetAge} onValueChange={setTargetAge}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AGE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">תיוג רפואי</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {MEDICAL_TAGS.map(tag => (
                      <Badge
                        key={tag}
                        variant={targetMedicalTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer text-[10px] transition-colors"
                        onClick={() => toggleMedicalTag(tag)}
                      >
                        <Stethoscope className="w-2.5 h-2.5 ml-1" strokeWidth={1.5} />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">גזע ספציפי</Label>
                  <Select value={targetBreed} onValueChange={setTargetBreed}>
                    <SelectTrigger><SelectValue placeholder="כל הגזעים" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הגזעים</SelectItem>
                      {breeds.map(b => (
                        <SelectItem key={b.breed_name} value={b.breed_name}>
                          {b.breed_name_he || b.breed_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Section 4: Product Tagging ── */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/30">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                  תיוג מוצרים (Shoppable Content)
                </Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="חיפוש מוצר לתיוג..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="pr-9 text-sm"
                  />
                </div>
                {productSearch.trim() && products.length > 0 && (
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1">
                      {products.filter(p => !taggedProducts.find(tp => tp.id === p.id)).map(p => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => addProduct(p)}
                        >
                          <img src={p.image_url} className="w-8 h-8 rounded object-cover" alt="" />
                          <span className="text-xs text-foreground flex-1 truncate">{p.name}</span>
                          <span className="text-xs font-semibold text-muted-foreground">₪{p.price}</span>
                          <Plus className="w-3.5 h-3.5 text-primary" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                {taggedProducts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {taggedProducts.map(p => (
                      <Badge key={p.id} variant="secondary" className="gap-1.5 pr-1">
                        <img src={p.image_url} className="w-4 h-4 rounded object-cover" alt="" />
                        {p.name.substring(0, 20)}
                        <button onClick={() => removeProduct(p.id)} className="mr-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Section 5: Scheduling ── */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/30">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
                  תזמון פרסום
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">תאריך</Label>
                    <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">שעה</Label>
                    <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {scheduledDate && scheduledTime
                    ? `📅 מתוזמן ל: ${scheduledDate} בשעה ${scheduledTime}`
                    : "השאר ריק לפרסום מיידי"
                  }
                </p>
              </div>

              {/* ── Submit ── */}
              <div className="flex gap-3">
                <Button className="flex-1 gap-2" onClick={handleCreatePost} disabled={isSubmitting || !newMediaFile}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : scheduledDate ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isSubmitting ? "מעלה..." : scheduledDate ? "תזמן פרסום" : "פרסם עכשיו"}
                </Button>
                <Button variant="outline" onClick={() => { resetForm(); setCreateDialogOpen(false); }}>
                  ביטול
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="posts" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            פוסטים ({filteredPosts.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            מתוזמנים ({scheduledPosts.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            ביצועים
          </TabsTrigger>
          <TabsTrigger value="ai-generate" className="gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            AI Content
          </TabsTrigger>
        </TabsList>

        {/* ── Posts Tab ── */}
        <TabsContent value="posts">
          {loadingPosts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FileText className="w-16 h-16 mb-4 opacity-30" strokeWidth={1.5} />
              <p>אין פוסטים להצגה</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredPosts.map(post => (
                <Card key={post.id} className="overflow-hidden border-border/30 group hover:border-primary/30 transition-colors">
                  <div className="relative aspect-[9/16] bg-muted">
                    {post.video_url || post.media_type === "video" ? (
                      <video src={post.video_url || post.image_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={post.image_url} className="w-full h-full object-cover" alt="" />
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    {/* Top badges */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {post.is_pinned && <Badge className="bg-amber-500/90 text-[9px] px-1.5">📌</Badge>}
                      {post.is_featured && <Badge className="bg-primary/90 text-[9px] px-1.5">⭐</Badge>}
                      {(post.video_url || post.media_type === "video") && (
                        <Badge variant="secondary" className="text-[9px] px-1.5">🎬</Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="secondary" className="w-7 h-7 rounded-full">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => handleTogglePin(post.id, !!post.is_pinned)}>
                            <Pin className="w-3.5 h-3.5 ml-2" />
                            {post.is_pinned ? "בטל הצמדה" : "הצמד"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleFeatured(post.id, !!post.is_featured)}>
                            <Star className="w-3.5 h-3.5 ml-2" />
                            {post.is_featured ? "הסר ממומלצים" : "סמן כמומלץ"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-destructive">
                            <Trash2 className="w-3.5 h-3.5 ml-2" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-5 h-5 border border-white/50">
                          <AvatarImage src={(post.user as any)?.avatar_url} />
                          <AvatarFallback className="text-[8px]">
                            {(post.user as any)?.full_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white text-[11px] font-medium truncate">
                          {(post.user as any)?.username || (post.user as any)?.full_name}
                        </span>
                      </div>
                      {post.caption && (
                        <p className="text-white/80 text-[10px] line-clamp-2 mb-2">{post.caption}</p>
                      )}
                      <div className="flex items-center gap-3 text-white/70 text-[10px]">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.views_count || 0}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{post.likes_count}</span>
                        <span className="flex items-center gap-0.5">💬{post.comments_count}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Scheduled Tab ── */}
        <TabsContent value="scheduled">
          {scheduledPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Clock className="w-16 h-16 mb-4 opacity-30" strokeWidth={1.5} />
              <p>אין פוסטים מתוזמנים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledPosts.map(sp => (
                <Card key={sp.id} className="border-border/30">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img src={sp.image_url} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{sp.caption || "ללא כיתוב"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          <Calendar className="w-3 h-3 ml-1" />
                          {format(new Date(sp.scheduled_for), "dd/MM/yyyy HH:mm", { locale: he })}
                        </Badge>
                        <Badge variant={sp.status === "pending" ? "secondary" : "default"} className="text-[10px]">
                          {sp.status === "pending" ? "ממתין" : sp.status === "published" ? "פורסם" : sp.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top performing posts */}
            <Card className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  פוסטים מובילים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {enrichedPosts
                    .sort((a, b) => ((b.views_count || 0) + (b.likes_count || 0)) - ((a.views_count || 0) + (a.likes_count || 0)))
                    .slice(0, 5)
                    .map((post, i) => {
                      const engagement = (post.views_count || 0) + (post.likes_count || 0) + (post.comments_count || 0);
                      const maxEng = (enrichedPosts[0]?.views_count || 0) + (enrichedPosts[0]?.likes_count || 0) + 1;
                      return (
                        <div key={post.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img src={post.image_url} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{post.caption || "ללא כיתוב"}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              <span>{post.views_count || 0} צפיות</span>
                              <span>{post.likes_count || 0} ❤️</span>
                              <span>{post.comments_count || 0} 💬</span>
                            </div>
                          </div>
                          <Progress value={(engagement / maxEng) * 100} className="w-16 h-1.5" />
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Content breakdown */}
            <Card className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-500" strokeWidth={1.5} />
                  סוגי תוכן
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "📷 תמונות", count: posts.length - videoPosts, color: "bg-blue-500" },
                    { label: "🎬 וידאו", count: videoPosts, color: "bg-violet-500" },
                    { label: "📌 מוצמדים", count: posts.filter(p => p.is_pinned).length, color: "bg-amber-500" },
                    { label: "⭐ מומלצים", count: posts.filter(p => p.is_featured).length, color: "bg-primary" },
                    { label: "📅 מתוזמנים", count: scheduledPosts.length, color: "bg-emerald-500" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs w-24">{item.label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", item.color)}
                          style={{ width: `${posts.length > 0 ? (item.count / posts.length) * 100 : 0}%`, minWidth: item.count > 0 ? 8 : 0 }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground w-8 text-left">{item.count}</span>
                    </div>
                  ))}
                </div>

                {/* Conversion insight */}
                <div className="mt-6 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                    המרות רכישה
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {orders.length > 0 && posts.length > 0
                      ? `${((orders.length / totalViews) * 100).toFixed(2)}% מהצפיות הובילו לרכישה (${orders.length} הזמנות / ${totalViews.toLocaleString()} צפיות)`
                      : "אין מספיק נתונים לחישוב המרות"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── AI Generated Content Tab ── */}
        <TabsContent value="ai-generate">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Generator Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  יצירת תוכן חכם באמצעות AI
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  המערכת מנתחת שאלות נפוצות, מצבים רפואיים ומגמות מהצ׳אט — ומייצרת טיפ יומי מותאם.
                </p>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateAIPost}
                  disabled={isGeneratingAI}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מנתח מגמות ויוצר תוכן...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      צור טיפ יומי חכם
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* AI Generated Post Preview */}
            {aiPost && (
              <Card className="border-border/30 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                      תצוגה מקדימה — פוסט AI
                    </CardTitle>
                    <Badge
                      variant={aiPost.urgency === "high" ? "destructive" : aiPost.urgency === "medium" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {aiPost.urgency === "high" ? "🔴 דחוף" : aiPost.urgency === "medium" ? "🟡 בינוני" : "🟢 רגיל"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Trend insight */}
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                      מגמה שזוהתה
                    </p>
                    <p className="text-xs text-muted-foreground">{aiPost.trend_summary}</p>
                  </div>

                  {/* Hebrew content */}
                  <div className="space-y-2" dir="rtl">
                    <h3 className="text-base font-bold text-foreground">{aiPost.title_he}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{aiPost.caption_he}</p>
                  </div>

                  {/* English content */}
                  <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/20" dir="ltr">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">English Version</p>
                    <h4 className="text-sm font-semibold text-foreground">{aiPost.title_en}</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{aiPost.caption_en}</p>
                  </div>

                  {/* Targeting info */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <PawPrint className="w-2.5 h-2.5" strokeWidth={1.5} />
                      {aiPost.target_species === "dog" ? "כלבים" : aiPost.target_species === "cat" ? "חתולים" : "הכל"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Target className="w-2.5 h-2.5" strokeWidth={1.5} />
                      {aiPost.target_age === "puppy" ? "גורים" : aiPost.target_age === "adult" ? "בוגרים" : aiPost.target_age === "senior" ? "מבוגרים" : "כל הגילאים"}
                    </Badge>
                    {aiPost.target_city && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <MapPin className="w-2.5 h-2.5" strokeWidth={1.5} />
                        {aiPost.target_city}
                      </Badge>
                    )}
                    {aiPost.medical_tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                        <Stethoscope className="w-2.5 h-2.5" strokeWidth={1.5} />
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Suggested products */}
                  {aiPost.suggested_products && aiPost.suggested_products.length > 0 && (
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                        מוצרים מומלצים לתיוג
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiPost.suggested_products.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      className="flex-1 gap-2"
                      onClick={handleApproveAndPublish}
                      disabled={isPublishingAI}
                    >
                      {isPublishingAI ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {isPublishingAI ? "מפרסם..." : "אשר ופרסם"}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={handleGenerateAIPost} disabled={isGeneratingAI}>
                      <Wand2 className="w-4 h-4" />
                      צור מחדש
                    </Button>
                    <Button variant="ghost" onClick={() => setAiPost(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminFeedManager;
