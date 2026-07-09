export const getAdminNotificationLink = (category?: string | null) => {
  switch (category) {
    case "sales":
    case "orders":
      return "/admin/orders";
    case "product":
    case "products":
    case "inventory":
      return "/admin/products";
    case "coupon":
    case "coupons":
      return "/admin/coupons";
    case "import":
    case "scraper":
      return "/admin/quick-import";
    case "settings":
      return "/admin/settings";
    case "analytics":
      return "/admin/analytics";
    default:
      return "/admin/notifications";
  }
};
