# יומן עבודה — petid

רישום של מה בוצע, מה נדחף, ומה עדיין לא. כל שורה נגזרה מ-git ומריצות
`deploy-aws.yml`, לא מזיכרון ולא משיחה.

**איך נקבע הסטטוס.** "נפרס ואומת" מחייב שלושה תנאים: ריצת deploy עם
`conclusion: success`, ה-job בשם `Deploy tested build` רץ בפועל, והקומיט הוא
אב-קדמון של קצה `aws-migration` האמיתי.

תנאי ב' נגזר ולא נבדק ריצה-ריצה, והנה הנימוק: ב-`deploy-aws.yml` ל-job
`deploy` יש `needs: [quality, schema]` ו-`if: github.ref_name == 'aws-migration'
|| github.ref_name == 'staging'`. כל הריצות ביומן הזה הן על `aws-migration`, אז
תנאי ה-`if` תמיד מתקיים; ואם אחד מה-needs נכשל, הריצה כולה מקבלת
`conclusion: failure`. לכן על הענף הזה `success` גורר שה-deploy רץ. עבור
ריצות 46–49 גם נפתחה רשימת ה-jobs ואומת ישירות.

תנאי ג' נבדק מול `git ls-remote origin refs/heads/aws-migration` ולא מול
`origin/aws-migration` המקומי. ה-ref המקומי נתקע שלוש פעמים ב-2026-09-11 והראה
קצה ישן.

---

## מצב נוכחי

קצה פרודקשן: `f6bd559d4f2631c41b0ec65665ae227b97ed1ae2`
ריצה אחרונה: run 49 · `success` · `Deploy tested build`: success
נבדק ב-2026-09-11

17 מיזוגים ב-first-parent של `aws-migration`. 39 קבצי מיגרציה בריפו
(`0001`–`0039`, ללא `0030` ו-`0031`), 38 מהם מוחלים.

---

## ממתין להחלטה

ענפים שיש בהם קומיטים שאינם בפרודקשן.

| ענף | קומיטים | תוכן | למה לא נדחף |
|---|---|---|---|
| `claude/admin-2fa` | `c04cc75e`, `7b4d8ffd` | אימות דו-שלבי לכל כניסת אדמין | לפי גוף הקומיט של `532f3abd`: דורש `SECRET_ENCRYPTION_KEY` ב-SSM, ובלעדיו ה-API מסרב לעלות בפרודקשן |
| `claude/category-filter` | `66f6d0c9`, `df1e5b60`, `fe3e14b0`, `552c9a21` | "Carry the approval-gate fix up the stack" ×3 + `552c9a21` | לא אומת — אין ראיה בריפו למה נשאר |
| `claude/product-page-spine` | `df1e5b60`, `fe3e14b0`, `552c9a21` | אותם קומיטים | לא אומת — אין ראיה בריפו |
| `claude/workbench` | `fe3e14b0`, `552c9a21` | אותם קומיטים | לא אומת — אין ראיה בריפו |
| `claude/deploy-safety` | `552c9a21` | "Put the approval on the environment that already holds the key" | לא אומת — אין ראיה בריפו |
| `claude/activity-audit` | `23128f31` | Phase 0 ל-Activity Network: אודיט לפני קוד | לא אומת — אין ראיה בריפו |
| `main` | `d2089964` (2026-06-29) | "רענן את שרת התצוגה" | לא אומת — `main` אינו ענף הפריסה |

`claude/mifo-project-oq44tl` **אינו** ברשימה: `e85595ea` הוא אב-קדמון של קצה
הפרודקשן, כלומר כל מה שבו נפרס.

---

## ידוע ולא תוקן

