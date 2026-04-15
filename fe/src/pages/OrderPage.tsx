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

  const normalizeStatus = (status: string | null | undefined) => (status ?? "").trim().toUpperCase();
  const toStatusLabel = (status: string | null | undefined) => {
    const normalized = normalizeStatus(status);
    if (normalized === "PENDING") return "Chờ xử lý";
    if (normalized === "CONFIRMED") return "Đã xác nhận";
    if (normalized === "PROCESSING") return "Đang xử lý";
    if (normalized === "SHIPPING") return "Đang giao";
    if (normalized === "DELIVERED") return "Đã giao";
    if (normalized === "COMPLETED") return "Hoàn tất";
    if (normalized === "CANCELLED") return "Đã hủy";
    if (normalized === "FAILED") return "Thất bại";
    if (normalized === "REFUNDED") return "Hoàn tiền";
    return status || "Không rõ";
  };

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
            <p>
              Trạng thái: <strong>{toStatusLabel(order.status)}</strong>
            </p>
            <p>
              Thanh toán: <strong>{order.paymentMethod ?? "COD"}</strong>
            </p>
          </div>

          <div className="summary-box" style={{ marginBottom: "1rem" }}>
            <h3>Thông tin nhận hàng</h3>
            <p>
              Người nhận: <strong>{order.receiverName ?? "Chưa cập nhật"}</strong>
            </p>
            <p>
              SĐT: <strong>{order.phone ?? "Chưa cập nhật"}</strong>
            </p>
            <p>
              Địa chỉ: <strong>{order.address ?? "Chưa cập nhật"}</strong>
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
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Link to="/orders" className="primary-link">
                Danh sách đơn
              </Link>
              <Link to="/profile" className="primary-link">
                Cập nhật hồ sơ
              </Link>
            </div>
          </footer>
        </>
      ) : null}
    </section>
  );
}
