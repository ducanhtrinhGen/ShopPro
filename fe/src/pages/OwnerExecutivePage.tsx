import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getOwnerOverview } from "../api/ownerReports";
import { useAuth } from "../auth/AuthContext";
import { isOwnerUser } from "../auth/roleUtils";
import type { OwnerOverview, OwnerRecentOrder } from "../types";

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short"
});

const STATUS_OPTIONS = ["ALL", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "COMPLETED", "CANCELLED"] as const;

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toUpperCase();
}

function toStatusLabel(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "PENDING") {
    return "Chờ xử lý";
  }
  if (normalized === "PROCESSING") {
    return "Đang xử lý";
  }
  if (normalized === "SHIPPING") {
    return "Đang giao";
  }
  if (normalized === "COMPLETED" || normalized === "DELIVERED") {
    return "Hoàn tất";
  }
  if (normalized === "CANCELLED") {
    return "Đã hủy";
  }
  if (normalized === "CONFIRMED") {
    return "Đã xác nhận";
  }
  return status || "Không rõ";
}

function toStatusClass(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "PENDING" || normalized === "PROCESSING") {
    return "is-pending";
  }
  if (normalized === "SHIPPING" || normalized === "CONFIRMED") {
    return "is-progress";
  }
  if (normalized === "COMPLETED" || normalized === "DELIVERED") {
    return "is-done";
  }
  if (normalized === "CANCELLED" || normalized === "FAILED") {
    return "is-cancelled";
  }
  return "is-default";
}

function toOrderTag(order: OwnerRecentOrder) {
  const date = new Date(order.createdAt);
  const now = new Date();
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
    return "Tháng này";
  }
  return "Lưu trữ";
}

function toCustomerGroup(order: OwnerRecentOrder) {
  return order.totalAmount >= 12_000_000 ? "Doanh nghiệp" : "Khách lẻ";
}

function toSalesChannel(index: number) {
  if (index % 3 === 0) {
    return "Trực tiếp";
  }
  if (index % 3 === 1) {
    return "Cộng tác viên";
  }
  return "Tiếp thị";
}

