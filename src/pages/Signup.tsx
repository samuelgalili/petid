import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { SignupForm } from "@/components/SignupForm";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import { AuthLoadingSkeleton } from "@/components/AuthLoadingSkeleton";
import petidLogo from "@/assets/petid-logo.png";

const Signup = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { setGuestMode } = useGuest();
  const navigate = useNavigate();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const onboardingCompleted = localStorage.getItem('onboardingCompleted');
      if (onboardingCompleted === 'true') {
        navigate("/home");
      } else {
        navigate("/onboarding");
      }
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 500);
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      {/* Main Card */}
      <div className="w-full max-w-[350px] bg-white border border-gray-300 px-10 py-10 mb-3">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src={petidLogo} alt="Petid" className="h-14 object-contain" />
        </div>

        {/* Tagline */}
        <p className="text-center text-gray-500 font-semibold mb-6 text-base leading-tight">
          Sign up to manage your pets and join our community.
        </p>

        {/* Social Auth First */}
        <SocialAuthButtons redirectTo="/add-pet" />

        {/* OR Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="px-4 text-sm font-semibold text-gray-500">OR</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        {/* Signup Form */}
        <SignupForm />

        {/* Guest Mode */}
        <button
          onClick={handleGuestMode}
          className="w-full mt-4 text-sm text-[#00376B] font-semibold hover:text-gray-900"
        >
          Continue as Guest
        </button>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[350px] bg-white border border-gray-300 py-5 text-center">
        <p className="text-sm text-gray-900">
          Have an account?{" "}
          <Link to="/auth" className="text-[#0095F6] font-semibold hover:text-[#1877F2]">
            Log in
          </Link>
        </p>
      </div>

      {/* App Download Section */}
      <div className="mt-5 text-center">
        <p className="text-sm text-gray-900 mb-4">Get the app.</p>
        <div className="flex gap-2 justify-center">
          <img
            src="https://static.cdninstagram.com/rsrc.php/v3/yz/r/c5Rp7Ym-Klz.png"
            alt="Get it on Google Play"
            className="h-10"
          />
          <img
            src="https://static.cdninstagram.com/rsrc.php/v3/yu/r/EHY6QnZYdNX.png"
            alt="Get it from Microsoft"
            className="h-10"
          />
        </div>
      </div>

      {/* Footer Links */}
      <footer className="mt-8 text-xs text-gray-500 text-center space-x-4">
        <Link to="/terms" className="hover:underline">Terms</Link>
        <Link to="/privacy" className="hover:underline">Privacy</Link>
        <Link to="/support" className="hover:underline">Help</Link>
        <span>© 2024 Petid</span>
      </footer>
    </div>
  );
};

export default Signup;
