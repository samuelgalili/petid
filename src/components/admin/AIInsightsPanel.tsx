import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  ChevronRight,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Insight {
  type: "trend" | "alert" | "opportunity" | "insight";
  icon: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action?: string;
}

interface BusinessMetrics {
  revenue: {
    today: number;
    yesterday: number;
    week: number;
    month: number;
    lastMonth: number;
  };
  orders: {
    today: number;
    week: number;
    month: number;
    pending: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    returningPercent: number;
  };
  inventory: {
    lowStock: number;
    outOfStock: number;
    fastMovers: string[];
    slowMovers: string[];
  };
  topProducts: Array<{ name: string; revenue: number; quantity: number }>;
}

interface AIInsightsPanelProps {
  metrics?: BusinessMetrics;
  compact?: boolean;
}

const priorityColors = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

const typeIcons = {
  trend: TrendingUp,
  alert: AlertTriangle,
  opportunity: Target,
  insight: Lightbulb,
};

export const AIInsightsPanel = ({ metrics, compact = false }: AIInsightsPanelProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [expanded, setExpanded] = useState(!compact);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Default mock metrics if not provided
  const defaultMetrics: BusinessMetrics = {
    revenue: {
      today: 4850,
      yesterday: 5200,
      week: 32400,
      month: 128400,
      lastMonth: 115000,
    },
    orders: {
      today: 12,
      week: 67,
      month: 287,
      pending: 8,
    },
    customers: {
      total: 1245,
      new: 48,
      returning: 156,
      returningPercent: 35,
    },
    inventory: {
      lowStock: 7,
      outOfStock: 2,
      fastMovers: ["מזון לכלבים Premium", "צעצוע לעיסה", "קולר LED"],
      slowMovers: ["מברשת שיניים", "ויטמינים לחתולים"],
    },
    topProducts: [
      { name: "מזון לכלבים Premium", revenue: 24500, quantity: 98 },
      { name: "מזון לחתולים Deluxe", revenue: 18200, quantity: 72 },
      { name: "צעצוע לעיסה", revenue: 8400, quantity: 168 },
      { name: "קולר LED מואר", revenue: 6200, quantity: 62 },
      { name: "מיטה אורטופדית", revenue: 5800, quantity: 29 },
    ],
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-insights", {
        body: { metrics: metrics || defaultMetrics },
      });

      if (error) {
        throw error;
      }

      if (data?.insights && Array.isArray(data.insights)) {
        setInsights(data.insights);
        setLastUpdated(new Date());
      }
    } catch (error: any) {
      console.error("Failed to fetch insights:", error);
      
      // Handle rate limit and payment errors
      if (error?.message?.includes("429") || error?.status === 429) {
        toast({
          title: "הגבלת קצב",
          description: "נא לנסות שוב בעוד מספר דקות",
          variant: "destructive",
        });
      } else if (error?.message?.includes("402") || error?.status === 402) {
        toast({
          title: "נדרש תשלום",
          description: "נא להוסיף קרדיטים לחשבון",
          variant: "destructive",
        });
      } else {
        // Use fallback mock insights
        setInsights([
          {
            type: "trend",
            icon: "📈",
            title: "עלייה בהכנסות",
            description: "הכנסות החודש עלו ב-11.6% לעומת חודש קודם",
            priority: "low",
            action: "המשיכו במגמה הטובה!",
          },
          {
            type: "alert",
            icon: "⚠️",
            title: "ירידה בהכנסות היום",
            description: "הכנסות היום נמוכות ב-6.7% מאתמול",
            priority: "medium",
            action: "בדקו אם יש בעיות טכניות או קמפיינים שהסתיימו",
          },
          {
            type: "opportunity",
            icon: "💡",
            title: "הזדמנות לשיפור שימור",
            description: "רק 35% מהלקוחות חוזרים. יש פוטנציאל לשיפור משמעותי",
            priority: "high",
            action: "הפעילו קמפיין Win-Back ל-150 לקוחות לא פעילים",
          },
          {
            type: "insight",
            icon: "🔥",
            title: "מוצר מוביל",
            description: "מזון לכלבים Premium מייצר 19% מההכנסות",
            priority: "low",
          },
          {
            type: "alert",
            icon: "📦",
            title: "מלאי נמוך",
            description: "7 מוצרים במלאי נמוך, 2 אזלו לחלוטין",
            priority: "high",
            action: "הזמינו מלאי חדש בהקדם",
          },
        ]);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (compact && !expanded) {
    return (
      <Card
        className="p-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/20 cursor-pointer hover:border-violet-500/40 transition-colors"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold flex items-center gap-2">
                AI Insights
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-sm text-muted-foreground">
                {insights.length} תובנות זמינות
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-violet-500/20">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold flex items-center gap-2">
                AI Insights
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  עודכן לאחרונה: {lastUpdated.toLocaleTimeString("he-IL")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchInsights}
              disabled={loading}
              className="h-8 w-8"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {compact && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpanded(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="max-h-[400px]">
        <div className="p-4 space-y-3">
          {loading && insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <div className="relative">
                <Brain className="w-12 h-12 opacity-50" />
                <Zap className="w-5 h-5 absolute -top-1 -right-1 text-amber-500 animate-pulse" />
              </div>
              <p className="mt-3 text-sm">מנתח נתונים עסקיים...</p>
            </div>
          ) : (
            <AnimatePresence>
              {insights.map((insight, index) => {
                const TypeIcon = typeIcons[insight.type] || Lightbulb;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border ${priorityColors[insight.priority]}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{insight.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              insight.priority === "high"
                                ? "border-destructive/50 text-destructive"
                                : insight.priority === "medium"
                                ? "border-amber-500/50 text-amber-600"
                                : "border-emerald-500/50 text-emerald-600"
                            }`}
                          >
                            {insight.priority === "high"
                              ? "דחוף"
                              : insight.priority === "medium"
                              ? "בינוני"
                              : "נמוך"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insight.description}
                        </p>
                        {insight.action && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <Target className="w-3 h-3" />
                            <span className="font-medium">{insight.action}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          תובנות נוצרו באמצעות AI על בסיס נתוני העסק שלך
        </p>
      </div>
    </Card>
  );
};

export default AIInsightsPanel;
