export const heroVisuals = [
  "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1614294149010-950b698f72c0?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&w=1800&q=80"
];

/** Cùng crop / chất lượng cho mọi ảnh thẻ danh mục (ảnh sản phẩm giữa thẻ như Corsair). */
const CAT_IMG = "?auto=format&fit=crop&w=1000&q=85";

/** Ảnh riêng theo loại linh kiện (không xoay theo index ô lưới). */
const CATEGORY_IMAGES = {
  cpu: `https://images.unsplash.com/photo-1588872657578-7efd1f1558ee${CAT_IMG}`,
  mainboard: `https://images.unsplash.com/photo-1518770660439-4636190af475${CAT_IMG}`,
  ram: `https://images.unsplash.com/photo-1562976540-1502c2145186${CAT_IMG}`,
  gpu: `https://images.unsplash.com/photo-1612196808210-fe5974287225${CAT_IMG}`,
  ssd: `https://images.unsplash.com/photo-1625842268584-8f3296236761${CAT_IMG}`,
  hdd: `https://images.unsplash.com/photo-1531492746076-161ca9bcad00${CAT_IMG}`,
  psu: `https://images.unsplash.com/photo-1581092160562-40aa08e78837${CAT_IMG}`,
  casePc: `https://images.unsplash.com/photo-1587202372634-32705e3bf49c${CAT_IMG}`,
  cooling: `https://images.unsplash.com/photo-1587831990711-23ca6441447c${CAT_IMG}`,
  monitor: `https://images.unsplash.com/photo-1527443224154-c956a432b358${CAT_IMG}`,
  keyboard: `https://images.unsplash.com/photo-1555617981-dac3880eac6e${CAT_IMG}`,
  mouse: `https://images.unsplash.com/photo-1618384887929-16ec33fab9ef${CAT_IMG}`,
  headset: `https://images.unsplash.com/photo-1583394838336-acd977736f90${CAT_IMG}`,
  chair: `https://images.unsplash.com/photo-1587202372775-e229f172b9d7${CAT_IMG}`,
  gamingPc: `https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea${CAT_IMG}`
} as const;

function normCategoryKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gợi ý ảnh nền cho thẻ "Mua theo danh mục" theo tên (API hoặc fallback).
 * Thứ tự: cụm từ cụ thể trước, từ ngắn sau để tránh khớp nhầm.
 */
export function categoryHeroImage(categoryName: string): string {
  const n = normCategoryKey(categoryName);

  const rules: { hints: string[]; url: string }[] = [
    { hints: ["quat tan nhiet", "tan nhiet", "cooler", "aio", "lam mat"], url: CATEGORY_IMAGES.cooling },
    { hints: ["man hinh", "monitor", "display"], url: CATEGORY_IMAGES.monitor },
    { hints: ["tai nghe", "headphone", "headset"], url: CATEGORY_IMAGES.headset },
    { hints: ["ban phim", "keyboard"], url: CATEGORY_IMAGES.keyboard },
    { hints: ["chuot", "mouse"], url: CATEGORY_IMAGES.mouse },
    { hints: ["ban ghe", "ghe gaming", "furniture"], url: CATEGORY_IMAGES.chair },
    { hints: ["nguon", "psu", "power supply"], url: CATEGORY_IMAGES.psu },
    { hints: ["mainboard", "motherboard", "mach chu", "bo mach chu", "main board"], url: CATEGORY_IMAGES.mainboard },
    { hints: ["ssd", "nvme", "m.2", "m2"], url: CATEGORY_IMAGES.ssd },
    { hints: ["hdd", "hard disk", "o cung"], url: CATEGORY_IMAGES.hdd },
    { hints: ["vga", "gpu", "graphics"], url: CATEGORY_IMAGES.gpu },
    { hints: ["case", "vo may", "thung may"], url: CATEGORY_IMAGES.casePc },
    { hints: ["cpu", "bo xu ly", "vi xu ly", "processor"], url: CATEGORY_IMAGES.cpu },
    { hints: ["ram", "bo nho"], url: CATEGORY_IMAGES.ram },
    { hints: ["pc choi game", "gaming pc", "dan may"], url: CATEGORY_IMAGES.gamingPc }
  ];

  for (const { hints, url } of rules) {
    if (hints.some((h) => n.includes(normCategoryKey(h)))) {
      return url;
    }
  }

  return CATEGORY_IMAGES.gamingPc;
}

/** Ảnh dự phòng cho khối hướng dẫn (không gắn với tên danh mục). */
export const categoryVisuals = [
  "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1591405351990-4726e331f141?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80"
];

export const fallbackCategoryNames = [
  "Vỏ máy",
  "PC chơi game",
  "RAM và bộ nhớ",
  "Bàn phím",
  "Tai nghe",
  "Nguồn máy tính",
  "Tản nhiệt",
  "Chuột gaming",
  "Quạt tản nhiệt",
  "Bàn ghế setup"
];

export const serviceBenefits = [
  "Ưu đãi độc quyền và combo",
  "Giao hàng nhanh nội thành",
  "Tư vấn trực tiếp với chuyên viên",
  "Đổi trả minh bạch trong 7 ngày"
];
