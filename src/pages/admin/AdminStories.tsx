import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  PlaySquare,
  Eye,
  Clock,
  Trash2,
  MoreVertical,
  User,
  TrendingUp,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  expires_at: string;
  view_count: number;
  is_close_friends_only: boolean;
  user?: {
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

const AdminStories = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          user:profiles!stories_user_id_fkey(full_name, avatar_url, username)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data) {
        setStories(data as any);
      } else {
        setStories([]);
      }
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStory = async (id: string) => {
    try {
      await supabase.from("stories").delete().eq("id", id);
      setStories(stories.filter((s) => s.id !== id));
      toast({ title: "הסטורי נמחק בהצלחה" });
    } catch (error) {
      toast({ title: "שגיאה במחיקה", variant: "destructive" });
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff < 0) return { text: "פג תוקף", expired: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return { text: `${hours}h ${minutes}m`, expired: false };
    return { text: `${minutes}m`, expired: false };
  };

  const getExpirationProgress = (createdAt: string, expiresAt: string) => {
    const created = new Date(createdAt).getTime();
    const expires = new Date(expiresAt).getTime();
    const now = Date.now();
    const total = expires - created;
    const elapsed = now - created;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const filteredStories = stories.filter((story) => {
    const matchesSearch = story.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.user?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const timeInfo = getTimeRemaining(story.expires_at);
    const matchesFilter = 
      filter === "all" ||
      (filter === "active" && !timeInfo.expired) ||
      (filter === "expired" && timeInfo.expired);

    return matchesSearch && matchesFilter;
  });

  const activeCount = stories.filter((s) => !getTimeRemaining(s.expires_at).expired).length;
  const totalViews = stories.reduce((sum, s) => sum + s.view_count, 0);

  return (
    <AdminLayout title="ניהול סטוריז" icon={PlaySquare} breadcrumbs={[{ label: "סטוריז" }]}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stories.length}</p>
              <p className="text-sm opacity-80">סה"כ סטוריז</p>
            </div>
            <PlaySquare className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm opacity-80">פעילים</p>
            </div>
            <Clock className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500 to-indigo-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
              <p className="text-sm opacity-80">צפיות</p>
            </div>
            <Eye className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stories.length - activeCount}</p>
              <p className="text-sm opacity-80">פג תוקף</p>
            </div>
            <AlertCircle className="w-8 h-8 opacity-60" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי משתמש..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "expired"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "הכל" : f === "active" ? "פעילים" : "פג תוקף"}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="icon" onClick={fetchStories} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stories Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PlaySquare className="w-16 h-16 mb-4 opacity-50" />
          <p>אין סטוריז להצגה</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredStories.map((story, index) => {
            const timeInfo = getTimeRemaining(story.expires_at);
            const progress = getExpirationProgress(story.created_at, story.expires_at);

            return (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                <Card className="overflow-hidden border-2 border-transparent hover:border-primary transition-colors">
                  {/* Story Preview */}
                  <div className="relative aspect-[9/16] bg-muted">
                    <img
                      src={story.media_url}
                      alt="Story"
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                    {/* Top Info */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                      <Badge
                        variant={timeInfo.expired ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        <Clock className="w-3 h-3 ml-1" />
                        {timeInfo.text}
                      </Badge>
                      {story.is_close_friends_only && (
                        <Badge className="bg-green-500 text-xs">חברים קרובים</Badge>
                      )}
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-6 h-6 border-2 border-white">
                          <AvatarImage src={story.user?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {story.user?.full_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm font-medium truncate">
                          {story.user?.username || story.user?.full_name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-white/80 text-xs">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {story.view_count}
                        </div>
                        <span>{story.media_type === "video" ? "🎬" : "📷"}</span>
                      </div>

                      {/* Expiration Progress */}
                      <Progress value={progress} className="h-1 mt-2" />
                    </div>

                    {/* Actions Overlay */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="secondary" className="w-7 h-7">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => window.open(story.media_url, "_blank")}>
                            <Eye className="w-4 h-4 ml-2" />
                            צפה בסטורי
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteStory(story.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            מחק סטורי
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminStories;
