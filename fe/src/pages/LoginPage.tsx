import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { getDefaultRouteForUser } from "../auth/roleUtils";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  const redirectPath = (() => {
    const fromState = (location.state as { from?: string } | null)?.from;
    if (fromState) return fromState;

    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("from");
    if (fromQuery && fromQuery.startsWith("/")) return fromQuery;

    return undefined;
  })();

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

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
          <label>
            Ten dang nhap
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Nhập tên đăng nhập"
              autoComplete="off"
              required
            />
          </label>

          <label>
            Mat khau
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="off"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="demo-credentials">
          <p>
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>
        </div>       
      </section>
    </div>
  );
}
