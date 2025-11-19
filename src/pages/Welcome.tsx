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
    <div className="min-h-screen bg-gradient-to-br from-pink via-background to-blue flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">ברוכים הבאים</h1>
          <p className="text-muted-foreground">
            בחר את סוג חיית המחמד שלך:
            <br />
            אל דאגה, תמיד תוכל לערוך זאת מאוחר יותר.
          </p>
        </div>

        <RadioGroup value={selectedPet} onValueChange={setSelectedPet} className="space-y-4 mb-8">
          <Card className="overflow-hidden border-2 border-transparent has-[:checked]:border-coral transition-all">
            <Label
              htmlFor="dog"
              className="flex items-center justify-between p-4 cursor-pointer bg-gradient-to-br from-amber-100 to-amber-200"
            >
              <div className="flex items-center gap-4">
                <RadioGroupItem value="dog" id="dog" className="border-coral" />
                <span className="text-2xl font-bold">כלב</span>
              </div>
              <div className="w-24 h-24 rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=200&h=200&fit=crop"
                  alt="כלב"
                  className="w-full h-full object-cover"
                />
              </div>
            </Label>
          </Card>

          <Card className="overflow-hidden border-2 border-transparent has-[:checked]:border-coral transition-all">
            <Label
              htmlFor="cat"
              className="flex items-center justify-between p-4 cursor-pointer bg-gradient-to-br from-amber-100 to-amber-200"
            >
              <div className="flex items-center gap-4">
                <RadioGroupItem value="cat" id="cat" className="border-coral" />
                <span className="text-2xl font-bold">חתול</span>
              </div>
              <div className="w-24 h-24 rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&h=200&fit=crop"
                  alt="חתול"
                  className="w-full h-full object-cover"
                />
              </div>
            </Label>
          </Card>

          <Card className="overflow-hidden border-2 border-transparent has-[:checked]:border-coral transition-all">
            <Label
              htmlFor="other"
              className="flex items-center p-4 cursor-pointer bg-muted"
            >
              <RadioGroupItem value="other" id="other" className="ml-4 border-coral" />
              <span className="text-lg font-medium">אחר</span>
            </Label>
          </Card>
        </RadioGroup>

        <Button
          onClick={handleContinue}
          disabled={!selectedPet}
          className="w-full h-14 text-lg font-bold bg-coral hover:bg-coral/90 text-coral-foreground rounded-full"
        >
          המשך
        </Button>
      </div>
    </div>
  );
};

export default Welcome;
