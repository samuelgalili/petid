import { Camera, Calendar, FileText, CheckSquare, GraduationCap, Image, Shield, Scissors, Upload, Plus, Trash2, Package, Heart, Sparkles, Activity, Star, MapPin, Clock, Info, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PET_CARD, ACTIONS, REMINDERS } from "@/lib/brandVoice";
import { BreedInfoCard } from "@/components/pet/BreedInfoCard";
import { RecommendedProducts } from "@/components/pet/RecommendedProducts";
import { PointsRewardsCard } from "@/components/pet/PointsRewardsCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  breed_confidence: number | null;
  birth_date: string | null;
  gender: string | null;
  is_neutered: boolean | null;
  avatar_url: string | null;
  created_at: string;
}

interface PetDocument {
  id: string;
  title: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

interface PetPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

const PetDetails = () => {
  const navigate = useNavigate();
  const { petId } = useParams<{ petId: string }>();
  const { toast } = useToast();
  const [pet, setPet] = useState<Pet | null>(null);
  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [photos, setPhotos] = useState<PetPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAnimation, setShowDeleteAnimation] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  const handleDeletePet = async () => {
    if (!petId) return;
    
    setIsDeleting(true);
    setShowDeleteAnimation(true);
    
    // Wait for animation to play
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId);
      
      if (error) throw error;
      
