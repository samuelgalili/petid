import { Camera, Calendar, FileText, CheckSquare, GraduationCap, Image, Shield, Scissors, Upload, Plus, ChevronLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState("documents");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePet = async () => {
    if (!petId) return;
    
    setIsDeleting(true);
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title={pet.name} showBackButton={true} />

      {/* Pet Header - Compact */}
      <div className="px-4 pt-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-background ring-2 ring-primary/20 shadow-lg">
              <AvatarImage src={pet.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                {pet.type === 'dog' ? '🐕' : '🐈'}
              </AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center ring-2 ring-background cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isUploadingImage}
              />
            </label>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{pet.name}</h1>
            <p className="text-sm text-muted-foreground">{pet.breed || 'לא ידוע'}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{calculateAge(pet.birth_date)}</span>
              {pet.gender && <span>• {pet.gender === 'male' ? 'זכר' : 'נקבה'}</span>}
            </div>
          </div>
          
          {/* Delete Pet Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>מחיקת חיית מחמד</AlertDialogTitle>
                <AlertDialogDescription>
                  האם אתה בטוח שברצונך למחוק את {pet.name}? פעולה זו לא ניתנת לביטול וכל המידע הקשור לחיית המחמד יימחק לצמיתות.
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
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="w-full justify-start px-4 bg-transparent border-b border-border rounded-none h-auto pb-0 gap-0 overflow-x-auto flex-nowrap">
          <TabsTrigger 
            value="documents" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-3 text-xs font-medium gap-1"
          >
            <FileText className="w-4 h-4" />
            מסמכים
          </TabsTrigger>
          <TabsTrigger 
            value="tasks" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-3 text-xs font-medium gap-1"
          >
            <CheckSquare className="w-4 h-4" />
            משימות
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
          <TabsTrigger 
            value="insurance" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-3 text-xs font-medium gap-1"
          >
            <Shield className="w-4 h-4" />
            ביטוח
          </TabsTrigger>
          <TabsTrigger 
            value="grooming" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-3 text-xs font-medium gap-1"
          >
            <Scissors className="w-4 h-4" />
            מספרה
          </TabsTrigger>
        </TabsList>

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
    </div>
  );
};

export default PetDetails;
