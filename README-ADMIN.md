# מערכת ניהול (Admin Panel) - Petid

## סקירה כללית

מערכת ניהול מלאה ומקיפה לפלטפורמת Petid, הכוללת ניהול משתמשים, תוכן, מוצרים, הזמנות, דיווחים ועוד.

## טכנולוגיות

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State**: TanStack Query
- **Auth**: Supabase Auth עם RBAC

## התקנה והפעלה

```bash
# התקנת תלויות
npm install

# הרצה בסביבת פיתוח
npm run dev

# בניה לפרודקשן
npm run build

# הרצת בדיקות E2E
npx playwright test e2e/admin.spec.ts
```

## מבנה הקבצים

```
src/
├── pages/admin/
│   ├── AdminDashboard.tsx    # דשבורד ראשי עם KPIs
│   ├── AdminUsers.tsx        # ניהול משתמשים
│   ├── AdminContent.tsx      # ניהול תוכן (פוסטים/סטוריז)
│   ├── AdminProducts.tsx     # ניהול מוצרים
│   ├── AdminProductImport.tsx # ייבוא מוצרים CSV
│   ├── AdminCoupons.tsx      # ניהול קופונים
│   ├── AdminOrders.tsx       # ניהול הזמנות
│   ├── AdminReports.tsx      # דיווחים ומודרציה
│   ├── AdminAdoption.tsx     # ניהול אימוץ
│   ├── AdminBusiness.tsx     # ניהול עסקים
│   ├── AdminRoles.tsx        # ניהול תפקידים (RBAC)
│   ├── AdminNotify.tsx       # שליחת התראות
│   ├── AdminSettings.tsx     # הגדרות מערכת
│   └── AdminAudit.tsx        # לוג פעילות
├── components/admin/
│   ├── AdminLayout.tsx       # Layout משותף
│   ├── DataTable.tsx         # טבלה עם חיפוש/מיון/פילטור
│   └── ConfirmDialog.tsx     # דיאלוג אישור
└── hooks/
    └── useAuditLog.ts        # Hook לתיעוד פעולות
```

## הרשאות ותפקידים (RBAC)

### תפקידים זמינים

| תפקיד | תיאור | הרשאות |
|-------|-------|--------|
| `admin` | מנהל מערכת | גישה מלאה לכל המודולים |
| `business` | בעל עסק | ניהול מוצרים והזמנות של העסק |
| `org` | עמותה | ניהול חיות לאימוץ |
| `user` | משתמש רגיל | ללא גישה לאדמין |

### הוספת אדמין

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin');
```

### בדיקת הרשאה בקוד

```typescript
import { useUserRole } from '@/hooks/useUserRole';

const { isAdmin, hasRole } = useUserRole();

