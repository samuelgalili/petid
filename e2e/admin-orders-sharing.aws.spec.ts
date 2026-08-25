import { expect, test, type Page, type Route } from "@playwright/test";

import { formatHebrewOrderShareMessage } from "../src/lib/orderShare";

const order = {
  id: "11111111-1111-4111-8111-111111111111",
  order_number: "MIPO-1001",
  order_date: "2026-08-25T09:30:00.000Z",
  status: "pending",
  payment_status: "paid",
  payment_method: "card",
  total: 178.9,
  subtotal: 150,
  shipping: 28.9,
  tax: 0,
  user_id: "22222222-2222-4222-8222-222222222222",
  customer_id: null,
  customer_name: "ישראל ישראלי",
  customer_email: "israel@example.com",
  customer_phone: "050-1234567",
  shipping_address: {
    fullName: "ישראל ישראלי",
    address: "הרצל 10",
    apartment: "3",
    city: "תל אביב",
    zipCode: "6100000",
    phone: "050-1234567",
  },
  order_type: "regular",
  pet_name: "לוקה",
  special_instructions: "להתקשר לפני ההגעה",
  medical_urgency: "none",
  order_items: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      product_id: "44444444-4444-4444-8444-444444444444",
      product_name: "מזון רפואי לכלבים",
      product_image: "/placeholder.svg",
      quantity: 2,
      price: 75,
      size: "3 ק״ג",
      variant: null,
    },
  ],
  items: [],
};

async function mockFullAdmin(page: Page) {
  let status = order.status;

  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: "Unauthorized" }),
  }));
  await page.route("**/api/admin/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      admin: {
        id: "55555555-5555-4555-8555-555555555555",
        email: "admin@example.com",
        display_name: "Admin",
        role: "admin",
        permissions: ["admin.full"],
        must_change_password: false,
      },
    }),
  }));
  const handleOrders = async (route: Route) => {
    const request = route.request();
    if (request.method() === "PATCH") {
      const updates = request.postDataJSON() as { status?: typeof order.status };
      status = updates.status || status;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ order: { ...order, status } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ orders: [{ ...order, status }] }),
    });
  };
  await page.route("**/api/admin/orders", handleOrders);
  await page.route("**/api/admin/orders/**", handleOrders);

  return { getStatus: () => status };
}

test("Hebrew fulfillment message includes the order essentials", () => {
  const message = formatHebrewOrderShareMessage(order);

  expect(message).toContain("פרטי הזמנה MIPO-1001");
  expect(message).toContain("לקוח/ה: ישראל ישראלי");
  expect(message).toContain("כתובת למשלוח: הרצל 10, דירה 3, תל אביב, מיקוד 6100000");
  expect(message).toContain("1. מזון רפואי לכלבים — כמות: 2 (3 ק״ג)");
  expect(message).toContain("מצב תשלום: שולם");
  expect(message).toContain("הוראות מיוחדות: להתקשר לפני ההגעה");
});

test("an admin can share an order and change its status from the row", async ({ page }) => {
  const state = await mockFullAdmin(page);
  await page.goto("/admin/orders");

  await expect(page.getByText("MIPO-1001")).toBeVisible();

  await page.getByRole("button", { name: "שיתוף הזמנה MIPO-1001" }).click();
  const emailLink = page.getByRole("menuitem", { name: "שיתוף באימייל" });
  const whatsappLink = page.getByRole("menuitem", { name: "שיתוף בוואטסאפ" });
  await expect(emailLink).toHaveAttribute("href", /^mailto:\?subject=/);
  await expect(whatsappLink).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);

  const emailHref = await emailLink.getAttribute("href");
  expect(decodeURIComponent(emailHref || "")).toContain("פרטי הזמנה MIPO-1001");

  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "שינוי סטטוס הזמנה MIPO-1001" }).click();
  await page.getByRole("option", { name: "נשלח" }).click();

  await expect.poll(state.getStatus).toBe("shipped");
  await expect(page.getByRole("combobox", { name: "שינוי סטטוס הזמנה MIPO-1001" })).toContainText("נשלח");
});
