import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminBrands,
  getAdminDataIssues,
  getAdminLowStockProducts,
  getAdminOrders,
  getAdminProducts,
  updateAdminOrderStatus,
  updateAdminProduct,
  uploadAdminCloudinaryImage
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
    return "Luu trữ";
  }
  return "Chờ xử lý";
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
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
        setOrderError(toErrorMessage(error, "Không th? t?i danh s�ch đơn hàng."));
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
        setOpsError(toErrorMessage(error, "không th? t?i d? li?u t?n kho v� ki?m tra d? li?u."));
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
        setUserError(toErrorMessage(error, "Không th? t?i danh sch ti kho?n."));
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
        setProductError(toErrorMessage(error, "không th? t?i d? li?u Quản lý sản phẩm."));
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
      ? "T�m theo danh mục / m� danh mục..."
      : activeView === "products"
        ? "T�m theo m� sản phẩm / t�n sản phẩm..."
      : activeView === "orders"
        ? "T�m theo m� don / kh�ch h�ng..."
        : "Nh?p t? kh�a d? l?c d? li?u...";

  const handleOrderStatusUpdate = async (orderId: number) => {
    const targetStatus = (orderDraftStatus[orderId] ?? "").trim().toUpperCase();
    if (!targetStatus) {
      setOrderMessage("Vui l�ng ch?n trạng thái hợp lý tru?c khi c?p nh?t.");
      return;
    }

    setUpdatingOrderId(orderId);
    setOrderMessage(null);

    try {
      const updatedOrder = await updateAdminOrderStatus(orderId, targetStatus);
      setOrders((previous) =>
        previous.map((item) => (item.id === orderId ? { ...item, orderStatus: updatedOrder.orderStatus } : item))
      );
      setOrderMessage(`�� c?p nh?t trạng thái don #${orderId} th�nh ${toStatusLabel(targetStatus)}.`);
    } catch (error) {
      setOrderMessage(toErrorMessage(error, `không th? c?p nh?t trạng thái don #${orderId}.`));
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
      setUserMessage("Vui l�ng nh?p d? tài khoản v� mật khẩu.");
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
      setUserMessage(`�� t?o tài khoản ${created.username} (${toRoleLabel(created.role)}).`);
    } catch (error) {
      setUserMessage(toErrorMessage(error, "không th? t?o tài khoản m?i."));
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
      setUserMessage(`�� d?i vai tr� c?a ${updated.username} th�nh ${toRoleLabel(updated.role)}.`);
    } catch (error) {
      setUserMessage(toErrorMessage(error, `không th? d?i vai tr� cho ${target.username}.`));
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
        updated.locked ? `�� kh�a tài khoản ${updated.username}.` : `�� m? kh�a tài khoản ${updated.username}.`
      );
    } catch (error) {
      setUserMessage(toErrorMessage(error, `không th? c?p nh?t trạng thái kh�a cho ${target.username}.`));
    }
  };

  const handleDeleteUser = async (target: AdminUser) => {
    if (!isOwner || target.role === "owner" || target.username === user?.username) {
      return;
    }

    if (!window.confirm(`B?n ch?c ch?n mu?n x�a tài khoản ${target.username}?`)) {
      return;
    }

    setUserMessage(null);
    try {
      await deleteManagementUser(target.id);
      setUsers((previous) => previous.filter((item) => item.id !== target.id));
      setUserMessage(`�� x�a tài khoản ${target.username}.`);
    } catch (error) {
      setUserMessage(toErrorMessage(error, `không th? x�a tài khoản ${target.username}.`));
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setSelectedUploadFile(null);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
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
      setProductMessage("Vui l�ng nh?p t�n sản phẩm.");
      return null;
    }
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setProductMessage("Vui l�ng ch?n danh mục hợp lý.");
      return null;
    }
    if (!Number.isInteger(brandId) || brandId <= 0) {
      setProductMessage("Vui l�ng ch?n thương hiệu hợp lý.");
      return null;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setProductMessage("giá ni�m y?t ph?i l?n hon 0.");
      return null;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setProductMessage("T?n kho ph?i >= 0.");
      return null;
    }
    if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice <= 0 || discountPrice >= price)) {
      setProductMessage("giá giảm ph?i > 0 v� nh? hon giá ni�m y?t.");
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
        setProductMessage(`�� t?o sản phẩm ${created.name}.`);
        resetProductForm();
      } else {
        const updated = await updateAdminProduct(editingProductId, payload);
        setProducts((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
        setProductMessage(`�� c?p nh?t sản phẩm ${updated.name}.`);
        setEditingProductId(updated.id);
        setProductForm(productToForm(updated));
      }
    } catch (error) {
      setProductMessage(toErrorMessage(error, "không th? luu sản phẩm."));
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
  };

  const handleDeleteProduct = async (product: AdminProductOpsItem) => {
    if (!window.confirm(`B?n ch?c ch?n mu?n x�a sản phẩm ${product.name}?`)) {
      return;
    }

    setDeletingProductId(product.id);
    setProductMessage(null);

    try {
      await deleteAdminProduct(product.id);
      setProducts((previous) => previous.filter((item) => item.id !== product.id));
      setStats((previous) => ({
        ...previous,
        productTotal: previous.productTotal > 0 ? previous.productTotal - 1 : 0
      }));
      setProductMessage(`�� x�a sản phẩm ${product.name}.`);
      if (editingProductId === product.id) {
        resetProductForm();
      }
    } catch (error) {
      setProductMessage(toErrorMessage(error, `không th? x�a sản phẩm ${product.name}.`));
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleUploadProductImage = async () => {
    if (!selectedUploadFile) {
      setProductMessage("Vui l�ng ch?n file ?nh tru?c khi upload.");
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
      setProductMessage("�� upload ?nh l�n Cloudinary.");
      setSelectedUploadFile(null);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    } catch (error) {
      setProductMessage(toErrorMessage(error, "không th? upload ?nh."));
    } finally {
      setUploadingProductImage(false);
    }
  };

  const renderOverview = () => {
    return (
      <>
        <section className="owner-crm-kpi-grid">
          <article>
            <span>Tổng m?t h�ng</span>
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
            <span>�on c?n x? l�</span>
            <strong>{pendingOrders}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Nhi?m v? qu?n tr?</h2>
            <div className="owner-crm-toolbar">
              <Link to="/products">Quản lý sản phẩm</Link>
              <Link to="/owner-staff">Sang b?ng di?u khi?n Staff</Link>
            </div>
          </div>

          <div className="owner-crm-admin-dual">
            <article className="owner-crm-admin-block">
              <h3>Ph?m vi Admin h?ng ng�y</h3>
              <ul>
                <li>CRUD sản phẩm, danh mục, thương hiệu.</li>
                <li>Xem v� c?p nh?t trạng thái đơn hàng.</li>
                <li>Ki?m tra t?n kho th?p v� l?i d? li?u v?n h�nh.</li>
                <li>Quản lý n?i dung website theo quy tr�nh.</li>
              </ul>
            </article>

            <article className="owner-crm-admin-block">
              <h3>Quy?n b? sung c?a Owner</h3>
              <ul>
                <li>To�n quy?n t?o, s?a, kh�a, x�a admin/staff/user.</li>
                <li>Xem to�n b? d? li?u h? th?ng v� b�o c�o cao nh?t.</li>
                <li>Duy?t thay d?i quan tr?ng v� c?u h�nh website.</li>
                <li>Quy?t d?nh chi?n lu?c khuy?n m�i v� giá b�n.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>T?n kho v� ch?t lu?ng d? li?u</h2>
          </div>

          {isLoadingOps ? (
            <p className="owner-crm-empty">�ang t?i d? li?u t?n kho v� l?i d? li?u...</p>
          ) : null}

          {opsError ? <p className="owner-crm-empty">{opsError}</p> : null}

          {!isLoadingOps && !opsError ? (
            <div className="owner-crm-admin-dual">
              <article className="owner-crm-admin-block">
                <h3>C?nh b�o t?n kho th?p</h3>
                {lowStock.length ? (
                  <ul>
                    {lowStock.slice(0, 8).map((item) => (
                      <li key={item.id}>
                        {item.name} (SL: {item.quantity})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>không c� sản phẩm n�o du?i ngu?ng t?n kho.</p>
                )}
              </article>

              <article className="owner-crm-admin-block">
                <h3>L?i d? li?u c?n x? l�</h3>
                {dataIssues.length ? (
                  <ul>
                    {dataIssues.slice(0, 8).map((issue, index) => (
                      <li key={`${issue.code}-${issue.referenceId ?? "none"}-${index}`}>
                        [{issue.code}] {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>không ph�t hi?n l?i d? li?u nghi�m tr?ng.</p>
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
            <span>danh mục dang l?c</span>
            <strong>{filteredCategories.length}</strong>
          </article>
          <article>
            <span>danh mục dang ch?n</span>
            <strong>{selectedCategory ? selectedCategory.name : "T?t c?"}</strong>
          </article>
          <article>
            <span>Tổng m?t h�ng</span>
            <strong>{stats.productTotal}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>danh mục hi?n c� ({filteredCategories.length})</h2>
            <div className="owner-crm-toolbar">
              <button type="button" onClick={() => setSelectedCategoryId(null)}>
                Hi?n t?t c? danh mục
              </button>
            </div>
          </div>

          {filteredCategories.length ? (
            <div className="owner-crm-table-wrap">
              <table className="owner-crm-table">
                <thead>
                  <tr>
                    <th>M� danh mục</th>
                    <th>T�n danh mục</th>
                    <th>H�nh d?ng</th>
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
            <p className="owner-crm-empty">không t�m th?y danh mục ph� h?p v?i t? kh�a hi?n t?i.</p>
          )}
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Chi ti?t danh mục</h2>
          </div>

          {selectedCategory ? (
            <div className="owner-crm-category-detail">
              <p>
                <strong>M� danh mục:</strong> DM{String(selectedCategory.id).padStart(3, "0")}
              </p>
              <p>
                <strong>T�n danh mục:</strong> {selectedCategory.name}
              </p>
              <div className="owner-crm-category-links">
                <Link to={`/products?categoryId=${selectedCategory.id}`}>M? trang sản phẩm theo danh mục</Link>
                <Link to="/products">M? to�n b? sản phẩm</Link>
              </div>
            </div>
          ) : (
            <p className="owner-crm-empty">Ch?n m?t danh mục trong b?ng b�n tr�n d? xem chi ti?t.</p>
          )}
        </section>
      </>
    );
  };

  const renderProducts = () => {
    const editingProduct = editingProductId !== null ? products.find((item) => item.id === editingProductId) ?? null : null;

    return (
      <>
        <section className="owner-crm-kpi-grid">
          <article>
            <span>Tổng sản phẩm</span>
            <strong>{products.length}</strong>
          </article>
          <article>
            <span>?ang b�n</span>
            <strong>{activeProductsCount}</strong>
          </article>
          <article>
            <span>?ang giảm giá</span>
            <strong>{discountedProductsCount}</strong>
          </article>
          <article>
            <span>T?n kho th?p (&lt;=5)</span>
            <strong>{lowStockProductsCount}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>CRUD sản phẩm</h2>
            <div className="owner-crm-toolbar">
              <button type="button" onClick={resetProductForm}>
                {editingProductId === null ? "L�m m?i form" : "Tho�t ch? d? s?a"}
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
                <span>T�n sản phẩm *</span>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(event) => handleProductFieldChange("name", event.target.value)}
                  placeholder="V� d?: RTX 5070 12GB"
                />
              </label>
              <label>
                <span>Slug</span>
                <input
                  type="text"
                  value={productForm.slug}
                  onChange={(event) => handleProductFieldChange("slug", event.target.value)}
                  placeholder="tu d?ng sinh n?u b? tr?ng"
                />
              </label>

              <label>
                <span>danh mục *</span>
                <select
                  value={productForm.categoryId}
                  onChange={(event) => handleProductFieldChange("categoryId", event.target.value)}
                >
                  <option value="">Ch?n danh mục</option>
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
                  <option value="">Ch?n thương hiệu</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>giá ni�m y?t *</span>
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
                  placeholder="B? tr?ng n?u không giảm"
                />
              </label>

              <label>
                <span>T?n kho *</span>
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
                <span>Link ?nh</span>
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
                  placeholder="n?u tr?ng s? d�ng chung link ?nh"
                />
              </label>

              <label className="is-wide">
                <span>T?i ?nh l�n Cloudinary</span>
                <div className="owner-crm-product-upload-row">
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => setSelectedUploadFile(event.target.files?.[0] ?? null)}
                  />
                  <button type="button" disabled={uploadingProductImage} onClick={() => void handleUploadProductImage()}>
                    {uploadingProductImage ? "Dang upload..." : "Upload ?nh"}
                  </button>
                </div>
              </label>

              <label className="is-wide">
                <span>M� t? ng?n</span>
                <textarea
                  rows={2}
                  value={productForm.shortDescription}
                  onChange={(event) => handleProductFieldChange("shortDescription", event.target.value)}
                />
              </label>
              <label className="is-wide">
                <span>M� t? chi ti?t</span>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(event) => handleProductFieldChange("description", event.target.value)}
                />
              </label>
              <label className="is-wide">
                <span>Th�ng s? k? thu?t</span>
                <textarea
                  rows={3}
                  value={productForm.specifications}
                  onChange={(event) => handleProductFieldChange("specifications", event.target.value)}
                />
              </label>
            </div>

            <div className="owner-crm-product-side">
              <div className="owner-crm-product-preview">
                <p>Xem tru?c ?nh</p>
                {productForm.thumbnail || productForm.image ? (
                  <img src={productForm.thumbnail || productForm.image} alt="preview" />
                ) : (
                  <div className="owner-crm-product-preview-empty">Chua c� ?nh</div>
                )}
                <strong>{editingProduct ? `Dang s?a #${editingProduct.id}` : "Tao m?i san pham"}</strong>
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
            <h2>Danh s�ch sản phẩm ({filteredProducts.length})</h2>
            <div className="owner-crm-toolbar">
              <select
                value={productCategoryFilter === null ? "ALL" : String(productCategoryFilter)}
                onChange={(event) => setProductCategoryFilter(event.target.value === "ALL" ? null : Number(event.target.value))}
              >
                <option value="ALL">T?t c? danh mục</option>
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
                <option value="ALL">T?t c? trạng thái</option>
                <option value="ACTIVE">Dang b�n</option>
                <option value="INACTIVE">Ng?ng b�n</option>
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
                    <th>?nh</th>
                    <th>sản phẩm</th>
                    <th>danh mục</th>
                    <th>thương hiệu</th>
                    <th>giá / giảm</th>
                    <th>T?n kho</th>
                    <th>trạng thái</th>
                    <th>Thao t�c</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="owner-crm-order-code">SP{String(product.id).padStart(4, "0")}</td>
                      <td>
                        {product.thumbnail || product.image ? (
                          <img
                            className="owner-crm-product-thumb"
                            src={product.thumbnail || product.image || ""}
                            alt={product.name}
                          />
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
                  ))}
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
            <span>�on dang l?c</span>
            <strong>{filteredOrders.length}</strong>
          </article>
          <article>
            <span>�on ch? x? l�</span>
            <strong>{pendingOrders}</strong>
          </article>
          <article>
            <span>Doanh thu t?m t�nh</span>
            <strong>{moneyFormatter.format(totalRevenue)}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Quản lý đơn hàng</h2>
            <div className="owner-crm-toolbar">
              <input
                type="text"
                placeholder="T�m theo m� don / kh�ch h�ng..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OrderStatusFilter)}>
                <option value="ALL">T?t c? trạng thái</option>
                <option value="PENDING">Ch? x? l�</option>
                <option value="PROCESSING">�ang x? l�</option>
                <option value="SHIPPING">�ang giao</option>
                <option value="COMPLETED">Ho�n t?t</option>
                <option value="CANCELLED">�� h?y</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setKeyword("");
                  setStatusFilter("ALL");
                }}
              >
                �?t l?i
              </button>
            </div>
          </div>

          {orderMessage ? <p className="owner-crm-empty">{orderMessage}</p> : null}
          {orderError ? <p className="owner-crm-empty">{orderError}</p> : null}
          {isLoadingOrders ? <p className="owner-crm-empty">�ang t?i danh s�ch đơn hàng...</p> : null}

          {!isLoadingOrders && !orderError && !filteredOrders.length ? (
            <p className="owner-crm-empty">không c� đơn hàng ph� h?p v?i di?u ki?n l?c hi?n t?i.</p>
          ) : null}

          {!isLoadingOrders && !orderError && filteredOrders.length ? (
            <div className="owner-crm-table-wrap">
              <table className="owner-crm-table">
                <thead>
                  <tr>
                    <th>M� don</th>
                    <th>Kh�ch h�ng</th>
                    <th>Ngu?i nh?n</th>
                    <th>Th?</th>
                    <th>Thanh to�n</th>
                    <th>trạng thái</th>
                    <th>Tổng ti?n</th>
                    <th>Th?i gian</th>
                    <th>C?p nh?t</th>
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
                        <td>{order.receiverName || "Chua c?p nh?t"}</td>
                        <td>
                          <span className="owner-crm-chip">{toOrderTag(index)}</span>
                        </td>
                        <td>{order.paymentMethod || "không r�"}</td>
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
                              {updatingOrderId === order.id ? "�ang c?p nh?t..." : "C?p nh?t"}
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
            <h2>Quản lý ngu?i d�ng</h2>
          </div>
          <p className="owner-crm-empty">tài khoản Admin không c� quy?n t?o, x�a, d?i vai tr� ho?c kh�a/m? tài khoản.</p>
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
            <span>S? Admin</span>
            <strong>{adminCount}</strong>
          </article>
          <article>
            <span>S? Staff</span>
            <strong>{staffCount}</strong>
          </article>
          <article>
            <span>�ang kh�a</span>
            <strong>{lockedUserCount}</strong>
          </article>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>T?o tài khoản v?n h�nh</h2>
            <div className="owner-crm-toolbar">
              <button type="button" onClick={() => setNewRole("staff")}>
                Ch?n Staff
              </button>
              <button type="button" onClick={() => setNewRole("admin")}>
                Ch?n Admin
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
              placeholder="T�n dang nh?p"
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
              {creatingUser ? "�ang t?o..." : "T?o tài khoản"}
            </button>
          </div>
        </section>

        <section className="owner-crm-panel">
          <div className="owner-crm-panel-head">
            <h2>Danh s�ch tài khoản ({ownerManagedUsers.length})</h2>
          </div>

          {isLoadingUsers ? <p className="owner-crm-empty">�ang t?i danh s�ch tài khoản...</p> : null}

          {!isLoadingUsers && !ownerManagedUsers.length ? (
            <p className="owner-crm-empty">Chua c� tài khoản v?n h�nh n�o d? hi?n th?.</p>
          ) : null}

          {!isLoadingUsers && ownerManagedUsers.length ? (
            <div className="owner-crm-table-wrap">
              <table className="owner-crm-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>tài khoản</th>
                    <th>Vai tr�</th>
                    <th>trạng thái</th>
                    <th>Thao t�c</th>
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
                          {item.locked ? "�� kh�a" : "�ang ho?t d?ng"}
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
                            X�a
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
            <strong>{isOwner ? "ShopPro Owner" : "ShopPro Admin"}</strong>
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
            <p>�I?U HU?NG</p>
            <button type="button" className={activeView === "overview" ? "active" : ""} onClick={() => setActiveView("overview")}>
              Tổng quan
            </button>
            <button
              type="button"
              className={activeView === "categories" ? "active" : ""}
              onClick={() => setActiveView("categories")}
            >
              danh mục
            </button>
            <button type="button" className={activeView === "products" ? "active" : ""} onClick={() => setActiveView("products")}>
              sản phẩm
            </button>
            <button type="button" className={activeView === "orders" ? "active" : ""} onClick={() => setActiveView("orders")}>
              �on h�ng
            </button>
            {isOwner ? (
              <button type="button" className={activeView === "users" ? "active" : ""} onClick={() => setActiveView("users")}>
                Ngu?i d�ng
              </button>
            ) : null}
          </div>

          <div className="owner-crm-sidebar-actions">
            <Link to="/products">M? trang sản phẩm</Link>
            <Link to="/owner-staff">B?ng di?u khi?n Staff</Link>
          </div>
        </aside>

        <div className="owner-crm-main">
          <header className="owner-crm-header">
            <div>
              <p className="owner-crm-kicker">{isOwner ? "B?NG �I?U H�NH OWNER/ADMIN" : "B?NG �I?U H�NH ADMIN"}</p>
              <h1>
                {activeView === "overview"
                  ? "Trung t�m di?u h�nh qu?n tr?"
                  : activeView === "categories"
                    ? "Quản lý danh mục sản phẩm"
                    : activeView === "products"
                      ? "Quản lý sản phẩm, kho v� giảm giá"
                    : activeView === "orders"
                      ? "Quản lý đơn hàng"
                      : "Quản lý ngu?i d�ng h? th?ng"}
              </h1>
              <p>
                {activeView === "overview"
                  ? "Theo d�i KPI, đơn hàng, t?n kho v� d? li?u v?n h�nh trong c�ng b?ng di?u khi?n."
                  : activeView === "categories"
                    ? "Trang danh mục d�ng c�ng b? c?c v?i Owner d? d? theo d�i v� thao t�c."
                    : activeView === "products"
                      ? "Admin CRUD sản phẩm ngay t?i day: c?p nh?t ?nh, t?n kho v� giá giảm theo nhu c?u."
                    : activeView === "orders"
                      ? "Admin v� Owner d?u c� th? xem v� c?p nh?t trạng thái đơn hàng."
                      : "Ch? Owner c� quy?n t?o, d?i vai tr�, kh�a/m? ho?c x�a tài khoản qu?n tr?."}
              </p>
            </div>

            <div className="owner-crm-header-actions">
              <Link to="/products">Quản lý sản phẩm</Link>
              <Link to="/owner-staff">Sang b?ng di?u khi?n Staff</Link>
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
                <h2>T�m t?t nhanh</h2>
              </div>
              <div className="owner-crm-kpi-grid">
                <article>
                  <span>Khách h�ng g?n d�y</span>
                  <strong>{customerCount}</strong>
                </article>
                <article>
                  <span>sản phẩm t?n th?p</span>
                  <strong>{lowStock.length}</strong>
                </article>
                <article>
                  <span>L?i d? li?u</span>
                  <strong>{dataIssues.length}</strong>
                </article>
                <article>
                  <span>Ngu?i d�ng qu?n tr?</span>
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