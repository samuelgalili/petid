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
  Car, Grip, Cog, Droplet, Sun, Wind, Pipette
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
  return ['accessories', 'toys', 'grooming', 'collars', 'leashes', 'beds', 'clothing', 'muzzles', 'enrichment'].includes(category.toLowerCase());
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

/** Check if product is a treat/snack */
const isTreatProduct = (product: any): boolean => {
  const cat = (product.category || '').toLowerCase();
  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
  return cat === 'treats' || cat === 'snacks' || 
    text.includes('חטיף') || text.includes('treat') || text.includes('snack') || 
    text.includes('מקל לעיסה') || text.includes('עצם לעיסה') || text.includes('חטיפון');
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
    price: getNumericPrice(rawProduct.price),
    originalPrice: rawProduct.original_price ? getNumericPrice(rawProduct.original_price) : (rawProduct.originalPrice ? getNumericPrice(rawProduct.originalPrice) : null),
    discount: rawProduct.original_price || rawProduct.originalPrice
      ? `${Math.round((1 - getNumericPrice(rawProduct.price) / getNumericPrice(rawProduct.original_price || rawProduct.originalPrice)) * 100)}% הנחה`
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
  const isTreat = useMemo(() => product ? isTreatProduct(product) : false, [product]);
  const treatHealthBoosts = useMemo(() => product && isTreat ? deriveTreatHealthBoosts(product) : [], [product, isTreat]);
  const treatUsage = useMemo(() => product && isTreat ? extractTreatUsage(product) : { purpose: null, safetyTip: null, isNatural: false }, [product, isTreat]);
  const treatFeatures = useMemo(() => product && isTreat ? extractTreatFeatures(product) : { chewDuration: 0, proteinPct: null, hasDental: false, texture: null, isChewPriority: false }, [product, isTreat]);
  const analysisData = useMemo(() => product ? parseAnalysis(product) : [], [product]);
  const vitaminsData = useMemo(() => product ? parseVitamins(product) : [], [product]);
  const feedingResult = useMemo(() => {
    if (!product?.feeding_guide || !dogWeight) return null;
    return calcFeeding(product.feeding_guide, parseFloat(dogWeight));
  }, [product?.feeding_guide, dogWeight]);

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
              </h3>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">משקל הכלב (ק״ג)</Label>
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
