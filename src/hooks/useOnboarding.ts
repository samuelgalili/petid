import { useState, useEffect } from "react";

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isComplete, setIsComplete] = useState(true);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem("petid-onboarding-complete");
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
      setIsComplete(false);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("petid-onboarding-complete", "true");
    setShowOnboarding(false);
    setIsComplete(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem("petid-onboarding-complete");
    setShowOnboarding(true);
    setIsComplete(false);
  };

  return {
    showOnboarding,
    isComplete,
    completeOnboarding,
    resetOnboarding,
  };
};
