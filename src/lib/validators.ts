import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "יש להזין אימייל")
    .email("כתובת אימייל לא תקינה")
    .max(255, "האימייל חייב להיות פחות מ-255 תווים"),
  phone: z
    .string()
    .min(1, "יש להזין מספר טלפון")
    .regex(/^\+?[0-9]{10,15}$/, "מספר טלפון חייב להכיל 10-15 ספרות"),
  rememberMe: z.boolean().optional(),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .min(2, "השם חייב להכיל לפחות 2 תווים")
    .max(100, "השם חייב להיות פחות מ-100 תווים")
    .trim(),
  email: z
    .string()
    .min(1, "יש להזין אימייל")
    .email("כתובת אימייל לא תקינה")
    .max(255, "האימייל חייב להיות פחות מ-255 תווים"),
  phone: z
    .string()
    .min(10, "מספר טלפון חייב להכיל לפחות 10 ספרות")
    .max(15, "מספר טלפון חייב להיות פחות מ-15 ספרות")
    .regex(/^[0-9]+$/, "מספר טלפון חייב להכיל ספרות בלבד"),
  password: z
    .string()
    .min(6, "הסיסמה חייבת להכיל לפחות 6 תווים")
    .max(100, "הסיסמה חייבת להיות פחות מ-100 תווים")
    .regex(/[A-Z]/, "הסיסמה חייבת להכיל לפחות אות גדולה אחת")
    .regex(/[a-z]/, "הסיסמה חייבת להכיל לפחות אות קטנה אחת")
    .regex(/[0-9]/, "הסיסמה חייבת להכיל לפחות ספרה אחת"),
  confirmPassword: z
    .string()
    .min(1, "יש לאשר את הסיסמה"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Image validation schemas
export const imageFileSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "התמונה חייבת להיות פחות מ-10MB")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type),
      "מותר רק תמונות JPEG, PNG ו-WebP"
    ),
});

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  try {
    imageFileSchema.parse({ file });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0].message };
    }
    return { valid: false, error: "קובץ תמונה לא תקין" };
  }
};

// Image compression utility
export const compressImage = async (file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('נכשלה קבלת הקשר קנבס'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('דחיסת התמונה נכשלה'));
            }
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('טעינת התמונה נכשלה'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה'));
    reader.readAsDataURL(file);
  });
};
