
# תכנון: עמוד פרופיל חיית המחמד המחודש

## סקירת החזון

העמוד יכלול מבנה חדש וברור:
1. **ציון בריאות** - בראש העמוד (ללא כפתור חזור וחץ)
2. **כרטסייה חכמה** - נתוני חיית המחמד מהגזע שזוהה + גיל/גודל/משקל/בעלים
3. **תכונות מבוססות גזע** - אנרגיה, תדירות טיפוח, כמות האכלה (עם גישה למוצרים מותאמים)

---

## מבנה העמוד החדש

```text
+------------------------------------------+
|          ציון בריאות: 85%                |
|          [התראת חיסון בקרוב]             |
+------------------------------------------+
|  [תמונה]  שם חיית המחמד                  |
|           גזע: לברדור                    |
+------------------------------------------+
|  גיל  |  גודל  |  משקל  |  בעלים        |
+------------------------------------------+
|                                          |
|  +--------+  +--------+  +--------+      |
|  | אנרגיה |  | טיפוח  |  | האכלה  |      |
|  | גבוהה  |  | בינוני |  | 300 גרם|      |
|  +--------+  +--------+  +--------+      |
|                                          |
+------------------------------------------+
```

---

## פירוט רכיבים

### 1. ציון בריאות (קיים - PetHealthScore.tsx)
- יישאר בראש העמוד
- **יוסר**: כפתור "חזור לחיות המחמד" והחץ
- יציג ציון בריאות + התראות

### 2. כרטסייה חכמה (TopRecommendation.tsx - עדכון)
הכרטסייה תציג:
- תמונה + שם + גזע
- נתונים מה-`breed_information` table:
  - גיל (מחושב מ-birth_date או מנתוני הגזע)
  - גודל (מ-size_category של הגזע)
  - משקל (מ-weight_range_kg של הגזע)
- שם הבעלים (לחיצה = מעבר להודעות)

### 3. אייקונים חדשים עם Bottom Sheets

#### א. אנרגיה (EnergySheet.tsx - חדש)
- מציג רמת אנרגיה מ-`breed_information.exercise_needs`
- בלחיצה: חלון נגלל עם **3 צעצועים** לפריקת אנרגיה
- מוצרים נלקחים מ-`business_products` לפי:
  - `category ILIKE '%toy%'` OR `'צעצוע'` OR `'משחק'`
  - `pet_type` = סוג החיה
- כפתור "הוסף לעגלה" מהיר

#### ב. תדירות טיפוח (GroomingProductsSheet.tsx - חדש)
- מציג תדירות טיפוח מ-`breed_information.grooming_needs`
- בלחיצה: חלון נגלל עם **3 מוצרי טיפוח**:
  - שמפו
  - מרכך
  - מברשת
- מסננים מ-`business_products` לפי:
  - `category ILIKE '%grooming%'` OR `'שמפו'` OR `'מרכך'` OR `'מברשת'`

#### ג. כמות האכלה (FeedingSheet.tsx - חדש)
- מחשב כמות האכלה מומלצת לפי:
  - משקל הכלב (אם יש)
  - אם אין - מנתוני הגזע (`weight_range_kg`)
- **נוסחה**: משקל * 2-3% ליום
- בלחיצה: חלון נגלל עם:
  - 2 שקי מזון יבש מומלצים לגזע
  - 1 אוכל רטוב
- מסננים לפי סוג החיה והגזע

---

## קבצים לעריכה/יצירה

### קבצים חדשים
1. `src/components/pet-services/EnergySheet.tsx` - מוצרי פריקת אנרגיה
2. `src/components/pet-services/GroomingProductsSheet.tsx` - מוצרי טיפוח
3. `src/components/pet-services/FeedingSheet.tsx` - המלצות מזון
4. `src/components/profile/PetBreedTraits.tsx` - אייקוני תכונות הגזע

### קבצים לעדכון
1. `src/components/profile/TopRecommendation.tsx` - הוספת נתוני גזע חכמים
2. `src/components/profile/PetHealthScore.tsx` - הסרת כפתור החזור
3. `src/pages/Profile.tsx` - שילוב הרכיבים החדשים
4. `src/components/pet-services/index.ts` - ייצוא הרכיבים החדשים

---

## פרטים טכניים

### שאילתות מסד נתונים

**נתוני גזע:**
```sql
SELECT exercise_needs, grooming_needs, dietary_notes, 
       weight_range_kg, size_category
FROM breed_information
WHERE breed_name ILIKE '%breed%' OR breed_name_he ILIKE '%breed%'
```

**מוצרי אנרגיה (צעצועים):**
```sql
SELECT id, name, price, image_url 
FROM business_products
WHERE (category ILIKE '%toy%' OR category ILIKE '%צעצוע%')
  AND pet_type = 'dog'
LIMIT 3
```

**מוצרי טיפוח:**
```sql
SELECT id, name, price, image_url 
FROM business_products
WHERE (category ILIKE '%shampoo%' OR category ILIKE '%שמפו%' 
       OR category ILIKE '%grooming%' OR category ILIKE '%brush%')
  AND pet_type = 'dog'
LIMIT 3
```

**מזון מומלץ:**
```sql
SELECT id, name, price, image_url 
FROM business_products
WHERE (category ILIKE '%dry-food%' OR category ILIKE '%מזון יבש%')
  AND pet_type = 'dog'
LIMIT 2
UNION
SELECT id, name, price, image_url 
FROM business_products
WHERE (category ILIKE '%wet-food%' OR category ILIKE '%מזון רטוב%')
  AND pet_type = 'dog'
LIMIT 1
```

### חישוב כמות האכלה
```typescript
const calculateDailyFoodAmount = (weightKg: number): string => {
  // כלבים צריכים 2-3% ממשקל הגוף ביום
  const minGrams = Math.round(weightKg * 20); // 2%
  const maxGrams = Math.round(weightKg * 30); // 3%
  return `${minGrams}-${maxGrams} גרם`;
};
```

### עיצוב אייקונים חדשים
- **אנרגיה**: אייקון Zap (ברק) עם רקע צהוב
- **טיפוח**: אייקון Scissors עם רקע ורוד
- **האכלה**: אייקון Utensils עם רקע כתום

---

## היררכיית המידע
1. נתונים שהמשתמש הזין - עדיפות ראשונה
2. נתוני גזע מזוהה (מזיהוי תמונה) - עדיפות שנייה
3. ברירות מחדל כלליות - עדיפות אחרונה

כל הנתונים שמגיעים מהגזע (ולא מהמשתמש) יסומנו עם אייקון Sparkles (ניצוץ) בצבע ענבר.

---

## תיאום עם עקרונות המערכת

לפי עקרונות PetID:
- לא נמליץ על מוצרים ללא נתונים מספיקים
- כל ההמלצות מבוססות גזע+גיל+סוג בלבד
- אין שפה שיווקית ("מבצע", "הכי טוב")
- מוצרים מסומנים כ"מותאם" או "מומלץ" בלבד
