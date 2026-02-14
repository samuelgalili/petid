import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ArchivedPet {
  id: string;
  name: string;
  breed: string | null;
  type: string;
  avatar_url: string | null;
  archived_at: string;
}

const ArchivedPets = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [archivedPets, setArchivedPets] = useState<ArchivedPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<ArchivedPet | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchArchivedPets();
  }, []);

  const fetchArchivedPets = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', user.id)
          .eq('archived', true)
          .order('archived_at', { ascending: false });

        if (error) throw error;
        setArchivedPets(data || []);
      }
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: "נכשל בטעינת חיות מחמד מאורכבות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePet = async (petId: string, petName: string) => {
    try {
      const { error } = await supabase
        .from('pets')
        .update({
          archived: false,
          archived_at: null,
        })
        .eq('id', petId);

      if (error) throw error;

      toast({
        title: "החיה שוחזרה!",
        description: `${petName} הוחזר לחיות המחמד הפעילות שלך`,
      });

      fetchArchivedPets();
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedPet) return;

    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', selectedPet.id);

      if (error) throw error;

      if (selectedPet.avatar_url) {
        const fileName = selectedPet.avatar_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('pet-avatars')
            .remove([fileName]);
        }
      }

      toast({
        title: "החיה נמחקה לצמיתות",
        description: `${selectedPet.name} הוסר לצמיתות מהמערכת`,
      });

      setShowDeleteConfirm(false);
      setSelectedPet(null);
      fetchArchivedPets();
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <AppHeader title="חיות מחמד בארכיון" showBackButton={true} />

      <div className="px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : archivedPets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-muted to-muted/80 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
              <span className="text-5xl">📦</span>
            </div>
            <h2 className="text-xl font-bold text-foreground font-jakarta mb-2">
              אין חיות בארכיון
            </h2>
            <p className="text-muted-foreground font-jakarta text-sm max-w-xs">
              חיות שתעביר לארכיון יופיעו כאן. תוכל לשחזר אותן בכל עת.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-jakarta mb-4">
              {archivedPets.length} חיות בארכיון
            </p>
            <AnimatePresence>
              {archivedPets.map((pet, index) => (
                <motion.div
                  key={pet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 bg-card border border-border rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/80 overflow-hidden flex-shrink-0 border-2 border-border">
                        {pet.avatar_url ? (
                          <img
                            src={pet.avatar_url}
                            alt={pet.name}
                            className="w-full h-full object-cover opacity-60"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl opacity-60">
                            {pet.type === 'dog' ? '🐕' : '🐈'}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-bold text-base text-foreground font-jakarta">
                          {pet.name}
                        </h3>
                        {pet.breed && (
                          <p className="text-sm text-muted-foreground font-jakarta">
                            {pet.breed}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 font-jakarta mt-1">
                          הועבר לארכיון {new Date(pet.archived_at).toLocaleDateString('he-IL')}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRestorePet(pet.id, pet.name)}
                          className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl font-jakarta font-semibold shadow-sm"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          שחזר
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedPet(pet);
                            setShowDeleteConfirm(true);
                          }}
                          className="rounded-xl font-jakarta font-semibold shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] w-full mx-4" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-jakarta text-xl font-bold text-foreground">
              למחוק את {selectedPet?.name} לצמיתות?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-jakarta text-muted-foreground text-base">
              פעולה זו אינה ניתנת לביטול. {selectedPet?.name} וכל הנתונים המשויכים יימחקו לצמיתות מהמערכת.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto border-2">
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              מחיקה לצמיתות
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArchivedPets;
