import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignupForm } from "@/components/SignupForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { UserX } from "lucide-react";

const Signup = () => {
  const { isAuthenticated, loading } = useAuth();
  const { setGuestMode } = useGuest();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/add-pet");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleGuestMode = () => {
    setGuestMode(true);
    navigate("/add-pet");
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F5F4] to-[#F5F9F8] flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md border-0 shadow-lg rounded-3xl overflow-hidden">
        {/* Hero Image Section */}
        <div className="relative bg-gradient-to-br from-[#E5F5E8] to-[#F0F9F3] pt-8 pb-6 px-6">
          <div className="flex justify-center mb-4">
            <img 
              src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop" 
              alt="Pet" 
              className="w-48 h-48 object-cover rounded-full shadow-lg"
            />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">petiid</h1>
            <p className="text-sm text-muted-foreground">חשבון צדיקה</p>
          </div>
        </div>

        {/* Signup Form Section */}
        <CardContent className="p-6 bg-white">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-center mb-2">הרשמה</h2>
            <p className="text-sm text-center text-muted-foreground">
              צור חשבון חדש והתחל לנהל את חיית המחמד שלך
            </p>
          </div>

          <SignupForm />
          
          <SocialAuthButtons redirectTo="/add-pet" />

          <div className="mt-6 text-center text-sm text-muted-foreground">
            כבר יש לך חשבון?{" "}
            <Link
              to="/auth"
              className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
            >
              התחבר
            </Link>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={handleGuestMode}
            className="w-full mt-4 rounded-full"
          >
            <UserX className="ml-2 h-4 w-4" />
            המשך כאורח
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
