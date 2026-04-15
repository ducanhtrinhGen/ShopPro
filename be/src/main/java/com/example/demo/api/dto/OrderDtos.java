package com.example.demo.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {
    }

    public record OrderDetailResponse(
            int productId,
            String productName,
            long unitPrice,
            int quantity,
            long subtotal) {
    }

    public record OrderSummaryResponse(
            int id,
            LocalDateTime createdAt,
            String status,
            long totalAmount,
            int totalQuantity) {
    }

    public record OrderResponse(
            int id,
            LocalDateTime createdAt,
            String status,
            String paymentMethod,
            String receiverName,
            String phone,
            String address,
            String email,
            long totalAmount,
            int totalQuantity,
            List<OrderDetailResponse> details) {
    }
}
