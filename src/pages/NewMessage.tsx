import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search.trim() || search.length < 2) {
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
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, user?.id]);

  const handleSelect = (userId: string) => {
    navigate(`/messages/${userId}`);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SEO title="הודעה חדשה" description="שלח הודעה חדשה" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowRight className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1">הודעה חדשה</h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חפש לפי שם משתמש או שם מלא..."
              className="h-10 pr-9 pl-9 rounded-xl bg-muted/50 border-0"
              autoFocus
              dir="rtl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-2">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && search.length >= 2 && results.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">לא נמצאו תוצאות</p>
        )}

        {results.map((u, i) => (
          <motion.button
            key={u.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => handleSelect(u.id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 active:scale-[0.98] transition-all"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={u.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {(u.full_name || "?").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-right flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">
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
