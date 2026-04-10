import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getDefaultRouteForUser } from "../auth/roleUtils";

export function RoleHomeRedirect() {
  const { user } = useAuth();

  return <Navigate to={getDefaultRouteForUser(user)} replace />;
}
