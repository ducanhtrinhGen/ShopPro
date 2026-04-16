import {
  type FocusEvent as ReactFocusEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCategories } from "../api/catalog";
import { useAuth } from "../auth/AuthContext";
import {
  canAccessAdminArea,
  getDefaultRouteForUser,
  isCustomerUser,
  isOwnerUser,
  isStaffUser
} from "../auth/roleUtils";
import type { Category } from "../types";

type IconProps = {
  className?: string;
};

type FooterColumn = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

type AccountMenuAction = "logout";

type AccountMenuItem = {
  key: string;
  label: string;
  icon: ReactNode;
  to?: string;
  action?: AccountMenuAction;
};

const footerColumnsBase: FooterColumn[] = [
  {
    title: "SHOP",
    links: [
      { label: "Mới nhất", href: "/products?sort=newest" },
      { label: "Đang giảm giá", href: "/products?promoOnly=1" },
      { label: "Còn hàng", href: "/products?inStockOnly=1" },
      { label: "Mua theo danh mục", href: "/products" }
    ]
  },
  {
    title: "SHOPPRO",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Liên hệ", href: "/contact" },
      { label: "Cửa hàng", href: "/products" }
    ]
  }
];

const footerSocialLinks = [
  { label: "Email", href: "/contact" },
  { label: "Blog", href: "/blog" }
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

function IconHeart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20.6 8.1c0 4.9-8.6 10.6-8.6 10.6S3.4 13 3.4 8.1c0-2.4 1.9-4.3 4.3-4.3 1.6 0 3 .8 3.7 2.1.7-1.3 2.2-2.1 3.7-2.1 2.4 0 4.3 1.9 4.3 4.3z" />
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
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const accountTriggerRef = useRef<HTMLButtonElement | null>(null);
  const accountCloseTimerRef = useRef<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isPointerHoverCapable, setIsPointerHoverCapable] = useState(false);

  const isLoggedIn = Boolean(user);
  const isOwner = isOwnerUser(user);
  const isStorefrontRoute = location.pathname === "/" || location.pathname === "/products";
  const accountMenuPanelId = "account-menu-panel";
  const accountMenuTriggerId = "account-menu-trigger";
  const dashboardPath = getDefaultRouteForUser(user);
  const isAdminOrOwner = canAccessAdminArea(user);
  const showStaffNav = isStaffUser(user);
  const showOwnerExecutiveNav = isOwnerUser(user);
  const showCustomerLinks = isCustomerUser(user);
  const clearAccountCloseTimer = () => {
    if (accountCloseTimerRef.current !== null) {
      window.clearTimeout(accountCloseTimerRef.current);
      accountCloseTimerRef.current = null;
    }
  };

  const closeAccountMenu = () => {
    clearAccountCloseTimer();
    setIsAccountMenuOpen(false);
  };

  const handleAccountMenuMouseEnter = () => {
    if (!isPointerHoverCapable) {
      return;
    }
    clearAccountCloseTimer();
    setIsAccountMenuOpen(true);
  };

  const handleAccountMenuMouseLeave = () => {
    if (!isPointerHoverCapable) {
      return;
    }
    clearAccountCloseTimer();
    accountCloseTimerRef.current = window.setTimeout(() => {
      setIsAccountMenuOpen(false);
      accountCloseTimerRef.current = null;
    }, 130);
  };

  const handleAccountTriggerClick = () => {
    clearAccountCloseTimer();
    setIsAccountMenuOpen((prev) => !prev);
    setIsCategoryOpen(false);
    setIsSearchOpen(false);
  };

  const focusFirstAccountMenuItem = () => {
    if (!accountMenuRef.current) {
      return;
    }
    const firstItem = accountMenuRef.current.querySelector<HTMLElement>("[data-account-menu-item='true']");
    firstItem?.focus();
  };

  const handleAccountTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      clearAccountCloseTimer();
      setIsAccountMenuOpen(true);
      setIsCategoryOpen(false);
      setIsSearchOpen(false);
      window.setTimeout(focusFirstAccountMenuItem, 0);
      return;
    }

    if (event.key === "Escape" && isAccountMenuOpen) {
      event.preventDefault();
      closeAccountMenu();
      accountTriggerRef.current?.focus();
    }
  };

  const handleAccountMenuBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const nextFocused = event.relatedTarget as Node | null;
    if (!nextFocused || !event.currentTarget.contains(nextFocused)) {
      closeAccountMenu();
    }
  };

  const handleAccountMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAccountMenu();
      accountTriggerRef.current?.focus();
    }
  };

  const accountMenuItems = useMemo<AccountMenuItem[]>(() => {
    if (!isLoggedIn) {
      return [
        {
          key: "login",
          label: "Đăng nhập",
          to: "/login",
          icon: <IconArrowOut className="corsair-icon" />
        },
        {
          key: "register",
          label: "Đăng ký",
          to: "/register",
          icon: <IconUser className="corsair-icon" />
        }
      ];
    }

    const items: AccountMenuItem[] = [];

    if (showCustomerLinks) {
      items.push(
        {
          key: "account-info",
          label: "Thông tin tài khoản",
          to: "/profile",
          icon: <IconUser className="corsair-icon" />
        },
        {
          key: "wishlist",
          label: "Wishlist",
          to: "/wishlist",
          icon: <IconHeart className="corsair-icon" />
        },
        {
          key: "my-orders",
          label: "Đơn hàng của tôi",
          to: "/orders",
          icon: <IconCart className="corsair-icon" />
        }
      );
    }

    if (showStaffNav) {
      items.push({
        key: "staff-ops",
        label: "Khu vực vận hành (Staff)",
        to: "/staff",
        icon: <IconTeam className="corsair-icon" />
      });
    }

    if (isAdminOrOwner) {
      items.push(
        {
          key: "manage-products",
          label: "Quản lý sản phẩm",
          to: "/admin?view=products",
          icon: <IconBox className="corsair-icon" />
        },
        {
          key: "dashboard-home",
          label: "Trang điều khiển chính",
          to: dashboardPath,
          icon: <IconGauge className="corsair-icon" />
        }
      );

      if (isOwner) {
        items.push(
          {
            key: "manage-users",
            label: "Quản lý người dùng",
            to: "/admin?view=users",
            icon: <IconShield className="corsair-icon" />
          },
          {
            key: "owner-executive",
            label: "Tong quan (Owner)",
            to: "/owner",
            icon: <IconGauge className="corsair-icon" />
          }
        );
      }
    }

    items.push({
      key: "logout",
      label: "Đăng xuất",
      icon: <IconArrowOut className="corsair-icon" />,
      action: "logout"
    });

    return items;
  }, [dashboardPath, isAdminOrOwner, isLoggedIn, isOwner, showCustomerLinks, showStaffNav]);

  const footerColumns = useMemo<FooterColumn[]>(() => {
    const accountLinks = isLoggedIn && showCustomerLinks
      ? [
          { label: "Wishlist", href: "/wishlist" },
          { label: "Đơn hàng của tôi", href: "/orders" },
          { label: "Thông tin tài khoản", href: "/profile" }
        ]
      : [
          { label: "Đăng nhập", href: "/login" },
          { label: "Đăng ký", href: "/register" }
        ];

    return [
      ...footerColumnsBase,
      {
        title: "ACCOUNT",
        links: accountLinks
      }
    ];
  }, [isLoggedIn, showCustomerLinks]);

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

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
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
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncHoverCapability = () => setIsPointerHoverCapable(mediaQuery.matches);
    syncHoverCapability();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncHoverCapability);
      return () => mediaQuery.removeEventListener("change", syncHoverCapability);
    }

    mediaQuery.addListener(syncHoverCapability);
    return () => mediaQuery.removeListener(syncHoverCapability);
  }, []);

  useEffect(() => {
    return () => {
      if (accountCloseTimerRef.current !== null) {
        window.clearTimeout(accountCloseTimerRef.current);
        accountCloseTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!categoryMenuRef.current) {
        return;
      }

      if (!categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
        if (accountCloseTimerRef.current !== null) {
          window.clearTimeout(accountCloseTimerRef.current);
          accountCloseTimerRef.current = null;
        }
        setIsAccountMenuOpen(false);
        setIsSearchOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCategoryOpen(false);
        if (accountCloseTimerRef.current !== null) {
          window.clearTimeout(accountCloseTimerRef.current);
          accountCloseTimerRef.current = null;
        }
        setIsAccountMenuOpen(false);
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
    if (accountCloseTimerRef.current !== null) {
      window.clearTimeout(accountCloseTimerRef.current);
      accountCloseTimerRef.current = null;
    }
    setIsAccountMenuOpen(false);
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
              <Link to="/products?promoOnly=1" className="corsair-top-link">
                Khuyến mãi
              </Link>
              <Link to="/products?inStockOnly=1" className="corsair-top-link">
                Còn hàng
              </Link>
              <Link to="/blog" className="corsair-top-link">
                Blog
              </Link>
              <Link to="/contact" className="corsair-top-link">
                Liên hệ
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
              {showOwnerExecutiveNav ? (
                <NavLink to="/owner" className={navClassName}>
                  <span className="corsair-link-inner">
                    <IconGauge className="corsair-icon" />
                    Dieu hanh
                  </span>
                </NavLink>
              ) : null}
              {showStaffNav ? (
                <NavLink to="/staff" className={navClassName}>
                  <span className="corsair-link-inner">
                    <IconTeam className="corsair-icon" />
                    Van hanh
                  </span>
                </NavLink>
              ) : null}
              {isAdminOrOwner ? (
                <NavLink to="/admin" className={navClassName}>
                  <span className="corsair-link-inner">
                    <IconShield className="corsair-icon" />
                    Quan tri
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
                  closeAccountMenu();
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
                  closeAccountMenu();
                }}
                aria-expanded={isCategoryOpen}
              >
                <span className="corsair-link-inner">
                  <IconGrid className="corsair-icon" />
                  Danh mục sản phẩm
                </span>
              </button>

              <div
                className={`corsair-account-menu${isAccountMenuOpen ? " open" : ""}`}
                onMouseEnter={handleAccountMenuMouseEnter}
                onMouseLeave={handleAccountMenuMouseLeave}
                onBlur={handleAccountMenuBlur}
                ref={accountMenuRef}
              >
                <button
                  type="button"
                  id={accountMenuTriggerId}
                  ref={accountTriggerRef}
                  className={`corsair-icon-action corsair-account-trigger${isAccountMenuOpen ? " open" : ""}`}
                  onClick={handleAccountTriggerClick}
                  onKeyDown={handleAccountTriggerKeyDown}
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="true"
                  aria-controls={accountMenuPanelId}
                  aria-label={isLoggedIn ? "Mở menu tài khoản" : "Mở menu đăng nhập"}
                >
                  <IconUser className="corsair-icon" />
                  <span className="corsair-account-caret" aria-hidden="true">
                    {isAccountMenuOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isAccountMenuOpen ? (
                  <div
                    id={accountMenuPanelId}
                    className="corsair-dashboard-panel corsair-account-panel"
                    aria-label="Tài khoản"
                    aria-labelledby={accountMenuTriggerId}
                    onKeyDown={handleAccountMenuKeyDown}
                  >
                    {accountMenuItems.map((item) =>
                      item.to ? (
                        <Link
                          key={item.key}
                          to={item.to}
                          className="corsair-dashboard-item"
                          data-account-menu-item="true"
                          onClick={closeAccountMenu}
                        >
                          <span className="corsair-link-inner">
                            {item.icon}
                            {item.label}
                          </span>
                        </Link>
                      ) : (
                        <button
                          key={item.key}
                          type="button"
                          className="corsair-dashboard-item corsair-account-action"
                          data-account-menu-item="true"
                          onClick={() => {
                            closeAccountMenu();
                            if (item.action === "logout") {
                              void handleLogout();
                            }
                          }}
                        >
                          <span className="corsair-link-inner">
                            {item.icon}
                            {item.label}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                ) : null}
              </div>
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
              Cần tư vấn build PC hoặc báo lỗi đơn hàng? Hãy gửi liên hệ, ShopPro sẽ phản hồi sớm.
            </p>
            <div className="shoppro-footer-signup" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link to="/contact" className="role-admin-button" style={{ textDecoration: "none" }}>
                Gửi liên hệ
              </Link>
              <Link to="/blog" style={{ textDecoration: "none" }}>
                Xem blog →
              </Link>
            </div>

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
            <Link to="/blog">Blog</Link>
            <Link to="/contact">Liên hệ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

