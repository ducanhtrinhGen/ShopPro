import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { apiRequest, ApiRequestError } from "../api/client";
import { getProductReviews, upsertReview } from "../api/reviews";
import { addToWishlist, getMyWishlist } from "../api/wishlist";
import { useAuth } from "../auth/AuthContext";
import { useLoginModal } from "../auth/LoginModalContext";
import { isCustomerUser } from "../auth/roleUtils";
import type { Product, ProductDetail, ReviewSummaryResponse } from "../types";

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toUpperCase();
}

function isProductOutOfStock(product: { status: string | null; quantity: number }) {
  const status = normalizeStatus(product.status);
  if (status && status !== "ACTIVE") return true;
  return product.quantity <= 0;
}

function productPromoPercent(product: { discountPrice: number | null; price: number }) {
  const discount = product.discountPrice ?? 0;
  if (!discount || discount <= 0) return null;
  if (discount >= product.price) return null;
  return Math.round(((product.price - discount) / product.price) * 100);
}

function parseSpecs(specs: string | null | undefined) {
  const raw = (specs ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/\r?\n|•|;/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function parseSpecPairs(specs: string | null | undefined) {
  return parseSpecs(specs).map((line, index) => {
    const [label, ...valueParts] = line.split(/:(.+)/).filter(Boolean);
    if (!valueParts.length) {
      return {
        key: `spec-${index}`,
        label: `Thông số ${index + 1}`,
        value: label.trim()
      };
    }

    return {
      key: `spec-${index}`,
      label: label.trim(),
      value: valueParts.join(":").trim()
    };
  });
}

function clampRating(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, value));
}

function renderStars(rating: number) {
  const fullStars = Math.max(0, Math.min(5, Math.round(clampRating(rating))));
  return `${"★".repeat(fullStars)}${"☆".repeat(5 - fullStars)}`;
}

function PdpStarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const r = clampRating(rating);
  const full = Math.round(r);
  return (
    <div className={`c-pdp-stars c-pdp-stars--${size}`} role="img" aria-label={`Đánh giá ${r.toFixed(1)} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? "is-on" : "is-off"} aria-hidden>
          ★
        </span>
      ))}
    </div>
  );
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium"
  }).format(date);
}

function buildFallbackImage(label: string) {
  const text = (label.trim().slice(0, 40) || "ShopPro").replace(/[<&>]/g, "");
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#111824"/>
          <stop offset="1" stop-color="#1b2636"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)"/>
      <circle cx="980" cy="120" r="180" fill="rgba(255,210,26,0.14)"/>
      <circle cx="160" cy="760" r="180" fill="rgba(142,197,255,0.12)"/>
      <text x="50%" y="47%" dominant-baseline="middle" text-anchor="middle" fill="#ffd21a" font-family="Arial, sans-serif" font-size="44" font-weight="700">ShopPro</text>
      <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="#dbe7f7" font-family="Arial, sans-serif" font-size="30">${text}</text>
    </svg>`
  )}`;
}

function productImageList(product: ProductDetail) {
  const unique = new Set<string>();
  for (const value of product.galleryImages ?? []) {
    const normalized = (value ?? "").trim();
    if (normalized) {
      unique.add(normalized);
    }
  }
  for (const value of [product.imageUrl, product.thumbnailUrl]) {
    const normalized = (value ?? "").trim();
    if (normalized) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
}

function productCardImage(product: Product) {
  return (product.imageUrl ?? product.thumbnailUrl ?? "").trim() || buildFallbackImage(product.name);
}

type DetailTab = "description" | "specifications" | "reviews" | "warranty";

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { openLoginModal } = useLoginModal();
  const normalizedSlug = (slug ?? "").trim();
  const { user } = useAuth();
  const isCustomer = isCustomerUser(user);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [isWished, setIsWished] = useState(false);
  const [wishlistStatusLoading, setWishlistStatusLoading] = useState(false);
  const [isTogglingWish, setIsTogglingWish] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("description");
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewSummaryResponse | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!normalizedSlug) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    setNotice(null);

    const load = async () => {
      try {
        const data = await apiRequest<ProductDetail>(`/api/products/slug/${encodeURIComponent(normalizedSlug)}`);
        if (!active) return;
        setProduct(data);
      } catch (e) {
        if (!active) return;
        setProduct(null);
        setError(toErrorMessage(e, "Không tải được sản phẩm."));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [normalizedSlug]);

  useEffect(() => {
    if (!product) return;
    let active = true;
    setIsLoadingReviews(true);
    setReviewMessage(null);

    const load = async () => {
      try {
        const data = await getProductReviews(product.id);
        if (!active) return;
        setReviewState(data);
        setReviewRating(data.myReview?.rating ?? 5);
        setReviewComment(data.myReview?.comment ?? "");
      } catch (e) {
        if (!active) return;
        setReviewState(null);
      } finally {
        if (active) setIsLoadingReviews(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [product?.id]);

  const specs = useMemo(() => parseSpecs(product?.specifications), [product?.specifications]);
  const specPairs = useMemo(() => parseSpecPairs(product?.specifications), [product?.specifications]);
  const gallery = useMemo(() => (product ? productImageList(product) : []), [product]);

  useEffect(() => {
    if (!product) {
      return;
    }
    setBrokenImages({});
    setActiveImage(gallery[0] ?? null);
    setQty(1);
    setActiveTab("description");
  }, [gallery, product]);

  useEffect(() => {
    if (!product || !user || !isCustomer) {
      setWishlistStatusLoading(false);
      setIsWished(false);
      return;
    }
    let cancelled = false;
    setWishlistStatusLoading(true);
    void getMyWishlist()
      .then((list) => {
        if (!cancelled) {
          setIsWished(list.some((item) => item.productId === product.id));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsWished(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWishlistStatusLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [product?.id, user, isCustomer]);

  if (!normalizedSlug) {
    return <Navigate to="/products" replace />;
  }

  if (isLoading) {
    return (
      <section className="panel">
        <div className="loading-block">
          <div className="loading-ring" />
          <p>Đang tải sản phẩm...</p>
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="panel">
        <header className="page-header">
          <h1>Không tìm thấy sản phẩm</h1>
          <p>{error ?? "Sản phẩm không tồn tại hoặc đã bị ẩn."}</p>
          <Link to="/products">← Quay lại catalog</Link>
        </header>
      </section>
    );
  }

  const out = isProductOutOfStock(product);
  const percent = productPromoPercent(product);
  const salePrice = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : null;
  const fallbackImage = buildFallbackImage(product.name);
  const displayImage = activeImage && !brokenImages[activeImage] ? activeImage : gallery.find((item) => !brokenImages[item]) ?? fallbackImage;
  const supportHighlights = product.supportHighlights?.length
    ? product.supportHighlights
    : [
        "Hỗ trợ kỹ thuật trước và sau khi mua hàng.",
        "Giao hàng toàn quốc, đồng kiểm khi nhận.",
        "Đổi trả minh bạch nếu có lỗi từ nhà sản xuất."
      ];
  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "description", label: "Mô tả" },
    { id: "specifications", label: "Thông số" },
    { id: "reviews", label: "Đánh giá" },
    { id: "warranty", label: "Bảo hành" }
  ];

  const updateQuantity = (nextValue: number) => {
    const next = Math.max(1, Math.min(product.quantity || 1, Math.floor(nextValue || 1)));
    setQty(next);
  };

  const addToCart = async (redirectToCart: boolean, afterAuth = false) => {
    setNotice(null);
    if (out) return;
    if (!afterAuth && (!user || !isCustomerUser(user))) {
      openLoginModal({ onSuccess: () => void addToCart(redirectToCart, true) });
      return;
    }
    const safeQty = Math.max(1, Math.min(product.quantity || 1, Math.floor(qty || 1)));
    setIsSubmittingPurchase(true);
    try {
      await apiRequest("/api/cart/items", {
        method: "POST",
        body: { productId: product.id, quantity: safeQty }
      });
      setNotice(redirectToCart ? "Đã thêm sản phẩm và chuyển tới giỏ hàng." : "Đã thêm vào giỏ hàng.");
      if (redirectToCart) {
        navigate("/cart");
      }
    } catch (e) {
      setNotice(toErrorMessage(e, redirectToCart ? "Không thể mua ngay lúc này." : "Không thể thêm vào giỏ."));
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const handleAddToCart = async (event: FormEvent) => {
    event.preventDefault();
    await addToCart(false);
  };

  const handleWishlistAction = async () => {
    if (!product) return;
    setNotice(null);

    if (!user) {
      openLoginModal({ onSuccess: () => void handleWishlistAction() });
      return;
    }

    if (!isCustomer) {
      setNotice("Danh sách yêu thích chỉ dành cho tài khoản khách hàng.");
      return;
    }

    if (isWished) {
      setNotice("Sản phẩm đã có trong danh sách yêu thích của bạn.");
      return;
    }

    setIsTogglingWish(true);
    try {
      const result = await addToWishlist(product.id);
      setIsWished(true);
      setNotice(result.alreadyInWishlist ? "Sản phẩm đã có trong danh sách yêu thích." : "Đã thêm vào danh sách yêu thích.");
    } catch (e) {
      setNotice(toErrorMessage(e, "Không thêm được vào danh sách yêu thích."));
    } finally {
      setIsTogglingWish(false);
    }
  };

  const submitReviewCore = async () => {
    if (!product) return;
    await upsertReview({
      productId: product.id,
      rating: reviewRating,
      comment: reviewComment
    });
    const data = await getProductReviews(product.id);
    setReviewState(data);
    setReviewMessage("Đã gửi đánh giá.");
  };

  const handleSubmitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!product) return;
    setReviewMessage(null);
    if (!isCustomer) {
      if (!user) {
        openLoginModal({
          onSuccess: async () => {
            try {
              await submitReviewCore();
            } catch (e) {
              setReviewMessage(toErrorMessage(e, "Không gửi được đánh giá."));
            }
          }
        });
        return;
      }
      setReviewMessage("Vui lòng đăng nhập tài khoản mua hàng để đánh giá.");
      return;
    }
    try {
      await submitReviewCore();
    } catch (e) {
      setReviewMessage(toErrorMessage(e, "Không gửi được đánh giá."));
    }
  };

  return (
    <section className="panel">
      <header className="page-header">
        <p className="breadcrumbs">
          <Link to="/products">Sản phẩm</Link>
          {product.categoryId ? (
            <>
              {" "}
              / <Link to={`/products?categoryId=${product.categoryId}`}>{product.categoryName ?? "Danh mục"}</Link>
            </>
          ) : null}
        </p>
        <h1>{product.name}</h1>
        <p style={{ opacity: 0.85 }}>
          {product.brandName ? <strong>{product.brandName}</strong> : null}
          {product.brandName && product.categoryName ? " • " : null}
          {product.categoryName ?? "Chưa phân loại"}
        </p>
      </header>

      {notice ? <p className="inline-notice">{notice}</p> : null}

      <div className="c-product-detail">
        <div className="c-product-detail-media">
          <div className="c-product-gallery-main">
            <img
              src={displayImage}
              alt={product.name}
              onError={() =>
                setBrokenImages((prev) => ({
                  ...prev,
                  [displayImage]: true
                }))
              }
            />
          </div>
          {out ? <span className="c-home-promo-badge">HẾT HÀNG</span> : null}
          {!out && percent ? <span className="c-home-promo-badge">-{percent}%</span> : null}

          <div className="c-product-gallery-thumbs">
            {(gallery.length ? gallery : [fallbackImage]).map((image, index) => {
              const preview = brokenImages[image] ? fallbackImage : image;
              const isActive = displayImage === image || (displayImage === fallbackImage && preview === fallbackImage && index === 0);
              return (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={isActive ? "is-active" : ""}
                  onClick={() => setActiveImage(image)}
                >
                  <img
                    src={preview}
                    alt={`${product.name} ${index + 1}`}
                    onError={() =>
                      setBrokenImages((prev) => ({
                        ...prev,
                        [image]: true
                      }))
                    }
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="c-product-detail-buy">
          <div className="c-product-detail-summary">
            <span className={`c-product-stock ${out ? "is-out" : "is-in"}`}>{out ? "Tạm hết hàng" : "Còn hàng"}</span>
            <div className="c-product-rating-summary" aria-live="polite">
              {isLoadingReviews ? (
                <span className="c-product-rating-muted">Đang tải đánh giá…</span>
              ) : reviewState ? (
                <>
                  <PdpStarRating rating={reviewState.averageRating} size="sm" />
                  <span className="c-product-rating-score">{reviewState.averageRating.toFixed(1)}</span>
                  <span className="c-product-rating-count">{reviewState.totalReviews} đánh giá</span>
                </>
              ) : (
                <span className="c-product-rating-muted">Chưa có đánh giá</span>
              )}
            </div>
          </div>

          <div className="c-product-detail-price">
            {salePrice ? (
              <>
                <strong>{moneyFormatter.format(salePrice)}</strong>
                <span className="c-product-detail-price-old">{moneyFormatter.format(product.price)}</span>
                {percent ? <span className="c-product-detail-discount">Tiết kiệm {percent}%</span> : null}
              </>
            ) : (
              <strong>{moneyFormatter.format(product.price)}</strong>
            )}
          </div>

          <p className="c-product-detail-short">{product.shortDescription ?? "Thiết kế tối ưu cho nhu cầu gaming, làm việc và nâng cấp hệ thống của bạn."}</p>

          <div className="c-product-detail-facts">
            <div>
              <span>Thương hiệu</span>
              <strong>{product.brandName ?? "ShopPro Select"}</strong>
            </div>
            <div>
              <span>SKU</span>
              <strong>{product.sku ?? `SP-${product.id}`}</strong>
            </div>
            <div>
              <span>Danh mục</span>
              <strong>{product.categoryName ?? "Chưa phân loại"}</strong>
            </div>
            <div>
              <span>Bảo hành</span>
              <strong>12 tháng</strong>
            </div>
          </div>

          <form onSubmit={(e) => void handleAddToCart(e)} className="c-product-detail-form">
            <div className="c-product-detail-purchase-head">
              <div>
                <span>Tồn kho</span>
                <strong>
                  {out
                    ? "Tạm hết — vui lòng liên hệ để đặt trước hoặc chọn mẫu khác."
                    : `${product.quantity} sản phẩm sẵn sàng giao`}
                </strong>
              </div>
              <div>
                <span>Vận chuyển</span>
                <strong>{out ? "Sẽ xác nhận khi có hàng" : "Giao nhanh 2h - 48h"}</strong>
              </div>
            </div>

            <div className="c-product-qty-row">
              <span>Số lượng</span>
              <div className="c-product-qty-control">
                <button type="button" onClick={() => updateQuantity(qty - 1)} disabled={out || qty <= 1}>
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={Math.max(product.quantity, 1)}
                  value={qty}
                  disabled={out}
                  onChange={(e) => updateQuantity(Number(e.target.value))}
                />
                <button type="button" onClick={() => updateQuantity(qty + 1)} disabled={out || qty >= product.quantity}>
                  +
                </button>
              </div>
            </div>

            <div className={`c-product-purchase-actions${out ? " is-solo" : ""}`}>
              {out ? (
                <Link to="/contact" className="c-product-contact-cta">
                  <span className="c-product-contact-cta-title">Liên hệ</span>
                  <span className="c-product-contact-cta-sub">Tư vấn nhanh</span>
                </Link>
              ) : (
                <>
                  <button type="submit" disabled={isSubmittingPurchase}>
                    {isSubmittingPurchase ? "Đang xử lý..." : "Thêm vào giỏ"}
                  </button>
                  <button type="button" className="ghost-button" disabled={isSubmittingPurchase} onClick={() => void addToCart(true)}>
                    Mua ngay
                  </button>
                </>
              )}
            </div>
          </form>

          <div className="c-product-wish-row">
            <button
              type="button"
              className="c-product-wish-primary"
              disabled={wishlistStatusLoading || isTogglingWish || (!!user && isCustomer && isWished)}
              onClick={() => void handleWishlistAction()}
            >
              {wishlistStatusLoading
                ? "Đang kiểm tra danh sách yêu thích…"
                : !user
                  ? "♡ Thêm vào danh sách yêu thích"
                  : isWished
                    ? "Đã có trong danh sách yêu thích"
                    : "♡ Thêm vào danh sách yêu thích"}
            </button>
            {user && isCustomer && isWished ? (
              <Link to="/wishlist" className="c-product-wish-secondary">
                Xem danh sách yêu thích
              </Link>
            ) : null}
          </div>

          <section className="c-product-detail-clarity">
            <h2>Vận chuyển & hỗ trợ</h2>
            <ul>
              {supportHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="c-product-detail-section c-product-tabs">
        <div className="c-product-tab-list">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="c-product-tab-panel">
          {activeTab === "description" ? (
            <div className="c-product-tab-copy">
              <h2>Mô tả sản phẩm</h2>
              <p>{product.shortDescription ?? "Sản phẩm được tuyển chọn để mang lại hiệu năng ổn định và trải nghiệm sử dụng tối ưu."}</p>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {product.description ?? "Thông tin mô tả chi tiết đang được cập nhật. Liên hệ ShopPro để được tư vấn cấu hình phù hợp."}
              </p>
            </div>
          ) : null}

          {activeTab === "specifications" ? (
            <div className="c-product-tab-copy">
              <h2>Thông số kỹ thuật</h2>
              {specPairs.length ? (
                <div className="c-product-spec-grid">
                  {specPairs.map((item) => (
                    <div key={item.key} className="c-product-spec-row">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              ) : specs.length ? (
                <ul className="c-product-highlight-list">
                  {specs.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p>Thông số kỹ thuật đang được cập nhật.</p>
              )}
            </div>
          ) : null}

          {activeTab === "reviews" ? (
            <div className="c-product-reviews">
              {isLoadingReviews ? (
                <div className="c-product-reviews-hero c-product-reviews-hero--loading">
                  <p className="c-product-rating-muted">Đang tải đánh giá…</p>
                </div>
              ) : reviewState ? (
                <div className="c-product-reviews-hero">
                  <div className="c-product-reviews-hero-main">
                    <div className="c-product-reviews-hero-score">
                      <strong>{reviewState.averageRating.toFixed(1)}</strong>
                      <span className="c-product-reviews-hero-max">/ 5</span>
                    </div>
                    <PdpStarRating rating={reviewState.averageRating} size="lg" />
                    <p className="c-product-reviews-hero-count">
                      {reviewState.totalReviews === 0
                        ? "Chưa có đánh giá nào — hãy là người đầu tiên chia sẻ trải nghiệm."
                        : `${reviewState.totalReviews} đánh giá từ khách hàng`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="c-product-reviews-hero c-product-reviews-hero--empty">
                  <PdpStarRating rating={0} size="lg" />
                  <p className="c-product-rating-muted">Chưa tải được tổng hợp đánh giá.</p>
                </div>
              )}

              {reviewMessage ? <p className="inline-notice">{reviewMessage}</p> : null}

              {!isLoadingReviews && reviewState ? (
                <>
                  <form onSubmit={(e) => void handleSubmitReview(e)} className="c-product-review-form">
                    <label>
                      Điểm đánh giá
                      <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                        {[5, 4, 3, 2, 1].map((r) => (
                          <option key={r} value={r}>
                            {r} - {renderStars(r)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="is-wide">
                      Nhận xét
                      <textarea
                        rows={4}
                        value={reviewComment}
                        placeholder="Chia sẻ trải nghiệm sử dụng, hiệu năng hoặc độ hoàn thiện của sản phẩm."
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                    </label>
                    <button type="submit" disabled={!reviewState.canReview && !reviewState.myReview}>
                      {reviewState.myReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
                    </button>
                  </form>

                  {reviewState.reviews.length ? (
                    <div className="c-product-review-list">
                      {reviewState.reviews.slice(0, 10).map((item) => (
                        <article key={item.id} className="c-product-review-card">
                          <header>
                            <div>
                              <strong>{item.username}</strong>
                              <p>{formatReviewDate(item.createdAt)}</p>
                            </div>
                            <div className="c-product-review-card-rating">
                              <PdpStarRating rating={item.rating} size="sm" />
                              <span className="c-product-review-card-score">{item.rating}/5</span>
                            </div>
                          </header>
                          {item.comment ? <p>{item.comment}</p> : <p>Khách hàng chưa để lại bình luận chi tiết.</p>}
                        </article>
                      ))}
                    </div>
                  ) : reviewState.totalReviews === 0 ? (
                    <div className="c-product-reviews-empty-card">
                      <h3>Chưa có nhận xét</h3>
                      <p>Khi có đánh giá, nội dung sẽ hiển thị tại đây. Bạn có thể gửi đánh giá nếu đã mua sản phẩm.</p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {activeTab === "warranty" ? (
            <div className="c-product-tab-copy">
              <h2>Chính sách bảo hành</h2>
              <p>{product.warrantyPolicy ?? "Bảo hành chính hãng 12 tháng, hỗ trợ đổi mới nếu có lỗi phần cứng theo chính sách của ShopPro."}</p>
              <ul className="c-product-highlight-list">
                <li>Kiểm tra serial/SKU và tình trạng sản phẩm khi nhận hàng.</li>
                <li>Giữ lại hóa đơn hoặc thông tin đơn hàng để được hỗ trợ nhanh hơn.</li>
                <li>Đội ngũ kỹ thuật ShopPro hỗ trợ chẩn đoán từ xa trước khi tiếp nhận bảo hành.</li>
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {product.relatedProducts?.length ? (
        <section className="c-product-detail-section">
          <div className="c-product-related-head">
            <div>
              <h2>Sản phẩm liên quan</h2>
              <p>Gợi ý thêm các lựa chọn cùng phân khúc hoặc cùng danh mục để hoàn thiện cấu hình.</p>
            </div>
            <Link to={product.categoryId ? `/products?categoryId=${product.categoryId}` : "/products"} className="primary-link">
              Xem thêm
            </Link>
          </div>

          <div className="c-home-product-grid c-product-related-grid">
            {product.relatedProducts.map((item) => {
              const itemPercent = productPromoPercent(item);
              const itemSalePrice = item.discountPrice && item.discountPrice > 0 ? item.discountPrice : null;
              const itemOut = isProductOutOfStock(item);
              const href = item.slug ? `/products/${item.slug}` : "/products";

              return (
                <article key={item.id} className="c-home-product-card">
                  <Link to={href} className="c-home-product-media" style={{ display: "block" }}>
                    {itemOut ? <span className="c-home-promo-badge">HẾT HÀNG</span> : null}
                    {!itemOut && itemPercent ? <span className="c-home-promo-badge">-{itemPercent}%</span> : null}
                    <img src={productCardImage(item)} alt={item.name} />
                  </Link>

                  <div className="c-home-product-meta">
                    <h3>
                      <Link to={href}>{item.name}</Link>
                    </h3>
                    <p>{(item.brandName ? `${item.brandName} • ` : "") + (item.categoryName ?? "Chưa phân loại")}</p>
                    {itemSalePrice ? (
                      <div>
                        <strong>{moneyFormatter.format(itemSalePrice)}</strong>{" "}
                        <span style={{ textDecoration: "line-through", opacity: 0.7 }}>{moneyFormatter.format(item.price)}</span>
                      </div>
                    ) : (
                      <strong>{moneyFormatter.format(item.price)}</strong>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}

