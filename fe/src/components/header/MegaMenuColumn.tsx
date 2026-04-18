import { Link } from "react-router-dom";
import type { MegaMenuGroup } from "../../config/megaMenu";
import { MegaMenuGroupTitleIcon } from "./megaMenuTitleIcons";

type MegaMenuColumnProps = {
  group: MegaMenuGroup;
  onNavigate: () => void;
};

export function MegaMenuColumn({ group, onNavigate }: MegaMenuColumnProps) {
  return (
    <div className="sp-mega-col">
      <h3 className="sp-mega-col-title">
        <span className="sp-mega-col-title-inner">
          <MegaMenuGroupTitleIcon name={group.titleIcon} />
          <span className="sp-mega-col-title-text">{group.title}</span>
        </span>
      </h3>
      <ul className="sp-mega-col-list">
        {group.items.map((item) => (
          <li key={`${group.id}-${item.label}`}>
            <Link to={item.href} className="sp-mega-link" onClick={onNavigate}>
              <span className="sp-mega-link-label">{item.label}</span>
              {item.badge ? <span className="sp-nav-badge">{item.badge}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
