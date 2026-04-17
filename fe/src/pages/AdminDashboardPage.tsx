import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAdminProduct,
  deleteAdminProduct,
  deleteAdminProductSubImage,
  getAdminBrands,
  getAdminDataIssues,
  getAdminLowStockProducts,
  getAdminOrders,
  getAdminProductSubImages,
  getAdminProducts,
  updateAdminOrderStatus,
  updateAdminProduct,
  uploadAdminCloudinaryImage,
  uploadAdminProductSubImages
} from "../api/adminOperations";
import {
  createManagementUser,
  deleteManagementUser,
  getAdminUsers,
  type ManagementRole,
  updateAdminUserLockState,
  updateAdminUserRole
} from "../api/adminUsers";
import { getCategories } from "../api/catalog";
import { apiRequest, ApiRequestError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { isOwnerUser } from "../auth/roleUtils";
import type {
  AdminBrandItem,
  AdminCloudinaryUploadResponse,
  AdminDataIssue,
  AdminOrderItem,
  AdminProductOpsItem,
  AdminProductSubImageItem,
  AdminProductUpsertPayload,
  AdminUser,
  AdminUserRole,
  Category,
  ProductPageResponse
} from "../types";

type AdminView = "overview" | "categories" | "products" | "orders" | "users";
type OrderStatusFilter = "ALL" | "PENDING" | "PROCESSING" | "SHIPPING" | "COMPLETED" | "CANCELLED";
type ProductStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

type DashboardStats = {
  productTotal: number;
  categoryTotal: number;
  categories: Category[];
};

const ORDER_STATUS_OPTIONS: OrderStatusFilter[] = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "SHIPPING",
  "COMPLETED",
  "CANCELLED"
];

const PRODUCT_STATUS_OPTIONS: ProductStatusFilter[] = ["ALL", "ACTIVE", "INACTIVE"];

const MANAGEMENT_ROLE_OPTIONS: ManagementRole[] = ["admin", "staff", "user"];

type ProductFormState = {
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  price: string;
  discountPrice: string;
  quantity: string;
  shortDescription: string;
  description: string;
  specifications: string;
  image: string;
  thumbnail: string;
  status: ProductStatusFilter;
};

const DEFAULT_PRODUCT_FORM: ProductFormState = {
  name: "",
  slug: "",
  categoryId: "",
  brandId: "",
  price: "",
  discountPrice: "",
  quantity: "0",
  shortDescription: "",
  description: "",
  specifications: "",
  image: "",
  thumbnail: "",
  status: "ACTIVE"
};

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short"
});

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toUpperCase();
}

function toStatusLabel(status: string | null | undefined) {
  const normalized = normalizeStatus(status);
  if (normalized === "PENDING") {
    return "Chờ xác nhận";
  }
  if (normalized === "PROCESSING") {
    return "Đang xử lý";
  }
  if (normalized === "SHIPPING") {
    return "Đang giao";
  }
  if (normalized === "COMPLETED" || normalized === "DELIVERED") {
    return "Hoàn thành";
  }
  if (normalized === "CANCELLED") {
    return "Đã hủy";
  }
  if (normalized === "CONFIRMED") {
    return "Đã xác nhận";
  }
  return status || "Không rõ";
}

function toStatusClass(status: string | null | undefined) {
  const normalized = normalizeStatus(status);
  if (normalized === "PENDING" || normalized === "PROCESSING") {
    return "is-pending";
  }
  if (normalized === "SHIPPING" || normalized === "CONFIRMED") {
    return "is-progress";
  }
  if (normalized === "COMPLETED" || normalized === "DELIVERED") {
    return "is-done";
  }
  if (normalized === "CANCELLED" || normalized === "FAILED") {
    return "is-cancelled";
  }
  return "is-default";
}

function toRoleLabel(role: AdminUserRole) {
  if (role === "owner") {
    return "Owner";
  }
  if (role === "admin") {
    return "Admin";
  }
  if (role === "staff") {
    return "Staff";
  }
  return "User";
}

function toRoleBadgeClass(role: AdminUserRole) {
  if (role === "owner") {
    return "is-owner";
  }
  if (role === "admin") {
    return "is-admin";
  }
  if (role === "staff") {
    return "is-staff";
  }
  return "is-user";
}

function toOrderTag(index: number) {
  if (index % 3 === 0) {
    return "Tháng này";
  }
  if (index % 3 === 1) {
    return "Lưu trữ";
  }
  return "Chờ xử lý";
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

function toDisplayImageUrl(raw: string | null | undefined) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return null;
  }
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  const normalized = trimmed.replace(/\\/g, "/");
  if (normalized.startsWith("products/image/") || normalized.startsWith("api/products/image/")) {
    return `/${normalized}`;
  }
  const filename = normalized.includes("/") ? normalized.slice(normalized.lastIndexOf("/") + 1) : normalized;
  return `/products/image/${encodeURIComponent(filename)}`;
}

function validateImageFile(file: File) {
  if (!file.type || !file.type.startsWith("image/")) {
    return "Chỉ chấp nhận file ảnh (image/*).";
  }

  const name = file.name.toLowerCase();
  const allowed =
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif") ||
    name.endsWith(".avif");
  if (!allowed) {
    return "Định dạng file không hợp lệ. Hãy dùng PNG/JPG/WEBP.";
  }

  return null;
}

function roleFromSelect(role: string): ManagementRole {
  if (role === "admin" || role === "staff" || role === "user") {
    return role;
  }
  return "user";
}

function toProductStatusLabel(status: string | null | undefined) {
  const normalized = normalizeStatus(status);
  if (normalized === "ACTIVE") {
    return "Đang bán";
  }
  if (normalized === "INACTIVE") {
    return "Ngừng bán";
  }
  return status || "Không rõ";
}

