import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getStaffDataIssues,
  getStaffLowStockProducts,
  getStaffOrders,
  patchStaffProductQuantity,
  updateStaffOrderStatus
} from "../api/staffOperations";
import { ApiRequestError } from "../api/client";
import type { AdminDataIssue, AdminOrderItem, AdminProductOpsItem } from "../types";

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short"
});

type OrderStatusFilter = "ALL" | "PENDING" | "PROCESSING" | "SHIPPING" | "COMPLETED" | "CANCELLED";

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toUpperCase();
}

function toStatusLabel(status: string | null | undefined) {
  const normalized = normalizeStatus(status);
  if (normalized === "PENDING") return "Cho xu ly";
  if (normalized === "PROCESSING") return "Dang xu ly";
  if (normalized === "SHIPPING") return "Dang giao";
  if (normalized === "COMPLETED" || normalized === "DELIVERED") return "Hoan tat";
  if (normalized === "CANCELLED") return "Da huy";
  if (normalized === "CONFIRMED") return "Da xac nhan";
  return status || "Khong ro";
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

export function StaffDashboardPage() {
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [lowStock, setLowStock] = useState<AdminProductOpsItem[]>([]);
  const [dataIssues, setDataIssues] = useState<AdminDataIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
  const [orderDraftStatus, setOrderDraftStatus] = useState<Record<number, string>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [stockQtyDraft, setStockQtyDraft] = useState<Record<number, string>>({});
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const [orderList, low, issues] = await Promise.all([
          getStaffOrders(),
          getStaffLowStockProducts(7),
          getStaffDataIssues()
        ]);
        if (!active) return;
        setOrders(orderList);
        setLowStock(low);
        setDataIssues(issues);
      } catch (e) {
        if (!active) return;
        setError(toErrorMessage(e, "Không tải được dữ liệu vận hành."));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return orders.filter((order) => {
      const matchKeyword =
        !k ||
        String(order.id).includes(k) ||
        order.customerUsername.toLowerCase().includes(k) ||
        (order.receiverName ?? "").toLowerCase().includes(k);
      if (!matchKeyword) return false;
      if (statusFilter === "ALL") return true;
      return normalizeStatus(order.orderStatus) === statusFilter;
    });
  }, [orders, keyword, statusFilter]);

  const handleStockUpdate = async (productId: number) => {
    const raw = (stockQtyDraft[productId] ?? "").trim();
    const qty = parseInt(raw, 10);
    if (Number.isNaN(qty) || qty < 0) {
      setMessage("Số lượng không hợp lệ.");
      return;
    }
    setUpdatingProductId(productId);
    setMessage(null);
    try {
      const updated = await patchStaffProductQuantity(productId, qty);
      setLowStock((prev) => prev.map((p) => (p.id === productId ? { ...p, quantity: updated.quantity } : p)));
      setMessage(`Đã cập nhật tồn kho sản phẩm #${productId}.`);
    } catch (e) {
      setMessage(toErrorMessage(e, `Không cập nhật được sản phẩm #${productId}.`));
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleStatusUpdate = async (orderId: number) => {
    const target = (orderDraftStatus[orderId] ?? "").trim().toUpperCase();
    if (!target) {
      setMessage("Chọn trạng thái trước khi cập nhật.");
      return;
    }
    setUpdatingOrderId(orderId);
    setMessage(null);
    try {
      const updated = await updateStaffOrderStatus(orderId, target);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, orderStatus: updated.orderStatus } : o)));
      setMessage(`Đã cập nhật đơn #${orderId}.`);
    } catch (e) {
      setMessage(toErrorMessage(e, `Không cập nhật được đơn #${orderId}.`));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <section className="owner-crm-page">
      <div className="owner-crm-shell">
        <aside className="owner-crm-sidebar">
          <div className="owner-crm-brand">
            <span>SP</span>
            <strong>ShopPro Staff</strong>
          </div>
          <p className="owner-crm-empty" style={{ padding: "0 1rem", textAlign: "left" }}>
            Khu vuc danh cho nhan vien: xu ly don hang, theo doi ton kho va canh bao du lieu.
          </p>
          <div className="owner-crm-sidebar-actions">
            <Link to="/products">Xem san pham (khach)</Link>
          </div>
        </aside>

        <div className="owner-crm-main">
          <header className="owner-crm-header">
            <div>
              <p className="owner-crm-kicker">VAN HANH</p>
              <h1>Bang dieu khien nhan vien</h1>
              <p>
              API <code>/api/staff/**</code>: đơn hàng, tồn kho thấp, cảnh báo dữ liệu, chỉnh số lượng tồn. Không chỉnh
              giá/danh mục.
            </p>
            </div>
          </header>

          {message ? <p className="owner-crm-empty">{message}</p> : null}
          {error ? <p className="owner-crm-empty">{error}</p> : null}
          {isLoading ? (
            <div className="loading-block">
              <div className="loading-ring" />
              <p>Dang tai...</p>
            </div>
          ) : null}

          {!isLoading && !error ? (
            <>
              <section className="owner-crm-panel">
                <div className="owner-crm-panel-head">
                  <h2>Don hang ({filteredOrders.length})</h2>
                  <div className="owner-crm-toolbar">
                    <input
                      type="text"
                      placeholder="Tim ma don / khach..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatusFilter)}>
                      <option value="ALL">Tat ca</option>
                      <option value="PENDING">Cho xu ly</option>
                      <option value="PROCESSING">Dang xu ly</option>
                      <option value="SHIPPING">Dang giao</option>
                      <option value="COMPLETED">Hoan tat</option>
                      <option value="CANCELLED">Da huy</option>
                    </select>
                  </div>
                </div>

                {filteredOrders.length ? (
                  <div className="owner-crm-table-wrap">
                    <table className="owner-crm-table">
                      <thead>
                        <tr>
                          <th>Ma</th>
                          <th>Khach</th>
                          <th>Trang thai</th>
                          <th>Tong</th>
                          <th>Thoi gian</th>
                          <th>Cap nhat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => {
                          const current = normalizeStatus(order.orderStatus) || "PENDING";
                          const selected = orderDraftStatus[order.id] ?? current;
                          return (
                            <tr key={order.id}>
                              <td className="owner-crm-order-code">#{order.id}</td>
                              <td>
                                <strong>{order.customerUsername}</strong>
                              </td>
                              <td>{toStatusLabel(order.orderStatus)}</td>
                              <td>{moneyFormatter.format(order.totalAmount)}</td>
                              <td>{dateTimeFormatter.format(new Date(order.createdAt))}</td>
                              <td>
                                <div className="owner-crm-inline-actions">
                                  <select
                                    className="owner-crm-inline-select"
                                    value={selected}
                                    onChange={(e) =>
                                      setOrderDraftStatus((p) => ({ ...p, [order.id]: e.target.value }))
                                    }
                                  >
                                    {(
                                      ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "COMPLETED", "CANCELLED"] as const
                                    ).map(
                                      (s) => (
                                        <option key={s} value={s}>
                                          {toStatusLabel(s)}
                                        </option>
                                      )
                                    )}
                                  </select>
                                  <button
                                    type="button"
                                    className="role-admin-button"
                                    disabled={updatingOrderId === order.id}
                                    onClick={() => void handleStatusUpdate(order.id)}
                                  >
                                    {updatingOrderId === order.id ? "..." : "Luu"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="owner-crm-empty">Không có đơn phù hợp.</p>
                )}
              </section>

              <section className="owner-crm-panel">
                <div className="owner-crm-panel-head">
                  <h2>Tồn kho thấp</h2>
                </div>
                {lowStock.length ? (
                  <ul>
                    {lowStock.slice(0, 15).map((p) => {
                      const draft = stockQtyDraft[p.id] ?? String(p.quantity);
                      return (
                        <li key={p.id} style={{ marginBottom: "0.5rem" }}>
                          <span>
                            <strong>{p.name}</strong> — hiện tại: {p.quantity}
                          </span>
                          <div className="owner-crm-inline-actions">
                            <input
                              type="number"
                              min={0}
                              className="owner-crm-inline-select"
                              style={{ width: "5rem" }}
                              value={draft}
                              onChange={(e) => setStockQtyDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="role-admin-button"
                              disabled={updatingProductId === p.id}
                              onClick={() => void handleStockUpdate(p.id)}
                            >
                              {updatingProductId === p.id ? "..." : "Lưu SL"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="owner-crm-empty">Không có cảnh báo tồn kho.</p>
                )}
              </section>

              <section className="owner-crm-panel">
                <div className="owner-crm-panel-head">
                  <h2>Canh bao du lieu</h2>
                </div>
                {dataIssues.length ? (
                  <ul>
                    {dataIssues.slice(0, 15).map((issue, i) => (
                      <li key={`${issue.code}-${issue.referenceId ?? i}`}>
                        [{issue.code}] {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="owner-crm-empty">Khong phat hien loi nghiem trong.</p>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
