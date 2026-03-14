import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Sparkles, 
  Megaphone, 
  Mail, 
  MessageSquare, 
  Instagram,
  Copy,
  RefreshCw,
  Wand2,
  Image as ImageIcon,
  Download,
  Loader2,
  Facebook,
  Send,
  CheckCircle2,
  XCircle
} from "lucide-react";

interface GeneratedAd {
  headline: string;
  body: string;
  cta: string;
  imageIdea: string;
}

interface GeneratedPost {
  content: string;
  hashtags: string[];
  platform: string;
  emoji: string;
}

interface GeneratedEmail {
  subject: string;
  preheader: string;
  greeting: string;
  body: string;
  cta: string;
  ps?: string;
}

interface GeneratedSMS {
  text: string;
  hasLink: boolean;
}

const AIContentGenerator = () => {
  const [activeTab, setActiveTab] = useState("ad");
  const [context, setContext] = useState("");
  const [brandVoice, setBrandVoice] = useState("friendly");
  const [targetAudience, setTargetAudience] = useState("pet-owners");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [generatedSMS, setGeneratedSMS] = useState<GeneratedSMS[]>([]);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; error?: string; postId?: string }> | null>(null);

  const brandVoiceOptions = [
    { value: "friendly", label: "ידידותי וחם" },
    { value: "professional", label: "מקצועי ורציני" },
    { value: "playful", label: "שובב ומשעשע" },
    { value: "luxurious", label: "יוקרתי ואקסקלוסיבי" },
    { value: "caring", label: "אכפתי ורגיש" },
  ];

  const audienceOptions = [
    { value: "pet-owners", label: "בעלי חיות מחמד" },
    { value: "new-pet-owners", label: "בעלים חדשים" },
    { value: "dog-owners", label: "בעלי כלבים" },
    { value: "cat-owners", label: "בעלי חתולים" },
    { value: "premium", label: "לקוחות פרימיום" },
  ];

  const handleGenerate = async () => {
    if (!context.trim()) {
      toast.error("נא להזין נושא או מוצר ליצירת תוכן");
      return;
    }

    setIsGenerating(true);
    setIsImageLoading(true);
    setGeneratedImageUrl(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-marketing-content", {
        body: {
          type: activeTab,
          context,
          brandVoice: brandVoiceOptions.find(o => o.value === brandVoice)?.label,
          targetAudience: audienceOptions.find(o => o.value === targetAudience)?.label,
          language: "עברית",
          generateImage: true
        }
      });

      if (error) throw error;

      if (data?.content) {
        switch (activeTab) {
          case "ad":
            setGeneratedAds(data.content.ads || []);
            break;
          case "social":
            setGeneratedPosts(data.content.posts || []);
            break;
          case "email":
            setGeneratedEmails(data.content.emails || []);
            break;
          case "sms":
            setGeneratedSMS(data.content.messages || []);
            break;
        }
        
        if (data?.imageUrl) {
          setGeneratedImageUrl(data.imageUrl);
        }
        
        toast.success("התוכן נוצר בהצלחה!");
      }
    } catch (err) {
      console.error("Generation error:", err);
      toast.error("שגיאה ביצירת התוכן");
    } finally {
      setIsGenerating(false);
      setIsImageLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("הועתק ללוח!");
  };

  const getPublishCaption = (): string => {
    if (generatedAds.length > 0) {
      const ad = generatedAds[0];
      return `${ad.headline}\n\n${ad.body}\n\n${ad.cta}`;
    }
    if (generatedPosts.length > 0) {
      const post = generatedPosts[0];
      return `${post.emoji} ${post.content}\n\n${post.hashtags.join(" ")}`;
    }
    return context;
  };

  const handlePublish = async (platform: "facebook" | "instagram" | "both") => {
    setIsPublishing(true);
    setPublishResults(null);

    try {
      const caption = getPublishCaption();
      const { data, error } = await supabase.functions.invoke("publish-to-social", {
        body: {
          platform,
          message: caption,
          imageUrl: generatedImageUrl || undefined,
        },
      });

      if (error) throw error;

      setPublishResults(data?.results || {});

      const fbOk = data?.results?.facebook?.success;
      const igOk = data?.results?.instagram?.success;

      if (platform === "both") {
        if (fbOk && igOk) toast.success("פורסם בהצלחה בפייסבוק ואינסטגרם! 🎉");
        else if (fbOk) toast.success("פורסם בפייסבוק. שגיאה באינסטגרם.");
        else if (igOk) toast.success("פורסם באינסטגרם. שגיאה בפייסבוק.");
        else toast.error("שגיאה בפרסום");
      } else if (platform === "facebook") {
        fbOk ? toast.success("פורסם בפייסבוק! 🎉") : toast.error(data?.results?.facebook?.error || "שגיאה");
      } else {
        igOk ? toast.success("פורסם באינסטגרם! 🎉") : toast.error(data?.results?.instagram?.error || "שגיאה");
      }
    } catch (err) {
      console.error("Publish error:", err);
      toast.error("שגיאה בפרסום לרשתות החברתיות");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generator Form */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
            יצירת תוכן שיווקי עם AI
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Content Type Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="ad" className="gap-2">
                <Megaphone className="w-4 h-4" strokeWidth={1.5} />
                מודעות
              </TabsTrigger>
              <TabsTrigger value="social" className="gap-2">
                <Instagram className="w-4 h-4" strokeWidth={1.5} />
                פוסטים
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" strokeWidth={1.5} />
                מיילים
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-2">
                <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                SMS
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Input Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-muted-foreground">נושא / מוצר / מבצע</Label>
              <Textarea 
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="mt-1.5"
                placeholder="לדוגמה: מבצע 20% הנחה על כל מזון הכלבים, או: השקת קולקציית צעצועים חדשה..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-muted-foreground">טון המותג</Label>
              <Select value={brandVoice} onValueChange={setBrandVoice}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {brandVoiceOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">קהל יעד</Label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audienceOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                יוצר תוכן...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 ml-2" strokeWidth={1.5} />
                צור תוכן
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Image */}
      {(generatedImageUrl || isImageLoading) && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="w-5 h-5 text-primary" strokeWidth={1.5} />
              תמונה שנוצרה לפוסט
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isImageLoading && !generatedImageUrl ? (
              <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">יוצר תמונה...</p>
                </div>
              </div>
            ) : generatedImageUrl ? (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border border-border">
                  <img 
                    src={generatedImageUrl} 
                    alt="AI generated marketing image" 
                    className="w-full max-h-96 object-contain bg-muted"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (generatedImageUrl) {
                        const link = document.createElement("a");
                        link.href = generatedImageUrl;
                        link.download = `petid-marketing-${Date.now()}.png`;
                        link.target = "_blank";
                        link.click();
                      }
                    }}
                  >
                    <Download className="w-4 h-4 ml-1" strokeWidth={1.5} />
                    הורד תמונה
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedImageUrl || "");
                      toast.success("קישור התמונה הועתק!");
                    }}
                  >
                    <Copy className="w-4 h-4 ml-1" strokeWidth={1.5} />
                    העתק קישור
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Generated Ads */}
      {generatedAds.length > 0 && activeTab === "ad" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" strokeWidth={1.5} />
            מודעות שנוצרו
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {generatedAds.map((ad, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">וריאציה {idx + 1}</Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(`${ad.headline}\n\n${ad.body}\n\n${ad.cta}`)}
                    >
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">כותרת</p>
                    <p className="text-foreground font-bold">{ad.headline}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">טקסט</p>
                    <p className="text-muted-foreground text-sm">{ad.body}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{ad.cta}</Badge>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">💡 רעיון לתמונה: {ad.imageIdea}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Generated Posts */}
      {generatedPosts.length > 0 && activeTab === "social" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Instagram className="w-5 h-5 text-primary" strokeWidth={1.5} />
            פוסטים שנוצרו
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedPosts.map((post, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      {post.platform}
                    </Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(`${post.content}\n\n${post.hashtags.join(" ")}`)}
                    >
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                  <p className="text-foreground text-sm">{post.emoji} {post.content}</p>
                  <div className="flex flex-wrap gap-1">
                    {post.hashtags.map((tag, i) => (
                      <span key={i} className="text-xs text-primary">{tag}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Generated Emails */}
      {generatedEmails.length > 0 && activeTab === "email" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" strokeWidth={1.5} />
            רצף מיילים שנוצר
          </h3>
          <div className="space-y-4">
            {generatedEmails.map((email, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">מייל {idx + 1}</Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(`נושא: ${email.subject}\n\n${email.greeting}\n\n${email.body}\n\n${email.cta}${email.ps ? `\n\nP.S. ${email.ps}` : ""}`)}
                    >
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">נושא המייל</p>
                    <p className="text-foreground font-medium">{email.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1">{email.preheader}</p>
                  </div>
                  <div>
                    <p className="text-primary font-medium mb-2">{email.greeting}</p>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">{email.body}</p>
                  </div>
                  <Button variant="outline" className="w-full">
                    {email.cta}
                  </Button>
                  {email.ps && (
                    <p className="text-xs text-muted-foreground italic">נ.ב. {email.ps}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Generated SMS */}
      {generatedSMS.length > 0 && activeTab === "sms" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" strokeWidth={1.5} />
            הודעות SMS שנוצרו
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {generatedSMS.map((sms, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      {sms.text.length} תווים
                    </Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(sms.text)}
                    >
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                  <p className="text-foreground text-sm">{sms.text}</p>
                  {sms.hasLink && (
                    <Badge variant="outline">
                      כולל קישור
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { AIContentGenerator };
