import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Video, Upload, Sparkles, ArrowLeft, X, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { AILoader } from "@/components/ui/ai-loader";

interface DetectionResult {
  breed: string;
  breed_he: string | null;
  confidence: number;
  is_dog: boolean;
  mixed_breeds: string[] | null;
  notes: string | null;
  description?: string;
  traits?: {
    energy_level: number | null;
    trainability: number | null;
    grooming_freq: number | null;
    kids_friendly: number | null;
    life_expectancy: string | null;
    affection_family: number | null;
    size_category: string | null;
  };
  found_in_database?: boolean;
}

const BreedDetect = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"select" | "image" | "video">("select");
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("נא לבחור קובץ תמונה");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("התמונה גדולה מדי (מקסימום 10MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
      setMode("image");
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("נא לבחור קובץ וידאו");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("הסרטון גדול מדי (מקסימום 50MB)");
      return;
    }

    // Extract first frame from video
    const video = document.createElement("video");
    video.preload = "metadata";
    
    video.onloadeddata = () => {
      video.currentTime = 1; // Get frame at 1 second
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setPreview(dataUrl);
      setMode("video");
      setResult(null);
      setError(null);
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      toast.error("שגיאה בטעינת הסרטון");
    };

    video.src = URL.createObjectURL(file);
  };

  const analyzeImage = async () => {
    if (!preview) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("detect-breed", {
        body: { imageBase64: preview }
      });

      if (fnError) throw fnError;

      if (!data.is_dog) {
        setError(data.notes || "לא זוהה כלב בתמונה");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("Detection error:", err);
      setError("שגיאה בזיהוי הגזע. נא לנסות שוב.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setMode("select");
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const TraitBar = ({ label, value, max = 5 }: { label: string; value: number | null; max?: number }) => {
    if (value === null) return null;
    const percentage = (value / max) * 100;
    
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{value}/{max}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">זיהוי גזע</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Hidden inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoSelect}
        />

        <AnimatePresence mode="wait">
          {mode === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Hero */}
              <div className="text-center space-y-3 py-8">
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold">זיהוי גזע חכם</h2>
                <p className="text-muted-foreground">
                  העלו תמונה או סרטון של הכלב שלכם<br />
                  והבינה המלאכותית תזהה את הגזע
                </p>
              </div>

              {/* Upload Options */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Card 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <CardContent className="p-6 flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-md">
                        <Camera className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">תמונה</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG עד 10MB</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Card 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <CardContent className="p-6 flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-md">
                        <Video className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">וידאו</p>
                        <p className="text-xs text-muted-foreground">MP4, MOV עד 50MB</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Info */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex gap-3">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-primary">טיפים לזיהוי מדויק</p>
                    <ul className="text-muted-foreground space-y-0.5 text-xs">
                      <li>• צלמו את הכלב בתאורה טובה</li>
                      <li>• ודאו שהפנים והגוף נראים בבירור</li>
                      <li>• הימנעו מטשטוש ותנועה</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {(mode === "image" || mode === "video") && preview && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Preview Image */}
              <div className="relative rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full aspect-square object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 left-3 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={reset}
                >
                  <X className="w-5 h-5" />
                </Button>
                {mode === "video" && (
                  <div className="absolute bottom-3 right-3 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    פריים מהסרטון
                  </div>
                )}
              </div>

              {/* Analyze Button */}
              {!isAnalyzing && !result && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    onClick={analyzeImage}
                  >
                    <Sparkles className="w-5 h-5" />
                    זהה את הגזע
                  </Button>
                </motion.div>
              )}

              {/* Loading */}
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-8"
                >
                  <AILoader text="מנתח את התמונה..." />
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">{error}</p>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-sm"
                          onClick={reset}
                        >
                          נסו תמונה אחרת
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Result */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Main Result Card */}
                  <Card className="overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">זוהה בהצלחה!</span>
                      </div>
                      <h3 className="text-2xl font-bold">
                        {result.breed_he || result.breed}
                      </h3>
                      {result.breed_he && result.breed !== result.breed_he && (
                        <p className="text-white/80 text-sm">{result.breed}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 bg-white/30 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${result.confidence * 100}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-white rounded-full"
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {Math.round(result.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-4">
                      {result.mixed_breeds && result.mixed_breeds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm text-muted-foreground">מעורב עם:</span>
                          {result.mixed_breeds.map((breed) => (
                            <span key={breed} className="text-sm bg-muted px-2 py-0.5 rounded-full">
                              {breed}
                            </span>
                          ))}
                        </div>
                      )}

                      {result.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {result.description}
                        </p>
                      )}

                      {/* Traits */}
                      {result.traits && (
                        <div className="space-y-3 pt-2">
                          <h4 className="font-medium text-sm">מאפייני הגזע</h4>
                          <TraitBar label="רמת אנרגיה" value={result.traits.energy_level} />
                          <TraitBar label="קלות אימון" value={result.traits.trainability} />
                          <TraitBar label="תדירות טיפוח" value={result.traits.grooming_freq} />
                          <TraitBar label="ידידותי לילדים" value={result.traits.kids_friendly} />
                          <TraitBar label="חיבה למשפחה" value={result.traits.affection_family} />
                          
                          {result.traits.life_expectancy && (
                            <div className="flex justify-between text-sm pt-2 border-t">
                              <span className="text-muted-foreground">תוחלת חיים</span>
                              <span className="font-medium">{result.traits.life_expectancy} שנים</span>
                            </div>
                          )}
                          {result.traits.size_category && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">גודל</span>
                              <span className="font-medium">{result.traits.size_category}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {!result.found_in_database && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          הגזע לא נמצא במאגר המידע שלנו
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={reset}
                    >
                      <Upload className="w-4 h-4 ml-2" />
                      תמונה חדשה
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => navigate(`/breeds?search=${encodeURIComponent(result.breed)}`)}
                    >
                      צפה באנציקלופדיה
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BreedDetect;
