package com.example.demo.api;

import com.example.demo.api.dto.OwnerReportDtos.OwnerOverviewResponse;
import com.example.demo.api.dto.OwnerReportDtos.RecentOrderItem;
import com.example.demo.model.Account;
import com.example.demo.model.Order;
import com.example.demo.model.Role;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.OrderRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/owner/reports")
public class OwnerReportApiController {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_STAFF = "ROLE_STAFF";
    private static final double ESTIMATED_PROFIT_RATE = 0.20d;

    private final OrderRepository orderRepository;
    private final AccountRepository accountRepository;

    public OwnerReportApiController(OrderRepository orderRepository, AccountRepository accountRepository) {
        this.orderRepository = orderRepository;
        this.accountRepository = accountRepository;
    }

    @GetMapping("/overview")
    @Transactional(readOnly = true)
    public OwnerOverviewResponse getOverview() {
        List<Order> allOrders = orderRepository.findAll();
        long totalOrders = allOrders.size();
        long pendingOrders = allOrders.stream()
                .filter(order -> "PENDING".equalsIgnoreCase(order.getOrderStatus()))
                .count();
        long completedOrders = allOrders.stream()
                .filter(this::isCompletedStatus)
                .count();

        long totalRevenue = allOrders.stream()
                .mapToLong(Order::getTotalAmount)
                .sum();
        long averageOrderValue = totalOrders == 0 ? 0L : (totalRevenue / totalOrders);
        long estimatedProfit = Math.round(totalRevenue * ESTIMATED_PROFIT_RATE);

        List<Account> allAccounts = accountRepository.findAll();
        long adminCount = allAccounts.stream().filter(account -> hasRole(account, ROLE_ADMIN)).count();
        long staffCount = allAccounts.stream().filter(account -> hasRole(account, ROLE_STAFF)).count();
        long activeManagementAccounts = allAccounts.stream()
                .filter(this::isManagementAccount)
                .filter(account -> !account.isLocked())
                .count();
        long lockedManagementAccounts = allAccounts.stream()
                .filter(this::isManagementAccount)
                .filter(Account::isLocked)
                .count();

        List<RecentOrderItem> recentOrders = orderRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(order -> new RecentOrderItem(
                        order.getId(),
                        order.getCreatedAt(),
                        order.getOrderStatus(),
                        order.getTotalAmount(),
                        resolveCustomerUsername(order)))
                .toList();

        return new OwnerOverviewResponse(
                totalOrders,
                pendingOrders,
                completedOrders,
                totalRevenue,
                averageOrderValue,
                estimatedProfit,
                ESTIMATED_PROFIT_RATE,
                adminCount,
                staffCount,
                activeManagementAccounts,
                lockedManagementAccounts,
                recentOrders);
    }

    private String resolveCustomerUsername(Order order) {
        if (order.getAccount() == null || order.getAccount().getLoginName() == null || order.getAccount().getLoginName().isBlank()) {
            return "guest";
        }
        return order.getAccount().getLoginName();
    }

    private boolean isCompletedStatus(Order order) {
        if (order.getOrderStatus() == null) {
            return false;
        }
        String status = order.getOrderStatus().trim().toUpperCase();
        return "COMPLETED".equals(status) || "DELIVERED".equals(status) || "PAID".equals(status);
    }

    private boolean isManagementAccount(Account account) {
        return hasRole(account, ROLE_ADMIN) || hasRole(account, ROLE_STAFF);
    }

    private boolean hasRole(Account account, String roleName) {
        return account.getRoles().stream()
                .map(Role::getName)
                .anyMatch(roleName::equals);
    }
}
