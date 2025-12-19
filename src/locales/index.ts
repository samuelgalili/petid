import { he } from './he';
import { en } from './en';
import { ar } from './ar';

export type Language = 'he' | 'en' | 'ar';

export const translations = {
  he,
  en,
  ar,
};

export type TranslationKey = keyof typeof he;

// Helper type for nested translation keys
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationPath = NestedKeyOf<typeof he>;