if (!isAdmin) {
  return <div>אין הרשאה</div>;
}
```

## מודולים

### 1. דשבורד (`/admin/dashboard`)

- KPIs מיידיים: משתמשים, פוסטים, הזמנות, דיווחים
- גרפים: הכנסות ב-30 יום, מוצרים פופולריים
- פעולות מהירות

### 2. משתמשים (`/admin/users`)

- חיפוש ופילטור
- חסימה/פתיחת חסימה
- שינוי תפקידים
- Bulk actions

### 3. תוכן (`/admin/content`)

- ניהול פוסטים וסטוריז
- הצמדה/קידום
- הסרה והחזרה
- תצוגה מקדימה

### 4. מוצרים (`/admin/products`)

- CRUD מלא
- העלאת תמונות
- ייבוא CSV (`/admin/products/import`)
- ניהול מלאי

### 5. קופונים (`/admin/coupons`)

- יצירת קופונים
- סוגי הנחה: אחוז / סכום קבוע
- הגבלות: תוקף, מינימום הזמנה, שימושים
- מחולל קוד אוטומטי

### 6. הזמנות (`/admin/orders`)

- סינון לפי סטטוס
- שינוי סטטוס (pending → processing → shipped → delivered)
- פרטי לקוח ומשלוח

### 7. דיווחים (`/admin/reports`)

- תור מודרציה
- סינון לפי סוג/סטטוס
- פעולות: אישור/דחייה
- הערות אדמין

### 8. אימוץ (`/admin/adoption`)

- ניהול חיות לאימוץ
- בקשות אימוץ
- שליחת התראות למבקשים

### 9. עסקים (`/admin/business`)

- אימות עסקים
- הערות אימות
- ניהול סטטוס

### 10. תפקידים (`/admin/roles`)

- הקצאת תפקידים
- הסרת תפקידים
- סטטיסטיקות לפי תפקיד

### 11. התראות (`/admin/notifications`)

- שליחה לכל המשתמשים
- שליחה לפי תפקיד
- שליחה לפי ID
- תבניות מהירות

### 12. הגדרות (`/admin/settings`)

- הגדרות כלליות
- אבטחה
- התראות
- Feature flags

### 13. לוג פעילות (`/admin/audit`)

- תיעוד כל פעולה אדמיניסטרטיבית
- פילטור לפי תאריך/סוג/משתמש
- מידע: מי/מה/מתי

## ייבוא מוצרים (CSV)

### פורמט קובץ

```csv
name,description,category,price,original_price,image_url,in_stock,pet_type
מזון לכלבים,מזון איכותי,מזון,49.90,59.90,https://example.com/img.jpg,true,dog
```

### שדות נתמכים

| שדה | חובה | תיאור |
|-----|------|-------|
| `name` | ✅ | שם המוצר |
| `description` | ❌ | תיאור |
| `category` | ❌ | קטגוריה |
| `price` | ✅ | מחיר |
| `original_price` | ❌ | מחיר לפני הנחה |
| `image_url` | ✅ | קישור לתמונה |
| `in_stock` | ❌ | במלאי (true/false) |
| `pet_type` | ❌ | סוג חיה (dog/cat) |

### תהליך ייבוא

1. העלאת קובץ CSV
2. מיפוי עמודות אוטומטי + ידני
3. תצוגה מקדימה + ולידציה
4. ייבוא עם התקדמות
5. דוח סיכום

## Audit Log

כל פעולה אדמיניסטרטיבית מתועדת אוטומטית:

```typescript
import { useAuditLog } from '@/hooks/useAuditLog';

const { logAction } = useAuditLog();

await logAction({
  action_type: 'user.blocked',
  entity_type: 'user',
  entity_id: userId,
  old_values: { blocked: false },
  new_values: { blocked: true },
  metadata: { reason: 'Spam' }
});
```

### סוגי פעולות

- `user.blocked`, `user.unblocked`, `user.role_added`, `user.role_removed`
- `post.removed`, `post.restored`, `post.pinned`
- `report.resolved`, `report.dismissed`
- `order.status_changed`
- `product.created`, `product.updated`, `product.deleted`
- `coupon.created`, `coupon.updated`, `coupon.deleted`
- `business.verified`, `business.unverified`
- `notification.sent`

## אבטחה

### הגנות מובנות

- ✅ RLS (Row Level Security) על כל הטבלאות
- ✅ RBAC מבוסס טבלת `user_roles`
- ✅ פונקציה `has_role()` עם SECURITY DEFINER
- ✅ Audit Log לכל פעולה
- ✅ ולידציה בצד שרת

### המלצות

1. הפעלת "Leaked Password Protection" ב-Auth Settings
2. הגדרת 2FA לאדמינים
3. בדיקה תקופתית של לוג הפעילות
4. הגבלת מספר אדמינים

## בדיקות

### הרצת בדיקות E2E

```bash
# הרצת כל הבדיקות
npx playwright test

# הרצת בדיקות אדמין בלבד
npx playwright test e2e/admin.spec.ts

# הרצה עם UI
npx playwright test --ui
```

### זרימות נבדקות

1. כניסת אדמין לדשבורד
2. צפייה וסינון משתמשים
3. ניהול דיווחים
4. צפייה בהזמנות
5. ניהול קופונים
6. ניווט בין דפים
7. חסימת גישה למשתמש רגיל
8. תיעוד בלוג פעילות

## נגישות

- ✅ תמיכה מלאה ב-RTL
- ✅ ניווט מקלדת
- ✅ תוויות aria
- ✅ יחס ניגודיות WCAG 2.1 AA
- ✅ Skip links

## תמיכה

לשאלות ובעיות, פנו לצוות הפיתוח או פתחו Issue ב-GitHub.

---

**גרסה**: 1.0.0  
**עדכון אחרון**: דצמבר 2024
