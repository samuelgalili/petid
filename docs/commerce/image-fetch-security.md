# Image Fetch — SSRF Fix

תיעוד התיקון לפער ה-SSRF בהורדת תמונות מרוחקות.

**תוקן 2026-09-14.** שני קבצים. אפס שינויי סכמה, אפס מיגרציות.

---

## 1. הפער שאומת

`fetchImageBuffer` הוריד כתובת מרוחקת אחרי בדיקת **פרוטוקול בלבד**, והריץ
`redirect: "follow"` — כלומר גם יעד ההפניה לא נבדק.

כתובות התמונה נאספות מ-HTML של ספק. **התוכן ששולט ב-URL אינו מהימן**, גם
כשהיוזם הוא אדמין מאחורי `requireAdminPermission`.

**מה שהיה אפשרי:** דף ספק שמכיל `<img src="http://169.254.169.254/...">`,
או כתובת ציבורית שמפנה פנימה.

---

## 2. התיקון — שימוש חוזר, לא מאמת שני

**לא נכתבה לוגיקת SSRF חדשה.** `urlSafety.js` כבר הכיל פתרון שלם, והקוצר כבר
השתמש בו. `fetchImageBuffer` עובר עכשיו דרך `fetchValidatedRemoteUrl`.

### מה השומר הקיים כבר עושה — נבדק, לא הונח

| דרישה | מצב |
|---|---|
| פענוח DNS | ✅ `lookupFn(hostname, { all: true, verbatim: true })` |
| loopback | ✅ `127/8` · `::1` |
| RFC1918 | ✅ `10/8` · `172.16-31` · `192.168/16` |
| link-local | ✅ `169.254/16` · `fe80::/10` |
| **cloud metadata** | ✅ `169.254.169.254` נכלל ב-link-local |
| IPv4 ו-IPv6 | ✅ |
| hostname ו-IP literal | ✅ |
| **הפניות** | ✅ `redirect: "manual"`, כל hop מאומת מחדש |
| **DNS rebinding** | ✅ `safeRemoteDispatcher` חוסם גם בשלב החיבור |
| IPv4-mapped IPv6 | ✅ `::ffff:127.0.0.1` נחסם |
| IP מספרי | ✅ `http://2130706433/` נדחה |

**הסעיף האחרון הוא הסיבה שלא הרחבתי את המאמת:** הוא כבר מטפל בכל מה שהתדריך
דרש, כולל rebinding — התרחיש שבו השם עובר אימות ואז משנה תשובה לפני החיבור.

---

## 3. מה נוסף ב-`fetchImageBuffer`

| # | תוספת | ערך |
|---|---|---|
| 1 | אימות SSRF | דרך `fetchValidatedRemoteUrl` |
| 2 | הפניות ידניות ומאומתות | **מקסימום 3** |
| 3 | בדיקת `content-type` | `image/*` · `application/octet-stream` · `binary/octet-stream` |
| 4 | תקרת בייטים בזרימה | **15 MB** (`MAX_IMAGE_SOURCE_BYTES`) |
| 5 | timeout לבקשה | **20 שניות** (`IMAGE_FETCH_TIMEOUT_MS`) |
| 6 | **timeout כולל להורדה** | **60 שניות** — חדש |
| 7 | ביטול גוף בכל דחייה | `body.cancel()` |
| 8 | מיפוי שגיאות | `url_rejected` · `unsupported_content_type` |

### שתי החלטות שראוי שיהיו מפורשות

**`content-type` חסר מתקבל.** חלק מהמקורות אינם שולחים אותו כלל, ו-`sharp`
מפענח את הבייטים מיד אחר כך ודוחה מה שאינו תמונה. הבדיקה נועדה לתפוס תשובה
ש**מצהירה** שהיא משהו אחר — דף שגיאה HTML, JSON, דף התחברות.

**`octet-stream` מתקבל.** כמה CDN-ים מגישים תמונות כך, ודחייה הייתה שוברת
ייבוא עובד.

**ה-timeout הכולל חדש.** ה-timeout הקודם כיסה את ההמתנה ל-headers בלבד; שרת
שעונה מהר ואז מטפטף את הגוף החזיק חיבור לנצח.

---

## 4. בדיקות — 25, כולן חדשות

`server/test/imageFetchSafety.test.js`. **אף בדיקה אינה פונה לאתר צד שלישי או
לשירות metadata אמיתי** — DNS מוזרק, ותשובות מגיעות משרת loopback מקומי.

| קבוצה | מכוסה |
|---|---|
| כתובות | loopback · unspecified · RFC1918 · CGNAT · multicast · link-local · metadata · IPv6 loopback/ULA/link-local · IPv4-mapped |
| URL ראשוני | `localhost` · IP literal פנימי · **hostname ציבורי שנפתר פנימה** · תשובה מעורבת · IP מספרי · אישורים ב-URL |
| הפניות | הפניה ל-IP פנימי · **הפניה יחסית** · חריגה מהמגבלה · **לולאה** · `Location` חסר |
| תשובה | תמונה תקינה · HTML נדחה · octet-stream מתקבל · non-2xx · גוף חורג · timeout |
| חיווט | שלוש בדיקות שהשומר האמיתי מחובר · הודעה שאינה חושפת כתובת |

### הוכחה שהבדיקות תופסות

החזרת `imagePipeline.js` לגרסה הפגיעה:

```
20/25 עוברות · 5 נכשלות
  16 · an HTML response is refused even when the URL ends in .jpg
  22 · refuses a private destination through the real guard
  23 · refuses localhost through the real guard
  24 · refuses a non-http protocol through the real guard
  25 · a rejection message names the rule, not the resolved address
```

---

## 5. שערים

typecheck ✅ · lint ✅ · imports ✅ · build ✅ · **282/282** יוניט (היו 257) ·
**38/38** מיגרציות · **19/19** API smoke.

---

## 6. מגבלות שנותרו

| # | מגבלה |
|---|---|
| 1 | **חלון TOCTOU תיאורטי** בין אימות ל-connect. מוקטן ב-`safeRemoteDispatcher` שבודק שוב בשלב החיבור, אך לא אפס |
| 2 | **אין allowlist של דומיינים.** כל יעד ציבורי מותר. הדוק יותר היה מונע SSRF יוצאת לגמרי, אך שובר ייבוא מספק חדש |
| 3 | **`content-type` חסר מתקבל** — ראה 3. הגנת העומק היא `sharp` |
| 4 | **גודל הזיכרון** — הגוף נצבר ל-Buffer. התקרה מגבילה, אך הורדות מקבילות מצטברות |
| 5 | **נבדק רק ב-loopback.** התנהגות מול CDN אמיתי לא נמדדה |
| 6 | **`redirect: "follow"` הוסר מהתמונות בלבד.** לא נסרקו נתיבי fetch אחרים במערכת |

**מגבלה 6 היא הכנה:** התיקון בהיקף שהוגדר. ייתכנו נתיבי fetch נוספים, ולא
נבדקו.
