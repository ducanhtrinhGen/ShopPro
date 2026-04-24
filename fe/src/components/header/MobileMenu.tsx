import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import type { FeaturedMenuCard, MegaMenuGroup } from "../../config/megaMenu";
import { MegaMenuFeaturedCard } from "./MegaMenuFeaturedCard";
import { IconClose } from "./headerIcons";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  groups: MegaMenuGroup[];
  featured: FeaturedMenuCard;
  utilityLinks: ReadonlyArray<{ label: string; to: string }>;
};

export function MobileMenu({ isOpen, onClose, groups, featured, utilityLinks }: MobileMenuProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const drawer = (
    <div className="sp-mobile-overlay" role="presentation">
      <button type="button" className="sp-mobile-overlay-backdrop" aria-label="Đóng menu" onClick={onClose} />
      <div
        id="sp-mobile-drawer"
        className="sp-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-mobile-drawer-heading"
      >
        <div className="sp-mobile-drawer-head">
          <h2 id="sp-mobile-drawer-heading" className="sp-mobile-drawer-title">
            Menu
          </h2>
          <button type="button" className="sp-mobile-close" onClick={onClose} aria-label="Đóng">
            <IconClose className="sp-header-icon" />
          </button>
        </div>

        <nav className="sp-mobile-quick" aria-label="Liên kết nhanh">
          <Link to="/products?clearanceOnly=1" className="sp-mobile-quick-link sp-mobile-quick-link--clearance" onClick={onClose}>
            Hàng cũ
          </Link>
          {utilityLinks.map((l) => (
            <Link key={`${l.label}-${l.to}`} to={l.to} className="sp-mobile-quick-link" onClick={onClose}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="sp-mobile-featured" role="region" aria-labelledby="sp-mobile-featured-heading">
          <MegaMenuFeaturedCard featured={featured} onNavigate={onClose} variant="mobile" />
        </div>

        <div className="sp-mobile-accordions">
          {groups.map((group) => (
            <details key={group.id} className="sp-mobile-details">
              <summary className="sp-mobile-summary">{group.title}</summary>
              <ul className="sp-mobile-sublist">
                {group.items.map((item) => (
                  <li key={`${group.id}-${item.label}`}>
                    <Link to={item.href} className="sp-mobile-sub-link" onClick={onClose}>
                      {item.label}
                      {item.badge ? <span className="sp-nav-badge">{item.badge}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(drawer, document.body);
}

