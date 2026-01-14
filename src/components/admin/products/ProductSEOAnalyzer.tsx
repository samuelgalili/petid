import { useState } from "react";
import { 
  Search,
  Globe,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Tag
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductSEOAnalyzerProps {
  product: any;
  onUpdate?: (updates: any) => void;
}

interface SEOData {
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    slug: string;
    imageAltText: string;
    schemaData: any;
  };
  score: number;
  issues: string[];
  tips: string[];
}

export function ProductSEOAnalyzer({ product, onUpdate }: ProductSEOAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SEOData | null>(null);

  const analyzeSEO = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('product-auto-seo', {
        body: { product }
      });
      
      if (error) throw error;
      setData(result);
    } catch (err) {
      console.error('Error analyzing SEO:', err);
      toast.error('שגיאה בניתוח SEO');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} הועתק`);
  };

  if (!data && !loading) {
    return (
      <Button variant="outline" size="sm" onClick={analyzeSEO} className="gap-2">
        <Globe className="h-4 w-4" />
        ניתוח SEO
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">מנתח SEO...</span>
      </div>
    );
  }

  const scoreColor = data!.score >= 80 ? 'text-green-600' : 
                     data!.score >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            ניתוח SEO
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${scoreColor}`}>{data!.score}</span>
            <span className="text-muted-foreground text-sm">/100</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={data!.score} className="h-2" />

        {/* Meta Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">כותרת Meta</label>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2"
              onClick={() => copyToClipboard(data!.seo.metaTitle, 'כותרת')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm p-2 bg-muted rounded">{data!.seo.metaTitle}</p>
          <p className="text-xs text-muted-foreground">{data!.seo.metaTitle.length}/60 תווים</p>
        </div>

        {/* Meta Description */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">תיאור Meta</label>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2"
              onClick={() => copyToClipboard(data!.seo.metaDescription, 'תיאור')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm p-2 bg-muted rounded">{data!.seo.metaDescription}</p>
          <p className="text-xs text-muted-foreground">{data!.seo.metaDescription.length}/160 תווים</p>
        </div>

        {/* Keywords */}
        <div className="space-y-1">
          <label className="text-xs font-medium flex items-center gap-1">
            <Tag className="h-3 w-3" />
            מילות מפתח
          </label>
          <div className="flex flex-wrap gap-1">
            {data!.seo.keywords.map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        </div>

        {/* Issues */}
        {data!.issues.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium flex items-center gap-1 text-orange-600">
              <AlertCircle className="h-3 w-3" />
              בעיות
            </p>
            {data!.issues.map((issue, i) => (
              <p key={i} className="text-xs text-muted-foreground">⚠️ {issue}</p>
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="space-y-1 pt-2 border-t">
          {data!.tips.map((tip, i) => (
            <p key={i} className="text-xs text-muted-foreground">{tip}</p>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={analyzeSEO} className="w-full">
          <RefreshCw className="h-4 w-4 ml-2" />
          נתח מחדש
        </Button>
      </CardContent>
    </Card>
  );
}
