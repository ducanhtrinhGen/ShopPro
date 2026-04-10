package com.example.demo.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public final class OwnerReportDtos {

    private OwnerReportDtos() {
    }

    public record RecentOrderItem(
            int id,
            LocalDateTime createdAt,
            String status,
            long totalAmount,
            String customerUsername) {
    }

    public record OwnerOverviewResponse(
            long totalOrders,
            long pendingOrders,
            long completedOrders,
            long totalRevenue,
            long averageOrderValue,
            long estimatedProfit,
            double estimatedProfitRate,
            long adminCount,
            long staffCount,
            long activeManagementAccounts,
            long lockedManagementAccounts,
            List<RecentOrderItem> recentOrders) {
    }
}
