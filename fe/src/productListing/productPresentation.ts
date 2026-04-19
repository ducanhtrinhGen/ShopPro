import type { Product } from "../types";

export const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

/** Fallback imagery for product cards when `imageUrl` is missing (PLP + home). */
export const productCardFallbackImages = [
  "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1614294149010-950b698f72c0?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&w=1800&q=80"
];

export function imageOf(product: Product | undefined, fallback: string) {
  const image = product?.imageUrl?.trim();
  return image ? image : fallback;
}

export function isOutOfStock(product: Product) {
  const status = (product.status ?? "").trim().toUpperCase();
  if (status && status !== "ACTIVE") return true;
  return product.quantity <= 0;
}

export function promoPercent(product: Product) {
  const discount = product.discountPrice ?? 0;
  if (!discount || discount <= 0) return null;
  if (discount >= product.price) return null;
  return Math.round(((product.price - discount) / product.price) * 100);
}
