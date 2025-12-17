import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SignupForm } from "@/components/SignupForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { UserX } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";

const Signup = () => {
  const { isAuthenticated, loading } = useAuth();
  const { setGuestMode } = useGuest();
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!loading && isAuthenticated) {
        const onboardingCompleted = localStorage.getItem('onboardingCompleted');
        if (onboardingCompleted === 'true') {
          navigate("/home");
        } else {
          navigate("/onboarding");
        }
      }
    };
    checkOnboarding();
  }, [isAuthenticated, loading, navigate]);

  const handleGuestMode = () => {
    setGuestMode(true);
    navigate("/add-pet");
  };

  if (loading) {
    return null;
  }

  return (
    <AuthLayout>
      {/* Signup Form */}
      <div className="mb-5">
        <SignupForm />
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

      {/* Sign In Link */}
      <div className="text-center mb-4">
        <p className="text-gray-700 text-sm font-jakarta">
          Already have an account?{" "}
          <Link to="/auth" className="text-gray-900 font-semibold hover:underline transition-colors">
            Sign In
          </Link>
        </p>
      </div>

      {/* Guest Mode */}
      <Button
        type="button"
        variant="ghost"
        onClick={handleGuestMode}
        className="w-full rounded-full bg-white/95 hover:bg-gray-50 text-gray-900 border-2 border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all font-jakarta font-semibold"
      >
        <UserX className="mr-2 h-4 w-4" />
        Continue as Guest
      </Button>
    </AuthLayout>
  );
};

export default Signup;
