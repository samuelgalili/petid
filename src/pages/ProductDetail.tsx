import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, Heart, Share2, ShoppingCart, Star, Plus, Minus, 
  ChevronLeft, ChevronRight, Check, Truck, Shield, PackageCheck, 
  Clock, Loader2, Flag, AlertTriangle, Leaf, FlaskConical, Utensils,
  WheatOff, Beef, Sparkles, Dog, Baby, Scale, Droplets, ShieldCheck,
  Calculator, Wrench, Lightbulb, Ruler, Paintbrush, Cookie, GlassWater,
  Eye, Bone, Timer, Smile, Zap, CloudLightning, Stethoscope, Scissors,
  Snowflake, Microwave, Hand, Moon, Sofa, Waves, WashingMachine, Home,
  Car, Grip, Cog, Droplet, Sun, Wind, Pipette, Beaker, Flower2, Bug,
  Target, CircleDot, ArrowDownToLine, Armchair, Weight, Lock, DoorOpen,
  Maximize2, FoldVertical, Trash2, PawPrint, ThumbsUp, Box,
  Volume2, Gift, Gamepad2, BedDouble, Music, Siren,
  Puzzle, Brain, Award, Cherry, Sandwich, CircleDashed,
  Layers, Magnet, MapPin, Footprints, SprayCan, Users, TreePine, EyeOff,
  Fish, Salad, HeartPulse, Thermometer, Activity, Pill, Syringe, ShieldPlus,
  Luggage, Fan, Link2, Backpack, FoldVertical as FoldIcon, WashingMachine as WashIcon, Plane,
  Flame, Gauge, TrendingDown, AlertCircle, TimerReset,
  ShieldAlert, Milestone, Atom, Scan, Wheat
} from "lucide-react";
import { ProductReviews } from "@/components/shop/ProductReviews";
import { PriceAlertButton } from "@/components/shop/PriceAlertButton";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { SmartProductLayers } from "@/components/shop/SmartProductLayers";

// ── Helpers ──────────────────────────────────────────────

const formatProductDescription = (text: string) => {
  if (!text) return null;
  const lines = text
    .replace(/\.\s+/g, '.\n')
    .replace(/\s{2,}/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  if (lines.length <= 1 && text.length < 200) return <p>{text.trim()}</p>;
  return lines.map((line, i) => (
    <p key={i} className={line.startsWith('•') || line.startsWith('-') || line.startsWith('*') ? 'pr-2' : ''}>{line}</p>
  ));
};

const getNumericPrice = (price: string | number): number => {
  if (typeof price === 'number') return price;
  return parseFloat(price.replace(/[₪,]/g, '')) || 0;
};

/** Check if product is an accessory (non-food) */
const isAccessoryCategory = (category: string | null): boolean => {
  if (!category) return false;
  return ['accessories', 'toys', 'grooming', 'collars', 'leashes', 'beds', 'clothing', 'muzzles', 'enrichment', 'crates', 'kennels', 'training'].includes(category.toLowerCase());
};

/** Check if product is a muzzle */
const isMuzzleProduct = (product: any): boolean => {
  const text = `${product.name || ''} ${product.description || ''} ${product.category || ''}`.toLowerCase();
  return text.includes('מחסום') || text.includes('muzzle') || text.includes('זמם') || product.category?.toLowerCase() === 'muzzles';
};

/** Extract size matrix (circumference, length, size number) from product_attributes */
const extractSizeMatrix = (product: any): { label: string; value: string }[] => {
  const matrix: { label: string; value: string }[] = [];
  const attrs = product.product_attributes || {};
  
  const sizeFields: Record<string, string> = {
    size_number: 'מספר מידה',
    'מספר מידה': 'מספר מידה',
    circumference: 'היקף',
    'היקף': 'היקף',
    length: 'אורך',
    'אורך': 'אורך',
    width: 'רוחב',
    'רוחב': 'רוחב',
    size: 'מידה',
    'מידה': 'מידה',
  };

  for (const [key, label] of Object.entries(sizeFields)) {
    const val = attrs[key];
    if (val && String(val).trim()) {
      matrix.push({ label, value: String(val) });
    }
  }
  return matrix;
};

/** Extract breed recommendations from product_attributes */
const extractBreedRecommendations = (product: any): string[] => {
  const attrs = product.product_attributes || {};
  const breeds = attrs.breed_recommendations || attrs['גזעים מומלצים'] || attrs.recommended_breeds || [];
  if (Array.isArray(breeds)) return breeds;
  if (typeof breeds === 'string') return breeds.split(/[,،、]\s*/);
  return [];
};
/** Check if product is a liquid omega supplement */
const isOmegaLiquidProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'omega' || cat === 'liquid-supplement' ||
    (text.includes('salmon oil') || text.includes('שמן סלמון')) ||
    (text.includes('omega') && (text.includes('liquid') || text.includes('נוזלי') || text.includes('pump') || text.includes('משאבה') || text.includes('oil') || text.includes('שמן'))) ||
    (text.includes('fish oil') && !text.includes('capsule'));
};

/** Extract omega liquid supplement features */
const extractOmegaFeatures = (product: any): {
  benefits: { icon: React.ReactNode; title: string; description: string; color: string }[];
  servingSuggestion: string;
  purityBadge: string | null;
  isMultiPet: boolean;
  lifeStageTags: string[];
  crossSellHints: string[];
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const productBenefits = Array.isArray(product.benefits) ? product.benefits : [];

  // ZERO-HALLUCINATION: Only show benefits that exist in the product's actual data
  const benefitIconMap: Record<string, { icon: React.ReactNode; color: string }> = {
    'פרווה': { icon: <Sparkles className="w-5 h-5" />, color: 'hsl(35,70%,50%)' },
    'עור': { icon: <Sparkles className="w-5 h-5" />, color: 'hsl(35,70%,50%)' },
    'מוח': { icon: <Brain className="w-5 h-5" />, color: 'hsl(270,50%,55%)' },
    'ריכוז': { icon: <Brain className="w-5 h-5" />, color: 'hsl(270,50%,55%)' },
    'dha': { icon: <Brain className="w-5 h-5" />, color: 'hsl(270,50%,55%)' },
    'חיסון': { icon: <ShieldPlus className="w-5 h-5" />, color: 'hsl(140,50%,40%)' },
    'מפרק': { icon: <Activity className="w-5 h-5" />, color: 'hsl(200,60%,45%)' },
    'ראייה': { icon: <Eye className="w-5 h-5" />, color: 'hsl(170,50%,40%)' },
  };

  const benefits: { icon: React.ReactNode; title: string; description: string; color: string }[] = productBenefits.map((b: any) => {
    const bText = `${b.title || ''} ${b.description || ''}`.toLowerCase();
    let matchedIcon: { icon: React.ReactNode; color: string } = { icon: <Sparkles className="w-5 h-5" />, color: 'hsl(200,60%,45%)' };
    for (const [keyword, val] of Object.entries(benefitIconMap)) {
      if (bText.includes(keyword)) { matchedIcon = val; break; }
    }
    return { icon: matchedIcon.icon, title: b.title || '', description: b.description || '', color: matchedIcon.color };
  });

  let servingSuggestion: string | null = null;
  if (text.includes('topper') || text.includes('מזון יבש') || text.includes('משאבה') || text.includes('pump'))
    servingSuggestion = 'פשוט להוסיף מעל המזון היבש לשיפור הטעם והתיאבון';

  let purityBadge: string | null = null;
  if (text.includes('norwegian') || text.includes('נורווגי')) purityBadge = '99.5% שמן סלמון נורווגי טהור';
  else if (text.includes('salmon') || text.includes('סלמון')) purityBadge = 'שמן סלמון טהור';
  else if (text.includes('fish oil') || text.includes('שמן דגים')) purityBadge = 'שמן דגים טהור';

  const isMultiPet = text.includes('cat') || text.includes('חתול') || text.includes('dogs and cats') || text.includes('כלבים וחתולים');

  // ZERO-HALLUCINATION: Only show life stage tags if mentioned in actual product text
  const lifeStageTags: string[] = [];
  if (text.includes('puppy') || text.includes('גור') || text.includes('growth') || text.includes('גדילה')) lifeStageTags.push('חיוני לגורים בשלבי גדילה');
  if (text.includes('senior') || text.includes('מבוגר') || text.includes('aging')) lifeStageTags.push('חיוני לחיות מבוגרות');

  // ZERO-HALLUCINATION: Only show cross-sell hints based on actual product context
  const crossSellHints: string[] = [];
  if (text.includes('topper') || text.includes('מזון יבש') || text.includes('kibble'))
    crossSellHints.push('שדרגו את הארוחה – הוסיפו שמן סלמון למזון היבש');
  if (text.includes('מפרק') || text.includes('joint') || text.includes('anti-inflammatory') || text.includes('דלקת'))
    crossSellHints.push('תמיכה טבעית נוגדת דלקת – משלים מצוין לתוספי מפרקים');

  return { benefits, servingSuggestion, purityBadge, isMultiPet, lifeStageTags, crossSellHints };
};

/** Check if product is a travel carrier */
const isTravelCarrierProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  return cat === 'carriers' || cat === 'travel' || cat === 'carrier' || cat === 'backpack' ||
    text.includes('carrier') || text.includes('נשיאה') || text.includes('travel bag') || text.includes('תיק נסיעות') ||
    text.includes('backpack') || text.includes('גב') || text.includes('תיק לחיות') ||
    (text.includes('expandable') && (text.includes('pet') || text.includes('dog') || text.includes('cat')));
};

/** Extract travel carrier features */
const extractCarrierFeatures = (product: any): {
  readinessChecklist: { icon: React.ReactNode; title: string; description: string; color: string }[];
  maxWeightKg: number | null;
  dimensions: string | null;
  targetPets: string;
  isExpandable: boolean;
  isWashable: boolean;
  hasHardBottom: boolean;
  proTip: string;
  crossSellHints: string[];
} => {
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const allText = text + ' ' + JSON.stringify(attrs).toLowerCase();

  const readinessChecklist: { icon: React.ReactNode; title: string; description: string; color: string }[] = [];
  readinessChecklist.push({ icon: <Fan className="w-5 h-5" />, title: 'אוורור 360°', description: 'אוורור מיטבי מכל הצדדים לנשימה חופשית', color: 'hsl(200,60%,45%)' });
  readinessChecklist.push({ icon: <Link2 className="w-5 h-5" />, title: 'רצועת בטיחות פנימית', description: 'למניעת בריחה בזמן נסיעה', color: 'hsl(0,55%,50%)' });
  readinessChecklist.push({ icon: <Backpack className="w-5 h-5" />, title: 'רצועת כתף מתכווננת', description: 'נוחות מרבית לבעלים בנשיאה ממושכת', color: 'hsl(270,50%,55%)' });
  readinessChecklist.push({ icon: <FoldIcon className="w-5 h-5" />, title: 'מתקפל שטוח', description: 'אחסון קל כשלא בשימוש', color: 'hsl(140,50%,40%)' });

  // Extract weight limit
  let maxWeightKg: number | null = null;
  const kgMatch = allText.match(/(?:up to|עד|max|מקסימום)\s*(\d+(?:\.\d+)?)\s*(?:kg|ק"ג|קג|ק״ג)/i);
  const lbsMatch = allText.match(/(?:up to|עד|max)\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i);
  if (kgMatch) maxWeightKg = parseFloat(kgMatch[1]);
  else if (lbsMatch) maxWeightKg = Math.round(parseFloat(lbsMatch[1]) * 0.453592 * 10) / 10;
  else if (attrs.max_weight_kg) maxWeightKg = parseFloat(attrs.max_weight_kg);
  if (!maxWeightKg) maxWeightKg = 7;

  // Dimensions
  let dimensions: string | null = null;
  const dimMatch = allText.match(/(\d+)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)\s*(?:cm|ס"מ|סמ)/i);
  if (dimMatch) dimensions = `${dimMatch[1]}×${dimMatch[2]}×${dimMatch[3]} ס"מ`;
  else if (attrs.dimensions) dimensions = String(attrs.dimensions);

  const targetPets = allText.includes('cat') || allText.includes('חתול') ? 'כלבים קטנים וחתולים' : 'כלבים קטנים';
  const isExpandable = allText.includes('expand') || allText.includes('מתרחב') || allText.includes('הרחבה');
  const isWashable = allText.includes('washable') || allText.includes('רחיץ') || allText.includes('ניקוי');
  const hasHardBottom = allText.includes('hard bottom') || allText.includes('תחתית קשיחה') || allText.includes('sturdy base') || allText.includes('rigid');

  const proTip = 'בנסיעה בתחבורה ציבורית, שמרו על הצדדים המתרחבים סגורים ליציבות. פתחו אותם רק במצב מנוחה.';
  const crossSellHints = ['הוסיפו בקבוק מים לנסיעות לשתייה נוחה בדרך', 'חטיף מרגיע קטן יהפוך את הנסיעה לחוויה רגועה יותר'];

  return { readinessChecklist, maxWeightKg, dimensions, targetPets, isExpandable, isWashable, hasHardBottom, proTip, crossSellHints };
};

/** Check if product is specifically diabetic care (takes priority over general vet diet) */
const isDiabeticProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'diabetic' ||
    text.includes('diabetic') || text.includes('סוכרת') ||
    text.includes('d/w') || text.includes('diabetes') ||
    (text.includes('glycemic') && text.includes('low')) ||
    (text.includes('גליקמי') && text.includes('נמוך'));
};

/** Extract diabetic care features */
const extractDiabeticFeatures = (product: any) => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const allText = text + ' ' + JSON.stringify(product.product_attributes || {}).toLowerCase();

  // Blood sugar regulator
  const bloodSugar = {
    glycemicIndex: 'נמוך',
    carbSource: allText.includes('oat') || allText.includes('שיבולת') ? 'שיבולת שועל ודגנים מלאים' : allText.includes('spelt') || allText.includes('כוסמין') ? 'כוסמין ודגנים מלאים' : 'פחמימות איטיות שחרור',
    mechanism: 'פחמימות איטיות שחרור מונעות קפיצות אינסולין ושומרות על רמת סוכר יציבה לאורך היום',
  };

  // Muscle vs Fat
  const proteinMatch = allText.match(/protein[^%]*?(\d+(?:\.\d+)?)\s*%/i) || allText.match(/חלבון[^%]*?(\d+(?:\.\d+)?)\s*%/i);
  const fatMatch = allText.match(/fat[^%]*?(\d+(?:\.\d+)?)\s*%/i) || allText.match(/שומן[^%]*?(\d+(?:\.\d+)?)\s*%/i);
  const muscleFat = [
    { label: 'חלבון איכותי', value: proteinMatch ? `${proteinMatch[1]}%` : '33%', description: 'שימור מסת שריר – חלבון גבוה לשמירה על כוח הגוף', color: 'hsl(200,60%,45%)' },
    { label: 'שומן נמוך', value: fatMatch ? `${fatMatch[1]}%` : '10.5%', description: 'ניהול משקל מבוקר – מניעת עלייה נוספת', color: 'hsl(140,50%,40%)' },
  ];

  // Fiber satiety
  const fiberTech = [
    { icon: <Salad className="w-5 h-5" />, title: 'פסיליום וסיבי סלק', description: 'האטת ספיגת גלוקוז ותחושת שובע ממושכת', color: 'hsl(140,50%,40%)' },
  ];
  if (allText.includes('psyllium') || allText.includes('פסיליום')) {
    fiberTech[0].title = 'Psyllium & Beet Pulp';
  }

  // Joint bonus for senior diabetic dogs
  const hasJointSupport = allText.includes('glucosamine') || allText.includes('גלוקוזאמין') || allText.includes('chondroitin') || allText.includes('כונדרויטין');
  const jointNote = hasJointSupport ? 'גלוקוזאמין וכונדרויטין – תמיכה במפרקים לכלבים סוכרתיים מבוגרים הסובלים מבעיות מפרקים' : null;

  const feedingTip = 'לכלבים סוכרתיים: חובה לחלק את המנה ל-2 ארוחות לפחות ביום (בסמיכות להזרקת האינסולין במידה ויש) לשמירה על רמת סוכר יציבה.';
  const vetWarning = 'מוצר רפואי ייעודי - דורש ליווי וטרינרי צמוד. אין לשנות מינון או להחליף מזון ללא ייעוץ מקצועי.';

  const feedingMatrix = [
    { weight: '2 ק"ג', grams: '40-55 גרם' },
    { weight: '5 ק"ג', grams: '80-105 גרם' },
    { weight: '10 ק"ג', grams: '135-175 גרם' },
    { weight: '15 ק"ג', grams: '180-235 גרם' },
    { weight: '20 ק"ג', grams: '225-290 גרם' },
    { weight: '25 ק"ג', grams: '265-340 גרם' },
    { weight: '30 ק"ג', grams: '300-390 גרם' },
    { weight: '40 ק"ג', grams: '370-480 גרם' },
    { weight: '50 ק"ג', grams: '435-560 גרם' },
    { weight: '60 ק"ג', grams: '500-640 גרם' },
  ];

  const crossSellHints = [
    'חטיפים בטוחים לסוכרתיים – ללא סוכר ודלי קלוריות',
    'מאכיל אוטומטי – לשמירה על עקביות בזמני הארוחות',
  ];

  return { bloodSugar, muscleFat, fiberTech, jointNote, feedingTip, vetWarning, feedingMatrix, crossSellHints };
};

/** Check if product is renal/kidney support */
const isRenalProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'renal' ||
    text.includes('renal') || text.includes('כליות') || text.includes('כלייתי') ||
    text.includes('k/d') || text.includes('kidney');
};

/** Extract renal care features */
const extractRenalFeatures = (product: any) => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const allText = text + ' ' + JSON.stringify(product.product_attributes || {}).toLowerCase();

  const lowLoad = [
    { icon: '🧪', label: 'זרחן מופחת (Low-P)', description: 'רמות זרחן מופחתות למניעת נזק נוסף לרקמת הכליה', color: 'hsl(200,55%,45%)' },
    { icon: '🥩', label: 'חלבון מבוקר', description: 'חלבון איכותי אך בכמות מוגבלת להפחתת עומס ה-Urea', color: 'hsl(280,45%,50%)' },
    { icon: '🧂', label: 'נתרן מופחת', description: 'הפחתת מלחים לשמירה על לחץ דם תקין', color: 'hsl(35,55%,45%)' },
  ];

  const phBalance = {
    title: 'חומציות מותאמת (Optimized pH)',
    description: 'מניעת חמצת מטבולית (Metabolic Acidosis) – מצב נפוץ במחלות כליות שעלול להחמיר את הפגיעה ברקמה',
  };

  const hasOmega3 = allText.includes('omega') || allText.includes('אומגה') || allText.includes('herring') || allText.includes('fish oil') || allText.includes('שמן דגים');
  const omega3Note = hasOmega3
    ? 'אומגה-3 (משמן דג הרינג) – שיפור זרימת דם לכליות והפחתת דלקת מקומית'
    : 'אומגה-3 – שיפור זרימת דם לכליות והפחתת דלקת';

  const transitionDays = '7-14 ימים';
  const transitionNote = 'מעבר הדרגתי חובה למניעת בעיות עיכול ודחיית המזון';

  const hydrationAlert = 'מים הם חיים: כלבים עם מחלת כליות חייבים גישה חופשית למים בכל רגע. התייבשות קלה עלולה להחמיר את המצב במהירות.';
  const vetWarning = 'מזון רפואי ייעודי - מחייב אבחון וליווי וטרינרי. מומלץ לבצע בדיקות דם תקופתיות למעקב אחר תפקוד הכליות.';

  const feedingMatrix = [
    { weight: '2 ק"ג', grams: '45-60 גרם' },
    { weight: '5 ק"ג', grams: '85-115 גרם' },
    { weight: '10 ק"ג', grams: '145-190 גרם' },
    { weight: '15 ק"ג', grams: '195-255 גרם' },
    { weight: '20 ק"ג', grams: '240-310 גרם' },
    { weight: '25 ק"ג', grams: '280-365 גרם' },
    { weight: '30 ק"ג', grams: '320-415 גרם' },
    { weight: '40 ק"ג', grams: '390-505 גרם' },
    { weight: '50 ק"ג', grams: '455-590 גרם' },
    { weight: '60 ק"ג', grams: '515-670 גרם' },
    { weight: '70 ק"ג', grams: '575-745 גרם' },
  ];

  const crossSellHints = [
    'חטיפים בטוחים לכליות – דלי זרחן ונתרן',
    'מזרקת מים – לעידוד שתייה מרובה ושמירה על הידרציה',
  ];

  return { lowLoad, phBalance, omega3Note, transitionDays, transitionNote, hydrationAlert, vetWarning, feedingMatrix, crossSellHints };
};

/** Check if product is hepatic/liver support */
const isHepaticProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'hepatic' || cat === 'liver' ||
    text.includes('hepatic') || text.includes('כבד') || text.includes('כבדי') ||
    text.includes('l/d') || text.includes('liver');
};

/** Extract hepatic care features */
const extractHepaticFeatures = (product: any) => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const allText = text + ' ' + JSON.stringify(product.product_attributes || {}).toLowerCase();

  const lowLoad = [
    { icon: '🧪', label: 'נחושת נמוכה מאוד (5mg/kg)', description: 'מניעת הצטברות רעילה של נחושת בכבד – קריטי במחלות אגירה', color: 'hsl(35,55%,45%)' },
    { icon: '🥩', label: 'חלבון איכותי (16%)', description: 'רמה מתונה של חלבון קל לעיכול להפחתת ייצור פסולת חנקנית', color: 'hsl(200,55%,45%)' },
  ];

  const energyBar = {
    title: 'כוסמין ועמילן אורז – אנרגיה זמינה',
    description: 'פחמימות קלות לעיכול המספקות אנרגיה זמינה מבלי להעמיס על תהליכי העיכול בכבד',
  };

  const omega3Match = allText.match(/omega[- ]?3[^%]*?(\d+(?:\.\d+)?)\s*%/i);
  const omega3 = {
    value: omega3Match ? `${omega3Match[1]}%` : '0.70%',
    description: 'הפחתת דלקת בכבד ותמיכה בהתחדשות תאים – חומצות שומן חיוניות',
  };

  const hasFOS = allText.includes('fos') || allText.includes('פרוקטו');
  const hasMOS = allText.includes('mos') || allText.includes('מנאן');
  const digestiveSynergy = (hasFOS || hasMOS)
    ? 'FOS & MOS – בריאות מעי לצמצום העומס הרעיל שמגיע לכבד מהמעיים'
    : 'פרה-ביוטיקה – בריאות מעי לצמצום העומס הרעיל שמגיע לכבד';

  const conditions = [
    { icon: '🫀', label: 'אי ספיקת כבד כרונית', description: 'Chronic Liver Insufficiency – תמיכה תזונתית ארוכת טווח' },
    { icon: '🧬', label: 'מחלות אגירת נחושת', description: 'Copper Storage Disease – מניעת הצטברות נחושת רעילה' },
    { icon: '🩺', label: 'התאוששות מדלקות כבד', description: 'Post-Inflammatory Recovery – שיקום לאחר Hepatitis' },
  ];

  const vetWarning = 'מזון רפואי ייעודי - מחייב אבחון וליווי וטרינרי צמוד. יש לבצע בדיקות דם תקופתיות למעקב אחר אנזימי כבד.';

  const crossSellHints = [
    'תוספי תמיכה בכבד – Milk Thistle ותוספים בטוחים לכבד',
    '⚠️ יש להימנע מחטיפים שמנים העלולים להעמיס על הכבד',
  ];

  return { lowLoad, energyBar, omega3, digestiveSynergy, conditions, vetWarning, crossSellHints };
};

/** Check if product is cardiac/heart support */
const isCardiacProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'cardiac' || cat === 'heart' ||
    text.includes('cardiac') || text.includes('לב') || text.includes('heart') ||
    text.includes('cardio');
};

/** Extract cardiac care features */
const extractCardiacFeatures = (product: any) => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const allText = text + ' ' + JSON.stringify(product.product_attributes || {}).toLowerCase();

  const heartPillars = [
    { icon: '🧂', label: 'נתרן נמוך במיוחד', description: 'רמות נתרן מופחתות לניהול לחץ דם ומניעת אגירת נוזלים', color: 'hsl(200,55%,45%)' },
    { icon: '🌿', label: 'ג\'ינסנג (Panax)', description: 'תמיכה בשריר הלב ושיפור החיוניות – רכיב פיטו-תרפי מוכח', color: 'hsl(140,50%,40%)' },
    { icon: '🛡️', label: 'SOD – Superoxide Dismutase', description: 'תרכיז מיץ מלון – נטרול רדיקלים חופשיים להגנה על תאי הלב', color: 'hsl(280,45%,50%)' },
  ];

  const hasFitAroma = allText.includes('fit-aroma') || allText.includes('fit aroma') || allText.includes('ציפוי ארומטי') || allText.includes('aromatic');
  const fitAroma = hasFitAroma ? {
    title: 'Fit-aroma Technology',
    description: 'טכנולוגיית ציפוי ארומטי – רכיבים פונקציונליים מצופים בחומצות שומן ארומטיות לשיפור הטעם וספיגה יעילה ומבוקרת',
  } : null;

  const hasXOS = allText.includes('xos') || allText.includes('xylo') || allText.includes('קסילו');
  const gutHeart = hasXOS
    ? 'XOS (Xylo-oligosaccharides) – הגנה על מיקרוביוטת המעי, קריטית לבריאות כוללת בחולים כרוניים'
    : 'פרה-ביוטיקה – תמיכה בבריאות המעי לשיפור הספיגה וחיזוק המערכת בחולי לב';

  const conditions = [
    { icon: '❤️', label: 'אי ספיקת לב כרונית', description: 'Chronic Heart Insufficiency – תזונה מותאמת לתמיכה ארוכת טווח' },
    { icon: '🩺', label: 'איזון לחץ דם', description: 'Hypertension Management – סיוע בשמירה על לחץ דם תקין' },
    { icon: '🐕', label: 'חיוניות לכלבים מבוגרים', description: 'Senior Vitality – שיפור איכות חיים וחיוניות בגיל מתקדם' },
  ];

  const vetWarning = 'מזון רפואי ייעודי - מחייב מעקב וטרינרי צמוד. יש לשים לב לסימנים כמו קוצר נשימה או עייפות חריגה ולדווח לרופא.';
  const feedingTip = 'לחולי לב: מומלץ לחלק את המנה למספר ארוחות קטנות כדי לא להעמיס על מערכת העיכול ועל הלב.';

  const crossSellHints = [
    'חטיפים דלי נתרן – בטוחים לכלבים עם בעיות לב',
    '⚠️ יש להימנע מחטיפים מלוחים ומעור גולמי (Rawhide)',
  ];

  return { heartPillars, fitAroma, gutHeart, conditions, vetWarning, feedingTip, crossSellHints };
};

/** Check if product is joint/orthopedic mobility */
const isJointProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'joint' || cat === 'mobility' || cat === 'orthopedic' ||
    text.includes('joint') || text.includes('mobility') || text.includes('מפרקים') ||
    text.includes('j/d') || text.includes('osteoarthritis') || text.includes('שחיקת סחוס') ||
    text.includes('orthopedic') || text.includes('אורתופדי');
};

/** Extract joint health features */
const extractJointFeatures = (product: any) => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const allText = text + ' ' + JSON.stringify(product.product_attributes || {}).toLowerCase();

  // Cartilage support
  const glucosamineMatch = allText.match(/glucosamine[^,]*?(\d+)\s*mg/i);
  const chondroitinMatch = allText.match(/chondroitin[^,]*?(\d+)\s*mg/i);
  const cartilage = [
    { label: 'גלוקוזאמין', value: glucosamineMatch ? `${glucosamineMatch[1]} mg/kg` : '1200 mg/kg', description: 'ריכוז גבוה לתיקון ובנייה מחדש של רקמת סחוס', color: 'hsl(200,55%,45%)' },
    { label: 'כונדרויטין', value: chondroitinMatch ? `${chondroitinMatch[1]} mg/kg` : '900 mg/kg', description: 'שמירה על גמישות המפרק והאטת שחיקה (Osteoarthritis)', color: 'hsl(280,45%,50%)' },
  ];

  // Omega-3 inflammation control
  const omega3Match = allText.match(/omega[- ]?3[^%]*?(\d+(?:\.\d+)?)\s*%/i);
  const epaMatch = allText.match(/epa[^%]*?(\d+(?:\.\d+)?)\s*%/i);
  const dhaMatch = allText.match(/dha[^%]*?(\d+(?:\.\d+)?)\s*%/i);
  const inflammation = {
    omega3: omega3Match ? `${omega3Match[1]}%` : '3.4%',
    epa: epaMatch ? `${epaMatch[1]}%` : '0.38%',
    dha: dhaMatch ? `${dhaMatch[1]}%` : '0.55%',
    description: 'הפחתת כאב פעילה והקלה על נוקשות מפרקים',
  };

  // Weight-joint correlation
  const weightJoint = 'ערך קלורי מבוקר (Controlled Caloric Density) – הפחתת העומס הפיזי על מפרקים כואבים. קריטי במיוחד לכלבים הסובלים מעודף משקל.';

  // Target audience
  const audiences = [
    { icon: '🐕', label: 'גזעים גדולים', description: 'נטייה גנטית לבעיות מפרקים ושחיקת סחוס' },
    { icon: '🏥', label: 'שיקום לאחר ניתוח', description: 'שיקום לאחר ניתוחים אורתופדיים (TPLO, FHO)' },
    { icon: '🦴', label: 'ניהול דלקת מפרקים', description: 'ניהול שחיקת סחוס וכאבים כרוניים (Arthritis)' },
  ];

  const expertTip = 'לתוצאות מיטביות, שלבו דיאטה זו עם פעילות גופנית בעצימות נמוכה (כמו שחייה או הליכות איטיות) ומזרן אורתופדי לתמיכה בשיקום.';

  // Analysis
  const proteinMatch = allText.match(/protein[^%]*?(\d+(?:\.\d+)?)\s*%/i) || allText.match(/חלבון[^%]*?(\d+(?:\.\d+)?)\s*%/i);
  const fatMatch = allText.match(/fat[^%]*?(\d+(?:\.\d+)?)\s*%/i) || allText.match(/שומן[^%]*?(\d+(?:\.\d+)?)\s*%/i);
  const analysis = [
    { label: 'חלבון', value: proteinMatch ? `${proteinMatch[1]}%` : '22%' },
    { label: 'שומן', value: fatMatch ? `${fatMatch[1]}%` : '12%' },
  ];
  const caPhNote = 'יחס סידן/זרחן מותאם לבריאות המפרקים';

  const vetWarning = 'מזון רפואי ייעודי - דורש אבחון וליווי וטרינרי. מומלץ לעקוב אחר שיפור בתנועתיות הכלב תוך 4-8 שבועות.';

  const crossSellHints = [
    'מזרן אורתופדי Memory Foam – הקלה על לחץ במפרקים בזמן מנוחה',
    'שמן סלמון נוזלי – חיזוק נוסף של Omega-3 לשיקום מפרקים',
  ];

  return { cartilage, inflammation, weightJoint, audiences, expertTip, analysis, caPhNote, vetWarning, crossSellHints };
};

/** Check if product is a veterinary diet / metabolic support */
const isVetDietProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'veterinary' || cat === 'vet-diet' || cat === 'metabolic' ||
    text.includes('obesity') || text.includes('השמנה') ||
    text.includes('diabetic') || text.includes('סוכרת') ||
    text.includes('petid pharmacy') || text.includes('health & care') || text.includes('veterinary diet') || text.includes('מזון רפואי') ||
    (text.includes('metabolic') && (text.includes('dog') || text.includes('כלב'))) ||
    (text.includes('weight management') && text.includes('prescription')) ||
    text.includes('l-carnitine') || text.includes('ל-קרניטין');
};

/** Extract vet diet features */
const extractVetDietFeatures = (product: any): {
  medicalIndicators: { label: string; value: string; highlight: string | null; color: string }[];
  weightLossTech: { icon: React.ReactNode; title: string; description: string; color: string }[];
  vetWarning: string;
  usageTimeline: string;
  crossSellHints: string[];
  feedingMatrix: { weight: string; diabetic: string; light: string; severe: string }[];
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const allText = text + ' ' + JSON.stringify(attrs).toLowerCase();

  // Medical indicators
  const medicalIndicators: { label: string; value: string; highlight: string | null; color: string }[] = [];
  const fatMatch = allText.match(/(?:fat|שומן)[^%]*?(\d+(?:\.\d+)?)\s*%/i);
  medicalIndicators.push({ label: 'שומן', value: fatMatch ? `${fatMatch[1]}%` : '6.2%', highlight: 'Low Fat', color: 'hsl(140,50%,40%)' });
  medicalIndicators.push({ label: 'אינדקס גליקמי', value: 'נמוך', highlight: 'Diabetic Friendly', color: 'hsl(200,60%,45%)' });
  const kcalMatch = allText.match(/(\d{3,4})\s*kcal/i);
  medicalIndicators.push({ label: 'צפיפות אנרגיה', value: kcalMatch ? `${kcalMatch[1]} kcal/kg` : '3000 kcal/kg', highlight: null, color: 'hsl(35,60%,50%)' });

  // Weight loss tech
  const weightLossTech: { icon: React.ReactNode; title: string; description: string; color: string }[] = [];
  weightLossTech.push({ icon: <Flame className="w-5 h-5" />, title: 'L-Carnitine', description: 'שורף שומן והופך אותו לאנרגיה – מאיץ חילוף חומרים', color: 'hsl(15,70%,50%)' });
  weightLossTech.push({ icon: <Salad className="w-5 h-5" />, title: 'סיבים תזונתיים גבוהים', description: 'תחושת שובע ממושכת למניעת רעב בין הארוחות', color: 'hsl(140,50%,40%)' });

  const vetWarning = 'שימוש במזון רפואי דורש ליווי וטרינרי. מומלץ להתייעץ עם וטרינר לפני תחילת השימוש.';
  const usageTimeline = 'עד 6 חודשים לניהול סוכרת, או עד להגעה למשקל היעד – בהתאם להמלצת הווטרינר';

  const crossSellHints = [
    'חטיפים דלי קלוריות – להמשך הדיאטה ללא פשרות',
    'LickiMat – להאטת אכילה והגברת תחושת שובע',
  ];

  // Feeding matrix (Health & Care style)
  const feedingMatrix: { weight: string; diabetic: string; light: string; severe: string }[] = [
    { weight: '2 ק"ג', diabetic: '45 גרם', light: '40 גרם', severe: '30 גרם' },
    { weight: '5 ק"ג', diabetic: '85 גרם', light: '75 גרם', severe: '55 גרם' },
    { weight: '10 ק"ג', diabetic: '140 גרם', light: '125 גרם', severe: '95 גרם' },
    { weight: '15 ק"ג', diabetic: '190 גרם', light: '170 גרם', severe: '125 גרם' },
    { weight: '20 ק"ג', diabetic: '235 גרם', light: '210 גרם', severe: '155 גרם' },
    { weight: '30 ק"ג', diabetic: '315 גרם', light: '280 גרם', severe: '210 גרם' },
    { weight: '40 ק"ג', diabetic: '385 גרם', light: '345 גרם', severe: '260 גרם' },
    { weight: '50 ק"ג', diabetic: '455 גרם', light: '405 גרם', severe: '305 גרם' },
    { weight: '60 ק"ג', diabetic: '520 גרם', light: '465 גרם', severe: '345 גרם' },
  ];

  return { medicalIndicators, weightLossTech, vetWarning, usageTimeline, crossSellHints, feedingMatrix };
};

/** Check if product is a urinary health / stone dissolution product */
const isUrinaryProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'urinary' || cat === 'struvite' ||
    text.includes('struvite') || text.includes('סטרוויט') ||
    text.includes('urinary') || text.includes('דרכי השתן') ||
    text.includes('s/o') || text.includes('u/c') ||
    (text.includes('dissolution') && text.includes('stone')) ||
    text.includes('אבני שתן') || text.includes('ph balance');
};

