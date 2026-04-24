import type { SVGProps } from "react";

/* -------------------------------------------------------------------------- *
 *  CategoryIcon                                                              *
 *                                                                            *
 *  Outline SVG icons (stroke-based) for PC component categories. Chosen by   *
 *  loose matching on the category name (works for VN + EN + API values).     *
 *  All icons share: viewBox 0 0 24 24, 1.5 stroke width, round caps/joins    *
 *  so they look visually consistent inside the "Shop by category" grid.     *
 * -------------------------------------------------------------------------- */

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

// CPU / bộ xử lý
function IconCpu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="0.5" />
      <path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3" />
    </svg>
  );
}

// Mainboard / bo mạch chủ
function IconMainboard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="1.5" />
      <rect x="6.5" y="6.5" width="5" height="5" rx="0.5" />
      <path d="M14 7h4M14 9.5h4M14 12h4" />
      <rect x="6.5" y="14.5" width="11" height="3" rx="0.5" />
      <circle cx="8" cy="16" r="0.6" />
      <circle cx="11" cy="16" r="0.6" />
      <circle cx="14" cy="16" r="0.6" />
    </svg>
  );
}

// RAM / bộ nhớ
function IconRam(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8h18v7a1 1 0 0 1-1 1h-2v-2h-3v2h-3v-2h-3v2H6v-2H4a1 1 0 0 1-1-1Z" />
      <path d="M6 11h2M10 11h2M14 11h2M18 11h1" />
    </svg>
  );
}

// VGA / GPU / card đồ hoạ
function IconGpu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="7" width="19" height="10" rx="1.5" />
      <circle cx="8" cy="12" r="2.25" />
      <circle cx="15" cy="12" r="2.25" />
      <path d="M5 17v2M9 17v2M13 17v2M17 17v2" />
    </svg>
  );
}

// SSD
function IconSsd(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M7 10h10M7 13h7" />
      <circle cx="17" cy="14" r="0.8" />
    </svg>
  );
}

// HDD
function IconHdd(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
      <path d="M15 9l2-1" />
    </svg>
  );
}

// PSU / nguồn máy tính
function IconPsu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <circle cx="9" cy="12" r="3" />
      <path d="M9 9.5v2.5l1.5 1" />
      <rect x="14" y="9" width="5" height="2" rx="0.4" />
      <rect x="14" y="13" width="3" height="1.5" rx="0.4" />
    </svg>
  );
}

// Case PC / vỏ máy
function IconCase(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="2.5" width="12" height="19" rx="1.5" />
      <path d="M9 6h6M9 9h6" />
      <circle cx="12" cy="14" r="2" />
      <path d="M10 18.5h4" />
    </svg>
  );
}

// Cooling / tản nhiệt / quạt
function IconCooling(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 10.4c0-3 -1.5 -5.5 -4 -6.2M13.6 12c3 0 5.5 -1.5 6.2 -4M12 13.6c0 3 1.5 5.5 4 6.2M10.4 12c-3 0 -5.5 1.5 -6.2 4" />
    </svg>
  );
}

// Monitor / màn hình
function IconMonitor(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="4" width="19" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

// Keyboard / bàn phím
function IconKeyboard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="1.5" />
      <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 13h.01M9 13h.01M12 13h.01M15 13h.01M18 13h.01M7.5 15.5h9" />
    </svg>
  );
}

// Mouse / chuột
function IconMouse(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="3" width="12" height="18" rx="6" />
      <path d="M12 7v4" />
    </svg>
  );
}

// Headset / tai nghe
function IconHeadset(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1" />
      <rect x="17" y="14" width="4" height="6" rx="1" />
      <path d="M17 20h1a3 3 0 0 0 3-3" />
    </svg>
  );
}

// Chair / ghế
function IconChair(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3h10l-1 8H8Z" />
      <path d="M6 11h12" />
      <path d="M8 11v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4" />
      <path d="M9 17l-1 4M15 17l1 4" />
    </svg>
  );
}

// Gaming PC (fallback)
function IconGamingPc(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="13" height="16" rx="1.5" />
      <path d="M6 7h7M6 10h5" />
      <circle cx="9.5" cy="15" r="2" />
      <path d="M18 8l3 2v6l-3 2" />
    </svg>
  );
}

/* --------------------- Matching (name → icon) --------------------- */

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type Rule = { hints: string[]; Icon: (props: IconProps) => JSX.Element };

const RULES: Rule[] = [
  { hints: ["quat tan nhiet", "tan nhiet", "cooler", "aio", "lam mat", "fan"], Icon: IconCooling },
  { hints: ["man hinh", "monitor", "display"], Icon: IconMonitor },
  { hints: ["tai nghe", "headphone", "headset"], Icon: IconHeadset },
  { hints: ["ban phim", "keyboard"], Icon: IconKeyboard },
  { hints: ["chuot", "mouse"], Icon: IconMouse },
  { hints: ["ghe", "chair", "furniture", "ban ghe"], Icon: IconChair },
  { hints: ["nguon", "psu", "power supply"], Icon: IconPsu },
  { hints: ["mainboard", "motherboard", "mach chu", "bo mach chu", "main board"], Icon: IconMainboard },
  { hints: ["ssd", "nvme", "m.2", "m2"], Icon: IconSsd },
  { hints: ["hdd", "hard disk", "o cung"], Icon: IconHdd },
  { hints: ["vga", "gpu", "graphics", "card do hoa"], Icon: IconGpu },
  { hints: ["case", "vo may", "thung may"], Icon: IconCase },
  { hints: ["cpu", "bo xu ly", "vi xu ly", "processor"], Icon: IconCpu },
  { hints: ["ram", "bo nho", "memory"], Icon: IconRam },
  { hints: ["pc choi game", "gaming pc", "dan may", "pc gaming"], Icon: IconGamingPc }
];

export function CategoryIcon({
  name,
  className,
  ...rest
}: { name: string } & Omit<IconProps, "ref">) {
  const n = normalize(name);
  const match = RULES.find((rule) => rule.hints.some((h) => n.includes(normalize(h))));
  const Icon = match?.Icon ?? IconGamingPc;
  return <Icon className={className} {...rest} />;
}
