import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { getCustomerProfile, updateCustomerProfile } from "../api/customer";
import type { CustomerProfile } from "../types";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

export function ProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    fullName: "",
    email: "",
    phone: "",
    address: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const data = await getCustomerProfile();
        if (!active) return;
        setProfile(data);
        setForm({
          fullName: data.fullName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? ""
        });
      } catch (e) {
        if (!active) return;
        setProfile(null);
        setError(toErrorMessage(e, "Không thể tải hồ sơ tài khoản."));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSaving(true);

    try {
      const updated = await updateCustomerProfile({
        fullName: form.fullName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null
      });
      setProfile(updated);
      setMessage("Đã cập nhật hồ sơ.");
    } catch (e) {
      setError(toErrorMessage(e, "Không thể cập nhật hồ sơ."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tài khoản</p>
          <h2>Hồ sơ của tôi</h2>
          <p className="subtext">Cập nhật thông tin giao hàng cơ bản để checkout nhanh hơn.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/customer" className="primary-link">
            Về trang khách hàng
          </Link>
          <Link to="/orders" className="primary-link">
            Đơn hàng của tôi
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="loading-block">
          <div className="loading-ring" />
          <p>Đang tải hồ sơ...</p>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="inline-notice">{message}</p> : null}

      {!isLoading && profile ? (
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

          <label className="is-wide">
            Địa chỉ
            <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          </label>

          <button type="submit" disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Lưu hồ sơ"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

