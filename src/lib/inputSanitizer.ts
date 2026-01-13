import { z } from "zod";

// ===== HTML/XSS Sanitization =====
export const sanitizeHtml = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// ===== Phone Number Sanitization =====
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
};

// ===== Email Normalization =====
export const normalizeEmail = (email: string): string => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

// ===== URL Validation =====
export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// ===== Generic Text Sanitization =====
export const sanitizeText = (input: string, maxLength = 10000): string => {
  if (!input) return '';
  return input.replace(/\0/g, '').trim().substring(0, maxLength);
};

// ===== Common Validation Schemas =====
export const schemas = {
  productName: z.string()
    .min(2, "שם המוצר חייב להכיל לפחות 2 תווים")
    .max(200, "שם המוצר חייב להיות פחות מ-200 תווים"),
  
  productPrice: z.number()
    .min(0, "המחיר חייב להיות חיובי")
    .max(1000000, "המחיר חייב להיות פחות ממיליון"),
  
  searchQuery: z.string().max(200),
  
  comment: z.string()
    .min(1, "יש להזין תוכן")
    .max(2000, "התגובה חייבת להיות פחות מ-2000 תווים"),
  
  url: z.string().refine(isValidUrl, "כתובת URL לא תקינה"),
};

// ===== Form Validation Helper =====
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.issues.forEach(issue => {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });
  
  return { success: false, errors };
}
