export type AuthUser = {
  username: string;
  roles: string[];
};

export type AdminUserRole = "owner" | "admin" | "staff" | "user";

export type AdminUser = {
  id: number;
  username: string;
  role: AdminUserRole;
  locked: boolean;
  roles: string[];
};

export type Category = {
  id: number;
  name: string;
};

export type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  categoryId: number | null;
  categoryName: string | null;
};

export type ProductPageResponse = {
  items: Product[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export type CartItem = {
  productId: number;
  productName: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  subtotal: number;
};

export type CartResponse = {
  items: CartItem[];
  totalQuantity: number;
  totalAmount: number;
};

export type CheckoutResponse = {
  orderId: number;
};

export type OrderDetail = {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type OrderResponse = {
  id: number;
  createdAt: string;
  totalAmount: number;
  totalQuantity: number;
  details: OrderDetail[];
};

export type OwnerRecentOrder = {
  id: number;
  createdAt: string;
  status: string;
  totalAmount: number;
  customerUsername: string;
};

export type OwnerOverview = {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  estimatedProfit: number;
  estimatedProfitRate: number;
  adminCount: number;
  staffCount: number;
  activeManagementAccounts: number;
  lockedManagementAccounts: number;
  recentOrders: OwnerRecentOrder[];
};

export type AdminOrderItem = {
  id: number;
  createdAt: string;
  orderStatus: string;
  totalAmount: number;
  paymentMethod: string | null;
  receiverName: string | null;
  customerUsername: string;
  itemCount: number;
};

export type AdminOrderDetailItem = {
  id: number;
  productId: number | null;
  productName: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type AdminOrderDetailResponse = {
  id: number;
  createdAt: string;
  orderStatus: string;
  totalAmount: number;
  paymentMethod: string | null;
  receiverName: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  customerUsername: string;
  details: AdminOrderDetailItem[];
};

export type AdminProductOpsItem = {
  id: number;
  name: string;
  slug: string;
  categoryId: number | null;
  categoryName: string | null;
  brandId: number | null;
  brandName: string | null;
  price: number;
  discountPrice: number | null;
  quantity: number;
  shortDescription: string | null;
  description: string | null;
  specifications: string | null;
  image: string | null;
  thumbnail: string | null;
  status: string;
  createdAt: string;
};

export type AdminBrandItem = {
  id: number;
  name: string;
  description: string | null;
  status: string;
};

export type AdminProductUpsertPayload = {
  name: string;
  slug?: string | null;
  categoryId: number;
  brandId: number;
  price: number;
  discountPrice?: number | null;
  quantity: number;
  shortDescription?: string | null;
  description?: string | null;
  specifications?: string | null;
  image?: string | null;
  thumbnail?: string | null;
  status?: string | null;
};

export type AdminCloudinaryUploadResponse = {
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  productId: number | null;
};

export type AdminDataIssue = {
  code: string;
  message: string;
  referenceId: number | null;
};
