import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Target,
  Hash
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
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-marketing-content", {
        body: {
          type: activeTab,
          context,
          brandVoice: brandVoiceOptions.find(o => o.value === brandVoice)?.label,
          targetAudience: audienceOptions.find(o => o.value === targetAudience)?.label,
          language: "עברית"
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
        toast.success("התוכן נוצר בהצלחה!");
      }
    } catch (err) {
      console.error("Generation error:", err);
      toast.error("שגיאה ביצירת התוכן");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("הועתק ללוח!");
  };

  return (
    <div className="space-y-6">
      {/* Generator Form */}
      <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
        <CardHeader className="border-b border-slate-700/50">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            יצירת תוכן שיווקי עם AI
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Content Type Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-800/50 grid grid-cols-4 w-full">
              <TabsTrigger value="ad" className="gap-2">
                <Megaphone className="w-4 h-4" />
                מודעות
              </TabsTrigger>
              <TabsTrigger value="social" className="gap-2">
                <Instagram className="w-4 h-4" />
                פוסטים
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" />
                מיילים
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                SMS
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Input Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-slate-300">נושא / מוצר / מבצע</Label>
              <Textarea 
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white mt-1.5"
                placeholder="לדוגמה: מבצע 20% הנחה על כל מזון הכלבים, או: השקת קולקציית צעצועים חדשה..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-slate-300">טון המותג</Label>
              <Select value={brandVoice} onValueChange={setBrandVoice}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1.5">
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
              <Label className="text-slate-300">קהל יעד</Label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1.5">
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
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                יוצר תוכן...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 ml-2" />
                צור תוכן
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Ads */}
      {generatedAds.length > 0 && activeTab === "ad" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-violet-400" />
            מודעות שנוצרו
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {generatedAds.map((ad, idx) => (
              <Card key={idx} className="border-0 bg-gradient-to-br from-slate-800 to-slate-900">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-violet-500/20 text-violet-400">וריאציה {idx + 1}</Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(`${ad.headline}\n\n${ad.body}\n\n${ad.cta}`)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">כותרת</p>
                    <p className="text-white font-bold">{ad.headline}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">טקסט</p>
                    <p className="text-slate-300 text-sm">{ad.body}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-500/20 text-emerald-400">{ad.cta}</Badge>
                  </div>
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-500">💡 רעיון לתמונה: {ad.imageIdea}</p>
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
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-400" />
            פוסטים שנוצרו
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedPosts.map((post, idx) => (
              <Card key={idx} className="border-0 bg-gradient-to-br from-slate-800 to-slate-900">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={
                      post.platform === "instagram" ? "bg-pink-500/20 text-pink-400" :
                      post.platform === "facebook" ? "bg-blue-500/20 text-blue-400" :
                      "bg-slate-500/20 text-slate-400"
                    }>
                      {post.platform}
                    </Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(`${post.content}\n\n${post.hashtags.join(" ")}`)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-white text-sm">{post.emoji} {post.content}</p>
                  <div className="flex flex-wrap gap-1">
                    {post.hashtags.map((tag, i) => (
                      <span key={i} className="text-xs text-violet-400">{tag}</span>
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
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-400" />
            רצף מיילים שנוצר
          </h3>
          <div className="space-y-4">
            {generatedEmails.map((email, idx) => (
              <Card key={idx} className="border-0 bg-gradient-to-br from-slate-800 to-slate-900">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500/20 text-amber-400">מייל {idx + 1}</Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(`נושא: ${email.subject}\n\n${email.greeting}\n\n${email.body}\n\n${email.cta}${email.ps ? `\n\nP.S. ${email.ps}` : ""}`)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">נושא המייל</p>
                    <p className="text-white font-medium">{email.subject}</p>
                    <p className="text-xs text-slate-500 mt-1">{email.preheader}</p>
                  </div>
                  <div>
                    <p className="text-violet-400 font-medium mb-2">{email.greeting}</p>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{email.body}</p>
                  </div>
                  <Button variant="outline" className="w-full border-emerald-500/30 text-emerald-400">
                    {email.cta}
                  </Button>
                  {email.ps && (
                    <p className="text-xs text-slate-400 italic">P.S. {email.ps}</p>
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
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            הודעות SMS שנוצרו
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {generatedSMS.map((sms, idx) => (
              <Card key={idx} className="border-0 bg-gradient-to-br from-slate-800 to-slate-900">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-500/20 text-emerald-400">
                      {sms.text.length} תווים
                    </Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(sms.text)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-white text-sm">{sms.text}</p>
                  {sms.hasLink && (
                    <Badge variant="outline" className="border-slate-600 text-slate-400">
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

export default AIContentGenerator;
