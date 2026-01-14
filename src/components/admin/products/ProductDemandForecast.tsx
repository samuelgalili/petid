import { useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Package,
  RefreshCw,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ProductDemandForecastProps {
  productId: string;
  productName: string;
}

interface ForecastData {
  productId: string;
  forecast: {
    predictedDemand: number;
    avgWeekly: number;
    trend: 'rising' | 'falling' | 'stable';
    trendSlope: number;
    seasonality: 'high' | 'low' | 'none';
    confidence: number;
    daysAhead: number;
  };
  historicalData: number[];
  recommendations: string[];
}

export function ProductDemandForecast({ productId, productName }: ProductDemandForecastProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ForecastData | null>(null);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('product-demand-forecast', {
        body: { productId, daysAhead: 30 }
      });
      
      if (error) throw error;
      setData(result);
    } catch (err) {
      console.error('Error fetching forecast:', err);
      toast.error('שגיאה בחישוב תחזית');
    } finally {
      setLoading(false);
    }
  };

  const trendIcons = {
    rising: <TrendingUp className="h-4 w-4 text-green-500" />,
    falling: <TrendingDown className="h-4 w-4 text-red-500" />,
    stable: <Minus className="h-4 w-4 text-gray-500" />
  };

  const trendLabels = {
    rising: 'עולה',
    falling: 'יורד',
    stable: 'יציב'
  };

  const seasonLabels = {
    high: 'עונת שיא',
    low: 'תקופה חלשה',
    none: 'ללא עונתיות'
  };

  if (!data && !loading) {
    return (
      <Button variant="outline" size="sm" onClick={fetchForecast} className="gap-2">
        <BarChart3 className="h-4 w-4" />
        תחזית ביקוש
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">מחשב תחזית...</span>
      </div>
    );
  }

  const chartData = data!.historicalData.map((value, index) => ({
    week: `שבוע ${index + 1}`,
    sales: value
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            תחזית ביקוש - 30 יום
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchForecast}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Package className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{data!.forecast.predictedDemand}</p>
            <p className="text-xs text-muted-foreground">צפי מכירות</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex justify-center mb-1">
              {trendIcons[data!.forecast.trend]}
            </div>
            <p className="text-sm font-medium">{trendLabels[data!.forecast.trend]}</p>
            <p className="text-xs text-muted-foreground">מגמה</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm font-medium">{seasonLabels[data!.forecast.seasonality]}</p>
            <p className="text-xs text-muted-foreground">עונתיות</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Confidence */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">רמת ודאות:</span>
          <Badge variant={data!.forecast.confidence >= 70 ? 'default' : 'secondary'}>
            {data!.forecast.confidence}%
          </Badge>
        </div>

        {/* Recommendations */}
        {data!.recommendations.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            {data!.recommendations.map((rec, i) => (
              <p key={i} className="text-sm text-muted-foreground">{rec}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
