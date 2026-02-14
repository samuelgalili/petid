/**
 * Shared time formatting utility for Hebrew locale
 * Prevents duplicating formatDistanceToNow + he locale imports across components
 */
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { he } from "date-fns/locale";

/**
 * Returns a human-readable "time ago" string in Hebrew
 * @param date - Date string or Date object
 * @param addSuffix - Whether to add "לפני" prefix (default: false)
 */
export const timeAgo = (date: string | Date, addSuffix = false): string => {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix, locale: he });
  } catch {
    return "";
  }
};

/**
 * Groups items by time period (today, yesterday, this week, older)
 */
export const getTimePeriod = (date: string | Date): "today" | "yesterday" | "thisWeek" | "older" => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "today";
  if (isYesterday(d)) return "yesterday";
  if (isThisWeek(d)) return "thisWeek";
  return "older";
};

export const timePeriodLabels: Record<string, string> = {
  today: "היום",
  yesterday: "אתמול",
  thisWeek: "השבוע",
  older: "ישן יותר",
};
