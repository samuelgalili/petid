import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Search, X, Users, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";

interface UserResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const NewMessage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [suggested, setSuggested] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Load suggested users on mount
  useEffect(() => {
    const loadSuggested = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", user.id)
        .limit(20);
      setSuggested(data || []);
    };
    loadSuggested();
  }, [user?.id]);

  // Search users
  useEffect(() => {
    if (!search.trim() || search.length < 1) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", user?.id ?? "")
        .ilike("full_name", `%${search}%`)
        .limit(20);
      setResults(data || []);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, user?.id]);

  const handleSelect = (userId: string) => {
    navigate(`/messages/${userId}`);
  };

  const displayList = search.trim() ? results : suggested;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SEO title="הודעה חדשה" description="שלח הודעה חדשה" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/40">
        <div className="flex items-center px-4 h-[52px]">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -mr-1 rounded-full hover:bg-muted/60 transition-colors"
          >
            <ArrowRight className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1 text-center">הודעה חדשה</h1>
          <div className="w-6" />
        </div>
      </div>

      {/* To: / Search field */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
        <span className="text-sm text-muted-foreground font-medium shrink-0">אל:</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder=""
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          autoFocus
          dir="rtl"
        />
        {search ? (
          <button onClick={() => setSearch("")} className="p-0.5">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : (
          <button className="text-sm text-muted-foreground font-medium">חיפוש</button>
        )}
      </div>

      {/* Content */}
      <div className="overflow-y-auto">
        {/* Section header */}
        {!search.trim() && (
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-bold text-foreground">מוצעים</h2>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && search.trim() && results.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">לא נמצאו תוצאות</p>
        )}

        {displayList.map((u, i) => (
          <motion.button
            key={u.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => handleSelect(u.id)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 active:bg-muted/60 transition-colors"
          >
            <div className="relative">
              <Avatar className="h-[52px] w-[52px]">
                <AvatarImage src={u.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-lg">
                  {(u.full_name || "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="text-right flex-1 min-w-0">
              <p className="font-semibold text-foreground text-[14px] leading-tight truncate">
                {u.full_name || "משתמש"}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default NewMessage;