      sonnerToast.success("חיית המחמד נמחקה בהצלחה");
      navigate('/home');
    } catch (error: any) {
      console.error("Error deleting pet:", error);
      sonnerToast.error("שגיאה במחיקת חיית המחמד");
      setShowDeleteAnimation(false);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchPetDetails = async () => {
      if (!petId) return;

      try {
        setLoading(true);

        // Fetch pet details
        const { data: petData, error: petError } = await supabase
          .from('pets')
          .select('*')
          .eq('id', petId)
          .maybeSingle();

        if (petError) throw petError;
        if (!petData) {
          toast({
            title: "חיה לא נמצאה",
            description: "החיה שחיפשת לא קיימת.",
            variant: "destructive",
          });
          navigate('/home');
          return;
        }

        setPet(petData);

        // Fetch pet documents
        const { data: docsData } = await supabase
          .from('pet_documents')
          .select('*')
          .eq('pet_id', petId)
          .order('uploaded_at', { ascending: false });

        setDocuments(docsData || []);

        // Fetch pet photos
        const { data: photosData } = await supabase
          .from('pet_photos')
          .select('*')
          .eq('pet_id', petId)
          .order('created_at', { ascending: false });

        setPhotos(photosData || []);

        // Fetch recommended products
        const { data: productsData } = await supabase
          .from('scraped_products')
          .select('id, product_name, main_image_url, final_price, regular_price, pet_type, rating')
          .neq('stock_status', 'out_of_stock')
          .limit(10);

        if (productsData) {
          const mapped = productsData.map(p => ({
            id: p.id,
            name: p.product_name,
            image: p.main_image_url,
            price: typeof p.final_price === 'string' ? parseFloat(p.final_price) : (p.final_price || 0),
            originalPrice: typeof p.regular_price === 'string' ? parseFloat(p.regular_price) : (p.regular_price || undefined),
            petType: p.pet_type,
            rating: p.rating
          }));
          setRecommendedProducts(mapped);
        }

      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPetDetails();
  }, [petId, navigate, toast]);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pet) return;

    if (!file.type.startsWith("image/")) {
      sonnerToast.error("נא להעלות קובץ תמונה בלבד");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      sonnerToast.error("גודל הקובץ חייב להיות קטן מ-5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "pet");
      formData.append("petId", pet.id);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      setPet(prev => prev ? { ...prev, avatar_url: result.url } : null);
      sonnerToast.success("תמונת חיית המחמד עודכנה בהצלחה!");
    } catch (error: any) {
      console.error("Error uploading pet image:", error);
      sonnerToast.error(error.message || "שגיאה בהעלאת התמונה");
    } finally {
      setIsUploadingImage(false);
    }
  }, [pet]);

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return "לא ידוע";
    const birth = new Date(birthDate);
    const years = differenceInYears(new Date(), birth);
    const months = differenceInMonths(new Date(), birth) % 12;
    
    if (years === 0) {
      return `${months} חודשים`;
    }
    return `${years} שנים${months > 0 ? `, ${months} חודשים` : ''}`;
  };

  // Training tasks based on breed
  const getBreedTasks = (breed: string | null, type: string) => {
    const baseTasks = [
      { id: '1', title: 'אילוף לישיבה', completed: false, priority: 'high' },
      { id: '2', title: 'אילוף להליכה ברצועה', completed: false, priority: 'medium' },
      { id: '3', title: 'אילוף לזימון', completed: true, priority: 'high' },
    ];

    if (type === 'dog' && breed) {
      if (breed.toLowerCase().includes('לברדור') || breed.toLowerCase().includes('labrador')) {
        return [...baseTasks, { id: '4', title: 'אילוף שחייה', completed: false, priority: 'medium' }];
      }
      if (breed.toLowerCase().includes('גרמני') || breed.toLowerCase().includes('german')) {
        return [...baseTasks, { id: '4', title: 'אילוף שמירה', completed: false, priority: 'high' }];
      }
    }
    return baseTasks;
  };

  // Grooming packages
  const groomingPackages = [
    { id: '1', name: 'חבילה בסיסית', price: 80, includes: ['רחצה', 'ייבוש', 'הברשה'] },
    { id: '2', name: 'חבילה מלאה', price: 150, includes: ['רחצה', 'תספורת', 'ציפורניים', 'אוזניים'] },
    { id: '3', name: 'חבילת פרימיום', price: 220, includes: ['רחצה', 'תספורת', 'ציפורניים', 'אוזניים', 'ספא', 'בושם'] },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="פרופיל חיית מחמד" showBackButton={true} />
        <div className="px-4 pt-6">
          <div className="animate-pulse">
            <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4"></div>
            <div className="h-6 bg-muted rounded w-1/3 mx-auto mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/4 mx-auto mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pet) return null;

  const tasks = getBreedTasks(pet.breed, pet.type);
  
  // Mock data for stock - in real app would come from orders
  const daysUntilReorder = 6;
  const compatibilityScore = 92;

  return (
    <motion.div 
      className="min-h-screen bg-background pb-24"
      animate={showDeleteAnimation ? {
        opacity: [1, 0],
        scale: [1, 0.8],
        filter: ["blur(0px)", "blur(10px)"],
        y: [0, -50],
      } : {}}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Delete Animation Overlay */}
      <AnimatePresence>
        {showDeleteAnimation && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ 
                scale: [1, 1.2, 0],
                opacity: [1, 1, 0],
                rotate: [0, 0, 180],
              }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <motion.div
                className="w-24 h-24 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(239, 68, 68, 0.4)",
                    "0 0 0 20px rgba(239, 68, 68, 0)",
                  ],
                }}
                transition={{ duration: 0.6, repeat: 1 }}
              >
                <Trash2 className="w-12 h-12 text-destructive" />
              </motion.div>
              <motion.p 
                className="text-lg font-semibold text-foreground"
                animate={{ opacity: [1, 0] }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                מוחק את {pet.name}...
              </motion.p>
            </motion.div>
            
            {/* Particle effects */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-destructive/60"
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1,
                  scale: 1 
                }}
                animate={{ 
                  x: Math.cos(i * 30 * Math.PI / 180) * 150,
                  y: Math.sin(i * 30 * Math.PI / 180) * 150,
                  opacity: 0,
                  scale: 0 
                }}
                transition={{ 
                  duration: 0.6, 
                  delay: 0.2,
                  ease: "easeOut" 
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hero Header - Immersive Design */}
      <div className="relative h-[320px] overflow-hidden">
        {/* Background Image/Gradient */}
        <div className="absolute inset-0">
          {pet.avatar_url ? (
            <>
              <img 
                src={pet.avatar_url} 
                alt={pet.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-background" />
            </>
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${
              pet.type === 'dog' 
                ? 'from-primary via-primary/80 to-accent' 
                : 'from-purple-500 via-pink-500 to-accent'
            }`}>
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-white/20 blur-3xl" />
                <div className="absolute bottom-20 left-10 w-40 h-40 rounded-full bg-white/20 blur-3xl" />
              </div>
            </div>
          )}
        </div>

        {/* Top Navigation */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </Button>
          
          <div className="flex items-center gap-2">
            <label className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-black/40 transition-all">
              <Camera className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isUploadingImage}
              />
            </label>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-destructive/80"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>מחיקת חיית מחמד</AlertDialogTitle>
                  <AlertDialogDescription>
                    האם אתה בטוח שברצונך למחוק את {pet.name}? פעולה זו לא ניתנת לביטול.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeletePet}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "מוחק..." : "מחק"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Upload Overlay */}
        <AnimatePresence>
          {isUploadingImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="text-center text-white">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">מעלה תמונה...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pet Info Overlay */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="absolute bottom-0 left-0 right-0 p-5"
          dir="rtl"
        >
          <div className="flex items-end gap-4">
            {/* Avatar with Ring */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <div className="w-24 h-24 rounded-2xl p-1 bg-gradient-to-br from-primary via-accent to-secondary shadow-2xl">
                <Avatar className="w-full h-full rounded-xl border-2 border-background">
                  <AvatarImage src={pet.avatar_url || undefined} className="object-cover rounded-xl" />
                  <AvatarFallback className="bg-gradient-to-br from-primary/50 to-accent/50 text-white text-4xl font-bold rounded-xl">
                    {pet.type === 'dog' ? '🐕' : '🐈'}
                  </AvatarFallback>
                </Avatar>
              </div>
              {/* Verified Badge */}
              <div className="absolute -bottom-1 -left-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center ring-2 ring-background shadow-lg">
                <span className="text-sm">✓</span>
              </div>
            </motion.div>

            {/* Name & Info */}
            <div className="flex-1 mb-1">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-black text-white drop-shadow-lg mb-1"
              >
                {pet.name}
              </motion.h1>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 flex-wrap"
              >
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-xs font-medium">
                  {pet.type === 'dog' ? '🐕 כלב' : '🐈 חתול'}
                </span>
                {pet.breed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-xs font-medium">
                    {pet.breed}
                  </span>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats Cards - Floating Style */}
      <div className="px-4 -mt-4 relative z-10" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-4 gap-2"
        >
          <Card className="p-3 text-center bg-card/95 backdrop-blur-md border-border/50 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
            <div className="text-2xl mb-1">📅</div>
            <p className="text-base font-bold text-foreground">{calculateAge(pet.birth_date).split(' ')[0]}</p>
            <p className="text-[10px] text-muted-foreground">גיל</p>
          </Card>
          <Card className="p-3 text-center bg-card/95 backdrop-blur-md border-border/50 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
            <div className="text-2xl mb-1">{pet.gender === 'male' ? '♂️' : '♀️'}</div>
            <p className="text-base font-bold text-foreground">{pet.gender === 'male' ? 'זכר' : 'נקבה'}</p>
            <p className="text-[10px] text-muted-foreground">מין</p>
          </Card>
          <Card className="p-3 text-center bg-gradient-to-br from-green-500/20 to-green-500/10 border-green-500/30 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
            <div className="text-2xl mb-1">💚</div>
            <p className="text-base font-bold text-green-600">מעולה</p>
            <p className="text-[10px] text-muted-foreground">בריאות</p>
          </Card>
          <Card className="p-3 text-center bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
            <div className="text-2xl mb-1">⭐</div>
            <p className="text-base font-bold text-primary">{compatibilityScore}%</p>
            <p className="text-[10px] text-muted-foreground">התאמה</p>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions - Premium Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3 overflow-x-auto px-4 py-4 scrollbar-hide"
        dir="rtl"
      >
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/shop')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap shadow-lg bg-gradient-to-r from-primary to-accent text-white font-medium text-sm transition-all hover:shadow-xl hover:shadow-primary/30"
        >
          <Package className="w-5 h-5" />
          הזמן מוצרים
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/grooming')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap bg-card border-2 border-border/50 text-foreground font-medium text-sm shadow-md hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <Scissors className="w-5 h-5 text-pink-500" />
          תספורת
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/training')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap bg-card border-2 border-border/50 text-foreground font-medium text-sm shadow-md hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <GraduationCap className="w-5 h-5 text-purple-500" />
          אילוף
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/parks')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap bg-card border-2 border-border/50 text-foreground font-medium text-sm shadow-md hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <MapPin className="w-5 h-5 text-green-500" />
          פארקים
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(`/documents?petId=${pet.id}`)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap bg-card border-2 border-border/50 text-foreground font-medium text-sm shadow-md hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <FileText className="w-5 h-5 text-blue-500" />
          מסמכים
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="w-full justify-start px-4 bg-transparent border-b border-border rounded-none h-auto pb-0 gap-0 overflow-x-auto flex-nowrap">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-3 text-xs font-medium gap-1"
          >
            <Sparkles className="w-4 h-4" />
            סקירה
          </TabsTrigger>
          <TabsTrigger 
            value="breed" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-3 text-xs font-medium gap-1"
          >
            <Info className="w-4 h-4" />
            הגזע
          </TabsTrigger>
          <TabsTrigger 
            value="documents" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-3 text-xs font-medium gap-1"
          >
            <FileText className="w-4 h-4" />
            מסמכים
          </TabsTrigger>
          <TabsTrigger 
            value="training" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-3 text-xs font-medium gap-1"
          >
            <GraduationCap className="w-4 h-4" />
            אילוף
          </TabsTrigger>
          <TabsTrigger 
            value="photos" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-3 text-xs font-medium gap-1"
          >
            <Image className="w-4 h-4" />
            תמונות
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - NEW */}
        <TabsContent value="overview" className="px-4 pt-4 space-y-6" dir="rtl">
          {/* נקודות ותגמולים */}
          <PointsRewardsCard petName={pet.name} />
          
          {/* מוצרים מומלצים */}
          <RecommendedProducts 
            petType={pet.type} 
            petBreed={pet.breed} 
            petName={pet.name}
            products={recommendedProducts}
          />
        </TabsContent>

        {/* Breed Info Tab - NEW */}
        <TabsContent value="breed" className="px-4 pt-4" dir="rtl">
          <BreedInfoCard 
            breed={pet.breed} 
            petType={pet.type} 
            petName={pet.name} 
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="px-4 pt-4" dir="rtl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">המסמכים של {pet.name}</h2>
            <Button
              size="sm"
              onClick={() => navigate(`/documents?petId=${pet.id}`)}
              className="rounded-full gap-2 bg-primary hover:bg-primary/90 shadow-md"
            >
              <Plus className="w-4 h-4" />
              העלאת מסמך
            </Button>
          </div>

          {documents.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2 border-primary/20 bg-primary/5">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <p className="text-base font-medium text-foreground mb-2">אין מסמכים עדיין</p>
              <p className="text-sm text-muted-foreground mb-4">התחל להעלות מסמכים עבור {pet.name}</p>
              <Button
                size="default"
                onClick={() => navigate(`/documents?petId=${pet.id}`)}
                className="rounded-full gap-2 bg-primary hover:bg-primary/90 shadow-md"
              >
                <Upload className="w-4 h-4" />
                העלאת מסמך ראשון
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(doc.uploaded_at), 'dd/MM/yy')}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="px-4 pt-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">משימות לפי גזע</h2>
            <p className="text-sm text-muted-foreground">משימות מותאמות ל{pet.breed || pet.type}</p>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className={`p-4 flex items-center gap-3 ${task.completed ? 'bg-success/5 border-success/20' : ''}`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  task.completed ? 'bg-success border-success' : 'border-muted-foreground'
                }`}>
                  {task.completed && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  task.priority === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                }`}>
                  {task.priority === 'high' ? 'גבוהה' : 'בינונית'}
                </span>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="px-4 pt-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">קורס אילוף</h2>
            <p className="text-sm text-muted-foreground">מותאם ל{pet.breed || pet.type}</p>
          </div>

          {/* Progress Card */}
          <Card className="p-4 mb-4 bg-gradient-to-r from-primary/10 to-accent/10 border-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">התקדמות כללית</span>
              <span className="text-lg font-bold text-primary">35%</span>
            </div>
            <div className="w-full h-2 bg-background rounded-full overflow-hidden">
              <div className="h-full w-[35%] bg-gradient-to-r from-primary to-accent rounded-full" />
            </div>
          </Card>

          <div className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">שיעור 1: פקודות בסיסיות</h3>
                <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">הושלם</span>
              </div>
              <p className="text-sm text-muted-foreground">שב, שכב, הישאר במקום</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">שיעור 2: הליכה ברצועה</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">בתהליך</span>
              </div>
              <p className="text-sm text-muted-foreground">הליכה נכונה ליד הבעלים</p>
            </Card>
            <Card className="p-4 opacity-60">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">שיעור 3: זימון מתקדם</h3>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">נעול</span>
              </div>
              <p className="text-sm text-muted-foreground">זימון בסביבות מפריעות</p>
            </Card>
          </div>

          <Button 
            className="w-full mt-4 rounded-xl"
            onClick={() => navigate('/training')}
          >
            המשך לאילוף
          </Button>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="px-4 pt-4" dir="rtl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">התמונות של {pet.name}</h2>
            <Button
              size="sm"
              onClick={() => navigate(`/photos?petId=${pet.id}`)}
              className="rounded-full gap-2 bg-primary hover:bg-primary/90 shadow-md"
            >
              <Plus className="w-4 h-4" />
              הוספת תמונה
            </Button>
          </div>

          {photos.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2 border-primary/20 bg-primary/5">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Image className="w-8 h-8 text-primary" />
              </div>
              <p className="text-base font-medium text-foreground mb-2">אין תמונות עדיין</p>
              <p className="text-sm text-muted-foreground mb-4">הוסף תמונות של {pet.name}</p>
              <Button
                size="default"
                onClick={() => navigate(`/photos?petId=${pet.id}`)}
                className="rounded-full gap-2 bg-primary hover:bg-primary/90 shadow-md"
              >
                <Upload className="w-4 h-4" />
                העלאת תמונה ראשונה
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {photos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
                  <img 
                    src={photo.photo_url} 
                    alt={photo.caption || 'Pet photo'} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="px-4 pt-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">ביטוח חיית מחמד</h2>
            <p className="text-sm text-muted-foreground">מותאם ל{pet.breed || pet.type}</p>
          </div>

          <Card className="p-4 mb-4 bg-gradient-to-r from-primary/10 to-accent/10 border-0">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-bold">ביטוח פרימיום</h3>
                <p className="text-xs text-muted-foreground">כיסוי מלא לחיית המחמד שלך</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-primary mb-2">₪99<span className="text-sm font-normal text-muted-foreground">/חודש</span></div>
            <ul className="text-sm space-y-1 mb-4">
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span> טיפולי חירום
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span> ניתוחים
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span> תרופות
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span> בדיקות שנתיות
              </li>
            </ul>
            <Button className="w-full rounded-xl" onClick={() => navigate('/insurance')}>
              קבל הצעת מחיר
            </Button>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            המחיר מותאם לגזע {pet.breed || pet.type} ולגיל {calculateAge(pet.birth_date)}
          </p>
        </TabsContent>

        {/* Grooming Tab */}
        <TabsContent value="grooming" className="px-4 pt-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">חבילות תספורת</h2>
            <p className="text-sm text-muted-foreground">מותאם ל{pet.breed || pet.type}</p>
          </div>

          <div className="space-y-3">
            {groomingPackages.map((pkg) => (
              <Card key={pkg.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">{pkg.name}</h3>
                  <span className="text-lg font-bold text-primary">₪{pkg.price}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {pkg.includes.map((item, idx) => (
                    <span key={idx} className="text-xs bg-muted px-2 py-1 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full rounded-xl"
                  onClick={() => navigate('/grooming')}
                >
                  הזמן תור
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default PetDetails;
