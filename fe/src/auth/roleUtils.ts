import type { AuthUser } from "../types";

/** Khach da dang nhap voi vai tro mua hang */
export const CUSTOMER_ROLES = ["ROLE_CUSTOMER", "ROLE_USER"] as const;
/** Nhan vien van hanh */
export const STAFF_ROLES = ["ROLE_STAFF"] as const;
/** Quan tri catalog (khong gom quyen nhay cam nhat cua Owner) */
export const ADMIN_ROLES = ["ROLE_ADMIN"] as const;
/** Chu shop — quyen cao nhat */
export const OWNER_ROLES = ["ROLE_OWNER"] as const;

export function hasAnyRole(user: AuthUser | null, roles: readonly string[]) {
  if (!user) {
    return false;
  }

  return user.roles.some((role) => roles.includes(role));
}

export function isOwnerUser(user: AuthUser | null) {
  return hasAnyRole(user, OWNER_ROLES);
}

export function isAdminUser(user: AuthUser | null) {
  return hasAnyRole(user, ADMIN_ROLES);
}

export function isStaffUser(user: AuthUser | null) {
  return hasAnyRole(user, STAFF_ROLES);
}

/** Admin hoac Owner — quan ly catalog, noi dung, khuyen mai */
export function canAccessAdminArea(user: AuthUser | null) {
  return isOwnerUser(user) || isAdminUser(user);
}

/** Khach hang — gio hang, don cua toi */
export function isCustomerUser(user: AuthUser | null) {
  if (!user) {
    return false;
  }

  if (isOwnerUser(user) || isAdminUser(user) || isStaffUser(user)) {
    return false;
  }

  return hasAnyRole(user, CUSTOMER_ROLES);
}

export function getDefaultRouteForUser(user: AuthUser | null) {
  if (!user) {
    return "/";
  }

  if (isOwnerUser(user)) {
    return "/owner";
  }

  if (isAdminUser(user)) {
    return "/admin";
  }

  if (isStaffUser(user)) {
    return "/staff";
  }

  return "/profile";
}

/**
 * Kiem tra quyen vao route co `allowedRoles`.
 * Owner khong tu dong vuot moi route — can khai bao ROLE_OWNER trong danh sach.
 */
export function canAccessRoles(user: AuthUser | null, roles?: readonly string[]) {
  if (!roles || roles.length === 0) {
    return true;
  }

  return hasAnyRole(user, roles);
}
