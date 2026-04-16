import { apiRequest } from "./client";
import type { AdminDataIssue, AdminOrderDetailResponse, AdminOrderItem, AdminProductOpsItem } from "../types";

type OrderQuery = {
  status?: string;
  keyword?: string;
};

export function getStaffOrders(query: OrderQuery = {}) {
  const params = new URLSearchParams();
  if (query.status?.trim()) params.set("status", query.status.trim());
  if (query.keyword?.trim()) params.set("keyword", query.keyword.trim());
  const suffix = params.toString();
  const url = suffix ? `/api/staff/orders?${suffix}` : "/api/staff/orders";
  return apiRequest<AdminOrderItem[]>(url);
}

export function updateStaffOrderStatus(orderId: number, status: string) {
  return apiRequest<AdminOrderDetailResponse>(`/api/staff/orders/${orderId}/status`, {
    method: "PUT",
    body: { status }
  });
}

export function getStaffLowStockProducts(threshold = 5) {
  return apiRequest<AdminProductOpsItem[]>(`/api/staff/inventory/low-stock?threshold=${threshold}`);
}

export function getStaffDataIssues() {
  return apiRequest<AdminDataIssue[]>("/api/staff/data-health/issues");
}

export function patchStaffProductQuantity(productId: number, quantity: number) {
  return apiRequest<AdminProductOpsItem>(`/api/staff/products/${productId}/quantity`, {
    method: "PATCH",
    body: { quantity }
  });
}
