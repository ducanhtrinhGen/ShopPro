import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { canAccessRoles, getDefaultRouteForUser } from "../auth/roleUtils";

type ProtectedRouteProps = {
  allowedRoles?: readonly string[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="centered-screen">
        <div className="loading-ring" />
        <p>Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessRoles(user, allowedRoles)) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  return <Outlet />;
}