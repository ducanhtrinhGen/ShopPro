import type { FeaturedMenuCard, MegaMenuGroup } from "../../config/megaMenu";
import { MegaMenuColumn } from "./MegaMenuColumn";
import { MegaMenuFeaturedCard } from "./MegaMenuFeaturedCard";

type MegaMenuProps = {
  groups: MegaMenuGroup[];
  featured: FeaturedMenuCard;
  onNavigate: () => void;
};

export function MegaMenu({ groups, featured, onNavigate }: MegaMenuProps) {
  return (
    <div className="sp-mega-inner">
      <nav className="sp-mega-columns" aria-label="Sản phẩm theo nhóm">
        {groups.map((group) => (
          <MegaMenuColumn key={group.id} group={group} onNavigate={onNavigate} />
        ))}
      </nav>
      <MegaMenuFeaturedCard featured={featured} onNavigate={onNavigate} variant="mega" />
    </div>
  );
}
