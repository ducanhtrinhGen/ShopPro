package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.OrderDtos.OrderDetailResponse;
import com.example.demo.api.dto.OrderDtos.OrderResponse;
import com.example.demo.model.Order;
import com.example.demo.model.OrderDetail;
import com.example.demo.repository.OrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOrder(@PathVariable int id, Authentication authentication) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiError("Order not found."));
        }

        if (order.getAccount() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiError("You do not have permission to view this order."));
        }

        if (!authentication.getName().equals(order.getAccount().getLogin_name())) {
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
}
