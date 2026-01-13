// Email template generator for transactional emails
// These templates are used by edge functions to send formatted emails

export interface EmailTemplateData {
  recipientName?: string;
  [key: string]: any;
}

// Base template wrapper with consistent styling
const baseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo {
      width: 60px;
      height: 60px;
      margin-bottom: 16px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #18181b;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #71717a;
    }
    .content {
      margin: 24px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #d4a574 0%, #c4956a 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      text-align: center;
    }
    .button:hover {
      background: linear-gradient(135deg, #c4956a 0%, #b4855a 100%);
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e4e4e7;
      color: #71717a;
      font-size: 12px;
    }
    .info-box {
      background: #faf7f4;
      border: 1px solid #e8e0d8;
      border-radius: 12px;
      padding: 20px;
      margin: 16px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e8e0d8;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .highlight {
      color: #d4a574;
      font-weight: 600;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-success { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-shipped { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <img src="https://petid.lovable.app/petid-icon.png" alt="PetID" class="logo">
        <h1 class="title">${title}</h1>
      </div>
      ${content}
      <div class="footer">
        <p>PetID - המקום לכל מה שחיית המחמד שלך צריכה 🐾</p>
        <p style="margin-top: 8px;">
          <a href="https://petid.lovable.app" style="color: #d4a574;">petid.lovable.app</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// Order Confirmation Email
export const orderConfirmationEmail = (data: {
  orderNumber: string;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  shippingAddress: string;
}) => {
  const itemsList = data.items.map(item => `
    <div class="info-row">
      <span>${item.name} x${item.quantity}</span>
      <span class="highlight">₪${item.price.toFixed(2)}</span>
    </div>
  `).join('');

  const content = `
    <div class="content">
      <p>שלום ${data.customerName},</p>
      <p style="margin-top: 12px;">תודה על ההזמנה שלך! קיבלנו את ההזמנה ואנחנו מתחילים להכין אותה.</p>
      
      <div class="info-box" style="margin-top: 24px;">
        <div class="info-row">
          <span>מספר הזמנה:</span>
          <span class="highlight">${data.orderNumber}</span>
        </div>
        <div class="info-row">
          <span>סטטוס:</span>
          <span class="status-badge status-pending">ממתין לאישור</span>
        </div>
      </div>
      
      <h3 style="margin-top: 24px; margin-bottom: 12px;">פריטים בהזמנה:</h3>
      <div class="info-box">
        ${itemsList}
        <div class="info-row" style="border-top: 2px solid #d4a574; margin-top: 12px; padding-top: 12px;">
          <strong>סה"כ:</strong>
          <strong class="highlight">₪${data.total.toFixed(2)}</strong>
        </div>
      </div>
      
      <div class="info-box">
        <strong>כתובת משלוח:</strong>
        <p style="margin-top: 8px;">${data.shippingAddress}</p>
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://petid.lovable.app/orders" class="button">צפה בהזמנה</a>
      </div>
    </div>
  `;

  return baseTemplate(content, 'ההזמנה שלך התקבלה! 🎉');
};

// Order Shipped Email
export const orderShippedEmail = (data: {
  orderNumber: string;
  customerName: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
}) => {
  const content = `
    <div class="content">
      <p>שלום ${data.customerName},</p>
      <p style="margin-top: 12px;">חדשות טובות! ההזמנה שלך יצאה לדרך 📦</p>
      
      <div class="info-box" style="margin-top: 24px;">
        <div class="info-row">
          <span>מספר הזמנה:</span>
          <span class="highlight">${data.orderNumber}</span>
        </div>
        <div class="info-row">
          <span>סטטוס:</span>
          <span class="status-badge status-shipped">נשלח</span>
        </div>
        ${data.trackingNumber ? `
        <div class="info-row">
          <span>מספר מעקב:</span>
          <span class="highlight">${data.trackingNumber}</span>
        </div>
        ` : ''}
        ${data.carrier ? `
        <div class="info-row">
          <span>חברת משלוחים:</span>
          <span>${data.carrier}</span>
        </div>
        ` : ''}
        ${data.estimatedDelivery ? `
        <div class="info-row">
          <span>משלוח צפוי:</span>
          <span class="highlight">${data.estimatedDelivery}</span>
        </div>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://petid.lovable.app/orders" class="button">עקוב אחרי המשלוח</a>
      </div>
    </div>
  `;

  return baseTemplate(content, 'ההזמנה שלך בדרך אליך! 🚚');
};

// Order Delivered Email
export const orderDeliveredEmail = (data: {
  orderNumber: string;
  customerName: string;
}) => {
  const content = `
    <div class="content">
      <p>שלום ${data.customerName},</p>
      <p style="margin-top: 12px;">ההזמנה שלך נמסרה בהצלחה! 🎉</p>
      
      <div class="info-box" style="margin-top: 24px;">
        <div class="info-row">
          <span>מספר הזמנה:</span>
          <span class="highlight">${data.orderNumber}</span>
        </div>
        <div class="info-row">
          <span>סטטוס:</span>
          <span class="status-badge status-success">נמסר</span>
        </div>
      </div>
      
      <p style="margin-top: 24px;">אנחנו מקווים שחיית המחמד שלך נהנית מהמוצרים!</p>
      <p>נשמח לשמוע מה דעתך - השאירו ביקורת ועזרו לאחרים לבחור.</p>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://petid.lovable.app/orders" class="button">השאר ביקורת ⭐</a>
      </div>
    </div>
  `;

  return baseTemplate(content, 'ההזמנה נמסרה בהצלחה! ✅');
};

// Welcome Email
export const welcomeEmail = (data: {
  userName: string;
}) => {
  const content = `
    <div class="content">
      <p>שלום ${data.userName},</p>
      <p style="margin-top: 12px;">ברוכים הבאים ל-PetID! 🐾</p>
      <p>אנחנו שמחים שהצטרפת למשפחה שלנו.</p>
      
      <h3 style="margin-top: 24px; margin-bottom: 16px;">מה אפשר לעשות ב-PetID?</h3>
      
      <div class="info-box">
        <p>🐕 <strong>ניהול חיות מחמד</strong> - שמרו את כל המידע במקום אחד</p>
        <p style="margin-top: 12px;">🛒 <strong>חנות</strong> - מוצרים איכותיים במחירים מצוינים</p>
        <p style="margin-top: 12px;">📱 <strong>קהילה</strong> - שתפו ותתחברו עם בעלי חיות אחרים</p>
        <p style="margin-top: 12px;">🏆 <strong>אתגרים</strong> - השתתפו ותזכו בפרסים</p>
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://petid.lovable.app/add-pet" class="button">הוסף את חיית המחמד הראשונה</a>
      </div>
    </div>
  `;

  return baseTemplate(content, 'ברוכים הבאים ל-PetID! 🎉');
};

// Password Reset Email
export const passwordResetEmail = (data: {
  userName: string;
  resetLink: string;
}) => {
  const content = `
    <div class="content">
      <p>שלום ${data.userName},</p>
      <p style="margin-top: 12px;">קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
      <p>לחץ על הכפתור למטה כדי ליצור סיסמה חדשה:</p>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="${data.resetLink}" class="button">איפוס סיסמה</a>
      </div>
      
      <div class="info-box" style="margin-top: 32px;">
        <p style="font-size: 12px; color: #71717a;">
          ⚠️ הקישור יפוג תוך שעה. אם לא ביקשת לאפס את הסיסמה, התעלם מהודעה זו.
        </p>
      </div>
    </div>
  `;

  return baseTemplate(content, 'איפוס סיסמה');
};

// Low Stock Alert Email (Admin)
export const lowStockAlertEmail = (data: {
  products: { name: string; currentStock: number; threshold: number }[];
}) => {
  const productsList = data.products.map(p => `
    <div class="info-row">
      <span>${p.name}</span>
      <span style="color: #dc2626;">${p.currentStock} יחידות (סף: ${p.threshold})</span>
    </div>
  `).join('');

  const content = `
    <div class="content">
      <p>⚠️ התראת מלאי נמוך</p>
      <p style="margin-top: 12px;">המוצרים הבאים נמצאים במלאי נמוך ודורשים תשומת לב:</p>
      
      <div class="info-box" style="margin-top: 24px;">
        ${productsList}
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://petid.lovable.app/admin/inventory" class="button">נהל מלאי</a>
      </div>
    </div>
  `;

  return baseTemplate(content, 'התראת מלאי נמוך ⚠️');
};

export default {
  orderConfirmation: orderConfirmationEmail,
  orderShipped: orderShippedEmail,
  orderDelivered: orderDeliveredEmail,
  welcome: welcomeEmail,
  passwordReset: passwordResetEmail,
  lowStockAlert: lowStockAlertEmail,
};
