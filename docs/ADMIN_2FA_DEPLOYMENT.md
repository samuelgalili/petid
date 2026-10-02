# אימות דו-שלבי למנהלים

הקוד נמצא בפרודקשן כבוי. כל עוד `ADMIN_2FA_ENABLED` אינו `true`, כניסת מנהל
היא סיסמה בלבד — אותה התנהגות כמו היום. המיגרציה `0061_admin_two_factor.sql`
מוסיפה עמודות וטבלה ואינה מוחקת דבר, ואפשר להריץ אותה לפני שמפעילים את הדגל.

## משתני סביבה

כולם נשמרים ב-SSM תחת `/mipo/prod/` (SecureString למפתח) ואז נדחפים לשרת עם
`deploy/aws/sync-ssm-env.sh`. בסקריפט הם ברשימת ה-OPTIONAL, כדי שסנכרון
שגרתי לא ייכשל לפני שהערכים נוצרו. אחרי שהם קיימים ב-SSM, הסנכרון מעתיק
אותם ל-`/opt/mipo/.env`.

| משתנה | ברירת מחדל | תפקיד |
| --- | --- | --- |
| `ADMIN_2FA_ENABLED` | כבוי | מפעיל את האימות. בלי זה אין שינוי בכניסה. |
| `ADMIN_2FA_REQUIRE_ENROLLMENT` | כבוי | רק כשהדגל הראשון דולק: מנהל שטרם נרשם נעצר במסך הרישום. |
| `SECRET_ENCRYPTION_KEY` | אין | מפתח AES-256-GCM של secretBox. חובה בפרודקשן רק כשהדגל דולק. |
| `SECRET_ENCRYPTION_KEYS_RETIRED` | ריק | מפתחות ישנים, מופרדים בפסיק, לפענוח בלבד בזמן רוטציה. |
| `ADMIN_MFA_STEP_UP_MINUTES` | 15 | חלון לאימות מחדש לפני פעולה רגישה: שינוי סיסמה, הנפקת קודי שחזור, סימון תשלום ידני, התאמת מחיר, מחיקת מוצר, יצירה או עדכון או מחיקה של קופון, חיבור או ניתוק מחבר, ועריכת לקוח. |
| `ADMIN_TOTP_ISSUER` | `MIPO` | השם שמופיע באפליקציית האימות. |

אין לכתוב ערך של מפתח בקוד, ב-PR, בצ'אט או ב-git.

### יצירת המפתח

המפתח משותף גם ל-`server/src/secretStore.js` (מחברים). לכן הוא base64
עירום של 32 בתים, **בלי** קידומת מזהה. קידומת כמו `prod-2026:` נפתחת
ב-secretBox ונשברת ב-secretStore.

```bash
openssl rand -base64 32
```

או, מתוך הריפו:

```bash
npm run secret:keygen --prefix server
```

הפלט הוא שורה אחת של 44 תווי base64. שומרים אותה ב-SSM:

```bash
aws ssm put-parameter \
  --profile mipo --region eu-central-1 \
  --name "/mipo/prod/SECRET_ENCRYPTION_KEY" \
  --type SecureString \
  --value 'הערך-מהפקודה-הקודמת'
```

הגרשיים הבודדים נחוצים: base64 מכיל `+` ו-`/`.

אחרי שהמפתח ב-SSM, ולפני שמפעילים את הדגל:

```bash
bash deploy/aws/sync-ssm-env.sh
```

אימות שהקונטיינר רואה 32 בתים:

```bash
ssh -i ~/.ssh/mipo-prod-key.pem ubuntu@63.183.241.110 \
  "cd /opt/mipo && docker compose -f deploy/aws/docker-compose.yml exec -T mipo-api node -e 'const b=Buffer.from(process.env.SECRET_ENCRYPTION_KEY||\"\",\"base64\"); console.log(\"bytes=\"+b.length)'"
```

הפלט הצפוי הוא `bytes=32`.

## הדלקה בטוחה

