# דמות חיה במרכז המסך

הצעה בלבד. המסך שהמשתמשים רואים לא משתנה בה. הדגל כבוי, אין מפתח, ואין קריאה לשירות בתשלום. שם המשתנה כתוב למטה, בלי ערך.

הבקשה: חיית המחמד במרכז המסך הראשי תהיה דמות עם נפח, שזזה כמו משהו חי, ונראית כמו החיה שבתמונה שהמשתמש העלה. נכון ל־15 בספטמבר 2026, אצל חיית ההדגמה ציפסר הופיעה תמונה סטטית בתוך עיגול.

הכיוון עודכן: דגם ריאליסטי נפרד לכל חיית מחמד, מתמונה אחת שלה (image-to-3D), לא דגם משותף למין ולא סגנון מצויר. הריל שנשלח קודם נשאר רק כרעיון נפרד לגירוד בדף הנחיתה, לא כמראה של הדמות.

## מה רואים היום

המרכז של מסך הבית הוא `PetOrbit` (`src/components/home/PetOrbit.tsx`), בתוך `MipoHome`. סביבו ארבעה כפתורים (בריאות, מסמכים, חנות, Mipo AI). הדמות עצמה היא ריבוע של 166 פיקסלים.

מה שמצויר שם תלוי בשאלה אחת: האם לחיית המחמד יש חבילת דמות במצב `ready`.

- אין חבילה מוכנה. מוצגת `avatar_url` — התמונה שהועלתה לפרופיל — ובאין תמונה, האיור הכללי `default-pet-avatar.png`. התמונה נחתכת לעיגול עם מסגרת לבנה (`overflow-hidden rounded-full`, `object-cover`). זה המסלול של ציפסר כל עוד הסטודיו לא סיים חבילה.
- יש חבילה מוכנה, והקובץ באמת שקוף. הדמות המצוירת עומדת מלאה מעל הילה, על דיסקית מוארת, בלי עיגול. השקיפות נבדקת בפינות התמונה (`useImageHasAlpha`). עד שהבדיקה עונה, וגם אם היא עונה שהתמונה אטומה, נשאר העיגול. עיגול הוא ברירת המחדל הבטוחה, כי מודל התמונות כבר החזיר פעם רקע מצויר במקום רקע שקוף.
- מצב הרוח לא מזיז גוף. הוא מחליף תמונה מתוך החבילה (רגוע, שמח, נרגש, סקרן, מודאג) ומשנה את קצב הנשימה. החוזה לגוף עתידי — עיניים, פה, ראש, גוף — כתוב ב־`MOOD_COMPOSITION` ב־`src/lib/characterBehavior.ts`, והקוד אומר במפורש ששום דבר עדיין לא מצייר ממנו.

מאחורי הדמות יש הילת צבע ב־CSS (`PresenceAurora`). על הדמות עצמה יש נשימה: שינוי קנה מידה של בערך שלושה אחוזים ועלייה של כמה פיקסלים, במשך כשלוש עד חמש שניות, לפי מצב הרוח (`presenceIdle.ts` וה־keyframes ב־`src/index.css`). אין הטיה. מי שמבקש פחות תנועה במערכת ההפעלה רואה תמונה קפואה לגמרי.

צילום מסך של רגע אחד נראה כמו תמונה סטטית בעיגול. התנועה קיימת, והיא קטנה מכדי להרגיש כמו יצור חי.

מסך הפרופיל הוא עיגול אחר, קטן יותר. `PetHeroVisual` (`src/components/profile/PetHeroVisual.tsx`) מצייר תמיד את תמונת הפרופיל או אייקון של כלב/חתול, עם נשימה, הילה, וקפיצה קצרה אחרי פעולה. יש שם שדה `renderer` עם הערך `"scene3d"`, והוא לא בשימוש: הקומפוננטה מתעלמת ממנו ומציירת תמונה. אין three.js, אין R3F, ואין קובץ מודל בשום מקום באפליקציה.

### למה ציפסר בעיגול

נבדק בקוד, ואז הורץ מקומית אותו מסלול שהבית מצייר כשאין חבילת דמות.

חבילת הדמות לא נוצרת לבד. היא נולדת בסטודיו (`PetCharacterStudio`): מעלים תמונות, המודל מציע שני כיוונים (ריאליסטי או מוקטן), בוחרים אחד, ואז נוצרות שש תמונות סטילס. עד ש־`status` הוא `ready`, הבית מתעלם מהחבילה ושם את `avatar_url` בעיגול. בפיקסטורות של הבדיקות ציפסר הוא חתול עם כתובת תמונה, בלי חבילה. צילום האמת מחשבון ההדגמה באתר החי לא נמצא במאגר, ואין כאן התחברות לחשבון הזה. החיתוך העגול לא תלוי בתוכן התמונה: כל תמונת פרופיל בלי חבילה מוכנה ושקופה מגיעה לאותו עיגול.