| # | מה | ראיה | התגלה ברשומה |
|---|---|---|---|
| 1 | `pg` מחזיר עמודות `date` כאובייקט `Date`, אז ה-API שולח חותמת ISO מלאה (`"2027-01-15T00:00:00.000Z"`) במקום `"2027-01-15"`. נוגע ל-`birth_date`, `last_vet_visit`, `next_vet_visit`, `insurance_expiry_date`, `license_expiry_date` | נבדק ב-2026-09-11 מול DB מקומי: `typeof row.next_vet_visit === "object"` | 2026-09-11 · create-path fixes |
| 2 | תאריך לידה של **אדם** (signup ו-PATCH פרופיל) מקבל תאריך עתידי. רק של החיה נחסם | `server/src/index.js` — `normalizeDateOnly` בלי בדיקת עתיד בשני המסלולים | 2026-09-11 · create-path fixes |
| 3 | 13 מתוך 20 קבצי e2e לא תואמים ל-`testMatch: "**/*.aws.spec.ts"` ומעולם לא רצו ב-CI. ביניהם `add-pet.spec.ts` ו-`edit-pet.spec.ts` | `ls e2e/*.spec.ts` = 20, `ls e2e/*.aws.spec.ts` = 7 | 2026-09-11 · create-path fixes |
| 4 | `AUTOMATION_WEBHOOK_URL` אינו ב-`REQUIRED_KEYS` ולא ב-`OPTIONAL_KEYS` של `deploy/aws/sync-ssm-env.sh` (8+12 מפתחות). לפי `server/src/events.js:207`, בלי הכתובת ה-dispatcher מחזיר `() => {}` — כלומר אירועים נצברים ולא נמסרים בפרודקשן | `grep -c AUTOMATION_WEBHOOK_URL deploy/aws/sync-ssm-env.sh` = 0 | 2026-09-11 · יומן |
| 5 | ה-job `deploy` קשור ל-`environment: production` והערה בקוד מפנה ל-`docs/DEPLOY_APPROVAL.md`, אבל ריצות 46–49 לא נעצרו לאישור. **הסקה** מהתנהגות הריצות: אין reviewer מוגדר על הסביבה בהגדרות GitHub (הגדרה מחוץ לריפו, לא ניתנת לאימות מכאן) | ריצות 46,47,48,49 — `Deploy tested build` התחיל תוך שניות מסיום השערים | 2026-09-11 · יומן |
| 6 | הודעת המיזוג של `20a03a1d` נושאת בסופה שורת `# Conflicts:` שנגררה מה-merge | גוף הקומיט `20a03a1d` | 2026-09-11 · P0 |
| 7 | שכבת העובדות (`pet_facts` וחברותיה) קיימת בפרודקשן ואין לה צרכנים. `serializePet` ו-`normalizePetPayload` לא השתנו | גוף הקומיט `124576dc` | 2026-09-11 · P1 |

---

## רשומות

מהחדש לישן.

---

### 2026-09-11 · Store what the API says it accepts (create-path fixes)

