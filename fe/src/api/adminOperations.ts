import { ApiRequestError, apiRequest, withApiBaseUrl } from "./client";
import type {
  AdminDataIssue,
  AdminBrandItem,
  AdminCloudinaryUploadResponse,
  AdminOrderDetailResponse,
  AdminOrderItem,
  AdminProductOpsItem,
  AdminProductSubImageItem,
  AdminProductUpsertPayload
} from "../types";

type OrderQuery = {
  status?: string;
  keyword?: string;
};

type ProductQuery = {
  keyword?: string;
  categoryId?: number | null;
  brandId?: number | null;
  status?: string;
  lowStockOnly?: boolean;
  threshold?: number;
};

export type DeleteAdminProductResult = {
  deleted: boolean;
  deactivated: boolean;
  message: string;
  product: AdminProductOpsItem | null;
};

export function getAdminOrders(query: OrderQuery = {}) {
  const params = new URLSearchParams();

  if (query.status?.trim()) {
    params.set("status", query.status.trim());
  }
  if (query.keyword?.trim()) {
    params.set("keyword", query.keyword.trim());
  }

  const suffix = params.toString();
  const url = suffix ? `/api/admin/orders?${suffix}` : "/api/admin/orders";
  return apiRequest<AdminOrderItem[]>(url);
}

export function getAdminOrderDetail(orderId: number) {
  return apiRequest<AdminOrderDetailResponse>(`/api/admin/orders/${orderId}`);
}

export function updateAdminOrderStatus(orderId: number, status: string) {
  return apiRequest<AdminOrderDetailResponse>(`/api/admin/orders/${orderId}/status`, {
    method: "PUT",
    body: { status }
  });
}

export function getAdminLowStockProducts(threshold = 5) {
  return apiRequest<AdminProductOpsItem[]>(`/api/admin/inventory/low-stock?threshold=${threshold}`);
}

export function getAdminDataIssues() {
  return apiRequest<AdminDataIssue[]>("/api/admin/data-health/issues");
}

export function getAdminProducts(query: ProductQuery = {}) {
  const params = new URLSearchParams();

  if (query.keyword?.trim()) {
    params.set("keyword", query.keyword.trim());
  }
  if (query.categoryId !== undefined && query.categoryId !== null) {
    params.set("categoryId", String(query.categoryId));
  }
  if (query.brandId !== undefined && query.brandId !== null) {
    params.set("brandId", String(query.brandId));
  }
  if (query.status?.trim()) {
    params.set("status", query.status.trim());
  }
  if (query.lowStockOnly) {
    params.set("lowStockOnly", "true");
    if (query.threshold !== undefined) {
      params.set("threshold", String(query.threshold));
    }
  }

  const suffix = params.toString();
  const url = suffix ? `/api/admin/products?${suffix}` : "/api/admin/products";
  return apiRequest<AdminProductOpsItem[]>(url);
}

export function getAdminProductById(productId: number) {
  return apiRequest<AdminProductOpsItem>(`/api/admin/products/${productId}`);
}

export function createAdminProduct(payload: AdminProductUpsertPayload) {
  return apiRequest<AdminProductOpsItem>("/api/admin/products", {
    method: "POST",
    body: payload
  });
}

export function updateAdminProduct(productId: number, payload: AdminProductUpsertPayload) {
  return apiRequest<AdminProductOpsItem>(`/api/admin/products/${productId}`, {
    method: "PUT",
    body: payload
  });
}

export function deleteAdminProduct(productId: number) {
  return apiRequest<DeleteAdminProductResult>(`/api/admin/products/${productId}`, {
    method: "DELETE"
  });
}

export function getAdminProductSubImages(productId: number) {
  return apiRequest<AdminProductSubImageItem[]>(`/api/admin/products/${productId}/sub-images`);
}

export async function uploadAdminProductSubImages(productId: number, files: File[]) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(withApiBaseUrl(`/api/admin/products/${productId}/sub-images`), {
    method: "POST",
    credentials: "include",
    body: formData
  });

  const rawBody = await response.text();
  if (!response.ok) {
    const jsonBody = parseJsonSafely<{ message?: string }>(rawBody);
    const plainText = rawBody.trim();
    const looksLikeHtml = plainText.startsWith("<!DOCTYPE") || plainText.startsWith("<html");
    const fallbackFromBody = !looksLikeHtml && plainText ? plainText : undefined;
    const message = jsonBody?.message ?? fallbackFromBody ?? `Upload anh phu that bai voi ma ${response.status}`;
    throw new ApiRequestError(message, response.status);
  }

  const data = parseJsonSafely<AdminProductSubImageItem[]>(rawBody);
  if (!data) {
    throw new ApiRequestError("Phan hoi upload anh phu khong hop le.", 500);
  }

  return data;
}

export function deleteAdminProductSubImage(productId: number, imageId: number) {
  return apiRequest<void>(`/api/admin/products/${productId}/sub-images/${imageId}`, {
    method: "DELETE"
  });
}

export function getAdminBrands() {
  return apiRequest<AdminBrandItem[]>("/api/admin/brands");
}

type CloudinaryUploadOptions = {
  folder?: string;
  productId?: number;
};

export async function uploadAdminCloudinaryImage(file: File, options: CloudinaryUploadOptions = {}) {
  const formData = new FormData();
  formData.append("file", file);

  if (options.folder?.trim()) {
    formData.append("folder", options.folder.trim());
  }
  if (options.productId !== undefined) {
    formData.append("productId", String(options.productId));
  }

  const response = await fetch(withApiBaseUrl("/api/admin/cloudinary/upload"), {
    method: "POST",
    credentials: "include",
    body: formData
  });

  const rawBody = await response.text();

  if (!response.ok) {
    const jsonBody = parseJsonSafely<{ message?: string }>(rawBody);
    const plainText = rawBody.trim();
    const looksLikeHtml = plainText.startsWith("<!DOCTYPE") || plainText.startsWith("<html");
    const fallbackFromBody = !looksLikeHtml && plainText ? plainText : undefined;
    const message = jsonBody?.message ?? fallbackFromBody ?? `Tai anh that bai voi ma ${response.status}`;
    throw new ApiRequestError(message, response.status);
  }

  const data = parseJsonSafely<AdminCloudinaryUploadResponse>(rawBody);
  if (!data) {
    throw new ApiRequestError("Phan hoi upload anh khong hop le.", 500);
  }

  return data;
}

function parseJsonSafely<T>(rawText: string): T | undefined {
  if (!rawText) {
    return undefined;
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    return undefined;
  }
}