ההרצה המקומית (מסך הבית, עם אותה צורת תשובה מהשרת: חיית מחמד בשם ציפסר, תמונה, `character: null`) הראתה את הכותרת «איך ציפסר מרגיש», תמונה בתוך עיגול עם מסגרת, הילה, ו־`data-presence-idle="live"`. זה העיגול. הנשימה רצה, והיא לא הופכת את העיגול לדמות.

יש עוד סיבה שהעיגול נשאר גם אחרי יצירה: אם הקובץ שנוצר לא שקוף בשלוש מארבע הפינות, `PetOrbit` מסרב לשחרר אותו מהעיגול. זה תיקון מכוון אחרי שהמסך הראה לוח שחמט מצויר.

### עבודה שכבר קיימת, ומה היא לא

הענפים `claude/character-behavior`, `claude/avatar-identity` ו־`claude/image-pipeline` כבר נמצאים בתוך `aws-migration`. אין בהם קוד שלא מוזג.

- התנהגות (`character-behavior`): מצב רוח בסיסי, אירוע קצר שדורס אותו, ומיפוי ממצב רוח לתמונה. מצב רגוע משתמש בתמונה «גאה», כדי לא לייצר תמונה שביעית. זו העלות היקרה במוצר.
- זהות (`avatar-identity`): שני סגנונות, שניהם ניסוח של «דמות תלת־ממד» — אבל כהוראה למודל תמונות, לא כקובץ תלת־ממד. התמונה שהועלתה נשמרת כמקור. יש סקריפט שמייצר דוגמה אחת לכל סגנון.
- `image-pipeline` הוא על תמונות מוצרים בחנות (במקום קישור לספק), לא על הדמות במרכז.

PR #15 הוסיף נשימה ל־`PetHeroVisual` על ענף של דמות הפרופיל, לא על `main`. PR #18 מנסה להוריד את אותו שינוי ל־`main` ועדיין פתוח. הוא לא נוגע ב־`aws-migration`. מה שכן נכנס לכאן הוא PR #23 (הילה ונשימה במסך הבית, מוזג ב־16 בספטמבר 2026) ואחר כך הורדה של ההטיה, כי עיגול מוטה נראה אותו דבר ודמות גזורה מוטה נראית שבורה. `PetHeroVisual` ב־`aws-migration` הוא הייבוא מ־PR #19: נשימה עדינה, בלי הקפאה למי שמבקש פחות תנועה.

הצינור ב־`server/src/petCharacter.js` מבקש «רינדור תלת־ממד» עם נפח ופרווה, על רקע שטוח שהשרת הופך לשקיפות. התוצאה היא PNG. אי אפשר לסובב אותו, למצמץ, או לכופף זנב. כל הבעה היא תמונה חדשה, וכל תמונה עולה כסף ועלולה לא להישאר אותו בעל חיים. הניסוח הריאליסטי שם (פרווה עם סיבים, עיניים לחות) הוא כיוון המראה הנכון לדמות החדשה, אבל הוא עדיין מייצר תמונה, לא קובץ GLB.

## הכיוון

דמות ריאליסטית, קרובה ככל האפשר לתמונה שהמשתמש מעלה. דגם GLB נפרד לכל חיית מחמד, לא דגם אחד לחתול ודגם אחד לכלב. צבע פרווה, כתמים ופרופורציות באים מהתמונה, לא מפלטת צבעים משותפת.

הריל שנשלח קודם הוא חתול מצויר (גוף מעוגל, פרווה מפוסלת, אור רך). הוא לא כיוון המראה של הדמות בבית. הוא נשאר רק ברעיון הנפרד לגירוד בדף הנחיתה, למטה.

מה שנפסל כמנוע. דגם משותף למין לא יכול להיות «החיה שלי». Rive ו־Lottie מחליפים צבעים על ריג גנרי. גיליון פריימים או וידאו מהסטודיו הקיים נשארים תמונות, בלי שלד, והם כבר העלות היקרה במוצר. Spline כצופה אצל המשתמש הוא שירות חיצוני כבד. Runway מחובר ומייצר וידאו ותמונה, לא GLB.

