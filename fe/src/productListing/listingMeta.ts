import type { Brand, Category } from "../types";
import type { ProductQuery } from "./productQuery";

export function getProductListingTitle(query: ProductQuery, categories: Category[], brands: Brand[]): string {
  if (query.keyword.trim()) {
    return `Kết quả tìm kiếm cho: ${query.keyword.trim()}`;
  }
  if (query.categoryId) {
    const cat = categories.find((c) => String(c.id) === query.categoryId);
    if (cat) return cat.name;
  }
  if (query.brandId) {
    const brand = brands.find((b) => String(b.id) === query.brandId);
    if (brand) return `Sản phẩm của ${brand.name}`;
  }
  if (query.clearanceOnly) {
    return "Hàng cũ";
  }
  if (query.promoOnly) {
    return "Sản phẩm khuyến mãi";
  }
  if (query.inStockOnly) {
    return "Sản phẩm còn hàng";
  }
  return "Sản phẩm";
}

export function getProductListingDescription(query: ProductQuery): string | null {
  const parts: string[] = [];
  if (query.keyword.trim()) {
    parts.push(`Tìm kiếm theo từ khóa “${query.keyword.trim()}”.`);
  }
  if (query.categoryId) {
    parts.push("Lọc theo danh mục đã chọn.");
  }
  if (query.brandId) {
    parts.push("Lọc theo thương hiệu đã chọn.");
  }
  if (query.clearanceOnly) {
    parts.push("Đang xem hàng cũ, số lượng có hạn.");
  }
  if (!parts.length) {
    return null;
  }
  return parts.join(" ");
}
