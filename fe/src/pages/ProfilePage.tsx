import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { changeAuthenticatedPassword } from "../api/authPassword";
import { getCustomerProfileDashboard, getMyOrders, updateCustomerProfile } from "../api/customer";
import { getMyWishlist, removeWishlist } from "../api/wishlist";
import { useAuth } from "../auth/AuthContext";
import { AccountMetricsRow } from "../components/account/AccountMetricsRow";
import { AccountSidebar, type AccountSectionId, isAccountSectionId } from "../components/account/AccountSidebar";
import { validatePasswordRules } from "../utils/passwordRules";
import type { CustomerOrderSummary, CustomerProfileDashboard, WishlistItem } from "../types";

const DEFAULT_SECTION: AccountSectionId = "overview";

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

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

function isOutOfStock(item: WishlistItem) {
  return item.quantity <= 0;
}

export function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeSection: AccountSectionId = isAccountSectionId(tabParam) ? tabParam : DEFAULT_SECTION;

  const setSection = useCallback(
    (sectionId: AccountSectionId) => {
      setSearchParams({ tab: sectionId }, { replace: true });
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (!tabParam) {
      setSearchParams({ tab: DEFAULT_SECTION }, { replace: true });
      return;
    }
    if (!isAccountSectionId(tabParam)) {
      setSearchParams({ tab: DEFAULT_SECTION }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const [dashboard, setDashboard] = useState<CustomerProfileDashboard | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    fullName: "",
    email: "",
    phone: "",
    address: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [isPwdSaving, setIsPwdSaving] = useState(false);

  const [allOrders, setAllOrders] = useState<CustomerOrderSummary[]>([]);
  const [allOrdersLoading, setAllOrdersLoading] = useState(false);
  const [allOrdersError, setAllOrdersError] = useState<string | null>(null);
  const [allOrdersKeyword, setAllOrdersKeyword] = useState("");

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [wishlistMessage, setWishlistMessage] = useState<string | null>(null);
  const [wishlistKeyword, setWishlistKeyword] = useState("");
  const [removingWishlistId, setRemovingWishlistId] = useState<number | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getCustomerProfileDashboard();
      setDashboard(data);
      setForm({
        fullName: data.fullName ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        address: data.address ?? ""
      });
    } catch (e) {
      setDashboard(null);
      setLoadError(toErrorMessage(e, "Không thể tải hồ sơ tài khoản."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (activeSection !== "all-orders") return;
    let cancelled = false;
    setAllOrdersLoading(true);
    setAllOrdersError(null);
    void (async () => {
      try {
        const data = await getMyOrders();
        if (!cancelled) setAllOrders(data);
      } catch (e) {
        if (!cancelled) {
          setAllOrders([]);
          setAllOrdersError(toErrorMessage(e, "Không thể tải danh sách đơn hàng."));
        }
      } finally {
        if (!cancelled) setAllOrdersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "wishlist") return;
    let cancelled = false;
    setWishlistLoading(true);
    setWishlistError(null);
    setWishlistMessage(null);
    void (async () => {
      try {
        const data = await getMyWishlist();
        if (!cancelled) setWishlistItems(data);
      } catch (e) {
        if (!cancelled) {
          setWishlistItems([]);
          setWishlistError(toErrorMessage(e, "Không tải được danh sách yêu thích."));
        }
      } finally {
        if (!cancelled) setWishlistLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection]);

  const profile = dashboard;
  const displayName = profile?.fullName?.trim() || profile?.username || "Khách hàng";
  const hasAddress = Boolean(profile?.address?.trim());

  const filteredAllOrders = useMemo(() => {
    const k = allOrdersKeyword.trim().toLowerCase();
    if (!k) return allOrders;
    return allOrders.filter(
      (o) => String(o.id).includes(k) || normalizeStatus(o.status).includes(k.toUpperCase())
    );
  }, [allOrders, allOrdersKeyword]);

  const filteredWishlist = useMemo(() => {
    const q = wishlistKeyword.trim().toLowerCase();
    if (!q) return wishlistItems;
    return wishlistItems.filter((p) => p.name.toLowerCase().includes(q));
  }, [wishlistItems, wishlistKeyword]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSaveError(null);
    setIsSaving(true);

    try {
      const updated = await updateCustomerProfile({
        fullName: form.fullName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null
      });
      setDashboard((d) =>
        d
          ? {
              ...d,
              username: updated.username,
              fullName: updated.fullName,
              email: updated.email,
              phone: updated.phone,
              address: updated.address
            }
          : null
      );
      setMessage("Đã cập nhật hồ sơ.");
    } catch (e) {
      setSaveError(toErrorMessage(e, "Không thể cập nhật hồ sơ."));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPwdError(null);
    setPwdMessage(null);

    if (pwdNew !== pwdConfirm) {
      setPwdError("Mật khẩu xác nhận không khớp.");
      return;
    }
    const rule = validatePasswordRules(pwdNew);
    if (rule) {
      setPwdError(rule);
      return;
    }

    setIsPwdSaving(true);
    try {
      await changeAuthenticatedPassword({
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
        confirmPassword: pwdConfirm
      });
      setPwdMessage("Đã cập nhật mật khẩu.");
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
    } catch (e) {
      setPwdError(toErrorMessage(e, "Không thể đổi mật khẩu."));
    } finally {
      setIsPwdSaving(false);
    }
  };

  const handleRemoveWishlist = async (productId: number) => {
    setRemovingWishlistId(productId);
    setWishlistMessage(null);
    try {
      await removeWishlist(productId);
      setWishlistItems((prev) => prev.filter((p) => p.productId !== productId));
      setWishlistMessage("Đã gỡ khỏi danh sách yêu thích.");
    } catch (e) {
      setWishlistMessage(toErrorMessage(e, "Không gỡ được khỏi danh sách yêu thích."));
    } finally {
      setRemovingWishlistId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const renderOrderTable = (orders: CustomerOrderSummary[]) => (
    <div className="account-table-wrap">
      <table className="account-order-table">
        <thead>
          <tr>
            <th>Mã đơn hàng</th>
            <th>Ngày đặt</th>
            <th>Sản phẩm</th>
            <th>Tổng tiền</th>
            <th>Trạng thái</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td data-label="Mã đơn">
                <strong>#{order.id}</strong>
              </td>
              <td data-label="Ngày">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
              <td data-label="Sản phẩm">{order.totalQuantity} sản phẩm</td>
              <td data-label="Tổng">{moneyFormatter.format(order.totalAmount)}</td>
              <td data-label="Trạng thái">{toStatusLabel(order.status)}</td>
              <td className="account-order-actions" data-label="">
                <Link to={`/orders/${order.id}`} className="primary-link">
                  Chi tiết
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="panel account-page">
      {isLoading ? (
        <div className="account-page-loading" aria-busy="true" aria-live="polite">
          <div className="loading-block">
            <div className="loading-ring" />
            <p>Đang tải hồ sơ...</p>
          </div>
          <div className="account-page-skeleton" aria-hidden="true">
            <div className="account-page-skeleton-sidebar" />
            <div className="account-page-skeleton-main">
              <div className="account-page-skeleton-bar" />
              <div className="account-page-skeleton-bar short" />
              <div className="account-page-skeleton-panel" />
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div className="empty-message customer-profile-page-error" role="alert" aria-live="assertive">
          <p className="customer-profile-error-title">Không tải được dữ liệu hồ sơ</p>
          <p className="customer-profile-error-detail">{loadError}</p>
          <div className="customer-profile-error-actions">
            <button type="button" className="ghost-button" onClick={() => void fetchDashboard()}>
              Thử lại
            </button>
            <Link to="/customer" className="primary-link">
              Trang tổng quan khách hàng
            </Link>
          </div>
        </div>
      ) : null}

      {!isLoading && profile ? (
        <div className="account-page-layout">
          <AccountSidebar
            displayName={displayName}
            username={profile.username}
            emailPreview={profile.email}
            activeSection={activeSection}
            onSelectSection={setSection}
          />

          <div className="account-page-main">
            <header className="account-panel-header">
              <div>
                <h1 className="account-panel-title">Bảng thông tin của tôi</h1>
                <p className="account-panel-lead">Quản lý thông tin cá nhân và đơn hàng.</p>
              </div>
              <button type="button" className="account-logout-link" onClick={() => void handleLogout()}>
                Đăng xuất
              </button>
            </header>

            {activeSection === "edit-profile" && (message || saveError) ? (
              <div className="account-page-flash" role="status" aria-live="polite">
                {message ? <p className="inline-notice account-inline-msg">{message}</p> : null}
                {saveError ? (
                  <p className="form-error account-inline-msg" role="alert">
                    {saveError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="account-single-panel">
              <div className="account-card account-section" key={activeSection}>
                {activeSection === "overview" ? (
                  <div className="account-overview-dashboard">
                    <h2 className="account-section-title">Thông tin chung</h2>
                    <p className="account-section-hint">Tổng hợp tài khoản, đơn hàng và địa chỉ.</p>

                    <section className="account-overview-block" aria-labelledby="overview-account-heading">
                      <h3 id="overview-account-heading" className="account-subsection-title">
                        Thông tin tài khoản
                      </h3>
                      <dl className="account-readonly-grid" aria-label="Tóm tắt tài khoản">
                        <div>
                          <dt>Họ và tên</dt>
                          <dd>{profile.fullName?.trim() || "—"}</dd>
                        </div>
                        <div>
                          <dt>Email</dt>
                          <dd>{profile.email?.trim() || "—"}</dd>
                        </div>
                        <div>
                          <dt>Số điện thoại</dt>
                          <dd>{profile.phone?.trim() || "—"}</dd>
                        </div>
                      </dl>
                    </section>

                    <section className="account-overview-block" aria-labelledby="overview-metrics-heading">
                      <h3 id="overview-metrics-heading" className="account-subsection-title">
                        Tổng quan đơn hàng
                      </h3>
                      <p className="account-subsection-hint">Thống kê theo lịch sử mua hàng.</p>
                      <AccountMetricsRow
                        totalOrders={profile.totalOrders}
                        completedOrders={profile.completedOrders}
                        totalSpentFormatted={moneyFormatter.format(profile.totalSpent)}
                      />
                    </section>

                    <section className="account-overview-block" aria-labelledby="overview-recent-orders-heading">
                      <div className="account-section-head account-overview-subhead">
                        <h3 id="overview-recent-orders-heading" className="account-subsection-title">
                          Đơn hàng gần đây
                        </h3>
                        <button type="button" className="account-section-tab-link" onClick={() => setSection("all-orders")}>
                          Tất cả đơn hàng
                        </button>
                      </div>
                      <p className="account-subsection-hint">Một vài đơn gần nhất.</p>
                      {profile.recentOrders.length === 0 ? (
                        <div className="account-empty-orders">
                          <p>Bạn chưa có đơn hàng nào gần đây.</p>
                          <Link to="/products" className="account-btn-outline">
                            Mua sắm ngay
                          </Link>
                        </div>
                      ) : (
                        renderOrderTable(profile.recentOrders)
                      )}
                    </section>

                    <section className="account-overview-block" aria-labelledby="overview-address-heading">
                      <h3 id="overview-address-heading" className="account-subsection-title">
                        Sổ địa chỉ
                      </h3>
                      <p className="account-subsection-hint">Địa chỉ giao hàng mặc định khi đặt hàng.</p>
                      <div className="account-address-block">
                        {hasAddress ? (
                          <p className="account-address-text">{profile.address?.trim()}</p>
                        ) : (
                          <p className="account-address-empty">Chưa có địa chỉ giao hàng.</p>
                        )}
                        <button
                          type="button"
                          className="account-address-cta"
                          onClick={() => {
                            setSection("edit-profile");
                            window.setTimeout(() => {
                              document.getElementById("customer-profile-address")?.focus({ preventScroll: true });
                            }, 0);
                          }}
                        >
                          Chỉnh sửa địa chỉ
                        </button>
                      </div>
                    </section>
                  </div>
                ) : null}

                {activeSection === "edit-profile" ? (
                  <>
                    <h2 className="account-section-title">Chỉnh sửa hồ sơ</h2>
                    <p className="account-section-hint">Cập nhật thông tin liên hệ và địa chỉ nhận hàng.</p>
                    <form className="account-form account-form--profile" onSubmit={(e) => void handleSubmit(e)}>
                      <label>
                        Tài khoản
                        <input value={profile.username} disabled />
                      </label>
                      <label>
                        Họ và tên
                        <input
                          value={form.fullName}
                          onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          value={form.email}
                          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder="email@domain.com"
                        />
                      </label>
                      <label>
                        Số điện thoại
                        <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                      </label>
                      <label htmlFor="customer-profile-address">
                        Địa chỉ
                        <input
                          id="customer-profile-address"
                          value={form.address}
                          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                          placeholder="Số nhà, đường, phường/xã, tỉnh/thành..."
                        />
                      </label>
                      <div className="account-form-actions">
                        <button type="submit" className="account-btn-primary" disabled={isSaving}>
                          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                      </div>
                    </form>
                  </>
                ) : null}

                {activeSection === "change-password" ? (
                  <>
                    <h2 className="account-section-title">Đổi mật khẩu</h2>
                    <p className="account-section-hint">Mật khẩu tối thiểu 8 ký tự, có chữ cái và số.</p>
                    {pwdError ? <p className="form-error">{pwdError}</p> : null}
                    {pwdMessage ? <p className="inline-notice">{pwdMessage}</p> : null}
                    <form className="account-form" onSubmit={(e) => void handlePasswordSubmit(e)}>
                      <label>
                        Mật khẩu hiện tại
                        <input
                          type="password"
                          value={pwdCurrent}
                          onChange={(e) => setPwdCurrent(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                      </label>
                      <label>
                        Mật khẩu mới
                        <input
                          type="password"
                          value={pwdNew}
                          onChange={(e) => setPwdNew(e.target.value)}
                          autoComplete="new-password"
                          minLength={8}
                          required
                        />
                      </label>
                      <label>
                        Xác nhận mật khẩu mới
                        <input
                          type="password"
                          value={pwdConfirm}
                          onChange={(e) => setPwdConfirm(e.target.value)}
                          autoComplete="new-password"
                          minLength={8}
                          required
                        />
                      </label>
                      <div className="account-form-actions">
                        <button type="submit" className="account-btn-primary" disabled={isPwdSaving}>
                          {isPwdSaving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                        </button>
                      </div>
                    </form>
                  </>
                ) : null}

                {activeSection === "all-orders" ? (
                  <>
                    <h2 className="account-section-title">Tất cả đơn hàng</h2>
                    <p className="account-section-hint">Danh sách đơn hàng của bạn.</p>
                    <div className="account-panel-toolbar">
                      <input
                        type="text"
                        value={allOrdersKeyword}
                        onChange={(e) => setAllOrdersKeyword(e.target.value)}
                        placeholder="Tìm theo mã đơn hoặc trạng thái..."
                        className="account-panel-toolbar-input"
                      />
                    </div>
                    {allOrdersLoading ? (
                      <div className="loading-block account-panel-inline-loading">
                        <div className="loading-ring" />
                        <p>Đang tải đơn hàng...</p>
                      </div>
                    ) : null}
                    {allOrdersError ? <p className="form-error">{allOrdersError}</p> : null}
                    {!allOrdersLoading && !allOrdersError && filteredAllOrders.length === 0 ? (
                      <p className="empty-message account-panel-empty">Bạn chưa có đơn hàng nào.</p>
                    ) : null}
                    {!allOrdersLoading && !allOrdersError && filteredAllOrders.length > 0
                      ? renderOrderTable(filteredAllOrders)
                      : null}
                  </>
                ) : null}

                {activeSection === "wishlist" ? (
                  <>
                    <h2 className="account-section-title">Yêu thích</h2>
                    <p className="account-section-hint">Sản phẩm bạn đã lưu.</p>
                    {wishlistMessage ? <p className="inline-notice">{wishlistMessage}</p> : null}
                    {wishlistError ? <p className="form-error">{wishlistError}</p> : null}
                    <div className="account-panel-toolbar">
                      <input
                        type="text"
                        value={wishlistKeyword}
                        onChange={(e) => setWishlistKeyword(e.target.value)}
                        placeholder="Tìm trong danh sách yêu thích..."
                        className="account-panel-toolbar-input"
                      />
                    </div>
                    {wishlistLoading ? (
                      <div className="loading-block account-panel-inline-loading">
                        <div className="loading-ring" />
                        <p>Đang tải danh sách yêu thích...</p>
                      </div>
                    ) : null}
                    {!wishlistLoading && !wishlistError && filteredWishlist.length === 0 ? (
                      <p className="empty-message account-panel-empty">Danh sách yêu thích đang trống.</p>
                    ) : null}
                    {!wishlistLoading && !wishlistError && filteredWishlist.length > 0 ? (
                      <div className="c-home-grid account-wishlist-grid">
                        {filteredWishlist.map((item) => {
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
                                    <span style={{ textDecoration: "line-through", opacity: 0.7 }}>
                                      {moneyFormatter.format(item.price)}
                                    </span>
                                  </div>
                                ) : (
                                  <strong>{moneyFormatter.format(item.price)}</strong>
                                )}
                              </div>
                              <div className="card-actions c-home-card-actions">
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveWishlist(item.productId)}
                                  disabled={removingWishlistId === item.productId}
                                >
                                  {removingWishlistId === item.productId ? "..." : "Gỡ"}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
