// Content Safety Filter
// Filters out negative, traumatic, or harmful content

// Blocked keywords in Hebrew and English
const BLOCKED_KEYWORDS = [
  // Violence
  'אלימות', 'מוות', 'התעללות', 'עינויים', 'רצח', 'פציעה',
  'violence', 'death', 'abuse', 'torture', 'murder', 'injury',
  
  // Animal abuse
  'התעללות בבעלי חיים', 'הזנחה', 'נטישה', 'הרעלה',
  'animal abuse', 'neglect', 'abandonment', 'poisoning',
  
  // Traumatic
  'תאונה', 'טראומה', 'פחד', 'אימה',
  'accident', 'trauma', 'fear', 'horror',
  
  // Sad/Depressing (for uplifting feed)
  'מת', 'נפטר', 'נהרג', 'איבדתי',
  'died', 'passed away', 'killed', 'lost',
];

// Warning keywords that reduce priority but don't block
const WARNING_KEYWORDS = [
  'חולה', 'בית חולים', 'וטרינר', 'ניתוח', 'תרופות',
  'sick', 'hospital', 'vet', 'surgery', 'medicine',
];

// Positive keywords that boost priority
const POSITIVE_KEYWORDS = [
  'אהבה', 'שמחה', 'חמוד', 'מתוק', 'משחק', 'כיף', 'אימוץ', 'הצלחה',
  'חבר', 'משפחה', 'אושר', 'בריאות', 'טיפול', 'אימון',
  'love', 'happy', 'cute', 'sweet', 'play', 'fun', 'adoption', 'success',
  'friend', 'family', 'happiness', 'health', 'care', 'training',
];

export interface SafetyCheckResult {
  isSafe: boolean;
  hasWarnings: boolean;
  isPositive: boolean;
  score: number; // -1 to 1, where 1 is very positive
  blockedReason?: string;
}

export const checkContentSafety = (text: string): SafetyCheckResult => {
  if (!text) {
    return { isSafe: true, hasWarnings: false, isPositive: false, score: 0 };
  }

  const lowerText = text.toLowerCase();

  // Check for blocked content
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return {
        isSafe: false,
        hasWarnings: true,
        isPositive: false,
        score: -1,
        blockedReason: keyword,
      };
    }
  }

  // Calculate score
  let score = 0;
  let warningCount = 0;
  let positiveCount = 0;

  // Check warnings
  for (const keyword of WARNING_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      score -= 0.2;
      warningCount++;
    }
  }

  // Check positive
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      score += 0.3;
      positiveCount++;
    }
  }

  // Clamp score
  score = Math.max(-1, Math.min(1, score));

  return {
    isSafe: true,
    hasWarnings: warningCount > 0,
    isPositive: positiveCount > warningCount,
    score,
  };
};

// Filter an array of items with captions
export const filterSafeContent = <T extends { caption?: string; description?: string }>(
  items: T[],
  strict: boolean = false
): T[] => {
  return items.filter(item => {
    const text = item.caption || item.description || '';
    const result = checkContentSafety(text);
    
    if (!result.isSafe) return false;
    if (strict && result.hasWarnings) return false;
    
    return true;
  });
};

// Sort items by safety score (positive content first)
export const sortBySafetyScore = <T extends { caption?: string; description?: string }>(
  items: T[]
): T[] => {
  return [...items].sort((a, b) => {
    const textA = a.caption || a.description || '';
    const textB = b.caption || b.description || '';
    
    const scoreA = checkContentSafety(textA).score;
    const scoreB = checkContentSafety(textB).score;
    
    return scoreB - scoreA; // Higher score first
  });
};
