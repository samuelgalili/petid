import * as React from 'react';

type FontSize = 'small' | 'medium' | 'large';

interface AccessibilitySettings {
  fontSize: FontSize;
  highContrast: boolean;
  reduceMotion: boolean;
}

interface AccessibilityContextType extends AccessibilitySettings {
  setFontSize: (size: FontSize) => void;
  setHighContrast: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
}

const AccessibilityContext = React.createContext<AccessibilityContextType | undefined>(undefined);

const defaultSettings: AccessibilitySettings = {
  fontSize: 'medium',
  highContrast: false,
  reduceMotion: false,
};

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AccessibilitySettings>(defaultSettings);

  React.useEffect(() => {
    const stored = localStorage.getItem('petid-accessibility');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse accessibility settings:', e);
      }
    }
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    if (settings.fontSize === 'small') root.classList.add('text-sm');
    else if (settings.fontSize === 'large') root.classList.add('text-lg');
    else root.classList.add('text-base');

    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    localStorage.setItem('petid-accessibility', JSON.stringify(settings));
  }, [settings]);

  const setFontSize = React.useCallback((fontSize: FontSize) => {
    setSettings(prev => ({ ...prev, fontSize }));
  }, []);

  const setHighContrast = React.useCallback((highContrast: boolean) => {
    setSettings(prev => ({ ...prev, highContrast }));
  }, []);

  const setReduceMotion = React.useCallback((reduceMotion: boolean) => {
    setSettings(prev => ({ ...prev, reduceMotion }));
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        ...settings,
        setFontSize,
        setHighContrast,
        setReduceMotion,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = React.useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}
