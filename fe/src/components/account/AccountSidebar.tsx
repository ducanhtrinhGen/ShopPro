export const ACCOUNT_SECTION_IDS = [
  "overview",
  "edit-profile",
  "change-password",
  "all-orders",
  "wishlist"
] as const;

export type AccountSectionId = (typeof ACCOUNT_SECTION_IDS)[number];

export function isAccountSectionId(value: string | null | undefined): value is AccountSectionId {
  return value != null && ACCOUNT_SECTION_IDS.includes(value as AccountSectionId);
}

const NAV_ITEMS: Array<{ id: AccountSectionId; label: string }> = [
  { id: "overview", label: "Thông tin chung" },
  { id: "edit-profile", label: "Chỉnh sửa hồ sơ" },
  { id: "change-password", label: "Đổi mật khẩu" },
  { id: "all-orders", label: "Tất cả đơn hàng" },
  { id: "wishlist", label: "Yêu thích" }
];

type AccountSidebarProps = {
  displayName: string;
  username: string;
  emailPreview: string | null;
  activeSection: AccountSectionId;
  onSelectSection: (sectionId: AccountSectionId) => void;
};

export function AccountSidebar({
  displayName,
  username,
  emailPreview,
  activeSection,
  onSelectSection
}: AccountSidebarProps) {
  return (
    <aside className="account-sidebar" aria-label="Menu tài khoản">
      <div className="account-sidebar-card">
        <div className="account-sidebar-user">
          <div className="account-sidebar-avatar" aria-hidden="true">
            {(displayName.slice(0, 1) || "?").toUpperCase()}
          </div>
          <div className="account-sidebar-user-text">
            <p className="account-sidebar-kicker">Tài khoản của bạn</p>
            <p className="account-sidebar-name">{displayName}</p>
            <p className="account-sidebar-username">@{username}</p>
            {emailPreview ? <p className="account-sidebar-email">{emailPreview}</p> : null}
          </div>
        </div>
      </div>

      <nav className="account-sidebar-nav" aria-label="Điều hướng tài khoản">
        <ul className="account-sidebar-nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`account-sidebar-link${activeSection === item.id ? " is-active" : ""}`}
                aria-current={activeSection === item.id ? "true" : undefined}
                onClick={() => onSelectSection(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