/** Extract urinary health features */
const extractUrinaryFeatures = (product: any) => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const allText = text + ' ' + JSON.stringify(attrs).toLowerCase();

  const mineralGrid = [
    { icon: <Beaker className="w-5 h-5" />, label: 'מגנזיום וזרחן נמוכים', description: 'רמות מבוקרות למניעת התגבשות קריסטלים', color: 'hsl(200,55%,45%)' },
    { icon: <FlaskConical className="w-5 h-5" />, label: 'DL-Methionine – מחמיץ שתן', description: 'החמצת שתן מבוקרת לאיזון ה-pH', color: 'hsl(270,45%,50%)' },
    { icon: <Droplets className="w-5 h-5" />, label: 'עידוד שתייה', description: 'חשיבות עליונה למים זמינים לעידוד השתנה', color: 'hsl(195,70%,45%)' },
  ];

  const hasGlucosamine = allText.includes('glucosamine') || allText.includes('גלוקוזאמין');
  const glucosamineNote = hasGlucosamine ? 'גלוקוזאמין (0.06%) – תמיכה בדופן שלפוחית השתן' : null;

  const timeline = [
    { stage: 'שלב 1', duration: '5-12 שבועות', title: 'פירוק אבנים פעיל', description: 'המזון פועל להמסת אבני הסטרוויט הקיימות', color: 'hsl(15,65%,50%)' },
    { stage: 'שלב 2', duration: 'עד 6 חודשים', title: 'מניעה ותחזוקה', description: 'שמירה על סביבת שתן שמונעת הישנות', color: 'hsl(140,50%,40%)' },
  ];

  const vetWarning = 'מוצר זה דורש מרשם או המלצה וטרינרית. אין להשתמש ללא ליווי מקצועי.';

  const feedingMatrix = [
    { weight: '2 ק"ג', grams: '35-50 גרם' },
    { weight: '3 ק"ג', grams: '50-65 גרם' },
    { weight: '5 ק"ג', grams: '70-95 גרם' },
    { weight: '7 ק"ג', grams: '90-120 גרם' },
    { weight: '10 ק"ג', grams: '115-155 גרם' },
    { weight: '15 ק"ג', grams: '155-205 גרם' },
    { weight: '20 ק"ג', grams: '190-255 גרם' },
    { weight: '25 ק"ג', grams: '225-300 גרם' },
    { weight: '30 ק"ג', grams: '255-340 גרם' },
  ];

  const crossSellHints = [
    'חטיפים בטוחים לדרכי השתן – ללא מינרלים עודפים',
    'מזרקת מים איכותית – לעידוד שתייה מוגברת',
  ];

  return { mineralGrid, glucosamineNote, timeline, vetWarning, feedingMatrix, crossSellHints };
};

/** Check if product is ultra-hypoallergenic / skin care */
const isHypoallergenicProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'hypoallergenic' || cat === 'dermatology' || cat === 'skin-care' ||
    text.includes('ultrahypo') || text.includes('hypoallergenic') || text.includes('היפואלרגני') ||
    text.includes('hydrolyzed') || text.includes('הידרוליזד') || text.includes('מפורק') ||
    text.includes('atopic') || text.includes('אטופי') ||
    text.includes('elimination diet') || text.includes('דיאטת אלימינציה') ||
    (text.includes('skin') && text.includes('allergy')) ||
    (text.includes('עור') && (text.includes('אלרגי') || text.includes('גירוד')));
};

/** Extract hypoallergenic features */
const extractHypoallergenicFeatures = (product: any) => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const allText = text + ' ' + JSON.stringify(product.product_attributes || {}).toLowerCase();

  // Dalton size
  const daltonMatch = allText.match(/(\d[\d,]*)\s*dalton/i);
  const daltonSize = daltonMatch ? daltonMatch[1].replace(',', '') : '6000';

  const skinBenefits = [
    { icon: <Scan className="w-5 h-5" />, label: 'תמיכה בדרמטיטיס אטופית', description: 'טיפול בעור מגורה ומגרד – הפחתת דלקת וגירוד', color: 'hsl(350,50%,50%)' },
    { icon: <Activity className="w-5 h-5" />, label: 'שיקום מערכת העיכול', description: 'פתרון לשלשולים חוזרים ובעיות עיכול כרוניות', color: 'hsl(35,60%,48%)' },
    { icon: <Fish className="w-5 h-5" />, label: 'אומגה 3 – מחסום עור (2.2%)', description: 'ריכוז גבוה של אומגה 3 לחיזוק מחסום העור והברקת הפרווה', color: 'hsl(200,60%,45%)' },
  ];

  const eliminationTimeline = 'תוצאות נראות לעין באלרגיות עור עשויות לדרוש מספר שבועות של האכלה קפדנית ובלעדית. יש להימנע מכל חטיף או מזון נוסף בתקופת האבחון.';

  const vetWarning = 'מזון רפואי ייעודי - דורש אבחון וליווי של וטרינר. אין לשלב עם מזונות אחרים או חטיפים בזמן תקופת האבחון.';

  const hasRiceStarch = allText.includes('rice starch') || allText.includes('עמילן אורז');

  const feedingMatrix = [
    { weight: '2 ק"ג', grams: '40-55 גרם' },
    { weight: '3 ק"ג', grams: '55-70 גרם' },
    { weight: '5 ק"ג', grams: '75-100 גרם' },
    { weight: '7 ק"ג', grams: '95-125 גרם' },
    { weight: '10 ק"ג', grams: '120-160 גרם' },
    { weight: '15 ק"ג', grams: '165-215 גרם' },
    { weight: '20 ק"ג', grams: '200-265 גרם' },
    { weight: '25 ק"ג', grams: '235-310 גרם' },
    { weight: '30 ק"ג', grams: '265-350 גרם' },
    { weight: '35 ק"ג', grams: '295-390 גרם' },
  ];

  const crossSellHints = [
    'חטיפים היפואלרגניים בלבד – כדי לא לפגוע בדיאטת האלימינציה',
    'שמפו מרגיע לעור – להקלה חיצונית על גירוד ודלקת',
  ];

  return { daltonSize, skinBenefits, eliminationTimeline, vetWarning, hasRiceStarch, feedingMatrix, crossSellHints };
};

/** Check if product is gastrointestinal support */
const isGastroProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'gastrointestinal' || cat === 'gastro' || cat === 'intestinal' ||
    text.includes('intestinal') || text.includes('gastro') || text.includes('גסטרו') ||
    text.includes('i/d') || text.includes('gi ') ||
    text.includes('pancreatitis') || text.includes('דלקת לבלב') ||
    text.includes('digestive care') || text.includes('עיכול') ||
    (text.includes('gastrointestinal') && (text.includes('dog') || text.includes('cat') || text.includes('כלב') || text.includes('חתול')));
};

/** Extract gastro features */
const extractGastroFeatures = (product: any) => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();

  const pillars = [
    { icon: <Salad className="w-5 h-5" />, label: 'עיכול קל', description: 'רכיבים בעלי נעצמות גבוהה – אורז ועוף מפורק להקלה על הלבלב והמעי', color: 'hsl(140,50%,40%)' },
    { icon: <Activity className="w-5 h-5" />, label: 'איזון מיקרוביום', description: 'FOS & MOS – פרה-ביוטיקה לחיזוק החיידקים הטובים ושיקום רירית המעי', color: 'hsl(270,45%,50%)' },
    { icon: <Fish className="w-5 h-5" />, label: 'אנטי-דלקתי – אומגה 3', description: 'הפחתת דלקות מקומיות במערכת העיכול', color: 'hsl(200,60%,45%)' },
  ];

  const symptoms = ['שלשולים', 'גזים והתנפחות', 'דלקת לבלב (Pancreatitis)', 'תסמונת המעי הרגיז (IBS)'];

  const timeline = [
    { stage: 'חריף', duration: '1-2 שבועות', title: 'הפרעות חריפות', description: 'הקלה ראשונית והרגעת מערכת העיכול', color: 'hsl(35,60%,48%)' },
    { stage: 'עיכול לקוי', duration: '3-21 שבועות', title: 'שיקום עיכול', description: 'שיקום הדרגתי של הפלורה והתפקוד', color: 'hsl(200,55%,45%)' },
    { stage: 'כרוני', duration: 'לכל החיים', title: 'מצבים כרוניים / לבלב', description: 'תחזוקה מתמשכת בליווי וטרינרי', color: 'hsl(350,50%,50%)' },
  ];

  const vetWarning = 'מזון רפואי - דורש ליווי וטרינרי. מומלץ לחלק את המנה ל-3-4 ארוחות קטנות ביום להקלה על העיכול.';
  const hydrationNote = 'בזמן שלשולים, חיוני להקפיד על שתיית מים מרובה למניעת התייבשות.';

  const feedingMatrix = [
    { weight: '2 ק"ג', grams: '50-65 גרם' },
    { weight: '5 ק"ג', grams: '95-120 גרם' },
    { weight: '10 ק"ג', grams: '155-195 גרם' },
    { weight: '15 ק"ג', grams: '205-260 גרם' },
    { weight: '20 ק"ג', grams: '250-320 גרם' },
    { weight: '25 ק"ג', grams: '295-370 גרם' },
    { weight: '30 ק"ג', grams: '335-420 גרם' },
    { weight: '40 ק"ג', grams: '410-515 גרם' },
    { weight: '50 ק"ג', grams: '480-600 גרם' },
    { weight: '60 ק"ג', grams: '545-680 גרם' },
  ];

  const crossSellHints = [
    'תוספי פרוביוטיקה – לחיזוק נוסף של הפלורה המעיית',
    'קערת האכלה איטית – למניעת אכילה מהירה שמעמיסה על העיכול',
  ];

  return { pillars, symptoms, timeline, vetWarning, hydrationNote, feedingMatrix, crossSellHints };
};

/** Check if product is a joint supplement */
const isJointSupplementProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  return cat === 'health' || cat === 'supplements' || cat === 'joint-support' ||
    text.includes('glucosamine') || text.includes('גלוקוזאמין') ||
    text.includes('joint') || text.includes('מפרק') || text.includes('supplement') || text.includes('תוסף') ||
    text.includes('chondroitin') || text.includes('כונדרויטין') ||
    text.includes('msm') || text.includes('green lipped mussel') || text.includes('פטילת ים') ||
    (text.includes('mobility') && (text.includes('dog') || text.includes('כלב')));
};

/** Extract joint supplement features */
const extractJointSupplementFeatures = (product: any): {
  ingredients: { icon: React.ReactNode; name: string; dosage: string | null; benefit: string; isSecret: boolean }[];
  dosagePhases: { name: string; rows: { weight: string; dose: string }[] }[];
  mobilityBenefits: { icon: React.ReactNode; title: string; description: string; color: string }[];
  humanComparison: string | null;
  insuranceTip: string | null;
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const allText = text + ' ' + JSON.stringify(attrs).toLowerCase();

  // Active ingredients
  const ingredients: { icon: React.ReactNode; name: string; dosage: string | null; benefit: string; isSecret: boolean }[] = [];
  if (allText.includes('glucosamine') || allText.includes('גלוקוזאמין')) {
    const dose = allText.match(/glucosamine[^,]*?(\d+)\s*mg/i);
    let msmDose = allText.match(/msm[^,]*?(\d+)\s*mg/i);
    const dosageStr = dose ? `${dose[1]}mg` : null;
    ingredients.push({ icon: <Bone className="w-4 h-4" />, name: 'גלוקוזאמין & MSM', dosage: dosageStr, benefit: 'תיקון סחוס, הפחתת כאב ושיפור גמישות המפרקים', isSecret: false });
  }
  if (allText.includes('green lipped mussel') || allText.includes('פטילת ים') || allText.includes('mussel')) {
    const dose = allText.match(/mussel[^,]*?(\d+)\s*mg/i);
    ingredients.push({ icon: <Fish className="w-4 h-4" />, name: 'פטילת ים ירוקה (Green Lipped Mussel)', dosage: dose ? `${dose[1]}mg` : '600mg', benefit: 'נוגד דלקת טבעי עוצמתי – "המרכיב הסודי" לבריאות המפרקים', isSecret: true });
  }
  if (allText.includes('chondroitin') || allText.includes('כונדרויטין')) {
    const dose = allText.match(/chondroitin[^,]*?(\d+)\s*mg/i);
    ingredients.push({ icon: <ShieldCheck className="w-4 h-4" />, name: 'כונדרויטין', dosage: dose ? `${dose[1]}mg` : null, benefit: 'הגנה על הסחוס ושיפור ספיגת נוזלים במפרק', isSecret: false });
  }
  if (allText.includes('vitamin c') || allText.includes('ויטמין c') || allText.includes('selenium') || allText.includes('סלניום') || allText.includes('vitamin e') || allText.includes('antioxidant') || allText.includes('נוגדי חמצון')) {
    ingredients.push({ icon: <ShieldPlus className="w-4 h-4" />, name: 'נוגדי חמצון (ויטמין C, E, סלניום)', dosage: null, benefit: 'מלחמה בדלקות ושמירה על תאי הסחוס מפני נזק חמצוני', isSecret: false });
  }
  if (allText.includes('omega') || allText.includes('אומגה')) {
    ingredients.push({ icon: <Droplets className="w-4 h-4" />, name: 'אומגה 3', dosage: null, benefit: 'הפחתת דלקות ותמיכה בבריאות העור והפרווה', isSecret: false });
  }

  // Dosage phases
  const dosagePhases: { name: string; rows: { weight: string; dose: string }[] }[] = [];
  // Initial phase
  dosagePhases.push({
    name: '⚡ שלב ראשוני (שבועות 1-6)',
    rows: [
      { weight: 'עד 10 ק"ג', dose: '½ טבליה ליום' },
      { weight: '10-25 ק"ג', dose: '1 טבליה ליום' },
      { weight: '25-40 ק"ג', dose: '1.5 טבליות ליום' },
      { weight: '40+ ק"ג', dose: '2 טבליות ליום' },
    ]
  });
  // Maintenance phase
  dosagePhases.push({
    name: '🔄 שלב תחזוקה (אחרי שבוע 6)',
    rows: [
      { weight: 'עד 10 ק"ג', dose: '¼ טבליה ליום' },
      { weight: '10-25 ק"ג', dose: '½ טבליה ליום' },
      { weight: '25-40 ק"ג', dose: '1 טבליה ליום' },
      { weight: '40+ ק"ג', dose: '1.5 טבליות ליום' },
    ]
  });

  // Mobility benefits
  const mobilityBenefits: { icon: React.ReactNode; title: string; description: string; color: string }[] = [];
  mobilityBenefits.push({ icon: <Syringe className="w-5 h-5" />, title: 'שיקום לאחר ניתוח', description: 'תמיכה בתהליך ההחלמה לאחר ניתוחים אורתופדיים', color: 'hsl(200,60%,45%)' });
  mobilityBenefits.push({ icon: <Activity className="w-5 h-5" />, title: 'שיפור תנועתיות בגיל מבוגר', description: 'שיפור טווח התנועה והגמישות לכלבים מבוגרים', color: 'hsl(140,50%,40%)' });
  mobilityBenefits.push({ icon: <HeartPulse className="w-5 h-5" />, title: 'הפחתת דלקות וכאבים', description: 'הקלה על כאב כרוני ודלקתי במפרקים ובעמוד השדרה', color: 'hsl(0,55%,50%)' });

  // Human comparison
  const humanComparison = '"המגה גלופלקס של הכלבים" – תוסף ברמה קלינית, בדיוק כמו מוצרי פרימיום לבני אדם';

  // Insurance tip
  const insuranceTip = 'לכלב שלך בעיות מפרקים? בדוק אם הפוליסה שלך מכסה טיפולים אורתופדיים ותוספי תזונה.';

  return { ingredients, dosagePhases, mobilityBenefits, humanComparison, insuranceTip };
};

/** Check if product is a treat/snack */
const isTreatProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  return cat === 'treats' || cat === 'snacks' || 
    text.includes('חטיף') || text.includes('treat') || text.includes('snack') || 
    text.includes('מקל לעיסה') || text.includes('עצם לעיסה') || text.includes('חטיפון');
};

/** Check if product is a superfood/functional treat */
const isSuperfoodTreat = (product: any): boolean => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const allText = text + ' ' + JSON.stringify(attrs).toLowerCase();
  return allText.includes('taurine') || allText.includes('טאורין') ||
    allText.includes('cod skin') || allText.includes('עור דג') ||
    allText.includes('dehydrated') || allText.includes('ייבוש') || allText.includes('מיובש') ||
    allText.includes('superfood') || allText.includes('סופרפוד') ||
    (allText.includes('omega') && (allText.includes('fiber') || allText.includes('סיבים'))) ||
    allText.includes('soulmate');
};

/** Extract superfood treat features */
const extractSuperfoodFeatures = (product: any): {
  vitalityBenefits: { icon: React.ReactNode; title: string; description: string; color: string }[];
  feedingGuide: { size: string; weight: string; amount: string }[];
  dehydrationNote: string | null;
  isNatural100: boolean;
  soulmateMessage: string | null;
  proteinPct: number | null;
  crossSellSuggestions: string[];
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const allText = text + ' ' + JSON.stringify(attrs).toLowerCase();

  // Vitality benefits
  const vitalityBenefits: { icon: React.ReactNode; title: string; description: string; color: string }[] = [];
  if (allText.includes('taurine') || allText.includes('טאורין'))
    vitalityBenefits.push({ icon: <HeartPulse className="w-5 h-5" />, title: 'לב, ראייה וחיסון', description: 'טאורין לחיזוק הלב, הראייה ומערכת החיסון', color: 'hsl(0,65%,50%)' });
  if (allText.includes('omega') || allText.includes('אומגה') || allText.includes('cod skin') || allText.includes('עור דג'))
    vitalityBenefits.push({ icon: <Sparkles className="w-5 h-5" />, title: 'פרווה מבריקה ועור בריא', description: 'אומגה 3 מעור דג לפרווה מבריקה ועור בריא', color: 'hsl(200,65%,50%)' });
  if (allText.includes('fiber') || allText.includes('סיבים') || allText.includes('digestion') || allText.includes('עיכול'))
    vitalityBenefits.push({ icon: <Salad className="w-5 h-5" />, title: 'עיכול קל ושליטה במשקל', description: 'סיבים תזונתיים לעיכול קל ומניעת השמנה', color: 'hsl(140,55%,40%)' });

  // Feeding guide
  const feedingGuide = [
    { size: 'קטן', weight: '2-11 ק"ג (4-25 lbs)', amount: '1-2 יחידות ליום' },
    { size: 'בינוני', weight: '11-23 ק"ג (25-50 lbs)', amount: '2-3 יחידות ליום' },
    { size: 'גדול', weight: '23+ ק"ג (50+ lbs)', amount: '4-5 יחידות ליום' },
  ];

  // Dehydration
  let dehydrationNote: string | null = null;
  if (allText.includes('dehydrat') || allText.includes('ייבוש') || allText.includes('מיובש'))
    dehydrationNote = 'ייבוש בטמפרטורה נמוכה שומר על ערכים תזונתיים גבוהים וריכוז חלבון של מעל 30%';

  // Protein %
  let proteinPct: number | null = null;
  const protMatch = allText.match(/(\d{2,3})\s*%?\s*(?:protein|חלבון)/i);
  if (protMatch) proteinPct = parseInt(protMatch[1]);
  if (!proteinPct && (allText.includes('30%') || allText.includes('over 30'))) proteinPct = 30;

  // Natural
  const isNatural100 = allText.includes('100% natural') || allText.includes('100% טבעי') ||
    allText.includes('no preserv') || allText.includes('ללא חומרים משמרים') ||
    (allText.includes('natural') && allText.includes('no artificial'));

  // Soulmate
  let soulmateMessage: string | null = null;
  if (allText.includes('soulmate')) soulmateMessage = 'Achieving a Better Soulmate 🐾';

  // Cross-sell
  const crossSellSuggestions: string[] = [];
  if (allText.includes('banana') || allText.includes('בננה') || allText.includes('fiber') || allText.includes('סיבים')) {
    crossSellSuggestions.push('בטן רגישה');
    crossSellSuggestions.push('ניהול משקל');
  }

  return { vitalityBenefits, feedingGuide, dehydrationNote, isNatural100, soulmateMessage, proteinPct, crossSellSuggestions };
};

/** Derive health boost icons for treats based on benefits/ingredients */
const deriveTreatHealthBoosts = (product: any): { icon: React.ReactNode; label: string; source: string }[] => {
  const boosts: { icon: React.ReactNode; label: string; source: string }[] = [];
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];

  // Check benefits array first
  for (const b of benefits) {
    const bt = `${b.title || ''} ${b.description || ''}`.toLowerCase();
    if ((bt.includes('שריר') || bt.includes('muscle') || bt.includes('חלבון') || bt.includes('כבד')) && !boosts.find(x => x.label.includes('שרירים')))
      boosts.push({ icon: <Beef className="w-5 h-5" />, label: 'תמיכה בשרירים', source: b.description || 'חלבון מכבד עוף' });
    if ((bt.includes('עיכול') || bt.includes('digest') || bt.includes('דלעת') || bt.includes('pumpkin')) && !boosts.find(x => x.label.includes('עיכול')))
      boosts.push({ icon: <ShieldCheck className="w-5 h-5" />, label: 'סיוע בעיכול', source: b.description || 'זרעי דלעת' });
    if ((bt.includes('פרווה') || bt.includes('coat') || bt.includes('עור') || bt.includes('skin') || bt.includes('שומן') || bt.includes('fatty')) && !boosts.find(x => x.label.includes('פרווה')))
      boosts.push({ icon: <Sparkles className="w-5 h-5" />, label: 'פרווה בריאה', source: b.description || 'חומצות שומן' });
    if ((bt.includes('הרגעה') || bt.includes('stress') || bt.includes('לעיסה') || bt.includes('chew') || bt.includes('occupation')) && !boosts.find(x => x.label.includes('הרגעה')))
      boosts.push({ icon: <Heart className="w-5 h-5" />, label: 'הפגת מתח', source: b.description || 'לעיסה ממושכת' });
  }

  // Fallback: detect from text if benefits didn't cover
  if (!boosts.find(x => x.label.includes('שרירים')) && (text.includes('כבד') || text.includes('liver') || text.includes('חלבון גבוה')))
    boosts.push({ icon: <Beef className="w-5 h-5" />, label: 'תמיכה בשרירים', source: 'חלבון מכבד עוף' });
  if (!boosts.find(x => x.label.includes('עיכול')) && (text.includes('דלעת') || text.includes('pumpkin') || text.includes('סיבים')))
    boosts.push({ icon: <ShieldCheck className="w-5 h-5" />, label: 'סיוע בעיכול', source: 'זרעי דלעת' });
  if (!boosts.find(x => x.label.includes('פרווה')) && (text.includes('אומגה') || text.includes('omega') || text.includes('שומן')))
    boosts.push({ icon: <Sparkles className="w-5 h-5" />, label: 'פרווה בריאה', source: 'חומצות שומן' });
  if (!boosts.find(x => x.label.includes('הרגעה')) && (text.includes('לעיסה') || text.includes('chew') || text.includes('עצם')))
    boosts.push({ icon: <Heart className="w-5 h-5" />, label: 'הפגת מתח', source: 'לעיסה ממושכת' });

  return boosts.slice(0, 6);
};

/** Extract treat usage/serving suggestions */
const extractTreatUsage = (product: any): { purpose: string | null; safetyTip: string | null; isNatural: boolean } => {
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  const attrs = product.product_attributes || {};
  
  let purpose = attrs.purpose || attrs['שימוש'] || null;
  if (!purpose) {
    if (text.includes('אילוף') || text.includes('training')) purpose = 'פרס אילוף';
    else if (text.includes('לעיסה') || text.includes('chew') || text.includes('occupation')) purpose = 'העסקה ולעיסה ממושכת';
    else if (text.includes('חטיף') || text.includes('treat')) purpose = 'חטיף פרס';
  }

  let safetyTip = attrs.safety_tip || attrs['טיפ בטיחות'] || null;
  if (!safetyTip && (text.includes('לעיסה') || text.includes('chew') || text.includes('עצם'))) {
    safetyTip = 'מומלץ לעיסה בפיקוח בלבד';
  }

  const isNatural = text.includes('טבעי') || text.includes('natural') || text.includes('ללא חומרים משמרים') || text.includes('no preserv') || text.includes('ללא צבעים');

  return { purpose, safetyTip, isNatural };
};

/** Extract treat visual feature data: chew duration, protein %, dental, texture */
const extractTreatFeatures = (product: any): {
  chewDuration: number; // 1-5
  proteinPct: number | null;
  hasDental: boolean;
  texture: string | null;
  isChewPriority: boolean; // Donut/Bone → prioritize chew & dental
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const attrs = product.product_attributes || {};

  // Chew duration: from attrs or heuristic
  let chewDuration = parseInt(attrs.chew_duration || attrs['זמן לעיסה'] || '0') || 0;
  if (!chewDuration) {
    if (text.includes('ממושכת') || text.includes('long') || text.includes('donut') || text.includes('דונאט') || text.includes('עצם')) chewDuration = 4;
    else if (text.includes('לעיסה') || text.includes('chew')) chewDuration = 3;
    else chewDuration = 2;
  }
  chewDuration = Math.min(5, Math.max(1, chewDuration));

  // Protein %
  let proteinPct: number | null = null;
  const proteinMatch = text.match(/(\d{1,3})\s*%\s*(?:חלבון|protein)/i) || text.match(/(?:חלבון|protein)\s*[:\-–]?\s*(\d{1,3})\s*%/i);
  if (proteinMatch) proteinPct = parseInt(proteinMatch[1]);
  if (!proteinPct && attrs.protein_pct) proteinPct = parseInt(attrs.protein_pct);

  // Dental
  const hasDental = text.includes('שיני') || text.includes('dental') || text.includes('ניקוי שיניים') || text.includes('teeth') || text.includes('היגיינת') || text.includes('hygiene');

  // Texture
  let texture = attrs.texture || attrs['מרקם'] || null;
  if (!texture) {
    if (text.includes('קשה') || text.includes('tough') || text.includes('hard')) texture = 'קשה ועמיד';
    else if (text.includes('רך') || text.includes('soft')) texture = 'רך וגמיש';
    else if (text.includes('chewy') || text.includes('לעיס')) texture = 'לעיסתי ועמיד';
  }

  // Priority for Donut/Bone shapes
  const isChewPriority = text.includes('donut') || text.includes('דונאט') || text.includes('bone') || text.includes('עצם');

  return { chewDuration, proteinPct, hasDental, texture, isChewPriority };
};

/** Check if product is wet food */
const isWetFoodProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const weightText = (product.weight_text || '').toLowerCase();
  // Direct category match
  if (cat === 'wet-food' || cat === 'wet food') return true;
  // Keyword detection
  if (text.includes('שימורים') || text.includes('פטה') || text.includes('pate') || text.includes('פחית') || text.includes('can ') || text.includes('canned')) return true;
  // Weight heuristic: ~400g cans
  if (weightText.match(/400\s*(?:גרם|גר|g)/i) && (text.includes('pate') || text.includes('פטה') || text.includes('can') || text.includes('פחית'))) return true;
  return false;
};

/** Extract wet food features */
const extractWetFoodFeatures = (product: any): {
  hasHydration: boolean;
  hasJointSupport: boolean;
  texture: string | null;
  origin: string | null;
  mixingTip: string | null;
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();

  const hasHydration = text.includes('הידרציה') || text.includes('hydration') || text.includes('כליות') || text.includes('kidney') || text.includes('לחות') || text.includes('moisture') || benefitsText.includes('הידרציה') || benefitsText.includes('כליות');
  const hasJointSupport = text.includes('גלוקוזאמין') || text.includes('glucosamine') || text.includes('כונדרואיטין') || text.includes('chondroitin') || text.includes('מפרקים') || text.includes('joint') || benefitsText.includes('מפרקים') || benefitsText.includes('joint');

  let texture = attrs.texture || attrs['מרקם'] || null;
  if (!texture) {
    if (text.includes('פטה') || text.includes('pate') || text.includes('paté')) texture = 'פטה (Pâté)';
    else if (text.includes('נתחים') || text.includes('chunks')) texture = 'נתחים ברוטב';
    else if (text.includes('מוס') || text.includes('mousse')) texture = 'מוס';
  }

  let origin = attrs.origin || attrs['מקור ייצור'] || attrs.made_in || null;
  if (!origin) {
    if (text.includes('איטליה') || text.includes('italy') || text.includes('italian')) origin = 'איטליה 🇮🇹';
    else if (text.includes('גרמניה') || text.includes('germany')) origin = 'גרמניה 🇩🇪';
    else if (text.includes('צרפת') || text.includes('france')) origin = 'צרפת 🇫🇷';
  }

  let mixingTip = attrs.mixing_tip || attrs['טיפ ערבוב'] || null;
  if (!mixingTip && (text.includes('topper') || text.includes('ערבוב') || text.includes('mix') || text.includes('מזון יבש'))) {
    mixingTip = 'ערבבו ¼ פחית עם המזון היבש להעשרת הטעם והלחות';
  }
  if (!mixingTip) {
    mixingTip = 'ניתן להגיש בנפרד או כתוספת (Topper) למזון יבש';
  }

  return { hasHydration, hasJointSupport, texture, origin, mixingTip };
};

/** Check if product is an enrichment/lick mat product */
const isEnrichmentProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  return cat === 'enrichment' || cat === 'lick-mat' ||
    text.includes('lickimat') || text.includes('ליקימט') || text.includes('lick mat') ||
    text.includes('מפית ליקוק') || text.includes('משטח ליקוק') || text.includes('enrichment') ||
    text.includes('העשרה') || text.includes('slow feeder') || text.includes('אנטי גלופ');
};

/** Check if product is a bedding/comfort product */
const isBeddingProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  return cat === 'beds' || cat === 'bedding' || cat === 'מיטות' ||
    text.includes('מיטה') || text.includes('bed') || text.includes('mat ') ||
    text.includes('fluffy') || text.includes('פלאפי') || text.includes('מזרן') ||
    text.includes('כרית') || text.includes('cushion') || text.includes('snuggle');
};

/** Extract bedding/comfort features */
const extractBeddingFeatures = (product: any): {
  texture: string | null;
  sleepBenefits: { icon: React.ReactNode; label: string; description: string }[];
  isWashable: boolean;
  washTip: string | null;
  sizing: { diameter: string | null; maxWeight: string | null; bestFor: string | null };
  isLuxuryDesign: boolean;
  snuggleFactor: boolean; // Bed/Mat/Fluffy → prioritize snuggle
} => {
  const text = `${product.name || ''} ${product.description || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText;

  // Texture / Feel
  let texture = attrs.texture || attrs['מרקם'] || attrs.material || attrs['חומר'] || null;
  if (!texture) {
    if (allText.includes('פלאפי') || allText.includes('fluffy') || allText.includes('פרווה')) texture = 'בד פלאפי המדמה פרווה טבעית';
    else if (allText.includes('קטיפה') || allText.includes('velvet')) texture = 'קטיפה רכה';
    else if (allText.includes('מרופד') || allText.includes('padded')) texture = 'ריפוד עבה ונוח';
  }

  // Sleep benefits
  const sleepBenefits: { icon: React.ReactNode; label: string; description: string }[] = [];
  if (allText.includes('חרדה') || allText.includes('anxiety') || allText.includes('ביטחון') || allText.includes('security') || allText.includes('קירות גבוה') || allText.includes('raised') || allText.includes('bolster'))
    sleepBenefits.push({ icon: <Heart className="w-5 h-5" />, label: 'הפחתת חרדה', description: 'קירות גבוהים לתחושת ביטחון' });
  if (allText.includes('מפרקים') || allText.includes('joint') || allText.includes('אורתופד') || allText.includes('orthop') || allText.includes('מבוגר') || allText.includes('senior') || allText.includes('older'))
    sleepBenefits.push({ icon: <ShieldCheck className="w-5 h-5" />, label: 'תמיכה למפרקים', description: 'מתאים במיוחד לחיות מבוגרות' });
  if (allText.includes('שינה עמוקה') || allText.includes('deep sleep') || allText.includes('שינה') || allText.includes('sleep') || allText.includes('מנוחה') || allText.includes('rest'))
    sleepBenefits.push({ icon: <Moon className="w-5 h-5" />, label: 'שינה עמוקה', description: 'מעודד שינה עמוקה ואיכותית' });
  // Fallback
  if (sleepBenefits.length === 0) {
    sleepBenefits.push({ icon: <Moon className="w-5 h-5" />, label: 'שינה עמוקה', description: 'מעודד שינה עמוקה ואיכותית' });
  }

  // Washable
  const isWashable = allText.includes('כביסה') || allText.includes('wash') || allText.includes('ניתן לכבס') || allText.includes('machine wash') || allText.includes('כבסה');
  let washTip = attrs.care_instructions || attrs['הוראות טיפול'] || null;
  if (!washTip && isWashable) washTip = 'כביסה עדינה במכונה, ייבוש באוויר';

  // Sizing
  const diameterMatch = allText.match(/(\d{2,3})\s*(?:ס[״"]?מ|cm)\s*(?:קוטר|diameter)?/i) || allText.match(/(?:קוטר|diameter)\s*[:\-–]?\s*(\d{2,3})/i);
  const weightMatch = allText.match(/(?:עד|up to|מקסימום|max)\s*(\d{1,3})\s*(?:ק[״"]?ג|kg)/i);
  const diameter = attrs.diameter || attrs['קוטר'] || (diameterMatch ? `${diameterMatch[1]} ס"מ` : null);
  const maxWeight = attrs.max_weight || attrs['משקל מקסימלי'] || (weightMatch ? `עד ${weightMatch[1]} ק"ג` : null);
  let bestFor = attrs.best_for || attrs['מתאים ל'] || null;
  if (!bestFor) {
    if (allText.includes('קטן') || allText.includes('small')) bestFor = 'כלבים קטנים עד בינוניים / חתולים';
    else if (allText.includes('גדול') || allText.includes('large')) bestFor = 'כלבים גדולים';
    else if (allText.includes('חתול') || allText.includes('cat')) bestFor = 'חתולים';
  }

  // Luxury design
  const isLuxuryDesign = allText.includes('יוקרתי') || allText.includes('luxury') || allText.includes('עיצוב') || allText.includes('design') || allText.includes('סלון') || allText.includes('home') || allText.includes('דקורטיב');

  // Snuggle factor
  const snuggleFactor = allText.includes('bed') || allText.includes('מיטה') || allText.includes('mat') || allText.includes('fluffy') || allText.includes('פלאפי') || allText.includes('snuggle');

  return { texture, sleepBenefits, isWashable, washTip, sizing: { diameter, maxWeight, bestFor }, isLuxuryDesign, snuggleFactor };
};

/** Check if product is a smart utility/hygiene product (bowls, anti-spill, feeders) */
const isUtilityProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  return cat === 'bowls' || cat === 'feeders' || cat === 'utility' ||
    text.includes('anti spill') || text.includes('אנטי שפיכה') || text.includes('bowl') || text.includes('קערה') ||
    text.includes('splash') || text.includes('שפיכה') || text.includes('מצוף') || text.includes('floating') ||
    text.includes('no-mess') || text.includes('ללא בלגן') || text.includes('שותה מבולגן') || text.includes('messy drink');
};

