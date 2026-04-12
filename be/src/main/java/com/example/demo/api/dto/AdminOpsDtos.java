package com.example.demo.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public final class AdminOpsDtos {

    private AdminOpsDtos() {
    }

    public record ProductUpsertRequest(
            String name,
            String slug,
            Integer categoryId,
            Integer brandId,
            Long price,
            Long discountPrice,
            Integer quantity,
            String shortDescription,
            String description,
            String specifications,
            String image,
            String thumbnail,
            String status) {
    }

    public record CategoryUpsertRequest(
            String name,
            String description,
            String status) {
    }

    public record BrandUpsertRequest(
            String name,
            String description,
            String status) {
    }

    public record BlogPostUpsertRequest(
            String title,
            String slug,
            String thumbnail,
            String summary,
            String content,
            String status) {
    }

    public record PromotionUpdateRequest(
            Long discountPrice,
            String status) {
    }

    public record OrderStatusUpdateRequest(String status) {
    }

    public record AdminProductItem(
            int id,
            String name,
            String slug,
            Integer categoryId,
            String categoryName,
            Integer brandId,
            String brandName,
            long price,
            Long discountPrice,
            int quantity,
            String shortDescription,
            String description,
            String specifications,
            String image,
            String thumbnail,
            String status,
            LocalDateTime createdAt) {
    }

    public record AdminCategoryItem(
            int id,
            String name,
            String description,
            String status) {
    }

    public record AdminBrandItem(
            int id,
            String name,
            String description,
            String status) {
    }

    public record AdminBlogPostItem(
            int id,
            String title,
            String slug,
            String thumbnail,
            String summary,
            String content,
            String status,
            LocalDateTime createdAt) {
    }

    public record AdminOrderItem(
            int id,
            LocalDateTime createdAt,
            String orderStatus,
            long totalAmount,
            String paymentMethod,
            String receiverName,
            String customerUsername,
            int itemCount) {
    }

    public record AdminOrderDetailItem(
            int id,
            Integer productId,
            String productName,
            long unitPrice,
            int quantity,
            long subtotal) {
    }

    public record AdminOrderDetailResponse(
            int id,
            LocalDateTime createdAt,
            String orderStatus,
            long totalAmount,
            String paymentMethod,
            String receiverName,
            String phone,
            String address,
            String email,
            String customerUsername,
            List<AdminOrderDetailItem> details) {
    }

    public record DataIssueItem(
            String code,
            String message,
            Integer referenceId) {
    }

    public record ProductDeleteResult(
            boolean deleted,
            boolean deactivated,
            String message,
            AdminProductItem product) {
    }
}
