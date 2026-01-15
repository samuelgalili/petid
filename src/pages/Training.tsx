import { AppHeader } from "@/components/AppHeader";
import { TrainingChat } from "@/components/training/TrainingChat";
import BottomNav from "@/components/BottomNav";

const Training = () => {
  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col" dir="rtl">
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
