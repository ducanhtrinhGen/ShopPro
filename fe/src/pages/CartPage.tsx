import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, ApiRequestError } from "../api/client";
import type { CartResponse, CheckoutResponse } from "../types";

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

export function CartPage() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const navigate = useNavigate();

  const loadCart = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest<CartResponse>("/api/cart");
      setCart(data);
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setError(requestError.message);
      } else {
        setError("Không thể tải giỏ hàng.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCart();
  }, []);

  const updateQuantity = async (productId: number, quantity: number) => {
    try {
      const updated = await apiRequest<CartResponse>(`/api/cart/items/${productId}`, {
        method: "PUT",
        body: { quantity }
      });
      setCart(updated);
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setNotice(requestError.message);
      } else {
        setNotice("Không thể cập nhật số lượng.");
      }
    }
  };

  const removeItem = async (productId: number) => {
    const updated = await apiRequest<CartResponse>(`/api/cart/items/${productId}`, {
      method: "DELETE"
    });
    setCart(updated);
  };

  const checkout = async () => {
    setNotice(null);
    setIsCheckingOut(true);

    try {
      const response = await apiRequest<CheckoutResponse>("/api/cart/checkout", {
        method: "POST"
      });
      navigate(`/orders/${response.orderId}`);
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setNotice(requestError.message);
      } else {
        setNotice("Thanh toán thất bại.");
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <section className="panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Giỏ hàng theo phiên</p>
          <h2>Xem lại giỏ hàng</h2>
          <p className="subtext">Điều chỉnh số lượng, xóa sản phẩm và thanh toán trong một bước.</p>
        </div>
        <Link to="/products" className="primary-link">
          Quay lại sản phẩm
        </Link>
      </header>

      {notice ? <p className="inline-notice">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {isLoading ? (
        <div className="loading-block">
          <div className="loading-ring" />
          <p>Đang tải giỏ hàng...</p>
        </div>
      ) : null}

      {!isLoading && cart && !cart.items.length ? (
        <p className="empty-message">Giỏ hàng của bạn đang trống. Hãy thêm sản phẩm từ trang danh mục.</p>
      ) : null}

      {!isLoading && cart && cart.items.length ? (
        <div className="cart-layout-grid">
          <div className="cart-items">
            {cart.items.map((item) => (
              <article key={item.productId} className="cart-item">
                <div>
                  <h3>{item.productName}</h3>
                  <p>{moneyFormatter.format(item.price)} / sản phẩm</p>
                  <p className="price">{moneyFormatter.format(item.subtotal)}</p>
                </div>

                <div className="cart-item-actions">
                  <input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(event) => void updateQuantity(item.productId, Number(event.target.value))}
                  />
                  <button type="button" className="danger-button" onClick={() => void removeItem(item.productId)}>
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="summary-box">
            <h3>Tóm tắt thanh toán</h3>
            <p>
              Số lượng: <strong>{cart.totalQuantity}</strong>
            </p>
            <p>
              Tổng tiền: <strong>{moneyFormatter.format(cart.totalAmount)}</strong>
            </p>
            <button type="button" onClick={() => void checkout()} disabled={isCheckingOut}>
              {isCheckingOut ? "Đang xử lý..." : "Thanh toán"}
            </button>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
