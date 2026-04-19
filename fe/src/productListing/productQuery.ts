export type ProductSort = "default" | "newest" | "priceAsc" | "priceDesc" | "discountDesc";

export type ProductQuery = {
  keyword: string;
  categoryId: string;
  brandId: string;
  promoOnly: boolean;
  clearanceOnly: boolean;
  inStockOnly: boolean;
  sort: ProductSort;
  page: number;
  pageSize: number;
};

/** Default query for homepage featured merchandising (not URL-driven). */
export const HOME_FEATURED_PRODUCT_QUERY: ProductQuery = {
  keyword: "",
  categoryId: "",
  brandId: "",
  promoOnly: false,
  clearanceOnly: false,
  inStockOnly: false,
  sort: "default",
  page: 0,
  pageSize: 12
};

export function parseSort(value: string | null): ProductSort {
  if (value === "newest" || value === "priceAsc" || value === "priceDesc" || value === "discountDesc") {
    return value;
  }
  return "default";
}

export function parseQuery(params: URLSearchParams): ProductQuery {
  const rawPage = Number(params.get("page") ?? "0");
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0;
  const rawPageSize = Number(params.get("pageSize") ?? "8");
  const pageSize = Number.isFinite(rawPageSize) ? Math.min(Math.max(Math.floor(rawPageSize), 4), 40) : 8;

  return {
    keyword: (params.get("keyword") ?? "").trim(),
    categoryId: params.get("categoryId") ?? "",
    brandId: params.get("brandId") ?? "",
    promoOnly: (params.get("promoOnly") ?? "") === "1",
    clearanceOnly: (params.get("clearanceOnly") ?? "") === "1",
    inStockOnly: (params.get("inStockOnly") ?? "") === "1",
    sort: parseSort(params.get("sort")),
    page,
    pageSize
  };
}

export function toSearchParams(query: ProductQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.keyword) {
    params.set("keyword", query.keyword);
  }
  if (query.categoryId) {
    params.set("categoryId", query.categoryId);
  }
  if (query.brandId) {
    params.set("brandId", query.brandId);
  }
  if (query.promoOnly) {
    params.set("promoOnly", "1");
  }
  if (query.clearanceOnly) {
    params.set("clearanceOnly", "1");
  }
  if (query.inStockOnly) {
    params.set("inStockOnly", "1");
  }
  if (query.sort !== "default") {
    params.set("sort", query.sort);
  }
  if (query.page > 0) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== 8) {
    params.set("pageSize", String(query.pageSize));
  }

  return params;
}

/** Link into PLP with a category filter (e.g. homepage category cards). */
export function buildPlpCategoryHref(categoryId: string): string {
  const p = new URLSearchParams();
  p.set("categoryId", categoryId);
  p.set("page", "0");
  return `/products?${p.toString()}`;
}
