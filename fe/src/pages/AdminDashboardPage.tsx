import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createManagementUser,
  deleteManagementUser,
  getAdminUsers,
  type ManagementRole,
  updateAdminUserLockState,
  updateAdminUserRole
} from "../api/adminUsers";
import {
  getAdminDataIssues,
  getAdminLowStockProducts,
  getAdminOrders,
  updateAdminOrderStatus
} from "../api/adminOperations";
import { getCategories } from "../api/catalog";
import { ApiRequestError, apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { isOwnerUser } from "../auth/roleUtils";
import type {
  AdminDataIssue,
  AdminOrderItem,
  AdminProductOpsItem,
  AdminUser,
  Category,
  ProductPageResponse
} from "../types";

type DashboardStats = {
  productTotal: number;
  categoryTotal: number;
  featuredCategories: Category[];
};

const FALLBACK_ERROR_MESSAGE = "Khong the hoan tat yeu cau. Vui long thu lai.";
const ORDER_STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPING",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
  "REFUNDED"
] as const;
const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

function getNextRole(role: AdminUser["role"]): Exclude<AdminUser["role"], "owner"> {
  if (role === "user") {
    return "staff";
  }
  if (role === "staff") {
    return "admin";
  }
  return "user";
}

function getRoleLabel(role: AdminUser["role"]) {
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

export function AdminDashboardPage() {
  const { user } = useAuth();
  const canManageAccounts = isOwnerUser(user);

  const [stats, setStats] = useState<DashboardStats>({
    productTotal: 0,
    categoryTotal: 0,
    featuredCategories: []
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<ManagementRole>("staff");
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<AdminProductOpsItem[]>([]);
  const [dataIssues, setDataIssues] = useState<AdminDataIssue[]>([]);
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<number, string>>({});

  const lockedUserTotal = useMemo(() => users.filter((item) => item.locked).length, [users]);
  const pendingOrderTotal = useMemo(
    () => orders.filter((order) => order.orderStatus === "PENDING" || order.orderStatus === "PROCESSING").length,
    [orders]
  );

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [categories, productPage, adminUsers, adminOrders, lowStockItems, issues] = await Promise.all([
          getCategories(),
          apiRequest<ProductPageResponse>("/api/products?sort=default&page=0"),
          getAdminUsers(),
          getAdminOrders(),
          getAdminLowStockProducts(5),
          getAdminDataIssues()
        ]);

        if (!isMounted) {
          return;
        }

        setUsers(adminUsers);
        setOrders(adminOrders);
        setLowStockProducts(lowStockItems);
        setDataIssues(issues);
        setOrderStatusDrafts(
          Object.fromEntries(adminOrders.map((order) => [order.id, order.orderStatus])) as Record<number, string>
        );
        setStats({
          productTotal: productPage.totalItems,
          categoryTotal: categories.length,
          featuredCategories: categories.slice(0, 4)
        });
        setErrorMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStats({
          productTotal: 0,
          categoryTotal: 0,
          featuredCategories: []
        });
        setUsers([]);
        setOrders([]);
        setLowStockProducts([]);
        setDataIssues([]);
        setOrderStatusDrafts({});
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateUserInState = (updatedUser: AdminUser) => {
    setUsers((previousUsers) =>
      previousUsers.map((item) => {
        if (item.id !== updatedUser.id) {
          return item;
        }
        return updatedUser;
      })
    );
  };

  const removeUserInState = (removedUserId: number) => {
    setUsers((previousUsers) => previousUsers.filter((item) => item.id !== removedUserId));
  };

  const updateOrderInState = (orderId: number, nextStatus: string) => {
    setOrders((previousOrders) =>
      previousOrders.map((order) => {
        if (order.id !== orderId) {
          return order;
        }

        return {
          ...order,
          orderStatus: nextStatus
        };
      })
    );
  };

  const handleUpdateOrderStatus = async (order: AdminOrderItem) => {
    const draftStatus = orderStatusDrafts[order.id] ?? order.orderStatus;
    const nextStatus = draftStatus.trim().toUpperCase();
    if (!nextStatus) {
      setErrorMessage("Trang thai don hang khong duoc de trong.");
      return;
    }

    const actionKey = `order-status-${order.id}`;
    setNotice(null);
    setErrorMessage(null);
    setActiveActionKey(actionKey);

    try {
      const updated = await updateAdminOrderStatus(order.id, nextStatus);
      updateOrderInState(order.id, updated.orderStatus);
      setOrderStatusDrafts((previous) => ({
        ...previous,
        [order.id]: updated.orderStatus
      }));
      setNotice(`Da cap nhat don #${order.id} sang trang thai ${updated.orderStatus}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActiveActionKey(null);
    }
  };

  const handleToggleRole = async (targetUser: AdminUser) => {
    if (!canManageAccounts || targetUser.role === "owner") {
      return;
    }

    const targetRole = getNextRole(targetUser.role);
    const actionKey = `role-${targetUser.id}`;

    setNotice(null);
    setErrorMessage(null);
    setActiveActionKey(actionKey);

    try {
      const updatedUser = await updateAdminUserRole(targetUser.id, targetRole);
      updateUserInState(updatedUser);
      setNotice(`Da cap nhat role tai khoan ${updatedUser.username} thanh ${getRoleLabel(updatedUser.role)}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActiveActionKey(null);
    }
  };

  const handleToggleLock = async (targetUser: AdminUser) => {
    if (!canManageAccounts || targetUser.role === "owner") {
      return;
    }

    const targetLockedState = !targetUser.locked;
    const actionKey = `lock-${targetUser.id}`;

    setNotice(null);
    setErrorMessage(null);
    setActiveActionKey(actionKey);

    try {
      const updatedUser = await updateAdminUserLockState(targetUser.id, targetLockedState);
      updateUserInState(updatedUser);
      setNotice(
        targetLockedState
          ? `Da khoa tai khoan ${updatedUser.username}.`
          : `Da mo khoa tai khoan ${updatedUser.username}.`
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActiveActionKey(null);
    }
  };

  const handleCreateManagementUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageAccounts) {
      return;
    }

    const username = newUsername.trim();
    const password = newPassword.trim();
    if (!username || !password) {
      setErrorMessage("Username va password khong duoc de trong.");
      return;
    }

    setNotice(null);
    setErrorMessage(null);
    setActiveActionKey("create-management-user");

    try {
      const createdUser = await createManagementUser(username, password, newRole);
      setUsers((previousUsers) => [createdUser, ...previousUsers]);
      setNewUsername("");
      setNewPassword("");
      setNewRole("staff");
      setNotice(`Da tao tai khoan ${createdUser.username} voi role ${getRoleLabel(createdUser.role)}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActiveActionKey(null);
    }
  };

  const handleDeleteManagementUser = async (targetUser: AdminUser) => {
    if (!canManageAccounts) {
      return;
    }

    const actionKey = `delete-${targetUser.id}`;
    setNotice(null);
    setErrorMessage(null);
    setActiveActionKey(actionKey);

    try {
      await deleteManagementUser(targetUser.id);
      removeUserInState(targetUser.id);
      setNotice(`Da xoa tai khoan ${targetUser.username}.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActiveActionKey(null);
    }
  };

  return (
    <section className="role-page">
      <header className="role-hero role-hero-admin">
        <p className="role-kicker">TRUNG TAM QUAN TRI</p>
        <h1>Trang quan tri</h1>
        <p>Theo doi tong quan he thong va xu ly quyen tai khoan nhanh tai mot noi.</p>
        <div className="role-action-row">
          <Link to="/products" className="role-primary-link">
            Xem catalog
          </Link>
          <Link to="/owner-staff" className="role-secondary-link">
            Sang khu owner/staff
          </Link>
        </div>
      </header>

      <section className="role-stat-grid">
        <article>
          <strong>{stats.productTotal}</strong>
          <span>San pham dang co</span>
        </article>
        <article>
          <strong>{stats.categoryTotal}</strong>
          <span>Danh muc dang mo</span>
        </article>
        <article>
          <strong>{orders.length}</strong>
          <span>Tong don hang</span>
        </article>
        <article>
          <strong>{pendingOrderTotal}</strong>
          <span>Don can xu ly</span>
        </article>
      </section>

      <section className="role-card-grid">
        <article className="role-card">
          <h2>Quan tri danh muc</h2>
          <p>Kiem tra cau truc menu, phan loai san pham va do phu catalog.</p>
          <div className="role-pill-row">
            {stats.featuredCategories.map((category) => (
              <span key={category.id} className="role-pill">
                {category.name}
              </span>
            ))}
          </div>
        </article>

        <article className="role-card">
          <h2>Nhiem vu Admin hang ngay</h2>
          <p>
            Quan ly san pham, danh muc, thuong hieu, blog, khuyen mai, ton kho va cap nhat trang thai don hang.
          </p>
          <div className="role-link-group">
            <span>CRUD san pham / danh muc / thuong hieu</span>
            <span>Xem va cap nhat don hang</span>
            <span>Quan ly noi dung website</span>
          </div>
        </article>

        <article className="role-card">
          <h2>Ton kho va chat luong du lieu</h2>
          <p>Theo doi ton kho thap va cac ban ghi can xu ly de tranh loi van hanh.</p>
          <div className="role-link-group">
            <span>Ton kho thap: {lowStockProducts.length}</span>
            <span>Loi du lieu: {dataIssues.length}</span>
            <span>Tai khoan hien thi: {users.length}</span>
          </div>
        </article>
      </section>

      <section className="role-card role-admin-orders-card">
        <div className="role-admin-users-header">
          <div>
            <h2>Quan ly don hang</h2>
            <p>Admin duoc xem va cap nhat trang thai don de van hanh hieu qua.</p>
          </div>
          <span className="role-pill">Can xu ly: {pendingOrderTotal}</span>
        </div>

        {!orders.length ? <p className="empty-message">Chua co don hang de hien thi.</p> : null}

        {orders.length ? (
          <div className="role-admin-user-list">
            {orders.slice(0, 12).map((order) => {
              const actionKey = `order-status-${order.id}`;
              const isUpdating = activeActionKey === actionKey;
              const draftStatus = orderStatusDrafts[order.id] ?? order.orderStatus;

              return (
                <article key={order.id} className="role-admin-user-row role-admin-order-row">
                  <div className="role-admin-user-main">
                    <h3>
                      Don #{order.id} - {order.customerUsername}
                    </h3>
                    <p>Nguoi nhan: {order.receiverName ?? "-"}</p>
                    <p>
                      Tong tien: {moneyFormatter.format(order.totalAmount)} - So mat hang: {order.itemCount}
                    </p>
                  </div>

                  <div className="role-admin-user-meta">
                    <span className="role-admin-badge is-admin">{order.orderStatus}</span>
                    <span className="role-admin-badge is-active">{order.paymentMethod ?? "N/A"}</span>
                  </div>

                  <div className="role-admin-user-actions">
                    <select
                      className="role-admin-inline-select"
                      value={draftStatus}
                      onChange={(event) =>
                        setOrderStatusDrafts((previous) => ({
                          ...previous,
                          [order.id]: event.target.value
                        }))
                      }
                      disabled={isUpdating}
                    >
                      {ORDER_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="role-admin-button"
                      disabled={isUpdating || draftStatus === order.orderStatus}
                      onClick={() => void handleUpdateOrderStatus(order)}
                    >
                      {isUpdating ? "Dang cap nhat..." : "Cap nhat trang thai"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="role-card-grid">
        <article className="role-card">
          <h2>Canh bao ton kho</h2>
          {!lowStockProducts.length ? <p>Khong co san pham ton kho thap.</p> : null}
          {lowStockProducts.length ? (
            <div className="role-link-group">
              {lowStockProducts.slice(0, 5).map((product) => (
                <span key={product.id}>
                  {product.name} (SL: {product.quantity})
                </span>
              ))}
            </div>
          ) : null}
        </article>

        <article className="role-card">
          <h2>Xu ly loi du lieu</h2>
          {!dataIssues.length ? <p>Du lieu hien tai on dinh.</p> : null}
          {dataIssues.length ? (
            <div className="role-link-group">
              {dataIssues.slice(0, 5).map((issue, index) => (
                <span key={`${issue.code}-${issue.referenceId ?? index}`}>
                  [{issue.code}] {issue.message}
                </span>
              ))}
            </div>
          ) : null}
        </article>

        <article className="role-card">
          <h2>Phan cap he thong</h2>
          <p>Owner la cap cao nhat va duyet thay doi quan trong. Admin khong co toan quyen he thong.</p>
          <div className="role-link-group">
            <span>Owner: quan ly admin/staff, doanh thu, cau hinh website</span>
            <span>Admin: van hanh hang ngay, cap nhat catalog va don hang</span>
          </div>
        </article>
      </section>

      <section className="role-card role-admin-users-card">
        <div className="role-admin-users-header">
          <div>
            <h2>Quan ly nguoi dung</h2>
            <p>Owner: them, sua, xoa admin/staff va khoa/mo tai khoan neu can.</p>
          </div>
          <span className="role-pill">Dang khoa: {lockedUserTotal}</span>
        </div>

        {notice ? <p className="inline-notice">{notice}</p> : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        {!canManageAccounts ? (
          <p className="role-admin-readonly-note">
            Tai khoan hien tai khong phai Owner. Ban chi co the xem danh sach, khong the thay doi.
          </p>
        ) : null}

        {canManageAccounts ? (
          <form className="role-admin-create-form" onSubmit={handleCreateManagementUser}>
            <input
              type="text"
              placeholder="Username moi"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              maxLength={100}
            />
            <input
              type="password"
              placeholder="Password tam"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              maxLength={100}
            />
            <select value={newRole} onChange={(event) => setNewRole(event.target.value as ManagementRole)}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="role-admin-button" disabled={activeActionKey === "create-management-user"}>
              {activeActionKey === "create-management-user" ? "Dang tao..." : "Tao admin/staff"}
            </button>
          </form>
        ) : null}

        {isLoadingUsers ? (
          <div className="loading-block">
            <div className="loading-ring" />
            <p>Dang tai danh sach tai khoan...</p>
          </div>
        ) : null}

        {!isLoadingUsers && users.length === 0 ? <p className="empty-message">Chua co tai khoan de hien thi.</p> : null}

        {!isLoadingUsers && users.length > 0 ? (
          <div className="role-admin-user-list">
            {users.map((targetUser) => {
              const roleActionKey = `role-${targetUser.id}`;
              const lockActionKey = `lock-${targetUser.id}`;
              const deleteActionKey = `delete-${targetUser.id}`;
              const isRoleUpdating = activeActionKey === roleActionKey;
              const isLockUpdating = activeActionKey === lockActionKey;
              const isDeleteUpdating = activeActionKey === deleteActionKey;
              const isUpdating = isRoleUpdating || isLockUpdating || isDeleteUpdating;
              const isOwnerAccount = targetUser.role === "owner";
              const nextRole = isOwnerAccount ? "owner" : getNextRole(targetUser.role);
              const canDelete = canManageAccounts && (targetUser.role === "admin" || targetUser.role === "staff");

              return (
                <article key={targetUser.id} className="role-admin-user-row">
                  <div className="role-admin-user-main">
                    <h3>{targetUser.username}</h3>
                    <p>ID: {targetUser.id}</p>
                    <p className="role-admin-user-roles">Roles: {targetUser.roles.join(", ") || "-"}</p>
                  </div>

                  <div className="role-admin-user-meta">
                    <span
                      className={`role-admin-badge ${
                        targetUser.role === "owner"
                          ? "is-owner"
                          : targetUser.role === "admin"
                            ? "is-admin"
                            : targetUser.role === "staff"
                              ? "is-staff"
                              : "is-user"
                      }`}
                    >
                      {getRoleLabel(targetUser.role)}
                    </span>
                    <span className={`role-admin-badge ${targetUser.locked ? "is-locked" : "is-active"}`}>
                      {targetUser.locked ? "Dang khoa" : "Dang hoat dong"}
                    </span>
                  </div>

                  <div className="role-admin-user-actions">
                    <button
                      type="button"
                      className="role-admin-button"
                      disabled={!canManageAccounts || isUpdating || isOwnerAccount}
                      onClick={() => void handleToggleRole(targetUser)}
                    >
                      {!canManageAccounts
                        ? "Chi Owner duoc doi role"
                        : isOwnerAccount
                          ? "OWNER (cao nhat)"
                          : isRoleUpdating
                            ? "Dang cap nhat..."
                            : `Chuyen sang ${getRoleLabel(nextRole)}`}
                    </button>

                    <button
                      type="button"
                      className="role-admin-button role-admin-button-secondary"
                      disabled={!canManageAccounts || isUpdating || isOwnerAccount}
                      onClick={() => void handleToggleLock(targetUser)}
                    >
                      {!canManageAccounts
                        ? "Chi Owner duoc khoa/mo"
                        : isLockUpdating
                          ? "Dang cap nhat..."
                          : targetUser.locked
                            ? "Mo tai khoan"
                            : "Khoa tai khoan"}
                    </button>

                    {canDelete ? (
                      <button
                        type="button"
                        className="role-admin-button role-admin-button-danger"
                        disabled={isUpdating}
                        onClick={() => void handleDeleteManagementUser(targetUser)}
                      >
                        {isDeleteUpdating ? "Dang xoa..." : "Xoa tai khoan"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </section>
  );
}
