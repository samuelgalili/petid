 /**
  * Haptic Feedback Utilities
  * Native-feeling haptic patterns for mobile interactions
  */
 
 type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";
 
 const patterns: Record<HapticPattern, number | number[]> = {
   light: 10,
   medium: 20,
   heavy: 40,
   success: [10, 50, 10],
   warning: [30, 50, 30],
   error: [50, 100, 50, 100, 50],
   selection: 5,
 };
 
 /**
  * Trigger haptic feedback if supported
  */
 export const haptic = (pattern: HapticPattern = "light"): void => {
   if (typeof navigator !== "undefined" && navigator.vibrate) {
     navigator.vibrate(patterns[pattern]);
   }
 };
 
 /**
  * Check if haptic feedback is supported
  */
 export const isHapticSupported = (): boolean => {
   return typeof navigator !== "undefined" && "vibrate" in navigator;
 };
 
 /**
  * Tap feedback - for button presses
  */
 export const tapFeedback = (): void => {
   haptic("light");
 };
 
 /**
  * Selection feedback - for toggles, selections
  */
 export const selectionFeedback = (): void => {
   haptic("selection");
 };
 
 /**
  * Success feedback - for completed actions
  */
 export const successFeedback = (): void => {
   haptic("success");
 };
 
 /**
  * Error feedback - for failed actions
  */
 export const errorFeedback = (): void => {
   haptic("error");
 };