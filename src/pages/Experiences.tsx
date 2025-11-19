import { Search, MapPin, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";

const Experiences = () => {
  const experiences = [
    {
      name: "שם החוויה",
      location: "שדרות הרצשטיין 1, תל אביב",
      phone: "קריאה 3456-1234",
      rating: 4.5,
      freeSpots: 0,
      allergens: ["אכיל לכלבות", "אכיל להכלים", "אכיל לכלב דוס", "מנגנס"],
      image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=300&fit=crop",
    },
    {
      name: "שם החוויה",
      location: "שדרות הרצשטיין 1, תל אביב",
      phone: "קריאה 3456-1234",
      rating: 4.5,
      freeSpots: 9,
      allergens: ["אכיל לכלבות", "אכיל להכלים", "אכיל לכלב דוס", "מנגנס"],
      image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-b from-pink/30 to-background p-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="חיפוש"
              className="pr-10 rounded-full bg-background"
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">חניות חיות</h1>

        <div className="mb-2">
          <p className="text-sm font-medium mb-2">כל החניות במקום אחד</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Badge variant="outline" className="rounded-full bg-pink text-pink-foreground border-pink whitespace-nowrap">
            מתחים ענגים
          </Badge>
          <Badge variant="outline" className="rounded-full bg-blue text-blue-foreground border-blue whitespace-nowrap">
            קרוב אלי
          </Badge>
          <Badge variant="outline" className="rounded-full bg-green text-green-foreground border-green whitespace-nowrap">
            מומלצים
          </Badge>
        </div>
      </div>

      {/* Experiences List */}
      <div className="px-6 space-y-4">
        {experiences.map((exp, index) => (
          <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow bg-gradient-to-br from-pink/20 to-purple/20">
            <div className="flex gap-4 p-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">{exp.name}</h3>
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{exp.location}</span>
                </div>
                <div className="flex items-center gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{exp.rating}</span>
                  </div>
                  <span className={exp.freeSpots > 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                    {exp.freeSpots > 0 ? `נגיש למקום ⚫ ${exp.freeSpots}` : "נגיש למקום ⚫ 0"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {exp.allergens.map((allergen, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {allergen}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{exp.phone}</p>
              </div>
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                <img
                  src={exp.image}
                  alt={exp.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Experiences;
