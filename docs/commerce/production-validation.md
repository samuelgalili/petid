# Production Data Validation — Canonical Catalog

מעבר אימות בלבד, לפני תכנון או ביצוע מיגרציה כלשהי.

**תאריך:** 2026-09-14 · **קצה פרודקשן:** `1a5246ea`

---

## 0. זמינות גישה לפרודקשן

נבדק ולא הונח:

| בדיקה | תוצאה |
|---|---|
| `DATABASE_URL` בסביבה | **לא מוגדר** |
| קבצי `.env` בריפו | רק `.env.example` — תבנית, ללא ערכים |
| `aws` CLI | **אינו מותקן בקונטיינר** |
| `aws sts get-caller-identity` | `No such file or directory` |
| גישה ל-SSM | לא אפשרית |

**אין גישה לפרודקשן. כל תוצאות השאילתות מסומנות `PENDING PRODUCTION
VALIDATION`. לא הומצאו נתונים.**

---

## 1. תוצאות פרודקשן

### PQ-1 · פילוח פריטי ההזמנה לפי מקור

```sql
SELECT
  product_source,
  COUNT(*) AS order_item_count
FROM public.order_items
GROUP BY product_source
ORDER BY product_source;
```

**תוצאה:** `PENDING PRODUCTION VALIDATION`

**פרשנות כשתתקבל:** הערך ב-`scraped` הוא היקף החשיפה. `NULL` מצביע על פריטים
שלא ניתן לייחס לטבלה.

**השפעה על ההגירה:** אם `scraped = 0` — M-3 ו-M-4 כמעט חינם. אם גדול — נדרשת
תקשורת ללקוחות ובדיקת עגלות פתוחות.

---

### PQ-2 · מזהה קיים בשתי הטבלאות

```sql
SELECT
  b.id AS business_product_id,
  s.id AS scraped_product_id
FROM public.business_products b
JOIN public.scraped_products s
  ON s.id = b.id;
```

**תוצאה:** `PENDING PRODUCTION VALIDATION`

**פרשנות:** אפס שורות = הייחודיות המעשית מתקיימת. שורה כלשהי = יש פריטי הזמנה
שלא ניתן לייחס חד-משמעית, ו-`resolveCatalogOrderItem` כבר מחזיר 409 עליהם.

**השפעה:** תוצאה לא-ריקה **חוסמת** את אילוץ `UNIQUE (business_id, source_kind,
source_record_id)` עד לטיפול פרטני.

---

### PQ-3 · מוצרי discovery שנמכרו

```sql
SELECT
  COUNT(DISTINCT product_id) AS scraped_product_ids_in_orders
FROM public.order_items
WHERE product_source = 'scraped';
```

**תוצאה:** `PENDING PRODUCTION VALIDATION`

**פרשנות:** כמה שורות discovery נמכרו בפועל. אלה המועמדות הראשונות לאימוץ
רטרואקטיבי — **לא כדי לתקן הזמנות** (הן אינן שבורות), אלא כדי שהמוצר יישאר
זמין לקנייה חוזרת.

---

### PQ-4 · פריטי הזמנה ללא מקור

```sql
SELECT
  COUNT(*) AS missing_product_source_count
FROM public.order_items
WHERE product_source IS NULL;
```

**תוצאה:** `PENDING PRODUCTION VALIDATION`

**פרשנות:** `product_source` הוא `nullable`. פריטים ישנים עשויים לא לשאת מקור.

**השפעה:** אם המספר גדול, **`PQ-1` אינה מספרת את כל הסיפור** ולא ניתן לכמת
במדויק את החשיפה ל-scraped.

---

### מצאי `business_products` — ששת הפריטים

| # | מה נדרש | מה ניתן לומר עכשיו |
|---|---|---|
| 1 | ספירת רשומות | `PENDING` — דורש פרודקשן |
| 2 | שדות provenance חסרים | **לא רלוונטי עדיין** — עמודות ה-provenance **אינן קיימות**. אומת מול `information_schema` |
| 3 | הפניות מקור כפולות באותו `business_id` | **לא ניתן למדוד** — אין `source_record_id` |
| 4 | רשומות שנראות כמוצרים מאומצים | **ניתן לזהות חלקית**: `source_url` **כן קיימת** ומאוכלסת בזרימת הייבוא. זו ההיוריסטיקה הזמינה היחידה. `PENDING` לספירה |
| 5 | חפיפת מזהים בין הטבלאות | `PQ-2` — `PENDING` |
| 6 | הפניות ל-`scraped_products` בקוד | **בוצע במלואו — סעיף 1A** |

