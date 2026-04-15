package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.OrderDtos.OrderDetailResponse;
import com.example.demo.api.dto.OrderDtos.OrderResponse;
import com.example.demo.api.dto.OrderDtos.OrderSummaryResponse;
import com.example.demo.model.Order;
import com.example.demo.model.OrderDetail;
import com.example.demo.repository.OrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderApiController {

    private final OrderRepository orderRepository;

    public OrderApiController(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> listOrders(Authentication authentication) {
        String loginName = resolveLoginName(authentication);
        if (loginName == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiError("You are not logged in."));
        }

        List<OrderSummaryResponse> orders = orderRepository.findByAccount_LoginNameOrderByCreatedAtDesc(loginName).stream()
                .map(order -> new OrderSummaryResponse(
                        order.getId(),
                        order.getCreatedAt(),
                        normalizeStatus(order.getOrderStatus()),
                        order.getTotalAmount(),
                        computeTotalQuantity(order)))
                .toList();
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOrder(@PathVariable int id, Authentication authentication) {
        String loginName = resolveLoginName(authentication);
        if (loginName == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiError("You are not logged in."));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiError("Order not found."));
        }

        if (order.getAccount() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiError("You do not have permission to view this order."));
        }

        if (!loginName.equals(order.getAccount().getLoginName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiError("You do not have permission to view this order."));
        }

        List<OrderDetailResponse> details = order.getOrderDetails().stream()
                .map(this::toOrderDetail)
                .toList();

        int totalQuantity = details.stream().mapToInt(OrderDetailResponse::quantity).sum();

        return ResponseEntity.ok(new OrderResponse(
                order.getId(),
                order.getCreatedAt(),
                normalizeStatus(order.getOrderStatus()),
                normalizeBlank(order.getPaymentMethod()),
                normalizeBlank(order.getReceiverName()),
                normalizeBlank(order.getPhone()),
                normalizeBlank(order.getAddress()),
                normalizeBlank(order.getEmail()),
                order.getTotalAmount(),
                totalQuantity,
                details));
    }

    private OrderDetailResponse toOrderDetail(OrderDetail detail) {
        int productId = detail.getProduct() != null ? detail.getProduct().getId() : 0;
        return new OrderDetailResponse(
                productId,
                detail.getProductName(),
                detail.getUnitPrice(),
                detail.getQuantity(),
                detail.getSubtotal());
    }

    private int computeTotalQuantity(Order order) {
        if (order == null || order.getOrderDetails() == null) {
            return 0;
        }
        return order.getOrderDetails().stream()
                .mapToInt(OrderDetail::getQuantity)
                .sum();
    }

    private String resolveLoginName(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        String name = authentication.getName();
        return name == null || name.isBlank() ? null : name.trim();
    }

    private String normalizeBlank(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "PENDING";
        }
        return status.trim().toUpperCase();
    }
}
