import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
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

type IconProps = {
  className?: string;
};

type FooterColumn = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

const footerColumns: FooterColumn[] = [
  {
    title: "SHOP",
    links: [
      { label: "Sản phẩm mới", href: "/products?sort=default" },
      { label: "Ưu đãi đặc biệt", href: "/products?promo=1" },
      { label: "Bán chạy", href: "/products?sort=priceDesc" },
      { label: "Mua theo danh mục", href: "/products" },
      { label: "Doanh nghiệp", href: "/products?business=1" }
    ]
  },
  {
    title: "EXPLORE",
    links: [
      { label: "Xây dựng cấu hình", href: "/products?build=1" },
      { label: "PC Builder", href: "/products?build=1" },
      { label: "Linh kiện nổi bật", href: "/products?highlight=1" },
      { label: "Xu hướng gaming", href: "/products?gaming=1" },
      { label: "Wallpaper", href: "/products?wallpaper=1" }
    ]
  },
  {
    title: "SHOPPRO",
    links: [
      { label: "Giới thiệu", href: "/products?about=1" },
      { label: "Liên hệ", href: "/products?contact=1" },
      { label: "Tuyển dụng", href: "/products?career=1" },
      { label: "Blog", href: "/products?blog=1" },
      { label: "Cửa hàng", href: "/products" }
    ]
  },
  {
    title: "SUPPORT",
    links: [
      { label: "Tải về", href: "/products?download=1" },
      { label: "Hỗ trợ khách hàng", href: "/products?support=1" },
      { label: "Bảo hành", href: "/products?warranty=1" },
      { label: "Đổi trả", href: "/products?returns=1" },
      { label: "Điều khoản", href: "/products?terms=1" }
    ]
  }
];

const footerSocialLinks = [
  { label: "X", href: "#" },
  { label: "TT", href: "#" },
  { label: "FB", href: "#" },
  { label: "IG", href: "#" },
  { label: "YT", href: "#" },
  { label: "TW", href: "#" },
  { label: "DC", href: "#" },
  { label: "RD", href: "#" }
];

function IconBase({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconHome(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5.5 10.5V20h13V10.5" />
      <path d="M10 20v-6h4v6" />
    </IconBase>
  );
}

function IconBox(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" />
      <path d="M12 21v-9.3" />
      <path d="M3.9 7.8L12 12l8.1-4.2" />
    </IconBase>
  );
}

function IconTeam(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.4" />
      <path d="M3.6 19c1-2.8 2.9-4.2 5.4-4.2 2.4 0 4.4 1.4 5.4 4.2" />
      <path d="M14.3 19c.6-1.7 1.8-2.7 3.4-3" />
    </IconBase>
  );
}

function IconCart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H7" />
      <circle cx="10" cy="20" r="1.7" />
      <circle cx="18" cy="20" r="1.7" />
    </IconBase>
  );
}

function IconGrid(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.3" />
      <rect x="13" y="4" width="7" height="7" rx="1.3" />
      <rect x="4" y="13" width="7" height="7" rx="1.3" />
      <rect x="13" y="13" width="7" height="7" rx="1.3" />
    </IconBase>
  );
}

function IconGauge(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 16a7 7 0 1 1 14 0" />
      <path d="M12 13l4-4" />
      <circle cx="12" cy="16" r="1.6" />
    </IconBase>
  );
}

function IconShield(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v6c0 5-3.2 8.4-7 9-3.8-.6-7-4-7-9V6l7-3z" />
    </IconBase>
  );
}

function IconWrench(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14.8 6.4a4 4 0 0 0-4.9 4.9L4.4 16.8a1.7 1.7 0 1 0 2.4 2.4l5.5-5.5a4 4 0 0 0 4.9-4.9L14.8 11 13 9.2z" />
    </IconBase>
  );
}

function IconUser(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4 19.5c1.4-3.2 4-5 8-5s6.6 1.8 8 5" />
    </IconBase>
  );
}

function IconEye(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.4" />
    </IconBase>
  );
}

function IconArrowOut(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 7h6v6" />
      <path d="M10 14L20 7" />
      <path d="M10 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
    </IconBase>
  );
}

