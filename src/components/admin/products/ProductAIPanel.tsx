import { useState } from "react";
import { 
  Brain, 
  TrendingUp, 
  DollarSign, 
  Search, 
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProductQualityScore } from "./ProductQualityScore";
import { ProductDemandForecast } from "./ProductDemandForecast";
import { ProductCompetitorPrices } from "./ProductCompetitorPrices";
import { ProductSEOAnalyzer } from "./ProductSEOAnalyzer";
import { ProductDuplicateCheck } from "./ProductDuplicateCheck";
import { ProductHistory } from "./ProductHistory";

interface ProductAIPanelProps {
  product: any;
  onNavigateToProduct?: (product: any) => void;
}

export function ProductAIPanel({
  product,
  onNavigateToProduct
}: ProductAIPanelProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['quality']));

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const sections = [
    {
      id: 'quality',
      title: 'ציון איכות',
      icon: Brain,
      component: (
        <ProductQualityScore product={product} />
      )
    },
    {
      id: 'duplicates',
      title: 'בדיקת כפילויות',
      icon: Search,
      component: (
        <ProductDuplicateCheck
          productName={product?.name || ''}
          productId={product?.id}
          sku={product?.sku || undefined}
          onSelectProduct={onNavigateToProduct}
        />
      )
    },
    {
      id: 'seo',
      title: 'אופטימיזציית SEO',
      icon: FileText,
      component: (
        <ProductSEOAnalyzer product={product} />
      )
    },
    {
      id: 'demand',
      title: 'תחזית ביקוש',
      icon: TrendingUp,
      component: product?.id ? (
        <ProductDemandForecast 
          productId={product.id} 
          productName={product.name || ''} 
        />
      ) : (
        <p className="text-sm text-muted-foreground">שמור את המוצר תחילה לצפייה בתחזיות</p>
      )
    },
    {
      id: 'competitors',
      title: 'מחירי מתחרים',
      icon: DollarSign,
      component: (
        <ProductCompetitorPrices
          productName={product?.name || ''}
          currentPrice={product?.price || 0}
        />
      )
    },
    {
      id: 'history',
      title: 'היסטוריית שינויים',
      icon: FileText,
      component: product?.id ? (
        <ProductHistory productId={product.id} />
      ) : (
        <p className="text-sm text-muted-foreground">שמור את המוצר תחילה לצפייה בהיסטוריה</p>
      )
    }
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          כלי AI למוצר
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sections.map((section) => (
          <Collapsible
            key={section.id}
            open={openSections.has(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 h-auto"
              >
                <span className="flex items-center gap-2 text-sm">
                  <section.icon className="h-4 w-4" />
                  {section.title}
                </span>
                {openSections.has(section.id) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 py-2">
              {section.component}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