**הערה מהותית לפריט 2:** אי אפשר לדווח על "שדות provenance חסרים" כי אין שדות
provenance. `source_url` היא היחידה שקיימת, והיא אינה מזהה את שורת המקור.

---

## 1A · אודיט הפניות ל-`scraped_products` בקוד — הושלם

**35 הפניות** ב-`server/src`. מסודרות לפי משטח:

| משטח | מיקום | מצב |
|---|---|---|
| **Checkout / order creation** | `resolveCatalogOrderItem` — `findScraped`, ענף `source === "scraped"`, ענף דו-משמעי עם 409 | 🔴 **ניתן לרכישה** |
| **Product API — רשימה** | `listProducts` מאחד `business_products` + `scraped_products` | 🔴 **מוצג בחנות** |
| **Product details** | `fetchProductById` — שאילתה ישירה, ו-fallback שבודק את שתי הטבלאות | 🔴 |
| **Admin — עדכון** | `updateScrapedProduct` דרך `scrapedProductFields` | 🟡 כלי אדמין |
| **Admin — מחיקה** | מחיקה בודדת ומחיקת אצווה | 🟡 כלי אדמין |
| **קטגוריות** | `category_id` נקרא, נספר ומעודכן גם על `scraped_products` | 🟡 |
| **Recommendations** | `catalogRecommendations.js` — **מוציא את `scraped_products` במפורש** | ✅ **תואם כבר ל-CD-02** |
| **Search** | אין חיפוש מוצרים בשרת | ⚪ לא רלוונטי |
| **Analytics** | `EVENT_TYPES` מכיל 5 אירועי הזמנה ו**אפס אירועי מוצר** | ⚪ אין חשיפה |
| **Cart resolution** | צד לקוח בלבד. `CartItem` **ללא שדה מקור** | 🔴 עיוור למקור |
| **Scraping workflows** | `scraping_jobs`, `ProductFormDialog` | 🟡 |

### שני תקדימים בקוד שתומכים ב-CD-02

**א. מנוע ההמלצות כבר מיישם את ההחלטה.** `catalogRecommendations.js`:

> *"Only business_products is searched. scraped_products holds raw import rows
> that no one has reviewed: they have no publication state yet, so the
> assistant must not be the thing that puts them in front of a customer."*

זה **בדיוק** הנימוק של `CD-02`, כבר ממומש במקום אחד. ההחלטה אינה חדשה למערכת
— היא הרחבה של עיקרון שכבר הוכרע פעם.

**ב. קיימת פרוטו-זרימת אימוץ.** `ProductFormDialog.tsx` — `processScrapedData`
מושך שורת scraped לטופס מוצר, כולל `source_url`. **זרימת האימוץ אינה מתחילה
מאפס**; היא צריכה להתפתח לתהליך מפורש עם מוכר ו-provenance.

---

## 2. תאימות הזמנות היסטוריות

| # | טענה | תוצאה | ראיה |
|---|---|---|---|
| 1 | `order_items.product_id` nullable | **כן** | `information_schema` — `is_nullable = YES` |
| 2 | אין FK לקטלוג | **אין** | `pg_constraint`: PK, FK ל-`orders`, `CHECK (quantity > 0)` — **זה הכל** |
| 3 | `order_items.product_source` nullable | **כן** | `is_nullable = YES` |
| 4 | שדות מצולמים | **כן** | `product_name` (`NOT NULL`), `product_image`, `price`, `sku`, `weight`, `weight_unit`, `variant`, `size` |
| 5 | קריאת הזמנה עושה JOIN לקטלוג | **לא** | `mapOrderItem` — 14 מפתחות, כולם מהשורה. אף שאילתת הזמנה אינה מצרפת טבלת מוצרים |
| 6 | ניתן לרנדר הזמנה אם המוצר הוסתר או נמחק | **כן** | נובע מ-1,2,4,5 |

### חריגים — שניים, ושניהם מהותיים

**חריג 1 · `product_source` הוא nullable.** התצוגה שורדת בכל מקרה (טענה 6
מתקיימת), אבל **הייחוס למקור אינו מובטח.** פריט ללא מקור אינו ניתן לסיווג,
ולכן `PQ-4` נדרשת לפני שמכמתים חשיפה.

