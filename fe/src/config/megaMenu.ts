import type { Category } from "../types";

export type MegaMenuLinkItem = {
  label: string;
  href: string;
  badge?: string;
  /** Gợi ý khớp với `Category.name` từ API (không phân biệt hoa thường, chuỗi con). */
  categoryHint?: string;
};

/** Icon nhóm cột mega (map trong UI, không ảnh hưởng routing). */
export type MegaMenuGroupTitleIcon = "components" | "gaming" | "display" | "accessories" | "spark";

export type MegaMenuGroup = {
  id: string;
  title: string;
  /** Icon cạnh tiêu đề nhóm — optional cho API-driven menu */
  titleIcon?: MegaMenuGroupTitleIcon;
  items: MegaMenuLinkItem[];
};

export type FeaturedMenuCard = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  /** Nhãn phụ (vd. "Gợi ý", "Khuyến mãi") — API có thể gán động */
  kicker?: string;
  /** Badge góc (vd. "Nổi bật", "Mới", "Hot") */
  badge?: string;
};

/**
 * Gói cấu hình mega menu — sau này có thể thay bằng `fetch('/api/navigation/mega')`.
 * Component chỉ đọc `groups` + `featured`, không hardcode cấu trúc cột trong JSX.
 */
export type MegaMenuConfig = {
  groups: MegaMenuGroup[];
  featured: FeaturedMenuCard;
};

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Gắn `categoryId` vào href khi tìm được category khớp `categoryHint`.
 * Giữ nguyên href tĩnh nếu không khớp.
 */
export function applyCategoryHintsToMegaMenu(groups: MegaMenuGroup[], categories: Category[]): MegaMenuGroup[] {
  if (!categories.length) return groups;

  return groups.map((g) => ({
    ...g,
    items: g.items.map((item) => {
      if (!item.categoryHint) return item;
      const hint = norm(item.categoryHint);
      const match = categories.find((c) => {
        const n = norm(c.name);
        return n === hint || n.includes(hint) || hint.includes(n);
      });
      if (!match) return item;
      return {
        ...item,
        href: `/products?categoryId=${match.id}`
      };
    })
  }));
}

/** Nội dung khối nổi bật trong mega menu — có thể map từ CMS / API. */
export const MEGA_MENU_FEATURED: FeaturedMenuCard = {
  kicker: "Khám phá",
  badge: "Nổi bật",
  title: "Build PC & gaming setup",
  description:
    "Tư vấn cấu hình theo ngân sách, linh kiện tương thích và ưu đãi trong tuần — phù hợp gaming, làm việc và sáng tạo.",
  href: "/contact",
  ctaLabel: "Nhận tư vấn build"
};

export const MEGA_MENU_GROUPS: MegaMenuGroup[] = [
  {
    id: "pc-components",
    title: "PC Components",
    titleIcon: "components",
    items: [
      { label: "CPU", href: "/products?keyword=CPU", categoryHint: "cpu" },
      { label: "Mainboard", href: "/products?keyword=Mainboard", categoryHint: "mainboard" },
      { label: "RAM", href: "/products?keyword=RAM", categoryHint: "ram" },
      { label: "VGA", href: "/products?keyword=VGA", categoryHint: "vga" },
      { label: "SSD", href: "/products?keyword=SSD", categoryHint: "ssd" },
      { label: "HDD", href: "/products?keyword=HDD", categoryHint: "hdd" },
      { label: "PSU", href: "/products?keyword=PSU", categoryHint: "psu" },
      { label: "Case PC", href: "/products?keyword=Case", categoryHint: "case" },
      { label: "Tản nhiệt", href: "/products?keyword=tản nhiệt", categoryHint: "tản" }
    ]
  },
  {
    id: "gaming-gear",
    title: "Gaming Gear",
    titleIcon: "gaming",
    items: [
      { label: "Bàn phím", href: "/products?keyword=bàn phím", categoryHint: "bàn phím" },
      { label: "Chuột", href: "/products?keyword=chuột", categoryHint: "chuột" },
      { label: "Tai nghe", href: "/products?keyword=tai nghe", categoryHint: "tai nghe" },
      { label: "Mousepad", href: "/products?keyword=mousepad", categoryHint: "mousepad" },
      { label: "Tay cầm", href: "/products?keyword=tay cầm", categoryHint: "tay cầm" },
      { label: "Phụ kiện gaming", href: "/products?keyword=gaming", categoryHint: "gaming" }
    ]
  },
  {
    id: "display",
    title: "Hiển thị & Thiết bị",
    titleIcon: "display",
    items: [
      { label: "Màn hình", href: "/products?keyword=màn hình", categoryHint: "màn hình" },
      { label: "Laptop Gaming", href: "/products?keyword=laptop", categoryHint: "laptop" },
      { label: "Hub / Dock", href: "/products?keyword=hub", categoryHint: "hub" },
      { label: "Webcam", href: "/products?keyword=webcam", categoryHint: "webcam" },
      { label: "Loa", href: "/products?keyword=loa", categoryHint: "loa" }
    ]
  },
  {
    id: "accessories",
    title: "Phụ kiện & Mở rộng",
    titleIcon: "accessories",
    items: [
      { label: "Cáp", href: "/products?keyword=cáp", categoryHint: "cáp" },
      { label: "Giá đỡ", href: "/products?keyword=giá đỡ", categoryHint: "giá" },
      { label: "Phụ kiện bàn làm việc", href: "/products?keyword=phụ kiện", categoryHint: "phụ kiện" },
      { label: "Thiết bị lưu trữ ngoài", href: "/products?keyword=ổ ngoài", categoryHint: "lưu trữ" }
    ]
  },
  {
    id: "highlights",
    title: "Khuyến nghị",
    titleIcon: "spark",
    items: [
      { label: "Sản phẩm mới", href: "/products?sort=newest", badge: "Mới" },
      { label: "Bán chạy", href: "/products?sort=discountDesc", badge: "Hot" },
      { label: "Khuyến mãi", href: "/products?promoOnly=1" },
      { label: "Combo", href: "/products?keyword=combo" },
      { label: "Xây dựng PC", href: "/contact" }
    ]
  }
];

/** Một object để inject từ API: `setState(await fetchMegaConfig())` hoặc merge với defaults. */
export const DEFAULT_MEGA_MENU_CONFIG: MegaMenuConfig = {
  groups: MEGA_MENU_GROUPS,
  featured: MEGA_MENU_FEATURED
};
