import { apiRequest } from "./client";
import type {
  AdminDataIssue,
  AdminOrderDetailResponse,
  AdminOrderItem,
  AdminProductOpsItem
} from "../types";

type OrderQuery = {
  status?: string;
  keyword?: string;
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
