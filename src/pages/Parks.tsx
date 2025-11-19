import { Search, MapPin, Star, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const Parks = () => {
  const parks = [
    {
      name: "שם הגינה",
      address: "שדרות הרצשטיין 1, תל אביב",
      distance: "280m",
      rating: 4.5,
      image: "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=300&fit=crop",
    },
    {
      name: "שם הגינה",
      address: "שדרות הרצשטיין 1, תל אביב",
      distance: "280m",
      rating: 4.5,
      image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=300&fit=crop",
    },
    {
      name: "שם הגינה",
      address: "שדרות הרצשטיין 1, תל אביב",
      distance: "280m",
      rating: 4.5,
      image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-b from-green/30 to-background p-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="חיפוש"
              className="pr-10 rounded-full bg-background"
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">גינות כלבים</h1>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">כל הגינים</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Badge variant="outline" className="rounded-full bg-pink text-pink-foreground border-pink whitespace-nowrap">
            היסטוריה
          </Badge>
          <Badge variant="outline" className="rounded-full bg-blue text-blue-foreground border-blue whitespace-nowrap">
            קרוב אלי
          </Badge>
          <Badge variant="outline" className="rounded-full bg-green text-green-foreground border-green whitespace-nowrap">
            מומלצים
          </Badge>
        </div>
      </div>

      {/* Parks List */}
      <div className="px-6 space-y-4">
        {parks.map((park, index) => (
          <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex gap-4 p-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">{park.name}</h3>
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{park.address}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{park.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{park.distance}</span>
                  </div>
                </div>
              </div>
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                <img
                  src={park.image}
                  alt={park.name}
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

export default Parks;