export function OwnerExecutivePage() {
  const { user } = useAuth();
  const isOwner = isOwnerUser(user);

  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");

  useEffect(() => {
    if (!isOwner) {
      setOverview(null);
      setIsLoadingOverview(false);
      return;
    }

    let active = true;
    setIsLoadingOverview(true);

    const loadOverview = async () => {
      try {
        const data = await getOwnerOverview();
        if (!active) {
          return;
        }
        setOverview(data);
      } catch {
        if (!active) {
          return;
        }
        setOverview(null);
      } finally {
        if (active) {
          setIsLoadingOverview(false);
        }
      }
    };

    void loadOverview();

    return () => {
      active = false;
    };
  }, [isOwner]);

  const recentOrders = overview?.recentOrders ?? [];

  const filteredOrders = useMemo(() => {
    if (!isOwner) {
      return [];
    }

    const normalizedKeyword = keyword.trim().toLowerCase();

    return recentOrders.filter((order) => {
      const matchesKeyword =
        !normalizedKeyword ||
        String(order.id).includes(normalizedKeyword) ||
        order.customerUsername.toLowerCase().includes(normalizedKeyword);

      if (!matchesKeyword) {
        return false;
      }

      if (statusFilter === "ALL") {
        return true;
      }

      return normalizeStatus(order.status) === statusFilter;
    });
  }, [isOwner, keyword, recentOrders, statusFilter]);

  const sidebarPlaceholder = "Tìm theo mã đơn / khách hàng...";

  return (
    <section className="owner-crm-page">
      <div className="owner-crm-shell">
        <aside className="owner-crm-sidebar">
          <div className="owner-crm-brand">
            <span>SP</span>
            <strong>ShopPro Owner</strong>
          </div>

          <label className="owner-crm-search">
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={sidebarPlaceholder}
              disabled={!isOwner}
            />
          </label>

          <div className="owner-crm-nav-group">
            <p>ĐIỀU HƯỚNG</p>
            <button type="button" className="active">
              Executive / Reports
            </button>
          </div>

          <div className="owner-crm-sidebar-actions">
            <Link to="/products">Mở trang sản phẩm</Link>
            <Link to="/admin">Quản trị (Admin)</Link>
            <Link to="/staff">Vận hành (Staff)</Link>
          </div>
        </aside>

        <div className="owner-crm-main">
          <header className="owner-crm-header">
            <div>
              <p className="owner-crm-kicker">
                BẢNG ĐIỀU HÀNH OWNER
              </p>
              <h1>
                Trung tâm điều hành chủ shop
              </h1>
              <p>
                Owner tập trung báo cáo cấp cao và kiểm soát tài khoản quản trị. Admin/Staff xử lý vận hành & catalog ở khu vực riêng.
              </p>
            </div>

            <div className="owner-crm-header-actions">
              <Link to="/admin">Đi tới Admin</Link>
              <Link to="/products">Mở trang sản phẩm</Link>
            </div>
          </header>

          {!isOwner ? <p className="owner-crm-empty">Chỉ Owner mới xem được trang này.</p> : null}

          {isOwner ? (
            <>
              <section className="owner-crm-kpi-grid">
                <article>
                  <span>Tổng đơn</span>
                  <strong>{overview?.totalOrders ?? 0}</strong>
                </article>
                <article>
                  <span>Chờ xử lý</span>
                  <strong>{overview?.pendingOrders ?? 0}</strong>
                </article>
                <article>
                  <span>Hoàn tất</span>
                  <strong>{overview?.completedOrders ?? 0}</strong>
                </article>
                <article>
                  <span>Doanh thu</span>
                  <strong>{moneyFormatter.format(overview?.totalRevenue ?? 0)}</strong>
                </article>
              </section>

              <section className="owner-crm-kpi-grid">
                <article>
                  <span>Lợi nhuận ước tính</span>
                  <strong>{moneyFormatter.format(overview?.estimatedProfit ?? 0)}</strong>
                </article>
                <article>
                  <span>Giá trị TB/đơn</span>
                  <strong>{moneyFormatter.format(overview?.averageOrderValue ?? 0)}</strong>
                </article>
                <article>
                  <span>Quản trị hoạt động</span>
                  <strong>{overview?.activeManagementAccounts ?? 0}</strong>
                </article>
                <article>
                  <span>Quản trị bị khóa</span>
                  <strong>{overview?.lockedManagementAccounts ?? 0}</strong>
                </article>
              </section>

              <section className="owner-crm-panel">
                <div className="owner-crm-panel-head">
                  <h2>Đơn gần đây ({filteredOrders.length})</h2>
                  <div className="owner-crm-toolbar">
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number])}>
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="PENDING">Chờ xử lý</option>
                      <option value="CONFIRMED">Đã xác nhận</option>
                      <option value="PROCESSING">Đang xử lý</option>
                      <option value="SHIPPING">Đang giao</option>
                      <option value="DELIVERED">Đã giao</option>
                      <option value="COMPLETED">Hoàn tất</option>
                      <option value="CANCELLED">Đã hủy</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setKeyword("");
                        setStatusFilter("ALL");
                      }}
                    >
                      Đặt lại
                    </button>
                  </div>
                </div>

                {isLoadingOverview ? (
                  <div className="loading-block">
                    <div className="loading-ring" />
                    <p>Đang tải dữ liệu điều hành...</p>
                  </div>
                ) : null}

                {!isLoadingOverview && !filteredOrders.length ? (
                  <p className="owner-crm-empty">Không có đơn phù hợp.</p>
                ) : null}

                {!isLoadingOverview && filteredOrders.length ? (
                  <div className="owner-crm-table-wrap">
                    <table className="owner-crm-table">
                      <thead>
                        <tr>
                          <th>Mã đơn</th>
                          <th>Khách</th>
                          <th>Thẻ</th>
                          <th>Trạng thái</th>
                          <th>Kênh</th>
                          <th>Nhóm</th>
                          <th>Tổng</th>
                          <th>Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order, index) => (
                          <tr key={order.id}>
                            <td className="owner-crm-order-code">OD{String(order.id).padStart(5, "0")}</td>
                            <td>
                              <strong>{order.customerUsername}</strong>
                            </td>
                            <td>
                              <span className="owner-crm-chip">{toOrderTag(order)}</span>
                            </td>
                            <td>
                              <span className={`owner-crm-status ${toStatusClass(order.status)}`}>{toStatusLabel(order.status)}</span>
                            </td>
                            <td>{toSalesChannel(index)}</td>
                            <td>{toCustomerGroup(order)}</td>
                            <td>{moneyFormatter.format(order.totalAmount)}</td>
                            <td>{dateTimeFormatter.format(new Date(order.createdAt))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