**חריג 2 · קנייה חוזרת אינה תצוגה.** הזמנה היסטורית תרונדר תמיד — אבל אם
המוצר יוסר מהפתרון, **"הזמן שוב" מאותה הזמנה ייכשל.** זה אינו שבירה של נתונים
היסטוריים, וגם אינו זניח: זו התנהגות שהלקוח יחווה. יש לבדוק אם מסלול כזה קיים
ב-UI לפני M-4.

---

## 3. חוסר עקביות בקטלוג

| # | ממצא | מצב |
|---|---|---|
| 1 | UUID כפול בין הטבלאות | `PENDING` — `PQ-2`. מבנית אפשרי; שתיהן `gen_random_uuid()` ללא אילוץ מונע |
| 2 | הפניות מקור כפולות | **לא מדיד** — אין `source_record_id` |
| 3 | provenance חסר | **מבני**: חמש עמודות ה-provenance אינן קיימות. `source_url` בלבד |
| 4 | **מוצרי discovery זמינים לרכישה** | ✅ **מאושש בקוד** — `listProducts` מציג, `resolveCatalogOrderItem` פותר |
| 5 | `business_products` ללא בעלות מוכר ברורה | **אין כאלה מבנית** — `business_id` הוא `NOT NULL` + FK. **אבל** ערך שהגיע מ-`defaultBusinessId` הוא בעלות שהומצאה בשקט, לא שנקבעה |
| 6 | מה יישבר אם `scraped_products` יוסר מהפתרון | פירוט למטה |

### פריט 6 — מה יישבר ב-M-4

| נשבר | לא נשבר |
|---|---|
| עגלות ב-`localStorage` המחזיקות מוצר שנקצר → כישלון ב-checkout | הזמנות היסטוריות — מרונדרות מהצילום |
| "הזמן שוב" מפריט scraped היסטורי | דוחות הזמנות |
| קישור ישיר למוצר scraped | המלצות — כבר מוציאות אותם |

**עגלה ב-`localStorage` יכולה להיות בת שבועות.** נדרשת הודעה מפורשת ולא 400
גנרי.

---

## 4. מוכנות להגירה

| פריט | סיווג | נימוק |
|---|---|---|
| שדות provenance | **READY** | אדיטיבי, nullable, אפס סיכון |
| Backfill `source_kind='manual'` | **READY** | עדכון ערך ברירת מחדל |
| ייחודיות ממוכרת | **REQUIRES PRODUCTION DATA** | חסום עד `PQ-2` |
| שינויי checkout | **REQUIRES PRODUCTION DATA** | היקף לפי `PQ-1`, `PQ-3`, `PQ-4` |
| שינויי order resolution | **REQUIRES PRODUCTION DATA** | אותו תנאי |
| תאימות עגלות legacy | **REQUIRES DECISION** | מה הלקוח רואה — הודעה, הסרה אוטומטית, או הצעת חלופה |
| זרימת אימוץ | **REQUIRES DECISION** | `CQ-13` — מי מאשר |
| רשומת Mipo Shop כמוכר | **REQUIRES DECISION** | להסב את השורה הקיימת או ליצור חדשה. **אסור ליצור מוכר אוטומטית** |
| תאימות הזמנות היסטוריות | **READY** | שש טענות אומתו; שני חריגים מתועדים |
| הסרת `defaultBusinessId` | **BLOCKED** | תלוי ברשומת Mipo Shop |
| מלאי כישות | **BLOCKED** | שלב נפרד |
| `seller_orders` | **BLOCKED** | תלוי ב-`CD-03`, `CD-04` |

**סיכום:** 3 `READY` · 2 `BLOCKED` · 3 `REQUIRES DECISION` · 3 `REQUIRES
PRODUCTION DATA`

---

## 5. `Canonical Catalog Migration Plan` — מוכן, לא בוצע

**אין להתחיל לפני:** `PQ-1`…`PQ-4`, הכרעת `CQ-13`, אישור מפורש לשינוי סכמה.

### 5.1 מודל provenance אדיטיבי

מיגרציה אחת, חמש עמודות, **כולן nullable, ללא FK, ללא אילוץ**:

| עמודה | טיפוס | הערה |
|---|---|---|
| `source_kind` | text | `manual` · `scraped` · `import` |
| `source_record_id` | uuid | **ללא FK** — provenance שורד מחיקת מקור |
| `source_url` | text | **כבר קיימת** — לא לשכפל |
| `adopted_at` | timestamptz | |
| `adopted_by` | uuid | האדמין המאמץ |

