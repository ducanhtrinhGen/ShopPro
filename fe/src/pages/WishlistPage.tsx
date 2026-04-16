import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { getMyWishlist, removeWishlist } from "../api/wishlist";
import type { WishlistItem } from "../types";

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

function isOutOfStock(item: WishlistItem) {
  return item.quantity <= 0;
}

export function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const load = async () => {
      try {
        const data = await getMyWishlist();
        if (!active) return;
        setItems(data);
      } catch (e) {
        if (!active) return;
        setItems([]);
        setError(toErrorMessage(e, "Không tải được wishlist."));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.name.toLowerCase().includes(q));
  }, [items, keyword]);

  const handleRemove = async (productId: number) => {
    setRemovingId(productId);
    setMessage(null);
    try {
      await removeWishlist(productId);
      setItems((prev) => prev.filter((p) => p.productId !== productId));
      setMessage("Đã gỡ khỏi wishlist.");
    } catch (e) {
      setMessage(toErrorMessage(e, "Không gỡ được wishlist."));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="panel">
      <header className="page-header">
        <h1>Wishlist</h1>
        <p>Lưu sản phẩm để xem lại nhanh.</p>
        <div className="page-header-actions">
          <Link to="/products">Mở catalog</Link>
          <Link to="/orders">Đơn hàng</Link>
          <Link to="/profile">Tài khoản</Link>
        </div>
      </header>

      {message ? <p className="inline-notice">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="filters">
        <input
          type="text"
          value={keyword}
          placeholder="Tìm trong wishlist..."
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="loading-block">
          <div className="loading-ring" />
          <p>Đang tải wishlist...</p>
        </div>
      ) : null}

      {!isLoading && !error && filtered.length === 0 ? <p className="empty-message">Wishlist đang trống.</p> : null}

      {!isLoading && !error && filtered.length ? (
        <div className="c-home-grid" style={{ marginTop: "1rem" }}>
          {filtered.map((item) => {
            const out = isOutOfStock(item);
            const href = item.slug ? `/products/${item.slug}` : "/products";
            const salePrice = item.discountPrice && item.discountPrice > 0 ? item.discountPrice : null;

            return (
              <article key={item.productId} className="c-home-product-card">
                <Link to={href} className="c-home-product-media" style={{ display: "block" }}>
                  {out ? <span className="c-home-promo-badge">HẾT HÀNG</span> : null}
                  <img src={item.thumbnailUrl ?? item.imageUrl ?? ""} alt={item.name} />
                </Link>
                <div className="c-home-product-meta">
                  <h3>
                    <Link to={href}>{item.name}</Link>
                  </h3>
                  <p>{(item.brandName ? `${item.brandName} • ` : "") + (item.categoryName ?? "Chưa phân loại")}</p>
                  {salePrice ? (
                    <div>
                      <strong>{moneyFormatter.format(salePrice)}</strong>{" "}
                      <span style={{ textDecoration: "line-through", opacity: 0.7 }}>{moneyFormatter.format(item.price)}</span>
                    </div>
                  ) : (
                    <strong>{moneyFormatter.format(item.price)}</strong>
                  )}
                </div>
                <div className="card-actions c-home-card-actions">
                  <button type="button" onClick={() => void handleRemove(item.productId)} disabled={removingId === item.productId}>
                    {removingId === item.productId ? "..." : "Gỡ"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

