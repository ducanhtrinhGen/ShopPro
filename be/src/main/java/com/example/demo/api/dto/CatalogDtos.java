package com.example.demo.api.dto;

import java.util.List;

public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record CategoryItem(int id, String name) {
    }

    public record ProductItem(
            int id,
            String name,
            long price,
            String imageUrl,
            Integer categoryId,
            String categoryName) {
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
