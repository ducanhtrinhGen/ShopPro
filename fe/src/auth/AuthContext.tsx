import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { apiRequest, ApiRequestError, setUnauthorizedHandler } from "../api/client";
import type { AuthUser } from "../types";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PUBLIC_ROUTES = new Set([
  "/",
  "/products",
  "/categories",
  "/login",
  "/register"
]);

function isPublicRoute(pathname: string) {
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }

  return pathname.startsWith("/products/");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);

      const pathname = window.location.pathname;
      if (isPublicRoute(pathname)) {
        return;
      }

      const redirect = pathname ? `?from=${encodeURIComponent(pathname)}` : "";
      window.location.assign(`/login${redirect}`);
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiRequest<AuthUser>("/api/auth/me", {
        skipUnauthorizedHandler: true
      });
      setUser(me);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setUser(null);
        if (!isPublicRoute(window.location.pathname)) {
          const pathname = window.location.pathname;
          const redirect = pathname ? `?from=${encodeURIComponent(pathname)}` : "";
          window.location.assign(`/login${redirect}`);
        }
        return;
      }

      setUser(null);
      console.error("Không thể khôi phục phiên đăng nhập", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        await refreshUser();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (username: string, password: string) => {
    const authUser = await apiRequest<AuthUser>("/api/auth/login", {
      method: "POST",
      body: { username, password }
    });
    setUser(authUser);
    return authUser;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const authUser = await apiRequest<AuthUser>("/api/auth/register", {
      method: "POST",
      body: { username, password }
    });
    setUser(authUser);
    return authUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>("/api/auth/logout", {
        method: "POST"
      });
    } catch (error) {
      if (!(error instanceof ApiRequestError && error.status === 401)) {
        console.error("Yêu cầu đăng xuất thất bại", error);
      }
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      refreshUser
    }),
    [user, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được sử dụng bên trong AuthProvider");
  }

  return context;
}
