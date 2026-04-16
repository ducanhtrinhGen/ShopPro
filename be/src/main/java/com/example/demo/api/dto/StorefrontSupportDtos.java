package com.example.demo.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public final class StorefrontSupportDtos {

    private StorefrontSupportDtos() {
    }

    public record WishlistItem(
            int productId,
            String name,
            String slug,
            long price,
            Long discountPrice,
            int quantity,
            String imageUrl,
            String thumbnailUrl,
            Integer categoryId,
            String categoryName,
            Integer brandId,
            String brandName) {
    }

    public record WishlistToggleResponse(boolean wished) {
    }

    public record ReviewItem(
            int id,
            int productId,
            String username,
            int rating,
            String comment,
            LocalDateTime createdAt) {
    }

    public record ReviewSummaryResponse(
            int productId,
            int totalReviews,
            double averageRating,
            boolean canReview,
            ReviewItem myReview,
            List<ReviewItem> reviews) {
    }

    public record ReviewUpsertRequest(Integer productId, Integer rating, String comment) {
    }

    public record BlogPostSummary(
            int id,
            String title,
            String slug,
            String thumbnailUrl,
            String summary,
            LocalDateTime createdAt) {
    }

    public record BlogPostDetail(
            int id,
            String title,
            String slug,
            String thumbnailUrl,
            String summary,
            String content,
            LocalDateTime createdAt) {
    }

    public record ContactMessageCreateRequest(
            String fullName,
            String email,
            String subject,
            String message) {
    }

    public record ContactMessageCreateResponse(boolean created) {
    }
}

