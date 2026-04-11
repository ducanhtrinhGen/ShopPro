import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
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
        setError("Khong the dang nhap. Vui long thu lai.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <p className="auth-kicker">Cua hang ShopPro</p>
        <h1>Chao mung ban quay lai ShopPro</h1>
        <p className="auth-description">Dang nhap de vao dung khu vuc quan tri, van hanh hoac mua sam.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Ten dang nhap
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Mat khau
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
            {isSubmitting ? "Dang dang nhap..." : "Dang nhap"}
          </button>
        </form>

        <div className="demo-credentials">
          <p>
            Chua co tai khoan? <Link to="/register">Dang ky ngay</Link>
          </p>
        </div>       
      </section>
    </div>
  );
}
