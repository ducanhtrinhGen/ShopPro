import { apiRequest } from "./client";
import type { CustomerOrderSummary, CustomerProfile, OrderResponse } from "../types";

export function getMyOrders() {
  return apiRequest<CustomerOrderSummary[]>("/api/orders");
}

export function getMyOrder(orderId: number) {
  return apiRequest<OrderResponse>(`/api/orders/${orderId}`);
}

export function getCustomerProfile() {
  return apiRequest<CustomerProfile>("/api/customer/profile");
}

export function updateCustomerProfile(payload: Omit<CustomerProfile, "username">) {
  return apiRequest<CustomerProfile>("/api/customer/profile", {
    method: "PUT",
    body: payload
  });
}

