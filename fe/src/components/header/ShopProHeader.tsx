import {
  type FocusEvent as ReactFocusEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { getCategories } from "../../api/catalog";
import { useAuth } from "../../auth/AuthContext";
import { useLoginModal } from "../../auth/LoginModalContext";
import { useRegisterModal } from "../../auth/RegisterModalContext";
import {
  canAccessAdminArea,
  getDefaultRouteForUser,
  isCustomerUser,
  isOwnerUser,
  isStaffUser
} from "../../auth/roleUtils";
import {
  applyCategoryHintsToMegaMenu,
  MEGA_MENU_FEATURED,
  MEGA_MENU_GROUPS
} from "../../config/megaMenu";
import { STORE_QUICK_LINKS } from "../../config/storeNav";
import type { Category } from "../../types";
import { AccountMenuItems, type AccountMenuRow } from "./AccountMenuItems";
import {
  IconArrowOut,
  IconBox,
  IconCart,
  IconGauge,
  IconGrid,
  IconHeart,
  IconHome,
  IconMenu,
  IconSearch,
  IconShield,
  IconSpark,
  IconTeam,
  IconUser,
  IconWrench
} from "./headerIcons";
import { MegaMenu } from "./MegaMenu";
import { MobileMenu } from "./MobileMenu";

const MOBILE_QUERY = "(max-width: 1023px)";

export function ShopProHeader() {
  const { user, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const { openRegisterModal } = useRegisterModal();
  const navigate = useNavigate();
  const location = useLocation();

  const headerRef = useRef<HTMLElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const accountTriggerRef = useRef<HTMLButtonElement | null>(null);
  const accountCloseTimerRef = useRef<number | null>(null);
  const megaCloseTimerRef = useRef<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isPointerHoverCapable, setIsPointerHoverCapable] = useState(false);
  const [isWideViewport, setIsWideViewport] = useState(
    typeof window !== "undefined" ? !window.matchMedia(MOBILE_QUERY).matches : true
  );

  const isLoggedIn = Boolean(user);
  const isOwner = isOwnerUser(user);
  const accountMenuPanelId = "shoppro-account-menu-panel";
  const accountMenuTriggerId = "shoppro-account-menu-trigger";
  const dashboardPath = getDefaultRouteForUser(user);
  const isAdminOrOwner = canAccessAdminArea(user);
  const showStaffNav = isStaffUser(user);
  const showOwnerExecutiveNav = isOwnerUser(user);
  const showCustomerLinks = isCustomerUser(user);
  const isClearanceRoute = location.pathname === "/products" && (new URLSearchParams(location.search).get("clearanceOnly") ?? "") === "1";

  const megaGroupsResolved = useMemo(
    () => applyCategoryHintsToMegaMenu(MEGA_MENU_GROUPS, categories),
    [categories]
  );

  const clearAccountCloseTimer = useCallback(() => {
    if (accountCloseTimerRef.current !== null) {
      window.clearTimeout(accountCloseTimerRef.current);
      accountCloseTimerRef.current = null;
    }
  }, []);

  const clearMegaCloseTimer = useCallback(() => {
    if (megaCloseTimerRef.current !== null) {
      window.clearTimeout(megaCloseTimerRef.current);
      megaCloseTimerRef.current = null;
    }
  }, []);

  const closeAccountMenu = useCallback(() => {
    clearAccountCloseTimer();
    setIsAccountMenuOpen(false);
  }, [clearAccountCloseTimer]);

  const openMega = useCallback(() => {
    clearMegaCloseTimer();
    setIsMegaOpen(true);
  }, [clearMegaCloseTimer]);

  const scheduleMegaClose = useCallback(() => {
    clearMegaCloseTimer();
    megaCloseTimerRef.current = window.setTimeout(() => {
      setIsMegaOpen(false);
      megaCloseTimerRef.current = null;
    }, 200);
  }, [clearMegaCloseTimer]);

  const closeMegaOnly = useCallback(() => {
    clearMegaCloseTimer();
    setIsMegaOpen(false);
  }, [clearMegaCloseTimer]);

  const closeAllPanels = useCallback(() => {
    clearMegaCloseTimer();
    setIsMegaOpen(false);
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    clearAccountCloseTimer();
    setIsAccountMenuOpen(false);
  }, [clearMegaCloseTimer, clearAccountCloseTimer]);

  const handleAccountMenuMouseEnter = () => {
    if (!isPointerHoverCapable) return;
    clearAccountCloseTimer();
    setIsAccountMenuOpen(true);
  };

  const handleAccountMenuMouseLeave = () => {
    if (!isPointerHoverCapable) return;
    clearAccountCloseTimer();
    accountCloseTimerRef.current = window.setTimeout(() => {
      setIsAccountMenuOpen(false);
      accountCloseTimerRef.current = null;
    }, 130);
  };

  const handleAccountTriggerClick = () => {
    clearAccountCloseTimer();
    setIsAccountMenuOpen((prev) => !prev);
    setIsMegaOpen(false);
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  };

  const focusFirstAccountMenuItem = () => {
    if (!accountMenuRef.current) return;
    const firstItem = accountMenuRef.current.querySelector<HTMLElement>("[data-account-menu-item='true']");
    firstItem?.focus();
  };

  const handleAccountTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      clearAccountCloseTimer();
      setIsAccountMenuOpen(true);
      setIsMegaOpen(false);
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

  const performLogout = useCallback(async () => {
    await logout();
    navigate("/", { replace: true });
  }, [logout, navigate]);

  const accountMenuRows = useMemo<AccountMenuRow[]>(() => {
    const onNav = () => closeAccountMenu();

    if (!isLoggedIn) {
      return [
        {
          key: "login",
          kind: "login",
          label: "Đăng nhập",
          icon: <IconArrowOut className="sp-header-icon" />,
          onLogin: () => {
            closeAccountMenu();
            openLoginModal();
          }
        },
        {
          key: "register",
          kind: "register",
          label: "Đăng ký",
          icon: <IconUser className="sp-header-icon" />,
          onRegister: () => {
            closeAccountMenu();
            openRegisterModal();
          }
        }
      ];
    }

    const rows: AccountMenuRow[] = [];

    if (showCustomerLinks) {
      rows.push(
        {
          key: "account-info",
          kind: "link",
          label: "Thông tin khách hàng",
          to: "/profile",
          icon: <IconUser className="sp-header-icon" />,
          onNavigate: onNav
        },
        {
          key: "wishlist",
          kind: "link",
          label: "Wishlist",
          to: "/wishlist",
          icon: <IconHeart className="sp-header-icon" />,
          onNavigate: onNav
        },
        {
          key: "my-orders",
          kind: "link",
          label: "Đơn hàng của tôi",
          to: "/orders",
          icon: <IconCart className="sp-header-icon" />,
          onNavigate: onNav
        }
      );
    }

    if (showStaffNav) {
      rows.push({
        key: "staff-ops",
        kind: "link",
        label: "Khu vực vận hành (Staff)",
        to: "/staff",
        icon: <IconTeam className="sp-header-icon" />,
        onNavigate: onNav
      });
    }

    if (isAdminOrOwner) {
      rows.push(
        {
          key: "manage-products",
          kind: "link",
          label: "Quản lý sản phẩm",
          to: "/admin?view=products",
          icon: <IconBox className="sp-header-icon" />,
          onNavigate: onNav
        },
        {
          key: "dashboard-home",
          kind: "link",
          label: "Trang điều khiển chính",
          to: dashboardPath,
          icon: <IconGauge className="sp-header-icon" />,
          onNavigate: onNav
        }
      );

      if (isOwner) {
        rows.push(
          {
            key: "manage-users",
            kind: "link",
            label: "Quản lý người dùng",
            to: "/admin?view=users",
            icon: <IconShield className="sp-header-icon" />,
            onNavigate: onNav
          },
          {
            key: "owner-executive",
            kind: "link",
            label: "Tổng quan (Owner)",
            to: "/owner",
            icon: <IconGauge className="sp-header-icon" />,
            onNavigate: onNav
          }
        );
      }
    }

    rows.push({
      key: "logout",
      kind: "logout",
      label: "Đăng xuất",
      icon: <IconArrowOut className="sp-header-icon" />,
      onLogout: () => {
        closeAccountMenu();
        void performLogout();
      }
    });

    return rows;
  }, [
    closeAccountMenu,
    dashboardPath,
    isAdminOrOwner,
    isLoggedIn,
    isOwner,
    openLoginModal,
    openRegisterModal,
    performLogout,
    showCustomerLinks,
    showStaffNav
  ]);

  const navClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? "sp-nav-link is-active" : "sp-nav-link";

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(location.search);
    params.delete("page");
    const keyword = searchKeyword.trim();
    if (keyword) params.set("keyword", keyword);
    else params.delete("keyword");
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
    const onProductDetail = /^\/products\/[^/]+$/.test(location.pathname);
    if (onProductDetail) {
      setSearchKeyword("");
      return;
    }
    const params = new URLSearchParams(location.search);
    setSearchKeyword(params.get("keyword") ?? "");
  }, [location.pathname, location.search]);

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
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsWideViewport(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    return () => {
      if (accountCloseTimerRef.current !== null) window.clearTimeout(accountCloseTimerRef.current);
      if (megaCloseTimerRef.current !== null) window.clearTimeout(megaCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const t = event.target as HTMLElement | null;
      if (!t) return;
      if (headerRef.current?.contains(t)) return;
      if (t.closest?.(".sp-mobile-overlay")) return;
      closeAllPanels();
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAllPanels();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [closeAllPanels]);

  /** Chỉ đóng panel khi đổi route (pathname), tránh reset khi chỉ đổi query trên cùng trang. */
  useEffect(() => {
    closeAllPanels();
  }, [location.pathname, closeAllPanels]);

  const showDesktopMega = isWideViewport && isMegaOpen;

  return (
    <header className="shoppro-header" ref={headerRef}>
      <div className="sp-topbar">
        <div className="sp-topbar-inner">
          <p className="sp-topbar-tagline">
            Linh kiện PC hiệu năng cao <span>cho gaming, làm việc và sáng tạo</span>
          </p>
          <nav className="sp-topbar-nav" aria-label="Tiện ích nhanh">
            {STORE_QUICK_LINKS.map((item) => (
              <Link key={item.to} to={item.to} className="sp-topbar-link">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="sp-topbar-meta">
            <Link to="/contact" className="sp-topbar-meta-link">
              <IconWrench className="sp-header-icon" aria-hidden />
              Hỗ trợ kỹ thuật
            </Link>
            <span className="sp-topbar-meta-item">
              <IconUser className="sp-header-icon" aria-hidden />
              {isLoggedIn ? `Xin chào, ${user?.username}` : "Khách"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="sp-mega-hover-root"
        onMouseLeave={() => {
          if (isWideViewport) scheduleMegaClose();
        }}
      >
        <div className="sp-header-main">
          <div className="sp-header-row">
            <Link to="/" className="sp-brand">
              <img className="sp-brand-logo" src="/logo-shoppro.png" alt="ShopPro" />
              <span className="sp-brand-text">SHOPPRO</span>
            </Link>

            <button
              type="button"
              className="sp-mobile-toggle sp-show-mobile"
              aria-expanded={isMobileMenuOpen}
              aria-controls="sp-mobile-drawer"
              onClick={() => {
                setIsMobileMenuOpen((v) => !v);
                setIsMegaOpen(false);
                setIsSearchOpen(false);
                closeAccountMenu();
              }}
            >
              <IconMenu className="sp-header-icon" aria-hidden />
              <span className="sp-sr-only">{isMobileMenuOpen ? "Đóng menu" : "Mở menu"}</span>
            </button>

            <nav className="sp-primary-nav sp-show-desktop" aria-label="Điều hướng chính">
              <NavLink to="/" end className={navClassName}>
                <span className="sp-nav-inner">
                  <IconHome className="sp-header-icon" aria-hidden />
                  Trang chủ
                </span>
              </NavLink>

              <div
                className="sp-nav-mega-trigger"
                onMouseEnter={() => {
                  if (isWideViewport) openMega();
                }}
              >
                <NavLink
                  to="/products"
                  className={({ isActive }) =>
                    `${isActive && !isClearanceRoute ? "sp-nav-link is-active" : "sp-nav-link"} sp-nav-products`
                  }
                  onMouseEnter={() => {
                    if (isWideViewport) openMega();
                  }}
                >
                  <span className="sp-nav-inner">
                    <IconBox className="sp-header-icon" aria-hidden />
                    Sản phẩm
                  </span>
                </NavLink>
              </div>

              <NavLink to="/blog" className={navClassName} onMouseEnter={closeMegaOnly}>
                <span className="sp-nav-inner">
                  <IconSpark className="sp-header-icon" aria-hidden />
                  Blog
                </span>
              </NavLink>

              <NavLink to="/contact" className={navClassName} onMouseEnter={closeMegaOnly}>
                <span className="sp-nav-inner">Liên hệ</span>
              </NavLink>

              {showOwnerExecutiveNav ? (
                <NavLink to="/owner" className={navClassName} onMouseEnter={closeMegaOnly}>
                  <span className="sp-nav-inner">
                    <IconGauge className="sp-header-icon" aria-hidden />
                    Điều hành
                  </span>
                </NavLink>
              ) : null}
              {showStaffNav ? (
                <NavLink to="/staff" className={navClassName} onMouseEnter={closeMegaOnly}>
                  <span className="sp-nav-inner">
                    <IconTeam className="sp-header-icon" aria-hidden />
                    Vận hành
                  </span>
                </NavLink>
              ) : null}
              {isAdminOrOwner ? (
                <NavLink to="/admin" className={navClassName} onMouseEnter={closeMegaOnly}>
                  <span className="sp-nav-inner">
                    <IconShield className="sp-header-icon" aria-hidden />
                    Quản trị
                  </span>
                </NavLink>
              ) : null}
              {showCustomerLinks ? (
                <NavLink to="/cart" className={navClassName} onMouseEnter={closeMegaOnly}>
                  <span className="sp-nav-inner">
                    <IconCart className="sp-header-icon" aria-hidden />
                    Giỏ hàng
                  </span>
                </NavLink>
              ) : null}
            </nav>

            <div className="sp-header-actions">
              <button
                type="button"
                className={`sp-action-icon${isSearchOpen ? " is-active" : ""}`}
                onClick={() => {
                  setIsSearchOpen((p) => !p);
                  setIsMegaOpen(false);
                  closeAccountMenu();
                  setIsMobileMenuOpen(false);
                }}
                aria-expanded={isSearchOpen}
                aria-controls="shoppro-search-panel"
                aria-label="Tìm kiếm sản phẩm"
              >
                <IconSearch className="sp-header-icon" aria-hidden />
              </button>

              <button
                type="button"
                className={`sp-action-category sp-show-desktop${showDesktopMega ? " is-active" : ""}`}
                onClick={() => {
                  setIsMegaOpen((p) => !p);
                  setIsSearchOpen(false);
                  closeAccountMenu();
                  setIsMobileMenuOpen(false);
                }}
                aria-expanded={showDesktopMega}
                aria-controls="shoppro-mega-menu"
                onMouseEnter={() => {
                  if (isWideViewport) openMega();
                }}
              >
                <span className="sp-nav-inner">
                  <IconGrid className="sp-header-icon" aria-hidden />
                  Danh mục
                </span>
              </button>

              <button
                type="button"
                className={`sp-action-category sp-show-mobile${isMobileMenuOpen ? " is-active" : ""}`}
                onClick={() => {
                  setIsMobileMenuOpen(true);
                  setIsMegaOpen(false);
                  setIsSearchOpen(false);
                  closeAccountMenu();
                }}
                aria-label="Mở danh mục sản phẩm"
              >
                <IconGrid className="sp-header-icon" aria-hidden />
              </button>

              <div
                className={`sp-account-wrap${isAccountMenuOpen ? " is-open" : ""}`}
                onMouseEnter={handleAccountMenuMouseEnter}
                onMouseLeave={handleAccountMenuMouseLeave}
                onBlur={handleAccountMenuBlur}
                ref={accountMenuRef}
              >
                <button
                  type="button"
                  id={accountMenuTriggerId}
                  ref={accountTriggerRef}
                  className={`sp-action-icon sp-account-trigger${isAccountMenuOpen ? " is-active" : ""}`}
                  onClick={handleAccountTriggerClick}
                  onKeyDown={handleAccountTriggerKeyDown}
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="true"
                  aria-controls={accountMenuPanelId}
                  aria-label={isLoggedIn ? "Menu tài khoản" : "Đăng nhập / Đăng ký"}
                >
                  <IconUser className="sp-header-icon" aria-hidden />
                  <span className="sp-account-caret" aria-hidden="true">
                    {isAccountMenuOpen ? "▴" : "▾"}
                  </span>
                </button>

                {isAccountMenuOpen ? (
                  <div
                    id={accountMenuPanelId}
                    className="sp-account-dropdown"
                    role="menu"
                    aria-label="Tài khoản"
                    onKeyDown={handleAccountMenuKeyDown}
                  >
                    <AccountMenuItems items={accountMenuRows} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {showDesktopMega ? (
          <div
            id="shoppro-mega-menu"
            className="sp-mega-shell"
            onMouseEnter={() => {
              clearMegaCloseTimer();
              setIsMegaOpen(true);
            }}
          >
            <div className="sp-mega-container">
              <MegaMenu
                groups={megaGroupsResolved}
                featured={MEGA_MENU_FEATURED}
                onNavigate={() => setIsMegaOpen(false)}
              />
            </div>
          </div>
        ) : null}
      </div>

      {isSearchOpen ? (
        <section id="shoppro-search-panel" className="sp-search-panel" aria-label="Tìm kiếm">
          <form className="sp-search-form" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm sản phẩm, thương hiệu, danh mục..."
              autoFocus
              aria-label="Từ khóa tìm kiếm"
            />
            <button type="submit" className="sp-search-submit">
              <IconSearch className="sp-header-icon" aria-hidden />
              Tìm
            </button>
          </form>
        </section>
      ) : null}

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        groups={megaGroupsResolved}
        featured={MEGA_MENU_FEATURED}
        utilityLinks={[...STORE_QUICK_LINKS]}
      />
    </header>
  );
}

