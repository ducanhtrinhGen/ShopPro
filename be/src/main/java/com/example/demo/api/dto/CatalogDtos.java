package com.example.demo.api.dto;

import java.util.List;

public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record CategoryItem(int id, String name) {
    }

    public record BrandItem(int id, String name) {
    }

    public record ProductItem(
            int id,
            String name,
            long price,
            Long discountPrice,
            String imageUrl,
            String thumbnailUrl,
            String slug,
            int quantity,
            String status,
            Integer categoryId,
            String categoryName,
            Integer brandId,
            String brandName) {
    }

    public record ProductDetailResponse(
            int id,
            String name,
            String slug,
            long price,
            Long discountPrice,
            int quantity,
            String status,
            String imageUrl,
            String thumbnailUrl,
            Integer categoryId,
            String categoryName,
            Integer brandId,
            String brandName,
            List<String> galleryImages,
            String sku,
            String shortDescription,
            String description,
            String specifications,
            String warrantyPolicy,
            List<String> supportHighlights,
            List<ProductItem> relatedProducts) {
    }

    public record ProductPageResponse(
            List<ProductItem> items,
            int page,
            int pageSize,
            int totalPages,
            long totalItems,
            boolean hasPrevious,
            boolean hasNext) {
    }
}
