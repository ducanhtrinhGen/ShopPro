/**
 * Liên kết tiện ích dùng chung cho top bar và menu mobile (một nguồn sự thật).
 */
export const STORE_QUICK_LINKS = [
  { label: "Khuyến mãi", to: "/products?promoOnly=1" },
  { label: "Cửa hàng", to: "/products" },
  { label: "Blog", to: "/blog" },
  { label: "Liên hệ", to: "/contact" },
  { label: "Xây dựng cấu hình", to: "/build-pc" }
] as const;
