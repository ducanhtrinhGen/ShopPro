import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCategories } from "../api/catalog";
import { useAuth } from "../auth/AuthContext";
import {
  canAccessAdminArea,
  getDefaultRouteForUser,
  isCustomerUser,
  isOwnerOrStaffUser,
  isOwnerUser
} from "../auth/roleUtils";
import type { Category } from "../types";

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const categoryMenuRef = useRef<HTMLElement | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(false);

  const isLoggedIn = Boolean(user);
  const isOwner = isOwnerUser(user);
  const dashboardPath = getDefaultRouteForUser(user);
  const showAdminLink = canAccessAdminArea(user);
  const showOpsLink = isOwnerOrStaffUser(user) && !isOwner;
  const showCustomerLinks = isCustomerUser(user);

  const navClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? "corsair-menu-link active" : "corsair-menu-link";

  const buildProductsLink = (categoryId?: number) => {
    const params = new URLSearchParams(location.search);

    if (categoryId === undefined) {
      params.delete("categoryId");
    } else {
      params.set("categoryId", String(categoryId));
    }

    params.delete("page");

    const query = params.toString();
    return query ? `/products?${query}` : "/products";
  };

  const handleAuthAction = async () => {
    if (isLoggedIn) {
      await logout();
      navigate("/", { replace: true });
      return;
    }

    navigate("/login");
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch {
        setCategories([]);
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!categoryMenuRef.current) {
        return;
      }

      if (!categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
        setIsDashboardMenuOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCategoryOpen(false);
        setIsDashboardMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useEffect(() => {
    setIsCategoryOpen(false);
    setIsDashboardMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="store-shell corsair-shell">
      <header className="corsair-header" ref={categoryMenuRef}>
        <div className="corsair-utility">
          <p>
            Linh kiện PC hiệu năng cao <span>cho gaming, làm việc và sáng tạo</span>
          </p>
          <div className="corsair-utility-links">
            <span>Hỗ trợ kỹ thuật</span>
            <span>{isLoggedIn ? `Xin chào, ${user?.username}` : "Khách vãng lai"}</span>
          </div>
        </div>

        <div className="corsair-nav-row">
          <Link to="/" className="corsair-brand">
            <img className="corsair-brand-logo" src="/logo-shoppro.png" alt="ShopPro" />
            <strong className="corsair-brand-text">SHOPPRO</strong>
          </Link>

          <nav className="corsair-menu" aria-label="Điều hướng chính">
            <NavLink to="/" end className={navClassName}>
              Trang chủ
            </NavLink>
            <NavLink to="/products" className={navClassName}>
              Sản phẩm
            </NavLink>
            {showOpsLink ? (
              <NavLink to="/owner-staff" className={navClassName}>
                Chủ shop / Nhân viên
              </NavLink>
            ) : null}
            {showCustomerLinks ? (
              <NavLink to="/customer" className={navClassName}>
                Khách hàng
              </NavLink>
            ) : null}
            {showCustomerLinks ? (
              <NavLink to="/cart" className={navClassName}>
                Giỏ hàng
              </NavLink>
            ) : null}
          </nav>

          <div className="corsair-actions">
            <button
              type="button"
              className={`corsair-action-button${isCategoryOpen ? " open" : ""}`}
              onClick={() => {
                setIsCategoryOpen((prev) => !prev);
                setIsDashboardMenuOpen(false);
              }}
              aria-expanded={isCategoryOpen}
            >
              Danh mục sản phẩm
            </button>

            {isLoggedIn ? (
              <div className={`corsair-dashboard-menu${isDashboardMenuOpen ? " open" : ""}`}>
                <button
                  type="button"
                  className={`corsair-action-link corsair-dashboard-trigger${isDashboardMenuOpen ? " open" : ""}`}
                  onClick={() => {
                    setIsDashboardMenuOpen((prev) => !prev);
                    setIsCategoryOpen(false);
                  }}
                  aria-expanded={isDashboardMenuOpen}
                  aria-haspopup="menu"
                >
                  Bảng điều khiển
                  <span aria-hidden="true">{isDashboardMenuOpen ? "▲" : "▼"}</span>
                </button>

                {isDashboardMenuOpen ? (
                  <div className="corsair-dashboard-panel" role="menu" aria-label="Bảng điều khiển">
                    <Link to={dashboardPath} className="corsair-dashboard-item" role="menuitem">
                      Trang điều khiển chính
                    </Link>
                    {showAdminLink ? (
                      <Link to="/admin" className="corsair-dashboard-item" role="menuitem">
                        Quản trị hệ thống
                      </Link>
                    ) : null}
                    {isOwnerOrStaffUser(user) ? (
                      <Link to="/owner-staff" className="corsair-dashboard-item" role="menuitem">
                        Chủ shop / Nhân viên
                      </Link>
                    ) : null}
                    {showCustomerLinks ? (
                      <Link to="/customer" className="corsair-dashboard-item" role="menuitem">
                        Khách hàng
                      </Link>
                    ) : null}
                    {showCustomerLinks ? (
                      <Link to="/cart" className="corsair-dashboard-item" role="menuitem">
                        Giỏ hàng
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <Link to="/products" className="corsair-action-link">
                Xem sản phẩm
              </Link>
            )}
            <button type="button" className="corsair-signout" onClick={handleAuthAction}>
              {isLoggedIn ? "Đăng xuất" : "Đăng nhập"}
            </button>
          </div>
        </div>

        {isCategoryOpen ? (
          <section className="corsair-category-panel" aria-label="Danh mục sản phẩm">
            <div className="corsair-category-head">
              <strong>Tất cả danh mục</strong>
              <Link to={buildProductsLink()} className="corsair-category-item">
                Xem tất cả
              </Link>
            </div>

            <div className="corsair-category-grid">
              {categories.map((category) => (
                <Link key={category.id} to={buildProductsLink(category.id)} className="corsair-category-item">
                  {category.name}
                </Link>
              ))}
            </div>

            {!categories.length ? <p className="corsair-category-empty">Chưa có danh mục để hiển thị.</p> : null}
          </section>
        ) : null}
      </header>

      <main className="content-area corsair-content">
        <Outlet />
      </main>
    </div>
  );
}