**ללא `NOT NULL` בשלב זה.** הידוק אחרי ה-backfill ואחרי אימות.

### 5.2 Backfill

```sql
UPDATE public.business_products
SET source_kind = 'manual'
WHERE source_kind IS NULL;
```

אידמפוטנטי. **לא נוגע ב-`source_record_id`** — אי אפשר לשחזר בדיעבד איזו שורת
discovery הולידה מוצר קיים. ניסיון להסיק מ-`source_url` הוא ניחוש, ואסור.

### 5.3 זרימת אימוץ

מתבססת על `processScrapedData` הקיים:

1. אדמין בוחר שורת discovery
2. **בוחר מוכר** — חובה, אין ברירת מחדל
3. קובע מחיר (ננעל, `CD-06`), זמינות, קטגוריה
4. נוצרת שורת `business_products` עם provenance מלא
5. שורת ה-discovery **נשארת ללא שינוי**
6. נרשם ל-`admin_audit_log`

**אסור:** אימוץ אוטומטי, אימוץ מתוזמן, ברירת מחדל למוכר.

### 5.4 אכיפת בעלות

קיים: `business_id NOT NULL` + FK. נוסף: `business_id` מהקשר מאומת בלבד,
predicate מוכר בכל שאילתה מסחרית, רישום ל-audit.

### 5.5 טיפול בעגלות legacy

**REQUIRES DECISION.** שלוש אפשרויות: הודעה והסרה ידנית · הסרה אוטומטית עם
הסבר · הצעת מוצר חלופי. **המלצה: הודעה מפורשת** — הסרה שקטה מעגלה היא בדיוק
סוג הדבר שהורס אמון.

### 5.6 מעבר checkout

1. להוסיף טלמטריה על ניסיונות פתרון scraped — **לפני** כל שינוי
2. להמתין למדידה אמיתית
3. רק אז להסיר את הענף

### 5.7 הסרה מפתרון מכירה

`M-3` (רשימה) ו-`M-4` (פתרון) — שינויי **קריאה בלבד**. אף שורה לא זזה.

### 5.8 ייחודיות ממוכרת

```sql
ALTER TABLE public.business_products
  ADD CONSTRAINT business_products_seller_source_unique
  UNIQUE (business_id, source_kind, source_record_id);
```

**רק אחרי `PQ-2`.** לעולם לא `UNIQUE(source_record_id)` — הוא אוסר את `CD-05`.

### 5.9 Rollback

| שלב | ביטול |
|---|---|
| provenance | `DROP COLUMN` — הפיך, מאבד רק מטא-דאטה חדש |
| backfill | `SET source_kind = NULL` |
| M-3 / M-4 | החזרת הקוד — **אף נתון לא אבד** |
| אילוץ | `DROP CONSTRAINT` |
| רשומת Mipo Shop | **לא למחוק** — יהיו לה מוצרים |

**כל שלב הפיך. אין שלב הרסני בתוכנית.**

### 5.10 אימות וקריטריוני קבלה

```sql
-- A1 · לכל מוצר מסחרי יש מוכר (חייב להיות 0)
SELECT COUNT(*) FROM public.business_products WHERE business_id IS NULL;

-- A2 · כל שורה נושאת source_kind אחרי backfill (חייב להיות 0)
SELECT COUNT(*) FROM public.business_products WHERE source_kind IS NULL;

-- A3 · אין כפילות ממוכרת לפני הוספת האילוץ (חייב להיות 0)
SELECT business_id, source_kind, source_record_id, COUNT(*)
FROM public.business_products
WHERE source_record_id IS NOT NULL
GROUP BY 1,2,3 HAVING COUNT(*) > 1;

-- A4 · אף הזמנה לא השתנתה (השוואה לפני/אחרי)
SELECT COUNT(*), SUM(quantity), SUM(price) FROM public.order_items;
```

**קריטריוני קבלה:** A1=0 · A2=0 · A3=0 · A4 זהה לפני ואחרי · `db-smoke.mjs`
19/19 · 257/257 יוניט · מיגרציות אידמפוטנטיות.

---

## נספח — מה לא אומת

- **כל נתוני פרודקשן.** אין גישה; אומת בסעיף 0.
- **n8n** — מוגדר בסשן ונכשל בחיבור.
- **האם קיים מסלול "הזמן שוב" ב-UI** — לא נבדק; רלוונטי לחריג 2.