function productToForm(product: AdminProductOpsItem): ProductFormState {
  return {
    name: product.name,
    slug: product.slug || "",
    categoryId: product.categoryId ? String(product.categoryId) : "",
    brandId: product.brandId ? String(product.brandId) : "",
    price: String(product.price),
    discountPrice: product.discountPrice ? String(product.discountPrice) : "",
    quantity: String(product.quantity),
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    specifications: product.specifications ?? "",
    image: product.image ?? "",
    thumbnail: product.thumbnail ?? "",
    status: normalizeStatus(product.status) === "INACTIVE" ? "INACTIVE" : "ACTIVE"
  };
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const isOwner = isOwnerUser(user);

  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    productTotal: 0,
    categoryTotal: 0,
    categories: []
  });

  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [orderDraftStatus, setOrderDraftStatus] = useState<Record<number, string>>({});
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  const [lowStock, setLowStock] = useState<AdminProductOpsItem[]>([]);
  const [dataIssues, setDataIssues] = useState<AdminDataIssue[]>([]);
  const [isLoadingOps, setIsLoadingOps] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<ManagementRole>("staff");
  const [creatingUser, setCreatingUser] = useState(false);

  const [products, setProducts] = useState<AdminProductOpsItem[]>([]);
  const [brands, setBrands] = useState<AdminBrandItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productMessage, setProductMessage] = useState<string | null>(null);
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>("ALL");
  const [productCategoryFilter, setProductCategoryFilter] = useState<number | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(DEFAULT_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [productSubImages, setProductSubImages] = useState<AdminProductSubImageItem[]>([]);
  const [isLoadingProductSubImages, setIsLoadingProductSubImages] = useState(false);
  const [uploadingProductSubImages, setUploadingProductSubImages] = useState(false);
  const [deletingSubImageId, setDeletingSubImageId] = useState<number | null>(null);
  const [selectedSubUploadFiles, setSelectedSubUploadFiles] = useState<File[]>([]);
  const subUploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [categories, productPage] = await Promise.all([
          getCategories({ force: true }),
          apiRequest<ProductPageResponse>("/api/products?sort=default&page=0")
        ]);

        setStats({
          productTotal: productPage.totalItems,
          categoryTotal: categories.length,
          categories
        });
      } catch {
        setStats({
          productTotal: 0,
          categoryTotal: 0,
          categories: []
        });
      }
    };

    void loadStats();
  }, []);

  useEffect(() => {
    if (editingProductId === null) {
      setProductSubImages([]);
      setSelectedSubUploadFiles([]);
      if (subUploadInputRef.current) {
        subUploadInputRef.current.value = "";
      }
      return;
    }

    let active = true;
    setIsLoadingProductSubImages(true);

    const load = async () => {
      try {
        const data = await getAdminProductSubImages(editingProductId);
        if (!active) {
          return;
        }
        setProductSubImages(data);
      } catch {
        if (!active) {
          return;
        }
        setProductSubImages([]);
      } finally {
        if (active) {
          setIsLoadingProductSubImages(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [editingProductId]);

  useEffect(() => {
    if (!stats.categories.length) {
      setSelectedCategoryId(null);
      return;
    }

    setSelectedCategoryId((current) => {
      if (current && stats.categories.some((item) => item.id === current)) {
        return current;
      }
      return stats.categories[0].id;
    });
  }, [stats.categories]);

  useEffect(() => {
    if (!isOwner && activeView === "users") {
      setActiveView("overview");
    }
  }, [activeView, isOwner]);

  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      setIsLoadingOrders(true);
      setOrderError(null);

      try {
        const data = await getAdminOrders();
        if (!active) {
          return;
        }
        setOrders(data);
      } catch (error) {
        if (!active) {
          return;
        }
        setOrders([]);
        setOrderError(toErrorMessage(error, "Không thể tải danh sách đơn hàng."));
      } finally {
        if (active) {
          setIsLoadingOrders(false);
        }
      }
    };

    void loadOrders();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadOps = async () => {
      setIsLoadingOps(true);
      setOpsError(null);

      try {
        const [lowStockData, dataIssueList] = await Promise.all([getAdminLowStockProducts(7), getAdminDataIssues()]);
        if (!active) {
          return;
        }
        setLowStock(lowStockData);
        setDataIssues(dataIssueList);
      } catch (error) {
        if (!active) {
          return;
        }
        setLowStock([]);
        setDataIssues([]);
        setOpsError(toErrorMessage(error, "Không thể tải dữ liệu tồn kho và kiểm tra dữ liệu."));
      } finally {
        if (active) {
          setIsLoadingOps(false);
        }
      }
    };

    void loadOps();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isOwner) {
      setUsers([]);
      setIsLoadingUsers(false);
      setUserError(null);
      return;
    }

    let active = true;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      setUserError(null);

      try {
        const data = await getAdminUsers();
        if (!active) {
          return;
        }
        setUsers(data);
      } catch (error) {
        if (!active) {
          return;
        }
        setUsers([]);
        setUserError(toErrorMessage(error, "Không thể tải danh sách tài khoản."));
      } finally {
        if (active) {
          setIsLoadingUsers(false);
        }
      }
    };

    void loadUsers();

    return () => {
      active = false;
    };
  }, [isOwner]);

  useEffect(() => {
    let active = true;

    const loadProductManagement = async () => {
      setIsLoadingProducts(true);
      setProductError(null);

      try {
        const [productList, brandList] = await Promise.all([getAdminProducts(), getAdminBrands()]);
        if (!active) {
          return;
        }
        setProducts(productList);
        setBrands(brandList);
      } catch (error) {
        if (!active) {
          return;
        }
        setProducts([]);
        setBrands([]);
        setProductError(toErrorMessage(error, "Không thể tải dữ liệu quản lý sản phẩm."));
      } finally {
        if (active) {
          setIsLoadingProducts(false);
        }
      }
    };

    void loadProductManagement();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (editingProductId !== null) {
      return;
    }

    setProductForm((previous) => {
      const defaultCategoryId =
        previous.categoryId || (stats.categories.length ? String(stats.categories[0].id) : "");
      const defaultBrandId = previous.brandId || (brands.length ? String(brands[0].id) : "");

      if (defaultCategoryId === previous.categoryId && defaultBrandId === previous.brandId) {
        return previous;
      }

      return {
        ...previous,
        categoryId: defaultCategoryId,
        brandId: defaultBrandId
      };
    });
  }, [brands, editingProductId, stats.categories]);

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesKeyword =
        !normalizedKeyword ||
        String(order.id).includes(normalizedKeyword) ||
        order.customerUsername.toLowerCase().includes(normalizedKeyword) ||
        (order.receiverName ?? "").toLowerCase().includes(normalizedKeyword);

      if (!matchesKeyword) {
        return false;
      }

      if (statusFilter === "ALL") {
        return true;
      }

      return normalizeStatus(order.orderStatus) === statusFilter;
    });
  }, [orders, keyword, statusFilter]);

  const filteredCategories = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return stats.categories;
    }

    return stats.categories.filter((category) => {
      return category.name.toLowerCase().includes(normalizedKeyword) || String(category.id).includes(normalizedKeyword);
    });
  }, [keyword, stats.categories]);

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return products.filter((product) => {
      const matchesKeyword =
        !normalizedKeyword ||
        String(product.id).includes(normalizedKeyword) ||
        product.name.toLowerCase().includes(normalizedKeyword) ||
        product.slug.toLowerCase().includes(normalizedKeyword);
      if (!matchesKeyword) {
        return false;
      }

      if (productStatusFilter !== "ALL" && normalizeStatus(product.status) !== productStatusFilter) {
        return false;
      }

      if (productCategoryFilter !== null && product.categoryId !== productCategoryFilter) {
        return false;
      }

      return true;
    });
  }, [keyword, productCategoryFilter, productStatusFilter, products]);

  const selectedCategory = useMemo(
    () => stats.categories.find((category) => category.id === selectedCategoryId) ?? null,
    [selectedCategoryId, stats.categories]
  );

  const discountedProductsCount = useMemo(() => products.filter((item) => item.discountPrice !== null).length, [products]);
  const lowStockProductsCount = useMemo(() => products.filter((item) => item.quantity <= 5).length, [products]);
  const activeProductsCount = useMemo(
    () => products.filter((item) => normalizeStatus(item.status) === "ACTIVE").length,
    [products]
  );

  const pendingOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = normalizeStatus(order.orderStatus);
      return status === "PENDING" || status === "PROCESSING";
    }).length;
  }, [orders]);

  const customerCount = useMemo(() => {
    const usernames = new Set(orders.map((order) => order.customerUsername));
    return usernames.size;
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => sum + order.totalAmount, 0);
  }, [orders]);

  const ownerManagedUsers = useMemo(() => users.filter((item) => item.role !== "owner"), [users]);
  const lockedUserCount = useMemo(() => users.filter((item) => item.locked).length, [users]);
  const adminCount = useMemo(() => users.filter((item) => item.role === "admin").length, [users]);
  const staffCount = useMemo(() => users.filter((item) => item.role === "staff").length, [users]);

  const sidebarPlaceholder =
    activeView === "categories"
      ? "Tìm theo danh mục / mã danh mục..."
      : activeView === "products"
        ? "Tìm theo mã sản phẩm / tên sản phẩm..."
      : activeView === "orders"
        ? "Tìm theo mã đơn / khách hàng..."
        : "Nhập từ khóa để lọc dữ liệu...";

  const handleOrderStatusUpdate = async (orderId: number) => {
    const targetStatus = (orderDraftStatus[orderId] ?? "").trim().toUpperCase();
    if (!targetStatus) {
      setOrderMessage("Vui long chon trang thai hop ly truoc khi cap nhat.");
      return;
    }

    setUpdatingOrderId(orderId);
    setOrderMessage(null);

    try {
      const updatedOrder = await updateAdminOrderStatus(orderId, targetStatus);
      setOrders((previous) =>
        previous.map((item) => (item.id === orderId ? { ...item, orderStatus: updatedOrder.orderStatus } : item))
      );
      setOrderMessage(`Da cap nhat trang thai don #${orderId} thanh ${toStatusLabel(targetStatus)}.`);
    } catch (error) {
      setOrderMessage(toErrorMessage(error, `Khong the cap nhat trang thai don #${orderId}.`));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCreateUser = async () => {
    if (!isOwner) {
      return;
    }

    const username = newUsername.trim();
    const password = newPassword.trim();

    if (!username || !password) {
      setUserMessage("Vui long nhap du tai khoan va mat khau.");
      return;
    }

    setCreatingUser(true);
    setUserMessage(null);

    try {
      const created = await createManagementUser(username, password, newRole);
      setUsers((previous) => [created, ...previous]);
      setNewUsername("");
      setNewPassword("");
      setNewRole("staff");
      setUserMessage(`Da tao tai khoan ${created.username} (${toRoleLabel(created.role)}).`);
    } catch (error) {
      setUserMessage(toErrorMessage(error, "Khong the tao tai khoan moi."));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleUpdate = async (target: AdminUser, role: ManagementRole) => {
    if (!isOwner || target.role === "owner") {
      return;
    }

    setUserMessage(null);
    try {
      const updated = await updateAdminUserRole(target.id, role);
      setUsers((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      setUserMessage(`Da doi vai tro cua ${updated.username} thanh ${toRoleLabel(updated.role)}.`);
    } catch (error) {
      setUserMessage(toErrorMessage(error, `Khong the doi vai tro cho ${target.username}.`));
    }
  };

  const handleLockToggle = async (target: AdminUser) => {
    if (!isOwner || target.role === "owner") {
      return;
    }

    setUserMessage(null);
    try {
      const updated = await updateAdminUserLockState(target.id, !target.locked);
      setUsers((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      setUserMessage(
        updated.locked ? `Da khoa tai khoan ${updated.username}.` : `Da mo khoa tai khoan ${updated.username}.`
      );
    } catch (error) {
      setUserMessage(toErrorMessage(error, `Khong the cap nhat trang thai khoa cho ${target.username}.`));
    }
  };

  const handleDeleteUser = async (target: AdminUser) => {
    if (!isOwner || target.role === "owner" || target.username === user?.username) {
      return;
    }

    if (!window.confirm(`Ban chac chan muon xoa tai khoan ${target.username}?`)) {
      return;
    }

    setUserMessage(null);
    try {
      await deleteManagementUser(target.id);
      setUsers((previous) => previous.filter((item) => item.id !== target.id));
      setUserMessage(`Da xoa tai khoan ${target.username}.`);
    } catch (error) {
      setUserMessage(toErrorMessage(error, `Khong the xoa tai khoan ${target.username}.`));
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setSelectedUploadFile(null);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
    setSelectedSubUploadFiles([]);
    if (subUploadInputRef.current) {
      subUploadInputRef.current.value = "";
    }
    setProductForm((previous) => ({
      ...DEFAULT_PRODUCT_FORM,
      categoryId: stats.categories.length ? String(stats.categories[0].id) : previous.categoryId,
      brandId: brands.length ? String(brands[0].id) : previous.brandId
    }));
  };

  const handleProductFieldChange = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setProductForm((previous) => ({
      ...previous,
      [field]: value
    }));
  };

  const toProductPayload = (form: ProductFormState): AdminProductUpsertPayload | null => {
    const name = form.name.trim();
    const categoryId = Number(form.categoryId);
    const brandId = Number(form.brandId);
    const price = Number(form.price);
    const quantity = Number(form.quantity);
    const discountPrice = form.discountPrice.trim() ? Number(form.discountPrice) : null;

    if (!name) {
      setProductMessage("Vui long nhap ten san pham.");
      return null;
    }
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setProductMessage("Vui long chon danh muc hop ly.");
      return null;
    }
    if (!Number.isInteger(brandId) || brandId <= 0) {
      setProductMessage("Vui long chon thuong hieu hop ly.");
      return null;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setProductMessage("Gia niem yet phai lon hon 0.");
      return null;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setProductMessage("Ton kho phai >= 0.");
      return null;
    }
    if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice <= 0 || discountPrice >= price)) {
      setProductMessage("Gia giam phai > 0 va nho hon gia niem yet.");
      return null;
    }

    return {
      name,
      slug: form.slug.trim() || null,
      categoryId,
      brandId,
      price,
      discountPrice,
      quantity,
      shortDescription: form.shortDescription.trim() || null,
      description: form.description.trim() || null,
      specifications: form.specifications.trim() || null,
      image: form.image.trim() || null,
      thumbnail: form.thumbnail.trim() || form.image.trim() || null,
      status: form.status
    };
  };

  const handleSaveProduct = async () => {
    const payload = toProductPayload(productForm);
    if (!payload) {
      return;
    }

    setSavingProduct(true);
    setProductMessage(null);

    try {
      if (editingProductId === null) {
        const created = await createAdminProduct(payload);
        setProducts((previous) => [created, ...previous]);
        setStats((previous) => ({ ...previous, productTotal: previous.productTotal + 1 }));
        setProductMessage(`Da tao san pham ${created.name}.`);
        setEditingProductId(created.id);
        setProductForm(productToForm(created));
      } else {
        const updated = await updateAdminProduct(editingProductId, payload);
        setProducts((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
        setProductMessage(`Da cap nhat san pham ${updated.name}.`);
        setEditingProductId(updated.id);
        setProductForm(productToForm(updated));
      }
    } catch (error) {
      setProductMessage(toErrorMessage(error, "Khong the luu san pham."));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleEditProduct = (product: AdminProductOpsItem) => {
    setActiveView("products");
    setProductMessage(null);
    setEditingProductId(product.id);
    setProductForm(productToForm(product));
    setSelectedUploadFile(null);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
    setSelectedSubUploadFiles([]);
    if (subUploadInputRef.current) {
      subUploadInputRef.current.value = "";
    }
  };

  const handleDeleteProduct = async (product: AdminProductOpsItem) => {
    if (!window.confirm(`Ban chac chan muon xoa san pham ${product.name}?`)) {
      return;
    }

    setDeletingProductId(product.id);
    setProductMessage(null);

    try {
      const result = await deleteAdminProduct(product.id);

      if (result?.deleted) {
        setProducts((previous) => previous.filter((item) => item.id !== product.id));
        setStats((previous) => ({
          ...previous,
          productTotal: previous.productTotal > 0 ? previous.productTotal - 1 : 0
        }));
        setProductMessage(result.message || `Da xoa san pham ${product.name}.`);
        if (editingProductId === product.id) {
          resetProductForm();
        }
        return;
      }

      if (result?.deactivated) {
        const fallbackProduct: AdminProductOpsItem = {
          ...product,
          status: "INACTIVE",
          quantity: 0
        };
        const nextProduct = result.product ?? fallbackProduct;
        setProducts((previous) => previous.map((item) => (item.id === product.id ? nextProduct : item)));
        setProductMessage(result.message || `San pham ${product.name} da chuyen sang ngung ban.`);
        if (editingProductId === product.id) {
          setProductForm(productToForm(nextProduct));
        }
        return;
      }

      setProductMessage(`Khong the xoa san pham ${product.name}.`);
    } catch (error) {
      setProductMessage(toErrorMessage(error, `Khong the xoa san pham ${product.name}.`));
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleUploadProductImage = async () => {
    if (!selectedUploadFile) {
      setProductMessage("Vui long chon file anh truoc khi upload.");
      return;
    }

    const validation = validateImageFile(selectedUploadFile);
    if (validation) {
      setProductMessage(validation);
      return;
    }

    setUploadingProductImage(true);
    setProductMessage(null);

    try {
      const uploaded: AdminCloudinaryUploadResponse = await uploadAdminCloudinaryImage(selectedUploadFile, {
        folder: "shoppro/products"
      });

      setProductForm((previous) => ({
        ...previous,
        image: uploaded.secureUrl,
        thumbnail: uploaded.secureUrl
      }));
      setProductMessage("Da upload anh len Cloudinary.");
      setSelectedUploadFile(null);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    } catch (error) {
      setProductMessage(toErrorMessage(error, "Khong the upload anh."));
    } finally {
      setUploadingProductImage(false);
    }
  };

  const handleUploadProductSubImages = async () => {
    if (editingProductId === null) {
      setProductMessage("Hay luu san pham truoc khi upload anh phu.");
      return;
    }

    if (!selectedSubUploadFiles.length) {
      setProductMessage("Vui long chon it nhat mot anh phu.");
      return;
    }

    for (const file of selectedSubUploadFiles) {
      const validation = validateImageFile(file);
      if (validation) {
        setProductMessage(validation);
        return;
      }
    }

    setUploadingProductSubImages(true);
    setProductMessage(null);

    try {
      const created = await uploadAdminProductSubImages(editingProductId, selectedSubUploadFiles);
      setProductSubImages((previous) => [...previous, ...created]);
      setProductMessage(`Da them ${created.length} anh phu.`);
      setSelectedSubUploadFiles([]);
      if (subUploadInputRef.current) {
        subUploadInputRef.current.value = "";
      }
    } catch (error) {
      setProductMessage(toErrorMessage(error, "Khong the upload anh phu."));
    } finally {
      setUploadingProductSubImages(false);
    }
  };

  const handleDeleteProductSubImage = async (imageId: number) => {
    if (editingProductId === null) {
      return;
    }

    if (!window.confirm("Ban chac chan muon xoa anh phu nay?")) {
      return;
    }

    setDeletingSubImageId(imageId);
    setProductMessage(null);

    try {
      await deleteAdminProductSubImage(editingProductId, imageId);
      setProductSubImages((previous) => previous.filter((item) => item.id !== imageId));
      setProductMessage("Da xoa anh phu.");
    } catch (error) {
      setProductMessage(toErrorMessage(error, "Khong the xoa anh phu."));
    } finally {
      setDeletingSubImageId(null);
    }
  };

  const renderOverview = () => {
    return (
      <>
        <section className="owner-crm-kpi-grid">
          <article>
            <span>Tong mat hang</span>
            <strong>{stats.productTotal}</strong>
          </article>
          <article>
            <span>Tổng danh mục</span>
            <strong>{stats.categoryTotal}</strong>
          </article>
          <article>
            <span>Tổng đơn hàng</span>
            <strong>{orders.length}</strong>
          </article>
          <article>
            <span>Don can xu ly</span>
            <strong>{pendingOrders}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Nhiem vu quan tri</h2>
            <div className="owner-crm-toolbar">
              <Link to="/products">Quản lý sản phẩm</Link>
              <Link to="/staff">Sang bang dieu khien Staff</Link>
            </div>
          </div>

          <div className="owner-crm-admin-dual">
            <article className="owner-crm-admin-block">
              <h3>Pham vi Admin hang ngay</h3>
              <ul>
                <li>CRUD sản phẩm, danh mục, thương hiệu.</li>
                <li>Xem va cap nhat trang thai don hang.</li>
                <li>Kiem tra ton kho thap va loi du lieu van hanh.</li>
                <li>Quan ly noi dung website theo quy trinh.</li>
              </ul>
            </article>           
          </div>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Ton kho va chat luong du lieu</h2>
          </div>

          {isLoadingOps ? (
            <p className="owner-crm-empty">Dang tai du lieu ton kho va loi du lieu...</p>
          ) : null}

          {opsError ? <p className="owner-crm-empty">{opsError}</p> : null}

          {!isLoadingOps && !opsError ? (
            <div className="owner-crm-admin-dual">
              <article className="owner-crm-admin-block">
                <h3>Canh bao ton kho thap</h3>
                {lowStock.length ? (
                  <ul>
                    {lowStock.slice(0, 8).map((item) => (
                      <li key={item.id}>
                        {item.name} (SL: {item.quantity})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Khong co san pham nao duoi nguong ton kho.</p>
                )}
              </article>

              <article className="owner-crm-admin-block">
                <h3>Loi du lieu can xu ly</h3>
                {dataIssues.length ? (
                  <ul>
                    {dataIssues.slice(0, 8).map((issue, index) => (
                      <li key={`${issue.code}-${issue.referenceId ?? "none"}-${index}`}>
                        [{issue.code}] {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Khong phat hien loi du lieu nghiem trong.</p>
                )}
              </article>
            </div>
          ) : null}
        </section>
      </>
    );
  };

  const renderCategories = () => {
    return (
      <>
        <section className="owner-crm-kpi-grid">
          <article>
            <span>Tổng danh mục</span>
            <strong>{stats.categoryTotal}</strong>
          </article>
          <article>
            <span>danh muc dang loc</span>
            <strong>{filteredCategories.length}</strong>
          </article>
          <article>
            <span>danh muc dang chon</span>
            <strong>{selectedCategory ? selectedCategory.name : "Tat ca"}</strong>
          </article>
          <article>
            <span>Tong mat hang</span>
            <strong>{stats.productTotal}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>danh muc hien co ({filteredCategories.length})</h2>
            <div className="owner-crm-toolbar">
              <button type="button" onClick={() => setSelectedCategoryId(null)}>
                Hien tat ca danh muc
              </button>
            </div>
          </div>

          {filteredCategories.length ? (
            <div className="owner-crm-table-wrap">
              <table className="owner-crm-table">
                <thead>
                  <tr>
                    <th>Ma danh muc</th>
                    <th>Ten danh muc</th>
                    <th>Hanh dong</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => {
                    const isSelected = selectedCategoryId === category.id;

                    return (
                      <tr
                        key={category.id}
                        className={isSelected ? "is-selected is-clickable" : "is-clickable"}
                        onClick={() => setSelectedCategoryId(category.id)}
                      >
                        <td className="owner-crm-order-code">DM{String(category.id).padStart(3, "0")}</td>
                        <td>
                          <strong>{category.name}</strong>
                        </td>
                        <td>
                          <div className="owner-crm-category-links">
                            <Link to={`/products?categoryId=${category.id}`}>Xem sản phẩm</Link>
                            <Link to="/products">Quản lý</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="owner-crm-empty">Khong tim thay danh muc phu hop voi tu khoa hien tai.</p>
          )}
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Chi tiet danh muc</h2>
          </div>

          {selectedCategory ? (
            <div className="owner-crm-category-detail">
              <p>
                <strong>Ma danh muc:</strong> DM{String(selectedCategory.id).padStart(3, "0")}
              </p>
              <p>
                <strong>Ten danh muc:</strong> {selectedCategory.name}
              </p>
              <div className="owner-crm-category-links">
                <Link to={`/products?categoryId=${selectedCategory.id}`}>Mở trang sản phẩm theo danh mục</Link>
                <Link to="/products">Mở toàn bộ sản phẩm</Link>
              </div>
            </div>
          ) : (
            <p className="owner-crm-empty">Chọn một danh mục trong bảng bên trên để xem chi tiết.</p>
          )}
        </section>
      </>
    );
  };

  const renderProducts = () => {
    const editingProduct = editingProductId !== null ? products.find((item) => item.id === editingProductId) ?? null : null;
    const productPreviewSrc = toDisplayImageUrl(productForm.thumbnail || productForm.image);

    return (
      <>
        <section className="owner-crm-kpi-grid">
          <article>
            <span>Tổng sản phẩm</span>
            <strong>{products.length}</strong>
          </article>
          <article>
            <span>Đang bán</span>
            <strong>{activeProductsCount}</strong>
          </article>
          <article>
            <span>Đang giảm giá</span>
            <strong>{discountedProductsCount}</strong>
          </article>
          <article>
            <span>Tồn kho thấp (&lt;=5)</span>
            <strong>{lowStockProductsCount}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>CRUD sản phẩm</h2>
            <div className="owner-crm-toolbar">
              <button type="button" onClick={resetProductForm}>
                {editingProductId === null ? "Làm mới form" : "Thoát chế độ sửa"}
              </button>
              <button type="button" onClick={() => setActiveView("categories")}>
                Quản lý danh mục
              </button>
            </div>
          </div>

          {productMessage ? <p className="owner-crm-empty">{productMessage}</p> : null}
          {productError ? <p className="owner-crm-empty">{productError}</p> : null}

          <div className="owner-crm-product-layout">
            <div className="owner-crm-product-form">
              <label>
                <span>Ten san pham *</span>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(event) => handleProductFieldChange("name", event.target.value)}
                  placeholder="Vi du: RTX 5070 12GB"
                />
              </label>
              <label>
                <span>Slug</span>
                <input
                  type="text"
                  value={productForm.slug}
                  onChange={(event) => handleProductFieldChange("slug", event.target.value)}
                  placeholder="tu dong sinh neu bo trong"
                />
              </label>

              <label>
                <span>danh mục *</span>
                <select
                  value={productForm.categoryId}
                  onChange={(event) => handleProductFieldChange("categoryId", event.target.value)}
                >
                  <option value="">Chon danh muc</option>
                  {stats.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>thương hiệu *</span>
                <select value={productForm.brandId} onChange={(event) => handleProductFieldChange("brandId", event.target.value)}>
                  <option value="">Chon thuong hieu</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Gia niem yet *</span>
                <input
                  type="number"
                  min={0}
                  value={productForm.price}
                  onChange={(event) => handleProductFieldChange("price", event.target.value)}
                  placeholder="0"
                />
              </label>
              <label>
                <span>giá giảm</span>
                <input
                  type="number"
                  min={0}
                  value={productForm.discountPrice}
                  onChange={(event) => handleProductFieldChange("discountPrice", event.target.value)}
                  placeholder="Bo trong neu khong giam"
                />
              </label>

              <label>
                <span>Ton kho *</span>
                <input
                  type="number"
                  min={0}
                  value={productForm.quantity}
                  onChange={(event) => handleProductFieldChange("quantity", event.target.value)}
                />
              </label>
              <label>
                <span>trạng thái</span>
                <select
                  value={productForm.status}
                  onChange={(event) => handleProductFieldChange("status", event.target.value as ProductStatusFilter)}
                >
                  {PRODUCT_STATUS_OPTIONS.filter((item) => item !== "ALL").map((item) => (
                    <option key={item} value={item}>
                      {toProductStatusLabel(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="is-wide">
                <span>Link anh</span>
                <input
                  type="text"
                  value={productForm.image}
                  onChange={(event) => handleProductFieldChange("image", event.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className="is-wide">
                <span>Link thumbnail</span>
                <input
                  type="text"
                  value={productForm.thumbnail}
                  onChange={(event) => handleProductFieldChange("thumbnail", event.target.value)}
                  placeholder="neu trong se dung chung link anh"
                />
              </label>

              <label className="is-wide">
                <span>Tai anh len Cloudinary</span>
                <div className="owner-crm-product-upload-row">
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => setSelectedUploadFile(event.target.files?.[0] ?? null)}
                  />
                  <button type="button" disabled={uploadingProductImage} onClick={() => void handleUploadProductImage()}>
                    {uploadingProductImage ? "Dang upload..." : "Upload anh"}
                  </button>
                </div>
              </label>

              <div className="owner-crm-product-subimages">
                <div className="owner-crm-product-subimages-head">
                  <div>
                    <strong>Anh phu (gallery)</strong>
                    <p>Upload nhieu anh de hien thi tren trang chi tiet san pham. Anh chinh o tren van giu nguyen.</p>
                  </div>
                  {editingProductId === null ? <span className="owner-crm-chip">Hay luu san pham truoc</span> : null}
                </div>

                {isLoadingProductSubImages ? <p className="owner-crm-empty">Dang tai danh sach anh phu...</p> : null}

                {!isLoadingProductSubImages && editingProductId !== null && productSubImages.length ? (
                  <div className="owner-crm-product-subimages-grid">
                    {productSubImages.map((item) => {
                      const src = toDisplayImageUrl(item.imageUrl);
                      return (
                        <div key={item.id} className="owner-crm-product-subimage-card">
                          {src ? <img src={src} alt={`sub-${item.id}`} /> : <div className="owner-crm-product-thumb-empty">No image</div>}
                          <button
                            type="button"
                            className="owner-crm-product-subimage-delete"
                            disabled={deletingSubImageId === item.id}
                            onClick={() => void handleDeleteProductSubImage(item.id)}
                          >
                            {deletingSubImageId === item.id ? "Dang xoa..." : "Xoa"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {!isLoadingProductSubImages && editingProductId !== null && !productSubImages.length ? (
                  <p className="owner-crm-empty">Chua co anh phu.</p>
                ) : null}

                <label className="is-wide">
                  <span>Tai nhieu anh phu</span>
                  <div className="owner-crm-product-upload-row">
                    <input
                      ref={subUploadInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={editingProductId === null}
                      onChange={(event) => setSelectedSubUploadFiles(Array.from(event.target.files ?? []))}
                    />
                    <button
                      type="button"
                      disabled={editingProductId === null || uploadingProductSubImages}
                      onClick={() => void handleUploadProductSubImages()}
                    >
                      {uploadingProductSubImages ? "Dang upload..." : "Upload anh phu"}
                    </button>
                  </div>
                </label>
              </div>

              <label className="is-wide">
                <span>Mo ta ngan</span>
                <textarea
                  rows={2}
                  value={productForm.shortDescription}
                  onChange={(event) => handleProductFieldChange("shortDescription", event.target.value)}
                />
              </label>
              <label className="is-wide">
                <span>Mo ta chi tiet</span>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(event) => handleProductFieldChange("description", event.target.value)}
                />
              </label>
              <label className="is-wide">
                <span>Thong so ky thuat</span>
                <textarea
                  rows={3}
                  value={productForm.specifications}
                  onChange={(event) => handleProductFieldChange("specifications", event.target.value)}
                />
              </label>
            </div>

            <div className="owner-crm-product-side">
              <div className="owner-crm-product-preview">
                <p>Xem truoc anh</p>
                {productPreviewSrc ? (
                  <img src={productPreviewSrc} alt="preview" />
                ) : (
                  <div className="owner-crm-product-preview-empty">Chua co anh</div>
                )}
                <strong>{editingProduct ? `Dang sua #${editingProduct.id}` : "Tao moi san pham"}</strong>
              </div>

              <div className="owner-crm-inline-actions">
                <button type="button" className="role-admin-button" disabled={savingProduct} onClick={() => void handleSaveProduct()}>
                  {savingProduct ? "Dang luu..." : editingProductId === null ? "Them san pham" : "Cap nhat san pham"}
                </button>
                {editingProductId !== null ? (
                  <button type="button" className="role-admin-button role-admin-button-danger" onClick={resetProductForm}>
                    Huy sua
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Danh sach san pham ({filteredProducts.length})</h2>
            <div className="owner-crm-toolbar">
              <select
                value={productCategoryFilter === null ? "ALL" : String(productCategoryFilter)}
                onChange={(event) => setProductCategoryFilter(event.target.value === "ALL" ? null : Number(event.target.value))}
              >
                <option value="ALL">Tat ca danh mục</option>
                {stats.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={productStatusFilter}
                onChange={(event) => setProductStatusFilter(event.target.value as ProductStatusFilter)}
              >
                <option value="ALL">Tat ca trạng thái</option>
                <option value="ACTIVE">Dang ban</option>
                <option value="INACTIVE">Ngung ban</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setKeyword("");
                  setProductCategoryFilter(null);
                  setProductStatusFilter("ALL");
                }}
              >
                Dat lai bo loc
              </button>
            </div>
          </div>

          {isLoadingProducts ? <p className="owner-crm-empty">Dang tai danh sach san pham...</p> : null}

          {!isLoadingProducts && !filteredProducts.length ? (
            <p className="owner-crm-empty">Khong co san pham phu hop bo loc hien tai.</p>
          ) : null}

          {!isLoadingProducts && filteredProducts.length ? (
            <div className="owner-crm-table-wrap">
              <table className="owner-crm-table owner-crm-product-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Anh</th>
                    <th>sản phẩm</th>
                    <th>danh mục</th>
                    <th>thương hiệu</th>
                    <th>giá / giảm</th>
                    <th>Ton kho</th>
                    <th>trạng thái</th>
                    <th>Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const productImageSrc = toDisplayImageUrl(product.thumbnail || product.image);
                    return (
                      <tr key={product.id}>
                        <td className="owner-crm-order-code">SP{String(product.id).padStart(4, "0")}</td>
                        <td>
                          {productImageSrc ? (
                            <img className="owner-crm-product-thumb" src={productImageSrc} alt={product.name} />
                          ) : (
                            <div className="owner-crm-product-thumb owner-crm-product-thumb-empty">No image</div>
                          )}
                        </td>
                        <td>
                          <strong>{product.name}</strong>
                          <p className="owner-crm-product-slug">/{product.slug}</p>
                        </td>
                        <td>{product.categoryName || "-"}</td>
                        <td>{product.brandName || "-"}</td>
                        <td>
                          <div className="owner-crm-product-price">
                            <strong>{moneyFormatter.format(product.price)}</strong>
                            {product.discountPrice !== null ? (
                              <span>{moneyFormatter.format(product.discountPrice)}</span>
                            ) : (
                              <span>Khong giam</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`owner-crm-status ${product.quantity <= 5 ? "is-pending" : "is-done"}`}>
                            {product.quantity}
                          </span>
                        </td>
                        <td>
                          <span className={`owner-crm-status ${normalizeStatus(product.status) === "ACTIVE" ? "is-done" : "is-default"}`}>
                            {toProductStatusLabel(product.status)}
                          </span>
                        </td>
                        <td>
                          <div className="owner-crm-inline-actions">
                            <button type="button" className="role-admin-button" onClick={() => handleEditProduct(product)}>
                              Sua
                            </button>
                            <button
                              type="button"
                              className="role-admin-button role-admin-button-danger"
                              disabled={deletingProductId === product.id}
                              onClick={() => void handleDeleteProduct(product)}
                            >
                              {deletingProductId === product.id ? "Dang xoa..." : "Xoa"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </>
    );
  };

  const renderOrders = () => {
    return (
      <>
        <section className="owner-crm-kpi-grid">
          <article>
            <span>Tổng đơn hàng</span>
            <strong>{orders.length}</strong>
          </article>
          <article>
            <span>Don dang loc</span>
            <strong>{filteredOrders.length}</strong>
          </article>
          <article>
            <span>Don cho xu ly</span>
            <strong>{pendingOrders}</strong>
          </article>
          <article>
            <span>Doanh thu tam tinh</span>
            <strong>{moneyFormatter.format(totalRevenue)}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Quản lý đơn hàng</h2>
            <div className="owner-crm-toolbar">
              <input
                type="text"
                placeholder="Tim theo ma don / khach hang..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OrderStatusFilter)}>
                <option value="ALL">Tat ca trạng thái</option>
                <option value="PENDING">Cho xu ly</option>
                <option value="PROCESSING">Dang xu ly</option>
                <option value="SHIPPING">Dang giao</option>
                <option value="COMPLETED">Hoan tat</option>
                <option value="CANCELLED">Da huy</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setKeyword("");
                  setStatusFilter("ALL");
                }}
              >
                Dat lai
              </button>
            </div>
          </div>

          {orderMessage ? <p className="owner-crm-empty">{orderMessage}</p> : null}
          {orderError ? <p className="owner-crm-empty">{orderError}</p> : null}
          {isLoadingOrders ? <p className="owner-crm-empty">Dang tai danh sach don hang...</p> : null}

          {!isLoadingOrders && !orderError && !filteredOrders.length ? (
            <p className="owner-crm-empty">Khong co don hang phu hop voi dieu kien loc hien tai.</p>
          ) : null}

          {!isLoadingOrders && !orderError && filteredOrders.length ? (
            <div className="owner-crm-table-wrap">
              <table className="owner-crm-table">
                <thead>
                  <tr>
                    <th>Ma don</th>
                    <th>Khach hang</th>
                    <th>Nguoi nhan</th>
                    <th>Th?</th>
                    <th>Thanh toan</th>
                    <th>trạng thái</th>
                    <th>Tong tien</th>
                    <th>Thoi gian</th>
                    <th>Cap nhat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => {
                    const currentStatus = normalizeStatus(order.orderStatus) || "PENDING";
                    const selectedStatus = orderDraftStatus[order.id] ?? currentStatus;
                    return (
                      <tr key={order.id}>
                        <td className="owner-crm-order-code">OD{String(order.id).padStart(5, "0")}</td>
                        <td>
                          <strong>{order.customerUsername}</strong>
                        </td>
                        <td>{order.receiverName || "Chua cap nhat"}</td>
                        <td>
                          <span className="owner-crm-chip">{toOrderTag(index)}</span>
                        </td>
                        <td>{order.paymentMethod || "Khong ro"}</td>
                        <td>
                          <span className={`owner-crm-status ${toStatusClass(order.orderStatus)}`}>
                            {toStatusLabel(order.orderStatus)}
                          </span>
                        </td>
                        <td>{moneyFormatter.format(order.totalAmount)}</td>
                        <td>{dateTimeFormatter.format(new Date(order.createdAt))}</td>
                        <td>
                          <div className="owner-crm-inline-actions">
                            <select
                              className="owner-crm-inline-select"
                              value={selectedStatus}
                              onChange={(event) =>
                                setOrderDraftStatus((previous) => ({
                                  ...previous,
                                  [order.id]: event.target.value
                                }))
                              }
                            >
                              {ORDER_STATUS_OPTIONS.filter((option) => option !== "ALL").map((option) => (
                                <option key={option} value={option}>
                                  {toStatusLabel(option)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="role-admin-button"
                              disabled={updatingOrderId === order.id}
                              onClick={() => void handleOrderStatusUpdate(order.id)}
                            >
                              {updatingOrderId === order.id ? "Đang cập nhật..." : "Cập nhật"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </>
    );
  };

  const renderUsers = () => {
    if (!isOwner) {
      return (
        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Quan ly nguoi dung</h2>
          </div>
          <p className="owner-crm-empty">Tai khoan Admin khong co quyen tao, xoa, doi vai tro hoac khoa/mo tai khoan.</p>
        </section>
      );
    }

    return (
      <>
        <section className="owner-crm-kpi-grid">
          <article>
            <span>Tổng tài khoản</span>
            <strong>{users.length}</strong>
          </article>
          <article>
            <span>So Admin</span>
            <strong>{adminCount}</strong>
          </article>
          <article>
            <span>So Staff</span>
            <strong>{staffCount}</strong>
          </article>
          <article>
            <span>Dang khoa</span>
            <strong>{lockedUserCount}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Tao tai khoan van hanh</h2>
            <div className="owner-crm-toolbar">
              <button type="button" onClick={() => setNewRole("staff")}>
                Chon Staff
              </button>
              <button type="button" onClick={() => setNewRole("admin")}>
                Chon Admin
              </button>
            </div>
          </div>

          {userMessage ? <p className="owner-crm-empty">{userMessage}</p> : null}
          {userError ? <p className="owner-crm-empty">{userError}</p> : null}

          <div className="owner-crm-toolbar">
            <input
              type="text"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              placeholder="Ten dang nhap"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="mật khẩu"
            />
            <select value={newRole} onChange={(event) => setNewRole(roleFromSelect(event.target.value))}>
              {MANAGEMENT_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {toRoleLabel(role)}
                </option>
              ))}
            </select>
            <button type="button" disabled={creatingUser} onClick={() => void handleCreateUser()}>
              {creatingUser ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
          </div>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Danh sach tai khoan ({ownerManagedUsers.length})</h2>
          </div>

          {isLoadingUsers ? <p className="owner-crm-empty">Đang tải danh sách tài khoản...</p> : null}

          {!isLoadingUsers && !ownerManagedUsers.length ? (
            <p className="owner-crm-empty">Chưa có tài khoản vận hành nào để hiển thị.</p>
          ) : null}

          {!isLoadingUsers && ownerManagedUsers.length ? (
            <div className="owner-crm-table-wrap">
              <table className="owner-crm-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>tài khoản</th>
                    <th>Vai tro</th>
                    <th>trạng thái</th>
                    <th>Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerManagedUsers.map((item) => (
                    <tr key={item.id}>
                      <td className="owner-crm-order-code">U{String(item.id).padStart(4, "0")}</td>
                      <td>
                        <strong>{item.username}</strong>
                      </td>
                      <td>
                        <span className={`role-admin-badge ${toRoleBadgeClass(item.role)}`}>{toRoleLabel(item.role)}</span>
                      </td>
                      <td>
                        <span className={`role-admin-badge ${item.locked ? "is-locked" : "is-active"}`}>
                          {item.locked ? "Đã khóa" : "Đang hoạt động"}
                        </span>
                      </td>
                      <td>
                        <div className="owner-crm-inline-actions">
                          <select
                            className="owner-crm-inline-select"
                            value={item.role}
                            onChange={(event) => void handleRoleUpdate(item, roleFromSelect(event.target.value))}
                          >
                            {MANAGEMENT_ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>
                                {toRoleLabel(role)}
                              </option>
                            ))}
                          </select>
                          <button type="button" className="role-admin-button" onClick={() => void handleLockToggle(item)}>
                            {item.locked ? "Mở khóa" : "Khóa"}
                          </button>
                          <button
                            type="button"
                            className="role-admin-button role-admin-button-danger"
                            onClick={() => void handleDeleteUser(item)}
                          >
                            Xoa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </>
    );
  };

  return (
    <section className="owner-crm-page">
      <div className="owner-crm-shell">
        <aside className="owner-crm-sidebar">
          <div className="owner-crm-brand">
            <span>SP</span>
            <strong>ShopPro Admin</strong>
          </div>

          <label className="owner-crm-search">
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={sidebarPlaceholder}
            />
          </label>

          <div className="owner-crm-nav-group">
            <p>DIEU HUONG</p>
            <button type="button" className={activeView === "overview" ? "active" : ""} onClick={() => setActiveView("overview")}>
              Tổng quan
            </button>
            <button
              type="button"
              className={activeView === "categories" ? "active" : ""}
              onClick={() => setActiveView("categories")}
            >
              Danh mục
            </button>
            <button type="button" className={activeView === "products" ? "active" : ""} onClick={() => setActiveView("products")}>
              Sản phẩm
            </button>
            <button type="button" className={activeView === "orders" ? "active" : ""} onClick={() => setActiveView("orders")}>
              Đơn hàng
            </button>
            {isOwner ? (
              <button type="button" className={activeView === "users" ? "active" : ""} onClick={() => setActiveView("users")}>
                Người dùng
              </button>
            ) : null}
          </div>

          <div className="owner-crm-sidebar-actions">
            <Link to="/products">Mở trang sản phẩm</Link>
            <Link to="/staff">Bảng điều khiển Staff</Link>
            {isOwner ? <Link to="/owner">Báo cáo Owner</Link> : null}
          </div>
        </aside>

        <div className="owner-crm-main">
          <header className="owner-crm-header">
            <div>
              <p className="owner-crm-kicker">BẢNG ĐIỀU HÀNH ADMIN</p>
              <h1>
                {activeView === "overview"
                  ? "Trung tâm điều hành quản trị"
                  : activeView === "categories"
                    ? "Quản lý danh mục sản phẩm"
                    : activeView === "products"
                      ? "Quản lý sản phẩm, kho và giảm giá"
                    : activeView === "orders"
                      ? "Quản lý đơn hàng"
                      : "Quản lý người dùng hệ thống"}
              </h1>
              <p>
                {activeView === "overview"
                  ? (isOwner
                      ? "Admin dashboard phục vụ catalog/vận hành. Báo cáo cấp cao & quản trị tài khoản quản trị nằm ở trang Owner."
                      : "Theo dõi KPI, đơn hàng, tồn kho và dữ liệu vận hành trong cùng bảng điều khiển.")
                  : activeView === "categories"
                    ? "Trang danh mục dùng cùng bớc với Owner để theo dõi và thao tác."
                    : activeView === "products"
                      ? "Admin CRUD sản phẩm ngay tại đây: cập nhật ảnh, tồn kho và giảm giá theo nhu cầu."
                    : activeView === "orders"
                      ? "Admin và Owner đều có thể xem và cập nhật trạng thái đơn hàng."
                      : "Chỉ Owner có quyền tạo, đổi vai trò, khóa/mở hoặc xóa tài khoản quản trị."}
              </p>
            </div>

            <div className="owner-crm-header-actions">
              <Link to="/products">Quản lý sản phẩm</Link>
              <Link to="/staff">Sang bảng điều khiển Staff</Link>
            </div>
          </header>

          {activeView === "overview" ? renderOverview() : null}
          {activeView === "categories" ? renderCategories() : null}
          {activeView === "products" ? renderProducts() : null}
          {activeView === "orders" ? renderOrders() : null}
          {activeView === "users" ? renderUsers() : null}

          {activeView !== "users" ? (
            <section className="owner-crm-panel">
              <div className="owner-crm-panel-head">
                <h2>Tổng quan nhanh</h2>
              </div>
              <div className="owner-crm-kpi-grid">
                <article>
                  <span>Khách hàng gần đây</span>
                  <strong>{customerCount}</strong>
                </article>
                <article>
                  <span>Sản phẩm tồn thấp</span>
                  <strong>{lowStock.length}</strong>
                </article>
                <article>
                  <span>Lỗi dữ liệu</span>
                  <strong>{dataIssues.length}</strong>
                </article>
                <article>
                  <span>Người dùng quản trị</span>
                  <strong>{isOwner ? users.length : "Owner only"}</strong>
                </article>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}


