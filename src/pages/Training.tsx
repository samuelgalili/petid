import { AppHeader } from "@/components/AppHeader";
import { TrainingChat } from "@/components/training/TrainingChat";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";

const Training = () => {
  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col" dir="rtl">
      <SEO title="אימונים" description="שירותי אילוף כלבים מקצועיים - משמעת, סוציאליזציה ועוד" url="/training" />
      <AppHeader 
        title="אילוף כלבים" 
        showBackButton={true}
        showMenuButton={false}
      />
      
      <div className="flex-1 overflow-hidden pb-[70px]">
        <TrainingChat />
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Training;
