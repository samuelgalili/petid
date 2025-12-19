import { Search, MapPin, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { AppHeader } from "@/components/AppHeader";

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
      <AppHeader title="חניות חיות" showBackButton={true} />
      
      {/* Search and filters */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="חיפוש"
              className="pr-10 rounded-full bg-muted/50"
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-4">חניות חיות</h1>

        <div className="mb-2">
          <p className="text-sm font-medium text-muted-foreground mb-2">כל החניות במקום אחד</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Badge variant="outline" className="rounded-full bg-primary/10 text-primary border-primary/30 whitespace-nowrap">
            מתחים ענגים
          </Badge>
          <Badge variant="outline" className="rounded-full bg-accent/10 text-accent border-accent/30 whitespace-nowrap">
            קרוב אלי
          </Badge>
          <Badge variant="outline" className="rounded-full bg-success/10 text-success border-success/30 whitespace-nowrap">
            מומלצים
          </Badge>
        </div>
      </div>

      {/* Experiences List */}
      <div className="px-6 space-y-4">
        {experiences.map((exp, index) => (
          <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow bg-card border-border">
            <div className="flex gap-4 p-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground mb-2">{exp.name}</h3>
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-accent" />
                  <span>{exp.location}</span>
                </div>
                <div className="flex items-center gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    <span className="font-medium text-foreground">{exp.rating}</span>
                  </div>
                  <span className={exp.freeSpots > 0 ? "text-success font-medium" : "text-destructive font-medium"}>
                    {exp.freeSpots > 0 ? `נגיש למקום ⚫ ${exp.freeSpots}` : "נגיש למקום ⚫ 0"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {exp.allergens.map((allergen, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-muted text-muted-foreground">
                      {allergen}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{exp.phone}</p>
              </div>
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-border">
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