- **סטטוס:** נפרס ואומת
- **קומיט:** `f6bd559d4f2631c41b0ec65665ae227b97ed1ae2` (מיזוג של `e85595ea` מ-`claude/mifo-project-oq44tl`)
- **ענף:** `aws-migration`
- **ריצת deploy:** run 49 · `success` · `Deploy tested build`: success, כולל `Smoke test the deployed environment`
- **שערים:** הורצו בסשן על העץ הממוזג — typecheck ✅ · lint ✅ · check:imports ✅ (60 פערים נסבלים) · build ✅ · unit **257/257** · migrations **38/38** · API smoke **18/18**. ב-CI: כל שלושת ה-jobs ירוקים
- **מה נכלל:** `insertUserPet` גוזר את העמודות מה-payload במקום רשימה ידנית (19 מתוך 42 נכתבו קודם, 23 נזרקו עם תשובת 201); תאריך לידה עתידי נדחה ב-400 עם מרווח של יום ב-UTC; `is_neutered` אינו מאותחל ל-`"false"` בשני טפסי החיה
- **לא בוצע:** תאריך לידה של אדם לא נחסם (ידוע #2); פורמט התאריכים ב-API לא שונה (ידוע #1)
- **לא אומת:** שני שינויי הקליינט (`AddPet.tsx`, `EditPet.tsx`) — אין להם טסט שרץ. `e2e/add-pet.spec.ts` ו-`e2e/edit-pet.spec.ts` לא תואמים ל-`testMatch` (ידוע #3), ובסביבת הפיתוח גרסת הדפדפן אינה תואמת ל-Playwright. אומתו בקריאת דיף בלבד
- **הצעד הבא:** להחליט אם לפתוח את 13 קבצי ה-e2e המושתקים, או לפחות את שני טפסי החיה

---

### 2026-09-11 · P1 — the pet fact foundation

- **סטטוס:** נפרס ואומת
- **קומיט:** `124576dc5c573964f5c92b18efcadedc402a20eb` (מיזוג של `d99f9444`)
- **ענף:** `aws-migration`
- **ריצת deploy:** run 48 · `success` · `Deploy tested build`: success
- **שערים:** הורצו בסשן — typecheck ✅ · lint ✅ · imports ✅ · build ✅ · unit **257/257** · migrations **38/38** + הרצה חוזרת אידמפוטנטית · pet-facts integration **46/46**
- **מה נכלל:** מיגרציות `0036` סכמת יסוד · `0037` זריעת רישום · `0038` `outbox_events.pet_id` · `0039` backfill משקל. 14 קבצים, **שרת בלבד** — אפס קבצים ב-`src/`, אפס תיעוד
- **לא בוצע:** לפי גוף הקומיט — אין צרכנים לשכבה, `serializePet` ו-`normalizePetPayload` זהים, אף פיצ'ר לא הוגר לעובדות. אסטרטגיית ההגירה ADD → VALIDATE → BACKFILL → DUAL WRITE → DUAL READ → CUTOVER: שלושה שלבים מתוך שישה
- **לא אומת:** התנהגות השכבה תחת עומס אמיתי בפרודקשן — אין לה קריאות
- **הצעד הבא:** להחליט על שלב DUAL WRITE — איזה מפתח עובר ראשון

---

### 2026-09-11 · P0 — stop inventing numbers about people's pets

- **סטטוס:** נפרס ואומת
- **קומיט:** `20a03a1d95309a77cade133146d2e3ec059f06fb` (מיזוג של `794a6d61`)
- **ענף:** `aws-migration`
- **ריצת deploy:** run 47 · `success` · `Deploy tested build`: success
- **שערים:** הורצו בסשן על העץ הממוזג — typecheck ✅ · lint ✅ · imports ✅ · build ✅ · unit **173/173** (העץ הזה בלי 84 טסטי P1)
- **מה נכלל:** מיגרציה `0035_feeding_guide_source.sql`, 27 קבצים. כמות אוכל ממדריך ההאכלה עם provenance במקום חישוב מומצא; גיל קנוני; מקור פעילות אחד; `pet.size` המת הוסר; גבול גזע; Central Brain
- **לא בוצע:** R-03 health score נותר בלי בעלים בחוזה הנתונים, לפי `docs/pet-intelligence/54`
- **לא אומת:** הרצת e2e בסשן על `d99f9444` נתנה 12 עברו / 21 נכשלו / 3 לא רצו — **כשל סביבה ולא רגרסיה**: Playwright 1.61.1 דורש revision 1228 ובסביבה יש 1194
- **הצעד הבא:** —

---

### 2026-09-11 · Add the audit and design record

- **סטטוס:** נפרס ואומת
- **קומיט:** `3b70e911a5d9c716376b0051da16e2ebf97dfe6d`
- **ענף:** `aws-migration`
- **ריצת deploy:** run 46 · `success` · `Deploy tested build`: success
- **שערים:** —
- **מה נכלל:** לפי גוף הקומיט: 90 מסמכים, כולם הוספות. `docs/system-workflows/` 32 · `docs/pet-intelligence/` 58. אפס קבצי מקור, אפס מיגרציות, אפס קונפיגורציה
- **לא בוצע:** בכוונה — P0 ו-P1 לא נכללו בקומיט הזה
- **לא אומת:** —
- **הצעד הבא:** —

---

### 2026-09-09 · Merge the surface-colour fix and the 3D character styles

- **סטטוס:** נפרס ואומת
- **קומיט:** `8a99d0cea6ed6ce4ea7cf950a3dc7f65b7c97197`
- **ריצת deploy:** run 45 · `success`
- **שערים:** לפי הקומיט `8a99d0ce` — 130 טסטי שרת, lint, typecheck, import check ו-62 טסטי דפדפן
- **מה נכלל:** `tailwind.config.ts` הכיל שני מפתחות `mipo` באותו אובייקט, אז השני דרס את הראשון ו-258 שימושים ב-19 קבצים לא ייצרו CSS; ושני סגנונות הדמות הפכו לרנדר תלת-ממדי
- **לא אומת:** לפי הקומיט — לא נוצרה תמונת אווטאר, אז שקיפות אמיתית ועקביות בין שש הבעות הן שאלות פתוחות
- **הצעד הבא:** —

---

### 2026-09-09 · Merge the reel, the avatar fixes and the version marker

- **סטטוס:** נפרס ואומת
- **קומיט:** `3201a3aff15e24e0b547c2a70df7e3f6d8048450`
- **ריצת deploy:** run 44 · `success`
- **שערים:** — (אין נתון מספרי בגוף הקומיט)
- **מה נכלל:** פיד קהילה כ-reel אנכי; החיה במסך הבית נשארת ממורכזת בלחיצה (Framer Motion דרס את ה-translate); `/api/health` מדווח את הקומיט שהוא מריץ והדיפלוי נכשל אם הגרסאות לא תואמות; אווטאר על רקע שקוף
- **לא אומת:** לפי הקומיט — שקיפות אמיתית באווטאר
- **הצעד הבא:** —

---

### 2026-09-09 · Merge the cache-header fix

- **סטטוס:** נפרס ואומת
- **קומיט:** `69328539a2c8c14923ab7523e0ccabe0bdbc70df`
- **ריצת deploy:** run 43 · `success`
- **שערים:** לפי הקומיט — ה-Caddyfile עובר ולידציה לפרודקשן, לסטייג'ינג, ובלי משתנים
- **מה נכלל:** `Cache-Control` על מה ש-Caddy מגיש מ-`/srv/www`. קונפיגורציה בלבד
- **לא אומת:** —
- **הצעד הבא:** —

---

### 2026-09-09 · Merge the verified release

- **סטטוס:** נפרס ואומת
- **קומיט:** `dab0c834541d8cc253a5f67ed19e4b3529e51155`
- **ריצת deploy:** run 42 · `success`
- **שערים:** לפי הקומיט — 118 טסטי שרת, lint, typecheck, import check, build; 33 מיגרציות מאפס והרצה חוזרת כ-no-op; 14/14 API smoke
- **מה נכלל:** 11 קומיטים — גיבוי ו-dry-run של מיגרציות לפני נגיעה בפרודקשן; סביבת עבודה מקומית; עמודי מוצר אחידים; פילטר קטגוריות; העוזר לא יכול להמציא מוצר; ratchet ל-import שבור
- **לא אומת:** —
- **הצעד הבא:** —

---

### 2026-09-08 · Merge the 0021 fix to end the half-migrated state

- **סטטוס:** נפרס ואומת
- **קומיט:** `fffa67a331bca640a032f346b0610d74df9ac95b`
- **ריצת deploy:** run 41 · `success`
- **שערים:** —
- **מה נכלל:** לפי הקומיט — מיגרציות `0017`–`0020` התחייבו בפרודקשן ו-`0021` נכשלה על שישה SKU כפולים, אז ה-API לא הופעל מחדש והריץ קוד שבוחר עמודות ש-`0019` מחקה. **לקוחות לא הצליחו להתחבר.** הקומיט הזה שחרר את השאר
- **לא אומת:** —
- **הצעד הבא:** —

---

### 2026-09-08 · חמש ריצות דיפלוי שנכשלו ברצף

חמישה מיזוגים נכנסו ל-`aws-migration` וריצת הדיפלוי של כל אחד נכשלה. כולם
אבות-קדמונים של הקצה הנוכחי, כלומר התוכן הגיע לפרודקשן בסופו של דבר — דרך
ריצות 41 ו-42 שהצליחו.

| קומיט | ריצה | תאריך | כותרת |
|---|---|---|---|
| `712f9ce01fb6629bf94c9013ddce250e2812a838` | run 40 · `failure` | 2026-09-08 | Merge the backup fix so the deploy can reach the migrations |
| `72f6759660e1e5f18704276c60045b6f7adfb0ac` | run 39 · `failure` | 2026-09-08 | Merge the compose fix so the halted deploy can finish |
| `635d8828bc22047695c3223fad6a6d9421664378` | run 38 · `failure` | 2026-09-08 | Unblock the deploy: make the gate's checks match the app |
| `6ebac96394f8ecc5d65f0ddf9354a8dc4ad4a65c` | run 37 · `failure` | 2026-09-08 | Merge the shop 'show all' fix |
| `532f3abd51d7d326b95759595ebbbe0a488ab72e` | run 36 · `failure` | 2026-09-07 | Merge the accumulated release |

- **סטטוס:** נכשל (לכל חמשת הריצות)
- **מה זה אומר לפי גופי הקומיטים:** `635d8828` מתאר שהשער — לא האפליקציה — הפיל כל דיפלוי מאז 2 בספטמבר; `72f67596` מתאר ש-`mipo.pet` הגיש פרונט חדש מול API ישן עם מיגרציות שלא רצו
- **לא אומת:** סיבת הכישלון המדויקת של כל ריצה — לא נפתחו הלוגים שלהן
- **הצעד הבא:** —

---

### 2026-09-02 ומוקדם יותר · היסטוריה לפני התיעוד

| קומיט | ריצה | תאריך | כותרת |
|---|---|---|---|
| `ed499837f5a48a10fb47456124721ec2614b957b` | run 35 · `success` | 2026-09-02 | Merge `claude/admin-password-loop` |
| `a3e0b42679d6ef815d8fae5f0519dd51df101d3b` | run 34 · `success` | 2026-08-25 | Add order sharing controls |
| `2d1ce745056b9e9792f02cad9bd760240fb7021e` | run 33 · `success` | 2026-08-23 | Fix CardCom payment verification |

- **סטטוס:** נפרס ואומת (שלושתם)
- **שערים:** — (גופי הקומיטים ריקים או חד-שורתיים)
- **לא אומת:** תוכן השינויים — אין גוף קומיט לגזור ממנו
- **הצעד הבא:** —

---

## תחזוקה

**בתחילת סשן:** קרא את "מצב נוכחי" ו"ממתין להחלטה" והצג אותם.

**בסוף סשן:** הוסף רשומה. אם לא נעשה כלום — כתוב זאת במפורש, אל תדלג.

**אחרי דחיפה לפרודקשן:** עדכן סטטוס רק אחרי שהריצה הסתיימה. בזמן שהיא רצה
הסטטוס הוא "מוזג ל-aws-migration — הדיפלוי עוד רץ".

**לפני כל בדיקת סטטוס:**
```
git fetch origin +refs/heads/aws-migration:refs/remotes/origin/aws-migration --force
git ls-remote origin refs/heads/aws-migration
```
ה-ref המקומי נתקע. אל תסמוך עליו.

**רשומות עבר הן לקריאה בלבד.** טעות מתוקנת ברשומה חדשה שמפנה לישנה.
