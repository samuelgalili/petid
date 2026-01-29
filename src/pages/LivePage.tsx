import { useState, useEffect } from "react";
import { Radio, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LiveStreamCard } from "@/components/live/LiveStreamCard";
import { GoLiveDialog } from "@/components/live/GoLiveDialog";
import { AppHeader } from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LiveStream {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  viewer_count: number;
  peak_viewers: number;
  status: string;
  user_id: string;
  started_at: string | null;
  ended_at: string | null;
}

const LivePage = () => {
  const { user } = useAuth();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [pastStreams, setPastStreams] = useState<LiveStream[]>([]);
  const [streamUsers, setStreamUsers] = useState<Record<string, any>>({});
  const [showGoLive, setShowGoLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("live");

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    // Fetch live streams
    const { data: live } = await (supabase.from("live_streams") as any)
      .select("*")
      .eq("status", "live")
      .order("viewer_count", { ascending: false });

    // Fetch past streams
    const { data: past } = await (supabase.from("live_streams") as any)
      .select("*")
      .eq("status", "ended")
      .order("ended_at", { ascending: false })
      .limit(20);

    if (live) setLiveStreams(live);
    if (past) setPastStreams(past);

    // Fetch user info
    const allStreams = [...(live || []), ...(past || [])];
    const userIds = [...new Set(allStreams.map((s) => s.user_id))];
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds as string[]);

      if (profiles) {
        const usersMap: Record<string, any> = {};
        profiles.forEach((p) => {
          usersMap[p.id] = { ...p, username: p.full_name };
        });
        setStreamUsers(usersMap);
      }
    }
  };

  const filteredLiveStreams = liveStreams.filter((stream) =>
    stream.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    streamUsers[stream.user_id]?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPastStreams = pastStreams.filter((stream) =>
    stream.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    streamUsers[stream.user_id]?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <AppHeader title="שידורים חיים" showBackButton />

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חפש שידורים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="w-full">
          <TabsTrigger value="live" className="flex-1 gap-2">
            <Radio className="w-4 h-4" />
            שידורים חיים
            {liveStreams.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 rounded-full">
                {liveStreams.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1">
            שידורים קודמים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          {filteredLiveStreams.length === 0 ? (
            <div className="text-center py-12">
              <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">אין שידורים חיים כרגע</p>
              <p className="text-sm text-muted-foreground mt-1">
                היה הראשון לצאת לשידור!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredLiveStreams.map((stream) => (
                <LiveStreamCard
                  key={stream.id}
                  stream={stream}
                  user={streamUsers[stream.user_id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {filteredPastStreams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">אין שידורים קודמים</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredPastStreams.map((stream) => (
                <LiveStreamCard
                  key={stream.id}
                  stream={stream}
                  user={streamUsers[stream.user_id]}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Go Live FAB */}
      {user && (
        <Button
          className="fixed bottom-24 left-4 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 hover:from-pink-600 hover:via-red-600 hover:to-orange-600"
          onClick={() => setShowGoLive(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Go Live Dialog */}
      <GoLiveDialog open={showGoLive} onOpenChange={setShowGoLive} />

      <BottomNav />
    </div>
  );
};

export default LivePage;