function IconSearch(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.2-4.2" />
    </IconBase>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const categoryMenuRef = useRef<HTMLElement | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const isLoggedIn = Boolean(user);
  const isOwner = isOwnerUser(user);
  const isStorefrontRoute = location.pathname === "/" || location.pathname === "/products";
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

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams(location.search);
    params.delete("page");

    const keyword = searchKeyword.trim();
    if (keyword) {
      params.set("keyword", keyword);
    } else {
      params.delete("keyword");
    }

    const query = params.toString();
    navigate(query ? `/products?${query}` : "/products");
    setIsSearchOpen(false);
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
    const params = new URLSearchParams(location.search);
    setSearchKeyword(params.get("keyword") ?? "");
  }, [location.search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!categoryMenuRef.current) {
        return;
      }

      if (!categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
        setIsDashboardMenuOpen(false);
        setIsSearchOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCategoryOpen(false);
        setIsDashboardMenuOpen(false);
        setIsSearchOpen(false);
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
    setIsSearchOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="store-shell corsair-shell">
      <header className="corsair-header" ref={categoryMenuRef}>
        <div className="corsair-header-top">
          <div className="corsair-utility">
            <p>
              Linh kiện PC hiệu năng cao <span>cho gaming, làm việc và sáng tạo</span>
            </p>

            <nav className="corsair-top-links" aria-label="Tiện ích nhanh">
              <Link to="/products?promo=1" className="corsair-top-link">
                Khuyến mãi
              </Link>
              <Link to="/products?installment=1" className="corsair-top-link">
                Trả góp
              </Link>
              <Link to="/products?priceList=1" className="corsair-top-link">
                Bảng giá
              </Link>
              <Link to="/products?build=1" className="corsair-top-link">
                Xây dựng cấu hình
              </Link>
            </nav>

            <div className="corsair-utility-links">
              <span className="corsair-utility-item">
                <IconWrench className="corsair-icon" />
                Hỗ trợ kỹ thuật
              </span>
              <span className="corsair-utility-item">
                <IconUser className="corsair-icon" />
                {isLoggedIn ? `Xin chào, ${user?.username}` : "Khách vãng lai"}
              </span>
            </div>
          </div>
        </div>

        <div className="corsair-header-main">
          <div className="corsair-nav-row">
            <Link to="/" className="corsair-brand">
              <img className="corsair-brand-logo" src="/logo-shoppro.png" alt="ShopPro" />
              <strong className="corsair-brand-text">SHOPPRO</strong>
            </Link>

            <nav className="corsair-menu" aria-label="Điều hướng chính">
              <NavLink to="/" end className={navClassName}>
                <span className="corsair-link-inner">
                  <IconHome className="corsair-icon" />
                  Trang chủ
                </span>
              </NavLink>
              <NavLink to="/products" className={navClassName}>
                <span className="corsair-link-inner">
                  <IconBox className="corsair-icon" />
                  Sản phẩm
                </span>
              </NavLink>
              {showOpsLink ? (
                <NavLink to="/owner-staff" className={navClassName}>
                  <span className="corsair-link-inner">
                    <IconTeam className="corsair-icon" />
                    Chủ shop / Nhân viên
                  </span>
                </NavLink>
              ) : null}
              {showCustomerLinks ? (
                <NavLink to="/customer" className={navClassName}>
                  <span className="corsair-link-inner">
                    <IconUser className="corsair-icon" />
                    Khách hàng
                  </span>
                </NavLink>
              ) : null}
              {showCustomerLinks ? (
                <NavLink to="/cart" className={navClassName}>
                  <span className="corsair-link-inner">
                    <IconCart className="corsair-icon" />
                    Giỏ hàng
                  </span>
                </NavLink>
              ) : null}
            </nav>

            <div className="corsair-actions">
              <button
                type="button"
                className={`corsair-icon-action${isSearchOpen ? " open" : ""}`}
                onClick={() => {
                  setIsSearchOpen((prev) => !prev);
                  setIsCategoryOpen(false);
                  setIsDashboardMenuOpen(false);
                }}
                aria-expanded={isSearchOpen}
                aria-label="Mở tìm kiếm"
              >
                <IconSearch className="corsair-icon" />
              </button>

              <button
                type="button"
                className={`corsair-action-button${isCategoryOpen ? " open" : ""}`}
                onClick={() => {
                  setIsCategoryOpen((prev) => !prev);
                  setIsDashboardMenuOpen(false);
                }}
                aria-expanded={isCategoryOpen}
              >
                <span className="corsair-link-inner">
                  <IconGrid className="corsair-icon" />
                  Danh mục sản phẩm
                </span>
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
                    <IconGauge className="corsair-icon" />
                    Bảng điều khiển
                    <span aria-hidden="true">{isDashboardMenuOpen ? "▲" : "▼"}</span>
                  </button>

                  {isDashboardMenuOpen ? (
                    <div className="corsair-dashboard-panel" role="menu" aria-label="Bảng điều khiển">
                      <Link to={dashboardPath} className="corsair-dashboard-item" role="menuitem">
                        <span className="corsair-link-inner">
                          <IconGauge className="corsair-icon" />
                          Trang điều khiển chính
                        </span>
                      </Link>
                      {showAdminLink ? (
                        <Link to="/admin" className="corsair-dashboard-item" role="menuitem">
                          <span className="corsair-link-inner">
                            <IconShield className="corsair-icon" />
                            Quản trị hệ thống
                          </span>
                        </Link>
                      ) : null}
                      {isOwnerOrStaffUser(user) ? (
                        <Link to="/owner-staff" className="corsair-dashboard-item" role="menuitem">
                          <span className="corsair-link-inner">
                            <IconTeam className="corsair-icon" />
                            Chủ shop / Nhân viên
                          </span>
                        </Link>
                      ) : null}
                      {showCustomerLinks ? (
                        <Link to="/customer" className="corsair-dashboard-item" role="menuitem">
                          <span className="corsair-link-inner">
                            <IconUser className="corsair-icon" />
                            Khách hàng
                          </span>
                        </Link>
                      ) : null}
                      {showCustomerLinks ? (
                        <Link to="/cart" className="corsair-dashboard-item" role="menuitem">
                          <span className="corsair-link-inner">
                            <IconCart className="corsair-icon" />
                            Giỏ hàng
                          </span>
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link to="/products" className="corsair-action-link">
                  <span className="corsair-link-inner">
                    <IconEye className="corsair-icon" />
                    Xem sản phẩm
                  </span>
                </Link>
              )}
              <button type="button" className="corsair-signout" onClick={handleAuthAction}>
                <span className="corsair-link-inner">
                  <IconArrowOut className="corsair-icon" />
                  {isLoggedIn ? "Đăng xuất" : "Đăng nhập"}
                </span>
              </button>
            </div>
          </div>

          {isSearchOpen ? (
            <section className="corsair-search-panel" aria-label="Tìm kiếm sản phẩm">
              <form className="corsair-search-form" onSubmit={handleSearchSubmit}>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Tìm sản phẩm, thương hiệu, danh mục..."
                  autoFocus
                />
                <button type="submit">
                  <IconSearch className="corsair-icon" />
                  Tìm kiếm
                </button>
              </form>
            </section>
          ) : null}

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
        </div>
      </header>

      <main className={`content-area corsair-content${isStorefrontRoute ? " corsair-content-storefront" : ""}`}>
        <Outlet />
      </main>

      <footer className="shoppro-footer" aria-label="Thông tin cuối trang">
        <div className="shoppro-footer-inner">
          <section className="shoppro-footer-news">
            <Link to="/" className="shoppro-footer-brand">
              <img src="/logo-shoppro.png" alt="ShopPro" />
              <strong>SHOPPRO</strong>
            </Link>

            <p>
              Nhận ưu đãi độc quyền, tin sản phẩm mới và sự kiện công nghệ từ ShopPro mỗi tuần.
            </p>

            <form className="shoppro-footer-signup" onSubmit={(event) => event.preventDefault()}>
              <input type="email" placeholder="Nhập email của bạn" aria-label="Email nhận tin" />
              <button type="submit">Đăng ký</button>
            </form>

            <div className="shoppro-footer-social" aria-label="Mạng xã hội">
              {footerSocialLinks.map((item) => (
                <a key={item.label} href={item.href} aria-label={item.label}>
                  {item.label}
                </a>
              ))}
            </div>
          </section>

          {footerColumns.map((column) => (
            <section key={column.title} className="shoppro-footer-col">
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="shoppro-footer-legal">
          <p>Copyright © 2026 SHOPPRO. All rights reserved.</p>
          <div>
            <a href="#">Sitemap</a>
            <a href="#">Chính sách</a>
            <a href="#">Điều khoản</a>
            <a href="#">Cookie</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

