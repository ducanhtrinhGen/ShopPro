import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { apiRequest, ApiRequestError } from "../api/client";
import { getProductReviews, upsertReview } from "../api/reviews";
import { toggleWishlist } from "../api/wishlist";
import { useAuth } from "../auth/AuthContext";
import { isCustomerUser } from "../auth/roleUtils";
import type { ProductDetail, ReviewSummaryResponse } from "../types";

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

function isOutOfStock(product: ProductDetail) {
  const status = normalizeStatus(product.status);
  if (status && status !== "ACTIVE") return true;
  return product.quantity <= 0;
}

function promoPercent(product: ProductDetail) {
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

export function ProductDetailPage() {
  const { slug } = useParams();
  const normalizedSlug = (slug ?? "").trim();
  const { user } = useAuth();
  const isCustomer = isCustomerUser(user);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [isWished, setIsWished] = useState(false);
  const [isTogglingWish, setIsTogglingWish] = useState(false);
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

  const out = isOutOfStock(product);
  const percent = promoPercent(product);
  const salePrice = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : null;
  const displayImage = (product.thumbnailUrl ?? product.imageUrl ?? "").trim();

  const handleAddToCart = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);
    if (out) return;
    const safeQty = Math.max(1, Math.floor(qty || 1));
    try {
      await apiRequest("/api/cart/items", {
        method: "POST",
        body: { productId: product.id, quantity: safeQty }
      });
      setNotice("Đã thêm vào giỏ hàng.");
    } catch (e) {
      setNotice(toErrorMessage(e, "Không thể thêm vào giỏ."));
    }
  };

  const handleToggleWishlist = async () => {
    if (!product) return;
    if (!isCustomer) {
      setNotice("Vui lòng đăng nhập tài khoản mua hàng để dùng wishlist.");
      return;
    }
    setIsTogglingWish(true);
    try {
      const result = await toggleWishlist(product.id);
      setIsWished(result.wished);
      setNotice(result.wished ? "Đã thêm vào wishlist." : "Đã gỡ khỏi wishlist.");
    } catch (e) {
      setNotice(toErrorMessage(e, "Không cập nhật được wishlist."));
    } finally {
      setIsTogglingWish(false);
    }
  };

  const handleSubmitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!product) return;
    setReviewMessage(null);
    if (!isCustomer) {
      setReviewMessage("Vui lòng đăng nhập tài khoản mua hàng để đánh giá.");
      return;
    }
    try {
      await upsertReview({
        productId: product.id,
        rating: reviewRating,
        comment: reviewComment
      });
      const data = await getProductReviews(product.id);
      setReviewState(data);
      setReviewMessage("Đã gửi đánh giá.");
    } catch (e) {
      setReviewMessage(toErrorMessage(e, "Không gửi được đánh giá."));
    }
  };

  return (
    <section className="panel">
      <header className="page-header">
        <p className="breadcrumbs">
          <Link to="/products">Catalog</Link>
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
          {displayImage ? <img src={displayImage} alt={product.name} /> : <div className="c-product-detail-placeholder" />}
          {out ? <span className="c-home-promo-badge">HẾT HÀNG</span> : null}
          {!out && percent ? <span className="c-home-promo-badge">-{percent}%</span> : null}
        </div>

        <div className="c-product-detail-buy">
          <div className="c-product-detail-price">
            {salePrice ? (
              <>
                <strong>{moneyFormatter.format(salePrice)}</strong>{" "}
                <span style={{ textDecoration: "line-through", opacity: 0.7 }}>{moneyFormatter.format(product.price)}</span>
              </>
            ) : (
              <strong>{moneyFormatter.format(product.price)}</strong>
            )}
          </div>

          <p style={{ marginTop: "0.35rem", opacity: 0.85 }}>
            Tồn kho: <strong>{product.quantity}</strong>
          </p>

          <form onSubmit={(e) => void handleAddToCart(e)} className="c-product-detail-form">
            <label>
              Số lượng
              <input type="number" min={1} value={qty} disabled={out} onChange={(e) => setQty(Number(e.target.value))} />
            </label>
            <button type="submit" disabled={out}>
              {out ? "Hết hàng" : "Thêm vào giỏ"}
            </button>
          </form>

          <button
            type="button"
            className="c-product-detail-wish"
            disabled={isTogglingWish}
            onClick={() => void handleToggleWishlist()}
          >
            {isWished ? "♥ Đã thích" : "♡ Wishlist"}
          </button>

          <section className="c-product-detail-clarity">
            <h2>Gợi ý mua linh kiện PC</h2>
            <ul>
              <li>Kiểm tra tương thích với mainboard/CPU/RAM (nếu là linh kiện).</li>
              <li>Ước lượng công suất PSU và không gian case (nếu là GPU/tản/case).</li>
              <li>Ưu tiên linh kiện còn hàng để không bị chậm đơn.</li>
            </ul>
          </section>
        </div>
      </div>

      {product.shortDescription ? (
        <section className="c-product-detail-section">
          <h2>Tóm tắt</h2>
          <p>{product.shortDescription}</p>
        </section>
      ) : null}

      {specs.length ? (
        <section className="c-product-detail-section">
          <h2>Thông số nổi bật</h2>
          <ul>
            {specs.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {product.description ? (
        <section className="c-product-detail-section">
          <h2>Mô tả</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{product.description}</p>
        </section>
      ) : null}

      <section className="c-product-detail-section">
        <h2>Đánh giá</h2>
        {isLoadingReviews ? <p className="owner-crm-empty">Đang tải đánh giá...</p> : null}

        {!isLoadingReviews && reviewState ? (
          <>
            <p style={{ opacity: 0.85 }}>
              <strong>{reviewState.averageRating.toFixed(1)}</strong>/5 • {reviewState.totalReviews} đánh giá
            </p>

            {reviewMessage ? <p className="inline-notice">{reviewMessage}</p> : null}

            <form onSubmit={(e) => void handleSubmitReview(e)} className="form">
              <label>
                Rating
                <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nhận xét
                <textarea rows={4} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
              </label>
              <button type="submit" disabled={!reviewState.canReview && !reviewState.myReview}>
                Gửi đánh giá
              </button>
            </form>

            {reviewState.reviews.length ? (
              <ul style={{ marginTop: "1rem" }}>
                {reviewState.reviews.slice(0, 10).map((item) => (
                  <li key={item.id} style={{ marginBottom: "0.75rem" }}>
                    <strong>
                      {item.username} • {item.rating}/5
                    </strong>
                    {item.comment ? <p style={{ margin: "0.25rem 0 0", opacity: 0.9 }}>{item.comment}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-message">Chưa có đánh giá nào.</p>
            )}
          </>
        ) : (
          <p className="empty-message">Chưa tải được đánh giá.</p>
        )}
      </section>
    </section>
  );
}

