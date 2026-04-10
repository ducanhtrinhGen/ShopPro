package com.example.demo.api.dto;

import java.util.List;

public final class CartDtos {

    private CartDtos() {
    }

    public record CartItemRequest(Integer productId, Integer quantity) {
    }

    public record QuantityRequest(Integer quantity) {
    }

    public record CartItemResponse(
            int productId,
            String productName,
            long price,
            String imageUrl,
            int quantity,
            long subtotal) {
    }

    public record CartResponse(List<CartItemResponse> items, int totalQuantity, long totalAmount) {
    }

    public record CheckoutResponse(int orderId) {
    }
}
