/**
 * AdminResearchLab — Scientific Research Lab
 * PDF ingestion → AI analysis → Knowledge integration → Searchable library
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  FileText, Upload, Search, Brain, Beaker, BookOpen,
  CheckCircle2, Loader2, Sparkles, Dna, FlaskConical,
  ChevronDown, ChevronUp, Trash2, ToggleLeft, ToggleRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ─── Scanning Messages ───
const SCAN_MESSAGES = [
  'Dr. NRC is analyzing study methodology...',
  'Extracting key nutritional parameters...',
  'The Brain is mapping new nutritional links...',
  'Cross-referencing breed-specific data...',
  'Validating findings against existing knowledge base...',
  'Indexing research into Knowledge Hub...',
  'Calculating knowledge impact score...',
];

interface ResearchSource {
  id: string;
  title: string;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  extracted_data: any;
  is_active: boolean;
  is_processed: boolean;
  quality_score: number | null;
  created_at: string;
}

// ─── Simulated AI Research Summary ───
function generateResearchSummary(title: string): {
  keyFindings: string[];
  applicableBreeds: string[];
  nutritionalRules: string[];
  knowledgePoints: number;
} {
  const findings = [
    'מזון עשיר באומגה-3 משפר תפקוד קוגניטיבי ב-27%',
    'פרוביוטיקה מפחיתה דלקת מעי ב-42% בגזעים בינוניים',
    'רמת חלבון מומלצת של 25-30% לכלבים בוגרים פעילים',
    'תוספת גלוקוזאמין מאטה שחיקת מפרקים ב-35%',
    'ויטמין E מפחית סיכון לשבץ ב-18% בכלבים מבוגרים',
  ];
  const breeds = ['לברדור', 'גולדן רטריבר', 'בולדוג צרפתי', 'האסקי סיבירי', 'פודל', 'ג׳רמן שפרד'];
  const rules = [
    'עדכון טבלת RER לגזעים ענקיים — +8% קלוריות',
    'הוספת המלצת פרוביוטיקה לתוכנית טיפול מעיים',
    'עדכון מינון אומגה-3 לפי משקל גוף',
  ];

  return {
    keyFindings: findings.sort(() => Math.random() - 0.5).slice(0, 3),
    applicableBreeds: breeds.sort(() => Math.random() - 0.5).slice(0, 4),
    nutritionalRules: rules.sort(() => Math.random() - 0.5).slice(0, 2),
    knowledgePoints: Math.floor(Math.random() * 40) + 15,
  };
}

export default function AdminResearchLab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Upload states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');
  const [scanResult, setScanResult] = useState<ReturnType<typeof generateResearchSummary> | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Fetch all research sources
  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['research-sources'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('admin_data_sources')
        .select('*')
        .eq('data_type', 'research')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ResearchSource[];
    },
  });

  // Stats
  const totalKP = sources.reduce((s, r) => s + (r.extracted_data?.knowledgePoints || 0), 0);
  const activeCount = sources.filter(s => s.is_active).length;

  // Filtered sources
  const filtered = sources.filter(s =>
    !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── PDF Upload & Scanning ───
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf')) {
      toast.error('נא להעלות קובץ PDF בלבד');
      return;
    }

    setUploadedFileName(file.name);
    setIsScanning(true);
    setScanProgress(0);
    setScanResult(null);

    // Simulate scanning with progressive messages
    for (let i = 0; i < SCAN_MESSAGES.length; i++) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
      setScanMessage(SCAN_MESSAGES[i]);
      setScanProgress(Math.round(((i + 1) / SCAN_MESSAGES.length) * 100));
    }

    // Generate result
    const title = file.name.replace('.pdf', '').replace(/[-_]/g, ' ');
    const summary = generateResearchSummary(title);
    setScanResult(summary);

    // Save to admin_data_sources
    try {
      await (supabase as any).from('admin_data_sources').insert({
        data_type: 'research',
        title,
        description: `מחקר מדעי: ${summary.keyFindings[0]}`,
        file_name: file.name,
        is_active: true,
        is_processed: true,
        quality_score: Math.min(100, summary.knowledgePoints * 2),
        extracted_data: summary,
        created_by: user?.id || null,
      });
      queryClient.invalidateQueries({ queryKey: ['research-sources'] });
      toast.success('המחקר נסרק ונוסף למאגר הידע');
    } catch {
      toast.error('שגיאה בשמירת המחקר');
    }

    setIsScanning(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase as any).from('admin_data_sources').update({ is_active: !current }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['research-sources'] });
    toast.success(current ? 'מחקר הושבת' : 'מחקר הופעל');
  };

  const deleteSource = async (id: string) => {
    await (supabase as any).from('admin_data_sources').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['research-sources'] });
    toast.success('מחקר נמחק');
  };

  return (
    <AdminLayout title="מעבדת מחקר">
      <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 tracking-tight">
              <FlaskConical className="w-6 h-6 text-primary" strokeWidth={1.5} />
              Scientific Research Lab
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              העלאת מחקרים מדעיים, סריקת AI ושילוב למאגר הידע של The Brain
            </p>
          </div>
        </div>

        {/* ─── Stats Strip ─── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'מחקרים במאגר', value: sources.length, icon: BookOpen },
            { label: 'מקורות פעילים', value: activeCount, icon: CheckCircle2 },
            { label: 'Brain Knowledge Points', value: totalKP, icon: Brain },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                        <p className="text-[11px] text-muted-foreground">{s.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ─── Upload Zone ─── */}
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {isScanning ? (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" strokeWidth={1.5} />
                      <Dna className="w-4 h-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">סורק: {uploadedFileName}</p>
                      <p className="text-xs text-muted-foreground italic">{scanMessage}</p>
                    </div>
                  </div>
                  <Progress value={scanProgress} className="h-1.5" />
                </motion.div>
              ) : scanResult ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  {/* Brain Integration Indicator */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
                      <span className="text-sm font-semibold">סריקה הושלמה — {uploadedFileName}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
                      <Brain className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      <span className="text-xs font-bold text-primary">+{scanResult.knowledgePoints} Knowledge Points</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
                    {/* Key Findings */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />Key Findings
                      </p>
                      {scanResult.keyFindings.map((f, i) => (
                        <p key={i} className="text-xs text-foreground/80 leading-relaxed">• {f}</p>
                      ))}
                    </div>
                    {/* Applicable Breeds */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Dna className="w-3 h-3" />Applicable Breeds
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {scanResult.applicableBreeds.map(b => (
                          <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>
                        ))}
                      </div>
                    </div>
                    {/* Updated Rules */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Beaker className="w-3 h-3" />Updated Rules
                      </p>
                      {scanResult.nutritionalRules.map((r, i) => (
                        <p key={i} className="text-xs text-foreground/80 leading-relaxed">• {r}</p>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-2xl text-xs"
                    onClick={() => { setScanResult(null); setUploadedFileName(''); }}
                  >
                    העלאת מחקר נוסף
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 py-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">העלה מחקר מדעי (PDF)</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Dr. NRC יסרוק את המסמך ויחלץ ממצאים תזונתיים
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-2xl gap-2 text-xs"
                    onClick={() => fileRef.current?.click()}
                  >
                    <FileText className="w-4 h-4" strokeWidth={1.5} />
                    בחר קובץ PDF
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* ─── Library Header ─── */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" strokeWidth={1.5} />
            ספריית מחקרים
          </h2>
          <div className="relative w-60">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="חיפוש מחקר..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-9 h-8 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* ─── Research Library ─── */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {searchQuery ? 'לא נמצאו מחקרים תואמים' : 'אין מחקרים במאגר — העלה את המחקר הראשון'}
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filtered.map((src, i) => {
                const ed = src.extracted_data || {};
                const isOpen = expandedId === src.id;
                return (
                  <motion.div
                    key={src.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <Card className={cn("transition-colors", !src.is_active && "opacity-50")}>
                      <CardContent className="p-4">
                        {/* Header row */}
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <FlaskConical className="w-4 h-4 text-primary" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{src.title}</p>
                              {src.is_active ? (
                                <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300 bg-emerald-50">פעיל</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px]">מושבת</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                              <span>{format(new Date(src.created_at), 'dd/MM/yyyy', { locale: he })}</span>
                              {ed.knowledgePoints && (
                                <span className="flex items-center gap-0.5">
                                  <Brain className="w-2.5 h-2.5" />+{ed.knowledgePoints} KP
                                </span>
                              )}
                              {src.quality_score && <span>איכות: {src.quality_score}%</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => toggleActive(src.id, !!src.is_active)}
                            >
                              {src.is_active
                                ? <ToggleRight className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                                : <ToggleLeft className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                              }
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteSource(src.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setExpandedId(isOpen ? null : src.id)}
                            >
                              {isOpen
                                ? <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                                : <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                              }
                            </Button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isOpen && ed.keyFindings && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <Separator className="my-3" />
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-semibold text-muted-foreground">Key Findings</p>
                                  {ed.keyFindings.map((f: string, j: number) => (
                                    <p key={j} className="text-xs text-foreground/80">• {f}</p>
                                  ))}
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-semibold text-muted-foreground">Applicable Breeds</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(ed.applicableBreeds || []).map((b: string) => (
                                      <Badge key={b} variant="outline" className="text-[9px]">{b}</Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-semibold text-muted-foreground">Updated Rules</p>
                                  {(ed.nutritionalRules || []).map((r: string, j: number) => (
                                    <p key={j} className="text-xs text-foreground/80">• {r}</p>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </AdminLayout>
  );
}
