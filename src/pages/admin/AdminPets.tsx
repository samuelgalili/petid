import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Search,
  Filter,
  Dog,
  Cat,
  Bird,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  User,
  Calendar,
  MapPin,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  gender: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  created_at: string;
  is_archived: boolean;
  user_id: string;
  owner?: {
    full_name: string;
    avatar_url: string;
    email: string;
  };
}

const petTypeIcons: Record<string, any> = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
};

const AdminPets = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<Pet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pets")
        .select(`
          *,
          owner:profiles!pets_user_id_fkey(full_name, avatar_url, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setPets(data as any);
      } else {
        // Mock data
        setPets([
          {
            id: "1",
            name: "Luna",
            type: "dog",
            breed: "Golden Retriever",
            gender: "female",
            birth_date: "2023-03-15",
            avatar_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200",
            created_at: "2024-01-15",
            is_archived: false,
            user_id: "u1",
            owner: { full_name: "דני כהן", avatar_url: "", email: "dani@email.com" },
          },
          {
            id: "2",
            name: "Mimi",
            type: "cat",
            breed: "Persian",
            gender: "female",
            birth_date: "2022-08-20",
            avatar_url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200",
            created_at: "2024-02-10",
            is_archived: false,
            user_id: "u2",
            owner: { full_name: "שרה לוי", avatar_url: "", email: "sara@email.com" },
          },
          {
            id: "3",
            name: "Bobi",
            type: "dog",
            breed: "Labrador",
            gender: "male",
            birth_date: "2024-01-10",
            avatar_url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200",
            created_at: "2024-03-05",
            is_archived: false,
            user_id: "u3",
            owner: { full_name: "אבי ישראלי", avatar_url: "", email: "avi@email.com" },
          },
          {
            id: "4",
            name: "Tweety",
            type: "bird",
            breed: "Canary",
            gender: "male",
            birth_date: "2023-06-01",
            avatar_url: null,
            created_at: "2024-04-01",
            is_archived: true,
            user_id: "u4",
            owner: { full_name: "מיכל רוזן", avatar_url: "", email: "michal@email.com" },
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching pets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchivePet = async (id: string, archive: boolean) => {
    try {
      await supabase.from("pets").update({ archived: archive }).eq("id", id);
      setPets(pets.map((p) => (p.id === id ? { ...p, is_archived: archive } : p)));
      toast({ title: archive ? "החיה הועברה לארכיון" : "החיה שוחזרה" });
    } catch (error) {
      toast({ title: "שגיאה בעדכון", variant: "destructive" });
    }
  };

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return "לא ידוע";
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    
    if (years > 0) return `${years} שנים`;
    if (months > 0) return `${months} חודשים`;
    return "פחות מחודש";
  };

  const filteredPets = pets.filter((pet) => {
    const matchesSearch =
      pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.breed?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || pet.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const stats = {
    total: pets.length,
    dogs: pets.filter((p) => p.type === "dog").length,
    cats: pets.filter((p) => p.type === "cat").length,
    other: pets.filter((p) => !["dog", "cat"].includes(p.type)).length,
    archived: pets.filter((p) => p.is_archived).length,
  };

  return (
    <AdminLayout title="מאגר חיות מחמד" icon={Heart} breadcrumbs={[{ label: "חיות" }]}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm opacity-80">סה"כ חיות</p>
            </div>
            <Heart className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stats.dogs}</p>
              <p className="text-sm opacity-80">כלבים</p>
            </div>
            <Dog className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-pink-500 to-rose-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stats.cats}</p>
              <p className="text-sm opacity-80">חתולים</p>
            </div>
            <Cat className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-sky-500 to-blue-500 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stats.other}</p>
              <p className="text-sm opacity-80">אחרים</p>
            </div>
            <Bird className="w-8 h-8 opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-slate-500 to-slate-600 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{stats.archived}</p>
              <p className="text-sm opacity-80">בארכיון</p>
            </div>
            <Trash2 className="w-8 h-8 opacity-60" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, גזע או בעלים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="סוג חיה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            <SelectItem value="dog">כלבים</SelectItem>
            <SelectItem value="cat">חתולים</SelectItem>
            <SelectItem value="bird">ציפורים</SelectItem>
            <SelectItem value="other">אחר</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchPets} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Pets Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredPets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Heart className="w-16 h-16 mb-4 opacity-50" />
          <p>לא נמצאו חיות</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPets.map((pet, index) => {
            const PetIcon = petTypeIcons[pet.type] || Heart;

            return (
              <motion.div
                key={pet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${pet.is_archived ? "opacity-60" : ""}`}>
                  <div className="relative h-40 bg-gradient-to-br from-muted to-muted/50">
                    {pet.avatar_url ? (
                      <img
                        src={pet.avatar_url}
                        alt={pet.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PetIcon className="w-16 h-16 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Type Badge */}
                    <Badge className="absolute top-2 right-2">
                      <PetIcon className="w-3 h-3 ml-1" />
                      {pet.type === "dog" ? "כלב" : pet.type === "cat" ? "חתול" : pet.type}
                    </Badge>

                    {pet.is_archived && (
                      <Badge variant="destructive" className="absolute top-2 left-2">
                        בארכיון
                      </Badge>
                    )}

                    {/* Actions */}
                    <div className="absolute bottom-2 left-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="secondary" className="w-7 h-7">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => setSelectedPet(pet)}>
                            <Eye className="w-4 h-4 ml-2" />
                            פרטים מלאים
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleArchivePet(pet.id, !pet.is_archived)}
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            {pet.is_archived ? "שחזר" : "העבר לארכיון"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{pet.name}</h3>
                      <span className="text-sm text-muted-foreground">
                        {pet.gender === "male" ? "♂️" : pet.gender === "female" ? "♀️" : ""}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {pet.breed || "גזע לא ידוע"} • {getAge(pet.birth_date)}
                    </p>

                    {/* Owner Info */}
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={pet.owner?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {pet.owner?.full_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate">
                        {pet.owner?.full_name || "בעלים לא ידוע"}
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pet Details Dialog */}
      <Dialog open={!!selectedPet} onOpenChange={() => setSelectedPet(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>פרטי חיית מחמד</DialogTitle>
          </DialogHeader>
          {selectedPet && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={selectedPet.avatar_url || ""} />
                  <AvatarFallback className="text-2xl">
                    {selectedPet.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedPet.name}</h3>
                  <p className="text-muted-foreground">{selectedPet.breed}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">סוג</p>
                  <p className="font-medium">{selectedPet.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">מין</p>
                  <p className="font-medium">
                    {selectedPet.gender === "male" ? "זכר" : selectedPet.gender === "female" ? "נקבה" : "לא ידוע"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">גיל</p>
                  <p className="font-medium">{getAge(selectedPet.birth_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">תאריך הוספה</p>
                  <p className="font-medium">
                    {format(new Date(selectedPet.created_at), "dd/MM/yyyy", { locale: he })}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">בעלים</p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedPet.owner?.avatar_url} />
                    <AvatarFallback>{selectedPet.owner?.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedPet.owner?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedPet.owner?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPets;
