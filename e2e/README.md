# E2E Tests - Petid/Petish

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
