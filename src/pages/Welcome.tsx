import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const Welcome = () => {
  const [selectedPet, setSelectedPet] = useState("");
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedPet) {
      navigate("/home");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 animate-fade-in" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-slide-up">
          <h1 className="text-3xl font-bold mb-3">ברוכים הבאים</h1>
          <p className="text-muted-foreground text-base">
            בחר את סוג חיית המחמד שלך
          </p>
        </div>

        <RadioGroup value={selectedPet} onValueChange={setSelectedPet} className="space-y-3 mb-10">
          <Card className="overflow-hidden border-2 border-border has-[:checked]:border-foreground has-[:checked]:shadow-md transition-all duration-200 hover:border-foreground/50 animate-scale-in" style={{ animationDelay: '100ms' }}>
            <Label
              htmlFor="dog"
              className="flex items-center justify-between p-4 cursor-pointer bg-card hover:bg-muted/30 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <RadioGroupItem value="dog" id="dog" />
                <span className="text-xl font-bold">כלב</span>
              </div>
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-border">
                <img
                  src="https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=200&h=200&fit=crop"
                  alt="כלב"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
            </Label>
          </Card>

          <Card className="overflow-hidden border-2 border-border has-[:checked]:border-foreground has-[:checked]:shadow-md transition-all duration-200 hover:border-foreground/50 animate-scale-in" style={{ animationDelay: '150ms' }}>
            <Label
              htmlFor="cat"
              className="flex items-center justify-between p-4 cursor-pointer bg-card hover:bg-muted/30 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <RadioGroupItem value="cat" id="cat" />
                <span className="text-xl font-bold">חתול</span>
              </div>
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-border">
                <img
                  src="https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&h=200&fit=crop"
                  alt="חתול"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
            </Label>
          </Card>

          <Card className="overflow-hidden border-2 border-border has-[:checked]:border-foreground has-[:checked]:shadow-md transition-all duration-200 hover:border-foreground/50 animate-scale-in" style={{ animationDelay: '200ms' }}>
            <Label
              htmlFor="other"
              className="flex items-center p-4 cursor-pointer bg-card hover:bg-muted/30 transition-all active:scale-[0.98]"
            >
              <RadioGroupItem value="other" id="other" className="ml-4" />
              <span className="text-lg font-semibold">אחר</span>
            </Label>
          </Card>
        </RadioGroup>

        <Button
          onClick={handleContinue}
          disabled={!selectedPet}
          className="w-full h-14 text-base font-bold bg-foreground hover:bg-foreground/90 text-background rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed animate-scale-in"
          style={{ animationDelay: '250ms' }}
        >
          המשך
        </Button>
      </div>
    </div>
  );
};

export default Welcome;
