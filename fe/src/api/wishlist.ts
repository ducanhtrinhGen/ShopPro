import { apiRequest } from "./client";
import type { WishlistAddResponse, WishlistItem, WishlistToggleResponse } from "../types";

export function getMyWishlist() {
  return apiRequest<WishlistItem[]>("/api/wishlist");
}

export function toggleWishlist(productId: number) {
  return apiRequest<WishlistToggleResponse>(`/api/wishlist/${productId}`, { method: "POST" });
}

export function addToWishlist(productId: number) {
  return apiRequest<WishlistAddResponse>(`/api/wishlist/${productId}/add`, { method: "POST" });
}

export function removeWishlist(productId: number) {
  return apiRequest<void>(`/api/wishlist/${productId}`, { method: "DELETE" });
}

