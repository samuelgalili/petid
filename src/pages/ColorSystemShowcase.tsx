import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Copy, Check, Palette, Eye, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const ColorSystemShowcase = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");

  const colorTokens = [
    {
      category: "Primary Colors",
      description: "Main brand colors - turquoise/teal theme",
      tokens: [
        { name: "primary", hsl: "170 46% 65%", usage: "Main brand color, primary actions" },
        { name: "primary-dark", hsl: "170 46% 55%", usage: "Darker variant for hover states" },
        { name: "primary-light", hsl: "170 46% 75%", usage: "Lighter variant for backgrounds" },
      ],
    },
    {
      category: "Secondary Colors",
      description: "Support colors - pastel pink/purple",
      tokens: [
        { name: "secondary", hsl: "280 60% 85%", usage: "Secondary UI elements" },
        { name: "secondary-dark", hsl: "280 60% 75%", usage: "Darker secondary variant" },
        { name: "secondary-light", hsl: "280 60% 95%", usage: "Lighter secondary backgrounds" },
      ],
    },
    {
      category: "Accent Colors",
      description: "Highlight and call-to-action colors - golden yellow",
      tokens: [
        { name: "accent", hsl: "48 89% 70%", usage: "CTAs, highlights, important UI" },
        { name: "accent-hover", hsl: "45 87% 65%", usage: "Accent hover states" },
      ],
    },
    {
      category: "Success Colors",
      description: "Positive feedback and success states - green",
      tokens: [
        { name: "success", hsl: "145 63% 49%", usage: "Success messages, completed states" },
        { name: "success-dark", hsl: "145 63% 42%", usage: "Darker success variant" },
        { name: "success-light", hsl: "145 63% 89%", usage: "Success backgrounds" },
      ],
    },
    {
      category: "Warning Colors",
      description: "Caution and warning states - orange",
      tokens: [
        { name: "warning", hsl: "38 92% 50%", usage: "Warnings, important notices" },
        { name: "warning-dark", hsl: "38 92% 42%", usage: "Darker warning variant" },
        { name: "warning-light", hsl: "38 92% 90%", usage: "Warning backgrounds" },
      ],
    },
    {
      category: "Error Colors",
      description: "Error and destructive states - red",
      tokens: [
        { name: "error", hsl: "0 84% 60%", usage: "Errors, destructive actions" },
        { name: "error-foreground", hsl: "0 0% 98%", usage: "Text on error backgrounds" },
      ],
    },
    {
      category: "Base Colors",
      description: "Core UI colors for text and backgrounds",
      tokens: [
        { name: "background", hsl: "0 0% 100%", usage: "Main background color" },
        { name: "foreground", hsl: "0 0% 10%", usage: "Main text color" },
        { name: "muted", hsl: "210 40% 96%", usage: "Muted backgrounds" },
        { name: "muted-foreground", hsl: "215 16% 47%", usage: "Muted text" },
      ],
    },
    {
      category: "Border Colors",
      description: "Border and divider colors",
      tokens: [
        { name: "border", hsl: "214 32% 91%", usage: "Default borders" },
        { name: "border-light", hsl: "220 13% 95%", usage: "Subtle borders" },
      ],
    },
    {
      category: "Card Colors",
      description: "Card component specific colors",
      tokens: [
        { name: "card", hsl: "0 0% 100%", usage: "Card backgrounds" },
        { name: "card-border", hsl: "220 13% 91%", usage: "Card borders" },
        { name: "card-foreground", hsl: "222 47% 11%", usage: "Card text" },
      ],
    },
  ];

  const gradients = [
    {
      name: "gradient-primary",
      css: "linear-gradient(135deg, hsl(170 46% 65%) 0%, hsl(170 46% 55%) 50%, hsl(170 46% 45%) 100%)",
      usage: "Primary gradient backgrounds, hero sections",
    },
    {
      name: "gradient-secondary",
      css: "linear-gradient(135deg, hsl(48 89% 70%) 0%, hsl(38 92% 60%) 50%, hsl(28 85% 55%) 100%)",
      usage: "Secondary gradient backgrounds, accent areas",
    },
    {
      name: "gradient-warm",
      css: "linear-gradient(135deg, hsl(25 95% 70%) 0%, hsl(20 90% 60%) 100%)",
      usage: "Warm promotional backgrounds",
    },
  ];

  const copyToClipboard = (token: string, value: string) => {
    navigator.clipboard.writeText(`hsl(var(--${token}))`);
    setCopiedToken(token);
    toast({
      title: "הועתק ללוח",
      description: `${token}: ${value}`,
      duration: 2000,
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-primary shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20 text-white"
            onClick={() => navigate(-1)}
          >
            <ArrowRight className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Palette className="w-6 h-6 text-white" />
            <h1 className="text-xl font-bold font-jakarta text-white">מערכת צבעים</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full text-white hover:bg-white/20 ${
                viewMode === "visual" ? "bg-white/20" : ""
              }`}
              onClick={() => setViewMode("visual")}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full text-white hover:bg-white/20 ${
                viewMode === "code" ? "bg-white/20" : ""
              }`}
              onClick={() => setViewMode("code")}
            >
              <Code className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="p-6 bg-gradient-to-br from-primary-light/30 to-accent/20 border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-2 font-jakarta">
              ברוכים הבאים למערכת הצבעים של Petid
            </h2>
            <p className="text-muted-foreground font-jakarta leading-relaxed mb-4">
              מערכת צבעים סמנטית המבוססת על טוקנים להבטחת עיצוב עקבי ונגיש בכל האפליקציה.
              כל הצבעים מוגדרים כ-CSS variables ב-HSL format לגמישות מקסימלית.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-primary text-white">טוקנים סמנטיים</Badge>
              <Badge className="bg-secondary text-foreground">תמיכה ב-Dark Mode</Badge>
              <Badge className="bg-accent text-foreground">HSL Colors</Badge>
              <Badge className="bg-success text-white">עיצוב עקבי</Badge>
            </div>
          </Card>
        </motion.div>

        {/* Color Tokens */}
        {colorTokens.map((category, idx) => (
          <motion.div
            key={category.category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="mb-8"
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-foreground font-jakarta mb-1">
                {category.category}
              </h3>
              <p className="text-sm text-muted-foreground font-jakarta">
                {category.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.tokens.map((token) => (
                <Card key={token.name} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Color Preview */}
                  <div
                    className="h-32 relative"
                    style={{ backgroundColor: `hsl(var(--${token.name}))` }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2">
                        <p className="text-xs font-bold font-jakarta text-foreground">
                          {token.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Token Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-foreground">
                          --{token.name}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(token.name, token.hsl)}
                        >
                          {copiedToken === token.name ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground font-jakarta mb-2">
                        {token.usage}
                      </p>
                      {viewMode === "code" && (
                        <code className="text-[10px] font-mono bg-muted/50 px-2 py-1 rounded block text-foreground">
                          hsl({token.hsl})
                        </code>
                      )}
                    </div>

                    {/* Usage Examples */}
                    {viewMode === "visual" && (
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs font-jakarta"
                          style={{
                            backgroundColor: `hsl(var(--${token.name}))`,
                            color: token.name.includes("foreground") ? `hsl(var(--background))` : `hsl(var(--foreground))`,
                          }}
                        >
                          כפתור לדוגמה
                        </Button>
                        <div
                          className="w-full h-8 rounded-md flex items-center justify-center text-xs font-jakarta"
                          style={{
                            backgroundColor: `hsl(var(--${token.name}) / 0.1)`,
                            color: `hsl(var(--${token.name}))`,
                          }}
                        >
                          רקע שקוף
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Gradients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="mb-4">
            <h3 className="text-xl font-bold text-foreground font-jakarta mb-1">
              Gradients
            </h3>
            <p className="text-sm text-muted-foreground font-jakarta">
              גרדיאנטים מוכנים לשימוש
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gradients.map((gradient) => (
              <Card key={gradient.name} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div
                  className="h-32 relative"
                  style={{ background: gradient.css }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2">
                      <p className="text-xs font-bold font-jakarta text-foreground">
                        {gradient.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-foreground block mb-2">
                    bg-{gradient.name}
                  </code>
                  <p className="text-xs text-muted-foreground font-jakarta">
                    {gradient.usage}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Usage Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6 bg-muted/30">
            <h3 className="text-lg font-bold text-foreground font-jakarta mb-4">
              📖 מדריך שימוש
            </h3>
            <div className="space-y-4 text-sm text-muted-foreground font-jakarta">
              <div>
                <h4 className="font-bold text-foreground mb-2">ב-Tailwind CSS:</h4>
                <code className="block bg-background p-3 rounded-lg text-xs font-mono text-foreground">
                  className="bg-primary text-foreground border border-border"
                </code>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2">ב-CSS מותאם אישית:</h4>
                <code className="block bg-background p-3 rounded-lg text-xs font-mono text-foreground">
                  background-color: hsl(var(--primary));
                </code>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2">עם שקיפות:</h4>
                <code className="block bg-background p-3 rounded-lg text-xs font-mono text-foreground">
                  className="bg-primary/20" {/* 20% opacity */}
                </code>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ColorSystemShowcase;
