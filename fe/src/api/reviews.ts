import { apiRequest } from "./client";
import type { ReviewItem, ReviewSummaryResponse } from "../types";

export function getProductReviews(productId: number) {
  return apiRequest<ReviewSummaryResponse>(`/api/reviews?productId=${productId}`);
}

export function upsertReview(payload: { productId: number; rating: number; comment?: string | null }) {
  return apiRequest<ReviewItem>("/api/reviews", {
    method: "POST",
    body: payload
  });
}

