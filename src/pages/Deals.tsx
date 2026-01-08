import { ArrowRight, Tag, Clock, Percent, Gift, Star, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const Deals = () => {
  const navigate = useNavigate();

  const featuredDeals = [
    {
      id: 1,
      title: "20% הנחה על מזון יבש",
      description: "על כל מותגי המזון היבש לכלבים וחתולים",
      discount: "20%",
      validUntil: "31.12.2025",
      category: "מזון",
      image: "/placeholder.svg",
      isHot: true,
    },
    {
      id: 2,
      title: "קנה 2 קבל 1 מתנה",
      description: "על כל מוצרי הטיפוח והניקיון",
      discount: "1+2",
      validUntil: "15.01.2026",
      category: "טיפוח",
      image: "/placeholder.svg",
      isHot: true,
    },
    {
      id: 3,
      title: "משלוח חינם",
      description: "בקניה מעל ₪150",
      discount: "חינם",
      validUntil: "תמיד",
      category: "משלוחים",
      image: "/placeholder.svg",
      isHot: false,
    },
  ];

  const categories = [
    { name: "הכל", icon: Star, active: true },
    { name: "מזון", icon: Tag, active: false },
    { name: "טיפוח", icon: Gift, active: false },
    { name: "אביזרים", icon: Percent, active: false },
  ];

  const allDeals = [
    { title: "15% הנחה על צעצועים", category: "אביזרים", discount: "15%", validUntil: "01.02.2026" },
    { title: "10% הנחה לחברי מועדון", category: "כללי", discount: "10%", validUntil: "תמיד" },
    { title: "חטיפים במחיר מיוחד", category: "מזון", discount: "25%", validUntil: "20.01.2026" },
    { title: "מיטות במבצע", category: "אביזרים", discount: "30%", validUntil: "31.01.2026" },
  ];

  return (
    <div className="min-h-screen bg-surface pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
          </Button>
          <h1 className="text-xl font-bold text-foreground font-jakarta">מבצעים והטבות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-yellow rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-24 h-24 bg-primary-hover/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary-hover/30 rounded-full translate-x-1/2 translate-y-1/2" />
          <div className="relative z-10">
            <Badge className="bg-brand-red text-white mb-3">חם!</Badge>
            <h2 className="text-2xl font-black text-neutral-dark font-jakarta mb-2">
              מבצעי סוף שנה
            </h2>
            <p className="text-sm text-neutral-dark/80 font-jakarta mb-4">
              הנחות של עד 50% על מגוון מוצרים
            </p>
            <Button 
              onClick={() => navigate("/shop")}
              className="btn-primary"
            >
              לחנות
            </Button>
          </div>
        </motion.div>

        {/* Categories Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat, index) => (
            <motion.button
              key={cat.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                cat.active
                  ? "bg-primary text-neutral-dark font-bold"
                  : "bg-card text-muted-foreground hover:bg-border"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              <span className="text-sm font-jakarta">{cat.name}</span>
            </motion.button>
          ))}
        </div>

        {/* Featured Deals */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground font-jakarta flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            מבצעים מובילים
          </h3>
          {featuredDeals.map((deal, index) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-base rounded-xl p-4 flex gap-4 hover:shadow-card-hover transition-all cursor-pointer"
              onClick={() => navigate("/shop")}
            >
              <div className="w-20 h-20 bg-surface rounded-lg flex items-center justify-center">
                <Tag className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-bold text-foreground font-jakarta">{deal.title}</h4>
                  {deal.isHot && (
                    <Badge className="bg-brand-red text-white text-xs">חם!</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-jakarta mb-2">{deal.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    {deal.discount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    עד {deal.validUntil}
                  </span>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-muted-foreground self-center" />
            </motion.div>
          ))}
        </div>

        {/* All Deals */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground font-jakarta">כל המבצעים</h3>
          <div className="grid grid-cols-2 gap-3">
            {allDeals.map((deal, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="card-base rounded-xl p-4 hover:shadow-card-hover transition-all cursor-pointer"
                onClick={() => navigate("/shop")}
              >
                <Badge variant="outline" className="mb-2 text-xs">
                  {deal.category}
                </Badge>
                <h4 className="font-bold text-foreground font-jakarta text-sm mb-2">{deal.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-primary font-jakarta">{deal.discount}</span>
                  <span className="text-xs text-muted-foreground">עד {deal.validUntil}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Newsletter CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-base rounded-xl p-6 text-center"
        >
          <Gift className="w-10 h-10 mx-auto mb-3 text-primary" />
          <h3 className="font-bold text-foreground font-jakarta mb-2">
            לא לפספס מבצעים!
          </h3>
          <p className="text-sm text-muted-foreground font-jakarta mb-4">
            הפעילו התראות כדי לקבל עדכונים על מבצעים חדשים
          </p>
          <Button 
            onClick={() => navigate("/notifications")}
            className="btn-primary w-full"
          >
            הפעלת התראות
          </Button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Deals;
