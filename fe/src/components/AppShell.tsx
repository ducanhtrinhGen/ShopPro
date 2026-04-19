import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useLoginModal } from "../auth/LoginModalContext";
import { useRegisterModal } from "../auth/RegisterModalContext";
import { useAuth } from "../auth/AuthContext";
import { isCustomerUser } from "../auth/roleUtils";
import { ShopProHeader } from "./header/ShopProHeader";

type FooterColumn = {
  title: string;
  links: Array<{ label: string; href: string; openLoginModal?: boolean; openRegisterModal?: boolean }>;
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

export function AppShell() {
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const { openRegisterModal } = useRegisterModal();
  const location = useLocation();

  const isLoggedIn = Boolean(user);
  const showCustomerLinks = isCustomerUser(user);

  const footerColumns = useMemo<FooterColumn[]>(() => {
    const accountLinks: FooterColumn["links"] =
      isLoggedIn && showCustomerLinks
        ? [
            { label: "Yêu thích", href: "/wishlist" },
            { label: "Đơn hàng của tôi", href: "/orders" },
            { label: "Thông tin khách hàng", href: "/profile" }
          ]
        : [
            { label: "Đăng nhập", href: "/login", openLoginModal: true },
            { label: "Đăng ký", href: "/register", openRegisterModal: true }
          ];

    return [
      ...footerColumnsBase,
      {
        title: "ACCOUNT",
        links: accountLinks
      }
    ];
  }, [isLoggedIn, showCustomerLinks]);

  const isStorefrontRoute = location.pathname === "/" || location.pathname === "/products";

  return (
    <div className="store-shell corsair-shell">
      <ShopProHeader />

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
                    {"openLoginModal" in link && link.openLoginModal ? (
                      <button type="button" className="shoppro-footer-login-button" onClick={() => openLoginModal()}>
                        {link.label}
                      </button>
                    ) : "openRegisterModal" in link && link.openRegisterModal ? (
                      <button type="button" className="shoppro-footer-login-button" onClick={() => openRegisterModal()}>
                        {link.label}
                      </button>
                    ) : (
                      <Link to={link.href}>{link.label}</Link>
                    )}
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
