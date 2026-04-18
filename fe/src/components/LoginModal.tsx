import { type FormEvent, type MouseEvent, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLoginModal } from "../auth/LoginModalContext";
import { useRegisterModal } from "../auth/RegisterModalContext";
import { ApiRequestError } from "../api/client";

export function LoginModal() {
  const { isOpen, closeLoginModal, completeLoginSuccess } = useLoginModal();
  const { openRegisterModal } = useRegisterModal();
  const { login } = useAuth();

  const titleId = useId();
  const descriptionId = useId();
  const usernameRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setError(null);
    setIsSubmitting(false);
    window.setTimeout(() => usernameRef.current?.focus(), 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLoginModal();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeLoginModal]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeLoginModal();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const u = username.trim();
    if (!u || !password) {
      setError("Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(u, password);
      await completeLoginSuccess();
      setUsername("");
      setPassword("");
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
    <div
      className="login-modal-backdrop"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="login-modal-header">
          <div>
            <p className="login-modal-kicker" id={descriptionId}>
              ShopPro
            </p>
            <h2 className="login-modal-title" id={titleId}>
              Đăng nhập
            </h2>
            <p className="login-modal-sub">Nhập tài khoản để tiếp tục thao tác.</p>
          </div>
          <button
            type="button"
            className="login-modal-close"
            onClick={closeLoginModal}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <form className="login-modal-form" onSubmit={(e) => void handleSubmit(e)} autoComplete="off">
          <label className="login-modal-label">
            Tên đăng nhập
            <input
              ref={usernameRef}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Nhập tên đăng nhập"
              autoComplete="off"
              required
            />
          </label>

          <label className="login-modal-label">
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="off"
              required
            />
          </label>

          {error ? <p className="login-modal-error">{error}</p> : null}

          <button type="submit" className="login-modal-submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <nav className="login-modal-footer" aria-label="Tùy chọn thêm">
          <div className="login-modal-footer-links">
            <Link to="/forgot-password" className="login-modal-link" onClick={closeLoginModal}>
              Quên mật khẩu?
            </Link>
            <span className="login-modal-footer-sep" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              className="login-modal-link"
              onClick={() => {
                closeLoginModal();
                openRegisterModal();
              }}
            >
              Đăng ký
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
