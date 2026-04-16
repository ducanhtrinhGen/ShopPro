import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { confirmPasswordReset } from "../api/authPassword";
import { useAuth } from "../auth/AuthContext";
import { getDefaultRouteForUser } from "../auth/roleUtils";
import { validatePasswordRules } from "../utils/passwordRules";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

export function ResetPasswordPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const tokenFromUrl = useMemo(() => (params.get("token") ?? "").trim(), [params]);

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  if (user) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const t = token.trim();
    if (!t) {
      setError("Thiếu mã đặt lại. Hãy mở đúng liên kết từ email.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    const rule = validatePasswordRules(newPassword);
    if (rule) {
      setError(rule);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await confirmPasswordReset({
        token: t,
        newPassword,
        confirmPassword
      });
      setSuccess(res.message);
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(toErrorMessage(e, "Không đặt lại được mật khẩu."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <p className="auth-kicker">Đặt lại mật khẩu</p>
        <h1>Đặt mật khẩu mới</h1>
        <p className="auth-description">
          Liên kết có hiệu lực giới hạn. Nếu hết hạn, hãy yêu cầu gửi lại từ trang quên mật khẩu.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="auth-form">
          <label>
            Mã từ liên kết
            <input value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required />
          </label>

          <label>
            Mật khẩu mới
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label>
            Xác nhận mật khẩu
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <p className="auth-hint">Tối thiểu 8 ký tự, gồm chữ cái và chữ số.</p>

          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="inline-notice">{success}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </button>
        </form>

        <div className="demo-credentials">
          <p>
            <Link to="/login">Đăng nhập</Link>
            {" · "}
            <Link to="/forgot-password">Gửi lại email</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
