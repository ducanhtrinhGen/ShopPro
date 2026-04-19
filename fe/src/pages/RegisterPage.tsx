import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { validatePasswordRules } from "../utils/passwordRules";
import { useAuth } from "../auth/AuthContext";
import { getDefaultRouteForUser } from "../auth/roleUtils";

export function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, register } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password.trim()) {
      setError("Tên đăng nhập và mật khẩu không được để trống.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    const pwdRule = validatePasswordRules(password);
    if (pwdRule) {
      setError(pwdRule);
      return;
    }

    setIsSubmitting(true);
    try {
      const authUser = await register(normalizedUsername, password);
      navigate(getDefaultRouteForUser(authUser), { replace: true });
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setError(requestError.message);
      } else {
        setError("Không thể đăng ký tài khoản. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <p className="auth-kicker">Thành viên ShopPro</p>
        <h1>Tạo tài khoản mới</h1>
        <p className="auth-description">
          Đăng ký nhanh để mua hàng, theo dõi đơn và quản lý giỏ hàng của bạn.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Tên đăng nhập
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
              maxLength={100}
              required
            />
          </label>

          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="new-password"
              maxLength={100}
              required
            />
          </label>

          <label>
            Nhập lại mật khẩu
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              maxLength={100}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <div className="demo-credentials">
          <p>
            Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
