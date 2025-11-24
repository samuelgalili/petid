import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "@/components/LoginForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { UserX } from "lucide-react";

const Auth = () => {
  const { toast } = useToast();
  const { isAuthenticated, loading } = useAuth();
  const { setGuestMode } = useGuest();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/add-pet");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleGuestMode = () => {
    console.log("Guest mode button clicked");
    setGuestMode(true);
    console.log("Guest mode set to true, navigating to /add-pet");
    navigate("/add-pet");
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl" style={{ background: 'linear-gradient(135deg, hsl(174 43% 88%) 0%, hsl(180 40% 92%) 100%)' }}>
      <Card className="w-full max-w-md border-0 shadow-lg rounded-[2rem] overflow-hidden bg-white/95 backdrop-blur">
        {/* Hero Image Section */}
        <div className="pt-12 pb-8 px-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1568572933382-74d440642117?w=500&h=500&fit=crop" 
                alt="Pet" 
                className="w-56 h-56 object-cover rounded-full shadow-xl"
              />
            </div>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 tracking-tight">petiid</h1>
            <p className="text-base text-muted-foreground font-medium">חשבון צדיקה</p>
          </div>
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-center mb-3">ברוכים הבאים</h2>
            <p className="text-sm text-center text-muted-foreground leading-relaxed px-4">
              פשוט שיח בגולה חיה אשראמבל<br />מיל וילדים מרליטה
            </p>
          </div>

          <LoginForm />

          <SocialAuthButtons redirectTo="/add-pet" />

          <div className="mt-6 space-y-3 text-center text-sm">
            <button
              type="button"
              onClick={() =>
                toast({
                  title: "בקרוב",
                  description: "פיצ'ר שחזור סיסמה יתווסף בקרוב",
                })
              }
              className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              שכחתי סיסמה
            </button>

            <div className="text-muted-foreground">
              אין לך חשבון?{" "}
              <Link
                to="/signup"
                className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
              >
                צור חשבון
              </Link>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={handleGuestMode}
              className="w-full mt-2 rounded-full hover:bg-muted/50"
            >
              <UserX className="ml-2 h-4 w-4" />
              המשך כאורח
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
