package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.CartDtos.CartItemRequest;
import com.example.demo.api.dto.CartDtos.CartItemResponse;
import com.example.demo.api.dto.CartDtos.CartResponse;
import com.example.demo.api.dto.CartDtos.CheckoutResponse;
import com.example.demo.api.dto.CartDtos.QuantityRequest;
import com.example.demo.model.CartItem;
import com.example.demo.model.Order;
import com.example.demo.model.Product;
import com.example.demo.service.CartService;
import com.example.demo.service.OrderService;
import com.example.demo.service.ProductService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
public class CartApiController {

    private final CartService cartService;
    private final ProductService productService;
    private final OrderService orderService;

    public CartApiController(CartService cartService, ProductService productService, OrderService orderService) {
        this.cartService = cartService;
        this.productService = productService;
        this.orderService = orderService;
    }

    @GetMapping
    public CartResponse getCart(HttpSession session) {
        return toCartResponse(session);
    }

    @PostMapping("/items")
    public ResponseEntity<?> addItem(@RequestBody(required = false) CartItemRequest request, HttpSession session) {
        if (request == null || request.productId() == null) {
            return ResponseEntity.badRequest().body(new ApiError("Product ID is required."));
        }

        int quantity = normalizeQuantity(request.quantity());
        Product product = productService.getProductById(request.productId());
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiError("Product not found."));
        }

        try {
            cartService.addToCart(product, quantity, session);
            return ResponseEntity.ok(toCartResponse(session));
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        }
    }

    @PutMapping("/items/{productId}")
    public ResponseEntity<?> updateItem(
            @PathVariable int productId,
            @RequestBody(required = false) QuantityRequest request,
            HttpSession session) {
        if (request == null || request.quantity() == null) {
            return ResponseEntity.badRequest().body(new ApiError("Quantity is required."));
        }

        try {
            cartService.updateQuantity(productId, request.quantity(), session);
            return ResponseEntity.ok(toCartResponse(session));
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        }
    }

    @DeleteMapping("/items/{productId}")
    public CartResponse removeItem(@PathVariable int productId, HttpSession session) {
        cartService.removeFromCart(productId, session);
        return toCartResponse(session);
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(HttpSession session, Authentication authentication) {
        try {
            Order order = orderService.checkout(authentication.getName(), session);
            return ResponseEntity.ok(new CheckoutResponse(order.getId()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        }
    }

    private CartResponse toCartResponse(HttpSession session) {
        List<CartItemResponse> items = cartService.getCartItems(session).stream()
                .map(this::toCartItemResponse)
                .toList();

        return new CartResponse(items, cartService.getTotalQuantity(session), cartService.getTotalAmount(session));
    }

    private CartItemResponse toCartItemResponse(CartItem item) {
        return new CartItemResponse(
                item.getProductId(),
                item.getProductName(),
                item.getPrice(),
                ImageUrlResolver.toPublicImageUrl(item.getImage()),
                item.getQuantity(),
                item.getSubtotal());
    }

    private int normalizeQuantity(Integer quantity) {
        if (quantity == null) {
            return 1;
        }
        return Math.max(quantity, 1);
    }
}
