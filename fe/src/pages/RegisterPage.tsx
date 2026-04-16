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
      setError("Ten dang nhap va mat khau khong duoc de trong.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mat khau nhap lai khong khop.");
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
        setError("Khong the dang ky tai khoan. Vui long thu lai.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <p className="auth-kicker">Thanh vien ShopPro</p>
        <h1>Tao tai khoan moi</h1>
        <p className="auth-description">Dang ky nhanh de mua hang, theo doi don va quan ly gio hang cua ban.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Ten dang nhap
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="nhap username"
              autoComplete="username"
              maxLength={100}
              required
            />
          </label>

          <label>
            Mat khau
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="nhap mat khau"
              autoComplete="new-password"
              maxLength={100}
              required
            />
          </label>

          <label>
            Nhap lai mat khau
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="nhap lai mat khau"
              autoComplete="new-password"
              maxLength={100}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Dang tao tai khoan..." : "Dang ky"}
          </button>
        </form>

        <div className="demo-credentials">
          <p>
            Da co tai khoan? <Link to="/login">Dang nhap ngay</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
