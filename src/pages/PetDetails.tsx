import { ArrowLeft, Camera, Calendar, Info, History, Heart, Stethoscope, Pill, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, differenceInYears, differenceInMonths } from "date-fns";

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

interface BreedHistory {
  id: string;
  breed: string | null;
  confidence: number | null;
  detected_at: string;
  avatar_url: string | null;
}

const PetDetails = () => {
  const navigate = useNavigate();
  const { petId } = useParams<{ petId: string }>();
  const { toast } = useToast();
  const [pet, setPet] = useState<Pet | null>(null);
  const [breedHistory, setBreedHistory] = useState<BreedHistory[]>([]);
  const [loading, setLoading] = useState(true);

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
            title: "Pet not found",
            description: "The pet you're looking for doesn't exist.",
            variant: "destructive",
          });
          navigate('/home');
          return;
        }

        setPet(petData);

        // Fetch breed detection history
        const { data: historyData, error: historyError } = await supabase
          .from('breed_detection_history')
          .select('*')
          .eq('pet_id', petId)
          .order('detected_at', { ascending: false });

        if (historyError) throw historyError;
        setBreedHistory(historyData || []);

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

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return "Unknown";
    const birth = new Date(birthDate);
    const years = differenceInYears(new Date(), birth);
    const months = differenceInMonths(new Date(), birth) % 12;
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? `, ${months} month${months !== 1 ? 's' : ''}` : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 z-40">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/home')}
            className="rounded-full hover:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
        </div>
        <div className="h-16"></div>
        <div className="px-4 pt-6">
          <div className="animate-pulse">
            <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pet) return null;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 shadow-sm z-40">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/home')}
            className="rounded-full hover:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900 font-jakarta">Pet Profile</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="h-16"></div>

      {/* Content */}
      <div className="px-4 pt-6">
        {/* Pet Avatar & Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <Avatar className="w-32 h-32 border-[4px] border-white ring-4 ring-gray-100 shadow-xl mb-4">
            <AvatarImage src={pet.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="bg-gradient-secondary text-white text-4xl font-bold">
              {pet.type === 'dog' ? '🐕' : '🐈'}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-3xl font-bold text-gray-900 font-jakarta mb-1">{pet.name}</h2>
          <p className="text-base text-gray-500 font-jakarta capitalize">{pet.type}</p>
        </motion.div>

        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
            <h3 className="text-lg font-bold text-gray-900 font-jakarta mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-secondary" />
              Profile Information
            </h3>
          <Card className="p-5 bg-gradient-to-br from-[#F5F5F5] to-[#FAFAFA] border-2 border-gray-100 rounded-3xl shadow-sm">
            <div className="space-y-4">
              {/* Breed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#FFE8D6] flex items-center justify-center">
                    <span className="text-lg">🐾</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-jakarta">Breed</p>
                    <p className="text-sm font-bold text-gray-900 font-jakarta">
                      {pet.breed || "Unknown"}
                    </p>
                  </div>
                </div>
                {pet.breed_confidence !== null && (
                  <span className={`text-2xl ${pet.breed_confidence > 70 ? 'text-success' : 'text-error'}`}>
                    {pet.breed_confidence > 70 ? '✓' : '✗'}
                  </span>
                )}
              </div>

              {/* Age */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-jakarta">Age</p>
                  <p className="text-sm font-bold text-gray-900 font-jakarta">
                    {calculateAge(pet.birth_date)}
                  </p>
                </div>
              </div>

              {/* Birth Date */}
              {pet.birth_date && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#FFE5F0] flex items-center justify-center">
                    <span className="text-lg">🎂</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-jakarta">Birth Date</p>
                    <p className="text-sm font-bold text-gray-900 font-jakarta">
                      {format(new Date(pet.birth_date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {/* Gender */}
              {pet.gender && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#E8E5FF] flex items-center justify-center">
                    <span className="text-lg">{pet.gender === 'male' ? '♂️' : '♀️'}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-jakarta">Gender</p>
                    <p className="text-sm font-bold text-gray-900 font-jakarta capitalize">
                      {pet.gender}
                    </p>
                  </div>
                </div>
              )}

              {/* Neutered Status */}
              {pet.is_neutered !== null && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#E5F5FF] flex items-center justify-center">
                    <Heart className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-jakarta">Status</p>
                    <p className="text-sm font-bold text-gray-900 font-jakarta">
                      {pet.is_neutered ? 'Neutered/Spayed' : 'Not Neutered/Spayed'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Breed Detection History */}
        {breedHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h3 className="text-lg font-bold text-gray-900 font-jakarta mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-secondary" />
              Breed Detection History
            </h3>
            <div className="space-y-3">
              {breedHistory.map((record, index) => (
                <Card
                  key={record.id}
                  className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {record.avatar_url && (
                      <img
                        src={record.avatar_url}
                        alt="Detection"
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-gray-900 font-jakarta">
                          {record.breed || "Unknown"}
                        </p>
                        {record.confidence !== null && (
                          <span className={`text-lg ${record.confidence > 70 ? 'text-success' : 'text-error'}`}>
                            {record.confidence > 70 ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-jakarta">
                        {format(new Date(record.detected_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      {record.confidence !== null && (
                        <p className="text-xs text-gray-600 font-jakarta mt-1">
                          Confidence: {record.confidence}%
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Health Records - Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
            <h3 className="text-lg font-bold text-gray-900 font-jakarta mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-secondary" />
              Health Records
            </h3>
          <Card className="p-6 bg-gradient-to-br from-[#F5F5F5] to-[#FAFAFA] border-2 border-dashed border-gray-200 rounded-3xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FFE8D6] to-[#FFE5F0] rounded-full flex items-center justify-center mb-4">
                <Pill className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-base font-bold text-gray-900 font-jakarta mb-2">
                No Health Records Yet
              </h4>
              <p className="text-sm text-gray-500 font-jakarta mb-4">
                Start tracking vaccinations, medications, and vet visits
              </p>
              <Button
                onClick={() => toast({ title: "Coming Soon", description: "Health records feature is under development" })}
                className="bg-gradient-secondary hover:opacity-90 text-white rounded-full font-jakarta font-bold px-6 shadow-md"
              >
                Add Health Record
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 pb-6"
        >
          <Button
            onClick={() => navigate(`/breed-history/${pet.id}`)}
            className="w-full h-14 bg-white border-2 border-gray-200 hover:border-secondary hover:bg-secondary/5 text-gray-900 rounded-2xl font-jakarta font-bold shadow-sm"
          >
            <History className="w-5 h-5 mr-2" />
            View Full Breed History
          </Button>
          <Button
            onClick={() => toast({ title: "Coming Soon", description: "Edit profile feature is under development" })}
            className="w-full h-14 bg-gradient-primary hover:opacity-90 text-gray-900 rounded-2xl font-jakarta font-bold shadow-md"
          >
            Edit Profile
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PetDetails;