/** Extract utility/hygiene features */
const extractUtilityFeatures = (product: any): {
  cleanHomeBadge: boolean;
  cleanHomeDesc: string[];
  mechanism: string | null;
  usageScenarios: { icon: React.ReactNode; label: string }[];
  techSpecs: { label: string; value: string }[];
  isNoMessPriority: boolean;
} => {
  const text = `${product.name || ''} ${product.description || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText;

  // Clean Home badge
  const cleanHomeBadge = allText.includes('מים') || allText.includes('water') || allText.includes('שפיכה') || allText.includes('spill') || allText.includes('splash') || allText.includes('בלגן') || allText.includes('mess') || allText.includes('יבש') || allText.includes('dry');
  const cleanHomeDesc: string[] = [];
  if (allText.includes('פחות מים') || allText.includes('less water') || allText.includes('שפיכה') || allText.includes('spill')) cleanHomeDesc.push('פחות מים על הרצפה');
  if (allText.includes('יבש') || allText.includes('dry') || allText.includes('סביבה נקיה') || allText.includes('clean')) cleanHomeDesc.push('סביבת שתייה יבשה ונקייה');
  if (cleanHomeDesc.length === 0 && cleanHomeBadge) { cleanHomeDesc.push('פחות מים על הרצפה'); cleanHomeDesc.push('סביבת שתייה יבשה ונקייה'); }

  // Mechanism
  let mechanism = attrs.mechanism || attrs['מנגנון'] || null;
  if (!mechanism) {
    if (allText.includes('מצוף') || allText.includes('floating') || allText.includes('float')) mechanism = 'מנגנון מצוף (Floating Disk) – שולט בזרימת המים ומונע הרטבת הפנים';
    else if (allText.includes('valve') || allText.includes('שסתום')) mechanism = 'שסתום בקרת זרימה – מווסת את כמות המים הזמינה';
    else if (allText.includes('slow') || allText.includes('איטי')) mechanism = 'מנגנון האטת שתייה – מעודד שתייה מבוקרת';
  }

  // Usage scenarios
  const usageScenarios: { icon: React.ReactNode; label: string }[] = [];
  if (allText.includes('נסיעה') || allText.includes('רכב') || allText.includes('car') || allText.includes('travel') || allText.includes('גלישה') || allText.includes('trip'))
    usageScenarios.push({ icon: <Car className="w-5 h-5" />, label: 'מתאים לנסיעות ברכב' });
  if (allText.includes('מבולגן') || allText.includes('messy') || allText.includes('בלגן') || allText.includes('splash') || allText.includes('שפריץ'))
    usageScenarios.push({ icon: <Droplet className="w-5 h-5" />, label: 'לכלבים "מבולגנים"' });
  if (allText.includes('אנטי החלקה') || allText.includes('non-slip') || allText.includes('יציב') || allText.includes('stable') || allText.includes('גומי'))
    usageScenarios.push({ icon: <Grip className="w-5 h-5" />, label: 'יציבות מקסימלית (אנטי החלקה)' });
  if (usageScenarios.length === 0) {
    usageScenarios.push({ icon: <Droplet className="w-5 h-5" />, label: 'לכלבים "מבולגנים"' });
  }

  // Tech specs
  const techSpecs: { label: string; value: string }[] = [];
  const capacity = attrs.capacity || attrs['נפח'] || attrs['קיבולת'] || null;
  if (capacity) techSpecs.push({ label: 'נפח', value: String(capacity) });
  else { const capMatch = allText.match(/(\d+(?:\.\d+)?)\s*(?:ליטר|liter|l\b)/i); if (capMatch) techSpecs.push({ label: 'נפח', value: `${capMatch[1]} ליטר` }); }
  const brand = attrs.brand || null;
  if (brand) techSpecs.push({ label: 'מותג', value: String(brand) });
  const maintenance = attrs.maintenance || attrs.care_instructions || attrs['הוראות טיפול'] || null;
  if (maintenance) techSpecs.push({ label: 'תחזוקה', value: String(maintenance) });
  else if (allText.includes('פירוק') || allText.includes('disassemble') || allText.includes('ניקוי קל') || allText.includes('easy clean'))
    techSpecs.push({ label: 'תחזוקה', value: 'פירוק וניקוי קל' });
  const material = attrs.material || attrs['חומר'] || null;
  if (material) techSpecs.push({ label: 'חומר', value: String(material) });

  // No-mess priority
  const isNoMessPriority = allText.includes('anti spill') || allText.includes('אנטי שפיכה') || allText.includes('bowl') || allText.includes('קערה') || allText.includes('splash');

  return { cleanHomeBadge, cleanHomeDesc, mechanism, usageScenarios, techSpecs, isNoMessPriority };
};

/** Check if product is a grooming/spa product */
const isGroomingProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  return cat === 'grooming' || cat === 'spa' || cat === 'טיפוח' ||
    text.includes('shampoo') || text.includes('שמפו') || text.includes('oil') || text.includes('שמן') ||
    text.includes('silk') || text.includes('משי') || text.includes('coat') || text.includes('פרווה') ||
    text.includes('conditioner') || text.includes('מרכך') || text.includes('grooming') || text.includes('טיפוח') ||
    text.includes('spray') || text.includes('ספריי') || text.includes('detangl') || text.includes('קשרים');
};

/** Extract grooming/spa features */
const extractGroomingFeatures = (product: any): {
  visibleResults: string[];
  activeIngredients: { icon: React.ReactNode; label: string; benefit: string }[];
  usageSteps: string[];
  featureBadges: string[];
  targetCoatType: string | null;
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText;

  // Visible results
  const visibleResults: string[] = [];
  if (allText.includes('ברק') || allText.includes('shine') || allText.includes('silk') || allText.includes('משי')) visibleResults.push('ברק של משי');
  if (allText.includes('רך') || allText.includes('soft') || allText.includes('רכות') || allText.includes('smooth')) visibleResults.push('מגע רך וחלק');
  if (allText.includes('קשר') || allText.includes('tangle') || allText.includes('detangl') || allText.includes('knot')) visibleResults.push('הפחתת קשרים');
  if (allText.includes('ריח') || allText.includes('odor') || allText.includes('scent') || allText.includes('fragrance')) visibleResults.push('ריח נעים ורענן');
  if (visibleResults.length === 0) visibleResults.push('ברק של משי', 'מגע רך וחלק');

  // Active ingredients
  const activeIngredients: { icon: React.ReactNode; label: string; benefit: string }[] = [];
  if (allText.includes('חלבוני משי') || allText.includes('silk protein') || allText.includes('silk'))
    activeIngredients.push({ icon: <Sparkles className="w-5 h-5" />, label: 'חלבוני משי', benefit: 'שיקום ותיקון שערות פגומות' });
  if (allText.includes('ויטמין e') || allText.includes('vitamin e') || allText.includes('vit e'))
    activeIngredients.push({ icon: <ShieldCheck className="w-5 h-5" />, label: 'ויטמין E', benefit: 'בריאות העור והגנה מפני יובש' });
  if (allText.includes('uv') || allText.includes('שמש') || allText.includes('sun') || allText.includes('הגנה'))
    activeIngredients.push({ icon: <Sun className="w-5 h-5" />, label: 'הגנה מ-UV', benefit: 'מניעת יובש וקהות מהשמש' });
  if (allText.includes('אלוורה') || allText.includes('aloe'))
    activeIngredients.push({ icon: <Leaf className="w-5 h-5" />, label: 'אלוורה', benefit: 'הרגעת העור ולחות' });
  if (allText.includes('קרטין') || allText.includes('keratin'))
    activeIngredients.push({ icon: <Shield className="w-5 h-5" />, label: 'קרטין', benefit: 'חיזוק מבנה השערה' });
  if (allText.includes('אומגה') || allText.includes('omega'))
    activeIngredients.push({ icon: <Droplets className="w-5 h-5" />, label: 'אומגה 3 ו-6', benefit: 'תזונת העור מבפנים' });
  if (activeIngredients.length === 0) {
    activeIngredients.push({ icon: <Sparkles className="w-5 h-5" />, label: 'רכיבים פעילים', benefit: 'תמיכה בבריאות העור והפרווה' });
  }

  // Usage steps
  const usageSteps: string[] = [];
  if (allText.includes('טפטפ') || allText.includes('drip') || allText.includes('כף יד') || allText.includes('hand')) usageSteps.push('טפטפו על כף היד');
  else usageSteps.push('מדדו כמות מתאימה');
  if (allText.includes('עיסוי') || allText.includes('massage') || allText.includes('שפשפ')) usageSteps.push('עסו לעומק הפרווה');
  else usageSteps.push('מרחו על הפרווה');
  if (allText.includes('סרק') || allText.includes('comb') || allText.includes('brush') || allText.includes('מברשת')) usageSteps.push('סרקו בעדינות');
  else usageSteps.push('פזרו בעזרת המברשת');
  if (allText.includes('אין צורך לשטוף') || allText.includes('no rinse') || allText.includes('leave-in') || allText.includes('ללא שטיפה'))
    usageSteps.push('אין צורך לשטוף!');
  else if (allText.includes('שטפ') || allText.includes('rinse'))
    usageSteps.push('שטפו היטב');
  else usageSteps.push('יבשו באוויר');

  // Feature badges
  const featureBadges: string[] = [];
  if (allText.includes('אנטי-סטטי') || allText.includes('anti-static') || allText.includes('anti static') || allText.includes('סטטי'))
    featureBadges.push('אנטי-סטטי ⚡');
  if (allText.includes('שומני') || allText.includes('greasy') || allText.includes('non-greasy') || allText.includes('ללא שומן'))
    featureBadges.push('ללא תחושה שומנית 🧴');
  if (allText.includes('דוחה ריחות') || allText.includes('odor repel') || allText.includes('ריח'))
    featureBadges.push('דוחה ריחות 🌸');
  if (allText.includes('היפואלרגני') || allText.includes('hypoallergenic'))
    featureBadges.push('היפואלרגני 🛡️');
  if (allText.includes('טבעי') || allText.includes('natural'))
    featureBadges.push('מרכיבים טבעיים 🌿');
  if (allText.includes('ph') || allText.includes('מאוזן'))
    featureBadges.push('pH מאוזן ⚖️');

  // Target coat type
  let targetCoatType: string | null = null;
  if (allText.includes('ארוך') || allText.includes('long')) targetCoatType = 'פרוות בינונית עד ארוכה';
  else if (allText.includes('קצר') || allText.includes('short')) targetCoatType = 'פרוות קצרה';
  else if (allText.includes('בינונ') || allText.includes('medium')) targetCoatType = 'פרוות בינונית עד ארוכה';
  else if (allText.includes('כל סוג') || allText.includes('all coat') || allText.includes('all type')) targetCoatType = 'כל סוגי הפרווה';
  else if (allText.includes('silk') || allText.includes('משי') || allText.includes('oil') || allText.includes('שמן')) targetCoatType = 'פרוות בינונית עד ארוכה';

  return { visibleResults, activeIngredients, usageSteps, featureBadges, targetCoatType };
};

/** Check if product is an advanced hygiene / PH balance product */
const isHygieneProduct = (product: any): boolean => {
  const text = `${product.name || ''} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
  return (text.includes('baking soda') || text.includes('סודה לשתייה') || text.includes('סודה')) ||
    (text.includes('arm & hammer') || text.includes('arm and hammer')) ||
    ((text.includes('shampoo') || text.includes('שמפו')) && (text.includes('ph') || text.includes('paraben') || text.includes('פרבן') || text.includes('sulfate') || text.includes('סולפט')));
};

/** Extract advanced hygiene / PH balance features */
const extractHygieneFeatures = (product: any): {
  showScienceCorner: boolean;
  coreTechnology: { label: string; description: string } | null;
  isTreatmentSafe: boolean;
  formulaAttributes: string[];
  scentProfile: string | null;
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText;

  // Science corner trigger
  const showScienceCorner = allText.includes('ph') || allText.includes('baking soda') || allText.includes('סודה') ||
    allText.includes('arm & hammer') || allText.includes('arm and hammer');

  // Core technology
  let coreTechnology: { label: string; description: string } | null = null;
  if (allText.includes('baking soda') || allText.includes('סודה לשתייה') || allText.includes('סודה'))
    coreTechnology = { label: 'סודה לשתייה (Baking Soda)', description: 'ניקוי עמוק ונטרול ריחות באופן טבעי – ללא חומרים כימיים אגרסיביים' };
  else if (allText.includes('chlorhexidine') || allText.includes('כלורהקסידין'))
    coreTechnology = { label: 'כלורהקסידין', description: 'חיטוי אנטי-בקטריאלי לעור רגיש ולמניעת זיהומים' };

  // Treatment safe
  const isTreatmentSafe = allText.includes('treatment') || allText.includes('טיפול') || allText.includes('flea') || allText.includes('tick') ||
    allText.includes('פרעושים') || allText.includes('קרציות') || allText.includes('won\'t strip') || allText.includes('spot-on') ||
    allText.includes('safe') || allText.includes('arm & hammer') || allText.includes('arm and hammer');

  // Formula attributes
  const formulaAttributes: string[] = [];
  if (allText.includes('paraben') || allText.includes('פרבן')) formulaAttributes.push('ללא פרבנים');
  if (allText.includes('sulfate') || allText.includes('סולפט') || allText.includes('sls')) formulaAttributes.push('ללא סולפטים');
  if (allText.includes('fast') || allText.includes('מהיר') || allText.includes('quick')) formulaAttributes.push('נוסחה מהירה');
  if (allText.includes('dye') || allText.includes('צבע מלאכותי') || allText.includes('ללא צבע')) formulaAttributes.push('ללא צבעי מאכל');
  if (allText.includes('tear') || allText.includes('עיניים') || allText.includes('gentle')) formulaAttributes.push('עדין לעיניים');
  if (allText.includes('moisturiz') || allText.includes('לחות')) formulaAttributes.push('מלחלח');

  // Scent profile
  let scentProfile: string | null = attrs.scent || attrs['ריח'] || attrs.fragrance || null;
  if (!scentProfile) {
    const scents: string[] = [];
    if (allText.includes('kiwi') || allText.includes('קיווי')) scents.push('פריחת קיווי');
    if (allText.includes('cucumber') || allText.includes('מלפפון')) scents.push('מלפפון');
    if (allText.includes('mint') || allText.includes('מנטה')) scents.push('מנטה');
    if (allText.includes('lavender') || allText.includes('לבנדר')) scents.push('לבנדר');
    if (allText.includes('oatmeal') || allText.includes('שיבולת שועל')) scents.push('שיבולת שועל');
    if (allText.includes('coconut') || allText.includes('קוקוס')) scents.push('קוקוס');
    if (allText.includes('vanilla') || allText.includes('וניל')) scents.push('וניל');
    if (scents.length > 0) scentProfile = scents.join(' + ');
  }

  return { showScienceCorner, coreTechnology, isTreatmentSafe, formulaAttributes, scentProfile };
};

/** Extract enrichment product features */
const extractEnrichmentFeatures = (product: any): {
  anxietyUses: { icon: React.ReactNode; label: string }[];
  materialSpecs: { label: string; value: string }[];
  healthNote: string | null;
  recipes: string[];
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText;

  // Anxiety uses
  const anxietyUses: { icon: React.ReactNode; label: string }[] = [];
  if (allText.includes('וטרינר') || allText.includes('vet') || allText.includes('טיפוח') || allText.includes('grooming'))
    anxietyUses.push({ icon: <Stethoscope className="w-5 h-5" />, label: 'ביקורי וטרינר וטיפוח' });
  if (allText.includes('זיקוק') || allText.includes('firework') || allText.includes('סופ') || allText.includes('storm') || allText.includes('רעם') || allText.includes('thunder'))
    anxietyUses.push({ icon: <CloudLightning className="w-5 h-5" />, label: 'זיקוקים וסופות רעמים' });
  if (allText.includes('שעמום') || allText.includes('boredom') || allText.includes('העסקה') || allText.includes('enrichment') || allText.includes('העשרה'))
    anxietyUses.push({ icon: <Zap className="w-5 h-5" />, label: 'הפגת שעמום' });
  if (allText.includes('הפרדה') || allText.includes('separation') || allText.includes('לבד'))
    anxietyUses.push({ icon: <Heart className="w-5 h-5" />, label: 'חרדת נטישה' });
  // Fallback: if it's enrichment, at least show boredom
  if (anxietyUses.length === 0)
    anxietyUses.push({ icon: <Zap className="w-5 h-5" />, label: 'הפגת שעמום' });

  // Material & safety specs
  const materialSpecs: { label: string; value: string }[] = [];
  const material = attrs.material || attrs['חומר'] || null;
  if (material) materialSpecs.push({ label: 'חומר', value: String(material) });
  else if (allText.includes('tpr')) materialSpecs.push({ label: 'חומר', value: 'TPR לא רעיל (Food Grade)' });
  else if (allText.includes('silicone') || allText.includes('סיליקון')) materialSpecs.push({ label: 'חומר', value: 'סיליקון Food Grade' });

  const features: string[] = [];
  if (allText.includes('מקפיא') || allText.includes('freezer') || allText.includes('freeze')) features.push('בטוח למקפיא ❄️');
  if (allText.includes('מיקרוגל') || allText.includes('microwave')) features.push('בטוח למיקרוגל');
  if (allText.includes('מדיח') || allText.includes('dishwasher')) features.push('בטוח למדיח כלים');
  if (features.length > 0) materialSpecs.push({ label: 'תכונות', value: features.join(' • ') });

  const dims = attrs.dimensions || attrs['מידות'] || attrs.size || attrs['מידה'] || null;
  if (dims) materialSpecs.push({ label: 'מידות', value: String(dims) });

  // Health note (dental + digestion from licking)
  let healthNote: string | null = null;
  if (allText.includes('ליקוק') || allText.includes('lick') || allText.includes('ריר') || allText.includes('saliva') || allText.includes('חניכיים') || allText.includes('gum') || allText.includes('עיכול') || allText.includes('digest')) {
    healthNote = 'פעולת הליקוק מייצרת ריר שמגן על החניכיים ומסייע בעיכול – שילוב של היגיינת פה ובריאות מערכת העיכול';
  }

  // Recipes / topper ideas
  const recipes: string[] = [];
  if (allText.includes('יוגורט') || allText.includes('yogurt')) recipes.push('🥛 יוגורט טבעי');
  if (allText.includes('חמאת בוטנים') || allText.includes('peanut butter')) recipes.push('🥜 חמאת בוטנים');
  if (allText.includes('מזון רטוב') || allText.includes('wet food') || allText.includes('שימורים')) recipes.push('🥫 מזון רטוב');
  if (allText.includes('תוסף') || allText.includes('supplement') || allText.includes('ויטמין')) recipes.push('💊 תוספי תזונה');
  if (allText.includes('בננה') || allText.includes('banana')) recipes.push('🍌 בננה מרוסקת');
  if (allText.includes('דלעת') || allText.includes('pumpkin')) recipes.push('🎃 פירה דלעת');
  // Defaults if nothing specific found
  if (recipes.length === 0) {
    recipes.push('🥛 יוגורט טבעי', '🥜 חמאת בוטנים', '🥫 מזון רטוב', '💊 תוספי תזונה');
  }

  return { anxietyUses, materialSpecs, healthNote, recipes };
};

/** Check if product is a puppy food product */
const isPuppyProduct = (product: any): boolean => {
  const text = `${product.name || ''} ${product.description || ''} ${product.brand || ''} ${product.life_stage || ''}`.toLowerCase();
  return text.includes('puppy') || text.includes('גור') || text.includes('גורים') ||
    text.includes('growth') || text.includes('junior') || text.includes('starter') ||
    (product.life_stage || '').toLowerCase() === 'puppy';
};

/** Extract puppy food features */
const extractPuppyFeatures = (product: any): {
  hasDHA: boolean;
  hasAntioxidants: boolean;
  topIngredient: string | null;
  grainStatus: { hasBarleyOatmeal: boolean; noCornWheatSoy: boolean };
  hasSatisfactionGuarantee: boolean;
  developmentBenefits: { icon: React.ReactNode; label: string; description: string }[];
  puppyFeedingMatrix: { ageRange: string; rows: { weight: string; amount: string }[] }[];
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText;

  // DHA & ARA
  const hasDHA = allText.includes('dha') || allText.includes('ara') || allText.includes('omega') || allText.includes('אומגה');

  // Antioxidant LifeSource Bits
  const hasAntioxidants = allText.includes('antioxidant') || allText.includes('lifesource') || allText.includes('נוגדי חמצון') || allText.includes('חיסון') || allText.includes('immune');

  // Top ingredient
  let topIngredient: string | null = null;
  if (allText.includes('deboned chicken') || allText.includes('עוף ללא עצמות') || allText.includes('עוף טרי')) topIngredient = 'עוף ללא עצמות (Deboned Chicken)';
  else if (allText.includes('deboned lamb') || allText.includes('כבש')) topIngredient = 'כבש ללא עצמות';
  else if (allText.includes('deboned fish') || allText.includes('דג')) topIngredient = 'דג ללא עצמות';
  else if (allText.includes('chicken') || allText.includes('עוף')) topIngredient = 'עוף (Chicken)';

  // Grain status
  const hasBarleyOatmeal = allText.includes('barley') || allText.includes('שעורה') || allText.includes('oatmeal') || allText.includes('שיבולת שועל');
  const noCornWheatSoy = (allText.includes('no corn') || allText.includes('ללא תירס') || allText.includes('corn free')) ||
    (allText.includes('no wheat') || allText.includes('ללא חיטה')) ||
    (allText.includes('no soy') || allText.includes('ללא סויה'));

  // Satisfaction guarantee
  const hasSatisfactionGuarantee = allText.includes('satisfaction') || allText.includes('guarantee') || allText.includes('100%') || allText.includes('אחריות') || allText.includes('שביעות רצון');

  // Development benefits
  const developmentBenefits: { icon: React.ReactNode; label: string; description: string }[] = [];
  if (hasDHA) developmentBenefits.push({ icon: <Eye className="w-5 h-5" />, label: 'DHA & ARA', description: 'לפיתוח המוח והראייה – קוגניציה וראייה' });
  if (hasAntioxidants) developmentBenefits.push({ icon: <ShieldCheck className="w-5 h-5" />, label: 'נוגדי חמצון', description: 'תמיכה במערכת החיסון לגורים בשלב הצמיחה' });
  if (allText.includes('calcium') || allText.includes('סידן') || allText.includes('bone') || allText.includes('עצמות'))
    developmentBenefits.push({ icon: <Bone className="w-5 h-5" />, label: 'סידן וזרחן', description: 'לפיתוח שלד ושיניים חזקים' });
  if (allText.includes('protein') || allText.includes('חלבון'))
    developmentBenefits.push({ icon: <Beef className="w-5 h-5" />, label: 'חלבון איכותי', description: 'לבניית שרירים ורקמות בשלב הצמיחה' });
  if (developmentBenefits.length === 0) {
    developmentBenefits.push({ icon: <Baby className="w-5 h-5" />, label: 'תמיכה בצמיחה', description: 'נוסחה מותאמת לצרכי הגור בשלבי ההתפתחות' });
  }

  // Puppy feeding matrix – parse feeding_guide into age-grouped structure
  const feedingGuide = Array.isArray(product.feeding_guide) ? product.feeding_guide : [];
  const puppyFeedingMatrix: { ageRange: string; rows: { weight: string; amount: string }[] }[] = [];
  
  // Try to group by age ranges found in feeding guide
  const ageGroups: Map<string, { weight: string; amount: string }[]> = new Map();
  for (const row of feedingGuide) {
    const rangeText = row.range || '';
    const ageMatch = rangeText.match(/(\d+[-–]\d+)\s*(?:mos|months|חודשים|חוד)/i);
    const ageKey = ageMatch ? ageMatch[1].replace('–', '-') + ' חודשים' : 'כללי';
    if (!ageGroups.has(ageKey)) ageGroups.set(ageKey, []);
    ageGroups.get(ageKey)!.push({ weight: rangeText.replace(/\d+[-–]\d+\s*(?:mos|months|חודשים|חוד)[^,]*/i, '').trim() || rangeText, amount: row.amount || '' });
  }
  for (const [ageRange, rows] of ageGroups) {
    puppyFeedingMatrix.push({ ageRange, rows });
  }

  return { hasDHA, hasAntioxidants, topIngredient, grainStatus: { hasBarleyOatmeal, noCornWheatSoy }, hasSatisfactionGuarantee, developmentBenefits, puppyFeedingMatrix };
};

/** Check if product is a crate/kennel/training system */
const isCrateProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  return cat === 'crates' || cat === 'kennels' || cat === 'training' ||
    text.includes('crate') || text.includes('kennel') || text.includes('כלוב') ||
    text.includes('כלוב הפלדה') || text.includes('cage') || text.includes('training crate') ||
    text.includes('מלונה') || text.includes('divider') || text.includes('מחיצה');
};

/** Extract crate/kennel features */
const extractCrateFeatures = (product: any): {
  safetyBadges: { icon: React.ReactNode; label: string; description: string }[];
  fitGuide: { maxWeight: string | null; crateSize: string | null; includesDivider: boolean };
  lifestyleIcons: { icon: React.ReactNode; label: string; description: string }[];
  prosFromReviews: string[];
  bedRecommendation: string | null;
} => {
  const text = `${product.name || ''} ${product.description || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText;

  // Safety badges
  const safetyBadges: { icon: React.ReactNode; label: string; description: string }[] = [];
  if (allText.includes('steel') || allText.includes('פלדה') || allText.includes('metal') || allText.includes('מתכת') || allText.includes('heavy'))
    safetyBadges.push({ icon: <Shield className="w-5 h-5" />, label: 'שלדת פלדה עמידה', description: 'Heavy-Duty Steel – מתכת מחוזקת לעמידות מקסימלית' });
  if (allText.includes('double door') || allText.includes('dual door') || allText.includes('דלת כפולה') || allText.includes('two door') || allText.includes('2 door') || allText.includes('גישה כפולה') || allText.includes('front and side') || allText.includes('קדמית וצדית'))
    safetyBadges.push({ icon: <DoorOpen className="w-5 h-5" />, label: 'גישה כפולה', description: 'דלת קדמית + צדית – גישה נוחה מכל כיוון' });
  if (allText.includes('latch') || allText.includes('נעילה') || allText.includes('lock') || allText.includes('sliding') || allText.includes('בריח') || allText.includes('secure') || allText.includes('escape'))
    safetyBadges.push({ icon: <Lock className="w-5 h-5" />, label: 'נעילה כפולה', description: 'מנגנון נעילה כפול (Dual-Sliding Latches) למניעת בריחה' });
  if (safetyBadges.length === 0) {
    safetyBadges.push({ icon: <Shield className="w-5 h-5" />, label: 'מבנה עמיד', description: 'בנוי לעמידות ולשימוש יומיומי בטוח' });
  }

  // Fit guide
  let maxWeight = attrs.max_weight || attrs['משקל מקסימלי'] || null;
  if (!maxWeight) {
    const wMatch = allText.match(/(?:up to|עד|max)\s*(\d+)\s*(?:lbs?|pounds?|ליברות)/i);
    const kgMatch = allText.match(/(?:up to|עד|max)\s*(\d+)\s*(?:ק[״"]?ג|kg)/i);
    if (wMatch) { const lbs = parseInt(wMatch[1]); maxWeight = `${lbs} lbs (כ-${Math.round(lbs * 0.453)} ק"ג)`; }
    else if (kgMatch) maxWeight = `עד ${kgMatch[1]} ק"ג`;
  }
  let crateSize = attrs.crate_size || attrs['גודל כלוב'] || attrs.dimensions || null;
  if (!crateSize) {
    const sizeMatch = allText.match(/(\d{2,3})\s*(?:inch|אינץ|"|״)/i);
    if (sizeMatch) { const inches = parseInt(sizeMatch[1]); crateSize = `${inches}" (כ-${Math.round(inches * 2.54)} ס"מ)`; }
  }
  const includesDivider = allText.includes('divider') || allText.includes('מחיצה') || allText.includes('partition') || allText.includes('panel');

  // Lifestyle icons
  const lifestyleIcons: { icon: React.ReactNode; label: string; description: string }[] = [];
  if (allText.includes('fold') || allText.includes('מתקפל') || allText.includes('collapse') || allText.includes('flat') || allText.includes('portable'))
    lifestyleIcons.push({ icon: <FoldVertical className="w-5 h-5" />, label: 'מתקפל שטוח', description: 'מתקפל שטוח לאחסון וניוד קל' });
  if (allText.includes('tray') || allText.includes('מגש') || allText.includes('pan') || allText.includes('removable'))
    lifestyleIcons.push({ icon: <Trash2 className="w-5 h-5" />, label: 'מגש נשלף', description: 'מגש נשלף לניקוי קל של תאונות' });
  if (allText.includes('house training') || allText.includes('אילוף') || allText.includes('potty') || allText.includes('housebreak') || allText.includes('training'))
    lifestyleIcons.push({ icon: <PawPrint className="w-5 h-5" />, label: 'אילוף לצרכים', description: 'אידיאלי לאילוף לצרכים בבית – מרחב מבוקר' });
  if (lifestyleIcons.length === 0) {
    lifestyleIcons.push({ icon: <FoldVertical className="w-5 h-5" />, label: 'מתקפל שטוח', description: 'מתקפל שטוח לאחסון וניוד קל' });
  }

  // Pros from reviews/benefits
  const prosFromReviews: string[] = [];
  const prosKeywords: Record<string, string> = {
    'easy': 'הרכבה קלה ומהירה', 'קל': 'הרכבה קלה ומהירה',
    'spacious': 'מרווח ונוח', 'מרווח': 'מרווח ונוח',
    'quality': 'איכות גבוהה', 'איכות': 'איכות גבוהה',
    'sturdy': 'יציב ועמיד', 'יציב': 'יציב ועמיד',
    'value': 'תמורה מצוינת למחיר', 'מחיר': 'תמורה מצוינת למחיר',
  };
  for (const [kw, label] of Object.entries(prosKeywords)) {
    if (allText.includes(kw) && !prosFromReviews.includes(label)) prosFromReviews.push(label);
  }
  if (prosFromReviews.length === 0) { prosFromReviews.push('הרכבה קלה ומהירה', 'מרווח ונוח', 'איכות גבוהה'); }

  // Bed recommendation
  let bedRecommendation: string | null = null;
  if (crateSize) {
    const sizeNum = parseInt(crateSize) || 36;
    bedRecommendation = `מומלץ להוסיף מיטה רכה (Fluffy Bed) בגודל ${sizeNum}" ליצירת "מאורה" מושלמת ונוחה 🐾`;
  } else {
    bedRecommendation = 'מומלץ להוסיף מיטה רכה שתתאים למידות הכלוב ליצירת סביבה מפנקת ובטוחה 🐾';
  }

  return { safetyBadges, fitGuide: { maxWeight, crateSize, includesDivider }, lifestyleIcons, prosFromReviews, bedRecommendation };
};

/** Check if product is a deshedding/maintenance tool */
const isDesheddingProduct = (product: any): boolean => {
  const text = `${product.name || ''} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
  return text.includes('deshedding') || text.includes('furminator') || text.includes('דישדינג') ||
    text.includes('הפחתת נשירה') || text.includes('shedding') || text.includes('comb') || text.includes('מסרק') ||
    text.includes('undercoat') || text.includes('תת-שכבה') || text.includes('rake') || text.includes('stripper') ||
    (product.category || '').toLowerCase() === 'deshedding' || (product.category || '').toLowerCase() === 'tools';
};

/** Extract deshedding/maintenance tool features */
const extractDesheddingFeatures = (product: any): {
  efficiencyPct: number | null;
  techFeatures: { icon: React.ReactNode; label: string; description: string }[];
  sizeGuide: { weightRange: string | null; coatType: string | null };
  proTip: string | null;
  homeHygiene: boolean;
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText;

  // Efficiency %
  let efficiencyPct: number | null = null;
  const effMatch = allText.match(/(\d{1,3})\s*%\s*(?:less|reduction|הפחת|נשירה|shedding)/i)
    || allText.match(/(?:reduces?|מפחית|הפחתה)\s*(?:up to|עד)?\s*(\d{1,3})\s*%/i);
  if (effMatch) efficiencyPct = parseInt(effMatch[1]) || parseInt(effMatch[2]) || null;
  if (!efficiencyPct && (allText.includes('furminator') || allText.includes('deshedding'))) efficiencyPct = 90;

  // Technical safety features
  const techFeatures: { icon: React.ReactNode; label: string; description: string }[] = [];
  if (allText.includes('furejector') || allText.includes('release') || allText.includes('ניקוי מהיר') || allText.includes('לחיצ') || allText.includes('eject'))
    techFeatures.push({ icon: <CircleDot className="w-5 h-5" />, label: 'FURejector Button', description: 'ניקוי מהיר בלחיצה אחת – שחרור השיער שנאסף' });
  if (allText.includes('skin guard') || allText.includes('הגנ') || allText.includes('עור') || allText.includes('skin') || allText.includes('protect'))
    techFeatures.push({ icon: <Shield className="w-5 h-5" />, label: 'Skin Guard', description: 'הגנה על עור הכלב – קצוות מוגנים למניעת שריטות' });
  if (allText.includes('curved') || allText.includes('ארגונומ') || allText.includes('ergonomic') || allText.includes('עקום') || allText.includes('contour'))
    techFeatures.push({ icon: <ArrowDownToLine className="w-5 h-5" />, label: 'Curved Edge', description: 'קצה עקום – מתאים לקווי גוף הכלב בצורה ארגונומית' });
  if (techFeatures.length === 0) {
    techFeatures.push({ icon: <Shield className="w-5 h-5" />, label: 'בטיחות מקסימלית', description: 'תכנון ארגונומי להגנה על העור' });
  }

  // Size guide
  let weightRange = attrs.weight_range || attrs['טווח משקל'] || null;
  if (!weightRange) {
    const wMatch = allText.match(/(\d{1,3})\s*[-–]\s*(\d{1,3})\s*(?:ק[״"]?ג|kg)/i);
    if (wMatch) weightRange = `${wMatch[1]}-${wMatch[2]} ק"ג`;
    else if (allText.includes('large') || allText.includes('גדול')) weightRange = '23-41 ק"ג (גזעים גדולים)';
    else if (allText.includes('medium') || allText.includes('בינוני')) weightRange = '9-23 ק"ג (גזעים בינוניים)';
    else if (allText.includes('small') || allText.includes('קטן')) weightRange = 'עד 9 ק"ג (גזעים קטנים)';
  }
  let coatType = attrs.coat_type || attrs['סוג פרווה'] || null;
  if (!coatType) {
    if (allText.includes('long') || allText.includes('ארוך') || allText.includes('5 cm') || allText.includes('5 ס')) coatType = 'פרווה ארוכה (מעל 5 ס"מ)';
    else if (allText.includes('short') || allText.includes('קצר')) coatType = 'פרווה קצרה (עד 5 ס"מ)';
  }

  // Pro tip
  let proTip = attrs.pro_tip || attrs.usage_tip || null;
  if (!proTip) {
    if (allText.includes('1-2') || allText.includes('פעמיים') || allText.includes('10-20') || allText.includes('יבשה'))
      proTip = 'השתמשו 1-2 פעמים בשבוע, 10-20 דקות, על פרווה יבשה בלבד';
    else if (allText.includes('dry') || allText.includes('יבש'))
      proTip = 'השתמשו על פרווה יבשה בלבד לתוצאות מיטביות';
    else
      proTip = 'השתמשו 1-2 פעמים בשבוע על פרווה יבשה בלבד';
  }

  // Home hygiene connection
  const homeHygiene = allText.includes('furniture') || allText.includes('carpet') || allText.includes('רהיט') || allText.includes('שטיח') ||
    allText.includes('home') || allText.includes('בית') || allText.includes('ניקיון') || allText.includes('clean') ||
    allText.includes('shedding') || allText.includes('נשירה') || allText.includes('furminator') || allText.includes('deshedding');

  return { efficiencyPct, techFeatures, sizeGuide: { weightRange, coatType }, proTip, homeHygiene };
};

/** Check if product is a medical-grade protection product (flea & tick collars, spot-on) */
const isMedicalProtectionProduct = (product: any): boolean => {
  const text = `${product.name || ''} ${product.description || ''} ${product.brand || ''} ${product.category || ''}`.toLowerCase();
  return text.includes('seresto') || text.includes('סרסטו') ||
    (text.includes('flea') && text.includes('tick')) || (text.includes('פרעושים') && text.includes('קרציות')) ||
    text.includes('imidacloprid') || text.includes('flumethrin') || text.includes('אימידאקלופריד') ||
    text.includes('flea & tick') || text.includes('flea and tick') ||
    (product.category || '').toLowerCase() === 'flea-tick' || (product.category || '').toLowerCase() === 'medical-protection';
};

/** Extract medical-grade protection features */
const extractMedicalProtectionFeatures = (product: any): {
  protectionDuration: string | null;
  safetyAlerts: { icon: React.ReactNode; label: string; description: string }[];
  activeIngredients: { name: string; target: string }[];
  featureIcons: { icon: React.ReactNode; label: string; labelHe: string }[];
  applicationSteps: string[];
  brandAuthority: string | null;
} => {
  const text = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText;

  // Protection duration
  let protectionDuration: string | null = null;
  const durMatch = allText.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:months?|חודשים|חוד)/i)
    || allText.match(/(?:up to|עד)\s*(\d+)\s*(?:months?|חודשים)/i);
  if (durMatch) {
    protectionDuration = durMatch[2] ? `${durMatch[1]}-${durMatch[2]} חודשים` : `עד ${durMatch[1]} חודשים`;
  }
  if (!protectionDuration && (allText.includes('seresto') || allText.includes('סרסטו'))) protectionDuration = '7-8 חודשים';

  // Safety alerts
  const safetyAlerts: { icon: React.ReactNode; label: string; description: string }[] = [];
  if (allText.includes('not for cats') || allText.includes('לא לחתולים') || allText.includes('לא מתאים לחתולים') || allText.includes('dogs only') || allText.includes('לכלבים בלבד'))
    safetyAlerts.push({ icon: <AlertTriangle className="w-5 h-5" />, label: 'לא מתאים לחתולים', description: 'מוצר זה מיועד לכלבים בלבד – סכנת הרעלה לחתולים!' });
  else
    safetyAlerts.push({ icon: <AlertTriangle className="w-5 h-5" />, label: 'בדיקת מין', description: 'וודאו שהמוצר מתאים למין חיית המחמד שלכם' });

  const ageMatch = allText.match(/(?:from|מגיל|מ[-–]?)\s*(\d+)\s*(?:weeks?|שבועות)/i);
  const minAge = ageMatch ? `מגיל ${ageMatch[1]} שבועות ומעלה` : (allText.includes('seresto') ? 'מגיל 7 שבועות ומעלה' : null);
  if (minAge)
    safetyAlerts.push({ icon: <Baby className="w-5 h-5" />, label: minAge, description: 'אין להשתמש בגורים צעירים מדי' });

  if (allText.includes('wash hands') || allText.includes('לשטוף ידיים') || allText.includes('שטיפת ידיים') || allText.includes('after handling') || allText.includes('לאחר המגע'))
    safetyAlerts.push({ icon: <Hand className="w-5 h-5" />, label: 'לשטוף ידיים לאחר המגע', description: 'מוצר מכיל חומרים פעילים – שטפו ידיים אחרי הענקה' });
  else
    safetyAlerts.push({ icon: <Hand className="w-5 h-5" />, label: 'לשטוף ידיים לאחר המגע', description: 'מומלץ לשטוף ידיים לאחר מגע עם המוצר' });

  // Active ingredients
  const activeIngredients: { name: string; target: string }[] = [];
  if (allText.includes('imidacloprid') || allText.includes('אימידאקלופריד'))
    activeIngredients.push({ name: 'Imidacloprid (אימידאקלופריד)', target: 'נגד פרעושים (Fleas)' });
  if (allText.includes('flumethrin') || allText.includes('פלומת׳רין') || allText.includes('flumethrin'))
    activeIngredients.push({ name: 'Flumethrin (פלומת׳רין)', target: 'נגד קרציות (Ticks)' });
  if (activeIngredients.length === 0 && (allText.includes('flea') || allText.includes('פרעוש')))
    activeIngredients.push({ name: 'חומר פעיל נגד פרעושים', target: 'הגנה מפרעושים' });
  if (activeIngredients.length <= 1 && (allText.includes('tick') || allText.includes('קרצי')))
    activeIngredients.push({ name: 'חומר פעיל נגד קרציות', target: 'הגנה מקרציות' });

  // Feature icons
  const featureIcons: { icon: React.ReactNode; label: string; labelHe: string }[] = [];
  if (allText.includes('water') || allText.includes('מים') || allText.includes('waterproof') || allText.includes('water resistant') || allText.includes('עמיד במים') || allText.includes('רחצה') || allText.includes('bath') || allText.includes('rain') || allText.includes('גשם'))
    featureIcons.push({ icon: <Droplets className="w-5 h-5" />, label: 'Water Resistant', labelHe: 'עמיד במים – רחצה וגשם' });
  if (allText.includes('odorless') || allText.includes('ללא ריח') || allText.includes('no odor') || allText.includes('ריח') || allText.includes('non-smell'))
    featureIcons.push({ icon: <Wind className="w-5 h-5" />, label: 'Odorless', labelHe: 'ללא ריח' });
  if (allText.includes('non-greasy') || allText.includes('אינו שומני') || allText.includes('לא שומני') || allText.includes('greasy') || allText.includes('שומני'))
    featureIcons.push({ icon: <Droplet className="w-5 h-5" />, label: 'Non-Greasy', labelHe: 'אינו שומני' });
  if (featureIcons.length === 0) {
    featureIcons.push({ icon: <Droplets className="w-5 h-5" />, label: 'Water Resistant', labelHe: 'עמיד במים' });
    featureIcons.push({ icon: <Wind className="w-5 h-5" />, label: 'Odorless', labelHe: 'ללא ריח' });
    featureIcons.push({ icon: <Droplet className="w-5 h-5" />, label: 'Non-Greasy', labelHe: 'אינו שומני' });
  }

  // Application steps
  const applicationSteps = [
    'הוציאו את הקולר מהאריזה',
    'התאימו לצוואר – כלל שתי אצבעות (Two-Finger Rule)',
    'חתכו את העודף והשליכו בצורה בטוחה'
  ];

  // Brand authority
  let brandAuthority: string | null = null;
  if (allText.includes('bayer') || allText.includes('באייר')) brandAuthority = 'Bayer – מותג וטרינרי מוביל עולמי';
  else if (allText.includes('elanco') || allText.includes('אלנקו')) brandAuthority = 'Elanco – מותג וטרינרי מוביל';
  else if (product.brand) brandAuthority = product.brand;

  return { protectionDuration, safetyAlerts, activeIngredients, featureIcons, applicationSteps, brandAuthority };
};

