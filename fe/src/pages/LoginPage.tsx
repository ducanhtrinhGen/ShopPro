import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { getDefaultRouteForUser } from "../auth/roleUtils";

export function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  const redirectPath = (location.state as { from?: string } | null)?.from;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const authUser = await login(username, password);
      navigate(redirectPath ?? getDefaultRouteForUser(authUser), { replace: true });
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setError(requestError.message);
      } else {
        setError("Không thể đăng nhập. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <p className="auth-kicker">Cửa hàng ShopPro</p>
        <h1>Chào mừng bạn quay lại ShopPro</h1>
        <p className="auth-description">Đăng nhập để vào đúng khu vực quản trị, vận hành hoặc mua sắm.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Tên đăng nhập
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="admin123"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="demo-credentials">
          <h2>Tài khoản mẫu</h2>
          <p>Quản trị: admin / admin123</p>
          <p>Chủ shop: owner / owner123</p>
          <p>Nhân viên: staff / staff123</p>
          <p>Khách hàng: customer / customer123</p>
        </div>
      </section>
    </div>
  );
}