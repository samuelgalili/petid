import { useCallback } from 'react';
import { z } from 'zod';
import { sanitizeHtml, sanitizePhone, normalizeEmail, sanitizeText } from '@/lib/inputSanitizer';

// Enhanced validation schemas
export const securitySchemas = {
  // User input schemas
  email: z.string()
    .email("כתובת אימייל לא תקינה")
    .max(255)
    .transform(normalizeEmail),
  
  phone: z.string()
    .min(9, "מספר טלפון קצר מדי")
    .max(15, "מספר טלפון ארוך מדי")
    .transform(sanitizePhone)
    .refine(phone => /^[0-9+]+$/.test(phone), "מספר טלפון לא תקין"),
  
  password: z.string()
    .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
    .max(100, "הסיסמה ארוכה מדי")
    .regex(/[A-Z]/, "נדרשת אות גדולה אחת לפחות")
    .regex(/[a-z]/, "נדרשת אות קטנה אחת לפחות")
    .regex(/[0-9]/, "נדרשת ספרה אחת לפחות"),
  
  username: z.string()
    .min(3, "שם המשתמש קצר מדי")
    .max(30, "שם המשתמש ארוך מדי")
    .regex(/^[a-zA-Z0-9_]+$/, "שם משתמש יכול להכיל רק אותיות, מספרים וקו תחתון"),
  
  displayName: z.string()
    .min(2, "השם קצר מדי")
    .max(50, "השם ארוך מדי")
    .transform(str => sanitizeText(str)),
  
  // Content schemas
  comment: z.string()
    .min(1, "התוכן ריק")
    .max(2000, "התוכן ארוך מדי")
    .transform(str => sanitizeHtml(str)),
  
  bio: z.string()
    .max(500, "הביוגרפיה ארוכה מדי")
    .transform(sanitizeHtml),
  
  // Address schemas
  address: z.object({
    street: z.string().min(2).max(200).transform(str => sanitizeText(str)),
    city: z.string().min(2).max(100).transform(str => sanitizeText(str)),
    postalCode: z.string().max(10).optional(),
    country: z.string().max(100).default('ישראל'),
  }),
  
  // Payment schemas (never store full card numbers)
  cardLast4: z.string().length(4).regex(/^\d{4}$/),
  
  // File schemas
  imageUrl: z.string()
    .url("כתובת URL לא תקינה")
    .refine(url => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }, "רק HTTP/HTTPS URLs מותרים"),
  
  // Search/query schemas (prevent injection)
  searchQuery: z.string()
    .max(200)
    .transform(str => str.replace(/[<>'"`;]/g, '')),
};

// SQL injection prevention patterns
const SQL_INJECTION_PATTERNS = [
  /('|"|;|--|\/\*|\*\/|@@|@)/gi,
  /(union|select|insert|update|delete|drop|truncate|exec|execute)/gi,
  /(or\s+1\s*=\s*1|and\s+1\s*=\s*1)/gi,
];

// XSS prevention patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /on\w+\s*=/gi,
  /javascript:/gi,
  /data:/gi,
];

/**
 * Security validation hook
 */
export const useSecurityValidation = () => {
  const validateInput = useCallback(<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): { success: true; data: T } | { success: false; errors: string[] } => {
    try {
      const result = schema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return {
        success: false,
        errors: result.error.issues.map(i => i.message),
      };
    } catch (error) {
      return { success: false, errors: ['שגיאת ולידציה'] };
    }
  }, []);

  const detectSQLInjection = useCallback((input: string): boolean => {
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
  }, []);

  const detectXSS = useCallback((input: string): boolean => {
    return XSS_PATTERNS.some(pattern => pattern.test(input));
  }, []);

  const sanitizeForDB = useCallback((input: string): string => {
    let sanitized = input;
    // Remove potential SQL injection patterns
    sanitized = sanitized.replace(/['"`;]/g, '');
    // Remove potential script tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    return sanitized.trim();
  }, []);

  const validateAndSanitize = useCallback((
    input: string,
    type: 'text' | 'html' | 'email' | 'phone' | 'search' = 'text'
  ): { safe: boolean; value: string; warnings: string[] } => {
    const warnings: string[] = [];
    let value = input;

    // Check for SQL injection
    if (detectSQLInjection(input)) {
      warnings.push('זוהו תווים חשודים');
      value = sanitizeForDB(value);
    }

    // Check for XSS
    if (detectXSS(input)) {
      warnings.push('זוהה תוכן לא מותר');
      value = sanitizeHtml(value);
    }

    // Apply type-specific sanitization
    switch (type) {
      case 'email':
        value = normalizeEmail(value);
        break;
      case 'phone':
        value = sanitizePhone(value);
        break;
      case 'html':
        value = sanitizeHtml(value);
        break;
      case 'search':
        value = value.replace(/[<>'"`;]/g, '');
        break;
      default:
        value = sanitizeText(value);
    }

    return {
      safe: warnings.length === 0,
      value,
      warnings,
    };
  }, [detectSQLInjection, detectXSS, sanitizeForDB]);

  return {
    validateInput,
    detectSQLInjection,
    detectXSS,
    sanitizeForDB,
    validateAndSanitize,
    schemas: securitySchemas,
  };
};

export default useSecurityValidation;
