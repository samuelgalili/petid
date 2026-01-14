import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, 
  AlertTriangle, 
  CheckCircle, 
  Image, 
  FileText, 
  Tag, 
  DollarSign,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductQualityScoreProps {
  product: any;
  compact?: boolean;
}

interface QualityData {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: { type: string; message: string; severity: 'low' | 'medium' | 'high' }[];
  improvements: string[];
  breakdown: {
    images: number;
    descriptionLength: number;
    hasCategory: boolean;
    hasSku: boolean;
    hasPetType: boolean;
    variantsCount: number;
  };
}

export function ProductQualityScore({ product, compact = false }: ProductQualityScoreProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QualityData | null>(null);
  const [expanded, setExpanded] = useState(false);

  const gradeColors = {
    A: 'bg-green-500 text-white',
    B: 'bg-blue-500 text-white',
    C: 'bg-yellow-500 text-white',
    D: 'bg-orange-500 text-white',
    F: 'bg-red-500 text-white'
  };

  const fetchScore = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('product-quality-score', {
        body: { productData: product }
      });
      
      if (error) throw error;
      setData(result);
    } catch (err) {
      console.error('Error fetching quality score:', err);
      toast.error('שגיאה בחישוב ציון איכות');
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <Button variant="outline" size="sm" onClick={fetchScore} className="gap-2">
        <Star className="h-4 w-4" />
        בדוק איכות
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">מחשב...</span>
      </div>
    );
  }

  if (compact && data) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={gradeColors[data.grade]}>
          {data.grade}
        </Badge>
        <span className="text-sm text-muted-foreground">{data.score}/100</span>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${gradeColors[data!.grade]}`}>
              {data!.grade}
            </div>
            <div>
              <p className="font-medium">ציון איכות מוצר</p>
              <p className="text-sm text-muted-foreground">{data!.score} מתוך 100</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <Progress value={data!.score} className="h-2 mb-3" />

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {/* Issues */}
              {data!.issues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    בעיות לטיפול
                  </p>
                  {data!.issues.map((issue, i) => (
                    <div 
                      key={i} 
                      className={`text-sm p-2 rounded ${
                        issue.severity === 'high' ? 'bg-red-50 text-red-700' :
                        issue.severity === 'medium' ? 'bg-orange-50 text-orange-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {issue.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Improvements */}
              {data!.improvements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    המלצות לשיפור
                  </p>
                  {data!.improvements.map((imp, i) => (
                    <div key={i} className="text-sm p-2 rounded bg-blue-50 text-blue-700">
                      💡 {imp}
                    </div>
                  ))}
                </div>
              )}

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div className="text-center p-2">
                  <Image className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="text-lg font-bold">{data!.breakdown.images}</p>
                  <p className="text-xs text-muted-foreground">תמונות</p>
                </div>
                <div className="text-center p-2">
                  <FileText className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="text-lg font-bold">{data!.breakdown.descriptionLength}</p>
                  <p className="text-xs text-muted-foreground">תווים בתיאור</p>
                </div>
                <div className="text-center p-2">
                  <Tag className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="text-lg font-bold">{data!.breakdown.variantsCount}</p>
                  <p className="text-xs text-muted-foreground">וריאנטים</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button variant="ghost" size="sm" onClick={fetchScore} className="mt-2 w-full">
          <RefreshCw className="h-4 w-4 ml-2" />
          רענן ציון
        </Button>
      </CardContent>
    </Card>
  );
}
