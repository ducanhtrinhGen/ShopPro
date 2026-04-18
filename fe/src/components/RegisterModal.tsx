import { type FormEvent, type MouseEvent, useEffect, useId, useRef, useState } from "react";
import { ApiRequestError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useLoginModal } from "../auth/LoginModalContext";
import { useRegisterModal } from "../auth/RegisterModalContext";
import { validatePasswordRules } from "../utils/passwordRules";

export function RegisterModal() {
  const { isOpen, closeRegisterModal, completeRegisterSuccess } = useRegisterModal();
  const { openLoginModal } = useLoginModal();
  const { register } = useAuth();

  const titleId = useId();
  const descriptionId = useId();
  const usernameRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setError(null);
    setIsSubmitting(false);
    setIsSuccess(false);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    window.setTimeout(() => usernameRef.current?.focus(), 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRegisterModal();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeRegisterModal]);

  useEffect(() => {
    if (!isOpen || !isSuccess) {
      return;
    }
    const id = window.setTimeout(() => {
      void completeRegisterSuccess();
    }, 1600);
    return () => window.clearTimeout(id);
  }, [isOpen, isSuccess, completeRegisterSuccess]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeRegisterModal();
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
      await register(u, password);
      setIsSuccess(true);
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setError(requestError.message);
      } else {
        setError("Không thể đăng ký. Vui lòng thử lại.");
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
              Đăng ký
            </h2>
            <p className="login-modal-sub">Tạo tài khoản để mua hàng và theo dõi đơn.</p>
          </div>
          <button
            type="button"
            className="login-modal-close"
            onClick={closeRegisterModal}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {isSuccess ? (
          <div className="login-modal-form" style={{ paddingTop: 4 }}>
            <p className="login-modal-success" role="status">
              Đăng ký thành công! Bạn đã được đăng nhập.
            </p>
            <p className="login-modal-sub" style={{ marginTop: 8 }}>
              Đang chuyển...
            </p>
          </div>
        ) : (
          <form className="login-modal-form" onSubmit={(e) => void handleSubmit(e)} autoComplete="off">
            <label className="login-modal-label">
              Tên đăng nhập
              <input
                ref={usernameRef}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Nhập tên đăng nhập"
                autoComplete="off"
                maxLength={100}
                required
              />
            </label>

            <label className="login-modal-label">
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Tối thiểu 8 ký tự, có chữ và số"
                autoComplete="off"
                maxLength={100}
                required
              />
            </label>

            <label className="login-modal-label">
              Nhập lại mật khẩu
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="off"
                maxLength={100}
                required
              />
            </label>

            {error ? <p className="login-modal-error">{error}</p> : null}

            <button type="submit" className="login-modal-submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký"}
            </button>
          </form>
        )}

        {!isSuccess ? (
          <nav className="login-modal-footer login-modal-footer--single" aria-label="Đã có tài khoản">
            <div className="login-modal-footer-links">
              <button
                type="button"
                className="login-modal-link"
                onClick={() => {
                  closeRegisterModal();
                  openLoginModal();
                }}
              >
                Đăng nhập
              </button>
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
