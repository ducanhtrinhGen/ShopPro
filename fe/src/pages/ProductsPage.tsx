import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest, ApiRequestError } from "../api/client";
import { getBrands, getCategories } from "../api/catalog";
import { useAuth } from "../auth/AuthContext";
import { useLoginModal } from "../auth/LoginModalContext";
import { isCustomerUser } from "../auth/roleUtils";
import type { Brand, Category, Product, ProductPageResponse } from "../types";

type ProductSort = "default" | "newest" | "priceAsc" | "priceDesc" | "discountDesc";

type ProductQuery = {
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

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

const heroVisuals = [
  "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1614294149010-950b698f72c0?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&w=1800&q=80"
];

const categoryVisuals = [
  "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1591405351990-4726e331f141?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80"
];

const fallbackCategoryNames = [
  "Vỏ máy",
  "PC chơi game",
  "RAM và bộ nhớ",
  "Bàn phím",
  "Tai nghe",
  "Nguồn máy tính",
  "Tản nhiệt",
  "Chuột gaming",
  "Quạt tản nhiệt",
  "Bàn ghế setup"
];

const serviceBenefits = [
  "Ưu đãi độc quyền và combo",
  "Giao hàng nhanh nội thành",
  "Tư vấn trực tiếp với chuyên viên",
  "Đổi trả minh bạch trong 7 ngày"
];

function parseSort(value: string | null): ProductSort {
  if (value === "newest" || value === "priceAsc" || value === "priceDesc" || value === "discountDesc") {
    return value;
  }

  return "default";
}

function parseQuery(params: URLSearchParams): ProductQuery {
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

function toSearchParams(query: ProductQuery): URLSearchParams {
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

function imageOf(product: Product | undefined, fallback: string) {
  const image = product?.imageUrl?.trim();
  return image ? image : fallback;
}

function isOutOfStock(product: Product) {
  const status = (product.status ?? "").trim().toUpperCase();
  if (status && status !== "ACTIVE") return true;
  return product.quantity <= 0;
}

function promoPercent(product: Product) {
  const discount = product.discountPrice ?? 0;
  if (!discount || discount <= 0) return null;
  if (discount >= product.price) return null;
  return Math.round(((product.price - discount) / product.price) * 100);
}

export function ProductsPage() {
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseQuery(searchParams), [searchParams]);

  const [keywordInput, setKeywordInput] = useState(query.keyword);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productPage, setProductPage] = useState<ProductPageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quantityByProduct, setQuantityByProduct] = useState<Record<number, number>>({});

  useEffect(() => {
    setKeywordInput(query.keyword);
  }, [query.keyword]);

  const updateQuery = (patch: Partial<ProductQuery>) => {
    const next: ProductQuery = {
      ...query,
      ...patch
    };

    next.keyword = next.keyword.trim();
    next.page = Math.max(next.page, 0);

    const nextParams = toSearchParams(next);
    const current = searchParams.toString();
    const incoming = nextParams.toString();

    if (current !== incoming) {
      setSearchParams(nextParams, { replace: true });
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      const normalizedKeyword = keywordInput.trim();
      if (normalizedKeyword !== query.keyword) {
        updateQuery({ keyword: normalizedKeyword, page: 0 });
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [keywordInput, query.keyword]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryItems = await getCategories();
        setCategories(categoryItems);
      } catch {
        setCategories([]);
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const items = await getBrands();
        setBrands(items);
      } catch {
        setBrands([]);
      }
    };

    void loadBrands();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = toSearchParams(query);
        if (!params.has("sort")) {
          params.set("sort", "default");
        }

        const data = await apiRequest<ProductPageResponse>(`/api/products?${params.toString()}`);
        setProductPage(data);
      } catch (requestError) {
        if (requestError instanceof ApiRequestError) {
          setError(requestError.message);
        } else {
          setError("Không thể tải danh sách sản phẩm.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadProducts();
  }, [query]);

  const products = productPage?.items ?? [];

  const topCategories = useMemo(() => {
    if (categories.length) {
      return categories.slice(0, 10);
    }

    return fallbackCategoryNames.map((name, index) => ({
      id: -index - 1,
      name
    }));
  }, [categories]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".c-home");
    if (!root) {
      return;
    }

    const revealItems = Array.from(root.querySelectorAll<HTMLElement>(".js-reveal"));
    if (!revealItems.length) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => {
        item.classList.add("is-visible");
      });
      return;
    }

    revealItems.forEach((item, index) => {
      const staggerDelay = `${(index % 6) * 70}ms`;
      item.style.setProperty("--reveal-delay", staggerDelay);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    revealItems.forEach((item) => {
      observer.observe(item);
    });

    return () => {
      observer.disconnect();
    };
  }, [products.length, topCategories.length]);

  const heroProduct = products[0];
  const promoProducts = products.slice(1, 5);
  const guideProducts = products.slice(5, 8);

  const paginationLabel = useMemo(() => {
    if (!productPage) {
      return "";
    }

    if (productPage.totalPages === 0) {
      return "Không có trang";
    }

    return `Trang ${productPage.page + 1} / ${productPage.totalPages}`;
  }, [productPage]);

  const performAddToCart = async (productId: number) => {
    const quantity = Math.max(quantityByProduct[productId] ?? 1, 1);
    setNotice(null);

    try {
      await apiRequest("/api/cart/items", {
        method: "POST",
        body: { productId, quantity }
      });
      setNotice("Đã thêm vào giỏ hàng thành công.");
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setNotice(requestError.message);
      } else {
        setNotice("Không thể thêm sản phẩm vào giỏ hàng.");
      }
    }
  };

  const handleAddToCart = async (productId: number) => {
    if (!user || !isCustomerUser(user)) {
      openLoginModal({ onSuccess: () => void performAddToCart(productId) });
      return;
    }
    await performAddToCart(productId);
  };

  const buildCategoryHref = (categoryId: string) => {
    const params = toSearchParams({
      ...query,
      categoryId,
      page: 0
    });

    const queryString = params.toString();
    return queryString ? `/products?${queryString}` : "/products";
  };

  return (
    <section className="panel c-home">
      <section
        className="c-home-hero js-reveal c-home-full-bleed"
        style={{
          backgroundImage: `linear-gradient(115deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.25)), url(${imageOf(
            heroProduct,
            heroVisuals[0]
          )})`
        }}
      >
        <div className="c-home-hero-content">
          <p className="c-home-eyebrow">HIỆU NĂNG THẾ HỆ MỚI</p>
          <h1>{heroProduct?.name ?? "Linh kiện PC cao cấp"}</h1>
          <p>
            Nâng tầm trải nghiệm chơi game, làm việc và sáng tạo với hệ sinh thái linh kiện hiệu năng cao,
            thiết kế gọn gàng và khả năng nâng cấp linh hoạt.
          </p>
          <Link to="#offers-zone" className="c-home-cta">
            Mua ngay
          </Link>
        </div>
      </section>

      <section className="c-home-two-up c-home-full-bleed">
        {[0, 1].map((index) => {
          const product = promoProducts[index];

          return (
            <article
              key={`upper-${index}`}
              className="c-home-promo-card js-reveal"
              style={{
                backgroundImage: `linear-gradient(150deg, rgba(0, 0, 0, 0.64), rgba(0, 0, 0, 0.34)), url(${imageOf(
                  product,
                  heroVisuals[(index + 1) % heroVisuals.length]
                )})`
              }}
            >
              <div>
                <h3>{product?.name ?? (index === 0 ? "Cấu hình khung máy" : "Dàn máy hiệu năng cao")}</h3>
                <p>{index === 0 ? "Tùy chỉnh theo nhu cầu" : "Bứt tốc trải nghiệm"}</p>
                <button type="button" className="c-home-btn-yellow" onClick={() => updateQuery({ page: 0 })}>
                  {index === 0 ? "Tùy chỉnh ngay" : "Mua ngay"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="c-home-section js-reveal">
        <h2 className="c-home-title">Mua theo danh mục</h2>

        <div className="c-home-category-grid">
          {topCategories.map((category, index) => {
            const isRealCategory = category.id > 0;
            const href = isRealCategory ? buildCategoryHref(String(category.id)) : "/products";

            return (
              <Link
                key={`${category.id}-${category.name}`}
                to={href}
                className="c-home-category-card js-reveal"
                style={{
                  backgroundImage: `linear-gradient(155deg, rgba(15, 21, 30, 0.84), rgba(6, 10, 16, 0.9)), url(${categoryVisuals[index % categoryVisuals.length]})`
                }}
              >
                <span className="c-home-category-label">// {category.name}</span>
                <span className="c-home-category-arrow">›</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="c-home-two-up c-home-two-up--second c-home-full-bleed">
        {[2, 3].map((index) => {
          const product = promoProducts[index];

          return (
            <article
              key={`lower-${index}`}
              className="c-home-promo-card js-reveal"
              style={{
                backgroundImage: `linear-gradient(150deg, rgba(0, 0, 0, 0.64), rgba(0, 0, 0, 0.34)), url(${imageOf(
                  product,
                  heroVisuals[index % heroVisuals.length]
                )})`
              }}
            >
              <div>
                <h3>{product?.name ?? (index === 2 ? "Màn hình cao cấp" : "Bàn phím không dây")}</h3>
                <p>{index === 2 ? "Nhiều phiên bản màu sắc" : "Đồng bộ góc máy"}</p>
                <button type="button" className="c-home-btn-yellow" onClick={() => updateQuery({ page: 0 })}>
                  Khám phá
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="c-home-builder js-reveal">
        <h2 className="c-home-title">Tùy chỉnh bộ setup của bạn</h2>
        <p className="c-home-builder-sub">Bắt đầu từ một sản phẩm</p>

        <div className="c-home-builder-tabs" role="tablist" aria-label="Tùy chọn cấu hình">
          <button type="button">SSD tốc độ cao</button>
          <button type="button">RAM DDR5</button>
          <button type="button" className="active">
            Bàn phím MAKR 75
          </button>
          <button type="button">K65 không dây</button>
        </div>

        <div
          className="c-home-builder-stage"
          style={{
            backgroundImage: `linear-gradient(155deg, rgba(0, 0, 0, 0.66), rgba(0, 0, 0, 0.36)), url(${imageOf(
              products[2],
              heroVisuals[2]
            )})`
          }}
        >
          <button type="button" className="c-home-btn-yellow" onClick={() => updateQuery({ page: 0 })}>
            Tự thiết kế ngay
          </button>
        </div>
      </section>

      <section className="c-home-benefits js-reveal">
        <h2 className="c-home-title">Vì sao nên mua tại ShopPro</h2>
        <button type="button" className="c-home-btn-yellow" onClick={() => updateQuery({ page: 0 })}>
          Tìm hiểu thêm
        </button>

        <div className="c-home-benefit-grid">
          {serviceBenefits.map((item) => (
            <article key={item} className="js-reveal">
              <span className="c-home-benefit-icon">◉</span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="c-home-experience js-reveal" id="experience-zone">
        <h2 className="c-home-title">Trải nghiệm ShopPro</h2>

        <div className="c-home-experience-grid">
          {Array.from({ length: 4 }).map((_, index) => {
            const fallbackTitle = ["Hệ sinh thái iCUE", "Tai nghe Revival", "Ưu đãi nổi bật", "Tự build PC"][index];
            const product = products[index] ?? promoProducts[index % Math.max(promoProducts.length, 1)];

            return (
              <article
                key={`exp-${index}`}
                className="c-home-experience-card js-reveal"
                style={{
                  backgroundImage: `linear-gradient(150deg, rgba(0, 0, 0, 0.68), rgba(0, 0, 0, 0.35)), url(${imageOf(
                    product,
                    heroVisuals[(index + 1) % heroVisuals.length]
                  )})`
                }}
              >
                <h3>{product?.name ?? fallbackTitle}</h3>
                <button type="button" className="c-home-btn-yellow" onClick={() => updateQuery({ page: 0 })}>
                  Khám phá
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="c-home-guides js-reveal" id="guide-zone">
        <h2 className="c-home-title">Hướng dẫn và mẹo hay</h2>
        <Link to="/products" className="c-home-guide-link">
          Xem thêm bài viết ›
        </Link>

        <div className="c-home-guide-grid">
          {Array.from({ length: 3 }).map((_, index) => {
            const product = guideProducts[index] ?? products[index];
            const fallbackHeadline = [
              "Build setup tản nhiệt tối ưu cho mùa nóng",
              "So sánh các dòng mainboard cho gaming",
              "Mẹo chọn PSU đúng công suất"
            ][index];

            return (
              <article key={`guide-${index}`} className="c-home-guide-card js-reveal">
                <img src={imageOf(product, categoryVisuals[(index + 2) % categoryVisuals.length])} alt={product?.name ?? fallbackHeadline} />
                <div>
                  <small>BÀI VIẾT</small>
                  <h3>{product?.name ?? fallbackHeadline}</h3>
                  <p>{fallbackHeadline}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="c-home-catalog js-reveal" id="offers-zone">
        <div className="c-home-catalog-head">
          <div>
            <p className="c-home-eyebrow">Ưu đãi nổi bật</p>
            <h2 className="c-home-title">Tìm linh kiện phù hợp thật nhanh</h2>
          </div>
          <Link to="/cart" className="c-home-cta">
            Đến giỏ hàng
          </Link>
        </div>

        <div className="filter-row c-home-filter-row">
          <input
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="Tìm theo tên sản phẩm"
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
            <div className="c-home-product-grid">
              {products.map((product) => {
                const percent = promoPercent(product);
                const salePrice = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : null;
                const out = isOutOfStock(product);
                const href = product.slug ? `/products/${product.slug}` : "/products";

                return (
                  <article key={product.id} className="c-home-product-card js-reveal">
                    <Link to={href} className="c-home-product-media" style={{ display: "block" }}>
                      {out ? <span className="c-home-promo-badge">HẾT HÀNG</span> : null}
                      {!out && percent ? <span className="c-home-promo-badge">-{percent}%</span> : null}
                      {product.clearance ? <span className="c-home-clearance-badge">Hàng thanh lý</span> : null}
                      <img src={imageOf(product, heroVisuals[product.id % heroVisuals.length])} alt={product.name} />
                    </Link>

                    <div className="c-home-product-meta">
                      <h3>
                        <Link to={href}>{product.name}</Link>
                      </h3>
                      <p>
                        {(product.brandName ? `${product.brandName} • ` : "") +
                          (product.categoryName ?? "Chưa phân loại")}
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
                            value={quantityByProduct[product.id] ?? 1}
                            onChange={(event) =>
                              setQuantityByProduct((prev) => ({
                                ...prev,
                                [product.id]: Number(event.target.value)
                              }))
                            }
                          />
                          <button type="button" onClick={() => void handleAddToCart(product.id)}>
                            Thêm vào giỏ
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {!products.length ? <p className="empty-message">Không có sản phẩm phù hợp với bộ lọc hiện tại.</p> : null}

            {productPage && productPage.totalPages > 1 ? (
              <footer className="pagination">
                <button
                  type="button"
                  disabled={!productPage.hasPrevious}
                  onClick={() => updateQuery({ page: Math.max(query.page - 1, 0) })}
                >
                  Trước
                </button>
                <span>{paginationLabel}</span>
                <button
                  type="button"
                  disabled={!productPage.hasNext}
                  onClick={() => updateQuery({ page: query.page + 1 })}
                >
                  Sau
                </button>
              </footer>
            ) : null}
          </>
        )}
      </section>
    </section>
  );
}

