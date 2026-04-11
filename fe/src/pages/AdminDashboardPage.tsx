import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminDataIssues, getAdminLowStockProducts, getAdminOrders, updateAdminOrderStatus } from "../api/adminOperations";
import {
  createManagementUser,
  deleteManagementUser,
  getAdminUsers,
  type ManagementRole,
  updateAdminUserLockState,
  updateAdminUserRole
} from "../api/adminUsers";
import { getCategories } from "../api/catalog";
import { apiRequest, ApiRequestError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { isOwnerUser } from "../auth/roleUtils";
import type {
  AdminDataIssue,
  AdminOrderItem,
  AdminProductOpsItem,
  AdminUser,
  AdminUserRole,
  Category,
  ProductPageResponse
} from "../types";

type AdminView = "overview" | "categories" | "orders" | "users";
type OrderStatusFilter = "ALL" | "PENDING" | "PROCESSING" | "SHIPPING" | "COMPLETED" | "CANCELLED";

type DashboardStats = {
  productTotal: number;
  categoryTotal: number;
  categories: Category[];
};

const ORDER_STATUS_OPTIONS: OrderStatusFilter[] = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "SHIPPING",
  "COMPLETED",
  "CANCELLED"
];

const MANAGEMENT_ROLE_OPTIONS: ManagementRole[] = ["admin", "staff", "user"];

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short"
});

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toUpperCase();
}

