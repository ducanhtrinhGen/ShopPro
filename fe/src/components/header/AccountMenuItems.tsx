import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export type AccountMenuRow =
  | { key: string; kind: "login"; label: string; icon: ReactNode; onLogin: () => void }
  | { key: string; kind: "register"; label: string; icon: ReactNode; onRegister: () => void }
  | { key: string; kind: "link"; label: string; icon: ReactNode; to: string; onNavigate: () => void }
  | { key: string; kind: "logout"; label: string; icon: ReactNode; onLogout: () => void };

type AccountMenuItemsProps = {
  items: AccountMenuRow[];
};

export function AccountMenuItems({ items }: AccountMenuItemsProps) {
  return (
    <>
      {items.map((item) => {
        if (item.kind === "login") {
          return (
            <button
              key={item.key}
              type="button"
              className="sp-account-item"
              data-account-menu-item="true"
              role="menuitem"
              onClick={item.onLogin}
            >
              <span className="sp-nav-inner">
                {item.icon}
                {item.label}
              </span>
            </button>
          );
        }
        if (item.kind === "register") {
          return (
            <button
              key={item.key}
              type="button"
              className="sp-account-item"
              data-account-menu-item="true"
              role="menuitem"
              onClick={item.onRegister}
            >
              <span className="sp-nav-inner">
                {item.icon}
                {item.label}
              </span>
            </button>
          );
        }
        if (item.kind === "link") {
          return (
            <Link
              key={item.key}
              to={item.to}
              className="sp-account-item"
              data-account-menu-item="true"
              role="menuitem"
              onClick={item.onNavigate}
            >
              <span className="sp-nav-inner">
                {item.icon}
                {item.label}
              </span>
            </Link>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            className="sp-account-item"
            data-account-menu-item="true"
            role="menuitem"
            onClick={item.onLogout}
          >
            <span className="sp-nav-inner">
              {item.icon}
              {item.label}
            </span>
          </button>
        );
      })}
    </>
  );
}
