import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CartPage } from "./pages/CartPage";
import { CustomerDashboardPage } from "./pages/CustomerDashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { OrderPage } from "./pages/OrderPage";
import { OwnerStaffDashboardPage } from "./pages/OwnerStaffDashboardPage";
import { ProductsPage } from "./pages/ProductsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AppShell />}>
        <Route path="/" element={<ProductsPage />} />
        <Route path="/products" element={<ProductsPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/customer" element={<CustomerDashboardPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders/:id" element={<OrderPage />} />

          <Route element={<ProtectedRoute allowedRoles={["ROLE_OWNER", "ROLE_ADMIN"]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["ROLE_OWNER", "ROLE_STAFF"]} />}>
            <Route path="/owner-staff" element={<OwnerStaffDashboardPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
