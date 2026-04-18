package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.CustomerProfileDtos.CustomerProfileDashboardResponse;
import com.example.demo.api.dto.CustomerProfileDtos.CustomerProfileResponse;
import com.example.demo.api.dto.CustomerProfileDtos.CustomerProfileUpdateRequest;
import com.example.demo.api.dto.CustomerProfileDtos.CustomerRecentOrderItem;
import com.example.demo.model.Account;
import com.example.demo.model.Order;
import com.example.demo.model.OrderDetail;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.OrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/customer/profile")
public class CustomerProfileApiController {

    private final AccountRepository accountRepository;
    private final OrderRepository orderRepository;

    public CustomerProfileApiController(AccountRepository accountRepository, OrderRepository orderRepository) {
        this.accountRepository = accountRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getProfile(Authentication authentication) {
        String loginName = resolveLoginName(authentication);
        if (loginName == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("You are not logged in."));
        }

        Account account = accountRepository.findByLoginName(loginName).orElse(null);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Account not found."));
        }

        return ResponseEntity.ok(toProfile(account));
    }

    @GetMapping("/dashboard")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getProfileDashboard(Authentication authentication) {
        String loginName = resolveLoginName(authentication);
        if (loginName == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("You are not logged in."));
        }

        Account account = accountRepository.findByLoginName(loginName).orElse(null);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Account not found."));
        }

        List<Order> orders = orderRepository.findByAccount_LoginNameOrderByCreatedAtDesc(loginName);
        long totalOrders = orders.size();
        long completedOrders = orders.stream()
                .map(o -> normalizeStatus(o.getOrderStatus()))
                .filter(this::isCompletedStatus)
                .count();
        long totalSpent = orders.stream()
                .filter(o -> countsTowardSpend(normalizeStatus(o.getOrderStatus())))
                .mapToLong(Order::getTotalAmount)
                .sum();
        List<CustomerRecentOrderItem> recentOrders = orders.stream()
                .limit(5)
                .map(this::toRecentOrderItem)
                .toList();

        return ResponseEntity.ok(new CustomerProfileDashboardResponse(
                account.getLoginName(),
                trimToNull(account.getFullName()),
                trimToNull(account.getEmail()),
                trimToNull(account.getPhone()),
                trimToNull(account.getAddress()),
                totalOrders,
                completedOrders,
                totalSpent,
                recentOrders));
    }

    @PutMapping
    @Transactional
    public ResponseEntity<?> updateProfile(
            @RequestBody(required = false) CustomerProfileUpdateRequest request,
            Authentication authentication) {
        String loginName = resolveLoginName(authentication);
        if (loginName == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("You are not logged in."));
        }

        if (request == null) {
            return ResponseEntity.badRequest().body(new ApiError("Profile data is required."));
        }

        Account account = accountRepository.findByLoginName(loginName).orElse(null);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Account not found."));
        }

        String nextEmail = trimToNull(request.email());
        if (nextEmail != null) {
            Account existing = accountRepository.findByEmail(nextEmail).orElse(null);
            if (existing != null && existing.getId() != account.getId()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("Email already in use."));
            }
        }

        account.setFullName(trimToNull(request.fullName()));
        account.setEmail(nextEmail);
        account.setPhone(trimToNull(request.phone()));
        account.setAddress(trimToNull(request.address()));

        Account saved = accountRepository.save(account);
        return ResponseEntity.ok(toProfile(saved));
    }

    private CustomerProfileResponse toProfile(Account account) {
        return new CustomerProfileResponse(
                account.getLoginName(),
                trimToNull(account.getFullName()),
                trimToNull(account.getEmail()),
                trimToNull(account.getPhone()),
                trimToNull(account.getAddress()));
    }

    private CustomerRecentOrderItem toRecentOrderItem(Order order) {
        return new CustomerRecentOrderItem(
                order.getId(),
                order.getCreatedAt(),
                normalizeStatus(order.getOrderStatus()),
                order.getTotalAmount(),
                computeTotalQuantity(order));
    }

    private int computeTotalQuantity(Order order) {
        if (order == null || order.getOrderDetails() == null) {
            return 0;
        }
        return order.getOrderDetails().stream()
                .mapToInt(OrderDetail::getQuantity)
                .sum();
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "PENDING";
        }
        return status.trim().toUpperCase();
    }

    private boolean isCompletedStatus(String normalized) {
        return "DELIVERED".equals(normalized) || "COMPLETED".equals(normalized);
    }

    private boolean countsTowardSpend(String normalized) {
        return !"CANCELLED".equals(normalized)
                && !"REFUNDED".equals(normalized)
                && !"FAILED".equals(normalized);
    }

    private String resolveLoginName(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        String name = authentication.getName();
        return name == null || name.isBlank() ? null : name.trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

