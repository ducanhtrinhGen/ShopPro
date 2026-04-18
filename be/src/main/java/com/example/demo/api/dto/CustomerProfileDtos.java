package com.example.demo.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public final class CustomerProfileDtos {

    private CustomerProfileDtos() {
    }

    public record CustomerProfileResponse(
            String username,
            String fullName,
            String email,
            String phone,
            String address) {
    }

    public record CustomerProfileUpdateRequest(
            String fullName,
            String email,
            String phone,
            String address) {
    }

    /**
     * Profile plus order aggregates for the customer dashboard (single round-trip).
     */
    public record CustomerProfileDashboardResponse(
            String username,
            String fullName,
            String email,
            String phone,
            String address,
            long totalOrders,
            long completedOrders,
            long totalSpent,
            List<CustomerRecentOrderItem> recentOrders) {
    }

    public record CustomerRecentOrderItem(
            int id,
            LocalDateTime createdAt,
            String status,
            long totalAmount,
            int totalQuantity) {
    }
}

