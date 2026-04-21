import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const OAUTH_TOKEN_STORAGE_KEY = "shoppro_oauth_token";

export function OAuth2RedirectPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const syncSession = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get("token");
      if (token) {
        window.localStorage.setItem(OAUTH_TOKEN_STORAGE_KEY, token);
      }

      try {
        await refreshUser();
      } finally {
        navigate("/customer", { replace: true });
      }
    };

    void syncSession();
  }, [location.search, navigate, refreshUser]);

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <p className="auth-kicker">ShopPro OAuth2</p>
        <h1>Completing sign-in</h1>
        <p className="auth-description">Please wait while we finish your Google login.</p>
      </section>
    </div>
  );
}
