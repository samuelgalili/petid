import { Search, MapPin, Star, Dog, Clock, Phone, Truck, Bath, Footprints } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { AppHeader } from "@/components/AppHeader";

const Experiences = () => {
  const pricingOneDog = [
    { label: "יומי", price: "110 ₪" },
    { label: "מעל 10 ימים", price: "105 ₪ ליום" },
    { label: "מעל 21 ימים", price: "95 ₪ ליום" },
  ];

  const pricingSpecial = [
    { label: "כלב שלא אוהב זרים", price: "150 ₪" },
    { label: "כלב שלא מסתדר", price: "130 ₪" },
  ];

  const pricingTwoDogs = [
    { label: "יומי", price: "190 ₪" },
  ];

  const extras = [
    { icon: Footprints, label: "טיול לכלב", price: "40 ₪" },
    { icon: Bath, label: "מקלחת וטיפוח", price: "100 ₪" },
    { icon: Truck, label: "שירותי הסעות", price: "לפי מיקום" },
  ];

  const openingHours = [
    { days: "א', ב', ג', ד', ה', ש'", hours: "08:00-13:00 ~ 16:00-18:30" },
    { days: "יום ו'", hours: "08:00-13:00 ~ 16:00-18:00" },
    { days: "ערבי חג", hours: "08:00-13:00 ~ 16:00-18:00" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <AppHeader title="פנסיון לכלבים" showBackButton={true} />
      
      {/* Hero Section */}
      <div className="px-4 py-4">
        <div className="relative rounded-2xl overflow-hidden mb-4">
          <img 
            src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=300&fit=crop" 
            alt="פנסיון לכלבים"
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 right-4 text-white">
            <h1 className="text-2xl font-bold">פנסיון הכלבים שלנו</h1>
            <p className="text-sm opacity-90">טיפול אוהב ומקצועי לחבר הכי טוב שלך</p>
          </div>
        </div>

        {/* Contact */}
        <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">להזמנות ופרטים</p>
              <p className="text-sm text-muted-foreground">צרו קשר עכשיו</p>
            </div>
          </div>
        </Card>

        {/* Pricing - One Dog */}
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Dog className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">מחירון יומי - כלב אחד</h2>
          </div>
          <div className="space-y-2">
            {pricingOneDog.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-foreground">{item.label}</span>
                <span className="font-bold text-primary">{item.price}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Pricing - Two Dogs */}
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-1">
              <Dog className="w-5 h-5 text-primary" />
              <Dog className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-bold text-foreground">מחירון יומי - שני כלבים</h2>
          </div>
          <div className="space-y-2">
            {pricingTwoDogs.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <span className="text-foreground">{item.label}</span>
                <span className="font-bold text-primary">{item.price}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">* יותר כלבים? ניתן לקבל הצעת מחיר מותאמת</p>
        </Card>

        {/* Special Pricing */}
        <Card className="p-4 mb-4 bg-orange-500/5 border-orange-500/20">
          <h2 className="font-bold text-foreground mb-3">מחירון לפי חריגים</h2>
          <div className="space-y-2">
            {pricingSpecial.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-orange-500/10 last:border-0">
                <span className="text-foreground">{item.label}</span>
                <span className="font-bold text-orange-500">{item.price}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Extras */}
        <Card className="p-4 mb-4">
          <h2 className="font-bold text-foreground mb-3">שירותים נוספים</h2>
          <div className="grid grid-cols-3 gap-3">
            {extras.map((item, index) => (
              <div key={index} className="text-center p-3 rounded-xl bg-muted/50">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-medium text-foreground mb-1">{item.label}</p>
                <p className="text-xs font-bold text-primary">{item.price}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Opening Hours */}
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">שעות פתיחה</h2>
          </div>
          <div className="space-y-2">
            {openingHours.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-foreground text-sm">{item.days}</span>
                <span className="text-sm text-muted-foreground">{item.hours}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Important Notes */}
        <Card className="p-4 bg-muted/50">
          <h2 className="font-bold text-foreground mb-3">שימו לב</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>היום הראשון לקליטה נחשב כיום מלא</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>יום איסוף עד 13:00 - לא יחשב כיום</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>איסוף אחרי 13:00 - יחשב כיום נוסף</span>
            </li>
          </ul>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Experiences;
