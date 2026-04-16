import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LegacyHubRedirect } from "./components/LegacyHubRedirect";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CartPage } from "./pages/CartPage";
import { CustomerDashboardPage } from "./pages/CustomerDashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { OrderPage } from "./pages/OrderPage";
import { OwnerExecutivePage } from "./pages/OwnerExecutivePage";
import { ProductsPage } from "./pages/ProductsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { StaffDashboardPage } from "./pages/StaffDashboardPage";
import { MyOrdersPage } from "./pages/MyOrdersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { BlogListPage } from "./pages/BlogListPage";
import { BlogPostPage } from "./pages/BlogPostPage";
import { ContactPage } from "./pages/ContactPage";
import { WishlistPage } from "./pages/WishlistPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<AppShell />}>
        <Route path="/" element={<ProductsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/contact" element={<ContactPage />} />

        <Route path="/owner-staff" element={<LegacyHubRedirect />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedRoute allowedRoles={["ROLE_CUSTOMER", "ROLE_USER"]} />}>
            <Route path="/customer" element={<CustomerDashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<MyOrdersPage />} />
            <Route path="/orders/:id" element={<OrderPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["ROLE_OWNER", "ROLE_ADMIN"]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["ROLE_OWNER"]} />}>
            <Route path="/owner" element={<OwnerExecutivePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["ROLE_STAFF"]} />}>
            <Route path="/staff" element={<StaffDashboardPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
