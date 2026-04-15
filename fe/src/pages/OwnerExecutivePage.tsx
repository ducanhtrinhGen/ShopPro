import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../api/catalog";
import { apiRequest } from "../api/client";
import { getOwnerOverview } from "../api/ownerReports";
import { useAuth } from "../auth/AuthContext";
import { isOwnerUser } from "../auth/roleUtils";
import type { Category, OwnerOverview, OwnerRecentOrder, ProductPageResponse } from "../types";

type DashboardStats = {
  productTotal: number;
  categoryTotal: number;
  categories: Category[];
};

type DashboardView = "overview" | "categories";

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short"
});

const STATUS_OPTIONS = ["ALL", "PENDING", "PROCESSING", "SHIPPING", "COMPLETED", "CANCELLED"] as const;

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

  const [stats, setStats] = useState<DashboardStats>({
    productTotal: 0,
    categoryTotal: 0,
    categories: []
  });
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");
  const [activeView, setActiveView] = useState<DashboardView>(isOwner ? "overview" : "categories");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [categories, productPage] = await Promise.all([
          getCategories(),
          apiRequest<ProductPageResponse>("/api/products?sort=default&page=0")
        ]);

        setStats({
          productTotal: productPage.totalItems,
          categoryTotal: categories.length,
          categories: categories.slice(0, 10)
        });
      } catch {
        setStats({
          productTotal: 0,
          categoryTotal: 0,
          categories: []
        });
      }
    };

    void loadStats();
  }, []);

  useEffect(() => {
    if (!stats.categories.length) {
      setSelectedCategoryId(null);
      return;
    }

    setSelectedCategoryId((previous) => {
      if (previous && stats.categories.some((category) => category.id === previous)) {
        return previous;
      }
      return stats.categories[0].id;
    });
  }, [stats.categories]);

  useEffect(() => {
    if (!isOwner) {
      setActiveView("categories");
    }
  }, [isOwner]);

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

  const filteredCategories = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return stats.categories;
    }

    return stats.categories.filter((category) => {
      return category.name.toLowerCase().includes(normalizedKeyword) || String(category.id).includes(normalizedKeyword);
    });
  }, [stats.categories, keyword]);

  const selectedCategory = useMemo(
    () => stats.categories.find((category) => category.id === selectedCategoryId) ?? null,
    [stats.categories, selectedCategoryId]
  );

  const sidebarPlaceholder =
    activeView === "overview" ? "Tìm theo mã đơn / khách hàng..." : "Tìm theo tên danh mục / mã danh mục...";

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
              disabled={activeView === "overview" && !isOwner}
            />
          </label>

          <div className="owner-crm-nav-group">
            <p>ĐIỀU HƯỚNG</p>
            <button type="button" className={activeView === "overview" ? "active" : ""} onClick={() => setActiveView("overview")}>
              Tổng quan
            </button>
            <button type="button" className={activeView === "categories" ? "active" : ""} onClick={() => setActiveView("categories")}>
              Danh mục
            </button>
          </div>

          <div className="owner-crm-sidebar-actions">
            <Link to="/products">Mở trang sản phẩm</Link>
            <Link to={isOwner ? "/admin" : "/customer"}>{isOwner ? "Quản lý tài khoản" : "Trang khách hàng"}</Link>
          </div>
        </aside>

        <div className="owner-crm-main">
          <header className="owner-crm-header">
            <div>
              <p className="owner-crm-kicker">
                {activeView === "overview" ? (isOwner ? "BẢNG ĐIỀU HÀNH OWNER" : "KHU VẬN HÀNH STAFF") : "TRUNG TÂM DANH MỤC"}
              </p>
              <h1>
                {activeView === "overview"
                  ? isOwner
                    ? "Trung tâm điều hành chủ shop"
                    : "Bảng công việc nhân viên"
                  : "Thông tin danh mục sản phẩm"}
              </h1>
              <p>
                {activeView === "overview"
                  ? isOwner
                    ? "Bấm vào mục Tổng quan hoặc Danh mục bên trái để đổi toàn bộ dữ liệu hiển thị ở khung này."
                    : "Tài khoản staff chỉ xem dữ liệu vận hành cơ bản, không có báo cáo doanh thu của owner."
                  : "Bạn đang xem đầy đủ dữ liệu danh mục ở panel bên phải. Chọn từng danh mục bên trái để nổi bật thông tin chi tiết."}
              </p>
            </div>

            <div className="owner-crm-header-actions">
              <Link to="/products">Quản lý sản phẩm</Link>
              <Link to={isOwner ? "/admin" : "/customer"}>{isOwner ? "Quản lý tài khoản" : "Khu khách hàng"}</Link>
            </div>
          </header>

          {activeView === "overview" ? (
            <>
              <section className="owner-crm-kpi-grid">
                <article>
                  <span>Tổng mặt hàng</span>
                  <strong>{stats.productTotal}</strong>
                </article>
                <article>
                  <span>Tổng danh mục</span>
                  <strong>{stats.categoryTotal}</strong>
                </article>
                <article>
                  <span>Tổng đơn hàng</span>
                  <strong>{overview?.totalOrders ?? 0}</strong>
                </article>
                <article>
                  <span>Doanh thu</span>
                  <strong>{moneyFormatter.format(overview?.totalRevenue ?? 0)}</strong>
                </article>
              </section>

              <section className="owner-crm-panel">
                <div className="owner-crm-panel-head">
                  <h2>{isOwner ? `Đơn hàng gần đây (${filteredOrders.length})` : "Dữ liệu vận hành"}</h2>
                  <div className="owner-crm-toolbar">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      placeholder="Tìm kiếm nhanh..."
                      disabled={!isOwner}
                    />
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number])}
                      disabled={!isOwner}
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="PENDING">Chờ xử lý</option>
                      <option value="PROCESSING">Đang xử lý</option>
                      <option value="SHIPPING">Đang giao</option>
                      <option value="COMPLETED">Hoàn tất</option>
                      <option value="CANCELLED">Đã hủy</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setKeyword("");
                        setStatusFilter("ALL");
                      }}
                      disabled={!isOwner}
                    >
                      Đặt lại
                    </button>
                  </div>
                </div>

                {!isOwner ? (
                  <p className="owner-crm-empty">Tài khoản staff không có quyền xem báo cáo doanh thu và danh sách đơn hàng của owner.</p>
                ) : null}

                {isOwner && isLoadingOverview ? (
                  <div className="loading-block">
                    <div className="loading-ring" />
                    <p>Đang tải dữ liệu điều hành...</p>
                  </div>
                ) : null}

                {isOwner && !isLoadingOverview && !filteredOrders.length ? (
                  <p className="owner-crm-empty">Không có đơn hàng phù hợp với bộ lọc hiện tại.</p>
                ) : null}

                {isOwner && !isLoadingOverview && filteredOrders.length ? (
                  <div className="owner-crm-table-wrap">
                    <table className="owner-crm-table">
                      <thead>
                        <tr>
                          <th>Mã đơn</th>
                          <th>Tên khách hàng</th>
                          <th>Thẻ</th>
                          <th>Trạng thái</th>
                          <th>Kênh bán hàng</th>
                          <th>Nhóm khách hàng</th>
                          <th>Tổng tiền</th>
                          <th>Cập nhật</th>
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
          ) : (
            <>
              <section className="owner-crm-kpi-grid">
                <article>
                  <span>Tổng danh mục</span>
                  <strong>{stats.categoryTotal}</strong>
                </article>
                <article>
                  <span>Danh mục đang lọc</span>
                  <strong>{filteredCategories.length}</strong>
                </article>
                <article>
                  <span>Danh mục đang chọn</span>
                  <strong>{selectedCategory ? selectedCategory.name : "Tất cả"}</strong>
                </article>
                <article>
                  <span>Tổng mặt hàng</span>
                  <strong>{stats.productTotal}</strong>
                </article>
              </section>

              <section className="owner-crm-panel">
                <div className="owner-crm-panel-head">
                  <h2>Danh mục hiện có ({filteredCategories.length})</h2>
                  <div className="owner-crm-toolbar">
                    <button type="button" onClick={() => setSelectedCategoryId(null)}>
                      Hiện tất cả danh mục
                    </button>
                  </div>
                </div>

                {filteredCategories.length ? (
                  <div className="owner-crm-table-wrap">
                    <table className="owner-crm-table">
                      <thead>
                        <tr>
                          <th>Mã danh mục</th>
                          <th>Tên danh mục</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCategories.map((category) => {
                          const isSelected = selectedCategoryId === category.id;
                          return (
                            <tr
                              key={category.id}
                              className={isSelected ? "is-selected is-clickable" : "is-clickable"}
                              onClick={() => setSelectedCategoryId(category.id)}
                            >
                              <td className="owner-crm-order-code">DM{String(category.id).padStart(3, "0")}</td>
                              <td>
                                <strong>{category.name}</strong>
                              </td>
                              <td>
                                <div className="owner-crm-category-links">
                                  <Link to={`/products?categoryId=${category.id}`}>Xem sản phẩm</Link>
                                  {isOwner ? <Link to="/admin">Quản lý</Link> : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="owner-crm-empty">Không có danh mục phù hợp với từ khóa hiện tại.</p>
                )}
              </section>

              <section className="owner-crm-panel">
                <div className="owner-crm-panel-head">
                  <h2>Chi tiết danh mục</h2>
                </div>

                {selectedCategory ? (
                  <div className="owner-crm-category-detail">
                    <p>
                      <strong>Mã danh mục:</strong> DM{String(selectedCategory.id).padStart(3, "0")}
                    </p>
                    <p>
                      <strong>Tên danh mục:</strong> {selectedCategory.name}
                    </p>
                    <div className="owner-crm-category-links">
                      <Link to={`/products?categoryId=${selectedCategory.id}`}>Mở trang sản phẩm theo danh mục</Link>
                      <Link to="/products">Mở toàn bộ sản phẩm</Link>
                    </div>
                  </div>
                ) : (
                  <p className="owner-crm-empty">Chọn một danh mục ở bảng bên trên để xem thông tin chi tiết.</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