function toStatusLabel(status: string | null | undefined) {
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

function toStatusClass(status: string | null | undefined) {
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

function toRoleLabel(role: AdminUserRole) {
  if (role === "owner") {
    return "Owner";
  }
  if (role === "admin") {
    return "Admin";
  }
  if (role === "staff") {
    return "Staff";
  }
  return "User";
}

function toRoleBadgeClass(role: AdminUserRole) {
  if (role === "owner") {
    return "is-owner";
  }
  if (role === "admin") {
    return "is-admin";
  }
  if (role === "staff") {
    return "is-staff";
  }
  return "is-user";
}

function toOrderTag(index: number) {
  if (index % 3 === 0) {
    return "Tháng này";
  }
  if (index % 3 === 1) {
    return "Lưu trữ";
  }
  return "Đã xử lý";
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

function roleFromSelect(role: string): ManagementRole {
  if (role === "admin" || role === "staff" || role === "user") {
    return role;
  }
  return "user";
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const isOwner = isOwnerUser(user);

  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    productTotal: 0,
    categoryTotal: 0,
    categories: []
  });

  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [orderDraftStatus, setOrderDraftStatus] = useState<Record<number, string>>({});
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  const [lowStock, setLowStock] = useState<AdminProductOpsItem[]>([]);
  const [dataIssues, setDataIssues] = useState<AdminDataIssue[]>([]);
  const [isLoadingOps, setIsLoadingOps] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<ManagementRole>("staff");
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [categories, productPage] = await Promise.all([
          getCategories({ force: true }),
          apiRequest<ProductPageResponse>("/api/products?sort=default&page=0")
        ]);

        setStats({
          productTotal: productPage.totalItems,
          categoryTotal: categories.length,
          categories: categories.slice(0, 20)
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

    setSelectedCategoryId((current) => {
      if (current && stats.categories.some((item) => item.id === current)) {
        return current;
      }
      return stats.categories[0].id;
    });
  }, [stats.categories]);

  useEffect(() => {
    if (!isOwner && activeView === "users") {
      setActiveView("overview");
    }
  }, [activeView, isOwner]);

  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      setIsLoadingOrders(true);
      setOrderError(null);

      try {
        const data = await getAdminOrders();
        if (!active) {
          return;
        }
        setOrders(data);
      } catch (error) {
        if (!active) {
          return;
        }
        setOrders([]);
        setOrderError(toErrorMessage(error, "Không thể tải danh sách đơn hàng."));
      } finally {
        if (active) {
          setIsLoadingOrders(false);
        }
      }
    };

    void loadOrders();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadOps = async () => {
      setIsLoadingOps(true);
      setOpsError(null);

      try {
        const [lowStockData, dataIssueList] = await Promise.all([getAdminLowStockProducts(7), getAdminDataIssues()]);
        if (!active) {
          return;
        }
        setLowStock(lowStockData);
        setDataIssues(dataIssueList);
      } catch (error) {
        if (!active) {
          return;
        }
        setLowStock([]);
        setDataIssues([]);
        setOpsError(toErrorMessage(error, "Không thể tải dữ liệu tồn kho và kiểm tra dữ liệu."));
      } finally {
        if (active) {
          setIsLoadingOps(false);
        }
      }
    };

    void loadOps();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isOwner) {
      setUsers([]);
      setIsLoadingUsers(false);
      setUserError(null);
      return;
    }

    let active = true;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      setUserError(null);

      try {
        const data = await getAdminUsers();
        if (!active) {
          return;
        }
        setUsers(data);
      } catch (error) {
        if (!active) {
          return;
        }
        setUsers([]);
        setUserError(toErrorMessage(error, "Không thể tải danh sách tài khoản."));
      } finally {
        if (active) {
          setIsLoadingUsers(false);
        }
      }
    };

    void loadUsers();

    return () => {
      active = false;
    };
  }, [isOwner]);

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesKeyword =
        !normalizedKeyword ||
        String(order.id).includes(normalizedKeyword) ||
        order.customerUsername.toLowerCase().includes(normalizedKeyword) ||
        (order.receiverName ?? "").toLowerCase().includes(normalizedKeyword);

      if (!matchesKeyword) {
        return false;
      }

      if (statusFilter === "ALL") {
        return true;
      }

      return normalizeStatus(order.orderStatus) === statusFilter;
    });
  }, [orders, keyword, statusFilter]);

  const filteredCategories = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return stats.categories;
    }

    return stats.categories.filter((category) => {
      return category.name.toLowerCase().includes(normalizedKeyword) || String(category.id).includes(normalizedKeyword);
    });
  }, [keyword, stats.categories]);

  const selectedCategory = useMemo(
    () => stats.categories.find((category) => category.id === selectedCategoryId) ?? null,
    [selectedCategoryId, stats.categories]
  );

  const pendingOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = normalizeStatus(order.orderStatus);
      return status === "PENDING" || status === "PROCESSING";
    }).length;
  }, [orders]);

  const customerCount = useMemo(() => {
    const usernames = new Set(orders.map((order) => order.customerUsername));
    return usernames.size;
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => sum + order.totalAmount, 0);
  }, [orders]);

  const ownerManagedUsers = useMemo(() => users.filter((item) => item.role !== "owner"), [users]);
  const lockedUserCount = useMemo(() => users.filter((item) => item.locked).length, [users]);
  const adminCount = useMemo(() => users.filter((item) => item.role === "admin").length, [users]);
  const staffCount = useMemo(() => users.filter((item) => item.role === "staff").length, [users]);

  const sidebarPlaceholder =
    activeView === "categories"
      ? "Tìm theo danh mục / mã danh mục..."
      : activeView === "orders"
        ? "Tìm theo mã đơn / khách hàng..."
        : "Nhập từ khóa để lọc dữ liệu...";

  const handleOrderStatusUpdate = async (orderId: number) => {
    const targetStatus = (orderDraftStatus[orderId] ?? "").trim().toUpperCase();
    if (!targetStatus) {
      setOrderMessage("Vui lòng chọn trạng thái hợp lệ trước khi cập nhật.");
      return;
    }

    setUpdatingOrderId(orderId);
    setOrderMessage(null);

    try {
      const updatedOrder = await updateAdminOrderStatus(orderId, targetStatus);
      setOrders((previous) =>
        previous.map((item) => (item.id === orderId ? { ...item, orderStatus: updatedOrder.orderStatus } : item))
      );
      setOrderMessage(`Đã cập nhật trạng thái đơn #${orderId} thành ${toStatusLabel(targetStatus)}.`);
    } catch (error) {
      setOrderMessage(toErrorMessage(error, `Không thể cập nhật trạng thái đơn #${orderId}.`));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCreateUser = async () => {
    if (!isOwner) {
      return;
    }

    const username = newUsername.trim();
    const password = newPassword.trim();

    if (!username || !password) {
      setUserMessage("Vui lòng nhập đủ tài khoản và mật khẩu.");
      return;
    }

    setCreatingUser(true);
    setUserMessage(null);

    try {
      const created = await createManagementUser(username, password, newRole);
      setUsers((previous) => [created, ...previous]);
      setNewUsername("");
      setNewPassword("");
      setNewRole("staff");
      setUserMessage(`Đã tạo tài khoản ${created.username} (${toRoleLabel(created.role)}).`);
    } catch (error) {
      setUserMessage(toErrorMessage(error, "Không thể tạo tài khoản mới."));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleUpdate = async (target: AdminUser, role: ManagementRole) => {
    if (!isOwner || target.role === "owner") {
      return;
    }

    setUserMessage(null);
    try {
      const updated = await updateAdminUserRole(target.id, role);
      setUsers((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      setUserMessage(`Đã đổi vai trò của ${updated.username} thành ${toRoleLabel(updated.role)}.`);
    } catch (error) {
      setUserMessage(toErrorMessage(error, `Không thể đổi vai trò cho ${target.username}.`));
    }
  };

  const handleLockToggle = async (target: AdminUser) => {
    if (!isOwner || target.role === "owner") {
      return;
    }

    setUserMessage(null);
    try {
      const updated = await updateAdminUserLockState(target.id, !target.locked);
      setUsers((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      setUserMessage(
        updated.locked ? `Đã khóa tài khoản ${updated.username}.` : `Đã mở khóa tài khoản ${updated.username}.`
      );
    } catch (error) {
      setUserMessage(toErrorMessage(error, `Không thể cập nhật trạng thái khóa cho ${target.username}.`));
    }
  };

  const handleDeleteUser = async (target: AdminUser) => {
    if (!isOwner || target.role === "owner" || target.username === user?.username) {
      return;
    }

    if (!window.confirm(`Bạn chắc chắn muốn xóa tài khoản ${target.username}?`)) {
      return;
    }

    setUserMessage(null);
    try {
      await deleteManagementUser(target.id);
      setUsers((previous) => previous.filter((item) => item.id !== target.id));
      setUserMessage(`Đã xóa tài khoản ${target.username}.`);
    } catch (error) {
      setUserMessage(toErrorMessage(error, `Không thể xóa tài khoản ${target.username}.`));
    }
  };

  const renderOverview = () => {
    return (
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
            <strong>{orders.length}</strong>
          </article>
          <article>
            <span>Đơn cần xử lý</span>
            <strong>{pendingOrders}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Nhiệm vụ quản trị</h2>
            <div className="owner-crm-toolbar">
              <Link to="/products">Quản lý sản phẩm</Link>
              <Link to="/owner-staff">Sang bảng điều khiển Staff</Link>
            </div>
          </div>

          <div className="owner-crm-admin-dual">
            <article className="owner-crm-admin-block">
              <h3>Phạm vi Admin hằng ngày</h3>
              <ul>
                <li>CRUD sản phẩm, danh mục, thương hiệu.</li>
                <li>Xem và cập nhật trạng thái đơn hàng.</li>
                <li>Kiểm tra tồn kho thấp và lỗi dữ liệu vận hành.</li>
                <li>Quản lý nội dung website theo quy trình.</li>
              </ul>
            </article>

            <article className="owner-crm-admin-block">
              <h3>Quyền bổ sung của Owner</h3>
              <ul>
                <li>Toàn quyền tạo, sửa, khóa, xóa admin/staff/user.</li>
                <li>Xem toàn bộ dữ liệu hệ thống và báo cáo cao nhất.</li>
                <li>Duyệt thay đổi quan trọng và cấu hình website.</li>
                <li>Quyết định chiến lược khuyến mãi và giá bán.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Tồn kho và chất lượng dữ liệu</h2>
          </div>

          {isLoadingOps ? (
            <p className="owner-crm-empty">Đang tải dữ liệu tồn kho và lỗi dữ liệu...</p>
          ) : null}

          {opsError ? <p className="owner-crm-empty">{opsError}</p> : null}

          {!isLoadingOps && !opsError ? (
            <div className="owner-crm-admin-dual">
              <article className="owner-crm-admin-block">
                <h3>Cảnh báo tồn kho thấp</h3>
                {lowStock.length ? (
                  <ul>
                    {lowStock.slice(0, 8).map((item) => (
                      <li key={item.id}>
                        {item.name} (SL: {item.quantity})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Không có sản phẩm nào dưới ngưỡng tồn kho.</p>
                )}
              </article>

              <article className="owner-crm-admin-block">
                <h3>Lỗi dữ liệu cần xử lý</h3>
                {dataIssues.length ? (
                  <ul>
                    {dataIssues.slice(0, 8).map((issue, index) => (
                      <li key={`${issue.code}-${issue.referenceId ?? "none"}-${index}`}>
                        [{issue.code}] {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Không phát hiện lỗi dữ liệu nghiêm trọng.</p>
                )}
              </article>
            </div>
          ) : null}
        </section>
      </>
    );
  };

  const renderCategories = () => {
    return (
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
                            <Link to="/products">Quản lý</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="owner-crm-empty">Không tìm thấy danh mục phù hợp với từ khóa hiện tại.</p>
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
            <p className="owner-crm-empty">Chọn một danh mục trong bảng bên trên để xem chi tiết.</p>
          )}
        </section>
      </>
    );
  };

  const renderOrders = () => {
    return (
      <>
        <section className="owner-crm-kpi-grid">
          <article>
            <span>Tổng đơn hàng</span>
            <strong>{orders.length}</strong>
          </article>
          <article>
            <span>Đơn đang lọc</span>
            <strong>{filteredOrders.length}</strong>
          </article>
          <article>
            <span>Đơn chờ xử lý</span>
            <strong>{pendingOrders}</strong>
          </article>
          <article>
            <span>Doanh thu tạm tính</span>
            <strong>{moneyFormatter.format(totalRevenue)}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Quản lý đơn hàng</h2>
            <div className="owner-crm-toolbar">
              <input
                type="text"
                placeholder="Tìm theo mã đơn / khách hàng..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OrderStatusFilter)}>
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
              >
                Đặt lại
              </button>
            </div>
          </div>

          {orderMessage ? <p className="owner-crm-empty">{orderMessage}</p> : null}
          {orderError ? <p className="owner-crm-empty">{orderError}</p> : null}
          {isLoadingOrders ? <p className="owner-crm-empty">Đang tải danh sách đơn hàng...</p> : null}

          {!isLoadingOrders && !orderError && !filteredOrders.length ? (
            <p className="owner-crm-empty">Không có đơn hàng phù hợp với điều kiện lọc hiện tại.</p>
          ) : null}

          {!isLoadingOrders && !orderError && filteredOrders.length ? (
            <div className="owner-crm-table-wrap">
              <table className="owner-crm-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Người nhận</th>
                    <th>Thẻ</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th>Tổng tiền</th>
                    <th>Thời gian</th>
                    <th>Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => {
                    const currentStatus = normalizeStatus(order.orderStatus) || "PENDING";
                    const selectedStatus = orderDraftStatus[order.id] ?? currentStatus;
                    return (
                      <tr key={order.id}>
                        <td className="owner-crm-order-code">OD{String(order.id).padStart(5, "0")}</td>
                        <td>
                          <strong>{order.customerUsername}</strong>
                        </td>
                        <td>{order.receiverName || "Chưa cập nhật"}</td>
                        <td>
                          <span className="owner-crm-chip">{toOrderTag(index)}</span>
                        </td>
                        <td>{order.paymentMethod || "Không rõ"}</td>
                        <td>
                          <span className={`owner-crm-status ${toStatusClass(order.orderStatus)}`}>
                            {toStatusLabel(order.orderStatus)}
                          </span>
                        </td>
                        <td>{moneyFormatter.format(order.totalAmount)}</td>
                        <td>{dateTimeFormatter.format(new Date(order.createdAt))}</td>
                        <td>
                          <div className="owner-crm-inline-actions">
                            <select
                              className="owner-crm-inline-select"
                              value={selectedStatus}
                              onChange={(event) =>
                                setOrderDraftStatus((previous) => ({
                                  ...previous,
                                  [order.id]: event.target.value
                                }))
                              }
                            >
                              {ORDER_STATUS_OPTIONS.filter((option) => option !== "ALL").map((option) => (
                                <option key={option} value={option}>
                                  {toStatusLabel(option)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="role-admin-button"
                              disabled={updatingOrderId === order.id}
                              onClick={() => void handleOrderStatusUpdate(order.id)}
                            >
                              {updatingOrderId === order.id ? "Đang cập nhật..." : "Cập nhật"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </>
    );
  };

  const renderUsers = () => {
    if (!isOwner) {
      return (
        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Quản lý người dùng</h2>
          </div>
          <p className="owner-crm-empty">Tài khoản Admin không có quyền tạo, xóa, đổi vai trò hoặc khóa/mở tài khoản.</p>
        </section>
      );
    }

    return (
      <>
        <section className="owner-crm-kpi-grid">
          <article>
            <span>Tổng tài khoản</span>
            <strong>{users.length}</strong>
          </article>
          <article>
            <span>Số Admin</span>
            <strong>{adminCount}</strong>
          </article>
          <article>
            <span>Số Staff</span>
            <strong>{staffCount}</strong>
          </article>
          <article>
            <span>Đang khóa</span>
            <strong>{lockedUserCount}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Tạo tài khoản vận hành</h2>
            <div className="owner-crm-toolbar">
              <button type="button" onClick={() => setNewRole("staff")}>
                Chọn Staff
              </button>
              <button type="button" onClick={() => setNewRole("admin")}>
                Chọn Admin
              </button>
            </div>
          </div>

          {userMessage ? <p className="owner-crm-empty">{userMessage}</p> : null}
          {userError ? <p className="owner-crm-empty">{userError}</p> : null}

          <div className="owner-crm-toolbar">
            <input
              type="text"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              placeholder="Tên đăng nhập"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Mật khẩu"
            />
            <select value={newRole} onChange={(event) => setNewRole(roleFromSelect(event.target.value))}>
              {MANAGEMENT_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {toRoleLabel(role)}
                </option>
              ))}
            </select>
            <button type="button" disabled={creatingUser} onClick={() => void handleCreateUser()}>
              {creatingUser ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
          </div>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Danh sách tài khoản ({ownerManagedUsers.length})</h2>
          </div>

          {isLoadingUsers ? <p className="owner-crm-empty">Đang tải danh sách tài khoản...</p> : null}

          {!isLoadingUsers && !ownerManagedUsers.length ? (
            <p className="owner-crm-empty">Chưa có tài khoản vận hành nào để hiển thị.</p>
          ) : null}

          {!isLoadingUsers && ownerManagedUsers.length ? (
            <div className="owner-crm-table-wrap">
              <table className="owner-crm-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tài khoản</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerManagedUsers.map((item) => (
                    <tr key={item.id}>
                      <td className="owner-crm-order-code">U{String(item.id).padStart(4, "0")}</td>
                      <td>
                        <strong>{item.username}</strong>
                      </td>
                      <td>
                        <span className={`role-admin-badge ${toRoleBadgeClass(item.role)}`}>{toRoleLabel(item.role)}</span>
                      </td>
                      <td>
                        <span className={`role-admin-badge ${item.locked ? "is-locked" : "is-active"}`}>
                          {item.locked ? "Đã khóa" : "Đang hoạt động"}
                        </span>
                      </td>
                      <td>
                        <div className="owner-crm-inline-actions">
                          <select
                            className="owner-crm-inline-select"
                            value={item.role}
                            onChange={(event) => void handleRoleUpdate(item, roleFromSelect(event.target.value))}
                          >
                            {MANAGEMENT_ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>
                                {toRoleLabel(role)}
                              </option>
                            ))}
                          </select>
                          <button type="button" className="role-admin-button" onClick={() => void handleLockToggle(item)}>
                            {item.locked ? "Mở khóa" : "Khóa"}
                          </button>
                          <button
                            type="button"
                            className="role-admin-button role-admin-button-danger"
                            onClick={() => void handleDeleteUser(item)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </>
    );
  };

  return (
    <section className="owner-crm-page">
      <div className="owner-crm-shell">
        <aside className="owner-crm-sidebar">
          <div className="owner-crm-brand">
            <span>SP</span>
            <strong>{isOwner ? "ShopPro Owner" : "ShopPro Admin"}</strong>
          </div>

          <label className="owner-crm-search">
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={sidebarPlaceholder}
            />
          </label>

          <div className="owner-crm-nav-group">
            <p>ĐIỀU HƯỚNG</p>
            <button type="button" className={activeView === "overview" ? "active" : ""} onClick={() => setActiveView("overview")}>
              Tổng quan
            </button>
            <button
              type="button"
              className={activeView === "categories" ? "active" : ""}
              onClick={() => setActiveView("categories")}
            >
              Danh mục
            </button>
            <button type="button" className={activeView === "orders" ? "active" : ""} onClick={() => setActiveView("orders")}>
              Đơn hàng
            </button>
            {isOwner ? (
              <button type="button" className={activeView === "users" ? "active" : ""} onClick={() => setActiveView("users")}>
                Người dùng
              </button>
            ) : null}
          </div>

          <div className="owner-crm-sidebar-actions">
            <Link to="/products">Mở trang sản phẩm</Link>
            <Link to="/owner-staff">Bảng điều khiển Staff</Link>
          </div>
        </aside>

        <div className="owner-crm-main">
          <header className="owner-crm-header">
            <div>
              <p className="owner-crm-kicker">{isOwner ? "BẢNG ĐIỀU HÀNH OWNER/ADMIN" : "BẢNG ĐIỀU HÀNH ADMIN"}</p>
              <h1>
                {activeView === "overview"
                  ? "Trung tâm điều hành quản trị"
                  : activeView === "categories"
                    ? "Quản lý danh mục sản phẩm"
                    : activeView === "orders"
                      ? "Quản lý đơn hàng"
                      : "Quản lý người dùng hệ thống"}
              </h1>
              <p>
                {activeView === "overview"
                  ? "Theo dõi KPI, đơn hàng, tồn kho và dữ liệu vận hành trong cùng bảng điều khiển."
                  : activeView === "categories"
                    ? "Trang danh mục dùng cùng bố cục với Owner để dễ theo dõi và thao tác."
                    : activeView === "orders"
                      ? "Admin và Owner đều có thể xem và cập nhật trạng thái đơn hàng."
                      : "Chỉ Owner có quyền tạo, đổi vai trò, khóa/mở hoặc xóa tài khoản quản trị."}
              </p>
            </div>

            <div className="owner-crm-header-actions">
              <Link to="/products">Quản lý sản phẩm</Link>
              <Link to="/owner-staff">Sang bảng điều khiển Staff</Link>
            </div>
          </header>

          {activeView === "overview" ? renderOverview() : null}
          {activeView === "categories" ? renderCategories() : null}
          {activeView === "orders" ? renderOrders() : null}
          {activeView === "users" ? renderUsers() : null}

          {activeView !== "users" ? (
            <section className="owner-crm-panel">
              <div className="owner-crm-panel-head">
                <h2>Tóm tắt nhanh</h2>
              </div>
              <div className="owner-crm-kpi-grid">
                <article>
                  <span>Khách hàng gần đây</span>
                  <strong>{customerCount}</strong>
                </article>
                <article>
                  <span>Sản phẩm tồn thấp</span>
                  <strong>{lowStock.length}</strong>
                </article>
                <article>
                  <span>Lỗi dữ liệu</span>
                  <strong>{dataIssues.length}</strong>
                </article>
                <article>
                  <span>Người dùng quản trị</span>
                  <strong>{isOwner ? users.length : "Owner only"}</strong>
                </article>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
