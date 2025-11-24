import { Menu, Bell, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: "🦴",
      label: "אתני ושטף",
      description: "AMMI SPN",
      path: "/tracker",
      external: false,
      color: "bg-[#FFE5E5]",
      dotColor: "#FFC4C4",
    },
    {
      icon: "🧸",
      label: "בצלין",
      description: "LIYE SOON",
      path: "/parks",
      external: false,
      color: "bg-[#D4F0ED]",
      dotColor: "#9FE2DD",
    },
    {
      icon: "🦴",
      label: "חשבה",
      description: "OROOUN",
      path: "/experiences",
      external: false,
      color: "bg-[#F5F0E8]",
      dotColor: "#E8DCC8",
    },
    {
      icon: "🦅",
      label: "אודיקה",
      description: "PRETECIOUS",
      path: "/tracker",
      external: false,
      color: "bg-[#E8E5FF]",
      dotColor: "#C5BFFF",
    },
    {
      icon: "🪞",
      label: "מדריכה",
      description: "FOR MIRROR",
      path: "/parks",
      external: false,
      color: "bg-[#FFF9E5]",
      dotColor: "#FFF0B8",
    },
    {
      icon: "🎾",
      label: "דינה",
      description: "FOR PA",
      path: "/experiences",
      external: false,
      color: "bg-[#E5F5E8]",
      dotColor: "#C1E8C9",
    },
    {
      icon: "🐾",
      label: "מידעית",
      description: "PAL MELA",
      path: "/tracker",
      external: false,
      color: "bg-[#FFF5E5]",
      dotColor: "#FFE5B8",
    },
    {
      icon: "🦴",
      label: "שינותב",
      description: "DELALEIDUO",
      path: "/parks",
      external: false,
      color: "bg-[#D4F0ED]",
      dotColor: "#9FE2DD",
    },
    {
      icon: "🎀",
      label: "משטיע",
      description: "MEEMINDES",
      path: "https://petid.co.il/catalog-new/",
      external: true,
      color: "bg-[#FFE5E5]",
      dotColor: "#FFC4C4",
    },
  ];

  return (
    <div className="min-h-screen pb-20 animate-fade-in" dir="rtl" style={{ background: 'hsl(48 67% 97%)' }}>
      {/* Header */}
      <div className="bg-[hsl(48_67%_97%)] border-b border-border/30 p-6 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1 mx-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="חיפוש" 
                className="w-full h-10 px-4 rounded-full bg-white border-0 text-sm text-center shadow-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
              <UserX className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Membership Banner */}
        <div className="mb-4">
          <div className="bg-primary text-white rounded-2xl px-4 py-3 text-center font-semibold text-sm shadow-md">
            מנוי שנתיית<br />Membership.yub
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button className="px-4 py-2 rounded-full bg-white text-sm font-medium whitespace-nowrap shadow-sm border border-border/20">
            AUEE ועד
          </button>
          <button className="px-4 py-2 rounded-full bg-white/50 text-sm font-medium whitespace-nowrap">
            לימון LIMOUNT
          </button>
          <button className="px-4 py-2 rounded-full bg-white/50 text-sm font-medium whitespace-nowrap">
            ACCOUION
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4">
          <button className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium shadow-md flex items-center gap-2">
            <span>A</span>
            <span>COCAINT</span>
          </button>
          <button className="px-4 py-2 rounded-full bg-white text-sm font-medium">
            חייב יקרים ACCOUN
          </button>
          <button className="px-4 py-2 rounded-full bg-white text-sm font-medium">
            COOUFOINS
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="px-6 pt-6 grid grid-cols-3 gap-3">
        {features.map((feature, index) => {
          if (feature.external) {
            return (
              <a
                key={index}
                href={feature.path}
                target="_blank"
                rel="noopener noreferrer"
                className={`group ${feature.color} rounded-[1.75rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 min-h-[130px] relative shadow-sm`}
              >
                <div className="absolute top-3 right-3 w-4 h-4 rounded-full" style={{ backgroundColor: feature.dotColor }} />
                <div className="text-4xl mb-1">{feature.icon}</div>
                <div className="text-center">
                  <h3 className="font-bold text-sm mb-0.5 leading-tight">{feature.label}</h3>
                  <p className="text-[9px] text-foreground/50 uppercase tracking-wide font-medium">{feature.description}</p>
                </div>
              </a>
            );
          }
          
          return (
            <div
              key={index}
              onClick={() => navigate(feature.path)}
              className={`group ${feature.color} rounded-[1.75rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 min-h-[130px] relative shadow-sm`}
            >
              <div className="absolute top-3 right-3 w-4 h-4 rounded-full" style={{ backgroundColor: feature.dotColor }} />
              <div className="text-4xl mb-1">{feature.icon}</div>
              <div className="text-center">
                <h3 className="font-bold text-sm mb-0.5 leading-tight">{feature.label}</h3>
                <p className="text-[9px] text-foreground/50 uppercase tracking-wide font-medium">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
