import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

type StrengthLevel = {
  label: string;
  color: string;
  barColor: string;
  width: string;
};

const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0;
  
  let strength = 0;
  
  // Length check
  if (password.length >= 6) strength += 1;
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1; // Special characters
  
  // Return strength score (0-7)
  return Math.min(strength, 7);
};

const getStrengthLevel = (score: number): StrengthLevel => {
  if (score === 0) {
    return {
      label: "",
      color: "",
      barColor: "",
      width: "0%",
    };
  } else if (score <= 2) {
    return {
      label: "חלש",
      color: "text-red-600",
      barColor: "bg-red-500",
      width: "33%",
    };
  } else if (score <= 4) {
    return {
      label: "בינוני",
      color: "text-orange-600",
      barColor: "bg-orange-500",
      width: "66%",
    };
  } else {
    return {
      label: "חזק",
      color: "text-green-600",
      barColor: "bg-green-500",
      width: "100%",
    };
  }
};

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);
  const level = useMemo(() => getStrengthLevel(strength), [strength]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-in-out",
            level.barColor
          )}
          style={{ width: level.width }}
        />
      </div>
      {level.label && (
        <p className={cn("text-sm font-medium", level.color)}>
          חוזק סיסמה: {level.label}
        </p>
      )}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className={password.length >= 6 ? "text-green-600" : ""}>
          {password.length >= 6 ? "✓" : "○"} לפחות 6 תווים
        </p>
        <p className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
          {/[A-Z]/.test(password) ? "✓" : "○"} אות גדולה אחת לפחות
        </p>
        <p className={/[a-z]/.test(password) ? "text-green-600" : ""}>
          {/[a-z]/.test(password) ? "✓" : "○"} אות קטנה אחת לפחות
        </p>
        <p className={/[0-9]/.test(password) ? "text-green-600" : ""}>
          {/[0-9]/.test(password) ? "✓" : "○"} מספר אחד לפחות
        </p>
      </div>
    </div>
  );
};
