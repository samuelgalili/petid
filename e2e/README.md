# E2E Tests - Petid/Petish

![E2E Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/e2e-tests.yml/badge.svg)

## CI/CD

הבדיקות רצות אוטומטית ב-GitHub Actions בכל push ל-main או PR.

לצפייה בתוצאות: **Actions** tab ב-GitHub repository.

## הרצת הבדיקות

### דרישות מקדימות
```bash
npx playwright install
```

### הרצת כל הבדיקות
```bash
npx playwright test
```

### הרצת בדיקות ספציפיות
```bash
# בדיקות אימות
npx playwright test auth.spec.ts

# בדיקות פיד
npx playwright test feed.spec.ts

# בדיקות חנות
npx playwright test shop.spec.ts

# בדיקות אימוץ
npx playwright test adoption.spec.ts

# בדיקות ניווט
npx playwright test navigation.spec.ts
```

### הרצה עם UI
```bash
npx playwright test --ui
```

### הרצה במצב debug
```bash
npx playwright test --debug
```

### צפייה בדוח
```bash
npx playwright show-report
```

## מבנה הבדיקות

| קובץ | תיאור |
|------|--------|
| `auth.spec.ts` | בדיקות זרימת התחברות והרשמה |
| `feed.spec.ts` | בדיקות הפיד הסוציאלי (Petish) |
| `shop.spec.ts` | בדיקות החנות והעגלה |
| `checkout.spec.ts` | בדיקות תהליך הצ'קאאוט המלא |
| `adoption.spec.ts` | בדיקות עמוד האימוץ |
| `navigation.spec.ts` | בדיקות ניווט ונגישות |

## זרימות קריטיות שנבדקות

### אימות (Authentication)
- ✅ הצגת עמוד התחברות
- ✅ מעבר בין טאבים (אימייל/טלפון)
- ✅ ניווט לעמוד הרשמה
- ✅ המשך כאורח
- ✅ ולידציה של שדות

### פיד (Social Feed)
- ✅ הצגת פוסטים
- ✅ תפריט המבורגר
- ✅ ניווט תחתון
- ✅ טאבים (הכל/עוקבים)
- ✅ prompt להתחברות לפעולות מוגנות

### חנות (Shop)
- ✅ הצגת מוצרים
- ✅ פילטר לפי סוג חיה
- ✅ חיפוש מוצרים
- ✅ פילטר מבצעים
- ✅ מעבר לעגלה

### צ'קאאוט (Checkout)
- ✅ ניהול עגלת קניות (הוספה/הסרה/עדכון כמות)
- ✅ הצגת סיכום הזמנה
- ✅ טופס פרטי משלוח
- ✅ בחירת אמצעי תשלום
- ✅ חישוב מע"מ ומשלוח
- ✅ ולידציה של שדות חובה
- ✅ מסע רכישה מלא (מוצר → עגלה → צ'קאאוט)
- ✅ טיפול בשגיאות רשת
- ✅ שמירת עגלה בין ניווטים

### אימוץ (Adoption)
- ✅ הצגת חיות לאימוץ
- ✅ פילטרים
- ✅ חיפוש
- ✅ כפתור אימוץ

### ניווט ונגישות
- ✅ ניווט בין עמודים
- ✅ responsive design
- ✅ keyboard navigation
- ✅ נגישות בסיסית
