import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignupForm } from "@/components/SignupForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { UserX } from "lucide-react";
import { PetidLogo } from "@/components/PetidLogo";

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
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl" style={{ background: 'linear-gradient(135deg, hsl(132 43% 88%) 0%, hsl(140 40% 92%) 100%)' }}>
      <Card className="w-full max-w-md border-0 shadow-lg rounded-[2rem] overflow-hidden bg-white/95 backdrop-blur">
        {/* Logo and Animals Section */}
        <div className="pt-12 pb-8 px-6">
          <PetidLogo />
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-center mb-3">Sign Up</h2>
            <p className="text-sm text-center text-muted-foreground leading-relaxed px-4">
              Create a new account and start<br />managing your pet's care
            </p>
          </div>

          <SignupForm />

          <SocialAuthButtons redirectTo="/add-pet" />

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/auth"
              className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={handleGuestMode}
            className="w-full mt-4 rounded-full hover:bg-muted/50"
          >
            <UserX className="ml-2 h-4 w-4" />
            Continue as Guest
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Signup;