1. למזג ולפרוס את הקוד **עם הדגל כבוי**. המיגרציה רצה, הכניסה לא משתנה.
2. ליצור את `SECRET_ENCRYPTION_KEY` כפי שלמעלה, לסנכרן, ולאמת `bytes=32`.
3. להגדיר ב-SSM את `ADMIN_2FA_ENABLED` ל-`true`. לא להגדיר עדיין את `ADMIN_2FA_REQUIRE_ENROLLMENT`.
4. `bash deploy/aws/sync-ssm-env.sh` (הסקריפט מרענן את הקונטיינר).
5. בעל החשבון נכנס בסיסמה, רואה מסך רישום, ואפשר גם לדלג לפאנל. מנהל שכבר נרשם חייב קוד.
6. רק אחרי שבעל החשבון סיים רישום ושמר קודי שחזור, ואם רוצים לחייב את כולם: `ADMIN_2FA_REQUIRE_ENROLLMENT=true` ב-SSM, וסנכרון נוסף.

כיבוי חירום: `ADMIN_2FA_ENABLED=false` (או מחיקת הפרמטר) וסנכרון. הכניסה חוזרת לסיסמה בלבד. הרישום נשמר וחוזר כשמפעילים שוב.

כל עוד הדגל כבוי, אין שינוי באתר: הקטלוג הציבורי, פעולות האדמין, ומפתח ה-API נשארים כמו היום.

כשהדגל דולק:

- סשן שעבר רק סיסמה, לפני קוד, אינו רואה מחיר עלות, עמלה או ספק ב-`GET /api/products`. הוא מקבל את אותה תשובה ציבורית שמקבל אורח. אורח לא רואה את השדות האלה גם היום.
- מפתח ה-API נשאר קורא ב-GET, כולל שורת מוצר מלאה. כתיבה עדיין דורשת `ADMIN_API_KEY_ALLOWLIST`. פעולה שדורשת אימות מחדש נשארת סגורה למפתח: אין לו קוד להזין, ורישום ב-allowlist אינו מחליף קוד.
- פעולה רגישה של מנהל שנרשם דורשת קוד מהרבע שעה האחרונה. אם הקוד ישן, המסך מבקש קוד חדש (או קוד שחזור) וממשיך את אותה פעולה. אם אין קוד, הפעולה לא מתבצעת.
- מנהל שטרם נרשם, כל עוד `ADMIN_2FA_REQUIRE_ENROLLMENT` כבוי, ממשיך לעבוד בלי קוד. אחרי שהוא נרשם, הפעולות הרגישות דורשות קוד עדכני.

## איך הבעלים נרשם

1. להיכנס ב-`/admin/login` עם האימייל והסיסמה.
2. אם יש סיסמה זמנית, לבחור סיסמה חדשה קודם. הכניסה מתנתקת, ונכנסים שוב.
3. נפתח `/admin/two-factor`. לסרוק את קוד ה-QR באפליקציית אימות (או להקליד את המפתח הידני).
4. להזין את הקוד בן שש הספרות שהאפליקציה מציגה, ולאשר.
5. עשרה קודי שחזור מוצגים פעם אחת. להעתיק אותם למקום בטוח. כל קוד עובד פעם אחת.
6. להמשיך לפאנל. מהכניסה הבאה יידרש קוד מהאפליקציה, או קוד שחזור.

## שחזור אם המכשיר אבד

קודם קוד שחזור, במסך האימות, במקום הקוד מהאפליקציה.

אם אבדו גם המכשיר וגם הקודים, איפוס מהשרת. אין לזה נקודת קצה ב-HTTP.
הסיסמה לא משתנה. נדרש `DATABASE_URL` על המכונה:

```bash
npm run admin:reset-2fa --prefix server -- --email owner@example.com
```

אותה פעולה ב-SQL, בתוך טרנזקציה, ורק לשורה של המנהל הזה:

```sql
begin;
update public.admin_users
set totp_secret_encrypted = null,
    totp_enrolled_at = null,
    totp_last_used_step = null,
    updated_at = now()
where lower(email) = lower('owner@example.com');
delete from public.admin_recovery_codes
where admin_user_id = (
  select id from public.admin_users where lower(email) = lower('owner@example.com')
);
delete from public.admin_sessions
where admin_user_id = (
  select id from public.admin_users where lower(email) = lower('owner@example.com')
);
commit;
```

אחר כך נכנסים עם הסיסמה הקיימת ונרשמים מחדש.

`npm run admin:provision` מאפס גם את הרישום, וגם מחליף את הסיסמה. זה מסלול
נפרד, לא איפוס האימות לבדו.

`POST /api/admin/bootstrap` נשאר כמו שהיה, ואינו מוחק רישום אימות. הוא אינו
מסלול שחזור.
