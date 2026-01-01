/**
 * Breed Info Card - מידע סטטיסטי על הגזע
 * נתונים מבוססים על מקורות רשמיים: AKC, CFA, TICA, FCI
 * Sources: American Kennel Club, Cat Fanciers' Association, The International Cat Association
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { 
  Heart, 
  Activity, 
  Brain, 
  Zap, 
  Clock, 
  Dog, 
  Scale,
  Thermometer,
  Shield,
  Users,
  Baby,
  Home,
  Volume2,
  ExternalLink
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BreedData {
  name: string;
  nameEn: string;
  origin: string;
  lifeExpectancy: { min: number; max: number };
  weight: { min: number; max: number; unit: string };
  height: { min: number; max: number; unit: string };
  group: string;
  traits: {
    energy: number;
    trainability: number;
    friendliness: number;
    grooming: number;
    healthIssues: number;
    barkingLevel: number;
    childFriendly: number;
    petFriendly: number;
  };
  commonHealthIssues: string[];
  exerciseNeeds: string;
  temperament: string[];
  funFacts: string[];
  source: string;
  sourceUrl: string;
}

// מאגר נתונים מאומת - מקורות: AKC, CFA, FCI
const breedDatabase: Record<string, BreedData> = {
  // === כלבים - נתוני AKC ===
  'labrador': {
    name: 'לברדור רטריבר',
    nameEn: 'Labrador Retriever',
    origin: 'קנדה (ניופאונדלנד)',
    group: 'Sporting Group',
    lifeExpectancy: { min: 11, max: 13 },
    weight: { min: 25, max: 36, unit: 'ק"ג' },
    height: { min: 55, max: 62, unit: 'ס"מ' },
    traits: {
      energy: 85,
      trainability: 100,
      friendliness: 100,
      grooming: 40,
      healthIssues: 40,
      barkingLevel: 60,
      childFriendly: 100,
      petFriendly: 100
    },
    commonHealthIssues: ['Hip Dysplasia - דיספלזיה של הירך', 'Elbow Dysplasia - דיספלזיה של המרפק', 'Progressive Retinal Atrophy - ניוון רשתית'],
    exerciseNeeds: 'גבוהה מאוד - 60+ דקות ביום',
    temperament: ['ידידותי', 'פעיל', 'חברותי', 'אינטליגנטי'],
    funFacts: [
      'הגזע הפופולרי ביותר בארה"ב לפי AKC',
      'פרווה כפולה עמידה למים',
      'מצטיינים ככלבי שירות ועזרה'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/labrador-retriever/'
  },
  'golden': {
    name: 'גולדן רטריבר',
    nameEn: 'Golden Retriever',
    origin: 'סקוטלנד',
    group: 'Sporting Group',
    lifeExpectancy: { min: 10, max: 12 },
    weight: { min: 25, max: 34, unit: 'ק"ג' },
    height: { min: 53, max: 61, unit: 'ס"מ' },
    traits: {
      energy: 80,
      trainability: 100,
      friendliness: 100,
      grooming: 60,
      healthIssues: 50,
      barkingLevel: 40,
      childFriendly: 100,
      petFriendly: 100
    },
    commonHealthIssues: ['Hip Dysplasia', 'Cancer - שכיחות גבוהה', 'Heart Disease - מחלות לב'],
    exerciseNeeds: 'גבוהה - 60+ דקות ביום',
    temperament: ['ידידותי', 'מהימן', 'אינטליגנטי', 'מסור'],
    funFacts: [
      'דורג #3 בפופולריות לפי AKC',
      'מצטיין ככלב טיפולי ושירות',
      'נוצר במקור לציד עופות מים'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/golden-retriever/'
  },
  'german shepherd': {
    name: 'רועה גרמני',
    nameEn: 'German Shepherd Dog',
    origin: 'גרמניה',
    group: 'Herding Group',
    lifeExpectancy: { min: 12, max: 14 },
    weight: { min: 30, max: 40, unit: 'ק"ג' },
    height: { min: 60, max: 65, unit: 'ס"מ' },
    traits: {
      energy: 85,
      trainability: 100,
      friendliness: 60,
      grooming: 60,
      healthIssues: 50,
      barkingLevel: 60,
      childFriendly: 80,
      petFriendly: 60
    },
    commonHealthIssues: ['Hip Dysplasia', 'Elbow Dysplasia', 'Degenerative Myelopathy - ניוון חוט השדרה'],
    exerciseNeeds: 'גבוהה מאוד - 90+ דקות ביום',
    temperament: ['נאמן', 'אמיץ', 'בטוח', 'חכם'],
    funFacts: [
      'דורג #4 בפופולריות לפי AKC',
      'הגזע המוביל לעבודות משטרה וצבא',
      'יכול ללמוד פקודה חדשה ב-5 חזרות'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/german-shepherd-dog/'
  },
  'poodle': {
    name: 'פודל',
    nameEn: 'Poodle',
    origin: 'גרמניה/צרפת',
    group: 'Non-Sporting Group',
    lifeExpectancy: { min: 10, max: 18 },
    weight: { min: 2, max: 32, unit: 'ק"ג' },
    height: { min: 24, max: 60, unit: 'ס"מ' },
    traits: {
      energy: 80,
      trainability: 100,
      friendliness: 80,
      grooming: 100,
      healthIssues: 40,
      barkingLevel: 60,
      childFriendly: 80,
      petFriendly: 80
    },
    commonHealthIssues: ['Progressive Retinal Atrophy', 'Hip Dysplasia', 'Epilepsy - אפילפסיה'],
    exerciseNeeds: 'בינונית-גבוהה - 45-60 דקות ביום',
    temperament: ['חכם מאוד', 'פעיל', 'נאמן', 'אלגנטי'],
    funFacts: [
      'נחשב לאחד הגזעים החכמים ביותר',
      'היפואלרגני - לא משיר',
      'מקורו ככלב ציד מים'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/poodle-standard/'
  },
  'bulldog': {
    name: 'בולדוג אנגלי',
    nameEn: 'Bulldog',
    origin: 'אנגליה',
    group: 'Non-Sporting Group',
    lifeExpectancy: { min: 8, max: 10 },
    weight: { min: 18, max: 23, unit: 'ק"ג' },
    height: { min: 31, max: 40, unit: 'ס"מ' },
    traits: {
      energy: 40,
      trainability: 40,
      friendliness: 80,
      grooming: 40,
      healthIssues: 80,
      barkingLevel: 40,
      childFriendly: 80,
      petFriendly: 60
    },
    commonHealthIssues: ['Brachycephalic Syndrome - בעיות נשימה', 'Hip Dysplasia', 'Cherry Eye - בעיות עיניים'],
    exerciseNeeds: 'נמוכה - 20-40 דקות ביום',
    temperament: ['ידידותי', 'אמיץ', 'רגוע', 'עקשן'],
    funFacts: [
      'סמל לאומי של אנגליה',
      'לא יכול לשחות בגלל מבנה גופו',
      'רגיש לחום - יש להימנע ממאמץ בימים חמים'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/bulldog/'
  },
  'beagle': {
    name: 'ביגל',
    nameEn: 'Beagle',
    origin: 'אנגליה',
    group: 'Hound Group',
    lifeExpectancy: { min: 10, max: 15 },
    weight: { min: 9, max: 11, unit: 'ק"ג' },
    height: { min: 33, max: 41, unit: 'ס"מ' },
    traits: {
      energy: 80,
      trainability: 60,
      friendliness: 100,
      grooming: 40,
      healthIssues: 40,
      barkingLevel: 100,
      childFriendly: 100,
      petFriendly: 100
    },
    commonHealthIssues: ['Epilepsy', 'Hypothyroidism - תת פעילות בלוטת התריס', 'Hip Dysplasia'],
    exerciseNeeds: 'גבוהה - 60+ דקות ביום',
    temperament: ['עליז', 'סקרן', 'ידידותי', 'נחוש'],
    funFacts: [
      'חוש ריח מהטובים בעולם הכלבים',
      'משמש לאיתור סמים ומזון בשדות תעופה',
      'ידוע בקול הנביחה הייחודי שלו'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/beagle/'
  },
  'french bulldog': {
    name: 'בולדוג צרפתי',
    nameEn: 'French Bulldog',
    origin: 'צרפת',
    group: 'Non-Sporting Group',
    lifeExpectancy: { min: 10, max: 12 },
    weight: { min: 8, max: 14, unit: 'ק"ג' },
    height: { min: 28, max: 33, unit: 'ס"מ' },
    traits: {
      energy: 60,
      trainability: 60,
      friendliness: 100,
      grooming: 20,
      healthIssues: 80,
      barkingLevel: 40,
      childFriendly: 100,
      petFriendly: 80
    },
    commonHealthIssues: ['Brachycephalic Syndrome', 'Intervertebral Disc Disease - בעיות עמוד שדרה', 'Allergies - אלרגיות'],
    exerciseNeeds: 'נמוכה-בינונית - 30-45 דקות ביום',
    temperament: ['שובב', 'מסתגל', 'חכם', 'חברותי'],
    funFacts: [
      'דורג #1 בפופולריות לפי AKC (2022)',
      'לא יכול לשחות',
      'רגיש מאוד לחום'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/french-bulldog/'
  },
  'rottweiler': {
    name: 'רוטווילר',
    nameEn: 'Rottweiler',
    origin: 'גרמניה',
    group: 'Working Group',
    lifeExpectancy: { min: 9, max: 10 },
    weight: { min: 36, max: 61, unit: 'ק"ג' },
    height: { min: 56, max: 69, unit: 'ס"מ' },
    traits: {
      energy: 80,
      trainability: 80,
      friendliness: 60,
      grooming: 20,
      healthIssues: 60,
      barkingLevel: 40,
      childFriendly: 60,
      petFriendly: 40
    },
    commonHealthIssues: ['Hip Dysplasia', 'Elbow Dysplasia', 'Aortic Stenosis - בעיות לב'],
    exerciseNeeds: 'גבוהה - 60+ דקות ביום',
    temperament: ['נאמן', 'בטוח', 'אמיץ', 'רגוע'],
    funFacts: [
      'מקורו ככלב שמירה על עדרים',
      'אינטליגנציה גבוהה מאוד',
      'דורש סוציאליזציה מוקדמת'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/rottweiler/'
  },
  'yorkshire terrier': {
    name: 'יורקשייר טרייר',
    nameEn: 'Yorkshire Terrier',
    origin: 'אנגליה',
    group: 'Toy Group',
    lifeExpectancy: { min: 11, max: 15 },
    weight: { min: 2, max: 3.2, unit: 'ק"ג' },
    height: { min: 18, max: 23, unit: 'ס"מ' },
    traits: {
      energy: 80,
      trainability: 60,
      friendliness: 60,
      grooming: 100,
      healthIssues: 40,
      barkingLevel: 80,
      childFriendly: 40,
      petFriendly: 40
    },
    commonHealthIssues: ['Patellar Luxation - פריקת ברך', 'Tracheal Collapse - קריסת קנה', 'Dental Disease - בעיות שיניים'],
    exerciseNeeds: 'בינונית - 30-45 דקות ביום',
    temperament: ['נועז', 'ביטחוני', 'חיבתי', 'עקשן'],
    funFacts: [
      'היפואלרגני',
      'פרווה דומה לשיער אנושי',
      'במקור שימש לציד חולדות'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/yorkshire-terrier/'
  },
  'dachshund': {
    name: 'תחש',
    nameEn: 'Dachshund',
    origin: 'גרמניה',
    group: 'Hound Group',
    lifeExpectancy: { min: 12, max: 16 },
    weight: { min: 7, max: 15, unit: 'ק"ג' },
    height: { min: 20, max: 27, unit: 'ס"מ' },
    traits: {
      energy: 60,
      trainability: 40,
      friendliness: 60,
      grooming: 40,
      healthIssues: 60,
      barkingLevel: 80,
      childFriendly: 60,
      petFriendly: 40
    },
    commonHealthIssues: ['Intervertebral Disc Disease - בעיות גב חמורות', 'Obesity', 'Dental Disease'],
    exerciseNeeds: 'בינונית - 30-60 דקות ביום',
    temperament: ['סקרן', 'עקשן', 'אמיץ', 'שובב'],
    funFacts: [
      'השם בגרמנית = "כלב גירית"',
      'נוצר לציד גיריות וארנבות',
      'עמוד שדרה ארוך דורש זהירות בקפיצות'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/dachshund/'
  },
  'boxer': {
    name: 'בוקסר',
    nameEn: 'Boxer',
    origin: 'גרמניה',
    group: 'Working Group',
    lifeExpectancy: { min: 10, max: 12 },
    weight: { min: 25, max: 32, unit: 'ק"ג' },
    height: { min: 53, max: 63, unit: 'ס"מ' },
    traits: {
      energy: 80,
      trainability: 80,
      friendliness: 100,
      grooming: 20,
      healthIssues: 60,
      barkingLevel: 60,
      childFriendly: 100,
      petFriendly: 60
    },
    commonHealthIssues: ['Cancer - שכיחות גבוהה', 'Heart Conditions', 'Hip Dysplasia'],
    exerciseNeeds: 'גבוהה - 60+ דקות ביום',
    temperament: ['שובב', 'נאמן', 'אינטליגנטי', 'פעיל'],
    funFacts: [
      'נשאר "גור" עד גיל 3',
      'מצטיין ככלב עבודה',
      'רגיש מאוד לחום'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/boxer/'
  },
  'shih tzu': {
    name: 'שי-צו',
    nameEn: 'Shih Tzu',
    origin: 'טיבט/סין',
    group: 'Toy Group',
    lifeExpectancy: { min: 10, max: 18 },
    weight: { min: 4, max: 7.2, unit: 'ק"ג' },
    height: { min: 23, max: 27, unit: 'ס"מ' },
    traits: {
      energy: 40,
      trainability: 40,
      friendliness: 100,
      grooming: 100,
      healthIssues: 40,
      barkingLevel: 40,
      childFriendly: 80,
      petFriendly: 80
    },
    commonHealthIssues: ['Brachycephalic Syndrome', 'Patellar Luxation', 'Eye Problems - בעיות עיניים'],
    exerciseNeeds: 'נמוכה - 20-30 דקות ביום',
    temperament: ['חיבתי', 'שובב', 'ידידותי', 'חברותי'],
    funFacts: [
      'השם בסינית = "כלב אריה"',
      'גזע עתיק בן 1000+ שנים',
      'היה כלב חצר קיסרי בסין'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/shih-tzu/'
  },
  'husky': {
    name: 'האסקי סיבירי',
    nameEn: 'Siberian Husky',
    origin: 'סיביר, רוסיה',
    group: 'Working Group',
    lifeExpectancy: { min: 12, max: 14 },
    weight: { min: 16, max: 27, unit: 'ק"ג' },
    height: { min: 51, max: 60, unit: 'ס"מ' },
    traits: {
      energy: 100,
      trainability: 40,
      friendliness: 100,
      grooming: 80,
      healthIssues: 20,
      barkingLevel: 80,
      childFriendly: 100,
      petFriendly: 60
    },
    commonHealthIssues: ['Hip Dysplasia', 'Eye Disorders - קטרקט', 'Hypothyroidism'],
    exerciseNeeds: 'גבוהה מאוד - 90+ דקות ביום',
    temperament: ['ידידותי', 'עקשן', 'חברותי', 'אנרגטי'],
    funFacts: [
      'נבנה לרוץ מרחקים ארוכים בקור קיצוני',
      'משיר המון פעמיים בשנה',
      'לא מתאים לחיים בדירה ללא פעילות רבה'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/siberian-husky/'
  },
  'chihuahua': {
    name: "צ'יוואווה",
    nameEn: 'Chihuahua',
    origin: 'מקסיקו',
    group: 'Toy Group',
    lifeExpectancy: { min: 14, max: 16 },
    weight: { min: 1.4, max: 2.7, unit: 'ק"ג' },
    height: { min: 15, max: 23, unit: 'ס"מ' },
    traits: {
      energy: 60,
      trainability: 40,
      friendliness: 40,
      grooming: 20,
      healthIssues: 40,
      barkingLevel: 100,
      childFriendly: 20,
      petFriendly: 40
    },
    commonHealthIssues: ['Patellar Luxation', 'Heart Disease', 'Hydrocephalus - מים במוח'],
    exerciseNeeds: 'נמוכה - 20-30 דקות ביום',
    temperament: ['נאמן', 'ביטחוני', 'ערני', 'שובב'],
    funFacts: [
      'גזע הכלבים הקטן ביותר בעולם',
      'נקרא על שם מדינת צ\'יוואווה במקסיקו',
      'יכול לחיות עד 20 שנה'
    ],
    source: 'American Kennel Club (AKC)',
    sourceUrl: 'https://www.akc.org/dog-breeds/chihuahua/'
  },
  // === חתולים - נתוני CFA/TICA ===
  'persian': {
    name: 'פרסי',
    nameEn: 'Persian',
    origin: 'פרס (איראן)',
    group: 'Longhair Division',
    lifeExpectancy: { min: 12, max: 17 },
    weight: { min: 3, max: 5.5, unit: 'ק"ג' },
    height: { min: 25, max: 38, unit: 'ס"מ' },
    traits: {
      energy: 20,
      trainability: 40,
      friendliness: 60,
      grooming: 100,
      healthIssues: 80,
      barkingLevel: 20,
      childFriendly: 60,
      petFriendly: 60
    },
    commonHealthIssues: ['Polycystic Kidney Disease - PKD', 'Brachycephalic Syndrome', 'Eye Conditions'],
    exerciseNeeds: 'נמוכה - משחקים קלים מספיקים',
    temperament: ['שקט', 'עדין', 'רגוע', 'חיבתי'],
    funFacts: [
      'אחד הגזעים העתיקים ביותר',
      'דורש סירוק יומי',
      'מעדיף סביבה שקטה'
    ],
    source: 'Cat Fanciers\' Association (CFA)',
    sourceUrl: 'https://cfa.org/persian/'
  },
  'siamese': {
    name: 'סיאמי',
    nameEn: 'Siamese',
    origin: 'תאילנד (סיאם)',
    group: 'Shorthair Division',
    lifeExpectancy: { min: 15, max: 20 },
    weight: { min: 2.5, max: 5, unit: 'ק"ג' },
    height: { min: 29, max: 35, unit: 'ס"מ' },
    traits: {
      energy: 80,
      trainability: 80,
      friendliness: 80,
      grooming: 20,
      healthIssues: 40,
      barkingLevel: 100,
      childFriendly: 80,
      petFriendly: 60
    },
    commonHealthIssues: ['Amyloidosis', 'Asthma', 'Progressive Retinal Atrophy'],
    exerciseNeeds: 'בינונית-גבוהה - משחקים אינטראקטיביים',
    temperament: ['ווקלי', 'אינטליגנטי', 'חברותי', 'סקרן'],
    funFacts: [
      'ידוע בקולו החזק והייחודי',
      'נולד לבן ומפתח צבע עם הזמן',
      'מאוד צמוד לבעליו'
    ],
    source: 'Cat Fanciers\' Association (CFA)',
    sourceUrl: 'https://cfa.org/siamese/'
  },
  'maine coon': {
    name: 'מיין קון',
    nameEn: 'Maine Coon',
    origin: 'ארה"ב (מיין)',
    group: 'Longhair Division',
    lifeExpectancy: { min: 12, max: 15 },
    weight: { min: 5, max: 11, unit: 'ק"ג' },
    height: { min: 25, max: 41, unit: 'ס"מ' },
    traits: {
      energy: 60,
      trainability: 80,
      friendliness: 100,
      grooming: 60,
      healthIssues: 40,
      barkingLevel: 40,
      childFriendly: 100,
      petFriendly: 100
    },
    commonHealthIssues: ['Hypertrophic Cardiomyopathy - HCM', 'Hip Dysplasia', 'Spinal Muscular Atrophy'],
    exerciseNeeds: 'בינונית - משחקים ופעילות',
    temperament: ['עדין', 'ידידותי', 'חכם', 'שובב'],
    funFacts: [
      'גזע החתולים הגדול ביותר',
      'אוהב מים',
      'מכונה "הענק העדין"'
    ],
    source: 'Cat Fanciers\' Association (CFA)',
    sourceUrl: 'https://cfa.org/maine-coon/'
  },
  'british shorthair': {
    name: 'בריטי קצר שיער',
    nameEn: 'British Shorthair',
    origin: 'בריטניה',
    group: 'Shorthair Division',
    lifeExpectancy: { min: 12, max: 17 },
    weight: { min: 4, max: 8, unit: 'ק"ג' },
    height: { min: 28, max: 33, unit: 'ס"מ' },
    traits: {
      energy: 40,
      trainability: 60,
      friendliness: 80,
      grooming: 40,
      healthIssues: 40,
      barkingLevel: 20,
      childFriendly: 80,
      petFriendly: 80
    },
    commonHealthIssues: ['Hypertrophic Cardiomyopathy', 'Polycystic Kidney Disease', 'Hemophilia B'],
    exerciseNeeds: 'נמוכה-בינונית',
    temperament: ['רגוע', 'עצמאי', 'נאמן', 'שקט'],
    funFacts: [
      'אחד הגזעים העתיקים ביותר בבריטניה',
      'ידוע בפנים ה"חייכניות"',
      'מתאים מאוד לחיי דירה'
    ],
    source: 'Cat Fanciers\' Association (CFA)',
    sourceUrl: 'https://cfa.org/british-shorthair/'
  },
  'ragdoll': {
    name: 'רגדול',
    nameEn: 'Ragdoll',
    origin: 'ארה"ב (קליפורניה)',
    group: 'Longhair Division',
    lifeExpectancy: { min: 12, max: 17 },
    weight: { min: 4.5, max: 9, unit: 'ק"ג' },
    height: { min: 23, max: 28, unit: 'ס"מ' },
    traits: {
      energy: 40,
      trainability: 60,
      friendliness: 100,
      grooming: 60,
      healthIssues: 40,
      barkingLevel: 20,
      childFriendly: 100,
      petFriendly: 100
    },
    commonHealthIssues: ['Hypertrophic Cardiomyopathy', 'Bladder Stones', 'Feline Infectious Peritonitis'],
    exerciseNeeds: 'נמוכה - אוהב להתרפק',
    temperament: ['רגוע', 'חיבתי', 'עדין', 'נוח'],
    funFacts: [
      'נקרא כך כי נרפה כשמרימים אותו',
      'מתנהג כמו כלב - עוקב אחרי הבעלים',
      'עיניים כחולות תמיד'
    ],
    source: 'Cat Fanciers\' Association (CFA)',
    sourceUrl: 'https://cfa.org/ragdoll/'
  },
  'bengal': {
    name: 'בנגלי',
    nameEn: 'Bengal',
    origin: 'ארה"ב',
    group: 'Shorthair Division',
    lifeExpectancy: { min: 12, max: 16 },
    weight: { min: 3.6, max: 6.8, unit: 'ק"ג' },
    height: { min: 33, max: 41, unit: 'ס"מ' },
    traits: {
      energy: 100,
      trainability: 80,
      friendliness: 80,
      grooming: 20,
      healthIssues: 40,
      barkingLevel: 60,
      childFriendly: 80,
      petFriendly: 60
    },
    commonHealthIssues: ['Progressive Retinal Atrophy', 'Hypertrophic Cardiomyopathy', 'Patellar Luxation'],
    exerciseNeeds: 'גבוהה מאוד - דורש משחקים רבים',
    temperament: ['אנרגטי', 'סקרן', 'שובב', 'חכם'],
    funFacts: [
      'הוכלא מחתול נמר אסייתי',
      'אוהב מים ויכול לשחות',
      'דורש גירוי מנטלי רב'
    ],
    source: 'The International Cat Association (TICA)',
    sourceUrl: 'https://tica.org/breeds/browse-all-breeds?view=article&id=835'
  },
  'scottish fold': {
    name: 'סקוטי מקופל',
    nameEn: 'Scottish Fold',
    origin: 'סקוטלנד',
    group: 'Shorthair Division',
    lifeExpectancy: { min: 11, max: 14 },
    weight: { min: 2.7, max: 6, unit: 'ק"ג' },
    height: { min: 20, max: 25, unit: 'ס"מ' },
    traits: {
      energy: 40,
      trainability: 60,
      friendliness: 80,
      grooming: 40,
      healthIssues: 60,
      barkingLevel: 20,
      childFriendly: 80,
      petFriendly: 80
    },
    commonHealthIssues: ['Osteochondrodysplasia - בעיות עצמות ומפרקים', 'Polycystic Kidney Disease', 'Cardiomyopathy'],
    exerciseNeeds: 'נמוכה-בינונית',
    temperament: ['רגוע', 'מסתגל', 'חברותי', 'שובב'],
    funFacts: [
      'האוזניים המקופלות הן מוטציה גנטית',
      'אסור להרביע שני סקוטים מקופלים',
      'ידוע בישיבה "כמו בודהה"'
    ],
    source: 'Cat Fanciers\' Association (CFA)',
    sourceUrl: 'https://cfa.org/scottish-fold/'
  }
};

// פונקציה למציאת נתונים לפי גזע
const findBreedData = (breed: string | null, petType: string): BreedData | null => {
  if (!breed) return getDefaultBreedData(petType);
  
  const breedLower = breed.toLowerCase();
  
  // חיפוש מדויק יותר
  for (const [key, data] of Object.entries(breedDatabase)) {
    if (breedLower.includes(key) || key.includes(breedLower) || 
        data.nameEn.toLowerCase().includes(breedLower)) {
      return data;
    }
  }
  
  // חיפוש חלקי
  for (const [key, data] of Object.entries(breedDatabase)) {
    const words = breedLower.split(' ');
    if (words.some(word => key.includes(word) || data.nameEn.toLowerCase().includes(word))) {
      return data;
    }
  }
  
  return getDefaultBreedData(petType);
};

const getDefaultBreedData = (petType: string): BreedData => {
  if (petType === 'cat') {
    return {
      name: 'חתול ביתי',
      nameEn: 'Domestic Cat',
      origin: 'כללי',
      group: 'Domestic',
      lifeExpectancy: { min: 12, max: 18 },
      weight: { min: 3.6, max: 4.5, unit: 'ק"ג' },
      height: { min: 23, max: 25, unit: 'ס"מ' },
      traits: {
        energy: 60,
        trainability: 50,
        friendliness: 70,
        grooming: 40,
        healthIssues: 30,
        barkingLevel: 40,
        childFriendly: 70,
        petFriendly: 60
      },
      commonHealthIssues: ['Dental Disease', 'Obesity', 'Kidney Disease'],
      exerciseNeeds: 'בינונית - 20-30 דקות משחק ביום',
      temperament: ['עצמאי', 'סקרן', 'חיבתי', 'שובב'],
      funFacts: [
        'חתולים ישנים 12-16 שעות ביום',
        'יש להם יותר מ-100 סוגי קולות',
        'יכולים לזהות את בעליהם לפי קול'
      ],
      source: 'ASPCA / General Veterinary Data',
      sourceUrl: 'https://www.aspca.org/pet-care/cat-care'
    };
  }
  
  return {
    name: 'כלב מעורב',
    nameEn: 'Mixed Breed Dog',
    origin: 'כללי',
    group: 'Mixed',
    lifeExpectancy: { min: 10, max: 13 },
    weight: { min: 10, max: 25, unit: 'ק"ג' },
    height: { min: 35, max: 55, unit: 'ס"מ' },
    traits: {
      energy: 70,
      trainability: 70,
      friendliness: 80,
      grooming: 50,
      healthIssues: 30,
      barkingLevel: 50,
      childFriendly: 80,
      petFriendly: 70
    },
    commonHealthIssues: ['Dental Disease', 'Obesity', 'Allergies'],
    exerciseNeeds: 'בינונית - 30-60 דקות ביום',
    temperament: ['נאמן', 'שובב', 'חברותי', 'מגן'],
    funFacts: [
      'כלבים מעורבים בריאים יותר בממוצע',
      'כל כלב מעורב הוא ייחודי',
      'יש להם מגוון גנטי רחב'
    ],
    source: 'ASPCA / General Veterinary Data',
    sourceUrl: 'https://www.aspca.org/pet-care/dog-care'
  };
};

interface BreedInfoCardProps {
  breed: string | null;
  petType: string;
  petName: string;
}

export const BreedInfoCard = ({ breed, petType, petName }: BreedInfoCardProps) => {
  const breedData = findBreedData(breed, petType);
  
  if (!breedData) return null;

  const TraitBar = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
    >
      {/* כותרת */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Dog className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{breedData.name}</h3>
          <p className="text-sm text-muted-foreground">נתונים מבוססי מחקר</p>
        </div>
      </div>

      {/* מידע בסיסי */}
      <Card className="p-5 bg-card border-2 border-border shadow-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-2xl bg-primary/10">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{breedData.lifeExpectancy.min}-{breedData.lifeExpectancy.max}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">שנות חיים</p>
          </div>
          <div className="p-3 rounded-2xl bg-accent/10">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Scale className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{breedData.weight.min}-{breedData.weight.max}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">{breedData.weight.unit}</p>
          </div>
          <div className="p-3 rounded-2xl bg-secondary/10">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-secondary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{breedData.height.min}-{breedData.height.max}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">{breedData.height.unit}</p>
          </div>
        </div>
      </Card>

      {/* תכונות */}
      <Card className="p-4 space-y-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          מאפיינים וסטטיסטיקות
        </h4>
        <div className="grid gap-3">
          <TraitBar label="רמת אנרגיה" value={breedData.traits.energy} icon={Zap} color="text-amber-500" />
          <TraitBar label="יכולת אימון" value={breedData.traits.trainability} icon={Brain} color="text-primary" />
          <TraitBar label="ידידותיות" value={breedData.traits.friendliness} icon={Heart} color="text-rose-500" />
          <TraitBar label="ידידותי לילדים" value={breedData.traits.childFriendly} icon={Baby} color="text-pink-500" />
          <TraitBar label="התאמה לחיות נוספות" value={breedData.traits.petFriendly} icon={Users} color="text-green-500" />
          <TraitBar label="רמת נביחות/מיאו" value={breedData.traits.barkingLevel} icon={Volume2} color="text-orange-500" />
        </div>
      </Card>

      {/* טמפרמנט */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" />
          אופי וטמפרמנט
        </h4>
        <div className="flex flex-wrap gap-2">
          {breedData.temperament.map((trait, idx) => (
            <span 
              key={idx}
              className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium"
            >
              {trait}
            </span>
          ))}
        </div>
      </Card>

      {/* צרכי פעילות */}
      <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-600" />
          צרכי פעילות
        </h4>
        <p className="text-sm text-muted-foreground">{breedData.exerciseNeeds}</p>
      </Card>

      {/* בעיות בריאות נפוצות */}
      <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-600" />
          בעיות בריאות נפוצות לגזע
        </h4>
        <ul className="space-y-2">
          {breedData.commonHealthIssues.map((issue, idx) => (
            <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {issue}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-3 italic">
          💡 טיפ: בדיקות תקופתיות אצל הווטרינר יכולות לזהות בעיות מוקדם
        </p>
      </Card>

      {/* עובדות מעניינות */}
      <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="text-lg">✨</span>
          עובדות מעניינות
        </h4>
        <ul className="space-y-2">
          {breedData.funFacts.map((fact, idx) => (
            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-purple-500 mt-0.5">•</span>
              {fact}
            </li>
          ))}
        </ul>
      </Card>

      {/* מקור */}
      <p className="text-[10px] text-center text-muted-foreground">
        📊 נתונים מבוססים על מחקרי AKC, CFA ומקורות וטרינריים מוסמכים
      </p>
    </motion.div>
  );
};

export default BreedInfoCard;
