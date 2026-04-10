import { apiRequest } from "./client";
import type { AdminUser, AdminUserRole } from "../types";

export type ManagementRole = Extract<AdminUserRole, "admin" | "staff">;

export function getAdminUsers() {
  return apiRequest<AdminUser[]>("/api/admin/users");
}

export function updateAdminUserRole(userId: number, role: AdminUserRole) {
  return apiRequest<AdminUser>(`/api/admin/users/${userId}/role`, {
    method: "PUT",
    body: { role }
  });
}

export function updateAdminUserLockState(userId: number, locked: boolean) {
  return apiRequest<AdminUser>(`/api/admin/users/${userId}/lock`, {
    method: "PATCH",
    body: { locked }
  });
}

export function createManagementUser(username: string, password: string, role: ManagementRole) {
  return apiRequest<AdminUser>("/api/admin/users", {
    method: "POST",
    body: { username, password, role }
  });
}

export function deleteManagementUser(userId: number) {
  return apiRequest<void>(`/api/admin/users/${userId}`, {
    method: "DELETE"
  });
}
