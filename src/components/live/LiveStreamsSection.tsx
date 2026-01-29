import { useState, useEffect } from "react";
import { Radio, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LiveStreamCard } from "./LiveStreamCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

interface LiveStream {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  viewer_count: number;
  status: string;
  user_id: string;
  started_at: string | null;
}

export const LiveStreamsSection = () => {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [streamUsers, setStreamUsers] = useState<Record<string, any>>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchLiveStreams();
    subscribeToStreams();
  }, []);

  const fetchLiveStreams = async () => {
    const { data, error } = await (supabase.from("live_streams") as any)
      .select("*")
      .eq("status", "live")
      .order("viewer_count", { ascending: false })
      .limit(10);

    if (!error && data) {
      setLiveStreams(data);

      // Fetch user info for each stream
      const userIds = [...new Set(data.map((s: LiveStream) => s.user_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profiles) {
        const usersMap: Record<string, any> = {};
        profiles.forEach((p) => {
          usersMap[p.id] = { ...p, username: p.full_name };
        });
        setStreamUsers(usersMap);
      }
    }
  };

  const subscribeToStreams = () => {
    const channel = supabase
      .channel("live-streams-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_streams",
        },
        () => {
          fetchLiveStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (liveStreams.length === 0) {
    return null;
  }

  return (
    <div className="py-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-5 h-5 text-red-500" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <h3 className="font-semibold">שידורים חיים</h3>
        </div>
        <button
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/live")}
        >
          הצג הכל
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Streams Carousel */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 px-4 pb-2">
          {liveStreams.map((stream) => (
            <div key={stream.id} className="w-64 flex-shrink-0">
              <LiveStreamCard
                stream={stream}
                user={streamUsers[stream.user_id]}
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
