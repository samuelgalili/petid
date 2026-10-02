const passwordResetMessages: Record<string, string> = {
  "Too many invalid reset attempts": "יותר מדי ניסיונות שגויים לאיפוס. הכתובת נעולה לזמן ארוך.",
  "Invalid or expired reset code": "הקוד שגוי או שפג תוקפו.",
  "Too many requests": "יותר מדי בקשות. נסו שוב מאוחר יותר.",
};

export const passwordResetErrorText = (error: unknown, fallback: string): string => {
  const message = error instanceof Error ? error.message : "";
  if (!message) return fallback;
  return passwordResetMessages[message] ?? message;
};

export const EMAIL_VERIFICATION_LOCK_TEXT = "הכתובת נעולה לזמן ארוך. נסו שוב מאוחר יותר.";

export const CHAT_HOURLY_LIMIT_TEXT = "הגעתם למגבלת ההודעות לשעה.";

export const PASSWORD_RESET_NEUTRAL_TEXT = "אם הכתובת קיימת במערכת, יישלח אליה קוד.";
