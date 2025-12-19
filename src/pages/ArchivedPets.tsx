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
      // Permanently delete the pet
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', selectedPet.id);

      if (error) throw error;

      // Delete avatar from storage if exists
      if (selectedPet.avatar_url) {
        const fileName = selectedPet.avatar_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('pet-avatars')
            .remove([fileName]);
        }
      }

      toast({
        title: "Pet Permanently Deleted",
        description: `${selectedPet.name} has been permanently removed`,
      });

      setShowDeleteConfirm(false);
      setSelectedPet(null);
      fetchArchivedPets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-white">
      <AppHeader title="חיות מחמד בארכיון" showBackButton={true} />

      {/* Content */}
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
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
              <span className="text-5xl">📦</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 font-jakarta mb-2">
              No Archived Pets
            </h2>
            <p className="text-gray-600 font-jakarta text-sm max-w-xs">
              Pets you archive will appear here. You can restore them anytime.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-jakarta mb-4">
              {archivedPets.length} archived pet{archivedPets.length !== 1 ? 's' : ''}
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
                  <Card className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                      {/* Pet Avatar */}
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex-shrink-0 border-2 border-gray-300">
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

                      {/* Pet Info */}
                      <div className="flex-1">
                        <h3 className="font-bold text-base text-gray-900 font-jakarta">
                          {pet.name}
                        </h3>
                        {pet.breed && (
                          <p className="text-sm text-gray-600 font-jakarta">
                            {pet.breed}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 font-jakarta mt-1">
                          Archived {new Date(pet.archived_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRestorePet(pet.id, pet.name)}
                          className="bg-[#7DD3C0] hover:bg-[#6BC4AD] text-gray-900 rounded-xl font-jakarta font-semibold shadow-sm"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedPet(pet);
                            setShowDeleteConfirm(true);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-jakarta font-semibold shadow-sm"
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

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-[90vw] w-full mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-jakarta text-xl font-bold text-gray-900">
              Permanently Delete {selectedPet?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-jakarta text-gray-600 text-base">
              This action cannot be undone. {selectedPet?.name} and all associated data will be permanently deleted from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto border-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="font-jakarta font-bold rounded-xl h-12 w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArchivedPets;
