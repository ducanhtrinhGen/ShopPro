import { Link } from "react-router-dom";
import type { Brand, Category, Product, ProductPageResponse } from "../../types";
import { buildPlpCategoryHref, parseSort, type ProductQuery } from "../../productListing/productQuery";
import {
  imageOf,
  isOutOfStock,
  moneyFormatter,
  productCardFallbackImages,
  promoPercent
} from "../../productListing/productPresentation";

type TopCategory = { id: number; name: string };

export type ProductListingProps = {
  query: ProductQuery;
  keywordInput: string;
  onKeywordInput: (value: string) => void;
  updateQuery: (patch: Partial<ProductQuery>) => void;
  categories: Category[];
  brands: Brand[];
  topCategories: TopCategory[];
  productPage: ProductPageResponse | null;
  products: Product[];
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  quantityByProduct: Record<number, number>;
  onQuantityChange: (productId: number, value: number) => void;
  onAddToCart: (productId: number) => void;
  paginationLabel: string;
};

function ListingProductCard({
  product,
  quantity,
  onQuantityChange,
  onAddToCart
}: {
  product: Product;
  quantity: number;
  onQuantityChange: (productId: number, value: number) => void;
  onAddToCart: (productId: number) => void;
}) {
  const percent = promoPercent(product);
  const salePrice = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : null;
  const out = isOutOfStock(product);
  const href = product.slug ? `/products/${product.slug}` : "/products";
  const fallbackImg = productCardFallbackImages[product.id % productCardFallbackImages.length];

  return (
    <article className="c-home-product-card js-reveal">
      <Link to={href} className="c-home-product-media" style={{ display: "block" }}>
        {out ? <span className="c-home-promo-badge">HẾT HÀNG</span> : null}
        {!out && percent ? <span className="c-home-promo-badge">-{percent}%</span> : null}
        {product.clearance ? <span className="c-home-clearance-badge">Hàng thanh lý</span> : null}
        <img src={imageOf(product, fallbackImg)} alt={product.name} />
      </Link>

      <div className="c-home-product-meta">
        <h3>
          <Link to={href}>{product.name}</Link>
        </h3>
        <p>
          {(product.brandName ? `${product.brandName} • ` : "") + (product.categoryName ?? "Chưa phân loại")}
          {product.clearance ? " • Hàng thanh lý" : ""}
        </p>

        {salePrice ? (
          <div>
            <strong>{moneyFormatter.format(salePrice)}</strong>{" "}
            <span style={{ textDecoration: "line-through", opacity: 0.7 }}>{moneyFormatter.format(product.price)}</span>
          </div>
        ) : (
          <strong>{moneyFormatter.format(product.price)}</strong>
        )}
      </div>

      <div className="card-actions c-home-card-actions">
        {out ? (
          <Link to="/contact" className="primary-link c-home-card-contact">
            Liên hệ
          </Link>
        ) : (
          <>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => onQuantityChange(product.id, Number(event.target.value))}
            />
            <button type="button" onClick={() => void onAddToCart(product.id)}>
              Thêm vào giỏ
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function RelatedCategoryChips({ categories, activeCategoryId }: { categories: Category[]; activeCategoryId: string }) {
  if (!categories.length) {
    return null;
  }

  const others = activeCategoryId ? categories.filter((c) => String(c.id) !== activeCategoryId) : categories;
  const slice = others.slice(0, 12);
  if (!slice.length) {
    return null;
  }

  return (
    <section className="plp-related" aria-label="Danh mục gợi ý">
      <h2 className="plp-related-title">Khám phá thêm danh mục</h2>
      <div className="chip-row plp-related-chips">
        {slice.map((c) => (
          <Link key={c.id} to={buildPlpCategoryHref(String(c.id))} className="chip plp-related-chip">
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ProductListing(props: ProductListingProps) {
  const {
    query,
    keywordInput,
    onKeywordInput,
    updateQuery,
    categories,
    brands,
    topCategories,
    productPage,
    products,
    isLoading,
    error,
    notice,
    quantityByProduct,
    onQuantityChange,
    onAddToCart,
    paginationLabel
  } = props;

  return (
    <>
      <div className="plp-catalog">
        <div className="filter-row c-home-filter-row plp-filter-row">
          <input
            value={keywordInput}
            onChange={(event) => onKeywordInput(event.target.value)}
            placeholder="Tìm theo tên sản phẩm"
            aria-label="Tìm theo tên sản phẩm"
          />

          <select value={query.categoryId} onChange={(event) => updateQuery({ categoryId: event.target.value, page: 0 })}>
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select value={query.brandId} onChange={(event) => updateQuery({ brandId: event.target.value, page: 0 })}>
            <option value="">Tất cả thương hiệu</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          <select value={query.sort} onChange={(event) => updateQuery({ sort: parseSort(event.target.value), page: 0 })}>
            <option value="default">Mặc định</option>
            <option value="newest">Mới nhất</option>
            <option value="discountDesc">Khuyến mãi tốt</option>
            <option value="priceAsc">Giá: thấp đến cao</option>
            <option value="priceDesc">Giá: cao đến thấp</option>
          </select>

          <select
            value={String(query.pageSize)}
            onChange={(event) => updateQuery({ pageSize: Number(event.target.value) || 8, page: 0 })}
          >
            {[8, 12, 16, 24].map((size) => (
              <option key={size} value={size}>
                {size}/trang
              </option>
            ))}
          </select>
        </div>

        <div className="chip-row c-home-chip-row" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={!query.promoOnly ? "chip" : "chip active"}
              onClick={() => updateQuery({ promoOnly: !query.promoOnly, page: 0 })}
            >
              Khuyến mãi
            </button>
            <button
              type="button"
              className={!query.clearanceOnly ? "chip" : "chip active"}
              onClick={() => updateQuery({ clearanceOnly: !query.clearanceOnly, page: 0 })}
            >
              Hàng thanh lý
            </button>
            <button
              type="button"
              className={!query.inStockOnly ? "chip" : "chip active"}
              onClick={() => updateQuery({ inStockOnly: !query.inStockOnly, page: 0 })}
            >
              Còn hàng
            </button>
          </div>
          <button
            type="button"
            className="chip"
            onClick={() =>
              updateQuery({
                keyword: "",
                categoryId: "",
                brandId: "",
                promoOnly: false,
                clearanceOnly: false,
                inStockOnly: false,
                sort: "default",
                page: 0
              })
            }
          >
            Xóa bộ lọc
          </button>
        </div>

        {topCategories.length ? (
          <div className="chip-row c-home-chip-row">
            <button
              type="button"
              className={!query.categoryId ? "chip active" : "chip"}
              onClick={() => updateQuery({ categoryId: "", page: 0 })}
            >
              Tất cả
            </button>
            {topCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={query.categoryId === String(category.id) ? "chip active" : "chip"}
                onClick={() => updateQuery({ categoryId: category.id > 0 ? String(category.id) : "", page: 0 })}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}

        {notice ? <p className="inline-notice">{notice}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        {isLoading ? (
          <div className="loading-block">
            <div className="loading-ring" />
            <p>Đang tải sản phẩm...</p>
          </div>
        ) : (
          <>
            <div className="c-home-product-grid plp-product-grid">
              {products.map((product) => (
                <ListingProductCard
                  key={product.id}
                  product={product}
                  quantity={quantityByProduct[product.id] ?? 1}
                  onQuantityChange={onQuantityChange}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>

            {!products.length ? <p className="empty-message">Không có sản phẩm phù hợp với bộ lọc hiện tại.</p> : null}

            {productPage && productPage.totalPages > 1 ? (
              <footer className="pagination plp-pagination">
                <button
                  type="button"
                  disabled={!productPage.hasPrevious}
                  onClick={() => updateQuery({ page: Math.max(query.page - 1, 0) })}
                >
                  Trước
                </button>
                <span>{paginationLabel}</span>
                <button type="button" disabled={!productPage.hasNext} onClick={() => updateQuery({ page: query.page + 1 })}>
                  Sau
                </button>
              </footer>
            ) : null}
          </>
        )}
      </div>

      <RelatedCategoryChips categories={categories} activeCategoryId={query.categoryId} />
    </>
  );
}
