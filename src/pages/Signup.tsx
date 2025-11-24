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
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="text-center space-y-2 pb-6">
          <CardTitle className="text-2xl font-semibold text-foreground">
            הרשמה
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            צור חשבון חדש כדי להתחיל
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          
          <SocialAuthButtons redirectTo="/add-pet" />

          <div className="mt-6 text-center text-sm text-muted-foreground">
            כבר יש לך חשבון?{" "}
            <Link
              to="/auth"
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={handleGuestMode}
            className="w-full mt-4"
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
