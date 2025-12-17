import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/LoginForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { UserX } from "lucide-react";
import { AuthLoadingSkeleton } from "@/components/AuthLoadingSkeleton";
import { AuthLayout } from "@/components/AuthLayout";

const Auth = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { setGuestMode } = useGuest();
  const navigate = useNavigate();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!authLoading && isAuthenticated) {
        const onboardingCompleted = localStorage.getItem('onboardingCompleted');
        if (onboardingCompleted === 'true') {
          navigate("/home");
        } else {
          navigate("/onboarding");
        }
      }
    };
    checkOnboarding();
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleGuestMode = () => {
    setGuestMode(true);
    navigate("/add-pet");
  };

  if (authLoading || pageLoading) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <AuthLayout>
      {/* Login Form */}
      <div className="mb-5">
        <LoginForm />
      </div>

      {/* Social Auth */}
      <div className="mb-5">
        <SocialAuthButtons redirectTo="/add-pet" />
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-400/30" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-2 text-gray-700 font-jakarta">Or</span>
        </div>
      </div>

      {/* Sign Up Link */}
      <div className="text-center mb-4">
        <p className="text-gray-700 text-sm font-jakarta">
          Don't have an account?{" "}
          <Link to="/signup" className="text-gray-900 font-semibold hover:underline transition-colors">
            Sign Up
          </Link>
        </p>
      </div>

      {/* Guest Mode */}
      <Button
        type="button"
        variant="ghost"
        onClick={handleGuestMode}
        className="w-full rounded-full bg-white/95 hover:bg-gray-50 text-gray-900 border-2 border-gray-200 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm font-jakarta font-semibold"
      >
        <UserX className="mr-2 h-4 w-4" />
        Continue as Guest
      </Button>
    </AuthLayout>
  );
};

export default Auth;
