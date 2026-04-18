import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { changeAuthenticatedPassword } from "../api/authPassword";
import { getCustomerProfileDashboard, updateCustomerProfile } from "../api/customer";
import { validatePasswordRules } from "../utils/passwordRules";
import type { CustomerProfileDashboard } from "../types";

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

export function ProfilePage() {
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

  const profile = dashboard;
  const displayName = profile?.fullName?.trim() || profile?.username || "Khách hàng";
  const hasAddress = Boolean(profile?.address?.trim());

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

  return (
    <section className="panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tài khoản</p>
          <h2>Thông tin khách hàng</h2>
          <p className="subtext">Xem tóm tắt đơn hàng, cập nhật thông tin giao hàng và bảo mật tài khoản.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/customer" className="primary-link">
            Trang tổng quan khách hàng
          </Link>
          <Link to="/orders" className="primary-link">
            Tất cả đơn hàng
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="customer-profile-loading" aria-busy="true" aria-live="polite">
          <div className="loading-block">
            <div className="loading-ring" />
            <p>Đang tải hồ sơ...</p>
          </div>
          <div className="customer-profile-skeleton" aria-hidden="true">
            <div className="customer-profile-skeleton-hero">
              <div className="customer-profile-skeleton-avatar" />
              <div className="customer-profile-skeleton-lines">
                <div className="customer-profile-skeleton-line customer-profile-skeleton-line-lg" />
                <div className="customer-profile-skeleton-line customer-profile-skeleton-line-md" />
                <div className="customer-profile-skeleton-line customer-profile-skeleton-line-sm" />
              </div>
            </div>
            <div className="customer-profile-skeleton-stats">
              <div className="customer-profile-skeleton-stat" />
              <div className="customer-profile-skeleton-stat" />
              <div className="customer-profile-skeleton-stat" />
            </div>
            <div className="customer-profile-skeleton-recent">
              <div className="customer-profile-skeleton-line customer-profile-skeleton-line-md" />
              <div className="customer-profile-skeleton-table" />
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
        <>
          <div className="customer-profile-hero">
            <div className="customer-profile-identity">
              <div className="customer-profile-avatar" aria-hidden="true">
                {(displayName.slice(0, 1) || "?").toUpperCase()}
              </div>
              <div>
                <h3 className="customer-profile-name">{displayName}</h3>
                <p className="customer-profile-meta">
                  <span className="customer-profile-username">@{profile.username}</span>
                  {profile.email ? (
                    <span className="customer-profile-chip">{profile.email}</span>
                  ) : (
                    <span className="customer-profile-chip customer-profile-chip-muted">Chưa có email</span>
                  )}
                </p>
                {profile.phone ? (
                  <p className="customer-profile-phone">{profile.phone}</p>
                ) : (
                  <p className="customer-profile-phone-muted">Chưa có số điện thoại</p>
                )}
              </div>
            </div>
            <div className="customer-profile-address-preview">
              <p className="customer-profile-address-label">Địa chỉ giao hàng</p>
              {hasAddress ? (
                <p className="customer-profile-address-text">{profile.address}</p>
              ) : (
                <p className="customer-profile-address-empty">Chưa cập nhật — thêm bên dưới để checkout nhanh hơn.</p>
              )}
            </div>
          </div>

          <div className="customer-profile-stats" aria-live="polite">
            <article className="customer-profile-stat-card">
              <span className="customer-profile-stat-label">Tổng đơn hàng</span>
              <strong className="customer-profile-stat-value">{profile.totalOrders}</strong>
            </article>
            <article className="customer-profile-stat-card">
              <span className="customer-profile-stat-label">Đơn hoàn tất</span>
              <strong className="customer-profile-stat-value">{profile.completedOrders}</strong>
            </article>
            <article className="customer-profile-stat-card">
              <span className="customer-profile-stat-label">Tổng chi tiêu</span>
              <strong className="customer-profile-stat-value customer-profile-stat-money">
                {moneyFormatter.format(profile.totalSpent)}
              </strong>
            </article>
          </div>

          <nav className="customer-profile-quick-links" aria-label="Liên kết nhanh">
            <a href="#customer-profile-forms" className="customer-profile-quick-link">
              Chỉnh sửa hồ sơ
            </a>
            <Link to="/orders" className="customer-profile-quick-link">
              Đơn hàng
            </Link>
            <Link to="/wishlist" className="customer-profile-quick-link">
              Wishlist
            </Link>
            <a href="#customer-profile-address" className="customer-profile-quick-link">
              {hasAddress ? "Địa chỉ" : "Thêm địa chỉ"}
            </a>
          </nav>

          <section className="customer-profile-recent" aria-labelledby="recent-orders-heading">
            <div className="customer-profile-recent-head">
              <h3 id="recent-orders-heading">Đơn hàng gần đây</h3>
              <Link to="/orders" className="primary-link">
                Xem tất cả
              </Link>
            </div>
            {profile.recentOrders.length === 0 ? (
              <div className="empty-message customer-profile-recent-empty">
                <p>
                  <strong>Chưa có đơn hàng gần đây</strong>
                </p>
                <p>Khi bạn đặt hàng, các đơn mới nhất sẽ hiển thị tại đây.</p>
                <p>
                  <Link to="/products" className="primary-link">
                    Khám phá sản phẩm
                  </Link>
                </p>
              </div>
            ) : (
              <div className="order-table-wrap">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Ngày</th>
                      <th>Trạng thái</th>
                      <th>Tổng</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {profile.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>#{order.id}</strong>
                        </td>
                        <td>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                        <td>{toStatusLabel(order.status)}</td>
                        <td>
                          <strong>{moneyFormatter.format(order.totalAmount)}</strong>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link to={`/orders/${order.id}`} className="primary-link">
                            Chi tiết
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {!isLoading && profile ? (
        <>
          <section id="customer-profile-forms" className="customer-profile-forms-section">
            <header className="page-header" style={{ marginTop: "1.25rem" }}>
              <div>
                <p className="eyebrow">Hồ sơ</p>
                <h3 style={{ margin: 0 }}>Chỉnh sửa thông tin</h3>
                <p className="subtext">Cập nhật thông tin giao hàng cơ bản để checkout nhanh hơn.</p>
              </div>
            </header>

            {message ? <p className="inline-notice">{message}</p> : null}
            {saveError ? (
              <p className="form-error" role="alert">
                {saveError}
              </p>
            ) : null}

            <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
              <label>
                Tài khoản
                <input value={profile.username} disabled />
              </label>

              <label>
                Họ và tên
                <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
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

              <label className="is-wide" id="customer-profile-address">
                Địa chỉ
                <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              </label>

              <button type="submit" disabled={isSaving}>
                {isSaving ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            </form>
          </section>

          <hr className="profile-divider" />
          <header className="page-header" style={{ marginTop: "1.5rem" }}>
            <div>
              <p className="eyebrow">Bảo mật</p>
              <h3 style={{ margin: 0 }}>Đổi mật khẩu</h3>
              <p className="subtext">Nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 8 ký tự, có chữ cái và số).</p>
            </div>
          </header>

          {pwdError ? <p className="form-error">{pwdError}</p> : null}
          {pwdMessage ? <p className="inline-notice">{pwdMessage}</p> : null}

          <form className="auth-form" onSubmit={(e) => void handlePasswordSubmit(e)} style={{ maxWidth: "520px" }}>
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
            <button type="submit" disabled={isPwdSaving}>
              {isPwdSaving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </form>
        </>
      ) : null}
    </section>
  );
}
