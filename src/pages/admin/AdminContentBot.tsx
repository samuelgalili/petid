import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, FileText, MessageSquare, Lightbulb, Image as ImageIcon,
  Send, Loader2, PawPrint, Copy, CheckCircle2, Bot
} from "lucide-react";
import { cn } from "@/lib/utils";

const contentTypes = [
  { value: "blog_post", label: "פוסט בלוג", icon: FileText, description: "מאמר מקצועי 600-800 מילים" },
  { value: "social_caption", label: "קפשן לרשתות", icon: MessageSquare, description: "3 קפשנים לאינסטגרם/פייסבוק" },
  { value: "pet_care_tip", label: "טיפים לטיפול", icon: Lightbulb, description: "5 טיפים מותאמים אישית" },
  { value: "infographic_brief", label: "בריף אינפוגרפיקה", icon: ImageIcon, description: "בריף יצירתי לאינפוגרפיקה ויזואלית" },
];

const AdminContentBot = () => {
  const [contentType, setContentType] = useState("blog_post");
  const [topic, setTopic] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: pets = [] } = useQuery({
    queryKey: ["all-pets-for-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("id, name, breed, weight").limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentTasks = [] } = useQuery({
    queryKey: ["content-bot-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_tasks")
        .select("*, agent_bots(*)")
        .eq("task_type", "content-creation")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-bot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content_type: contentType,
            topic: topic || undefined,
            pet_id: selectedPetId || undefined,
            extra_instructions: extraInstructions || undefined,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      toast.success("✅ התוכן נוצר ונשלח לתור האישורים");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedType = contentTypes.find(t => t.value === contentType);

  return (
    <AdminLayout title="Content Creation Bot" icon={Sparkles}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="w-5 h-5" />
                יצירת תוכן חדש
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content Type Grid */}
              <div>
                <label className="text-sm font-medium mb-2 block">סוג תוכן</label>
                <div className="grid grid-cols-2 gap-3">
                  {contentTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setContentType(type.value)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border text-right transition-all",
                          contentType === type.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                          contentType === type.value ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">נושא / כותרת</label>
                <Input
                  placeholder="לדוגמה: תזונה נכונה לדוברמן בגיל 3"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  dir="auto"
                />
              </div>

              {/* Pet Selection */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">התאמה לחיית מחמד (אופציונלי)</label>
                <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר חיה להתאמה אישית" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא — תוכן כללי</SelectItem>
                    {pets.map((pet: any) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        <span className="flex items-center gap-2">
                          <PawPrint className="w-3.5 h-3.5" />
                          {pet.name} — {pet.breed || "לא ידוע"} ({pet.weight || "?"}kg)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Extra instructions */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">הנחיות נוספות (אופציונלי)</label>
                <Textarea
                  placeholder="הוסף הנחיות ספציפיות... לדוגמה: הדגש מזון ללא גלוטן, הוסף סטטיסטיקות NRC"
                  value={extraInstructions}
                  onChange={(e) => setExtraInstructions(e.target.value)}
                  rows={3}
                  dir="auto"
                />
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    יוצר תוכן...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    צור תוכן
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Content Preview */}
          <AnimatePresence>
            {generatedContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        תצוגה מקדימה
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                          ממתין לאישור
                        </Badge>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
                          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "הועתק" : "העתק"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap" dir="auto">
                        {generatedContent}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar — Recent Tasks */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">היסטוריית יצירות</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {recentTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      עדיין לא נוצר תוכן
                    </p>
                  ) : (
                    recentTasks.map((task: any) => (
                      <div key={task.id} className="p-3 rounded-xl bg-muted/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <Badge className={cn(
                            "text-[10px]",
                            task.status === "approved" || task.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : task.status === "cancelled"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-amber-500/10 text-amber-600"
                          )}>
                            {task.status === "approved" || task.status === "completed" ? "אושר"
                              : task.status === "cancelled" ? "נדחה" : "ממתין"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(task.created_at).toLocaleString("he-IL")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminContentBot;
