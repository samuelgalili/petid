import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Upload,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Book,
  HelpCircle,
  Settings,
  RefreshCw,
  Save
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSectionCard, AdminToolbar } from "@/components/admin/AdminStyles";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const faqItems = [
  { id: 1, question: "מה שעות הפעילות שלכם?", answer: "אנחנו פתוחים ימים א׳-ה׳ 09:00-21:00, יום ו׳ 09:00-14:00. סגורים בשבת.", status: "active" },
  { id: 2, question: "מה מדיניות ההחזרות?", answer: "ניתן להחזיר מוצרים עד 14 יום מקבלת ההזמנה בתנאי שהמוצר לא נפתח ובאריזתו המקורית.", status: "active" },
  { id: 3, question: "כמה זמן לוקח משלוח?", answer: "משלוחים מגיעים תוך 2-5 ימי עסקים. משלוח אקספרס תוך יום עסקים אחד.", status: "active" },
  { id: 4, question: "האם יש משלוח חינם?", answer: "כן! משלוח חינם בהזמנות מעל ₪200.", status: "active" },
  { id: 5, question: "איך אפשר לשלם?", answer: "אנחנו מקבלים כרטיסי אשראי, PayPal, ותשלום במזומן בעת קבלה.", status: "draft" },
];

const uploadedDocs = [
  { id: 1, name: "מדריך שירות לקוחות.pdf", size: "2.4 MB", uploadedAt: "לפני 3 ימים", status: "processed" },
  { id: 2, name: "קטלוג מוצרים 2024.pdf", size: "15.2 MB", uploadedAt: "לפני שבוע", status: "processed" },
  { id: 3, name: "מדיניות חנות.docx", size: "156 KB", uploadedAt: "לפני שבועיים", status: "processed" },
];

const AITraining = () => {
  const [activeTab, setActiveTab] = useState("faq");
  const [search, setSearch] = useState("");
  const [isAddFaqOpen, setIsAddFaqOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    `אתה נציג שירות לקוחות של PetID. תפקידך לעזור ללקוחות בצורה ידידותית ומקצועית.

כללים:
1. תמיד התייחס ללקוח בכבוד ונימוס
2. אם אינך יודע תשובה, העבר לנציג אנושי
3. אל תמציא מידע - השתמש רק במידע שאומנת עליו
4. תמיד הצע עזרה נוספת בסוף השיחה`
  );

  const [aiSettings, setAiSettings] = useState({
    temperature: 0.7,
    maxTokens: 500,
    autoHandoff: true,
    collectFeedback: true,
    sentimentDetection: true,
  });

  const filteredFaqs = faqItems.filter(faq =>
    faq.question.includes(search) || faq.answer.includes(search)
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <FileText className="w-4 h-4" />
            מסמכים
          </TabsTrigger>
          <TabsTrigger value="prompt" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            פרומפט
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            הגדרות
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6">
          <AdminToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="חיפוש שאלות..."
            onAdd={() => setIsAddFaqOpen(true)}
            addLabel="הוסף שאלה"
          />

          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn(faq.status === "draft" && "opacity-60")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <HelpCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{faq.question}</h4>
                          <Badge variant={faq.status === "active" ? "default" : "secondary"}>
                            {faq.status === "active" ? "פעיל" : "טיוטה"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{faq.answer}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Add FAQ Dialog */}
          <Dialog open={isAddFaqOpen} onOpenChange={setIsAddFaqOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הוסף שאלה ותשובה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>שאלה</Label>
                  <Input placeholder="מה השאלה שלקוחות שואלים?" />
                </div>
                <div className="space-y-2">
                  <Label>תשובה</Label>
                  <Textarea 
                    placeholder="מה התשובה שה-AI צריך לתת?"
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddFaqOpen(false)}>
                  ביטול
                </Button>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  הוסף
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="docs" className="space-y-6">
          {/* Upload Area */}
          <Card className="border-dashed border-2">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">העלאת מסמכים</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  העלה מסמכים כדי לאמן את ה-AI על מידע עסקי
                </p>
                <Button className="gap-2">
                  <Upload className="w-4 h-4" />
                  בחר קבצים
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  PDF, DOCX, TXT • עד 50MB לקובץ
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Documents */}
          <AdminSectionCard title="מסמכים שהועלו" icon={Book}>
            <div className="space-y-3">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                >
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.size} • {doc.uploadedAt}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 ml-1" />
                    עובד
                  </Badge>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </AdminSectionCard>
        </TabsContent>

        {/* Prompt Tab */}
        <TabsContent value="prompt" className="space-y-6">
          <AdminSectionCard 
            title="הוראות מערכת (System Prompt)" 
            icon={Brain}
            actions={
              <Button size="sm" className="gap-2">
                <Save className="w-4 h-4" />
                שמור
              </Button>
            }
          >
            <div className="space-y-4">
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="הזן את הוראות המערכת ל-AI..."
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{systemPrompt.length} תווים</span>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  שפר עם AI
                </Button>
              </div>
            </div>
          </AdminSectionCard>

          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-600">טיפ לכתיבת פרומפט טוב</p>
                <p className="text-sm text-muted-foreground mt-1">
                  הגדר בבירור את התפקיד, הטון, ההגבלות והמידע שה-AI יכול להשתמש בו. 
                  ככל שההוראות ברורות יותר, כך התשובות יהיו מדויקות יותר.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <AdminSectionCard title="הגדרות מודל" icon={Settings}>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>טמפרטורה (יצירתיות)</Label>
                    <span className="text-sm font-medium">{aiSettings.temperature}</span>
                  </div>
                  <Slider
                    value={[aiSettings.temperature * 100]}
                    max={100}
                    step={10}
                    onValueChange={(val) => setAiSettings({ ...aiSettings, temperature: val[0] / 100 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    ערך נמוך = תשובות עקביות יותר. ערך גבוה = תשובות יצירתיות יותר.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>אורך תשובה מקסימלי</Label>
                    <span className="text-sm font-medium">{aiSettings.maxTokens} tokens</span>
                  </div>
                  <Slider
                    value={[aiSettings.maxTokens]}
                    min={100}
                    max={2000}
                    step={100}
                    onValueChange={(val) => setAiSettings({ ...aiSettings, maxTokens: val[0] })}
                  />
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="התנהגות" icon={Brain}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>העברה אוטומטית לנציג</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      העבר שיחה לנציג כשה-AI לא בטוח
                    </p>
                  </div>
                  <Switch
                    checked={aiSettings.autoHandoff}
                    onCheckedChange={(val) => setAiSettings({ ...aiSettings, autoHandoff: val })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>איסוף משוב</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      בקש משוב בסוף כל שיחה
                    </p>
                  </div>
                  <Switch
                    checked={aiSettings.collectFeedback}
                    onCheckedChange={(val) => setAiSettings({ ...aiSettings, collectFeedback: val })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>זיהוי סנטימנט</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      זהה לקוחות מתוסכלים והעבר לנציג
                    </p>
                  </div>
                  <Switch
                    checked={aiSettings.sentimentDetection}
                    onCheckedChange={(val) => setAiSettings({ ...aiSettings, sentimentDetection: val })}
                  />
                </div>
              </div>
            </AdminSectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITraining;
