import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { getMyOrders } from "../api/customer";
import type { CustomerOrderSummary } from "../types";

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toUpperCase();
}

function toStatusLabel(status: string) {
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
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

export function MyOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const data = await getMyOrders();
        if (!active) return;
        setOrders(data);
      } catch (e) {
        if (!active) return;
        setOrders([]);
        setError(toErrorMessage(e, "Không thể tải danh sách đơn hàng."));
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
    const k = keyword.trim().toLowerCase();
    if (!k) return orders;
    return orders.filter((o) => String(o.id).includes(k) || normalizeStatus(o.status).includes(k.toUpperCase()));
  }, [keyword, orders]);

  return (
    <section className="panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tài khoản</p>
          <h2>Đơn hàng của tôi</h2>
          <p className="subtext">Theo dõi trạng thái và xem chi tiết từng đơn hàng.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/profile" className="primary-link">
            Thông tin khách hàng
          </Link>
          <Link to="/products" className="primary-link">
            Mua thêm
          </Link>
        </div>
      </header>

      <div className="panel-toolbar">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo mã đơn hoặc trạng thái..."
        />
      </div>

      {isLoading ? (
        <div className="loading-block">
          <div className="loading-ring" />
          <p>Đang tải đơn hàng...</p>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      {!isLoading && !error && !filtered.length ? (
        <p className="empty-message">Bạn chưa có đơn hàng nào. Hãy quay lại trang sản phẩm để đặt hàng.</p>
      ) : null}

      {!isLoading && !error && filtered.length ? (
        <div className="order-table-wrap">
          <table className="order-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th>Số lượng</th>
                <th>Tổng</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>#{order.id}</strong>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                  <td>{toStatusLabel(order.status)}</td>
                  <td>{order.totalQuantity}</td>
                  <td>
                    <strong>{moneyFormatter.format(order.totalAmount)}</strong>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link to={`/orders/${order.id}`} className="primary-link">
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

