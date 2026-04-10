import type { AuthUser } from "../types";

export const OWNER_ROLES = ["ROLE_OWNER"];
export const ADMIN_ROLES = ["ROLE_ADMIN"];
export const OWNER_STAFF_ROLES = ["ROLE_OWNER", "ROLE_STAFF"];
export const CUSTOMER_ROLES = ["ROLE_CUSTOMER", "ROLE_USER"];

export function hasAnyRole(user: AuthUser | null, roles: readonly string[]) {
  if (!user) {
    return false;
  }

  return user.roles.some((role) => roles.includes(role));
}

export function isAdminUser(user: AuthUser | null) {
  return hasAnyRole(user, ADMIN_ROLES);
}

export function isOwnerUser(user: AuthUser | null) {
  return hasAnyRole(user, OWNER_ROLES);
}

export function canAccessAdminArea(user: AuthUser | null) {
  return isOwnerUser(user) || isAdminUser(user);
}

export function isOwnerOrStaffUser(user: AuthUser | null) {
  return hasAnyRole(user, OWNER_STAFF_ROLES);
}

export function isCustomerUser(user: AuthUser | null) {
  if (!user) {
    return false;
  }

  if (hasAnyRole(user, CUSTOMER_ROLES)) {
    return true;
  }

  return !isAdminUser(user) && !isOwnerOrStaffUser(user);
}

export function getDefaultRouteForUser(user: AuthUser | null) {
  if (!user) {
    return "/";
  }

  if (isOwnerUser(user)) {
    return "/owner-staff";
  }

  if (isAdminUser(user)) {
    return "/admin";
  }

  if (isOwnerOrStaffUser(user)) {
    return "/owner-staff";
  }

  return "/customer";
}

export function canAccessRoles(user: AuthUser | null, roles?: readonly string[]) {
  if (!roles || roles.length === 0) {
    return true;
  }

  if (isOwnerUser(user)) {
    return true;
  }

  return hasAnyRole(user, roles);
}
