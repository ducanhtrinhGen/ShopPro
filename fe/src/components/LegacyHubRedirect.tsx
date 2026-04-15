import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getDefaultRouteForUser, isOwnerUser, isStaffUser } from "../auth/roleUtils";

/** Chuyen huong URL cu `/owner-staff` sang `/owner` hoac `/staff`. */
export function LegacyHubRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="centered-screen">
        <div className="loading-ring" />
        <p>Dang kiem tra phien...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isOwnerUser(user)) {
    return <Navigate to="/owner" replace />;
  }

  if (isStaffUser(user)) {
    return <Navigate to="/staff" replace />;
  }

  return <Navigate to={getDefaultRouteForUser(user)} replace />;
}
