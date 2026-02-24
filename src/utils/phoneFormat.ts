/**
 * Convert an Israeli phone number to E.164 format (+972...)
 * Accepts formats: 0501234567, 972501234567, +972501234567, 050-123-4567
 */
export const toE164 = (phone: string): string => {
  // Strip non-digit characters except leading +
  const cleaned = phone.replace(/[^+\d]/g, '');
  
  // Already in E.164 format
  if (cleaned.startsWith('+972')) return cleaned;
  
  // Has country code without +
  if (cleaned.startsWith('972')) return `+${cleaned}`;
  
  // Local format starting with 0
  if (cleaned.startsWith('0')) return `+972${cleaned.slice(1)}`;
  
  // Assume Israeli number without prefix
  return `+972${cleaned}`;
};

/**
 * Format E.164 phone to display format (e.g., 050-123-4567)
 */
export const toDisplayFormat = (phone: string): string => {
  const e164 = toE164(phone);
  const local = e164.replace('+972', '0');
  if (local.length === 10) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return local;
};

/**
 * Validate that a phone number can be converted to valid E.164
 */
export const isValidIsraeliPhone = (phone: string): boolean => {
  const e164 = toE164(phone);
  // Israeli mobile: +972 followed by 5X and 7 digits = 13 chars total
  return /^\+972[2-9]\d{7,8}$/.test(e164);
};