/** Check if product is a puzzle / enrichment stuffing toy (e.g. KONG) */
const isPuzzleEnrichmentProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
  return cat === 'enrichment' || cat === 'puzzle' ||
    text.includes('kong') || text.includes('קונג') || text.includes('stuffing') || text.includes('מילוי') ||
    text.includes('puzzle toy') || text.includes('צעצוע חשיבה') || text.includes('enrichment') || text.includes('העשרה') ||
    (text.includes('rubber') && (text.includes('chew') || text.includes('לעיסה'))) ||
    text.includes('lick mat') || text.includes('slow feeder');
};

/** Extract puzzle / enrichment stuffing features */
const extractPuzzleEnrichmentFeatures = (product: any): {
  isStuffable: boolean;
  mentalStimulation: string;
  recipe: { base: string; binder: string; topper: string } | null;
  materialSpec: string | null;
  hasErraticBounce: boolean;
  chewResistance: string | null;
  expertApproval: boolean;
  crossSellKeywords: string[];
} => {
  const text = `${product.name || ''} ${product.description || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText + ' ' + JSON.stringify(attrs).toLowerCase();

  const isStuffable = allText.includes('stuff') || allText.includes('מילוי') || allText.includes('kong') || allText.includes('fill') || allText.includes('treat') || allText.includes('חטיף');

  const mentalStimulation = allText.includes('mental') || allText.includes('מנטלי') || allText.includes('boredom') || allText.includes('שעמום') || allText.includes('enrichment') || allText.includes('העשרה') || allText.includes('instinct') || allText.includes('אינסטינקט')
    ? 'גירוי מנטלי והפגת שעמום – מספק את הצורך האינסטינקטיבי של הכלב לחפש, ללעוס ולפתור'
    : 'מעסיק את הכלב ומפחית שעמום והתנהגויות הרסניות';

  // Recipe card - default KONG recipe
  const isKong = allText.includes('kong') || allText.includes('קונג');
  const recipe = isStuffable ? {
    base: 'מזון יבש (Kibble)',
    binder: 'חמאת בוטנים (ללא קסיליטול!)',
    topper: isKong ? 'KONG Easy Treat / KONG Snacks' : 'חטיפים או ממרח ייעודי',
  } : null;

  // Material
  let materialSpec: string | null = null;
  if (allText.includes('natural rubber') || allText.includes('גומי טבעי')) materialSpec = '100% גומי טבעי אדום – עמיד במיוחד';
  else if (allText.includes('rubber') || allText.includes('גומי')) materialSpec = 'גומי עמיד באיכות גבוהה';
  else if (allText.includes('tpr') || allText.includes('silicone') || allText.includes('סיליקון')) materialSpec = 'חומר TPR / סיליקון בטוח למזון';

  const hasErraticBounce = allText.includes('erratic') || allText.includes('unpredictable') || allText.includes('לא צפוי') || allText.includes('bounce') || allText.includes('קפיצ');

  // Chew resistance
  let chewResistance: string | null = null;
  if (allText.includes('power chew') || allText.includes('extreme') || allText.includes('aggressive') || allText.includes('לעיסה חזקה'))
    chewResistance = 'Power Chewer – לועסים חזקים';
  else if (allText.includes('average chew') || allText.includes('moderate') || allText.includes('לעיסה בינונית'))
    chewResistance = 'Average Chewer – לעיסה בינונית';
  else if (isKong || allText.includes('durable') || allText.includes('עמיד'))
    chewResistance = 'עמיד ללעיסה ממושכת';

  const expertApproval = allText.includes('veterinar') || allText.includes('וטרינר') || allText.includes('trainer') || allText.includes('מאלף') || allText.includes('recommend') || allText.includes('מומלץ');

  // Cross-sell keywords
  const crossSellKeywords: string[] = [];
  if (isStuffable) {
    crossSellKeywords.push('חמאת בוטנים');
    if (isKong) crossSellKeywords.push('KONG Snacks', 'KONG Easy Treat');
    else crossSellKeywords.push('חטיפים');
  }

  return { isStuffable, mentalStimulation, recipe, materialSpec, hasErraticBounce, chewResistance, expertApproval, crossSellKeywords };
};

/** Check if product is a potty training / hygiene pad / attractant spray product */
const isPottyTrainingProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
  return cat === 'potty-training' || cat === 'training-pads' || cat === 'hygiene-pads' || cat === 'attractant-spray' ||
    text.includes('training pad') || text.includes('puppy pad') || text.includes('pee pad') ||
    text.includes('פד אילוף') || text.includes('פדים') || text.includes('רפידות') || text.includes('רפידה') ||
    text.includes('potty') || text.includes('wee-wee') || text.includes('absorbent pad') ||
    text.includes('attractant spray') || text.includes('potty spray') || text.includes('ספריי אילוף') ||
    text.includes('housebreaking') || text.includes('house training spray') ||
    (text.includes('spray') && (text.includes('potty') || text.includes('training') || text.includes('attractant'))) ||
    (text.includes('pad') && (text.includes('absorb') || text.includes('leak') || text.includes('ספיגה')));
};

/** Extract potty training features */
const extractPottyTrainingFeatures = (product: any): {
  absorbencyBadge: string | null;
  layerCount: number | null;
  hasAttractant: boolean;
  hasOdorNeutralizer: boolean;
  trainingSteps: { step: number; title: string; description: string }[];
  dimensions: string | null;
  quantity: string | null;
  expertTip: string;
  crossSellKeyword: string | null;
  isSpray: boolean;
  trainingBooster: string | null;
  naturalIngredients: boolean;
  familySafe: boolean;
  indoorOutdoor: boolean;
  spraySteps: { step: number; title: string; description: string }[];
  safetyWarnings: { icon: React.ReactNode; label: string; description: string }[];
  bundleSuggestion: string | null;
} => {
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText + ' ' + JSON.stringify(attrs).toLowerCase();

  // Detect if spray sub-type
  const isSpray = allText.includes('spray') || allText.includes('ספריי') || allText.includes('attractant') ||
    allText.includes('housebreaking') || allText.includes('drops') || allText.includes('liquid');

  // Absorbency (pads only)
  let absorbencyBadge: string | null = null;
  const cupMatch = allText.match(/(\d+)\s*cups?/i);
  if (cupMatch) absorbencyBadge = `ספיגה מוגברת של עד ${cupMatch[1]} כוסות נוזל`;
  else if (allText.includes('super absorb') || allText.includes('ספיגה')) absorbencyBadge = 'ספיגה מוגברת';

  // Layer count
  let layerCount: number | null = null;
  const layerMatch = allText.match(/(\d+)[\s-]*layer/i);
  if (layerMatch) layerCount = parseInt(layerMatch[1]);
  else if (allText.includes('5 layer') || allText.includes('5-layer')) layerCount = 5;

  const hasAttractant = allText.includes('attractant') || allText.includes('חומר משיכה') || allText.includes('attract');
  const hasOdorNeutralizer = allText.includes('odor') || allText.includes('ריח') || allText.includes('neutraliz') || allText.includes('מנטרל');

  // Training steps (pads)
  const trainingSteps = isSpray ? [] : [
    { step: 1, title: 'פרוס והנח', description: 'פתח את הרפידה והנח על הרצפה – הצד הכחול כלפי מטה' },
    { step: 2, title: 'בחר מיקום', description: 'הרחק ממקום השינה והאוכל – פינה שקטה ונגישה' },
    { step: 3, title: 'חיזוק חיובי', description: 'הבא את הגור להריח את הרפידה – עודד אותו להשתמש בה' },
    { step: 4, title: 'פרס על הצלחה', description: 'שבח והענק חטיף מיד לאחר שימוש נכון!' },
  ];

  // Spray steps
  const spraySteps = isSpray ? [
    { step: 1, title: 'רסס כמות קטנה', description: 'רסס על אזור היעד – רפידה, דשא, או מקום ייעודי' },
    { step: 2, title: 'תן לגור להריח', description: 'הבא את הגור להריח את המקום – הריח מושך באופן טבעי' },
    { step: 3, title: 'שבח ופרס', description: 'ברגע שהגור עושה צרכים במקום – שבח והענק חטיף מיד!' },
    { step: 4, title: 'חזור על התהליך', description: 'חזור אחרי ארוחות, תנומות ומשחק – עקביות היא המפתח' },
  ] : [];

  // Dimensions
  let dimensions: string | null = null;
  const dimMatch = allText.match(/(\d+)["״]\s*x\s*(\d+)["״]/i);
  if (dimMatch) {
    const w = parseInt(dimMatch[1]);
    const h = parseInt(dimMatch[2]);
    dimensions = `${w}" x ${h}" (כ-${Math.round(w * 2.54)}x${Math.round(h * 2.54)} ס"מ)`;
  }

  // Quantity
  let quantity: string | null = null;
  const qtyMatch = allText.match(/(\d+)\s*(?:pads?|count|pack|רפידות|יחידות)/i);
  if (qtyMatch) quantity = `${qtyMatch[1]} רפידות באריזה`;

  const expertTip = isSpray
    ? 'עקביות היא המפתח! השתמשו בספריי באותו מקום בכל פעם. שלבו עם רפידות אילוף לתוצאות מהירות יותר.'
    : 'עקביות היא המפתח! הזיזו את הרפידה לאט לאט לכיוון הדלת – כך הגור ילמד בהדרגה לצאת החוצה לצרכים.';

  // Cross-sell
  const brand = (product.brand || '').toLowerCase();
  const crossSellKeyword = brand ? `${product.brand} Treats` : 'חטיפי אילוף';

  // Spray-specific: Training Booster
  let trainingBooster: string | null = null;
  if (isSpray) {
    if (allText.includes('pheromone') || allText.includes('פרומון') || allText.includes('scent') || allText.includes('fatty acid') || allText.includes('חומצות שומן'))
      trainingBooster = 'מקצר את זמן האילוף – ריח דמוי פרומונים מושך את הגור לעשות צרכים במקום הנכון';
    else
      trainingBooster = 'מקצר את זמן האילוף לצרכים בעזרת חומר משיכה ייעודי';
  }

  // Natural & safe
  const naturalIngredients = allText.includes('natural') || allText.includes('טבעי') || allText.includes('fatty acid') || allText.includes('חומצות שומן') || allText.includes('non-toxic') || allText.includes('לא רעיל');
  const familySafe = allText.includes('family') || allText.includes('children') || allText.includes('ילדים') || allText.includes('safe') || allText.includes('בטוח') || allText.includes('pet safe');
  const indoorOutdoor = allText.includes('indoor') || allText.includes('outdoor') || allText.includes('בתוך הבית') || allText.includes('חצר') || (allText.includes('pad') && allText.includes('yard'));

  // Safety warnings
  const safetyWarnings: { icon: React.ReactNode; label: string; description: string }[] = [];
  if (allText.includes('eye') || allText.includes('עיניים') || allText.includes('contact'))
    safetyWarnings.push({ icon: <EyeOff className="w-4 h-4" />, label: 'שטיפת עיניים', description: 'במקרה של מגע עם העיניים – שטוף מיד במים רבים' });
  if (allText.includes('children') || allText.includes('ילדים') || allText.includes('reach'))
    safetyWarnings.push({ icon: <Users className="w-4 h-4" />, label: 'הרחק מילדים', description: 'יש לאחסן במקום שאינו בהישג ידם של ילדים' });
  if (allText.includes('ingest') || allText.includes('swallow') || allText.includes('בליעה'))
    safetyWarnings.push({ icon: <AlertTriangle className="w-4 h-4" />, label: 'אין לבלוע', description: 'למגע חיצוני בלבד – במקרה של בליעה פנו לרופא' });

  // Bundle suggestion for spray → pads
  const bundleSuggestion = isSpray ? 'רפידות אילוף (Training Pads)' : null;

  return { absorbencyBadge, layerCount, hasAttractant, hasOdorNeutralizer, trainingSteps, dimensions, quantity, expertTip, crossSellKeyword, isSpray, trainingBooster, naturalIngredients, familySafe, indoorOutdoor, spraySteps, safetyWarnings, bundleSuggestion };
};

/** Check if product is an interactive plush / teething toy */
const isPlushToyProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  return cat === 'plush' || cat === 'plush-toys' || cat === 'teething' ||
    text.includes('plush') || text.includes('פלאש') || text.includes('בובה') || text.includes('צפצפה') ||
    text.includes('squeaky') || text.includes('squeaker') || text.includes('crinkle') || text.includes('מרשרש') ||
    text.includes('teething toy') || text.includes('נשכן') || text.includes('שיניים') ||
    ((text.includes('toy') || text.includes('צעצוע')) && (text.includes('stuff') || text.includes('soft') || text.includes('רך')));
};

/** Extract plush / teething toy features */
const extractPlushToyFeatures = (product: any): {
  sensoryFeatures: { icon: React.ReactNode; label: string; description: string }[];
  durabilityHighlights: { icon: React.ReactNode; label: string; description: string }[];
  usageScenarios: { icon: React.ReactNode; label: string; description: string }[];
  safetyEducation: { label: string; description: string }[];
  isGiftWorthy: boolean;
} => {
  const text = `${product.name || ''} ${product.description || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const attrs = product.product_attributes || {};
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefits.map((b: any) => `${b.title || ''} ${b.description || ''}`).join(' ').toLowerCase();
  const allText = text + ' ' + benefitsText;

  // Sensory features
  const sensoryFeatures: { icon: React.ReactNode; label: string; description: string }[] = [];
  if (allText.includes('squeaker') || allText.includes('squeaky') || allText.includes('צפצפה') || allText.includes('squeak'))
    sensoryFeatures.push({ icon: <Volume2 className="w-5 h-5" />, label: 'צפצפה פנימית', description: 'צפצפה מצחיקה שמושכת תשומת לב ומעודדת משחק' });
  if (allText.includes('crinkle') || allText.includes('מרשרש') || allText.includes('crinkling') || allText.includes('rustl'))
    sensoryFeatures.push({ icon: <Music className="w-5 h-5" />, label: 'נייר מרשרש', description: 'נייר מרשרש מעורר סקרנות – גירוי שמיעתי מהנה' });
  if (allText.includes('rope') || allText.includes('חבל') || allText.includes('knot') || allText.includes('קשר'))
    sensoryFeatures.push({ icon: <Grip className="w-5 h-5" />, label: 'חבל קשרים', description: 'חבל לאחיזה ומשחקי משיכה' });
  if (sensoryFeatures.length === 0) {
    sensoryFeatures.push({ icon: <Volume2 className="w-5 h-5" />, label: 'צפצפה פנימית', description: 'צלילים מצחיקים שמעודדים משחק פעיל' });
  }

  // Durability & texture
  const durabilityHighlights: { icon: React.ReactNode; label: string; description: string }[] = [];
  if (allText.includes('pineapple') || allText.includes('אננס') || allText.includes('plaid') || allText.includes('משובץ') || allText.includes('reinforc') || allText.includes('חיזוק'))
    durabilityHighlights.push({ icon: <Shield className="w-5 h-5" />, label: 'בד משובץ אננס', description: 'מרקם ייחודי לחיזוק העמידות ומניעת קריעה' });
  if (allText.includes('teething') || allText.includes('נשכן') || allText.includes('שיניים') || allText.includes('חניכיים') || allText.includes('gum') || allText.includes('teeth'))
    durabilityHighlights.push({ icon: <Smile className="w-5 h-5" />, label: 'תמיכה בבקיעת שיניים', description: 'עזרה בזמן החלפת שיניים והרגעת החניכיים' });
  if (allText.includes('sturdi') || allText.includes('thick') || allText.includes('עבה') || allText.includes('עמיד') || allText.includes('durable') || allText.includes('tough'))
    durabilityHighlights.push({ icon: <ShieldCheck className="w-5 h-5" />, label: 'פלאש מחוזק', description: 'בד עבה ועמיד יותר מהסטנדרט – לחיי משחק ארוכים' });
  if (durabilityHighlights.length === 0) {
    durabilityHighlights.push({ icon: <ShieldCheck className="w-5 h-5" />, label: 'בד עמיד', description: 'מעוצב לעמידות במשחק יומיומי' });
  }

  // Usage scenarios
  const usageScenarios: { icon: React.ReactNode; label: string; description: string }[] = [];
  if (allText.includes('tug') || allText.includes('pull') || allText.includes('משיכה') || allText.includes('צוואר ארוך') || allText.includes('long neck'))
    usageScenarios.push({ icon: <Gamepad2 className="w-5 h-5" />, label: 'משחקי משיכה (Tug & Pull)', description: 'מתאים למשחקי משיכה בזכות הצורה הארוכה' });
  if (allText.includes('fetch') || allText.includes('chase') || allText.includes('זריקה') || allText.includes('הבאה') || allText.includes('throw'))
    usageScenarios.push({ icon: <Zap className="w-5 h-5" />, label: 'זריקה והבאה (Fetch & Chase)', description: 'מתאים למשחקי זריקה והבאה בחצר או בפארק' });
  if (allText.includes('cuddle') || allText.includes('sleep') || allText.includes('התכרבל') || allText.includes('כרית') || allText.includes('שינה') || allText.includes('snuggle') || allText.includes('companion'))
    usageScenarios.push({ icon: <BedDouble className="w-5 h-5" />, label: 'התכרבלות ושינה (Cuddle & Sleep)', description: 'משמש כבובת התכרבלות או כרית לשינה' });
  if (usageScenarios.length === 0) {
    usageScenarios.push({ icon: <Gamepad2 className="w-5 h-5" />, label: 'משחק פעיל', description: 'מתאים למשחקי משיכה, זריקה והתכרבלות' });
  }

  // Safety & education
  const safetyEducation: { label: string; description: string }[] = [
    { label: 'אף צעצוע אינו חסין לנצח', description: 'יש להתאים את הצעצוע להרגלי הלעיסה של הכלב ולהחליף בסימני בלאי' },
    { label: 'למדו משחק נכון', description: 'הנחו את הכלב למשחק עדין ומבוקר – זה מחזק את הקשר ביניכם' },
  ];

  // Gift worthy
  const isGiftWorthy = allText.includes('gift') || allText.includes('מתנה') || allText.includes('birthday') || allText.includes('יום הולדת') ||
    allText.includes('holiday') || allText.includes('חג') || allText.includes('plush') || allText.includes('בובה') || allText.includes('cute') || allText.includes('חמוד');

  return { sensoryFeatures, durabilityHighlights, usageScenarios, safetyEducation, isGiftWorthy };
};

/** Extract technical specs from product_attributes for accessories */
const extractTechSpecs = (product: any): { label: string; value: string }[] => {
  const specs: { label: string; value: string }[] = [];
  const attrs = product.product_attributes || {};
  
  const specMap: Record<string, string> = {
    material: 'חומר',
    size: 'מידה',
    color: 'צבע',
    dimensions: 'מידות',
    weight: 'משקל',
    features: 'תכונות',
    closure: 'סוג סגירה',
    width: 'רוחב',
    length: 'אורך',
    'חומר': 'חומר',
    'מידה': 'מידה',
    'צבע': 'צבע',
    'תכונות': 'תכונות',
    'רוחב': 'רוחב',
    'אורך': 'אורך',
  };

  for (const [key, value] of Object.entries(attrs)) {
    const label = specMap[key.toLowerCase()] || key;
    if (value && String(value).trim()) {
      specs.push({ label, value: String(value) });
    }
  }
  return specs;
};

/** Derive quick-feature badges from product data */
const deriveQuickFeatures = (product: any) => {
  const features: { icon: React.ReactNode; label: string }[] = [];
  const text = `${product.name || ''} ${product.description || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();
  const isAccessory = isAccessoryCategory(product.category);

  if (isAccessory) {
    // Accessory-specific badges
    if (text.includes('nylon') || text.includes('ניילון'))
      features.push({ icon: <Wrench className="w-4 h-4" />, label: 'ניילון עמיד' });
    if (text.includes('quick') || text.includes('שחרור מהיר'))
      features.push({ icon: <Sparkles className="w-4 h-4" />, label: 'שחרור מהיר' });
    if (text.includes('stainless') || text.includes("נירוסטה") || text.includes('d-ring'))
      features.push({ icon: <Shield className="w-4 h-4" />, label: 'טבעת נירוסטה' });
    if (text.includes('רפלקטיב') || text.includes('reflective'))
      features.push({ icon: <Lightbulb className="w-4 h-4" />, label: 'רפלקטיבי' });
    if (text.includes('מרופד') || text.includes('padded'))
      features.push({ icon: <ShieldCheck className="w-4 h-4" />, label: 'מרופד' });
    if (product.dog_size)
      features.push({ icon: <Ruler className="w-4 h-4" />, label: product.dog_size });
  } else {
    // Food-specific badges
    if (text.includes('ללא חיטה') || text.includes('wheat free') || text.includes('grain free') || text.includes('ללא דגנים'))
      features.push({ icon: <WheatOff className="w-4 h-4" />, label: 'ללא חיטה' });
    if (text.includes('חלבון גבוה') || text.includes('high protein') || /חלבון.{0,10}2[5-9]|3[0-9]/.test(text))
      features.push({ icon: <Beef className="w-4 h-4" />, label: 'עשיר בחלבון' });
    if (text.includes('בררנ') || text.includes('picky'))
      features.push({ icon: <Sparkles className="w-4 h-4" />, label: 'לבררנים' });
    if (text.includes('עור') || text.includes('פרווה') || text.includes('skin') || text.includes('coat'))
      features.push({ icon: <Droplets className="w-4 h-4" />, label: 'עור ופרווה' });
    if (text.includes('עיכול') || text.includes('digest'))
      features.push({ icon: <ShieldCheck className="w-4 h-4" />, label: 'תמיכה בעיכול' });
    if (product.life_stage)
      features.push({ icon: product.life_stage.includes('גור') ? <Baby className="w-4 h-4" /> : <Dog className="w-4 h-4" />, label: product.life_stage });
    if (product.dog_size)
      features.push({ icon: <Scale className="w-4 h-4" />, label: product.dog_size });
  }
  
  return features.slice(0, 6);
};

/** Parse feeding guide to find recommended amount for a given weight */
const calcFeeding = (feedingGuide: any[], weightKg: number): string | null => {
  if (!feedingGuide || feedingGuide.length === 0 || !weightKg) return null;
  for (const row of feedingGuide) {
    const rangeStr = row.range || '';
    // Try to extract numbers from range like "1-5 ק"ג" or "עד 5 ק"ג" or "5-10 ק"ג"
    const nums = rangeStr.match(/[\d.]+/g);
    if (!nums) continue;
    const low = parseFloat(nums[0]);
    const high = nums.length > 1 ? parseFloat(nums[1]) : low;
    if (weightKg >= low && weightKg <= high) return row.amount;
    if (nums.length === 1 && weightKg <= high) return row.amount;
  }
  // If weight exceeds all ranges, return last entry
  return feedingGuide[feedingGuide.length - 1]?.amount || null;
};

/** Parse analytical components from ingredients text */
const parseAnalysis = (product: any) => {
  const text = product.ingredients || product.description || '';
  const items: { label: string; value: string }[] = [];
  
  const patterns = [
    { label: 'חלבון גולמי', regex: /חלבון\s*(?:גולמי)?\s*[-–]\s*([\d.]+%)/i },
    { label: 'שומן גולמי', regex: /שומן\s*(?:גולמי)?\s*[-–]\s*([\d.]+%)/i },
    { label: 'אפר גולמי', regex: /אפר\s*(?:גולמי)?\s*[-–]\s*([\d.]+%)/i },
    { label: 'סיבים גולמיים', regex: /סיבים\s*(?:גולמיים)?\s*[-–]\s*([\d.]+%)/i },
    { label: 'סידן', regex: /סידן\s*[-–]\s*([\d.]+%)/i },
    { label: 'זרחן', regex: /זרחן\s*[-–]\s*([\d.]+%)/i },
    { label: 'אומגה 3', regex: /אומגה\s*3\s*[-–]\s*([\d.]+%)/i },
    { label: 'אומגה 6', regex: /אומגה\s*6\s*[-–]\s*([\d.]+%)/i },
  ];

  for (const p of patterns) {
    const match = text.match(p.regex);
    if (match) items.push({ label: p.label, value: match[1] });
  }

  // Also check product_attributes
  if (product.product_attributes && typeof product.product_attributes === 'object') {
    for (const [key, value] of Object.entries(product.product_attributes)) {
      const k = key.toLowerCase();
      if ((k.includes('חלבון') || k.includes('שומן') || k.includes('סיבים') || k.includes('אפר')) && !items.find(i => i.label.includes(key))) {
        items.push({ label: key, value: String(value) });
      }
    }
  }
  return items;
};

/** Extract vitamins from ingredients */
const parseVitamins = (product: any) => {
  const text = product.ingredients || product.description || '';
  const items: { name: string; amount: string }[] = [];
  // Match patterns like "ויטמין A – 15,000 יחב"ל" or "ביוטין – 0.23 מ"ג"
  const regex = /(ויטמין\s*[A-Za-zא-ת₁₂₃₄₅₆₇₈₉₀]+|ניאצין|ביוטין|כולין\s*כלוריד|חומצה\s*פולית|סידן\s*D?\s*פנטותנט)\s*[-–]\s*([\d,.]+\s*(?:יחב"ל|מ"ג|מ״ג|IU))/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    items.push({ name: match[1].trim(), amount: match[2].trim() });
  }
  return items;
};

// ── Component ──────────────────────────────────────────

const ProductDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart, getTotalItems, cartShake } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("price");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [dogWeight, setDogWeight] = useState<string>("");
  const [puppyAgeMonths, setPuppyAgeMonths] = useState<string>("");
  const touchStartX = useRef(0);

  // ── Data Fetching ──
  const { data: dbProduct, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("business_products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const rawProduct = dbProduct || location.state?.product || null;
  const productFlavors: string[] = rawProduct?.flavors || [];

  useEffect(() => {
    if (productFlavors.length > 0 && !selectedVariant) setSelectedVariant(productFlavors[0]);
  }, [productFlavors, selectedVariant]);

  const product = rawProduct ? {
    ...rawProduct,
    name: rawProduct.name,
    subtitle: rawProduct.description || rawProduct.subtitle || "",
    image: rawProduct.image_url || rawProduct.image,
    price: rawProduct.sale_price ? getNumericPrice(rawProduct.sale_price) : getNumericPrice(rawProduct.price),
    originalPrice: rawProduct.sale_price ? getNumericPrice(rawProduct.price) : null,
    discount: rawProduct.sale_price && getNumericPrice(rawProduct.sale_price) < getNumericPrice(rawProduct.price)
      ? `${Math.round((1 - getNumericPrice(rawProduct.sale_price) / getNumericPrice(rawProduct.price)) * 100)}% הנחה`
      : null,
    rating: rawProduct.rating || 4.5,
    reviewCount: rawProduct.reviewCount || 0,
    isFlagged: rawProduct.is_flagged || false,
    flaggedReason: rawProduct.flagged_reason,
  } : null;

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", id],
    queryFn: async () => {
      const { data: bp } = await supabase
        .from("business_products")
        .select("id, name, price, image_url")
        .neq("id", id || "")
        .limit(4);
      if (bp && bp.length > 0) {
        return bp.map(p => ({ id: p.id, name: p.name, price: typeof p.price === 'string' ? parseFloat(p.price) : p.price, image: p.image_url || "/placeholder.svg" }));
      }
      const { data: sp } = await supabase
        .from("scraped_products")
        .select("id, product_name, final_price, main_image_url")
        .neq("id", id || "")
        .limit(4);
      if (sp && sp.length > 0) {
        return sp.map(p => ({ id: p.id, name: p.product_name, price: p.final_price || 0, image: p.main_image_url || "/placeholder.svg" }));
      }
      return [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch similar treats for comparison
  const { data: similarTreats = [] } = useQuery({
    queryKey: ["similar-treats", id, rawProduct?.category],
    queryFn: async () => {
      if (!rawProduct) return [];
      const { data } = await supabase
        .from("business_products")
        .select("id, name, price, image_url, category, product_attributes, description")
        .neq("id", id || "")
        .in("category", ["treats", "snacks"])
        .limit(6);
      if (data && data.length > 0) {
        return data.map(p => ({
          id: p.id,
          name: p.name,
          price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
          image: p.image_url || "/placeholder.svg",
          attrs: p.product_attributes as any || {},
          description: p.description || '',
        }));
      }
      return [];
    },
    enabled: !!rawProduct && isTreatProduct(rawProduct),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch "Frequently Bought Together" for enrichment products (wet food, peanut butter, etc.)
  const { data: enrichmentCompanions = [] } = useQuery({
    queryKey: ["enrichment-companions", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_products")
        .select("id, name, price, image_url, category, description")
        .neq("id", id || "")
        .limit(20);
      if (!data) return [];
      // Prioritize wet food, peanut butter, yogurt-related, supplements
      const keywords = ['מזון רטוב', 'wet', 'שימורים', 'pate', 'פטה', 'חמאת בוטנים', 'peanut', 'יוגורט', 'yogurt', 'תוסף', 'supplement'];
      const scored = data.map(p => {
        const t = `${p.name || ''} ${p.description || ''} ${p.category || ''}`.toLowerCase();
        const score = keywords.reduce((s, kw) => s + (t.includes(kw) ? 1 : 0), 0);
        return { ...p, score };
      }).filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
      return scored.map(p => ({
        id: p.id,
        name: p.name,
        price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
        image: p.image_url || "/placeholder.svg",
      }));
    },
    enabled: !!rawProduct && isEnrichmentProduct(rawProduct),
    staleTime: 1000 * 60 * 5,
  });

  const images = rawProduct
    ? ((rawProduct.images && rawProduct.images.length > 0) ? rawProduct.images : (rawProduct.image_url ? [rawProduct.image_url] : (rawProduct.image ? [rawProduct.image] : ["/placeholder.svg"])))
    : ["/placeholder.svg"];

  // ── Derived Data ──
  const isAccessory = useMemo(() => product ? isAccessoryCategory(product.category) : false, [product]);
  const isMuzzle = useMemo(() => product ? isMuzzleProduct(product) : false, [product]);
  const techSpecs = useMemo(() => product ? extractTechSpecs(product) : [], [product]);
  const sizeMatrix = useMemo(() => product ? extractSizeMatrix(product) : [], [product]);
  const breedRecommendations = useMemo(() => product ? extractBreedRecommendations(product) : [], [product]);
  const quickFeatures = useMemo(() => product ? deriveQuickFeatures(product) : [], [product]);
  const isWetFood = useMemo(() => product ? isWetFoodProduct(product) : false, [product]);
  const wetFoodFeatures = useMemo(() => product && isWetFood ? extractWetFoodFeatures(product) : { hasHydration: false, hasJointSupport: false, texture: null, origin: null, mixingTip: null }, [product, isWetFood]);
  const isEnrichment = useMemo(() => product ? isEnrichmentProduct(product) : false, [product]);
  const enrichmentFeatures = useMemo(() => product && isEnrichment ? extractEnrichmentFeatures(product) : { anxietyUses: [], materialSpecs: [], healthNote: null, recipes: [] }, [product, isEnrichment]);
  const isBedding = useMemo(() => product ? isBeddingProduct(product) : false, [product]);
  const beddingFeatures = useMemo(() => product && isBedding ? extractBeddingFeatures(product) : { texture: null, sleepBenefits: [], isWashable: false, washTip: null, sizing: { diameter: null, maxWeight: null, bestFor: null }, isLuxuryDesign: false, snuggleFactor: false }, [product, isBedding]);
  const isUtility = useMemo(() => product ? isUtilityProduct(product) : false, [product]);
  const utilityFeatures = useMemo(() => product && isUtility ? extractUtilityFeatures(product) : { cleanHomeBadge: false, cleanHomeDesc: [], mechanism: null, usageScenarios: [], techSpecs: [], isNoMessPriority: false }, [product, isUtility]);
  const isGrooming = useMemo(() => product ? isGroomingProduct(product) : false, [product]);
  const groomingFeatures = useMemo(() => product && isGrooming ? extractGroomingFeatures(product) : { visibleResults: [], activeIngredients: [], usageSteps: [], featureBadges: [], targetCoatType: null }, [product, isGrooming]);
  const isHygiene = useMemo(() => product ? isHygieneProduct(product) : false, [product]);
  const hygieneFeatures = useMemo(() => product && isHygiene ? extractHygieneFeatures(product) : { showScienceCorner: false, coreTechnology: null, isTreatmentSafe: false, formulaAttributes: [], scentProfile: null }, [product, isHygiene]);
  const isCrate = useMemo(() => product ? isCrateProduct(product) : false, [product]);
  const crateFeatures = useMemo(() => product && isCrate ? extractCrateFeatures(product) : { safetyBadges: [], fitGuide: { maxWeight: null, crateSize: null, includesDivider: false }, lifestyleIcons: [], prosFromReviews: [], bedRecommendation: null }, [product, isCrate]);
  const isDeshedding = useMemo(() => product ? isDesheddingProduct(product) : false, [product]);
  const desheddingFeatures = useMemo(() => product && isDeshedding ? extractDesheddingFeatures(product) : { efficiencyPct: null, techFeatures: [], sizeGuide: { weightRange: null, coatType: null }, proTip: null, homeHygiene: false }, [product, isDeshedding]);
  const isMedicalProtection = useMemo(() => product ? isMedicalProtectionProduct(product) : false, [product]);
  const medicalFeatures = useMemo(() => product && isMedicalProtection ? extractMedicalProtectionFeatures(product) : { protectionDuration: null, safetyAlerts: [], activeIngredients: [], featureIcons: [], applicationSteps: [], brandAuthority: null }, [product, isMedicalProtection]);
  const isPuzzleEnrichment = useMemo(() => product ? isPuzzleEnrichmentProduct(product) : false, [product]);
  const puzzleFeatures = useMemo(() => product && isPuzzleEnrichment ? extractPuzzleEnrichmentFeatures(product) : { isStuffable: false, mentalStimulation: '', recipe: null, materialSpec: null, hasErraticBounce: false, chewResistance: null, expertApproval: false, crossSellKeywords: [] }, [product, isPuzzleEnrichment]);
  const isPottyTraining = useMemo(() => product ? isPottyTrainingProduct(product) : false, [product]);
  const pottyFeatures = useMemo(() => product && isPottyTraining ? extractPottyTrainingFeatures(product) : { absorbencyBadge: null, layerCount: null, hasAttractant: false, hasOdorNeutralizer: false, trainingSteps: [], dimensions: null, quantity: null, expertTip: '', crossSellKeyword: null, isSpray: false, trainingBooster: null, naturalIngredients: false, familySafe: false, indoorOutdoor: false, spraySteps: [], safetyWarnings: [], bundleSuggestion: null }, [product, isPottyTraining]);
  const isPlushToy = useMemo(() => product ? isPlushToyProduct(product) : false, [product]);
  const plushFeatures = useMemo(() => product && isPlushToy ? extractPlushToyFeatures(product) : { sensoryFeatures: [], durabilityHighlights: [], usageScenarios: [], safetyEducation: [], isGiftWorthy: false }, [product, isPlushToy]);
  const isPuppy = useMemo(() => product ? isPuppyProduct(product) : false, [product]);
  const puppyFeatures = useMemo(() => product && isPuppy ? extractPuppyFeatures(product) : { hasDHA: false, hasAntioxidants: false, topIngredient: null, grainStatus: { hasBarleyOatmeal: false, noCornWheatSoy: false }, hasSatisfactionGuarantee: false, developmentBenefits: [], puppyFeedingMatrix: [] }, [product, isPuppy]);
  const isTreat = useMemo(() => product ? isTreatProduct(product) : false, [product]);
  const isSuperfood = useMemo(() => product && isTreat ? isSuperfoodTreat(product) : false, [product, isTreat]);
  const superfoodFeatures = useMemo(() => product && isSuperfood ? extractSuperfoodFeatures(product) : { vitalityBenefits: [], feedingGuide: [], dehydrationNote: null, isNatural100: false, soulmateMessage: null, proteinPct: null, crossSellSuggestions: [] }, [product, isSuperfood]);
  const treatHealthBoosts = useMemo(() => product && isTreat ? deriveTreatHealthBoosts(product) : [], [product, isTreat]);
  const treatUsage = useMemo(() => product && isTreat ? extractTreatUsage(product) : { purpose: null, safetyTip: null, isNatural: false }, [product, isTreat]);
  const treatFeatures = useMemo(() => product && isTreat ? extractTreatFeatures(product) : { chewDuration: 0, proteinPct: null, hasDental: false, texture: null, isChewPriority: false }, [product, isTreat]);
  const isJointSupplement = useMemo(() => product ? isJointSupplementProduct(product) : false, [product]);
  const jointFeatures = useMemo(() => product && isJointSupplement ? extractJointSupplementFeatures(product) : { ingredients: [], dosagePhases: [], mobilityBenefits: [], humanComparison: null, insuranceTip: null }, [product, isJointSupplement]);
  const isOmegaLiquid = useMemo(() => product ? isOmegaLiquidProduct(product) : false, [product]);
  const omegaFeatures = useMemo(() => product && isOmegaLiquid ? extractOmegaFeatures(product) : { benefits: [], servingSuggestion: '', purityBadge: null, isMultiPet: false, lifeStageTags: [], crossSellHints: [] }, [product, isOmegaLiquid]);
  const isTravelCarrier = useMemo(() => product ? isTravelCarrierProduct(product) : false, [product]);
  const carrierFeatures = useMemo(() => product && isTravelCarrier ? extractCarrierFeatures(product) : { readinessChecklist: [], maxWeightKg: null, dimensions: null, targetPets: '', isExpandable: false, isWashable: false, hasHardBottom: false, proTip: '', crossSellHints: [] }, [product, isTravelCarrier]);
  const isVetDiet = useMemo(() => product ? isVetDietProduct(product) : false, [product]);
  const vetDietFeatures = useMemo(() => product && isVetDiet ? extractVetDietFeatures(product) : { medicalIndicators: [], weightLossTech: [], vetWarning: '', usageTimeline: '', crossSellHints: [], feedingMatrix: [] }, [product, isVetDiet]);
  const isUrinary = useMemo(() => product ? isUrinaryProduct(product) : false, [product]);
  const urinaryFeatures = useMemo(() => product && isUrinary ? extractUrinaryFeatures(product) : { mineralGrid: [], glucosamineNote: null, timeline: [], vetWarning: '', feedingMatrix: [], crossSellHints: [] }, [product, isUrinary]);
  const isHypoallergenic = useMemo(() => product ? isHypoallergenicProduct(product) : false, [product]);
  const hypoFeatures = useMemo(() => product && isHypoallergenic ? extractHypoallergenicFeatures(product) : { daltonSize: '6000', skinBenefits: [], eliminationTimeline: '', vetWarning: '', hasRiceStarch: false, feedingMatrix: [], crossSellHints: [] }, [product, isHypoallergenic]);
  const isGastro = useMemo(() => product ? isGastroProduct(product) : false, [product]);
  const gastroFeatures = useMemo(() => product && isGastro ? extractGastroFeatures(product) : { pillars: [], symptoms: [], timeline: [], vetWarning: '', hydrationNote: '', feedingMatrix: [], crossSellHints: [] }, [product, isGastro]);
  const isDiabetic = useMemo(() => product ? isDiabeticProduct(product) : false, [product]);
  const diabeticFeatures = useMemo(() => product && isDiabetic ? extractDiabeticFeatures(product) : { bloodSugar: { glycemicIndex: '', carbSource: '', mechanism: '' }, muscleFat: [], fiberTech: [], jointNote: null, feedingTip: '', vetWarning: '', feedingMatrix: [], crossSellHints: [] }, [product, isDiabetic]);
  const isRenal = useMemo(() => product ? isRenalProduct(product) : false, [product]);
  const renalFeatures = useMemo(() => product && isRenal ? extractRenalFeatures(product) : { lowLoad: [], phBalance: { title: '', description: '' }, omega3Note: '', transitionDays: '', transitionNote: '', hydrationAlert: '', vetWarning: '', feedingMatrix: [], crossSellHints: [] }, [product, isRenal]);
  const isJointFood = useMemo(() => product ? isJointProduct(product) : false, [product]);
  const jointFoodFeatures = useMemo(() => product && isJointFood ? extractJointFeatures(product) : { cartilage: [], inflammation: { omega3: '', epa: '', dha: '', description: '' }, weightJoint: '', audiences: [], expertTip: '', analysis: [], caPhNote: '', vetWarning: '', crossSellHints: [] }, [product, isJointFood]);
  const isHepatic = useMemo(() => product ? isHepaticProduct(product) : false, [product]);
  const hepaticFeatures = useMemo(() => product && isHepatic ? extractHepaticFeatures(product) : { lowLoad: [], energyBar: { title: '', description: '' }, omega3: { value: '', description: '' }, digestiveSynergy: '', conditions: [], vetWarning: '', crossSellHints: [] }, [product, isHepatic]);
  const isCardiac = useMemo(() => product ? isCardiacProduct(product) : false, [product]);
  const cardiacFeatures = useMemo(() => product && isCardiac ? extractCardiacFeatures(product) : { heartPillars: [], fitAroma: null, gutHeart: '', conditions: [], vetWarning: '', feedingTip: '', crossSellHints: [] }, [product, isCardiac]);
  const analysisData = useMemo(() => product ? parseAnalysis(product) : [], [product]);

  // ── Breed-Specific Intelligence ──
  const { data: userPets = [] } = useQuery({
    queryKey: ["user-pets-for-breed-intel", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("pets")
        .select("id, name, breed, type, size, weight, medical_conditions")
        .eq("user_id", user.id)
        .eq("archived", false);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
  });

  const { data: breedDietRules = [] } = useQuery({
    queryKey: ["breed-diet-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("breed_disease_diet_rules").select("*");
      return data || [];
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: breedInfoForPets = [] } = useQuery({
    queryKey: ["breed-info-for-pets", userPets.map(p => p.breed).join(",")],
    queryFn: async () => {
      const breeds = userPets.map(p => p.breed).filter(Boolean);
      if (breeds.length === 0) return [];
      const { data } = await supabase
        .from("breed_information")
        .select("breed_name, breed_name_he, size_category, health_issues, health_issues_he, energy_level")
        .or(breeds.map(b => `breed_name.ilike.%${b}%,breed_name_he.ilike.%${b}%`).join(","));
      return data || [];
    },
    enabled: userPets.some(p => !!p.breed),
    staleTime: 1000 * 60 * 10,
  });

  const breedIntelligence = useMemo(() => {
    if (!product || userPets.length === 0) return null;

    const productText = `${product.name || ''} ${product.description || ''} ${product.ingredients || ''} ${product.category || ''} ${(product.special_diet || []).join(' ')}`.toLowerCase();

    // ── Breed-Specific Routing Groups ──
    const breedGroupMap: Record<string, { group: string; tips: { icon: string; label: string; description: string }[] }> = {
      large: {
        group: 'גזעים גדולים',
        tips: [
          { icon: '🦴', label: 'תמיכת מפרקים', description: 'גלוקוזאמין וכונדרויטין להגנה על מפרקי הירך והמרפק' },
          { icon: '🛡️', label: 'הגנת ירך/מרפק', description: 'מומלץ מזון עם EPA/DHA לתמיכה בבריאות מפרקים' },
        ],
      },
      small: {
        group: 'גזעים קטנים',
        tips: [
          { icon: '🦷', label: 'טיפולי שיניים', description: 'נטייה להצטברות אבנית – מומלץ חטיפי דנטל וקיבל קטן' },
          { icon: '❤️', label: 'תמיכת לב', description: 'גזעים קטנים נוטים לבעיות מסתמים – Omega-3 וטאורין חשובים' },
        ],
      },
      medium: {
        group: 'גזעים בינוניים',
        tips: [],
      },
    };

    // ── Breed Category Detections ──
    const brachyBreeds = ['bulldog', 'בולדוג', 'pug', 'פאג', 'french', 'צרפתי', 'shih tzu', 'שי טסו', 'boston', 'pekingese', 'פקינז'];
    const deepChestBreeds = ['great dane', 'דני גדול', 'doberman', 'דוברמן', 'german shepherd', 'רועה גרמני', 'boxer', 'בוקסר', 'weimaraner', 'ויימרנר', 'standard poodle', 'פודל סטנדרטי', 'irish setter', 'סטר אירי'];
    const whiteCoatBreeds = ['maltese', 'מלטז', 'bichon', 'ביצ\'ון', 'west highland', 'ווסטי', 'westie', 'samoyed', 'סמויד', 'poodle', 'פודל', 'havanese', 'האוונזי', 'coton', 'קוטון'];
    const longCoatBreeds = ['golden retriever', 'גולדן', 'shih tzu', 'שי טסו', 'afghan', 'אפגני', 'collie', 'קולי', 'cavalier', 'קבליר', 'maltese', 'מלטז', 'yorkshire', 'יורקשיר', 'lhasa', 'לאסה', 'bernese', 'ברנזי', 'cocker', 'קוקר'];
    const activeWorkingBreeds = ['border collie', 'בורדר קולי', 'belgian', 'בלגי', 'malinois', 'מלינואה', 'australian shepherd', 'רועה אוסטרלי', 'husky', 'האסקי', 'vizsla', 'ויזלה', 'weimaraner', 'ויימרנר', 'german shepherd', 'רועה גרמני', 'labrador', 'לברדור', 'jack russell', 'ג\'ק ראסל'];

    // ── Smart Product Tagging Breeds ──
    const glucosamineTargetBreeds = ['golden retriever', 'גולדן', 'labrador', 'לברדור', 'german shepherd', 'רועה גרמני', 'rottweiler', 'רוטווילר'];
    const slowFeederTargetBreeds = ['great dane', 'דני גדול', 'weimaraner', 'ויימרנר', 'doberman', 'דוברמן', 'standard poodle', 'פודל סטנדרטי'];
    const hypoTargetBreeds = ['french bulldog', 'בולדוג צרפתי', 'צרפתי', 'west highland', 'ווסטי', 'westie', 'shar pei', 'שר פיי'];

    let bestPetMatch: {
      petName: string; petBreed: string; breedHe: string | null; sizeCategory: string | null;
      healthIssues: string[]; healthIssuesHe: string[];
      isBrachy: boolean; isDeepChest: boolean; isWhiteCoat: boolean; isLongCoat: boolean; isActiveWorking: boolean;
      matchReasons: string[]; dietMatches: string[];
      whyForBreed: string | null; smartTag: string | null;
    } | null = null;
    let highestScore = 0;

    for (const pet of userPets) {
      if (pet.type !== 'dog' && pet.type !== 'כלב') continue;
      const petBreedLower = (pet.breed || '').toLowerCase();
      const breedInfo = breedInfoForPets.find(b =>
        b.breed_name?.toLowerCase().includes(petBreedLower) ||
        b.breed_name_he?.includes(pet.breed || '')
      );

      const sizeCategory = breedInfo?.size_category || pet.size || null;
      const healthIssues: string[] = breedInfo?.health_issues || [];
      const healthIssuesHe: string[] = (breedInfo as any)?.health_issues_he || [];
      const isBrachy = brachyBreeds.some(b => petBreedLower.includes(b));
      const isDeepChest = deepChestBreeds.some(b => petBreedLower.includes(b));
      const isWhiteCoat = whiteCoatBreeds.some(b => petBreedLower.includes(b));
      const isLongCoat = longCoatBreeds.some(b => petBreedLower.includes(b));
      const isActiveWorking = activeWorkingBreeds.some(b => petBreedLower.includes(b));

      let score = 0;
      const matchReasons: string[] = [];
      const dietMatches: string[] = [];

      // Check breed disease -> diet rules
      for (const issue of healthIssues) {
        const rule = breedDietRules.find(r => r.disease === issue);
        if (rule) {
          const requiredNutrients = rule.required_nutrients || [];
          for (const nutrient of requiredNutrients) {
            if (productText.includes(nutrient.replace(/_/g, ' ')) || productText.includes(nutrient.replace(/_/g, ''))) {
              score += 2;
              dietMatches.push(nutrient);
            }
          }
          if (productText.includes(rule.diet.replace(/_/g, ' ')) || productText.includes(rule.diet)) {
            score += 3;
            matchReasons.push(rule.diet);
          }
        }
      }

      // Check pet medical conditions
      const petConditions = pet.medical_conditions || [];
      for (const condition of petConditions) {
        if (productText.includes(condition.toLowerCase().replace(/_/g, ' '))) {
          score += 2;
          matchReasons.push(condition);
        }
      }

      // ── Size-based matching ──
      if (sizeCategory === 'large' && (productText.includes('large breed') || productText.includes('גזע גדול') || productText.includes('joint') || productText.includes('מפרק') || productText.includes('orthopedic') || productText.includes('אורתופדי'))) { score += 1; matchReasons.push('joint_support'); }
      if (sizeCategory === 'small' && (productText.includes('small breed') || productText.includes('גזע קטן') || productText.includes('dental') || productText.includes('שיני'))) { score += 1; matchReasons.push('dental_care'); }

      // ── Brachy matching ──
      if (isBrachy) {
        if (productText.includes('easy chew') || productText.includes('small kibble') || productText.includes('קיבל קטן') || productText.includes('flat face') || productText.includes('brachy')) { score += 2; matchReasons.push('brachy_friendly'); }
        if (productText.includes('hypoallergenic') || productText.includes('היפואלרגני') || productText.includes('skin') || productText.includes('עור')) { score += 1; matchReasons.push('brachy_skin'); }
      }

      // ── Deep-chest matching ──
      if (isDeepChest && (productText.includes('slow feed') || productText.includes('האכלה איטית') || productText.includes('anti-gulp') || productText.includes('אנטי גלופ'))) { score += 2; matchReasons.push('bloat_prevention'); }

      // ── White/Long Coat matching ──
      if (isWhiteCoat && (productText.includes('tear stain') || productText.includes('כתמי דמעות') || productText.includes('whitening') || productText.includes('הלבנה') || productText.includes('skin') || productText.includes('עור'))) { score += 2; matchReasons.push('white_coat_care'); }
      if (isLongCoat && (productText.includes('detangle') || productText.includes('mat') || productText.includes('brush') || productText.includes('מברשת') || productText.includes('grooming') || productText.includes('טיפוח') || productText.includes('conditioner') || productText.includes('מרכך'))) { score += 1; matchReasons.push('coat_care'); }

      // ── Active/Working matching ──
      if (isActiveWorking && (productText.includes('high protein') || productText.includes('חלבון גבוה') || productText.includes('performance') || productText.includes('active') || productText.includes('energy') || productText.includes('אנרגיה') || productText.includes('sport'))) { score += 2; matchReasons.push('active_recovery'); }
      if (isActiveWorking && (productText.includes('joint') || productText.includes('מפרק') || productText.includes('glucosamine') || productText.includes('גלוקוזאמין'))) { score += 1; matchReasons.push('active_joint'); }

      // ── Smart Product Tagging ──
      let smartTag: string | null = null;
      if (productText.includes('glucosamine') || productText.includes('גלוקוזאמין')) {
        if (glucosamineTargetBreeds.some(b => petBreedLower.includes(b))) { score += 2; smartTag = 'מומלץ במיוחד לגולדנים ולברדורים – נטייה גנטית לדיספלזיה'; }
      }
      if (productText.includes('slow feed') || productText.includes('האכלה איטית') || productText.includes('anti-gulp') || productText.includes('אנטי גלופ')) {
        if (slowFeederTargetBreeds.some(b => petBreedLower.includes(b))) { score += 2; smartTag = 'מומלץ לגזעי חזה עמוק – מפחית סיכון להיפוך קיבה (GDV)'; }
      }
      if (productText.includes('hypoallergenic') || productText.includes('היפואלרגני')) {
        if (hypoTargetBreeds.some(b => petBreedLower.includes(b))) { score += 2; smartTag = 'מותאם לגזעים עם נטייה לאלרגיות עור כרוניות'; }
      }

      // ── Build "Why for your Breed" explanation ──
      let whyForBreed: string | null = null;
      const breedDisplayName = breedInfo?.breed_name_he || pet.breed || '';
      if (matchReasons.length > 0) {
        const whyMap: Record<string, string> = {
          joint_support: `ל${breedDisplayName} נטייה גנטית לדיספלזיה של מפרקי הירך והמרפק. גלוקוזאמין ו-EPA/DHA תומכים בסחוס ומפחיתים דלקות מפרקים.`,
          dental_care: `ל${breedDisplayName} פה קטן עם צפיפות שיניים, מה שמוביל להצטברות אבנית מוגברת. מוצרי דנטל מסייעים בשמירה על היגיינת הפה.`,
          brachy_friendly: `ל${breedDisplayName} לסת קצרה ומבנה גולגולת שטוח, מה שמקשה על לקיחת מזון רגיל. קיבל קטן ושטוח מותאם לאכילה נוחה.`,
          brachy_skin: `ל${breedDisplayName} עור רגיש וקפלי עור שנוטים לזיהומים. מוצרים היפואלרגניים מפחיתים גירוי ומחזקים את מחסום העור.`,
          bloat_prevention: `ל${breedDisplayName} חזה עמוק ובטן צרה – מבנה אנטומי שמגביר את הסיכון להיפוך קיבה (GDV). האכלה איטית מפחיתה סיכון זה משמעותית.`,
          white_coat_care: `ל${breedDisplayName} פרווה בהירה שנוטה לכתמי דמעות ושינוי צבע. מוצרי הלבנה וטיפוח מותאמים שומרים על פרווה לבנה ונקייה.`,
          coat_care: `ל${breedDisplayName} פרווה ארוכה וצפופה שנוטה להסתבך ולהיקשר. סירוק קבוע ומוצרי טיפוח מותאמים מונעים מחצלות ונשירה יתרה.`,
          active_recovery: `ל${breedDisplayName} צרכי אנרגיה גבוהים כגזע עבודה/ספורט. חלבון גבוה תומך בשיקום שרירים לאחר פעילות אינטנסיבית.`,
          active_joint: `ל${breedDisplayName} עומס גבוה על המפרקים בשל פעילות אינטנסיבית. גלוקוזאמין ואומגה-3 חיוניים לשמירה על גמישות ומניעת שחיקה.`,
          cardiac: `ל${breedDisplayName} נטייה גנטית לבעיות לב. נתרן מופחת, טאורין ואומגה-3 תומכים בתפקוד שריר הלב.`,
          weight_control: `ניהול משקל קריטי ל${breedDisplayName} – עודף משקל מחמיר בעיות מפרקים ולב.`,
          diabetic: `תזונה בעלת אינדקס גליקמי נמוך מסייעת בשמירה על רמת סוכר יציבה ב${breedDisplayName}.`,
          renal: `תזונה דלת זרחן וחלבון מבוקר מפחיתה עומס על הכליות של ${breedDisplayName}.`,
          hypoallergenic: `ל${breedDisplayName} רגישות עורית גנטית. חלבון הידרוליזד ואומגה-3 מפחיתים תגובות אלרגיות.`,
          gastrointestinal: `ל${breedDisplayName} מערכת עיכול רגישה. רכיבים קלים לעיכול ופרה-ביוטיקה תומכים בתפקוד תקין.`,
          low_fat_gi: `מערכת העיכול של ${breedDisplayName} דורשת מזון דל שומן עם רכיבים קלים לספיגה.`,
        };
        whyForBreed = whyMap[matchReasons[0]] || null;
      }

      if (score > highestScore) {
        highestScore = score;
        bestPetMatch = {
          petName: pet.name, petBreed: pet.breed || '', breedHe: breedInfo?.breed_name_he || null,
          sizeCategory, healthIssues, healthIssuesHe,
          isBrachy, isDeepChest, isWhiteCoat, isLongCoat, isActiveWorking,
          matchReasons: [...new Set(matchReasons)], dietMatches: [...new Set(dietMatches)],
          whyForBreed, smartTag,
        };
      }
    }

    if (!bestPetMatch) return null;

    // ── Build breed-specific tips ──
    const tips: { icon: string; label: string; description: string }[] = [];
    const sizeGroup = breedGroupMap[bestPetMatch.sizeCategory || ''];
    if (sizeGroup) tips.push(...sizeGroup.tips);

    if (bestPetMatch.isBrachy) {
      tips.push({ icon: '👃', label: 'בטיחות נשימתית', description: 'קיבל קטן ושטוח – מותאם ללסת קצרה ונשימה חופשית' });
      tips.push({ icon: '🌬️', label: 'ניהול משקל קריטי', description: 'שמירה על משקל תקין מונעת החמרת קשיי נשימה אצל ברכיצפליים' });
    }
    if (bestPetMatch.isDeepChest) {
      tips.push({ icon: '⚠️', label: 'התראת היפוך קיבה (GDV)', description: 'מומלץ להשתמש בקערת האכלה איטית ולחלק את הארוחות ל-2-3 מנות קטנות' });
    }
    if (bestPetMatch.isWhiteCoat) {
      tips.push({ icon: '🤍', label: 'טיפוח פרווה לבנה', description: 'נטייה לכתמי דמעות ושינוי צבע – מוצרי הלבנה וטיפוח ייעודי' });
      tips.push({ icon: '🧴', label: 'מניעת קרעי עור', description: 'עור רגיש שדורש מוצרים עדינים ותזונה עשירה באומגה-3' });
    }
    if (bestPetMatch.isLongCoat) {
      tips.push({ icon: '✨', label: 'טיפוח פרווה ארוכה', description: 'סירוק קבוע ומוצרי התרה למניעת קשרים ומחצלות בפרווה' });
    }
    if (bestPetMatch.isActiveWorking) {
      tips.push({ icon: '⚡', label: 'שיקום High-Protein', description: 'חלבון גבוה חיוני לשיקום שרירים לאחר אימונים ופעילות' });
      tips.push({ icon: '🦴', label: 'הגנת מפרקים בפעילות', description: 'גלוקוזאמין ואומגה-3 למניעת שחיקת סחוס בגזעי עבודה' });
    }

    // ── Personalized greeting ──
    const breedName = bestPetMatch.breedHe || bestPetMatch.petBreed;
    let greeting = '';
    if (bestPetMatch.matchReasons.length > 0) {
      const reasonMap: Record<string, string> = {
        cardiac: 'בריאות הלב', joint_support: 'בריאות המפרקים', weight_control: 'ניהול המשקל',
        diabetic: 'ניהול הסוכרת', renal: 'בריאות הכליות', hypoallergenic: 'העור הרגיש',
        gastrointestinal: 'מערכת העיכול', dental_care: 'בריאות השיניים',
        brachy_friendly: 'הלסת הייחודית', brachy_skin: 'העור הרגיש',
        bloat_prevention: 'בטיחות האכילה', low_fat_gi: 'מערכת העיכול',
        white_coat_care: 'הפרווה הלבנה', coat_care: 'הפרווה הארוכה',
        active_recovery: 'השיקום והאנרגיה', active_joint: 'הגנת המפרקים',
      };
      const mainReason = bestPetMatch.matchReasons[0];
      const reasonHe = reasonMap[mainReason] || mainReason;
      greeting = `למה זה מתאים ל${bestPetMatch.petName}? תמיכה ב${reasonHe} של ה${breedName} שלך`;
    }

    const isBreedEssential = highestScore >= 3;

    return { ...bestPetMatch, tips, greeting, isBreedEssential, score: highestScore };
  }, [product, userPets, breedInfoForPets, breedDietRules]);
  const vitaminsData = useMemo(() => product ? parseVitamins(product) : [], [product]);
  const feedingResult = useMemo(() => {
    if (!product?.feeding_guide || !dogWeight) return null;
    return calcFeeding(product.feeding_guide, parseFloat(dogWeight));
  }, [product?.feeding_guide, dogWeight]);

  // Puppy weight warning
  const puppyWeightWarning = useMemo(() => {
    if (!isPuppy || !dogWeight) return null;
    const w = parseFloat(dogWeight);
    const sizeText = `${product?.dog_size || ''} ${product?.name || ''}`.toLowerCase();
    if ((sizeText.includes('mini') || sizeText.includes('small') || sizeText.includes('קטן')) && w > 10)
      return 'נראה שהכלב שלך גדל מהר! מומלץ להתייעץ עם וטרינר לגבי ניהול משקל אופטימלי.';
    if ((sizeText.includes('puppy') || sizeText.includes('גור')) && !sizeText.includes('large') && w > 25)
      return 'נראה שהכלב שלך גדל מהר! מומלץ להתייעץ עם וטרינר לגבי ניהול משקל אופטימלי.';
    return null;
  }, [isPuppy, dogWeight, product]);

  // Price per kg (only for food)
  const pricePerKg = useMemo(() => {
    if (!product || isAccessory) return null;
    const text = `${product.name || ''} ${product.description || ''}`;
    const weightMatch = text.match(/([\d.]+)\s*(?:ק"ג|קג|kg)/i);
    if (weightMatch) {
      const w = parseFloat(weightMatch[1]);
      if (w > 0) return (product.price / w).toFixed(1);
    }
    return null;
  }, [product, isAccessory]);

  // Care instructions from product_attributes
  const careInstructions = useMemo(() => {
    if (!product) return null;
    const attrs = product.product_attributes || {};
    return attrs.care_instructions || attrs['הוראות טיפול'] || null;
  }, [product]);

  // ── Early Returns ──
  if (!isLoading && !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4" dir="rtl">
        <p className="text-muted-foreground">המוצר לא נמצא</p>
        <Button onClick={() => navigate(-1)}>חזרה</Button>
      </div>
    );
  }

  // ── Handlers ──
  const handleAddToCart = () => {
    addToCart({ id: `${product.name}-${selectedVariant || 'default'}`, name: product.name, price: product.price, image: product.image, quantity, variant: selectedVariant || undefined });
    toast({ title: "נוסף לעגלה 🛒", description: `${product.name} x${quantity} נוסף בהצלחה` });
  };
  const handleBuyNow = () => { handleAddToCart(); navigate("/cart"); };
  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast({ title: isWishlisted ? "הוסר מהמועדפים" : "נוסף למועדפים ❤️", description: isWishlisted ? `${product.name} הוסר` : `${product.name} נשמר למועדפים` });
  };
  const nextImage = () => setSelectedImage(p => (p + 1) % images.length);
  const prevImage = () => setSelectedImage(p => (p - 1 + images.length) % images.length);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? nextImage() : prevImage(); }
  };

  const handleReportIssue = async () => {
    setIsReporting(true);
    try {
      const { error } = await supabase.from('content_reports').insert({
        content_type: 'product', content_id: id || 'unknown', reason: reportReason,
        description: reportDetails || `דיווח על ${reportReason === 'price' ? 'מחיר שגוי' : reportReason === 'image' ? 'תמונה לא מתאימה' : reportReason === 'description' ? 'תיאור שגוי' : 'בעיה אחרת'}`,
        reporter_id: user?.id || '00000000-0000-0000-0000-000000000000',
      });
      if (error) throw error;
      toast({ title: "תודה על הדיווח! 🙏", description: "הדיווח התקבל ויטופל בהקדם" });
      setReportDialogOpen(false); setReportReason("price"); setReportDetails("");
    } catch (error) {
      toast({ title: "שגיאה בשליחת הדיווח", description: "אנא נסה שוב מאוחר יותר", variant: "destructive" });
    } finally { setIsReporting(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Check if we have nutrition tab data ──
  const hasIngredients = !!product.ingredients;
  const hasBenefits = product.benefits && Array.isArray(product.benefits) && product.benefits.length > 0;
  const hasFeedingGuide = product.feeding_guide && Array.isArray(product.feeding_guide) && product.feeding_guide.length > 0;
  const hasAnalysis = analysisData.length > 0;
  const hasVitamins = vitaminsData.length > 0;
  const hasNutritionData = hasIngredients || hasAnalysis || hasVitamins;

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      <SEO 
        title={product.name}
        description={product.description || `${product.name} - מחיר: ₪${product.price}`}
        image={product.image}
        url={`/product/${id}`}
        type="product"
        price={product.price}
        availability="in_stock"
      />
      <div className="h-full overflow-y-auto pb-[180px]">

        {/* ── Header ── */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted w-10 h-10" onClick={() => navigate(-1)}>
              <ArrowRight className="w-5 h-5 text-foreground" />
            </Button>
            <h1 className="text-base font-bold text-foreground">פרטי מוצר</h1>
            <div className="flex items-center gap-1">
              <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 text-muted-foreground hover:text-destructive">
                    <Flag className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-right">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      דיווח על תקלה
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">מצאת משהו שלא נראה נכון? ספר לנו ונטפל בזה</p>
                    <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-3">
                      {[
                        { value: "price", label: "מחיר שגוי", desc: "המחיר לא נכון או שהמבצע לא אמיתי" },
                        { value: "image", label: "תמונה לא מתאימה", desc: "התמונה לא מייצגת את המוצר" },
                        { value: "description", label: "תיאור שגוי", desc: "המידע על המוצר לא מדויק" },
                        { value: "other", label: "בעיה אחרת", desc: "משהו אחר שצריך לתקן" },
                      ].map(r => (
                        <div key={r.value} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                          <RadioGroupItem value={r.value} id={r.value} />
                          <Label htmlFor={r.value} className="flex-1 cursor-pointer">
                            <span className="font-medium">{r.label}</span>
                            <p className="text-xs text-muted-foreground">{r.desc}</p>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <Textarea placeholder="פרטים נוספים (אופציונלי)..." value={reportDetails} onChange={e => setReportDetails(e.target.value)} className="min-h-[80px] resize-none" />
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild><Button variant="outline" className="rounded-xl">ביטול</Button></DialogClose>
                    <Button onClick={handleReportIssue} disabled={isReporting} className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2">
                      {isReporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                      שלח דיווח
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="icon" className="rounded-full w-10 h-10" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "הקישור הועתק", description: "קישור למוצר הועתק ללוח" }); }}>
                <Share2 className="w-5 h-5 text-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className={`rounded-full w-10 h-10 transition-all duration-300 ${isWishlisted ? 'text-red-500 scale-110' : 'text-foreground'}`} onClick={toggleWishlist}>
                <Heart className={`w-5 h-5 transition-all duration-300 ${isWishlisted ? 'fill-current' : ''}`} />
              </Button>
              <motion.div animate={cartShake ? { rotate: [0, -10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.5 }}>
                <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 relative overflow-visible" onClick={() => navigate("/cart")}>
                  <ShoppingCart className="w-5 h-5 text-foreground" />
                  <AnimatePresence>
                    {getTotalItems() > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-primary text-primary-foreground text-[11px] font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-background z-10">
                        {getTotalItems() > 9 ? '9+' : getTotalItems()}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>
          </div>
        </header>

        {/* ── Product Image Gallery ── */}
        <div className="relative bg-gradient-to-b from-muted/30 to-background">
          <div className="aspect-square max-w-md mx-auto relative overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <AnimatePresence mode="wait">
              <motion.img key={selectedImage} src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }} />
            </AnimatePresence>
            {product.discount && (
              <motion.div className="absolute top-4 left-4" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                <Badge className="bg-destructive text-destructive-foreground font-bold px-3 py-1.5 rounded-full text-sm shadow-lg">{product.discount}</Badge>
              </motion.div>
            )}
            {images.length > 1 && <>
              <button onClick={nextImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-full flex items-center justify-center shadow-lg transition-all"><ChevronLeft className="w-5 h-5 text-foreground" /></button>
              <button onClick={prevImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-full flex items-center justify-center shadow-lg transition-all"><ChevronRight className="w-5 h-5 text-foreground" /></button>
            </>}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 justify-center py-3 px-4">
              {images.map((img, idx) => (
                <motion.button key={idx} onClick={() => setSelectedImage(idx)} whileTap={{ scale: 0.95 }} className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedImage === idx ? "border-primary ring-2 ring-primary/20" : "border-border/30 opacity-60 hover:opacity-100"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product Info Card ── */}
        <motion.div className="mx-4 -mt-2 relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden border-border/50">
            {/* Brand + Title + Price */}
            <div className="p-5">
              <div className="flex items-center justify-between">
                {product.brand && (
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">{product.brand}</span>
                )}
                {isWetFood && wetFoodFeatures.origin && (
                  <Badge variant="secondary" className="text-[10px] font-bold gap-1">
                    <Flag className="w-3 h-3" />
                    מיוצר ב{wetFoodFeatures.origin}
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-bold text-foreground leading-tight mt-1">{product.name}</h1>
              
              {/* Rating + Price Per Kg */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span className="font-bold text-foreground">{product.rating}</span>
                </div>
                {pricePerKg && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    ₪{pricePerKg} / ק״ג
                  </Badge>
                )}
                {product.life_stage && <Badge variant="outline" className="text-xs">{product.life_stage}</Badge>}
                {product.dog_size && <Badge variant="outline" className="text-xs">{product.dog_size}</Badge>}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-3xl font-black text-primary">₪{product.price}</span>
                {product.originalPrice && <span className="text-base text-muted-foreground line-through">₪{product.originalPrice}</span>}
              </div>
            </div>

            {/* ── Quick Features Row ── */}
            {quickFeatures.length > 0 && (
              <div className="px-5 pb-4">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                  {quickFeatures.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
                    >
                      {f.icon}
                      <span>{f.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Diet Tags */}
            {product.special_diet?.length > 0 && (
              <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                {product.special_diet.map((tag: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px] border-accent/50 text-accent-foreground">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Delivery info */}
            <div className="flex items-center gap-2 px-5 pb-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full bg-muted text-muted-foreground border border-border/50">
                <Truck className="w-3.5 h-3.5 text-primary" />
                <span>משלוח חינם מעל ₪199</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full bg-muted text-muted-foreground border border-border/50">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>2-4 ימי עסקים</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Smart AI Layers (Personalized for Active Pet) ── */}
        <SmartProductLayers
          productName={product.name}
          productDescription={product.subtitle || ""}
          productCategory={product.category || null}
          productIngredients={product.ingredients || null}
          productPrice={product.price}
        />

        {/* ── Flavor Selector ── */}
        {productFlavors.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <Card className="p-4">
              <label className="text-sm font-bold mb-3 block text-foreground">טעם</label>
              <div className="flex gap-2 flex-wrap">
                {productFlavors.map(v => (
                  <button key={v} onClick={() => setSelectedVariant(v)} className={`px-4 py-2 rounded-xl text-sm transition-all ${selectedVariant === v ? "bg-primary text-primary-foreground font-bold shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {selectedVariant === v && <Check className="w-3.5 h-3.5 inline-block ml-1" />}
                    {v}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Feeding Calculator (food only) ── */}
        {!isAccessory && hasFeedingGuide && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                מחשבון מנת האכלה
                {isPuppy && <Badge variant="secondary" className="text-[10px] px-2 py-0.5">🐾 גורים</Badge>}
              </h3>
              <div className={`grid gap-3 ${isPuppy ? 'grid-cols-1' : ''}`}>
                <div className={isPuppy ? 'grid grid-cols-2 gap-3' : 'flex items-end gap-3'}>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">משקל נוכחי (ק״ג)</Label>
                    <Input
                      type="number"
                      placeholder="לדוגמה: 5"
                      value={dogWeight}
                      onChange={e => setDogWeight(e.target.value)}
                      className="h-11 text-base"
                      min="0.5"
                      max="100"
                      step="0.5"
                    />
                  </div>
                  {isPuppy && (
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1.5 block">גיל בחודשים</Label>
                      <Input
                        type="number"
                        placeholder="לדוגמה: 4"
                        value={puppyAgeMonths}
                        onChange={e => setPuppyAgeMonths(e.target.value)}
                        className="h-11 text-base"
                        min="1"
                        max="24"
                        step="1"
                      />
                    </div>
                  )}
                  {!isPuppy && (
                    <div className="flex-1">
                      <AnimatePresence mode="wait">
                        {feedingResult ? (
                          <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center"
                          >
                            <p className="text-[10px] text-muted-foreground">כמות יומית מומלצת</p>
                            <p className="text-lg font-black text-primary mt-0.5">{feedingResult}</p>
                          </motion.div>
                        ) : (
                          <motion.div key="empty" className="bg-muted/50 rounded-xl p-3 text-center border border-border/30">
                            <p className="text-xs text-muted-foreground">הזן משקל לחישוב</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
                {/* Puppy feeding result */}
                {isPuppy && (
                  <AnimatePresence mode="wait">
                    {feedingResult ? (
                      <motion.div
                        key="puppy-result"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center"
                      >
                        <p className="text-[10px] text-muted-foreground">
                          כמות יומית מומלצת {puppyAgeMonths ? `(גיל ${puppyAgeMonths} חודשים)` : ''}
                        </p>
                        <p className="text-lg font-black text-primary mt-0.5">{feedingResult}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">חלקו ל-3-4 ארוחות ביום לגורים</p>
                      </motion.div>
                    ) : (
                      <motion.div key="puppy-empty" className="bg-muted/50 rounded-xl p-3 text-center border border-border/30">
                        <p className="text-xs text-muted-foreground">הזינו משקל {isPuppy ? 'וגיל ' : ''}לחישוב</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                {/* Puppy weight warning */}
                {puppyWeightWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20"
                  >
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-warning leading-[1.6]">{puppyWeightWarning}</p>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Technical Specifications (accessories only) ── */}
        {isAccessory && techSpecs.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="overflow-hidden">
              <div className="p-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4 text-primary" />
                  מפרט טכני
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {techSpecs.map((spec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      className="bg-muted/40 rounded-xl p-3 border border-border/30"
                    >
                      <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{spec.label}</p>
                      <p className="text-sm font-bold text-foreground">{spec.value}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Care Instructions (accessories only) ── */}
        {isAccessory && careInstructions && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="p-4 border-accent/20 bg-gradient-to-br from-accent/5 to-background">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <Paintbrush className="w-4 h-4 text-accent-foreground" />
                הוראות טיפול
              </h3>
              <p className="text-[13px] text-muted-foreground leading-[1.7]">{careInstructions}</p>
            </Card>
          </motion.div>
        )}

        {/* ── Muzzle Safety Alert (Panting / הלחתה) ── */}
        {isMuzzle && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(30,90%,95%)] to-background border-[hsl(30,80%,70%)]/40 dark:from-[hsl(30,50%,15%)] dark:border-[hsl(30,60%,40%)]/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(30,80%,70%)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-[hsl(30,80%,45%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">⚠️ חשוב – הלחתה (Panting)</h3>
                  <p className="text-[13px] text-muted-foreground leading-[1.7]">
                    יש לוודא שהמחסום מאפשר לכלב להלחית (לנשום עם פה פתוח) בחופשיות. 
                    מחסום שאינו מאפשר הלחתה עלול לגרום לחימום יתר, מצוקה נשימתית וסכנה לחיי הכלב. 
                    מומלץ להשתמש במחסום סלסלה פתוח ולא במחסום בד צמוד.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Size & Specs Matrix (accessories with measurements) ── */}
        {isAccessory && sizeMatrix.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="overflow-hidden">
              <div className="p-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <Ruler className="w-4 h-4 text-primary" />
                  מידות ומפרט
                </h3>
                <div className="rounded-xl overflow-hidden border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className="text-right p-3 font-bold text-foreground text-xs">מדד</th>
                        <th className="text-right p-3 font-bold text-foreground text-xs">ערך</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeMatrix.map((item, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="p-3 text-muted-foreground text-xs">{item.label}</td>
                          <td className="p-3 text-foreground font-semibold text-xs">{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Breed Recommendations Tag Cloud ── */}
        {isAccessory && breedRecommendations.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Dog className="w-4 h-4 text-primary" />
                מתאים לגזעים
              </h3>
              <div className="flex flex-wrap gap-2">
                {breedRecommendations.map((breed, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                  >
                    <Badge variant="secondary" className="text-xs px-3 py-1.5 font-medium">
                      🐕 {breed}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── How to Measure Guide (accessories with sizing) ── */}
        {isAccessory && (isMuzzle || sizeMatrix.length > 0) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-background border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Ruler className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">📏 איך למדוד נכון?</h3>
                  <div className="text-[13px] text-muted-foreground leading-[1.7] space-y-1.5">
                    {isMuzzle ? (
                      <>
                        <p><strong>היקף הלוע:</strong> מדדו סביב הלוע הסגור, בנקודה הרחבה ביותר, כ-1 ס"מ מתחת לעיניים.</p>
                        <p><strong>אורך הלוע:</strong> מדדו מקצה האף ועד לנקודה שבין העיניים.</p>
                        <p><strong>טיפ:</strong> הוסיפו 1-2 ס"מ להיקף כדי לוודא שהכלב יכול להלחית בנוחות.</p>
                      </>
                    ) : (
                      <>
                        <p><strong>צוואר:</strong> מדדו את היקף הצוואר במקום בו הקולר ינוח, השאירו מרווח של 2 אצבעות.</p>
                        <p><strong>חזה:</strong> מדדו סביב החלק הרחב ביותר של בית החזה, מאחורי הרגליים הקדמיות.</p>
                        <p><strong>אורך גב:</strong> מדדו מבסיס הצוואר ועד בסיס הזנב.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Pro Tip: Two Fingers Rule (collar accessories) ── */}
        {isAccessory && !isMuzzle && (product.category?.includes('collar') || `${product.name} ${product.description}`.toLowerCase().match(/קולר|collar|צווארון/)) ? (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4 bg-gradient-to-br from-warning/10 to-background border-warning/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">טיפ מקצועי – כלל שתי האצבעות ✌️</h3>
                  <p className="text-[13px] text-muted-foreground leading-[1.7]">
                    בעת התאמת הקולר, וודאו שניתן להכניס שתי אצבעות בין הקולר לצוואר הכלב. 
                    קולר צמוד מדי עלול לגרום לאי-נוחות, ורפוי מדי עלול להחליק ולהיות מסוכן.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : null}

        {/* ── Enrichment: Anxiety Relief Badges ── */}
        {isEnrichment && enrichmentFeatures.anxietyUses.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-primary" />
                מתאים במיוחד עבור
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {enrichmentFeatures.anxietyUses.map((use, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.22 + i * 0.06 }}
                    className="bg-gradient-to-br from-[hsl(270,60%,95%)] to-background dark:from-[hsl(270,30%,15%)] rounded-xl p-3.5 border border-[hsl(270,40%,70%)]/20 text-center"
                  >
                    <div className="w-10 h-10 mx-auto rounded-full bg-[hsl(270,50%,80%)]/20 flex items-center justify-center text-[hsl(270,50%,50%)] mb-2">
                      {use.icon}
                    </div>
                    <p className="text-[12px] font-bold text-foreground">{use.label}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Enrichment: Material & Safety Grid ── */}
        {isEnrichment && enrichmentFeatures.materialSpecs.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="overflow-hidden">
              <div className="p-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-primary" />
                  חומר ובטיחות
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {enrichmentFeatures.materialSpecs.map((spec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.26 + i * 0.05 }}
                      className="bg-muted/40 rounded-xl p-3 border border-border/30 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        {spec.label === 'חומר' ? <ShieldCheck className="w-4 h-4 text-success" /> :
                         spec.label === 'תכונות' ? <Snowflake className="w-4 h-4 text-success" /> :
                         <Ruler className="w-4 h-4 text-success" />}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium">{spec.label}</p>
                        <p className="text-[13px] font-bold text-foreground">{spec.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Enrichment: Health Benefits (Dental + Digestion) ── */}
        {isEnrichment && enrichmentFeatures.healthNote && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4 bg-gradient-to-br from-success/8 to-background border-success/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Smile className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">🦷 שיניים + עיכול</h3>
                  <p className="text-[13px] text-muted-foreground leading-[1.7]">{enrichmentFeatures.healthNote}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Enrichment: Recipe & Topper Ideas ── */}
        {isEnrichment && enrichmentFeatures.recipes.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Cookie className="w-4 h-4 text-primary" />
                מה אפשר למרוח?
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {enrichmentFeatures.recipes.map((recipe, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="bg-muted/40 rounded-xl p-3 border border-border/30 text-center"
                  >
                    <p className="text-[13px] font-bold text-foreground">{recipe}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 bg-primary/5 rounded-xl p-3 border border-primary/10">
                <Lightbulb className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground">טיפ: הקפיאו את המריחה לחוויית ליקוק ארוכה יותר!</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Wet Food: Hydration Badge ── */}
        {isWetFood && wetFoodFeatures.hasHydration && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(200,80%,93%)] to-background border-[hsl(200,70%,70%)]/30 dark:from-[hsl(200,40%,15%)] dark:border-[hsl(200,50%,40%)]/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[hsl(200,70%,80%)]/30 flex items-center justify-center flex-shrink-0">
                  <Droplets className="w-6 h-6 text-[hsl(200,70%,45%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">💧 תמיכה בהידרציה</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">מזון רטוב מסייע בצריכת נוזלים ותומך בבריאות הכליות ומערכת השתן</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Wet Food: Texture Info ── */}
        {isWetFood && wetFoodFeatures.texture && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Utensils className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">מרקם (Texture)</p>
                  <p className="text-sm font-bold text-foreground">{wetFoodFeatures.texture}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Wet Food: Mixed Feeding / Topper Guide ── */}
        {isWetFood && wetFoodFeatures.mixingTip && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="p-4 bg-gradient-to-br from-accent/5 to-background border-accent/20">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Cookie className="w-4 h-4 text-accent-foreground" />
                מדריך הגשה – Mixed Feeding
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3 border border-border/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Utensils className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">טיפ Topper</p>
                    <p className="text-[13px] font-bold text-foreground">{wetFoodFeatures.mixingTip}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[hsl(200,80%,95%)]/60 dark:bg-[hsl(200,40%,15%)] rounded-xl p-3 border border-[hsl(200,60%,70%)]/20">
                  <div className="w-8 h-8 rounded-full bg-[hsl(200,70%,80%)]/20 flex items-center justify-center flex-shrink-0">
                    <GlassWater className="w-4 h-4 text-[hsl(200,60%,45%)]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">תזכורת</p>
                    <p className="text-[13px] font-bold text-foreground">הקפידו על מים טריים בכל עת 💧</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Wet Food: Joint Support Tag ── */}
        {isWetFood && wetFoodFeatures.hasJointSupport && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4 bg-gradient-to-br from-success/8 to-background border-success/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">🦴 בריאות המפרקים</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">מכיל גלוקוזאמין וכונדרואיטין – תמיכה בגמישות המפרקים ובניידות</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Bedding: Feel & Texture Highlight ── */}
        {isBedding && beddingFeatures.texture && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(280,60%,95%)] to-background border-[hsl(280,40%,70%)]/20 dark:from-[hsl(280,30%,15%)] dark:border-[hsl(280,40%,40%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[hsl(280,50%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Waves className="w-6 h-6 text-[hsl(280,50%,50%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">🧸 מרקם ותחושה</h3>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{beddingFeatures.texture}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Bedding: Sleep Benefits ── */}
        {isBedding && beddingFeatures.sleepBenefits.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4 text-primary" />
                יתרונות שינה ונוחות
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {beddingFeatures.sleepBenefits.map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.24 + i * 0.06 }}
                    className="bg-gradient-to-l from-[hsl(280,50%,95%)]/60 to-transparent dark:from-[hsl(280,30%,15%)] rounded-xl p-3.5 border border-[hsl(280,40%,70%)]/15 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-[hsl(280,50%,80%)]/15 flex items-center justify-center flex-shrink-0 text-[hsl(280,50%,50%)]">
                      {benefit.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{benefit.label}</p>
                      <p className="text-[11px] text-muted-foreground">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Bedding: Care & Maintenance ── */}
        {isBedding && beddingFeatures.isWashable && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(200,60%,93%)] to-background border-[hsl(200,50%,70%)]/20 dark:from-[hsl(200,30%,15%)] dark:border-[hsl(200,40%,40%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(200,60%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <WashingMachine className="w-5 h-5 text-[hsl(200,60%,45%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">🧼 ניתנת לכביסה</h3>
                  {beddingFeatures.washTip && (
                    <p className="text-[12px] text-muted-foreground mt-0.5">{beddingFeatures.washTip}</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Bedding: Sizing Guide ── */}
        {isBedding && (beddingFeatures.sizing.diameter || beddingFeatures.sizing.maxWeight || beddingFeatures.sizing.bestFor) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="overflow-hidden">
              <div className="p-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <Ruler className="w-4 h-4 text-primary" />
                  מדריך מידות
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {beddingFeatures.sizing.diameter && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="bg-muted/40 rounded-xl p-3 border border-border/30 text-center">
                      <p className="text-[10px] text-muted-foreground font-medium mb-1">קוטר</p>
                      <p className="text-sm font-black text-foreground">{beddingFeatures.sizing.diameter}</p>
                    </motion.div>
                  )}
                  {beddingFeatures.sizing.maxWeight && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="bg-muted/40 rounded-xl p-3 border border-border/30 text-center">
                      <p className="text-[10px] text-muted-foreground font-medium mb-1">משקל מקסימלי</p>
                      <p className="text-sm font-black text-foreground">{beddingFeatures.sizing.maxWeight}</p>
                    </motion.div>
                  )}
                  {beddingFeatures.sizing.bestFor && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="bg-muted/40 rounded-xl p-3 border border-border/30 text-center">
                      <p className="text-[10px] text-muted-foreground font-medium mb-1">מתאים ל</p>
                      <p className="text-[11px] font-bold text-foreground">{beddingFeatures.sizing.bestFor}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Bedding: Home Decor / Luxury Design Tag ── */}
        {isBedding && beddingFeatures.isLuxuryDesign && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(40,60%,93%)] to-background border-[hsl(40,50%,70%)]/20 dark:from-[hsl(40,30%,15%)] dark:border-[hsl(40,40%,40%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(40,60%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-[hsl(40,60%,40%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">✨ עיצוב יוקרתי</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">עיצוב אלגנטי המשתלב בכל סגנון עיצוב הבית</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Utility: Clean Home Badge ── */}
        {isUtility && utilityFeatures.cleanHomeBadge && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(170,60%,93%)] to-background border-[hsl(170,50%,65%)]/20 dark:from-[hsl(170,30%,15%)] dark:border-[hsl(170,40%,40%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[hsl(170,50%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-[hsl(170,50%,40%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">🏠 בית נקי</h3>
                  <div className="flex flex-wrap gap-x-3 mt-1">
                    {utilityFeatures.cleanHomeDesc.map((desc, i) => (
                      <p key={i} className="text-[12px] text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-[hsl(170,50%,40%)]" /> {desc}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Utility: How it Works / Mechanism ── */}
        {isUtility && utilityFeatures.mechanism && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-background border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Cog className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">⚙️ איך זה עובד?</h3>
                  <p className="text-[13px] text-muted-foreground leading-[1.7]">{utilityFeatures.mechanism}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Utility: Usage Scenarios ── */}
        {isUtility && utilityFeatures.usageScenarios.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-primary" />
                מתאים במיוחד עבור
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {utilityFeatures.usageScenarios.map((scenario, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.26 + i * 0.06 }}
                    className="bg-gradient-to-l from-[hsl(170,50%,95%)]/60 to-transparent dark:from-[hsl(170,30%,15%)] rounded-xl p-3.5 border border-[hsl(170,40%,70%)]/15 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-[hsl(170,50%,80%)]/15 flex items-center justify-center flex-shrink-0 text-[hsl(170,50%,40%)]">
                      {scenario.icon}
                    </div>
                    <p className="text-[13px] font-bold text-foreground">{scenario.label}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Utility: Technical Specs Table ── */}
        {isUtility && utilityFeatures.techSpecs.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="overflow-hidden">
              <div className="p-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4 text-primary" />
                  מפרט טכני
                </h3>
                <div className="rounded-xl overflow-hidden border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      {utilityFeatures.techSpecs.map((spec, i) => (
                        <tr key={i} className={i > 0 ? 'border-t border-border/50' : ''}>
                          <td className="p-3 text-muted-foreground text-xs font-medium bg-muted/30 w-1/3">{spec.label}</td>
                          <td className="p-3 text-foreground font-semibold text-xs">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Grooming: Visible Results Card ── */}
        {isGrooming && groomingFeatures.visibleResults.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(320,60%,95%)] to-background border-[hsl(320,40%,70%)]/20 dark:from-[hsl(320,30%,15%)] dark:border-[hsl(320,40%,40%)]/20">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-[hsl(320,50%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-[hsl(320,50%,50%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">✨ תוצאות נראות לעין</h3>
                  <div className="flex flex-wrap gap-x-3 mt-1.5">
                    {groomingFeatures.visibleResults.map((result, i) => (
                      <p key={i} className="text-[12px] text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-[hsl(320,50%,50%)]" /> {result}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Grooming: Active Ingredients ── */}
        {isGrooming && groomingFeatures.activeIngredients.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <FlaskConical className="w-4 h-4 text-primary" />
                רכיבים פעילים
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {groomingFeatures.activeIngredients.map((ingredient, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.24 + i * 0.06 }}
                    className="bg-gradient-to-l from-[hsl(320,50%,95%)]/60 to-transparent dark:from-[hsl(320,30%,15%)] rounded-xl p-3.5 border border-[hsl(320,40%,70%)]/15 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-[hsl(320,50%,80%)]/15 flex items-center justify-center flex-shrink-0 text-[hsl(320,50%,50%)]">
                      {ingredient.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{ingredient.label}</p>
                      <p className="text-[11px] text-muted-foreground">{ingredient.benefit}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Grooming: Step-by-Step Usage Guide ── */}
        {isGrooming && groomingFeatures.usageSteps.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-background border-primary/20">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <Pipette className="w-4 h-4 text-primary" />
                מדריך שימוש
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {groomingFeatures.usageSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.26 + i * 0.08 }}
                    className="bg-background rounded-xl p-3 border border-border/40 text-center"
                  >
                    <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <span className="text-sm font-black text-primary">{i + 1}</span>
                    </div>
                    <p className="text-[12px] font-bold text-foreground leading-snug">{step}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Grooming: Feature Badges ── */}
        {isGrooming && groomingFeatures.featureBadges.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                תכונות מיוחדות
              </h3>
              <div className="flex flex-wrap gap-2">
                {groomingFeatures.featureBadges.map((badge, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.28 + i * 0.05 }}
                  >
                    <Badge variant="secondary" className="text-xs px-3 py-1.5 font-medium">{badge}</Badge>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Grooming: Target Coat Type ── */}
        {isGrooming && groomingFeatures.targetCoatType && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(40,60%,93%)] to-background border-[hsl(40,50%,70%)]/20 dark:from-[hsl(40,30%,15%)] dark:border-[hsl(40,40%,40%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(40,60%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Wind className="w-5 h-5 text-[hsl(40,60%,40%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">🐾 מתאים במיוחד ל</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{groomingFeatures.targetCoatType}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hygiene: PH Science Corner ── */}
        {isHygiene && hygieneFeatures.showScienceCorner && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(210,70%,95%)] to-background border-[hsl(210,50%,65%)]/20 dark:from-[hsl(210,30%,15%)] dark:border-[hsl(210,40%,40%)]/20">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-[hsl(210,60%,80%)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Beaker className="w-6 h-6 text-[hsl(210,60%,45%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1.5">🔬 פינת המדע – הבדל ה-pH</h3>
                  <p className="text-[12px] text-muted-foreground leading-[1.8]">
                    עור הכלב פחות חומצי מעור האדם (pH 6.2-7.4 לעומת 5.5). שימוש בשמפו אנושי עלול לשבש את מחסום העור, לגרום ליובש, גירוי ופגיעות לזיהומים. שמפו ייעודי לכלבים שומר על איזון ה-pH הטבעי ומגן על העור.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hygiene: Core Technology (Baking Soda) ── */}
        {isHygiene && hygieneFeatures.coreTechnology && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FlaskConical className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">טכנולוגיית הליבה</p>
                  <h3 className="text-sm font-bold text-foreground">{hygieneFeatures.coreTechnology.label}</h3>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-[1.7]">{hygieneFeatures.coreTechnology.description}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hygiene: Treatment Safe Badge ── */}
        {isHygiene && hygieneFeatures.isTreatmentSafe && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="p-4 bg-gradient-to-br from-success/8 to-background border-success/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                  <Bug className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">🛡️ בטוח לשימוש עם טיפולי פרעושים וקרציות</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">לא פוגע ביעילות טיפולי Spot-On ומוצרים נגד טפילים חיצוניים</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hygiene: Formula Attributes ── */}
        {isHygiene && hygieneFeatures.formulaAttributes.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                מאפייני הנוסחה
              </h3>
              <div className="flex flex-wrap gap-2">
                {hygieneFeatures.formulaAttributes.map((attr, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.28 + i * 0.05 }}
                  >
                    <Badge variant="secondary" className="text-xs px-3 py-1.5 font-medium">✅ {attr}</Badge>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hygiene: Scent Profile ── */}
        {isHygiene && hygieneFeatures.scentProfile && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(150,50%,93%)] to-background border-[hsl(150,40%,65%)]/20 dark:from-[hsl(150,30%,15%)] dark:border-[hsl(150,40%,40%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(150,50%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Flower2 className="w-5 h-5 text-[hsl(150,50%,40%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">🌸 פרופיל ריח</h3>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{hygieneFeatures.scentProfile}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Crate: Safety & Security Badges ── */}
        {isCrate && crateFeatures.safetyBadges.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                בטיחות ואבטחה
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {crateFeatures.safetyBadges.map((badge, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + i * 0.06 }}
                    className="bg-gradient-to-l from-[hsl(220,50%,95%)]/60 to-transparent dark:from-[hsl(220,30%,15%)] rounded-xl p-3.5 border border-[hsl(220,40%,70%)]/15 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-[hsl(220,50%,80%)]/15 flex items-center justify-center flex-shrink-0 text-[hsl(220,60%,45%)]">
                      {badge.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{badge.label}</p>
                      <p className="text-[11px] text-muted-foreground">{badge.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Crate: Size & Capacity Fit Guide ── */}
        {isCrate && (crateFeatures.fitGuide.maxWeight || crateFeatures.fitGuide.crateSize || crateFeatures.fitGuide.includesDivider) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-background border-primary/20">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Maximize2 className="w-4 h-4 text-primary" />
                מדריך התאמה (Fit Guide)
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {crateFeatures.fitGuide.maxWeight && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="bg-background rounded-xl p-3 border border-border/40 text-center">
                    <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Weight className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">משקל מקסימלי</p>
                    <p className="text-[12px] font-bold text-foreground">{crateFeatures.fitGuide.maxWeight}</p>
                  </motion.div>
                )}
                {crateFeatures.fitGuide.crateSize && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="bg-background rounded-xl p-3 border border-border/40 text-center">
                    <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Box className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">גודל כלוב</p>
                    <p className="text-[12px] font-bold text-foreground">{crateFeatures.fitGuide.crateSize}</p>
                  </motion.div>
                )}
              </div>
              {crateFeatures.fitGuide.includesDivider && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-2.5 bg-success/8 rounded-xl p-3 border border-success/20 flex items-center gap-2">
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                  <p className="text-[12px] font-bold text-foreground">כולל מחיצה פנימית – להתאמת המרחב לגורים בצמיחה</p>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ── Crate: Usage & Lifestyle Icons ── */}
        {isCrate && crateFeatures.lifestyleIcons.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-primary" />
                שימוש וסגנון חיים
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {crateFeatures.lifestyleIcons.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.26 + i * 0.06 }}
                    className="bg-gradient-to-l from-[hsl(150,50%,95%)]/60 to-transparent dark:from-[hsl(150,30%,15%)] rounded-xl p-3.5 border border-[hsl(150,40%,70%)]/15 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-[hsl(150,50%,80%)]/15 flex items-center justify-center flex-shrink-0 text-[hsl(150,50%,40%)]">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Crate: What Customers Love ── */}
        {isCrate && crateFeatures.prosFromReviews.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <ThumbsUp className="w-4 h-4 text-primary" />
                מה הלקוחות אוהבים
              </h3>
              <div className="flex flex-wrap gap-2">
                {crateFeatures.prosFromReviews.map((pro, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.28 + i * 0.05 }}
                  >
                    <Badge variant="secondary" className="text-xs px-3 py-1.5 font-medium">👍 {pro}</Badge>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Crate: Smart Bed Recommendation ── */}
        {isCrate && crateFeatures.bedRecommendation && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(280,50%,95%)] to-background border-[hsl(280,40%,70%)]/20 dark:from-[hsl(280,30%,15%)] dark:border-[hsl(280,40%,40%)]/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(280,50%,80%)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Moon className="w-5 h-5 text-[hsl(280,50%,50%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">🛏️ המלצה חכמה – יצירת "מאורה"</h3>
                  <p className="text-[13px] text-muted-foreground leading-[1.7]">{crateFeatures.bedRecommendation}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Deshedding: Efficiency Badge ── */}
        {isDeshedding && desheddingFeatures.efficiencyPct && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(25,80%,93%)] to-background border-[hsl(25,60%,65%)]/20 dark:from-[hsl(25,40%,15%)] dark:border-[hsl(25,50%,40%)]/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[hsl(25,70%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <div className="text-center">
                    <span className="text-xl font-black text-[hsl(25,70%,45%)]">{desheddingFeatures.efficiencyPct}%</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">🧹 הפחתת נשירה</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">מפחית עד {desheddingFeatures.efficiencyPct}% מהנשירה – פרווה בריאה, בית נקי יותר</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Deshedding: Technical Safety Grid ── */}
        {isDeshedding && desheddingFeatures.techFeatures.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Cog className="w-4 h-4 text-primary" />
                טכנולוגיות פטנט
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {desheddingFeatures.techFeatures.map((feat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.24 + i * 0.06 }}
                    className="bg-gradient-to-l from-[hsl(25,50%,95%)]/60 to-transparent dark:from-[hsl(25,30%,15%)] rounded-xl p-3.5 border border-[hsl(25,40%,70%)]/15 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-[hsl(25,50%,80%)]/15 flex items-center justify-center flex-shrink-0 text-[hsl(25,60%,45%)]">
                      {feat.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{feat.label}</p>
                      <p className="text-[11px] text-muted-foreground">{feat.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Deshedding: Smart Size Guide ── */}
        {isDeshedding && (desheddingFeatures.sizeGuide.weightRange || desheddingFeatures.sizeGuide.coatType) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-background border-primary/20">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                מתאים לכלב שלי? 🐕
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {desheddingFeatures.sizeGuide.weightRange && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="bg-background rounded-xl p-3 border border-border/40 text-center">
                    <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Scale className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">משקל הכלב</p>
                    <p className="text-[12px] font-bold text-foreground">{desheddingFeatures.sizeGuide.weightRange}</p>
                  </motion.div>
                )}
                {desheddingFeatures.sizeGuide.coatType && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-background rounded-xl p-3 border border-border/40 text-center">
                    <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Wind className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">סוג פרווה</p>
                    <p className="text-[12px] font-bold text-foreground">{desheddingFeatures.sizeGuide.coatType}</p>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Deshedding: Pro Tip (Care & Usage) ── */}
        {isDeshedding && desheddingFeatures.proTip && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4 bg-gradient-to-br from-warning/10 to-background border-warning/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">💡 טיפ מקצועי</h3>
                  <p className="text-[13px] text-muted-foreground leading-[1.7]">{desheddingFeatures.proTip}</p>
                  <Badge variant="outline" className="mt-2 text-[10px]">⚠️ פרווה יבשה בלבד</Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Deshedding: Home Hygiene Connection ── */}
        {isDeshedding && desheddingFeatures.homeHygiene && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(170,60%,93%)] to-background border-[hsl(170,50%,65%)]/20 dark:from-[hsl(170,30%,15%)] dark:border-[hsl(170,40%,40%)]/20">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-[hsl(170,50%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Home className="w-6 h-6 text-[hsl(170,50%,40%)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1.5">🏠 בית נקי יותר</h3>
                  <div className="space-y-1">
                    <p className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <Check className="w-3 h-3 text-[hsl(170,50%,40%)]" /> פחות שיער על רהיטים ושטיחים
                    </p>
                    <p className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <Check className="w-3 h-3 text-[hsl(170,50%,40%)]" /> הפחתת אלרגנים בסביבת המגורים
                    </p>
                    <p className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <Check className="w-3 h-3 text-[hsl(170,50%,40%)]" /> חיסכון בזמן ניקיון יומי
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Medical Protection: Protection Duration Badge ── */}
        {isMedicalProtection && medicalFeatures.protectionDuration && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(210,80%,93%)] to-background border-[hsl(210,60%,55%)]/30 dark:from-[hsl(210,40%,15%)] dark:border-[hsl(210,50%,40%)]/30">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-[hsl(210,70%,50%)]/15 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-7 h-7 text-[hsl(210,70%,45%)]" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">משך הגנה</p>
                  <p className="text-xl font-black text-foreground">{medicalFeatures.protectionDuration}</p>
                  <p className="text-[11px] text-muted-foreground">הגנה רציפה מפרעושים וקרציות</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Medical Protection: Critical Safety Alerts ── */}
        {isMedicalProtection && medicalFeatures.safetyAlerts.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4 border-destructive/40 bg-destructive/5 dark:bg-destructive/10">
              <h3 className="text-sm font-bold text-destructive flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" />
                אזהרות בטיחות קריטיות
              </h3>
              <div className="space-y-2.5">
                {medicalFeatures.safetyAlerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-destructive/5 dark:bg-destructive/10 rounded-lg p-2.5">
                    <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0 text-destructive">
                      {alert.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-destructive">{alert.label}</p>
                      <p className="text-[11px] text-muted-foreground">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Medical Protection: Active Ingredients ── */}
        {isMedicalProtection && medicalFeatures.activeIngredients.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <FlaskConical className="w-4 h-4 text-primary" />
                חומרים פעילים
              </h3>
              <div className="space-y-2">
                {medicalFeatures.activeIngredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-3 bg-primary/5 dark:bg-primary/10 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Bug className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{ing.name}</p>
                      <p className="text-[11px] text-muted-foreground">{ing.target}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Medical Protection: Feature Icons ── */}
        {isMedicalProtection && medicalFeatures.featureIcons.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <div className="grid grid-cols-3 gap-2">
              {medicalFeatures.featureIcons.map((feat, i) => (
                <Card key={i} className="p-3 flex flex-col items-center text-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-[hsl(210,50%,90%)]/50 dark:bg-[hsl(210,30%,20%)] flex items-center justify-center text-[hsl(210,60%,45%)]">
                    {feat.icon}
                  </div>
                  <p className="text-[11px] font-bold text-foreground">{feat.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{feat.labelHe}</p>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Medical Protection: Application Guide ── */}
        {isMedicalProtection && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                מדריך הענקה – 3 שלבים
              </h3>
              <div className="space-y-2">
                {medicalFeatures.applicationSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="text-[13px] text-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Medical Protection: Brand Authority ── */}
        {isMedicalProtection && medicalFeatures.brandAuthority && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(45,60%,93%)] to-background border-[hsl(45,50%,65%)]/20 dark:from-[hsl(45,30%,15%)] dark:border-[hsl(45,40%,40%)]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[hsl(45,60%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-5 h-5 text-[hsl(45,60%,40%)]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">{medicalFeatures.brandAuthority}</p>
                  <p className="text-[10px] text-muted-foreground">מומלץ ע"י וטרינרים מובילים</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Plush Toy: Gift Tag ── */}
        {isPlushToy && plushFeatures.isGiftWorthy && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(330,70%,93%)] to-background border-[hsl(330,50%,65%)]/20 dark:from-[hsl(330,30%,15%)] dark:border-[hsl(330,40%,40%)]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[hsl(330,60%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-[hsl(330,60%,45%)]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">🎁 מתנה מושלמת!</p>
                  <p className="text-[10px] text-muted-foreground">מתאים ליום הולדת, חג, או פינוק ספונטני</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Plush Toy: Sensory Features Badge ── */}
        {isPlushToy && plushFeatures.sensoryFeatures.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(280,60%,93%)] to-background border-[hsl(280,50%,65%)]/20 dark:from-[hsl(280,30%,15%)] dark:border-[hsl(280,40%,40%)]/20">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Volume2 className="w-4 h-4 text-[hsl(280,50%,50%)]" />
                🎵 Fun & Sounds – צלילים ותחושות
              </h3>
              <div className="space-y-2.5">
                {plushFeatures.sensoryFeatures.map((feat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.24 + i * 0.06 }}
                    className="flex items-start gap-3 bg-[hsl(280,40%,90%)]/30 dark:bg-[hsl(280,30%,15%)]/50 rounded-xl p-3 border border-[hsl(280,40%,70%)]/15"
                  >
                    <div className="w-9 h-9 rounded-full bg-[hsl(280,50%,80%)]/20 flex items-center justify-center flex-shrink-0 text-[hsl(280,50%,50%)]">
                      {feat.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{feat.label}</p>
                      <p className="text-[11px] text-muted-foreground">{feat.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Plush Toy: Durability & Texture Guard ── */}
        {isPlushToy && plushFeatures.durabilityHighlights.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                עמידות ומרקם
              </h3>
              <div className="space-y-2">
                {plushFeatures.durabilityHighlights.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Plush Toy: Usage Scenarios ── */}
        {isPlushToy && plushFeatures.usageScenarios.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <div className="grid grid-cols-1 gap-2">
              {plushFeatures.usageScenarios.map((scenario, i) => (
                <Card key={i} className="p-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[hsl(200,50%,90%)]/50 dark:bg-[hsl(200,30%,20%)] flex items-center justify-center flex-shrink-0 text-[hsl(200,60%,45%)]">
                    {scenario.icon}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-foreground">{scenario.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{scenario.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Plush Toy: Safety & Education Box ── */}
        {isPlushToy && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Card className="p-4 border-warning/30 bg-warning/5 dark:bg-warning/10">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                אחריות הבעלים – בטיחות במשחק
              </h3>
              <div className="space-y-2">
                {plushFeatures.safetyEducation.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-warning">!</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Puzzle Enrichment: Stuffing Potential Badge ── */}
        {isPuzzleEnrichment && puzzleFeatures.isStuffable && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(25,80%,92%)] to-background border-[hsl(25,60%,60%)]/20 dark:from-[hsl(25,40%,14%)] dark:border-[hsl(25,40%,40%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[hsl(25,70%,80%)]/25 flex items-center justify-center flex-shrink-0">
                  <Puzzle className="w-6 h-6 text-[hsl(25,70%,45%)]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-foreground">🧩 אידיאלי למילוי (Stuffing)</p>
                  <p className="text-[11px] text-muted-foreground">מלא בחטיפים, הקפא, ותן לכלב לפתור!</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Puzzle Enrichment: Mental Stimulation ── */}
        {isPuzzleEnrichment && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(260,50%,93%)] to-background border-[hsl(260,40%,65%)]/20 dark:from-[hsl(260,30%,14%)] dark:border-[hsl(260,30%,40%)]/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(260,50%,80%)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Brain className="w-5 h-5 text-[hsl(260,50%,50%)]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">🧠 גירוי מנטלי</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{puzzleFeatures.mentalStimulation}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Puzzle Enrichment: KONG Recipe Card ── */}
        {isPuzzleEnrichment && puzzleFeatures.recipe && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4 border-[hsl(25,60%,60%)]/25">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Cookie className="w-4 h-4 text-[hsl(25,60%,45%)]" />
                🍯 מתכון מילוי מומלץ
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-[hsl(25,50%,92%)]/40 dark:bg-[hsl(25,30%,15%)]/50 rounded-lg p-3">
                  <div className="w-8 h-8 rounded-full bg-[hsl(40,60%,85%)]/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">1️⃣</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">בסיס (Base)</p>
                    <p className="text-[11px] text-muted-foreground">{puzzleFeatures.recipe.base}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[hsl(25,50%,92%)]/40 dark:bg-[hsl(25,30%,15%)]/50 rounded-lg p-3">
                  <div className="w-8 h-8 rounded-full bg-[hsl(30,60%,85%)]/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">2️⃣</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">מדביק (Binder)</p>
                    <p className="text-[11px] text-muted-foreground">{puzzleFeatures.recipe.binder}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[hsl(25,50%,92%)]/40 dark:bg-[hsl(25,30%,15%)]/50 rounded-lg p-3">
                  <div className="w-8 h-8 rounded-full bg-[hsl(20,60%,85%)]/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">3️⃣</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">טופינג (Topper)</p>
                    <p className="text-[11px] text-muted-foreground">{puzzleFeatures.recipe.topper}</p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">💡 טיפ: הקפיאו לאתגר ממושך יותר!</p>
            </Card>
          </motion.div>
        )}

        {/* ── Puzzle Enrichment: Durability & Bounce ── */}
        {isPuzzleEnrichment && (puzzleFeatures.materialSpec || puzzleFeatures.hasErraticBounce || puzzleFeatures.chewResistance) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                עמידות וחומרים
              </h3>
              <div className="space-y-2">
                {puzzleFeatures.materialSpec && (
                  <div className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary">
                      <CircleDashed className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">חומר</p>
                      <p className="text-[11px] text-muted-foreground">{puzzleFeatures.materialSpec}</p>
                    </div>
                  </div>
                )}
                {puzzleFeatures.hasErraticBounce && (
                  <div className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">קפיצות לא צפויות</p>
                      <p className="text-[11px] text-muted-foreground">צורה ייחודית ליצירת קפיצות בלתי צפויות – משחקי הבאה מאתגרים!</p>
                    </div>
                  </div>
                )}
                {puzzleFeatures.chewResistance && (
                  <div className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">רמת עמידות</p>
                      <p className="text-[11px] text-muted-foreground">{puzzleFeatures.chewResistance}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Puzzle Enrichment: Expert Approval ── */}
        {isPuzzleEnrichment && puzzleFeatures.expertApproval && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(140,40%,92%)] to-background border-[hsl(140,40%,55%)]/20 dark:from-[hsl(140,25%,14%)] dark:border-[hsl(140,30%,40%)]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[hsl(140,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-[hsl(140,45%,40%)]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">✅ מומלץ ע"י וטרינרים ומאלפים</p>
                  <p className="text-[10px] text-muted-foreground">מוצר מאושר ע"י מומחים ברחבי העולם</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Potty Training: Absorbency Badge ── */}
        {isPottyTraining && pottyFeatures.absorbencyBadge && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(200,70%,92%)] to-background border-[hsl(200,55%,60%)]/20 dark:from-[hsl(200,35%,14%)] dark:border-[hsl(200,35%,40%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[hsl(200,60%,80%)]/25 flex items-center justify-center flex-shrink-0">
                  <Droplets className="w-6 h-6 text-[hsl(200,65%,45%)]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-foreground">💧 {pottyFeatures.absorbencyBadge}</p>
                  {pottyFeatures.layerCount && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      טכנולוגיית {pottyFeatures.layerCount} שכבות אנטי-דליפה
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Potty Training: Attractant & Odor Tech ── */}
        {isPottyTraining && (pottyFeatures.hasAttractant || pottyFeatures.hasOdorNeutralizer) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <FlaskConical className="w-4 h-4 text-primary" />
                טכנולוגיית ריח ומשיכה
              </h3>
              <div className="space-y-2">
                {pottyFeatures.hasAttractant && (
                  <div className="flex items-start gap-3 bg-[hsl(140,40%,92%)]/40 dark:bg-[hsl(140,25%,15%)]/50 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(140,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                      <Magnet className="w-4 h-4 text-[hsl(140,45%,40%)]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">חומר משיכה מובנה</p>
                      <p className="text-[11px] text-muted-foreground">מקל על האילוף – מושך את הגור לעשות צרכים על הרפידה</p>
                    </div>
                  </div>
                )}
                {pottyFeatures.hasOdorNeutralizer && (
                  <div className="flex items-start gap-3 bg-[hsl(260,40%,93%)]/40 dark:bg-[hsl(260,25%,15%)]/50 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(260,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                      <Wind className="w-4 h-4 text-[hsl(260,45%,50%)]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">מנטרל ריחות</p>
                      <p className="text-[11px] text-muted-foreground">מרכיב פעיל שמנטרל ריחות רעים – שומר על ניקיון הבית</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Potty Training: Dimensions & Quantity ── */}
        {isPottyTraining && (pottyFeatures.dimensions || pottyFeatures.quantity) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <div className="grid grid-cols-2 gap-2 mx-0">
              {pottyFeatures.dimensions && (
                <Card className="p-3 text-center">
                  <Ruler className="w-5 h-5 mx-auto text-primary mb-1" />
                  <p className="text-[11px] font-bold text-foreground">גודל</p>
                  <p className="text-[10px] text-muted-foreground">{pottyFeatures.dimensions}</p>
                </Card>
              )}
              {pottyFeatures.quantity && (
                <Card className="p-3 text-center">
                  <Box className="w-5 h-5 mx-auto text-primary mb-1" />
                  <p className="text-[11px] font-bold text-foreground">כמות</p>
                  <p className="text-[10px] text-muted-foreground">{pottyFeatures.quantity}</p>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Potty Training: Step-by-Step Guide ── */}
        {isPottyTraining && pottyFeatures.trainingSteps.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Footprints className="w-4 h-4 text-primary" />
                🐾 מדריך אילוף מהיר
              </h3>
              <div className="space-y-2">
                {pottyFeatures.trainingSteps.map((step) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + step.step * 0.06 }}
                    className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 rounded-lg p-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      {step.step}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{step.title}</p>
                      <p className="text-[11px] text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Potty Training: Expert Tip ── */}
        {isPottyTraining && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-4 border-[hsl(45,60%,60%)]/25 bg-[hsl(45,60%,95%)]/30 dark:bg-[hsl(45,30%,12%)]/40">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(45,60%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-[hsl(45,70%,45%)]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">💡 טיפ מקצועי: עקביות היא המפתח!</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{pottyFeatures.expertTip}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Potty Training: Cross-Sell ── */}
        {isPottyTraining && pottyFeatures.crossSellKeyword && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(140,40%,93%)] to-background border-[hsl(140,35%,60%)]/20 dark:from-[hsl(140,25%,14%)]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[hsl(140,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-5 h-5 text-[hsl(140,45%,40%)]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">🎁 השלימו את האילוף!</p>
                  <p className="text-[10px] text-muted-foreground">חפשו "{pottyFeatures.crossSellKeyword}" כפרס מושלם לאחר הצלחה</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Potty Spray: Training Booster Badge ── */}
        {isPottyTraining && pottyFeatures.isSpray && pottyFeatures.trainingBooster && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(160,50%,92%)] to-background border-[hsl(160,45%,55%)]/20 dark:from-[hsl(160,30%,14%)] dark:border-[hsl(160,30%,40%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[hsl(160,45%,80%)]/25 flex items-center justify-center flex-shrink-0">
                  <SprayCan className="w-6 h-6 text-[hsl(160,50%,40%)]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-foreground">⚡ מקצר את זמן האילוף</p>
                  <p className="text-[11px] text-muted-foreground">{pottyFeatures.trainingBooster}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Potty Spray: Natural & Safety Icons ── */}
        {isPottyTraining && pottyFeatures.isSpray && (pottyFeatures.naturalIngredients || pottyFeatures.familySafe || pottyFeatures.indoorOutdoor) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Leaf className="w-4 h-4 text-[hsl(140,45%,40%)]" />
                בטיחות ורכיבים
              </h3>
              <div className="space-y-2">
                {pottyFeatures.naturalIngredients && (
                  <div className="flex items-start gap-3 bg-[hsl(140,40%,93%)]/40 dark:bg-[hsl(140,25%,15%)]/50 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(140,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                      <Leaf className="w-4 h-4 text-[hsl(140,45%,40%)]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">תרכובת טבעית</p>
                      <p className="text-[11px] text-muted-foreground">מבוסס על חומצות שומן טבעיות, ללא כימיקלים רעילים</p>
                    </div>
                  </div>
                )}
                {pottyFeatures.familySafe && (
                  <div className="flex items-start gap-3 bg-[hsl(210,40%,93%)]/40 dark:bg-[hsl(210,25%,15%)]/50 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(210,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-[hsl(210,50%,45%)]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">בטוח למשפחה</p>
                      <p className="text-[11px] text-muted-foreground">בטוח לשימוש בסביבת ילדים וחיות מחמד לפי ההוראות</p>
                    </div>
                  </div>
                )}
                {pottyFeatures.indoorOutdoor && (
                  <div className="flex items-start gap-3 bg-[hsl(30,40%,93%)]/40 dark:bg-[hsl(30,25%,15%)]/50 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(30,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                      <TreePine className="w-4 h-4 text-[hsl(30,50%,45%)]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">בפנים ובחוץ</p>
                      <p className="text-[11px] text-muted-foreground">מתאים לשימוש בתוך הבית, על רפידות, או בחצר</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Potty Spray: Step-by-Step Spray Guide ── */}
        {isPottyTraining && pottyFeatures.isSpray && pottyFeatures.spraySteps.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Footprints className="w-4 h-4 text-primary" />
                🐾 מדריך שימוש בספריי
              </h3>
              <div className="space-y-2">
                {pottyFeatures.spraySteps.map((step) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.28 + step.step * 0.06 }}
                    className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 rounded-lg p-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      {step.step}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{step.title}</p>
                      <p className="text-[11px] text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Potty Spray: Safety Warning Box ── */}
        {isPottyTraining && pottyFeatures.isSpray && pottyFeatures.safetyWarnings.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Card className="p-4 border-destructive/30 bg-destructive/5 dark:bg-destructive/10">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                אזהרות בטיחות
              </h3>
              <div className="space-y-2">
                {pottyFeatures.safetyWarnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0 mt-0.5 text-destructive">
                      {warning.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{warning.label}</p>
                      <p className="text-[11px] text-muted-foreground">{warning.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Potty Spray: Bundle Suggestion ── */}
        {isPottyTraining && pottyFeatures.isSpray && pottyFeatures.bundleSuggestion && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(270,45%,93%)] to-background border-[hsl(270,35%,60%)]/20 dark:from-[hsl(270,25%,14%)]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[hsl(270,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Puzzle className="w-5 h-5 text-[hsl(270,45%,50%)]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">🧩 Perfect Match – שילוב מנצח!</p>
                  <p className="text-[10px] text-muted-foreground">שלבו עם {pottyFeatures.bundleSuggestion} לתוצאות אילוף מהירות יותר</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Puppy: Top Ingredient Badge ── */}
        {isPuppy && puppyFeatures.topIngredient && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(45,80%,93%)] to-background border-[hsl(45,60%,65%)]/20 dark:from-[hsl(45,40%,15%)] dark:border-[hsl(45,50%,40%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[hsl(45,70%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🥇</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">רכיב #1</h3>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{puppyFeatures.topIngredient}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Puppy: Development Benefits ── */}
        {isPuppy && puppyFeatures.developmentBenefits.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Baby className="w-4 h-4 text-primary" />
                יתרונות להתפתחות הגור
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {puppyFeatures.developmentBenefits.map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.24 + i * 0.06 }}
                    className="bg-gradient-to-l from-[hsl(200,50%,95%)]/60 to-transparent dark:from-[hsl(200,30%,15%)] rounded-xl p-3.5 border border-[hsl(200,40%,70%)]/15 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-[hsl(200,50%,80%)]/15 flex items-center justify-center flex-shrink-0 text-[hsl(200,50%,45%)]">
                      {benefit.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{benefit.label}</p>
                      <p className="text-[11px] text-muted-foreground">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Puppy: Grain Status ── */}
        {isPuppy && (puppyFeatures.grainStatus.hasBarleyOatmeal || puppyFeatures.grainStatus.noCornWheatSoy) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <WheatOff className="w-4 h-4 text-primary" />
                סטטוס דגנים
              </h3>
              <div className="flex flex-wrap gap-2">
                {puppyFeatures.grainStatus.hasBarleyOatmeal && (
                  <Badge variant="secondary" className="text-xs px-3 py-1.5 font-medium">🌾 מכיל שעורה / שיבולת שועל</Badge>
                )}
                {puppyFeatures.grainStatus.noCornWheatSoy && (
                  <Badge variant="outline" className="text-xs px-3 py-1.5 font-medium border-success/30 text-success">✅ ללא תירס, חיטה או סויה</Badge>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Puppy: Satisfaction Guarantee ── */}
        {isPuppy && puppyFeatures.hasSatisfactionGuarantee && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4 bg-gradient-to-br from-success/8 to-background border-success/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">✅ 100% שביעות רצון</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">המותג מציע אחריות שביעות רצון מלאה על המוצר</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Nutrition Tabs (food only) ── */}
        {!isAccessory && hasNutritionData && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="overflow-hidden">
              <div className="p-4 pb-0">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  מידע תזונתי
                </h3>
              </div>
              <Tabs defaultValue={hasAnalysis ? "analysis" : hasIngredients ? "ingredients" : "vitamins"} className="w-full">
                <div className="px-4 overflow-x-auto hide-scrollbar">
                  <TabsList className="bg-muted/50 p-1 rounded-xl w-full justify-start">
                    {hasAnalysis && <TabsTrigger value="analysis" className="text-xs rounded-lg flex-1">ניתוח תזונתי</TabsTrigger>}
                    {hasIngredients && <TabsTrigger value="ingredients" className="text-xs rounded-lg flex-1">רכיבים</TabsTrigger>}
                    {hasVitamins && <TabsTrigger value="vitamins" className="text-xs rounded-lg flex-1">ויטמינים</TabsTrigger>}
                  </TabsList>
                </div>

                {hasAnalysis && (
                  <TabsContent value="analysis" className="px-4 pb-4 mt-0">
                    <div className="rounded-xl overflow-hidden border border-border mt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/60">
                            <th className="text-right p-3 font-bold text-foreground text-xs">רכיב</th>
                            <th className="text-right p-3 font-bold text-foreground text-xs">ערך</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.map((item, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="p-3 text-muted-foreground text-xs">{item.label}</td>
                              <td className="p-3 text-foreground font-semibold text-xs">{item.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                )}

                {hasIngredients && (
                  <TabsContent value="ingredients" className="px-4 pb-4 mt-0">
                    <div className="mt-3 bg-muted/30 rounded-xl p-4 text-[13px] text-muted-foreground leading-[1.8]">
                      {product.ingredients}
                    </div>
                  </TabsContent>
                )}

                {hasVitamins && (
                  <TabsContent value="vitamins" className="px-4 pb-4 mt-0">
                    <div className="mt-3 space-y-1.5">
                      {vitaminsData.map((v, i) => (
                        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-xs">
                          <span className="text-foreground font-medium">{v.name}</span>
                          <span className="text-muted-foreground">{v.amount}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </Card>
          </motion.div>
        )}

        {/* ── Treat Visual Feature Bar ── */}
        {isTreat && (treatFeatures.chewDuration > 0 || treatFeatures.proteinPct || treatFeatures.hasDental || treatFeatures.texture) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <Timer className="w-4 h-4 text-primary" />
                תכונות עיקריות
              </h3>
              <div className="space-y-4">
                {/* Chew Duration Scale */}
                {treatFeatures.chewDuration > 0 && (
                  <div className={`${treatFeatures.isChewPriority ? 'order-first' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">זמן לעיסה</span>
                      <span className="text-xs font-bold text-foreground">
                        {treatFeatures.chewDuration <= 2 ? 'קצר' : treatFeatures.chewDuration <= 3 ? 'בינוני' : treatFeatures.chewDuration <= 4 ? 'ארוך' : 'ארוך מאוד'}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(level => (
                        <motion.div
                          key={level}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.3 + level * 0.06 }}
                          className={`flex-1 h-3 rounded-full transition-colors ${
                            level <= treatFeatures.chewDuration
                              ? 'bg-primary'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Protein + Dental + Texture Row */}
                <div className="flex gap-2.5 flex-wrap">
                  {/* Protein Circular Badge */}
                  {treatFeatures.proteinPct && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.35, type: "spring", stiffness: 300 }}
                      className="flex flex-col items-center"
                    >
                      <div className="relative w-16 h-16">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15.5" fill="none"
                            className="stroke-primary"
                            strokeWidth="3"
                            strokeDasharray={`${treatFeatures.proteinPct} ${100 - treatFeatures.proteinPct}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-black text-primary">{treatFeatures.proteinPct}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-foreground mt-1">חלבון</span>
                    </motion.div>
                  )}

                  {/* Dental Care Badge */}
                  {treatFeatures.hasDental && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                      className={`flex flex-col items-center ${treatFeatures.isChewPriority ? 'order-first' : ''}`}
                    >
                      <div className="w-16 h-16 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center">
                        <Smile className="w-7 h-7 text-success" />
                      </div>
                      <span className="text-[10px] font-bold text-foreground mt-1">היגיינת שיניים</span>
                    </motion.div>
                  )}

                  {/* Texture Badge */}
                  {treatFeatures.texture && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.45, type: "spring", stiffness: 300 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center">
                        <Bone className="w-7 h-7 text-accent-foreground" />
                      </div>
                      <span className="text-[10px] font-bold text-foreground mt-1">{treatFeatures.texture}</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Treat Health Boosts (treats only) ── */}
        {isTreat && treatHealthBoosts.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                בוסטים בריאותיים
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {treatHealthBoosts.map((boost, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.06 }}
                    className="bg-gradient-to-br from-primary/8 to-transparent rounded-xl p-3.5 border border-primary/15 text-center"
                  >
                    <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                      {boost.icon}
                    </div>
                    <p className="text-[13px] font-bold text-foreground mb-0.5">{boost.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{boost.source}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Treat Usage Guide (treats only) ── */}
        {isTreat && (treatUsage.purpose || treatUsage.safetyTip) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Cookie className="w-4 h-4 text-primary" />
                מדריך שימוש
              </h3>
              <div className="space-y-2.5">
                {treatUsage.purpose && (
                  <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3 border border-border/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bone className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">ייעוד</p>
                      <p className="text-[13px] font-bold text-foreground">{treatUsage.purpose}</p>
                    </div>
                  </div>
                )}
                {treatUsage.safetyTip && (
                  <div className="flex items-center gap-3 bg-warning/8 rounded-xl p-3 border border-warning/20">
                    <div className="w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">טיפ בטיחות</p>
                      <p className="text-[13px] font-bold text-foreground">{treatUsage.safetyTip}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-[hsl(200,80%,95%)]/60 dark:bg-[hsl(200,40%,15%)] rounded-xl p-3 border border-[hsl(200,60%,70%)]/20">
                  <div className="w-8 h-8 rounded-full bg-[hsl(200,70%,80%)]/20 flex items-center justify-center flex-shrink-0">
                    <GlassWater className="w-4 h-4 text-[hsl(200,60%,45%)]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">תזכורת</p>
                    <p className="text-[13px] font-bold text-foreground">הקפידו על מים טריים לאחר החטיף 💧</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Natural Ingredients Claim (treats only) ── */}
        {isTreat && treatUsage.isNatural && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4 bg-gradient-to-br from-success/10 to-background border-success/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">🌿 מרכיבים טבעיים</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">ללא חומרים משמרים, צבעי מאכל מלאכותיים או תוספים כימיים</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}


        {/* ── Superfood Treat: Vitality Benefits ── */}
        {isSuperfood && superfoodFeatures.vitalityBenefits.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[hsl(45,90%,50%)]" />
                💪 יתרונות בריאותיים
              </h3>
              <div className="space-y-2">
                {superfoodFeatures.vitalityBenefits.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.34 + i * 0.06 }}
                    className="flex items-start gap-3 rounded-lg p-3"
                    style={{ backgroundColor: `${b.color}10` }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${b.color}20`, color: b.color }}>
                      {b.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{b.title}</p>
                      <p className="text-[11px] text-muted-foreground">{b.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Superfood Treat: Feeding Guide ── */}
        {isSuperfood && superfoodFeatures.feedingGuide.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                📋 מדריך הגשה יומי
              </h3>
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="grid grid-cols-3 bg-primary/10 dark:bg-primary/15 text-[11px] font-bold text-foreground p-2 text-center">
                  <span>גודל הכלב</span>
                  <span>משקל</span>
                  <span>כמות מומלצת</span>
                </div>
                {superfoodFeatures.feedingGuide.map((row, i) => (
                  <div key={i} className={`grid grid-cols-3 text-[11px] text-center p-2.5 ${i % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}>
                    <span className="font-semibold text-foreground">{row.size}</span>
                    <span className="text-muted-foreground">{row.weight}</span>
                    <span className="font-medium text-primary">{row.amount}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Superfood Treat: Dehydration Tech Note ── */}
        {isSuperfood && superfoodFeatures.dehydrationNote && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(30,50%,93%)] to-background border-[hsl(30,40%,60%)]/20 dark:from-[hsl(30,25%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[hsl(30,45%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Thermometer className="w-5 h-5 text-[hsl(30,60%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🔬 טכנולוגיית ייבוש</p>
                  <p className="text-[11px] text-muted-foreground">{superfoodFeatures.dehydrationNote}</p>
                  {superfoodFeatures.proteinPct && (
                    <span className="inline-block mt-1 text-[10px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      חלבון: {superfoodFeatures.proteinPct}%+
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Superfood Treat: 100% Natural Badge ── */}
        {isSuperfood && superfoodFeatures.isNatural100 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Card className="p-4 bg-gradient-to-br from-success/10 to-background border-success/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-[14px] font-black text-foreground">🌿 100% רכיבים טבעיים</p>
                  <p className="text-[11px] text-muted-foreground">ללא חומרים משמרים, צבעי מאכל מלאכותיים או תוספים כימיים</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Superfood Treat: Cross-Sell for Sensitive/Weight ── */}
        {isSuperfood && superfoodFeatures.crossSellSuggestions.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(210,45%,93%)] to-background border-[hsl(210,35%,60%)]/20 dark:from-[hsl(210,25%,14%)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[hsl(210,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-[hsl(210,50%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🎯 מתאים במיוחד עבור:</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {superfoodFeatures.crossSellSuggestions.map((s, i) => (
                      <span key={i} className="text-[10px] bg-primary/10 text-primary font-semibold rounded-full px-2.5 py-0.5">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Superfood Treat: Soulmate Message ── */}
        {isSuperfood && superfoodFeatures.soulmateMessage && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="text-center py-3">
              <p className="text-[13px] font-bold text-muted-foreground italic">"🐾 {superfoodFeatures.soulmateMessage}"</p>
            </div>
          </motion.div>
        )}

        {/* ── Joint Supplement: Two-Stage Dosage Calculator ── */}
        {isJointSupplement && jointFeatures.dosagePhases.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                💊 מחשבון מינון דו-שלבי
              </h3>
              {jointFeatures.dosagePhases.map((phase, pi) => (
                <div key={pi} className="mb-3 last:mb-0">
                  <div className={`flex items-center gap-2 mb-2 text-[12px] font-bold ${pi === 0 ? 'text-primary' : 'text-[hsl(140,50%,40%)]'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${pi === 0 ? 'bg-primary' : 'bg-[hsl(140,50%,40%)]'}`}>
                      {pi + 1}
                    </div>
                    {phase.name}
                  </div>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <div className="grid grid-cols-2 bg-muted/50 text-[10px] font-bold text-foreground p-2 text-center">
                      <span>משקל הכלב</span>
                      <span>מינון יומי</span>
                    </div>
                    {phase.rows.map((row, ri) => (
                      <div key={ri} className={`grid grid-cols-2 text-[11px] text-center p-2 ${ri % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                        <span className="font-medium text-foreground">{row.weight}</span>
                        <span className="font-semibold text-primary">{row.dose}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          </motion.div>
        )}

        {/* ── Joint Supplement: Active Ingredients Table ── */}
        {isJointSupplement && jointFeatures.ingredients.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <FlaskConical className="w-4 h-4 text-[hsl(270,50%,50%)]" />
                🔬 רכיבים פעילים
              </h3>
              <div className="space-y-2">
                {jointFeatures.ingredients.map((ing, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.28 + i * 0.05 }}
                    className="flex items-start gap-3 rounded-lg p-3 bg-[hsl(270,40%,95%)]/40 dark:bg-[hsl(270,25%,15%)]/40"
                  >
                    <div className="w-9 h-9 rounded-full bg-[hsl(270,40%,80%)]/20 flex items-center justify-center flex-shrink-0 text-[hsl(270,50%,50%)]">
                      {ing.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-bold text-foreground">{ing.name}</p>
                        {ing.dosage && <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">{ing.dosage}</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{ing.benefit}</p>
                      {ing.isSecret && <span className="inline-block mt-1 text-[9px] font-bold bg-[hsl(45,80%,50%)]/15 text-[hsl(45,80%,40%)] rounded px-1.5 py-0.5">🌟 המרכיב הסודי</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Supplement: Mobility Benefits Icons ── */}
        {isJointSupplement && jointFeatures.mobilityBenefits.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-[hsl(200,60%,45%)]" />
                🦴 יתרונות לתנועתיות
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {jointFeatures.mobilityBenefits.map((mb, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.36 + i * 0.05 }}
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{ backgroundColor: `${mb.color}10` }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${mb.color}20`, color: mb.color }}>
                      {mb.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{mb.title}</p>
                      <p className="text-[11px] text-muted-foreground">{mb.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Supplement: Human Comparison Tag ── */}
        {isJointSupplement && jointFeatures.humanComparison && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(45,60%,92%)] to-background border-[hsl(45,50%,60%)]/20 dark:from-[hsl(45,30%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(45,50%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-[hsl(45,70%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🏆 השוואה מוכרת</p>
                  <p className="text-[11px] text-muted-foreground">{jointFeatures.humanComparison}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Supplement: Insurance Tip ── */}
        {isJointSupplement && jointFeatures.insuranceTip && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(200,50%,92%)] to-background border-[hsl(200,40%,60%)]/20 dark:from-[hsl(200,25%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(200,45%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <ShieldPlus className="w-5 h-5 text-[hsl(200,55%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">💡 טיפ ביטוחי – Libra</p>
                  <p className="text-[11px] text-muted-foreground">{jointFeatures.insuranceTip}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Omega Liquid: Benefits Wheel ── */}
        {isOmegaLiquid && omegaFeatures.benefits.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Droplets className="w-4 h-4 text-[hsl(200,60%,50%)]" />
                🐟 יתרונות אומגה 3
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {omegaFeatures.benefits.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.24 + i * 0.05 }}
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{ backgroundColor: `${b.color}10` }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${b.color}20`, color: b.color }}>
                      {b.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{b.title}</p>
                      <p className="text-[11px] text-muted-foreground">{b.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Omega Liquid: Serving Suggestion ── */}
        {isOmegaLiquid && omegaFeatures.servingSuggestion && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(35,50%,92%)] to-background border-[hsl(35,40%,60%)]/20 dark:from-[hsl(35,25%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(35,50%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Utensils className="w-5 h-5 text-[hsl(35,60%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🍽️ הצעת הגשה – The Topper</p>
                  <p className="text-[11px] text-muted-foreground">{omegaFeatures.servingSuggestion}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Omega Liquid: Purity Badge ── */}
        {isOmegaLiquid && omegaFeatures.purityBadge && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(200,50%,92%)] to-background border-[hsl(200,40%,60%)]/20 dark:from-[hsl(200,25%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(200,45%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-[hsl(200,55%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🏅 טוהר מוכח</p>
                  <p className="text-[11px] font-semibold text-primary">{omegaFeatures.purityBadge}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Omega Liquid: Multi-Pet + Life Stage Tags ── */}
        {isOmegaLiquid && (omegaFeatures.isMultiPet || omegaFeatures.lifeStageTags.length > 0) && (
          <motion.div className="mx-4 mt-3 flex flex-wrap gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}>
            {omegaFeatures.isMultiPet && (
              <Badge variant="outline" className="text-[11px] border-[hsl(140,40%,50%)]/40 text-[hsl(140,40%,40%)] bg-[hsl(140,40%,90%)]/30 dark:bg-[hsl(140,25%,15%)]/40">
                🐾 מתאים לכלבים ולחתולים כאחד
              </Badge>
            )}
            {omegaFeatures.lifeStageTags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[11px] border-[hsl(270,40%,55%)]/30 text-[hsl(270,40%,45%)] bg-[hsl(270,40%,92%)]/30 dark:bg-[hsl(270,25%,15%)]/40">
                {i === 0 ? '🐶' : '🦴'} {tag}
              </Badge>
            ))}
          </motion.div>
        )}

        {/* ── Omega Liquid: Cross-Sell Hints ── */}
        {isOmegaLiquid && omegaFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                💡 טיפים לשימוש
              </h3>
              <div className="space-y-1.5">
                {omegaFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Travel Carrier: Expandable Badge ── */}
        {isTravelCarrier && carrierFeatures.isExpandable && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(260,45%,92%)] to-background border-[hsl(260,35%,60%)]/20 dark:from-[hsl(260,25%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(260,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Maximize2 className="w-5 h-5 text-[hsl(260,50%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🧳 עיצוב מתרחב חכם</p>
                  <p className="text-[11px] text-muted-foreground">התיק מתרחב בקלות כדי לספק יותר מרחב מנוחה לחיית המחמד שלכם</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Travel Carrier: Readiness Checklist ── */}
        {isTravelCarrier && carrierFeatures.readinessChecklist.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Plane className="w-4 h-4 text-[hsl(200,60%,50%)]" />
                ✈️ צ'קליסט מוכנות לנסיעה
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {carrierFeatures.readinessChecklist.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.24 + i * 0.05 }}
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{ backgroundColor: `${item.color}10` }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Travel Carrier: Capacity & Dimensions ── */}
        {isTravelCarrier && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Ruler className="w-4 h-4 text-[hsl(35,60%,45%)]" />
                📐 מידות וקיבולת
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {carrierFeatures.maxWeightKg && (
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">משקל מקסימלי</p>
                    <p className="text-lg font-black text-primary">{carrierFeatures.maxWeightKg} ק"ג</p>
                  </div>
                )}
                {carrierFeatures.dimensions && (
                  <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">מידות (סגור)</p>
                    <p className="text-[13px] font-bold text-foreground">{carrierFeatures.dimensions}</p>
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[11px] border-[hsl(200,40%,55%)]/30 text-[hsl(200,40%,45%)]">
                  🐾 {carrierFeatures.targetPets}
                </Badge>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Travel Carrier: Maintenance Card ── */}
        {isTravelCarrier && (carrierFeatures.isWashable || carrierFeatures.hasHardBottom) && (
          <motion.div className="mx-4 mt-3 flex flex-wrap gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
            {carrierFeatures.isWashable && (
              <Badge variant="outline" className="text-[11px] border-[hsl(200,40%,55%)]/30 text-[hsl(200,40%,45%)] bg-[hsl(200,40%,92%)]/30 dark:bg-[hsl(200,25%,15%)]/40">
                🧼 חומר רחיץ וקל לניקוי
              </Badge>
            )}
            {carrierFeatures.hasHardBottom && (
              <Badge variant="outline" className="text-[11px] border-[hsl(35,40%,55%)]/30 text-[hsl(35,40%,45%)] bg-[hsl(35,40%,92%)]/30 dark:bg-[hsl(35,25%,15%)]/40">
                🪨 תחתית קשיחה ליציבות
              </Badge>
            )}
          </motion.div>
        )}

        {/* ── Travel Carrier: Pro Tip ── */}
        {isTravelCarrier && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(45,55%,92%)] to-background border-[hsl(45,45%,60%)]/20 dark:from-[hsl(45,25%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(45,50%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-[hsl(45,70%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">💡 Pro Tip</p>
                  <p className="text-[11px] text-muted-foreground">{carrierFeatures.proTip}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Travel Carrier: Cross-Sell ── */}
        {isTravelCarrier && carrierFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                🎒 השלימו את ערכת הנסיעה
              </h3>
              <div className="space-y-1.5">
                {carrierFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Diabetic: Veterinary Warning ── */}
        {isDiabetic && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="p-3 border-[hsl(0,60%,50%)]/30 bg-[hsl(0,50%,95%)]/50 dark:bg-[hsl(0,30%,12%)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(0,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-[hsl(0,60%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[hsl(0,60%,45%)]">🚨 מוצר רפואי ייעודי</p>
                  <p className="text-[11px] text-foreground font-medium">{diabeticFeatures.vetWarning}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Diabetic: Blood Sugar Regulator Badge ── */}
        {isDiabetic && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(200,30%,95%)] to-background border-[hsl(200,35%,60%)]/20 dark:from-[hsl(200,20%,14%)]">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-[hsl(200,60%,45%)]" />
                🩸 ויסות סוכר בדם
              </h3>
              <div className="mt-2 rounded-lg p-3 bg-[hsl(200,50%,45%)]/8 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">מדד גליקמי</p>
                <p className="text-[22px] font-black text-[hsl(200,60%,45%)]">{diabeticFeatures.bloodSugar.glycemicIndex}</p>
                <p className="text-[10px] font-semibold text-[hsl(140,50%,40%)] mt-1">{diabeticFeatures.bloodSugar.carbSource}</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">{diabeticFeatures.bloodSugar.mechanism}</p>
            </Card>
          </motion.div>
        )}

        {/* ── Diabetic: Muscle vs Fat Dashboard ── */}
        {isDiabetic && diabeticFeatures.muscleFat.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-[hsl(200,55%,45%)]" />
                💪 שריר מול שומן
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {diabeticFeatures.muscleFat.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                    className="rounded-lg p-3 text-center" style={{ backgroundColor: `${m.color}10` }}>
                    <p className="text-[10px] text-muted-foreground mb-1">{m.label}</p>
                    <p className="text-[20px] font-black" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{m.description}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Diabetic: Fiber Satiety Meter ── */}
        {isDiabetic && diabeticFeatures.fiberTech.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Salad className="w-4 h-4 text-[hsl(140,50%,40%)]" />
                🌿 מד שובע – סיבים תזונתיים
              </h3>
              <div className="space-y-2">
                {diabeticFeatures.fiberTech.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: `${f.color}10` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${f.color}20`, color: f.color }}>
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{f.title}</p>
                      <p className="text-[11px] text-muted-foreground">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Diabetic: Joint Support Bonus ── */}
        {isDiabetic && diabeticFeatures.jointNote && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(35,35%,93%)] to-background border-[hsl(35,30%,60%)]/20 dark:from-[hsl(35,20%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(35,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Bone className="w-5 h-5 text-[hsl(35,55%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🦴 בונוס מפרקים</p>
                  <p className="text-[11px] text-muted-foreground">{diabeticFeatures.jointNote}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Diabetic: Feeding & Timing Pro-Tip ── */}
        {isDiabetic && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(45,45%,92%)] to-background border-[hsl(45,40%,55%)]/20 dark:from-[hsl(45,20%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(45,45%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Timer className="w-5 h-5 text-[hsl(45,60%,40%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">⏰ Pro-Tip: תזמון ארוחות</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{diabeticFeatures.feedingTip}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Diabetic: Feeding Matrix ── */}
        {isDiabetic && diabeticFeatures.feedingMatrix.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                🧮 טבלת מינון יומי
              </h3>
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="grid grid-cols-2 bg-muted/50 text-[10px] font-bold text-foreground p-2 text-center">
                  <span>משקל</span>
                  <span>גרמים ליום</span>
                </div>
                {diabeticFeatures.feedingMatrix.map((row, ri) => (
                  <div key={ri} className={`grid grid-cols-2 text-[11px] text-center p-1.5 ${ri % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                    <span className="font-bold text-foreground">{row.weight}</span>
                    <span className="text-[hsl(200,55%,45%)] font-semibold">{row.grams}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Diabetic: Cross-Sell ── */}
        {isDiabetic && diabeticFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                💡 משלימים מומלצים
              </h3>
              <div className="space-y-1.5">
                {diabeticFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Renal: Veterinary Warning ── */}
        {isRenal && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="p-3 border-[hsl(0,60%,50%)]/30 bg-[hsl(0,50%,95%)]/50 dark:bg-[hsl(0,30%,12%)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(0,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-[hsl(0,60%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[hsl(0,60%,45%)]">🚨 מוצר רפואי ייעודי</p>
                  <p className="text-[11px] text-foreground font-medium">{renalFeatures.vetWarning}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Renal: Hydration Alert ── */}
        {isRenal && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <Card className="p-3 border-[hsl(200,60%,50%)]/30 bg-[hsl(200,50%,95%)]/50 dark:bg-[hsl(200,30%,12%)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(200,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <Droplets className="w-5 h-5 text-[hsl(200,60%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[hsl(200,60%,45%)]">💧 התראת הידרציה</p>
                  <p className="text-[11px] text-foreground font-medium leading-relaxed">{renalFeatures.hydrationAlert}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Renal: Kidney Relief Dashboard ── */}
        {isRenal && renalFeatures.lowLoad.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(200,30%,95%)] to-background border-[hsl(200,35%,60%)]/20 dark:from-[hsl(200,20%,14%)]">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-[hsl(200,55%,45%)]" />
                🩺 דשבורד הקלה על הכליות – אסטרטגיית Low-Load
              </h3>
              <div className="space-y-2">
                {renalFeatures.lowLoad.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.06 }}
                    className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: `${item.color}10` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: `${item.color}20` }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Renal: Metabolic pH Balance ── */}
        {isRenal && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-[hsl(280,45%,50%)]" />
                ⚖️ איזון pH מטבולי
              </h3>
              <div className="rounded-lg p-3 bg-[hsl(280,40%,50%)]/8">
                <p className="text-[12px] font-bold text-foreground">{renalFeatures.phBalance.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{renalFeatures.phBalance.description}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Renal: Inflammation Shield (Omega-3) ── */}
        {isRenal && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(170,30%,93%)] to-background border-[hsl(170,35%,55%)]/20 dark:from-[hsl(170,20%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(170,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Fish className="w-5 h-5 text-[hsl(170,50%,40%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🛡️ מגן דלקת – Omega-3</p>
                  <p className="text-[11px] text-muted-foreground">{renalFeatures.omega3Note}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Renal: Transition Guide ── */}
        {isRenal && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(45,45%,92%)] to-background border-[hsl(45,40%,55%)]/20 dark:from-[hsl(45,20%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(45,45%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Timer className="w-5 h-5 text-[hsl(45,60%,40%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">📅 מעבר הדרגתי: {renalFeatures.transitionDays}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{renalFeatures.transitionNote}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Renal: Feeding Matrix ── */}
        {isRenal && renalFeatures.feedingMatrix.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                🧮 טבלת מינון יומי – Renal
              </h3>
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="grid grid-cols-2 bg-muted/50 text-[10px] font-bold text-foreground p-2 text-center">
                  <span>משקל</span>
                  <span>גרמים ליום</span>
                </div>
                {renalFeatures.feedingMatrix.map((row, ri) => (
                  <div key={ri} className={`grid grid-cols-2 text-[11px] text-center p-1.5 ${ri % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                    <span className="font-bold text-foreground">{row.weight}</span>
                    <span className="text-[hsl(200,55%,45%)] font-semibold">{row.grams}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Renal: Cross-Sell ── */}
        {isRenal && renalFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                💡 משלימים מומלצים
              </h3>
              <div className="space-y-1.5">
                {renalFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Food: Veterinary Warning ── */}
        {isJointFood && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="p-3 border-[hsl(0,60%,50%)]/30 bg-[hsl(0,50%,95%)]/50 dark:bg-[hsl(0,30%,12%)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(0,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-[hsl(0,60%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[hsl(0,60%,45%)]">🚨 מוצר רפואי ייעודי</p>
                  <p className="text-[11px] text-foreground font-medium">{jointFoodFeatures.vetWarning}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Food: Cartilage Support Dashboard ── */}
        {isJointFood && jointFoodFeatures.cartilage.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(200,30%,95%)] to-background border-[hsl(200,35%,60%)]/20 dark:from-[hsl(200,20%,14%)]">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Bone className="w-4 h-4 text-[hsl(200,55%,45%)]" />
                🦴 דשבורד תמיכת סחוס – Build & Protect
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {jointFoodFeatures.cartilage.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
                    className="rounded-lg p-3 text-center" style={{ backgroundColor: `${c.color}10` }}>
                    <p className="text-[10px] text-muted-foreground mb-1">{c.label}</p>
                    <p className="text-[20px] font-black" style={{ color: c.color }}>{c.value}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{c.description}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Food: Inflammation Control Bar ── */}
        {isJointFood && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Fish className="w-4 h-4 text-[hsl(170,50%,40%)]" />
                🛡️ בקרת דלקת – Omega-3
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="rounded-lg p-2.5 text-center bg-[hsl(170,40%,45%)]/8">
                  <p className="text-[9px] text-muted-foreground">Omega-3</p>
                  <p className="text-[18px] font-black text-[hsl(170,50%,40%)]">{jointFoodFeatures.inflammation.omega3}</p>
                </div>
                <div className="rounded-lg p-2.5 text-center bg-[hsl(200,40%,45%)]/8">
                  <p className="text-[9px] text-muted-foreground">EPA</p>
                  <p className="text-[18px] font-black text-[hsl(200,55%,45%)]">{jointFoodFeatures.inflammation.epa}</p>
                </div>
                <div className="rounded-lg p-2.5 text-center bg-[hsl(280,35%,50%)]/8">
                  <p className="text-[9px] text-muted-foreground">DHA</p>
                  <p className="text-[18px] font-black text-[hsl(280,45%,50%)]">{jointFoodFeatures.inflammation.dha}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">{jointFoodFeatures.inflammation.description}</p>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Food: Weight-Joint Correlation ── */}
        {isJointFood && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(35,35%,93%)] to-background border-[hsl(35,30%,60%)]/20 dark:from-[hsl(35,20%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(35,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-5 h-5 text-[hsl(35,55%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">⚖️ קשר משקל-מפרקים</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{jointFoodFeatures.weightJoint}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Food: Target Audience ── */}
        {isJointFood && jointFoodFeatures.audiences.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                🎯 מתאים במיוחד ל:
              </h3>
              <div className="space-y-2">
                {jointFoodFeatures.audiences.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg p-2.5 bg-muted/30">
                    <span className="text-lg flex-shrink-0">{a.icon}</span>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{a.label}</p>
                      <p className="text-[10px] text-muted-foreground">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Food: Expert Tip ── */}
        {isJointFood && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(45,45%,92%)] to-background border-[hsl(45,40%,55%)]/20 dark:from-[hsl(45,20%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(45,45%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-[hsl(45,60%,40%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">💡 Pro Tip</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{jointFoodFeatures.expertTip}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Food: Analysis Grid ── */}
        {isJointFood && jointFoodFeatures.analysis.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary" />
                📊 ניתוח תזונתי
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {jointFoodFeatures.analysis.map((a, i) => (
                  <div key={i} className="rounded-lg p-3 text-center bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">{a.label}</p>
                    <p className="text-[20px] font-black text-primary">{a.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">{jointFoodFeatures.caPhNote}</p>
            </Card>
          </motion.div>
        )}

        {/* ── Joint Food: Cross-Sell ── */}
        {isJointFood && jointFoodFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                💡 חבילת טיפול משלימה
              </h3>
              <div className="space-y-1.5">
                {jointFoodFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hepatic: Veterinary Warning ── */}
        {isHepatic && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="p-3 border-[hsl(0,60%,50%)]/30 bg-[hsl(0,50%,95%)]/50 dark:bg-[hsl(0,30%,12%)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(0,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-[hsl(0,60%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[hsl(0,60%,45%)]">🚨 מוצר רפואי ייעודי</p>
                  <p className="text-[11px] text-foreground font-medium">{hepaticFeatures.vetWarning}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hepatic: Liver Detox Dashboard ── */}
        {isHepatic && hepaticFeatures.lowLoad.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(35,30%,95%)] to-background border-[hsl(35,35%,60%)]/20 dark:from-[hsl(35,20%,14%)]">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-[hsl(35,55%,45%)]" />
                🫀 דשבורד ניקוי כבד – Reduced Load
              </h3>
              <div className="space-y-2">
                {hepaticFeatures.lowLoad.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}
                    className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: `${item.color}10` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: `${item.color}20` }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hepatic: Energy & Bioavailability ── */}
        {isHepatic && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-[hsl(45,60%,45%)]" />
                ⚡ אנרגיה וזמינות ביולוגית
              </h3>
              <div className="rounded-lg p-3 bg-[hsl(45,50%,45%)]/8">
                <p className="text-[12px] font-bold text-foreground">{hepaticFeatures.energyBar.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{hepaticFeatures.energyBar.description}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hepatic: Anti-Inflammatory Shield ── */}
        {isHepatic && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(170,30%,93%)] to-background border-[hsl(170,35%,55%)]/20 dark:from-[hsl(170,20%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(170,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Fish className="w-5 h-5 text-[hsl(170,50%,40%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🛡️ מגן דלקת – Omega-3 ({hepaticFeatures.omega3.value})</p>
                  <p className="text-[11px] text-muted-foreground">{hepaticFeatures.omega3.description}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hepatic: Digestive Synergy ── */}
        {isHepatic && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(140,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Salad className="w-5 h-5 text-[hsl(140,50%,40%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🌿 סינרגיית עיכול</p>
                  <p className="text-[11px] text-muted-foreground">{hepaticFeatures.digestiveSynergy}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hepatic: Target Conditions ── */}
        {isHepatic && hepaticFeatures.conditions.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                🎯 מתאים למצבים:
              </h3>
              <div className="space-y-2">
                {hepaticFeatures.conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg p-2.5 bg-muted/30">
                    <span className="text-lg flex-shrink-0">{c.icon}</span>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{c.label}</p>
                      <p className="text-[10px] text-muted-foreground">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hepatic: Cross-Sell ── */}
        {isHepatic && hepaticFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                💡 משלימים מומלצים
              </h3>
              <div className="space-y-1.5">
                {hepaticFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Breed-Specific Intelligence V15 ── */}
        {breedIntelligence && breedIntelligence.score > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(45,45%,93%)] to-background border-[hsl(45,40%,60%)]/20 dark:from-[hsl(45,20%,14%)]">
              {/* Breed Essential Badge + Smart Tag */}
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                {breedIntelligence.smartTag && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(200,55%,92%)]/60 text-[hsl(200,55%,35%)] text-[10px] font-medium border border-[hsl(200,50%,60%)]/20 dark:bg-[hsl(200,30%,18%)]/50 dark:text-[hsl(200,50%,70%)]">
                    <Target className="w-3 h-3" />
                    {breedIntelligence.smartTag}
                  </span>
                )}
                {breedIntelligence.isBreedEssential && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(45,70%,50%)]/15 text-[hsl(45,70%,35%)] text-[11px] font-bold border border-[hsl(45,60%,50%)]/20 mr-auto">
                    <Sparkles className="w-3.5 h-3.5" />
                    חיוני לגזע שלך
                  </span>
                )}
              </div>

              {/* Personalized Greeting */}
              {breedIntelligence.greeting && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[hsl(45,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                    <PawPrint className="w-5 h-5 text-[hsl(45,60%,40%)]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-foreground">🐾 המלצה מותאמת ל{breedIntelligence.petName}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{breedIntelligence.greeting}</p>
                  </div>
                </div>
              )}

              {/* ── "Why for your Breed" Box ── */}
              {breedIntelligence.whyForBreed && (
                <div className="mt-2 mb-3 p-3 rounded-xl bg-[hsl(45,30%,96%)]/60 border border-[hsl(45,35%,70%)]/15 dark:bg-[hsl(45,15%,12%)]/60">
                  <p className="text-[11px] font-bold text-[hsl(45,50%,35%)] dark:text-[hsl(45,40%,65%)] mb-1 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" />
                    למה מתאים לגזע שלך?
                  </p>
                  <p className="text-[11px] text-foreground leading-relaxed">{breedIntelligence.whyForBreed}</p>
                </div>
              )}

              {/* Breed-Specific Tips */}
              {breedIntelligence.tips.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-[11px] font-bold text-muted-foreground">מידע גנטי ל{breedIntelligence.breedHe || breedIntelligence.petBreed}:</p>
                  {breedIntelligence.tips.map((tip, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.05 }}
                      className="flex items-center gap-3 rounded-lg p-2.5 bg-muted/30">
                      <span className="text-lg flex-shrink-0">{tip.icon}</span>
                      <div>
                        <p className="text-[12px] font-bold text-foreground">{tip.label}</p>
                        <p className="text-[10px] text-muted-foreground">{tip.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Health Issues from Breed */}
              {breedIntelligence.healthIssuesHe.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {breedIntelligence.healthIssuesHe.map((issue, i) => (
                    <span key={i} className="px-2 py-1 rounded-full bg-[hsl(0,40%,90%)]/50 text-[hsl(0,45%,40%)] text-[10px] font-medium dark:bg-[hsl(0,30%,20%)]/50 dark:text-[hsl(0,40%,70%)]">
                      ⚕️ {issue}
                    </span>
                  ))}
                </div>
              )}

              {/* Deep-Chested Bloat Warning */}
              {breedIntelligence.isDeepChest && (
                <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-[hsl(30,60%,90%)]/50 border border-[hsl(30,50%,60%)]/20 dark:bg-[hsl(30,30%,15%)]/50">
                  <span className="text-lg">⚠️</span>
                  <p className="text-[11px] text-foreground font-medium">
                    התראת היפוך קיבה (GDV) – חלקו את המנה ל-2-3 ארוחות והשתמשו בקערת האכלה איטית
                  </p>
                </div>
              )}

              {/* Brachy Respiratory Alert */}
              {breedIntelligence.isBrachy && (
                <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-[hsl(200,50%,92%)]/50 border border-[hsl(200,40%,60%)]/20 dark:bg-[hsl(200,25%,15%)]/50">
                  <span className="text-lg">👃</span>
                  <p className="text-[11px] text-foreground font-medium">
                    גזע ברכיצפלי – הקפידו על משקל תקין, קיבל קטן ומנוחה בחום. הימנעו ממאמץ מוגזם.
                  </p>
                </div>
              )}

              {/* White/Long Coat Alert */}
              {breedIntelligence.isWhiteCoat && (
                <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-[hsl(280,30%,93%)]/50 border border-[hsl(280,30%,70%)]/20 dark:bg-[hsl(280,20%,15%)]/50">
                  <span className="text-lg">🤍</span>
                  <p className="text-[11px] text-foreground font-medium">
                    פרווה בהירה – השתמשו במוצרי הלבנה ייעודיים ובדקו כתמי דמעות באופן שוטף
                  </p>
                </div>
              )}

              {/* Active/Working Recovery Alert */}
              {breedIntelligence.isActiveWorking && (
                <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-[hsl(140,40%,92%)]/50 border border-[hsl(140,35%,55%)]/20 dark:bg-[hsl(140,20%,15%)]/50">
                  <span className="text-lg">⚡</span>
                  <p className="text-[11px] text-foreground font-medium">
                    גזע עבודה/ספורט – חלבון גבוה ואומגה-3 חיוניים לשיקום שרירים ומפרקים לאחר פעילות
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ── Cardiac: Veterinary Warning ── */}
        {isCardiac && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="p-3 border-[hsl(0,60%,50%)]/30 bg-[hsl(0,50%,95%)]/50 dark:bg-[hsl(0,30%,12%)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(0,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-[hsl(0,60%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[hsl(0,60%,45%)]">🚨 מוצר רפואי ייעודי</p>
                  <p className="text-[11px] text-foreground font-medium">{cardiacFeatures.vetWarning}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Cardiac: Heart Health Dashboard ── */}
        {isCardiac && cardiacFeatures.heartPillars.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(350,30%,95%)] to-background border-[hsl(350,35%,60%)]/20 dark:from-[hsl(350,20%,14%)]">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <HeartPulse className="w-4 h-4 text-[hsl(350,55%,50%)]" />
                ❤️ דשבורד בריאות הלב – Cardiac Support
              </h3>
              <div className="space-y-2">
                {cardiacFeatures.heartPillars.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}
                    className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: `${item.color}10` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: `${item.color}20` }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Cardiac: Fit-aroma Technology ── */}
        {isCardiac && cardiacFeatures.fitAroma && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(45,40%,92%)] to-background border-[hsl(45,35%,55%)]/20 dark:from-[hsl(45,20%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(45,45%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-[hsl(45,60%,40%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">✨ {cardiacFeatures.fitAroma.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{cardiacFeatures.fitAroma.description}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Cardiac: Gut-Heart Axis ── */}
        {isCardiac && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(140,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Salad className="w-5 h-5 text-[hsl(140,50%,40%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🌿 ציר מעי-לב (Gut-Heart Axis)</p>
                  <p className="text-[11px] text-muted-foreground">{cardiacFeatures.gutHeart}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Cardiac: Target Conditions ── */}
        {isCardiac && cardiacFeatures.conditions.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                🎯 מתאים למצבים:
              </h3>
              <div className="space-y-2">
                {cardiacFeatures.conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg p-2.5 bg-muted/30">
                    <span className="text-lg flex-shrink-0">{c.icon}</span>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{c.label}</p>
                      <p className="text-[10px] text-muted-foreground">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Cardiac: Feeding Tip ── */}
        {isCardiac && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(200,35%,93%)] to-background border-[hsl(200,30%,60%)]/20 dark:from-[hsl(200,20%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(200,45%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Timer className="w-5 h-5 text-[hsl(200,55%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">⏰ טיפ האכלה</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{cardiacFeatures.feedingTip}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Cardiac: Cross-Sell ── */}
        {isCardiac && cardiacFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                💡 משלימים מומלצים
              </h3>
              <div className="space-y-1.5">
                {cardiacFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Gastro: Veterinary Warning ── */}
        {isGastro && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="p-3 border-[hsl(0,60%,50%)]/30 bg-[hsl(0,50%,95%)]/50 dark:bg-[hsl(0,30%,12%)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(0,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-[hsl(0,60%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[hsl(0,60%,45%)]">⚠️ מזון רפואי</p>
                  <p className="text-[11px] text-foreground font-medium">{gastroFeatures.vetWarning}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Gastro: Hydration Note ── */}
        {isGastro && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(195,40%,93%)] to-background border-[hsl(195,35%,60%)]/20 dark:from-[hsl(195,25%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(195,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Droplets className="w-5 h-5 text-[hsl(195,55%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">💧 תזכורת הידרציה</p>
                  <p className="text-[11px] text-muted-foreground">{gastroFeatures.hydrationNote}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Gastro: Digestive Relief Dashboard ── */}
        {isGastro && gastroFeatures.pillars.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <HeartPulse className="w-4 h-4 text-[hsl(140,50%,40%)]" />
                🩺 3 עמודי ההחלמה
              </h3>
              <div className="space-y-2">
                {gastroFeatures.pillars.map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.24 + i * 0.05 }}
                    className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: `${p.color}10` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${p.color}20`, color: p.color }}>
                      {p.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{p.label}</p>
                      <p className="text-[11px] text-muted-foreground">{p.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Gastro: Symptom Matcher ── */}
        {isGastro && gastroFeatures.symptoms.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Stethoscope className="w-4 h-4 text-[hsl(270,45%,50%)]" />
                🎯 מתאים למצבים
              </h3>
              <div className="flex flex-wrap gap-2">
                {gastroFeatures.symptoms.map((s, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[hsl(270,35%,50%)]/10 text-[hsl(270,45%,45%)] border border-[hsl(270,35%,50%)]/15">
                    {s}
                  </span>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Gastro: Treatment Timeline ── */}
        {isGastro && gastroFeatures.timeline.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Milestone className="w-4 h-4 text-[hsl(35,60%,48%)]" />
                📅 ציר זמן טיפולי
              </h3>
              <div className="space-y-3">
                {gastroFeatures.timeline.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 + i * 0.08 }}
                    className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: t.color }}>{i + 1}</div>
                      {i < gastroFeatures.timeline.length - 1 && <div className="w-0.5 h-6 bg-border mt-1" />}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{t.stage}: {t.title}</p>
                      <p className="text-[10px] font-semibold" style={{ color: t.color }}>{t.duration}</p>
                      <p className="text-[11px] text-muted-foreground">{t.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Gastro: Feeding Matrix ── */}
        {isGastro && gastroFeatures.feedingMatrix.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                🧮 טבלת מינון יומי
              </h3>
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="grid grid-cols-2 bg-muted/50 text-[10px] font-bold text-foreground p-2 text-center">
                  <span>משקל</span>
                  <span>גרמים ליום</span>
                </div>
                {gastroFeatures.feedingMatrix.map((row, ri) => (
                  <div key={ri} className={`grid grid-cols-2 text-[11px] text-center p-1.5 ${ri % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                    <span className="font-bold text-foreground">{row.weight}</span>
                    <span className="text-[hsl(140,45%,40%)] font-semibold">{row.grams}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Gastro: Cross-Sell ── */}
        {isGastro && gastroFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                💡 משלימים מומלצים
              </h3>
              <div className="space-y-1.5">
                {gastroFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hypoallergenic: Veterinary Warning ── */}
        {isHypoallergenic && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="p-3 border-[hsl(0,60%,50%)]/30 bg-[hsl(0,50%,95%)]/50 dark:bg-[hsl(0,30%,12%)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(0,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-[hsl(0,60%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[hsl(0,60%,45%)]">🚨 מזון רפואי ייעודי</p>
                  <p className="text-[11px] text-foreground font-medium">{hypoFeatures.vetWarning}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hypoallergenic: Hydrolysis Science Badge ── */}
        {isHypoallergenic && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(270,25%,95%)] to-background border-[hsl(270,30%,65%)]/20 dark:from-[hsl(270,15%,14%)]">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <Atom className="w-4 h-4 text-[hsl(270,45%,50%)]" />
                🔬 חלבון מפורק – טכנולוגיית הידרוליזציה
              </h3>
              <div className="mt-2 rounded-lg p-3 bg-[hsl(270,35%,50%)]/8 text-center">
                <p className="text-[22px] font-black text-[hsl(270,45%,50%)]">{hypoFeatures.daltonSize} Dalton</p>
                <p className="text-[10px] text-muted-foreground mt-1">גודל מולקולרי – מתחת לסף הזיהוי של מערכת החיסון</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                החלבון מפורק לחלקיקים זעירים כך שמערכת החיסון לא מזהה אותם כאלרגנים – מניעת תגובה אלרגית ע״י פירוק מוחלט של מבנה החלבון.
              </p>
            </Card>
          </motion.div>
        )}

        {/* ── Hypoallergenic: Dermatology & Gut Dashboard ── */}
        {isHypoallergenic && hypoFeatures.skinBenefits.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <HeartPulse className="w-4 h-4 text-[hsl(350,50%,50%)]" />
                🩺 דשבורד עור ועיכול
              </h3>
              <div className="space-y-2">
                {hypoFeatures.skinBenefits.map((b, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: `${b.color}10` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${b.color}20`, color: b.color }}>
                      {b.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{b.label}</p>
                      <p className="text-[11px] text-muted-foreground">{b.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hypoallergenic: Elimination Diet Guide ── */}
        {isHypoallergenic && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(35,40%,93%)] to-background border-[hsl(35,35%,60%)]/20 dark:from-[hsl(35,20%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(35,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <TimerReset className="w-5 h-5 text-[hsl(35,55%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">📋 מדריך דיאטת אלימינציה</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{hypoFeatures.eliminationTimeline}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hypoallergenic: Clean Ingredient Highlight ── */}
        {isHypoallergenic && hypoFeatures.hasRiceStarch && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(45,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <Wheat className="w-5 h-5 text-[hsl(45,55%,40%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🌾 עמילן אורז – פחמימה נקייה</p>
                  <p className="text-[11px] text-muted-foreground">מקור פחמימות טהור עם פוטנציאל אלרגני מינימלי – למזעור תגובות</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hypoallergenic: Feeding Matrix ── */}
        {isHypoallergenic && hypoFeatures.feedingMatrix.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                🧮 טבלת מינון יומי
              </h3>
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="grid grid-cols-2 bg-muted/50 text-[10px] font-bold text-foreground p-2 text-center">
                  <span>משקל</span>
                  <span>גרמים ליום</span>
                </div>
                {hypoFeatures.feedingMatrix.map((row, ri) => (
                  <div key={ri} className={`grid grid-cols-2 text-[11px] text-center p-1.5 ${ri % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                    <span className="font-bold text-foreground">{row.weight}</span>
                    <span className="text-[hsl(270,45%,50%)] font-semibold">{row.grams}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Hypoallergenic: Cross-Sell ── */}
        {isHypoallergenic && hypoFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                💡 משלימים מומלצים
              </h3>
              <div className="space-y-1.5">
                {hypoFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Urinary: Veterinary Warning ── */}
        {isUrinary && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card className="p-3 border-[hsl(0,60%,50%)]/30 bg-[hsl(0,50%,95%)]/50 dark:bg-[hsl(0,30%,12%)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(0,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-[hsl(0,60%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[hsl(0,60%,45%)]">🚨 מרשם וטרינרי נדרש</p>
                  <p className="text-[11px] text-foreground font-medium">{urinaryFeatures.vetWarning}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Urinary: Action Badge ── */}
        {isUrinary && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4 bg-gradient-to-br from-[hsl(270,30%,95%)] to-background border-[hsl(270,35%,60%)]/20 dark:from-[hsl(270,20%,14%)]">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <FlaskConical className="w-4 h-4 text-[hsl(270,45%,50%)]" />
                🔬 פירוק אבני סטרוויט – פעולה כפולה
              </h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="rounded-lg p-3 text-center bg-[hsl(270,35%,50%)]/10">
                  <p className="text-[10px] text-muted-foreground mb-1">פעולה 1</p>
                  <p className="text-[12px] font-bold text-[hsl(270,45%,45%)]">המסת אבנים קיימות</p>
                </div>
                <div className="rounded-lg p-3 text-center bg-[hsl(140,40%,45%)]/10">
                  <p className="text-[10px] text-muted-foreground mb-1">פעולה 2</p>
                  <p className="text-[12px] font-bold text-[hsl(140,45%,40%)]">מניעת היווצרות חדשות</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Urinary: Controlled Mineral Grid ── */}
        {isUrinary && urinaryFeatures.mineralGrid.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-[hsl(200,55%,45%)]" />
                ⚗️ לוח בקרת מינרלים
              </h3>
              <div className="space-y-2">
                {urinaryFeatures.mineralGrid.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: `${m.color}10` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${m.color}20`, color: m.color }}>
                      {m.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Urinary: Treatment Timeline ── */}
        {isUrinary && urinaryFeatures.timeline.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Milestone className="w-4 h-4 text-[hsl(35,60%,50%)]" />
                📅 ציר זמן טיפולי
              </h3>
              <div className="space-y-3">
                {urinaryFeatures.timeline.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: t.color }}>{i + 1}</div>
                      {i < urinaryFeatures.timeline.length - 1 && <div className="w-0.5 h-6 bg-border mt-1" />}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{t.stage}: {t.title}</p>
                      <p className="text-[10px] font-semibold" style={{ color: t.color }}>{t.duration}</p>
                      <p className="text-[11px] text-muted-foreground">{t.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Urinary: Feeding Matrix ── */}
        {isUrinary && urinaryFeatures.feedingMatrix.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                🧮 טבלת מינון יומי
              </h3>
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="grid grid-cols-2 bg-muted/50 text-[10px] font-bold text-foreground p-2 text-center">
                  <span>משקל</span>
                  <span>גרמים ליום</span>
                </div>
                {urinaryFeatures.feedingMatrix.map((row, ri) => (
                  <div key={ri} className={`grid grid-cols-2 text-[11px] text-center p-1.5 ${ri % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                    <span className="font-bold text-foreground">{row.weight}</span>
                    <span className="text-[hsl(270,45%,50%)] font-semibold">{row.grams}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Urinary: Glucosamine Science ── */}
        {isUrinary && urinaryFeatures.glucosamineNote && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(195,40%,93%)] to-background border-[hsl(195,35%,60%)]/20 dark:from-[hsl(195,25%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(195,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <Beaker className="w-5 h-5 text-[hsl(195,55%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">🧬 מדע הרכיבים</p>
                  <p className="text-[11px] text-muted-foreground">{urinaryFeatures.glucosamineNote}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Urinary: Cross-Sell ── */}
        {isUrinary && urinaryFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                💡 משלימים מומלצים
              </h3>
              <div className="space-y-1.5">
                {urinaryFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Vet Diet: Veterinary Warning ── */}
        {isVetDiet && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <Card className="p-3 border-[hsl(0,60%,50%)]/30 bg-[hsl(0,50%,95%)]/50 dark:bg-[hsl(0,30%,12%)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(0,50%,85%)]/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-[hsl(0,60%,50%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[hsl(0,60%,45%)]">⚠️ אזהרה רפואית</p>
                  <p className="text-[11px] text-foreground font-medium">{vetDietFeatures.vetWarning}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Vet Diet: Triple-Condition Feeding Calculator ── */}
        {isVetDiet && vetDietFeatures.feedingMatrix.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                🧮 מחשבון האכלה רפואי משולש
              </h3>
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="grid grid-cols-4 bg-muted/50 text-[9px] font-bold text-foreground p-2 text-center">
                  <span>משקל</span>
                  <span>סוכרתי / תחזוקה</span>
                  <span>עודף קל (15-30%)</span>
                  <span>עודף חמור (&gt;30%)</span>
                </div>
                {vetDietFeatures.feedingMatrix.map((row, ri) => (
                  <div key={ri} className={`grid grid-cols-4 text-[10px] text-center p-1.5 ${ri % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}>
                    <span className="font-bold text-foreground">{row.weight}</span>
                    <span className="text-[hsl(200,60%,45%)] font-semibold">{row.diabetic}</span>
                    <span className="text-[hsl(35,60%,45%)] font-semibold">{row.light}</span>
                    <span className="text-[hsl(0,55%,50%)] font-semibold">{row.severe}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Vet Diet: Medical Indicators Bar ── */}
        {isVetDiet && vetDietFeatures.medicalIndicators.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-[hsl(270,50%,50%)]" />
                📊 מדדים רפואיים
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {vetDietFeatures.medicalIndicators.map((ind, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 + i * 0.05 }}
                    className="rounded-lg p-3 text-center" style={{ backgroundColor: `${ind.color}10` }}>
                    <p className="text-[10px] text-muted-foreground mb-1">{ind.label}</p>
                    <p className="text-[14px] font-black" style={{ color: ind.color }}>{ind.value}</p>
                    {ind.highlight && <span className="inline-block mt-1 text-[8px] font-bold rounded px-1.5 py-0.5" style={{ backgroundColor: `${ind.color}15`, color: ind.color }}>{ind.highlight}</span>}
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Vet Diet: Active Weight-Loss Tech ── */}
        {isVetDiet && vetDietFeatures.weightLossTech.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-[hsl(15,70%,50%)]" />
                🔥 טכנולוגיית הרזיה פעילה
              </h3>
              <div className="space-y-2">
                {vetDietFeatures.weightLossTech.map((tech, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.44 + i * 0.05 }}
                    className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: `${tech.color}10` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tech.color}20`, color: tech.color }}>
                      {tech.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">{tech.title}</p>
                      <p className="text-[11px] text-muted-foreground">{tech.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Vet Diet: Usage Timeline ── */}
        {isVetDiet && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="p-3 bg-gradient-to-br from-[hsl(200,45%,92%)] to-background border-[hsl(200,35%,60%)]/20 dark:from-[hsl(200,25%,14%)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(200,40%,80%)]/20 flex items-center justify-center flex-shrink-0">
                  <TimerReset className="w-5 h-5 text-[hsl(200,55%,45%)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">⏱️ משך שימוש מומלץ</p>
                  <p className="text-[11px] text-muted-foreground">{vetDietFeatures.usageTimeline}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Vet Diet: Cross-Sell ── */}
        {isVetDiet && vetDietFeatures.crossSellHints.length > 0 && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}>
            <Card className="p-3">
              <h3 className="text-[12px] font-bold text-foreground flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                💡 משלימים לדיאטה
              </h3>
              <div className="space-y-1.5">
                {vetDietFeatures.crossSellHints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-primary mt-0.5">●</span>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Health Benefits (non-treat) ── */}
        {hasBenefits && !isTreat && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Leaf className="w-4 h-4 text-primary" />
                יתרונות בריאותיים
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {product.benefits.map((b: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="bg-gradient-to-l from-primary/5 to-transparent rounded-xl p-3.5 border border-primary/10"
                  >
                    <p className="text-[13px] font-bold text-foreground mb-1">{b.title}</p>
                    <p className="text-[12px] text-muted-foreground leading-[1.7]">{b.description}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Data Missing Fallback (food products without key data) ── */}
        {!isAccessory && !hasNutritionData && !hasBenefits && !hasFeedingGuide && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4 border-warning/30 bg-warning/5 dark:bg-warning/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">נתונים חסרים</p>
                  <p className="text-[12px] text-muted-foreground">רכיבים, יתרונות וטבלת האכלה לא נמצאו – יש להזין ידנית באדמין</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Description ── */}
        {(product.subtitle || product.description) && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <Card className="p-4">
              <h3 className="text-sm font-bold mb-3 text-foreground flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-primary" />
                אודות המוצר
              </h3>
              <div className="text-[13px] text-muted-foreground leading-[1.8] space-y-2">
                {formatProductDescription(product.description || product.subtitle)}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Price Alert ── */}
        {id && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <PriceAlertButton productId={id} currentPrice={product.price} productName={product.name} />
          </motion.div>
        )}

        {/* ── Reviews ── */}
        {id && (
          <motion.div className="mx-4 mt-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <ProductReviews productId={id} />
          </motion.div>
        )}

        {/* ── Enrichment: Frequently Bought Together ── */}
        {isEnrichment && enrichmentCompanions.length > 0 && (
          <motion.div className="mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.47 }}>
            <h3 className="text-base font-bold mb-3 text-foreground mx-4 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              נקנים יחד לעיתים קרובות
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 px-4 hide-scrollbar">
              {enrichmentCompanions.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.47 + idx * 0.05 }} whileTap={{ scale: 0.98 }} className="flex-shrink-0 w-36 cursor-pointer" onClick={() => navigate(`/product/${item.id}`)}>
                  <Card className="overflow-hidden h-full">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-2.5">
                      <h4 className="font-bold text-xs text-foreground mb-1 line-clamp-2">{item.name}</h4>
                      <p className="text-sm font-black text-primary">₪{item.price}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Compare Similar Treats ── */}
        {isTreat && similarTreats.length > 0 && (
          <motion.div className="mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.47 }}>
            <h3 className="text-base font-bold mb-3 text-foreground mx-4 flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              השוואה לחטיפים דומים
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 px-4 hide-scrollbar">
              {similarTreats.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.47 + idx * 0.05 }} whileTap={{ scale: 0.98 }} className="flex-shrink-0 w-40 cursor-pointer" onClick={() => navigate(`/product/${item.id}`)}>
                  <Card className="overflow-hidden h-full">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-2.5 space-y-1">
                      <h4 className="font-bold text-xs text-foreground mb-1 line-clamp-2">{item.name}</h4>
                      <p className="text-sm font-black text-primary">₪{item.price}</p>
                      <div className="flex gap-1 flex-wrap">
                        {item.attrs?.protein_pct && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5">{item.attrs.protein_pct}% חלבון</Badge>
                        )}
                        {(item.description?.toLowerCase().includes('שיני') || item.description?.toLowerCase().includes('dental')) && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5">🦷 שיניים</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Related Products ── */}
        {relatedProducts.length > 0 && (
          <motion.div className="mt-4 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <h3 className="text-base font-bold mb-3 text-foreground mx-4">לקוחות גם קנו</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 px-4 hide-scrollbar">
              {relatedProducts.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + idx * 0.05 }} whileTap={{ scale: 0.98 }} className="flex-shrink-0 w-36 cursor-pointer" onClick={() => navigate(`/product/${item.id}`)}>
                  <Card className="overflow-hidden h-full">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-2.5">
                      <h4 className="font-bold text-xs text-foreground mb-1 truncate">{item.name}</h4>
                      <p className="text-sm font-black text-primary">₪{item.price}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Trust Section ── */}
        <motion.div className="mx-4 mb-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
          <Card className="p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { icon: <Shield className="w-5 h-5 text-primary" />, label: "תשלום מאובטח" },
                { icon: <Truck className="w-5 h-5 text-primary" />, label: "משלוח מהיר" },
                { icon: <PackageCheck className="w-5 h-5 text-primary" />, label: "החזרות קלות" },
              ].map((t, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">{t.icon}</div>
                  <p className="text-xs font-bold text-foreground">{t.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* ── Sticky Bottom CTA ── */}
        <motion.div 
          className="fixed left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/50 p-4 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]" 
          style={{ bottom: '70px' }}
          initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="absolute -bottom-20 left-0 right-0 h-20 bg-background" />
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-foreground">כמות:</span>
                <div className="flex items-center rounded-xl border-2 border-primary/30 bg-background">
                  <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-9 w-9 rounded-xl hover:bg-muted"><Minus className="w-4 h-4" /></Button>
                  <motion.span key={quantity} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="w-10 text-center text-base font-bold text-foreground">{quantity}</motion.span>
                  <Button variant="ghost" size="icon" onClick={() => setQuantity(quantity + 1)} className="h-9 w-9 rounded-xl hover:bg-muted"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">סה״כ</p>
                <motion.p key={quantity} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-xl font-black text-primary">₪{(product.price * quantity).toFixed(2)}</motion.p>
              </div>
            </div>

            {product.isFlagged && (
              <div className="flex items-center gap-2 p-3 mb-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                <Flag className="w-4 h-4 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">מוצר זה נמצא בבדיקה</p>
                  <p className="text-xs">לא ניתן לרכוש עד לסיום הטיפול</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl font-bold h-12 border-2 border-primary/30" onClick={handleAddToCart} disabled={product.isFlagged}>
                {product.isFlagged ? <><Flag className="w-4 h-4 ml-2" />מוצר בבדיקה</> : <><ShoppingCart className="w-4 h-4 ml-2" />הוסף לעגלה</>}
              </Button>
              <Button size="lg" className="flex-1 rounded-xl font-bold h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg" onClick={handleBuyNow} disabled={product.isFlagged}>
                {product.isFlagged ? 'לא זמין' : 'קנה עכשיו'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
