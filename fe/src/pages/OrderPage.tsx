import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, ApiRequestError } from "../api/client";
import type { OrderResponse } from "../types";

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

export function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiRequest<OrderResponse>(`/api/orders/${id}`);
        setOrder(data);
      } catch (requestError) {
        if (requestError instanceof ApiRequestError) {
          setError(requestError.message);
        } else {
          setError("Không thể tải chi tiết đơn hàng.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      void loadOrder();
    }
  }, [id]);

  return (
    <section className="panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Xác nhận đơn hàng</p>
          <h2>Cảm ơn bạn đã đặt hàng</h2>
          <p className="subtext">Xem lại sản phẩm đã mua và lưu phần tóm tắt này để đối chiếu khi cần.</p>
        </div>
        <Link to="/products" className="primary-link">
          Tiếp tục mua sắm
        </Link>
      </header>

      {isLoading ? (
        <div className="loading-block">
          <div className="loading-ring" />
          <p>Đang tải đơn hàng...</p>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      {!isLoading && order ? (
        <>
          <div className="order-meta">
            <p>
              Mã đơn: <strong>#{order.id}</strong>
            </p>
            <p>
              Thời gian tạo: <strong>{new Date(order.createdAt).toLocaleString()}</strong>
            </p>
          </div>

          <div className="order-list">
            {order.details.map((detail) => (
              <article key={`${detail.productId}-${detail.productName}`} className="order-item">
                <h3>{detail.productName}</h3>
                <p>Đơn giá: {moneyFormatter.format(detail.unitPrice)}</p>
                <p>Số lượng: {detail.quantity}</p>
                <p className="price">Tạm tính: {moneyFormatter.format(detail.subtotal)}</p>
              </article>
            ))}
          </div>

          <footer className="summary-box order-summary">
            <p>
              Tổng số lượng: <strong>{order.totalQuantity}</strong>
            </p>
            <p>
              Tổng đơn hàng: <strong>{moneyFormatter.format(order.totalAmount)}</strong>
            </p>
          </footer>
        </>
      ) : null}
    </section>
  );
}
