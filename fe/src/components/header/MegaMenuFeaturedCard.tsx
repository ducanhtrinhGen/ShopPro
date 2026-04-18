import { Link } from "react-router-dom";
import type { FeaturedMenuCard } from "../../config/megaMenu";
import { IconBox } from "./headerIcons";

type MegaMenuFeaturedCardProps = {
  featured: FeaturedMenuCard;
  onNavigate: () => void;
  variant: "mega" | "mobile";
};

const HEADING_ID = {
  mega: "sp-mega-featured-heading",
  mobile: "sp-mobile-featured-heading"
} as const;

function featuredTopClassName(kicker: string | undefined, badge: string | undefined) {
  return ["sp-mega-featured-top", !kicker && badge ? "sp-mega-featured-top--end" : ""]
    .filter(Boolean)
    .join(" ");
}

export function MegaMenuFeaturedCard({ featured, onNavigate, variant }: MegaMenuFeaturedCardProps) {
  const showTop = Boolean(featured.kicker || featured.badge);
  const headingId = HEADING_ID[variant];

  const card = (
    <div
      className={
        variant === "mega"
          ? "sp-mega-featured-card sp-mega-featured-card--premium"
          : "sp-mega-featured-card sp-mega-featured-card--compact"
      }
    >
      {showTop ? (
        <div className={featuredTopClassName(featured.kicker, featured.badge)}>
          {featured.kicker ? <span className="sp-mega-featured-kicker">{featured.kicker}</span> : null}
          {featured.badge ? <span className="sp-mega-featured-badge-pill">{featured.badge}</span> : null}
        </div>
      ) : null}
      <h3 className="sp-mega-featured-title" id={headingId}>
        {variant === "mega" ? (
          <span className="sp-mega-featured-title-inner">
            <IconBox className="sp-mega-featured-title-icon" />
            <span className="sp-mega-featured-title-text">{featured.title}</span>
          </span>
        ) : (
          featured.title
        )}
      </h3>
      <p className="sp-mega-featured-desc">{featured.description}</p>
      <Link to={featured.href} className="sp-mega-featured-cta" onClick={onNavigate}>
        <span className="sp-mega-featured-cta-label">{featured.ctaLabel}</span>
        <span className="sp-mega-featured-cta-arrow" aria-hidden="true">
          →
        </span>
      </Link>
    </div>
  );

  if (variant === "mobile") {
    return card;
  }

  return (
    <aside className="sp-mega-featured" aria-labelledby={headingId}>
      {card}
    </aside>
  );
}