התצוגה, כשהדגל יידלק בעתיד: צ׳אנק נפרד של `three` ו־`@react-three-fiber`, קנבס אחד, בלי צלליות, יחס פיקסלים חסום, עצירה כשהלשונית מוסתרת. `prefers-reduced-motion` משאיר פריים שקט. בלי WebGL, או כשהדגל כבוי, או כשהיצירה נכשלת: העיגול של היום (`avatar_url`). השדה `renderer: "scene3d"` ב־`PetHeroVisual` נשאר לא בשימוש עד שהבית יציב, וגם אז לא שני קנבסים במקביל.

הדגל הוא משתנה שרת `PET_AVATAR_3D`. ברירת המחדל כבוי. ה־PR הזה לא מוסיף אותו ל־`.env` ולא קורא אותו במסכים שהמשתמשים רואים.

## הצינור, לכל חיית מחמד

זה התכנון. הוא לא בנוי ב־PR הזה.

### 1. העלאה בפרופיל

הכפתור יושב בפרופיל חיית המחמד, ליד התמונה שכבר שמורה ב־`avatar_url` (`src/pages/Profile.tsx`). תמונה אחת, PNG או JPEG או WebP. ההסכמה והניסוח העברי כבר קיימים בסטודיו (`PetCharacterStudio`); לא פותחים מסך העלאה שני עם כללים אחרים. התמונה נשמרת כמו היום תחת `UPLOAD_DIR` (ברירת מחדל `/app/uploads`, כתובת ציבורית `/uploads/…`). אין S3 בקוד השרת הזה. אם האחסון יעבור אחר כך ל־S3, המפתח נשאר אותו מפתח.

### 2. שער איכות, לפני שמוציאים קרדיט

דוחים את התמונה בלי לקרוא ל־Tripo. המשוב בעברית, על המסך, לא כקוד שגיאה.

| מה בודקים | מה אומרים |
| --- | --- |
| אין גוף מלא (ראש, גוף, רגליים, זנב) | «רואים רק חלק מהחיה. צריך שכל הגוף יופיע בתמונה — ראש, גוף, רגליים וזנב.» |
| יותר מחיה אחת, או לא החיה הרשומה | «בתמונה יש יותר מחיית מחמד אחת, או שזו לא החיה מהפרופיל. צלמו רק אותה.» |
| קובץ קטן, כהה, או מטושטש | «התמונה קטנה מדי, כהה מדי, או לא חדה. צלמו באור יום, עם כל הגוף בפריים.» |
| מבט ישר מלפנים | «התמונה ישר מלפנים. עדיף מהצד, או בזווית של שלושת רבעים, כדי שהמודל יקבל עומק.» |

שתי שכבות, והזולה רצה קודם:

- בדפדפן, בלי שרת ובלי מודל: סוג הקובץ, גודל עד 20MB (התקרה של Tripo), והצלע הארוכה. Tripo ממליצים לפחות 256×256. זה נמוך מדי לדמיון, אז הסף שלנו הוא 1024 בצלע הארוכה. בהירות ממוצעת על קנבס תופסת תמונה כהה. בדיקה כזו לא יודעת אם יש גוף מלא, חיה אחת, או זווית של שלושת רבעים.
- בדיקת ראייה בשרת, רשות, ורק אם הבדיקה הזולה עברה. הסטודיו כבר שולח את התמונות ל־Gemini ומבקש JSON עם `valid` ו־`full_body_visible` (`analyzeReferences` ב־`server/src/petCharacter.js`). מרחיבים את אותו JSON בשדות `single_animal` ו־`view` (`side`, `three_quarter`, `front`, `unclear`). דחייה כאן עולה קריאת ראייה שכבר קיימת במוצר, ולא קרדיט של Tripo. בלי `GEMINI_API_KEY` נשארת רק הבדיקה בדפדפן, והמשתמש מאשר במפורש שהגוף מלא והזווית מהצד — עדיין בלי לקרוא ל־Tripo על תמונה שנכשלה בבדיקה הזולה.

ל־Tripo עצמם: הנושא גלוי, מעט הסתרה, רקע נקי. יש פרמטר `enable_image_autofix`. במחירונים שנקראו אין לו שורת קרדיטים, אז לא מוסיפים אותו לחשבון.

### 3. תור בשרת

עובד בתוך תהליך השרת הקיים, טבלה חדשה של עבודות (לא תור תמונות המוצרים). כל עבודה: חיית מחמד, גיבוב SHA-256 של קובץ התמונה, סטטוס, `task_id` של הספק ברגע שהוא חוזר, ומספר ניסיונות.

