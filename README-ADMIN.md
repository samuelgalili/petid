# ממשק הניהול של MIPO

ממשק הניהול הוא חלק מאפליקציית React ונשען על ה-Node API ועל PostgreSQL ב-AWS. אין במסלול הפעיל תלות ב-Supabase, ב-RLS או ב-Vercel.

## הרצה מקומית

נדרש Node.js 20.19 ומעלה.

1. התקינו תלויות עם `npm ci` ו-`npm ci --prefix server`.
2. הגדירו `DATABASE_URL`,‏ `ADMIN_API_KEY` ושאר ערכי השרת בקובץ `.env` מקומי שאינו נשמר ב-Git.
3. החילו מיגרציות עם `npm run db:migrate`.
4. הפעילו את ה-API עם `npm run dev:api`.
5. הפעילו את Vite עם `npm run dev` ופתחו את `/admin/login`.

## יצירת מנהל

נקודת האתחול מוגנת באמצעות `ADMIN_API_KEY`. אין להפעיל אותה מהדפדפן או לשמור את המפתח בקוד הלקוח.

```bash
curl --fail --request POST http://127.0.0.1:3000/api/admin/bootstrap \
  --header "Content-Type: application/json" \
  --header "X-Admin-API-Key: $ADMIN_API_KEY" \
  --data '{"email":"admin@example.com","password":"replace-with-a-long-password","display_name":"Admin"}'
```

הקריאה יוצרת מנהל או מחליפה את הסיסמה של מנהל קיים באותה כתובת. לאחר מכן הכניסה מתבצעת ב-`/admin/login`; השרת מנפיק עוגיית session מסוג `HttpOnly`.

`bootstrap` אינו מוחק רישום של אימות דו-שלבי, ואינו מסלול שחזור אליו.

## אימות דו-שלבי

האימות כבוי כברירת מחדל (`ADMIN_2FA_ENABLED`). כשהדגל כבוי, הכניסה היא סיסמה בלבד.

כשהדגל דולק:

1. `/admin/login` — אימייל וסיסמה.
2. `/admin/change-password` — רק אם יש סיסמה זמנית.
3. `/admin/two-factor` — סריקת QR באפליקציית אימות, אישור קוד, ועשרה קודי שחזור שמוצגים פעם אחת.

מנהל שכבר נרשם חייב קוד (או קוד שחזור) לפני הפאנל. מנהל שטרם נרשם נכנס ומקבל מסך רישום עם אפשרות לדלג. `ADMIN_2FA_REQUIRE_ENROLLMENT=true` הופך את הדילוג לשער.

זרע ה-TOTP נשמר מוצפן ב-AES-256-GCM תחת `SECRET_ENCRYPTION_KEY`, קשור למזהה המנהל. יצירת מפתח: `openssl rand -base64 32` או `npm run secret:keygen --prefix server`. אין לשמור את הערך בקוד.

שחזור למנהל שאיבד מכשיר וקודי שחזור, בלי להחליף סיסמה:

```bash
npm run admin:reset-2fa --prefix server -- --email admin@example.com
```

הפרטים, סדר ההדלקה, ו-SSM נמצאים ב-`docs/ADMIN_2FA_DEPLOYMENT.md`.

## מסכים פעילים

- `/admin/analytics`
- `/admin/orders`
- `/admin/products`
- `/admin/categories`
- `/admin/coupons`
- `/admin/notifications`
- `/admin/quick-import`
- `/admin/smart-editor`
- `/admin/settings`

נתיבים ישנים מופנים למסך פעיל ואינם מעידים שמודול הישן עדיין נתמך.

## תווית מחסן ושליחה לוואטסאפ

התווית נוצרת ממסך ההזמנות באדמין, בגודל 10×15 ס״מ, ומכילה: שולח, נמען, כתובת
מלאה, שני טלפונים, קוד כניסה ללובי, סימון השארה ליד הדלת, שורה לכל פריט עם
מק״ט, כמות ומשקל, הערות, וברקוד Code 128 של מספר ההזמנה. **אין עליה מחירים** —
המחסן אינו זקוק להם.

כפתור "שליחה למחסן בוואטסאפ" פותח את וואטסאפ עם הטקסט מוכן. מספר המחסן מגיע
מ-`WAREHOUSE_WHATSAPP_NUMBER`, וניתן לעקוף אותו בתיבה שבחלון לפני השליחה;
העקיפה נזכרת בדפדפן של אותו מנהל בלבד. ללא מספר תקין וואטסאפ נפתח עם בחירת
איש קשר, ולא עם נמען שגוי.

**התווית עצמה אינה נשלחת כקובץ.** קישור click-to-chat של וואטסאפ יכול למלא
טקסט בלבד; אתר אינו רשאי לצרף קובץ לחלון הכתיבה של אתר אחר. מי שרוצה את הגיליון
המודפס מדפיס אותו (או שומר כ-PDF) ומצרף ידנית.

## אבטחה ותפעול

- שמרו את `ADMIN_API_KEY`, את `SECRET_ENCRYPTION_KEY` ואת פרטי בסיס הנתונים ב-AWS SSM בלבד בפרודקשן.
- אל תחשפו את פורט ה-API ישירות לאינטרנט; Caddy הוא נקודת הכניסה הציבורית.
- החליפו את מפתח האתחול לאחר חשיפה או שימוש בסביבה לא מהימנה.
- אל תעבירו את המפתח בפרמטר URL, בלוגים, צילומי מסך או קוד Frontend.
- פעולות מוצר, הזמנה וקופון נבדקות שוב בצד השרת; אין להסתמך על ולידציה בדפדפן.

## בדיקות

```bash
npm run lint
npm run typecheck
npm run build
npm test --prefix server
npm run test:e2e
```

בדיקות Playwright הפעילות נמצאות ב-`e2e/critical.aws.spec.ts` ורצות בדפדפן שולחני ובתצוגת Pixel 5. קובצי ה-Supabase הישנים בתיקיית `e2e` נשמרים רק כחומר עזר למיגרציה ואינם חלק משער האיכות.
