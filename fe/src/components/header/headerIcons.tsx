import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

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

export function IconHome(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5.5 10.5V20h13V10.5" />
      <path d="M10 20v-6h4v6" />
    </IconBase>
  );
}

export function IconBox(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" />
      <path d="M12 21v-9.3" />
      <path d="M3.9 7.8L12 12l8.1-4.2" />
    </IconBase>
  );
}

export function IconTeam(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.4" />
      <path d="M3.6 19c1-2.8 2.9-4.2 5.4-4.2 2.4 0 4.4 1.4 5.4 4.2" />
      <path d="M14.3 19c.6-1.7 1.8-2.7 3.4-3" />
    </IconBase>
  );
}

export function IconCart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H7" />
      <circle cx="10" cy="20" r="1.7" />
      <circle cx="18" cy="20" r="1.7" />
    </IconBase>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20.6 8.1c0 4.9-8.6 10.6-8.6 10.6S3.4 13 3.4 8.1c0-2.4 1.9-4.3 4.3-4.3 1.6 0 3 .8 3.7 2.1.7-1.3 2.2-2.1 3.7-2.1 2.4 0 4.3 1.9 4.3 4.3z" />
    </IconBase>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.3" />
      <rect x="13" y="4" width="7" height="7" rx="1.3" />
      <rect x="4" y="13" width="7" height="7" rx="1.3" />
      <rect x="13" y="13" width="7" height="7" rx="1.3" />
    </IconBase>
  );
}

export function IconGauge(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 16a7 7 0 1 1 14 0" />
      <path d="M12 13l4-4" />
      <circle cx="12" cy="16" r="1.6" />
    </IconBase>
  );
}

export function IconShield(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 3v6c0 5-3.2 8.4-7 9-3.8-.6-7-4-7-9V6l7-3z" />
    </IconBase>
  );
}

export function IconWrench(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14.8 6.4a4 4 0 0 0-4.9 4.9L4.4 16.8a1.7 1.7 0 1 0 2.4 2.4l5.5-5.5a4 4 0 0 0 4.9-4.9L14.8 11 13 9.2z" />
    </IconBase>
  );
}

export function IconUser(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4 19.5c1.4-3.2 4-5 8-5s6.6 1.8 8 5" />
    </IconBase>
  );
}

export function IconArrowOut(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 7h6v6" />
      <path d="M10 14L20 7" />
      <path d="M10 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
    </IconBase>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.2-4.2" />
    </IconBase>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}

export function IconClose(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </IconBase>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.6 16.3l-2.1 2.1" />
    </IconBase>
  );
}

/** Mega menu — nhóm linh kiện / CPU board */
export function IconMenuMegaCpu(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9 4v2M12 4v2M15 4v2M9 18v2M12 18v2M15 18v2M4 9h2M4 12h2M4 15h2M18 9h2M18 12h2M18 15h2" />
    </IconBase>
  );
}

/** Mega menu — gaming gear */
export function IconMenuMegaGamepad(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.5 11h11a5 5 0 0 1 5 5v1.5H3.5V16a5 5 0 0 1 3-5z" />
      <circle cx="9" cy="15.5" r="1.1" />
      <circle cx="15" cy="15.5" r="1.1" />
      <path d="M17 12.5v3" />
    </IconBase>
  );
}

/** Mega menu — màn hình / hiển thị */
export function IconMenuMegaMonitor(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M9 19h6M12 16v3" />
    </IconBase>
  );
}

/** Mega menu — phụ kiện / kết nối */
export function IconMenuMegaPlug(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 5v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V5" />
      <path d="M13 5v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V5" />
      <rect x="7" y="10" width="10" height="9" rx="1.5" />
      <path d="M12 19v2" />
    </IconBase>
  );
}