- אידמפוטנטיות: אותו חיית מחמד ואותו גיבוב לא פותחים עבודה שנייה. אם יש כבר עבודה בתור, בריצה, או מוכנה — מחזירים אותה. אחרי שיש `task_id`, מרעננים סטטוס ולא שולחים יצירה מחדש.
- ניסיונות חוזרים: כשל רשת, או קוד 2000 (תקרת המקביליות של Tripo), עם השהיה עולה, עד שלושה ניסיונות. משימה שהספק סימן ככושלת לא מחויבת, לפי ה־FAQ, ואז מותר לפתוח משימה חדשה על אותו גיבוב.
- קצב: תקרת ברירת המחדל של Tripo היא 10 משימות במקביל ([FAQ](https://docs.tripo3d.ai/other/support-faq.html)). ריג ואנימציה חולקים 3 במקביל ([דף האנימציה](https://developers.tripo3d.ai/en/models/animation)). התור שלנו נשאר מתחת לשתי התקרות.

המכסה נספרת בשרת לפי `pet_id`, לא לפי משתמש. שורה בסטטוס `failed` לא נספרת. אותו גיבוב תמונה שכבר הצליח או שעדיין רץ מחזיר את אותה עבודה, ולא פותח יצירה חדשה.

### מכסה לפי מסלול

אין היום במאגר הבחנה בין מסלול חינמי למסלול בתשלום. זה תלות פתוחה, מפורטת למטה. עד שתהיה הבחנה, אין איפה לקרוא «פרו».

מסלול חינמי, לכל חיית מחמד, לכל החיים: יצירה אחת, ועוד החלפה אחת מתמונה אחרת. אחרי שההחלפה נוצלה (שתי שורות `succeeded` עם שני גיבובים שונים), הכפתור כבוי והטקסט הוא: «ההחלפה כבר נוצלה לחיית המחמד הזו.»

מסלול בתשלום: בממשק אין תקרת החלפות. בשרת יש תקרת שימוש לרעה, נסתרת, לכל חיית מחמד: לכל היותר 5 יצירות שהצליחו בחודש קלנדרי, ולכל היותר 3 ביום קלנדרי. היום והחודש לפי `Asia/Jerusalem`. שתי התקרות באות ממשתני סביבה, ברירת מחדל 5 ו־3: `PET_AVATAR_PRO_MONTHLY_CAP` ו־`PET_AVATAR_PRO_DAILY_CAP`. לא שמים אותם ב־`.env` ב־PR הזה. כשאחת מהן נתפסת, המשתמש רואה «נסו שוב מחר», בלי מספרים ובלי שם של תקרה. אותה שורה גם כשהחודש נגמר, כדי לא לגלות איזו תקרה זו.

באותו רגע נשלחת התראה לבעלים. ב־PR #30, שעדיין פתוח ולא בענף הזה, יש `notifyOwner` מתוך `createOwnerNotifier` ב־`server/src/ownerNotify.js`. `buildOwnerMessage` מחזיר null לסוג אירוע שלא נמצא ב־`EVENT_TYPES`, וההודעה לא נשלחת. הסוג המוצע הוא `pet.avatar.abuse`, עם `userId`, `petId`, ו־`window` (`day` או `month`). הטקסט לבעלים מזהה את החשבון ואת חיית המחמד, ומקשר ל־`/admin/customers/<user id>`, כמו הרשמה ב־#30. הוא לא חייב להסתיר את סוג החלון. עד ש־#30 נכנס ל־`aws-migration` ומוסיף את הסוג לרשימה, האירוע מוגדר כאן ואין לו פונקציה לקרוא לה.

### טבלת המונים

```sql
create table public.pet_avatar_generations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null references public.app_users(id),
  photo_hash text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  provider_task_id text,
  created_at timestamptz not null default now()
);
```

`user_id` נשמר בשביל ההתראה לבעלים. הספירה היא `where pet_id = $1`. אינדקס ייחודי חלקי על `(pet_id, photo_hash)` כשהסטטוס הוא `queued`, `running` או `succeeded`, כדי שאותה תמונה לא תיפתח פעמיים.

הבדיקה, לפני קריאה לספק:

1. שורות `failed` לא בתמונה.
2. שורות `queued` ו־`running` תופסות מקום, כדי ששתי לחיצות במקביל לא יעברו יחד. אם העבודה נכשלת, המקום מתפנה.
3. גיבוב שכבר יש לו שורה פתוחה או שהצליחה: מחזירים אותה. זו לא יצירה חדשה.
4. מסלול חינמי: מספר השורות שתופסות מקום הוא 0, מותר. הוא 1, והגיבוב חדש, מותר — זו ההחלפה. הוא 1 והגיבוב זהה, מחזירים את הקיימת. הוא 2 ומעלה, הכפתור כבוי.
5. מסלול בתשלום: סופרים את השורות שתופסות מקום וש־`created_at` שלהן ביום הנוכחי, ובחודש הנוכחי, לפי `Asia/Jerusalem`. אם היום הגיע ל־`PET_AVATAR_PRO_DAILY_CAP` או החודש ל־`PET_AVATAR_PRO_MONTHLY_CAP`, דוחים בלי לקרוא לספק, מראים «נסו שוב מחר», ושולחים `pet.avatar.abuse`.

### מה קיים היום במקום מסלול

נבדק בקוד של הענף הזה. אין שדה מסלול, אין מנוי לאפליקציה, ואין טבלת זכאויות.

- `public.app_users` ב־`server/sql/0005_auth_profiles_pets.sql`: אימייל, סיסמה, שם, טלפון, תאריך לידה, `is_active`. אחר כך נוספו שדות ייבוא (`server/sql/0011_supabase_identity_migration_support.sql`), אימות אימייל (`server/sql/0024_email_verification.sql`), ו־`terms_accepted_at` / `terms_version` (`server/sql/0023_terms_acceptance.sql`). אין עמודת מסלול.
- `public.profiles`: `points` ברירת מחדל 0 (`server/sql/0011_supabase_identity_migration_support.sql`). אלו נקודות, לא מסלול בתשלום.
- `public.pets` באותו קובץ 0005, והשדות שנוספו ב־`server/sql/0007_profile_health_fields.sql` וב־0011: בריאות, ביטוח חיה, מצב רוח. אין מסלול.
- מועדון: `src/pages/ClubTerms.tsx` ו־`src/components/LegalDrawer.tsx`. ההצטרפות חינמית ופתוחה לכולם. אין מסלול מועדון בתשלום.
- Cardcom: `public.cardcom_events` ב־`server/sql/0004_payments.sql`, והטיפול ב־`server/src/cardcom.js` וב־`server/src/index.js`. זה תשלום על הזמנת חנות. `order_type` יכול להיות `auto-restock` (מנוי על מוצר, `want_recurring_order` ב־`server/src/index.js`). זה לא מנוי על האפליקציה.
- ספר העלויות ב־`server/sql/0026_ai_gateway_foundation.sql` (`ai_requests`, `usage_events`, `cost_events`) רושם שימוש במודל. הוא לא אומר מי במסלול בתשלום.

תלות פתוחה: בלי עמודה או טבלה שמבחינה בין חינמי לבתשלום, אי אפשר להפעיל את שתי המכסות. ההצעה לא מוסיפה את העמודה. כשתוכרע, מקום טבעי הוא `app_users.plan` עם הערכים `free` ו־`pro`, ברירת מחדל `free`. עד אז כל חשבון נשאר בלי מסלול, והדמות לא נבנית למשתמשים.

המפתח `TRIPO_API_KEY` נקרא רק כאן, בשרת, בכותרת `Authorization: Bearer`. במדריך המהיר Tripo קוראים למשתנה `TRIPO_API_KEY`. ב־FAQ המפתח מתחיל ב־`tsk_` (מזהה הלקוח `tcli_` הוא לא מפתח). לא `VITE_`. אין ערך ב־PR הזה.

### 4. ריג אוטומטי, ותנועת מנוחה בקוד

לפני הריג קוראים ל־`rig-check` (מתועד כחינם). אם `riggable` והסוג הוא quadruped, ריג עם `model: v2.5-20260210` ו־`rig_type: quadruped`, פלט `glb`.

הפריסט המתועד לבעל חיים על ארבע הוא אחד: `preset:quadruped:walk` ([retarget](https://developers.tripo3d.ai/en/docs/animations-retarget)). מנוחה, מצמוץ וזנב לא ברשימה. אותם מזיזים בקוד על העצמות, ב־three.js: נשימה, מצמוץ, כשכוש, והטיה לפי מצב הרוח שכבר קיים. את קליפ ההליכה אפשר לדלג עליו; הוא לא המנוחה במרכז הבית.

`quad: true` לא נשלח. המסמך של image-to-model אומר ש־quad כופה FBX, ושאוריינטציה לא ברירת־מחדל עלולה לשבור עיבוד המשך (ריג) בלי שגיאה.

### 5. שמירת ה־GLB

מורידים מיד. המדריך המהיר אומר שכתובת המודל פגה אחרי 5 דקות. ה־FAQ אומר שקישור ההורדה תקף 60 שניות. העובד מוריד ברגע שהמשימה מצליחה, ולא סומך על החלון הארוך.

המפתח: `pets/{petId}/avatar/{photoHash}.glb`, תחת `UPLOAD_DIR` / `PRIVATE_UPLOAD_DIR` שכבר קיימים. אין דלי S3 בשרת. אותו מפתח עובר ל־S3 אם האחסון יעבור.

דחיסה: ב־image-to-model, כשהמודל הוא v3.0 ומעלה, `compress: "geometry"` הוא meshopt. במחירונים שנקראו אין שורת קרדיטים לפרמטר הזה, אז לא ממציאים מחיר. Draco לא מופיע שם. אם צריך Draco, זה כלי מקומי אחרי ההורדה, בלי קריאה נוספת.

תקציב משקל שלנו, לא מספר של Tripo: אחרי הדחיסה, עד 4MB לקובץ, מרקם 1024, ו־`face_limit` בטווח ש־Tripo מסמנים לווב ולטלפון: 10,000–50,000 מצולעים. קובץ מעבר לזה נדחס מחדש מקומית. לא מייצרים מחדש רק בגלל המשקל.

המחירון החדש שם `face_limit` תחת המרה מתקדמת (10 קרדיטים). המחירון הישן שם תוספת של 5 קרדיטים על פרמטרים כאלה במשימת המרה. דף ה־image-to-model לא אומר אם `face_limit` על היצירה עצמה מחויב. לא מוסיפים את זה לסה״כ עד ששאילתת משימה מחזירה `credits_consumed`.

### 6. בזמן ההמתנה, וכשזה נכשל

היצירה אורכת דקות, לא שנייה. כל עוד הסטטוס הוא בתור או בריצה, בבית ובפרופיל נשארת תמונת החיה בעיגול, עם משפט: «בונים דמות מהתמונה. זה יכול לקחת כמה דקות.»

כשזה מוכן: רשומה בטבלת `notifications` שכבר קיימת. דחיפת דפדפן לא מחוברת היום (ה־service worker הוא מעטפת האפליקציה, לא Push). לא מוסיפים ספק דחיפה בהצעה הזו.

כשל, דגל כבוי, אין WebGL, או בקשת פחות תנועה: התמונה הרגילה, כמו היום.

### 7. עלות והמתנה

המספרים למטה הם רק מה שכתוב בדפים שנקראו ב־27 בספטמבר 2026. דוגמת JSON עם `credits_consumed: 100` היא דוגמה במסמך, לא מחיר.

מקורות:

- [API Pricing](https://developers.tripo3d.ai/en/pricing) — קרדיט = $0.01. Image to 3D: 20 בלי טקסטורה, 30 עם טקסטורה סטנדרטית. תוספות על הבסיס: HD Texture ‏+10, ‏8K Ultra Texture ‏+20, HD Geometry ‏+20. ריג 25. בדיקת ריג חינם. Retarget ‏10 לאנימציה. טקסטורה כמשימת עיבוד נפרדת: Standard ‏10.
- [OpenAPI pricing](https://docs.tripo3d.ai/get-started/pricing.html) — אותו יחס, $1 = 100 קרדיטים. Image to model בסדרת H2/H3: 20 / 30. `texture_quality=detailed` מוסיף 10. P1 עם טקסטורה: 50 (בלי טקסטורה: 40), והתוספות של H לא חלות על P1. ריג 25, retarget ‏10, pre rig check חינם. משימה כושלת לא מחויבת גם ב־[FAQ](https://docs.tripo3d.ai/other/support-faq.html) וגם ב־[Billing](https://developers.tripo3d.ai/en/docs/billing) (הקפאה מוחזרת בכשל או בביטול). קרדיטים לא פגים.
- [Image to 3D](https://developers.tripo3d.ai/en/docs/generation-image-to-model) — `texture` ברירת מחדל true, אז ה־30 כבר כוללים טקסטורה סטנדרטית. לא מוסיפים עליהם את משימת ה־Texture הנפרדת של 10. `detailed` יקר יותר, `extreme` יקר מ־detailed. רזולוציה מומלצת לפחות 256×256. ווב/טלפון: 10,000–50,000 מצולעים.
- [Auto Rig](https://developers.tripo3d.ai/en/docs/animations-rig) — `v2.5-20260210` ל־quadruped.
- [Animation Retarget](https://developers.tripo3d.ai/en/docs/animations-retarget) — ל־quadruped מתועד רק `preset:quadruped:walk`.
- [Animation model](https://developers.tripo3d.ai/en/models/animation) — 10 קרדיטים לאנימציה, מהירות מתועדת של בערך 5 שניות.
- [Quick Start](https://developers.tripo3d.ai/en/docs/quick-start) — יצירה טיפוסית 10–120 שניות. סקר כל 2 שניות, לא יותר מבקשה בשנייה. דוגמת «דמות למשחק» (דו־רגלי, שלושה קליפים) מפרסמת בערך 105 שניות ובערך 85 קרדיטים. זה לא הצינור שלנו.
- זמן הריג לבדו לא מפורסם. סכום שלב־אחר־שלב לחיית מחמד לא מפורסם. במסך כותבים «כמה דקות»: שלוש משימות בטור, ועוד תור. בלי תור, החלון המתועד ליצירה הוא 10–120 שניות, והאומדן הרב־שלבי היחיד הוא בערך 105 שניות לצינור ארוך יותר.

| שלב | קרדיטים | דולר | מקור |
| --- | --- | --- | --- |
| Image to 3D, בלי טקסטורה | 20 | 0.20 | מחירון ה־API |
| Image to 3D, טקסטורה סטנדרטית כלולה | 30 | 0.30 | מחירון ה־API |
| תוספת `detailed` / HD | 10 | 0.10 | מחירון OpenAPI ומחירון ה־API |
| תוספת 8K | 20 | 0.20 | מחירון ה־API |
| בדיקת ריג | 0 | 0 | שני המחירונים |
| ריג | 25 | 0.25 | שני המחירונים |
| `preset:quadruped:walk` | 10 | 0.10 | מחירון ה־API, 10 לאנימציה |
| נשימה, מצמוץ, זנב | אין שורה | 0 | לא ברשימת ה־quadruped; נעשה בקוד |

ליצירה אחת, המסלול המוצע: טקסטורה סטנדרטית + ריג, בלי קליפ הליכה, כי המנוחה בקוד. **55 קרדיטים, $0.55.** עם קליפ ההליכה: **65 קרדיטים, $0.65.** עם טקסטורה מפורטת וקליפ הליכה: **75 קרדיטים, $0.75.**

P1 עם טקסטורה, לפי מחירון ה־OpenAPI, הוא 50 במקום 30. אז 50+25=**$0.75** בלי הליכה, ו־50+25+10=**$0.85** עם הליכה. דף המחירון החדש מציג לשונית P Series; בטקסט שנקרא הופיעה רק טבלת H, אז אין כאן מספרים מלשונית ה־P החדשה.

מסלול חינמי הוא שתי יצירות שהצליחו, כולל ריג. כשל אצל הספק לא נספר ולא מחויב. שתי יצירות בסדרת H עם טקסטורה סטנדרטית וריג, בלי הליכה: **$1.10.** עם הליכה: **$1.30.** עם טקסטורה מפורטת והליכה: **$1.50.** P1 בלי הליכה גם **$1.50.** P1 עם הליכה הוא **$1.70**, מחוץ לטווח של בערך $1.10–$1.50.

במסלול בתשלום התקרה החודשית היא זו שסוגרת את החודש: 5 יצירות שהצליחו לחיית מחמד. אותו מחירון: **$2.75** בלי הליכה, **$3.25** עם הליכה, **$3.75** עם טקסטורה מפורטת והליכה, **$4.25** ל־P1 עם הליכה. תקרת היום (3) מגבילה יום אחד ל־3 מתוך ה־5, לא את החודש.

משימה שהצליחה אבל לא דומה לחיה עולה את מלוא הסכום. לכן השער רץ קודם. משימה שנכשלה מתועדת כלא מחויבת.

ניסיון בסטודיו של הבעלים הוא לא הקרדיטים האלה. ה־[FAQ](https://docs.tripo3d.ai/other/support-faq.html) אומר שהווב וה־API הם שני חיובים נפרדים, והקרדיטים לא משותפים. במסלול החינמי Tripo שומרים את כל הזכויות על הקלט והפלט ([Terms, 5.2.1](https://www.tripo3d.ai/terms), עודכן 11 ביולי 2025), ובדף המחיר של הסטודיו המסלול החינמי מסומן Public Models · Non-Commercial Use ([Studio pricing](https://www.tripo3d.ai/pricing)). קובץ מניסיון חינמי מתאים לאב טיפוס פנימי בלבד, לא למשתמשים. אם יופיע אחר כך GLB כזה, אפשר לטעון אותו בדף הפיתוח. לא מחכים לו.

חלופה אם הריג על ארבע נכשל: Meshy, משתנה `MESHY_API_KEY`, ורק אז. לא שמים מספרים של Meshy כאן. Runway לא מייצא GLB.

## רעיון נפרד: גירוד בדף הנחיתה

לא חלק מהדמות, ולא נבנה ב־PR הזה.

הריל הוא שתי תמונות סטילס וגירוד ביניהן, לא דמות חיה. את האפקט אפשר לשים בהירו של `/install` (היום `landing-hero.jpg`): שתי שכבות של MIPO, מסיכה במשיכת אצבע או עכבר, וכפתור שחושף בלי גרירה. מי שמבקש פחות תנועה רואה את השכבה השנייה בלי משחק. לא מעתיקים מהריל את המשפט, את לוגו הביטוח, את התפריט, או את «ארבע דקות לבד».

## אב הטיפוס שב־PR הזה

כתובת, רק כשמריצים `npm run dev`: `/dev/pet-avatar`. `vite build` זורק את הענף כי `import.meta.env.DEV` הוא false.

הדף מראה את הצינור כטקסט, בלי העלאה ובלי קריאה לספק, ואת תנועת המנוחה על גוף בדיקה (כדורים): נשימה, מצמוץ, זנב, מצב רוח, מגע. זה לא GLB של חיה אמיתית ולא דגם משותף למין. `?fallback=1` או דפדפן בלי WebGL מחזיר את העיגול.

## נספח טכני

Home centre is `PetOrbit` inside `MipoHome`. A ready character pack plus an alpha verdict of `"alpha"` stands the generated PNG free. Every other case crops `avatar_url` into a circle with a small CSS breath and no rotation. `PetHeroVisual` is always the image path; `renderer: "scene3d"` is unused. No WebGL library is installed. Uploads go to `UPLOAD_DIR` (default `/app/uploads`). There is no S3 client in the server. In-app notifications already exist; browser push does not.

Direction: one realistic GLB per pet, generated from that pet's photo. Not one mesh per species, and not the cartoon reel. The reel stays an unbuilt scratch-reveal idea for `/install` only.

Pipeline, not built in this PR: profile upload; a quality gate before any provider call; a `pet_avatar_generations` row per attempt (`pet_id`, `user_id`, `photo_hash`, `status`, `provider_task_id`, `created_at`). Quota is per `pet_id`. Rows in `failed` do not count. In-flight `queued` / `running` rows hold a slot. The same photo hash returns the existing row.

There is no Free vs Pro field on `app_users`, `profiles`, or `pets`. Club copy says membership is free for everyone. Cardcom and `auto-restock` are shop payments, not an app plan. `profiles.points` is a loyalty counter. Applying the two quotas is an open dependency (a future `app_users.plan` of `free` or `pro` is the natural place; this PR does not add it).

When that field exists: free is one successful generation plus one successful regenerate from a different photo, lifetime, then the button is disabled with «ההחלפה כבר נוצלה לחיית המחמד הזו.» Pro shows unlimited changes. The server still caps successful generations at `PET_AVATAR_PRO_DAILY_CAP` (default 3) per Asia/Jerusalem day and `PET_AVATAR_PRO_MONTHLY_CAP` (default 5) per calendar month, per pet. The user sees «נסו שוב מחר» with no numbers. The owner alert is event `pet.avatar.abuse`. `notifyOwner` is not in this branch. PR #30 (open) drops unknown event types in `buildOwnerMessage` until `pet.avatar.abuse` is added to `EVENT_TYPES`.

Free max, two successful H-series generations with standard texture and rig: $1.10 without the walk clip, $1.30 with it, $1.50 with detailed texture and the walk clip. P1 with the walk clip is $1.70, outside that band. Pro worst case per pet per month is five successes: $2.75, $3.25, $3.75, or $4.25 on those same four bills.

Quadruped auto-rig (`v2.5-20260210`); idle, blink, and tail in three.js because the only documented quadruped preset is `preset:quadruped:walk`. Store `pets/{petId}/avatar/{photoHash}.glb` with Tripo's `compress: "geometry"` (meshopt) and a 4MB budget of ours. Flag `PET_AVATAR_3D` stays off. Failure, flag off, or no WebGL keeps the photo. Tripo concurrency stays 10, and 3 for rig/animation.

Credits, $0.01 each, from the pages linked in the Hebrew section. Standard image-to-3D already includes texture at 30. Rig is 25. Walk is 10. Rig check is free. Recommended per pet: 55 credits ($0.55) without the walk clip, 65 ($0.65) with it. Detailed texture is +10. P1 with texture is 50 on the OpenAPI pricing page. Failed tasks are documented as not charged. A successful but rejected likeness is charged in full. Rig-only latency is not documented. Typical generation is 10–120 seconds. The only published multi-step estimate is ~105 seconds for a different biped pipeline. UI copy says a few minutes.

Env, server only, not added: `TRIPO_API_KEY`. Fallback name if the quadruped rig fails: `MESHY_API_KEY`. Free-plan outputs: Tripo retains all rights (terms §5.2.1). API credits are billed separately from Studio (OpenAPI FAQ §11).

The dev route is `/dev/pet-avatar`. Production users do not get that route or that module.
