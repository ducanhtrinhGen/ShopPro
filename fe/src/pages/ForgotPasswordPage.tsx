import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { requestPasswordReset } from "../api/authPassword";
import { useAuth } from "../auth/AuthContext";
import { getDefaultRouteForUser } from "../auth/roleUtils";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

export function ForgotPasswordPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Vui lòng nhập email.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(trimmed);
      setInfo(res.message);
    } catch (e) {
      setError(toErrorMessage(e, "Không gửi được yêu cầu. Vui lòng thử lại."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <p className="auth-kicker">Bảo mật tài khoản</p>
        <h1>Quên mật khẩu</h1>
        <p className="auth-description">
          Nhập email đã gắn với tài khoản ShopPro. Nếu khớp, bạn sẽ nhận hướng dẫn đặt lại mật khẩu (kiểm tra cả thư mục spam).
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          {info ? <p className="inline-notice">{info}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang gửi..." : "Gửi liên kết đặt lại"}
          </button>
        </form>

        <div className="demo-credentials">
          <p>
            <Link to="/login">← Quay lại đăng nhập</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
