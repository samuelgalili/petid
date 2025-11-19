import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "@/components/LoginForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const { toast } = useToast();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/add-pet");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="text-center space-y-2 pb-6">
          <CardTitle className="text-2xl font-semibold text-foreground">
            התחברות
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
            >
              Forgot password?
            </button>

            <div className="text-muted-foreground">
              אין לך חשבון?{" "}
              <Link
                to="/signup"
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
              >
                Create account
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
