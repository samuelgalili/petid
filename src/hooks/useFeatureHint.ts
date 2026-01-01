import { useState, useEffect, useCallback } from 'react';

const HINTS_STORAGE_KEY = 'petid_shown_hints';

export const useFeatureHint = (featureId: string) => {
  const [shouldShowHint, setShouldShowHint] = useState(false);
  const [isHintVisible, setIsHintVisible] = useState(false);

  useEffect(() => {
    const shownHints = JSON.parse(localStorage.getItem(HINTS_STORAGE_KEY) || '[]');
    if (!shownHints.includes(featureId)) {
      setShouldShowHint(true);
    }
  }, [featureId]);

  const triggerHint = useCallback(() => {
    if (shouldShowHint) {
      setIsHintVisible(true);
    }
  }, [shouldShowHint]);

  const dismissHint = useCallback(() => {
    setIsHintVisible(false);
    setShouldShowHint(false);
    
    const shownHints = JSON.parse(localStorage.getItem(HINTS_STORAGE_KEY) || '[]');
    if (!shownHints.includes(featureId)) {
      shownHints.push(featureId);
      localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(shownHints));
    }
  }, [featureId]);

  const resetHint = useCallback(() => {
    const shownHints = JSON.parse(localStorage.getItem(HINTS_STORAGE_KEY) || '[]');
    const filtered = shownHints.filter((id: string) => id !== featureId);
    localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(filtered));
    setShouldShowHint(true);
  }, [featureId]);

  return {
    shouldShowHint,
    isHintVisible,
    triggerHint,
    dismissHint,
    resetHint
  };
};

// Reset all hints (useful for testing or settings)
export const resetAllHints = () => {
  localStorage.removeItem(HINTS_STORAGE_KEY);
};

// Get list of shown hints
export const getShownHints = (): string[] => {
  return JSON.parse(localStorage.getItem(HINTS_STORAGE_KEY) || '[]');
};
