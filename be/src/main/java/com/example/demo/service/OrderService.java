package com.example.demo.service;

import com.example.demo.model.Account;
import com.example.demo.model.CartItem;
import com.example.demo.model.Order;
import com.example.demo.model.OrderDetail;
import com.example.demo.model.Product;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CartService cartService;

    @Transactional
    public Order checkout(String loginName, HttpSession session) {
        List<CartItem> cartItems = cartService.getCartItems(session);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("Cart is empty");
        }

        Order order = new Order();
        order.setCreatedAt(LocalDateTime.now());
        order.setOrderDate(LocalDateTime.now());
        order.setOrderStatus("PENDING");
        order.setPaymentMethod("COD");

        Account account = accountRepository.findByLoginName(loginName).orElse(null);
        order.setAccount(account);
        if (account != null) {
            order.setReceiverName(account.getFullName() != null && !account.getFullName().isBlank()
                    ? account.getFullName()
                    : account.getLoginName());
            order.setPhone(account.getPhone());
            order.setAddress(account.getAddress());
            order.setEmail(account.getEmail());
        }

        long totalAmount = 0L;
        for (CartItem cartItem : cartItems) {
            Product product = productRepository.findByIdForUpdate(cartItem.getProductId()).orElse(null);
            if (product == null) {
                continue;
            }

            if (!isPurchasable(product)) {
                throw new IllegalStateException("Sản phẩm không còn bán: " + product.getName());
            }

            int requestedQty = Math.max(cartItem.getQuantity(), 1);
            if (product.getQuantity() <= 0) {
                throw new IllegalStateException("Sản phẩm đã hết hàng: " + product.getName());
            }
            if (requestedQty > product.getQuantity()) {
                throw new IllegalStateException("Tồn kho không đủ cho sản phẩm: " + product.getName()
                        + ". Còn " + product.getQuantity() + ", bạn chọn " + requestedQty + ".");
            }

            long unitPrice = resolveEffectiveUnitPrice(product);
            long subtotal = unitPrice * (long) requestedQty;

            // Deduct stock (simple reservation at checkout time).
            product.setQuantity(product.getQuantity() - requestedQty);
            productRepository.save(product);

            OrderDetail detail = new OrderDetail();
            detail.setProduct(product);
            detail.setProductName(product.getName());
            detail.setUnitPrice(unitPrice);
            detail.setQuantity(requestedQty);
            detail.setSubtotal(subtotal);
            order.addOrderDetail(detail);

            totalAmount += subtotal;
        }

        if (order.getOrderDetails().isEmpty()) {
            throw new IllegalStateException("No valid items to checkout");
        }

        order.setTotalAmount(totalAmount);
        Order savedOrder = orderRepository.save(order);
        cartService.clearCart(session);
        return savedOrder;
    }

    private boolean isPurchasable(Product product) {
        String status = product.getStatus() == null ? "" : product.getStatus().trim().toUpperCase();
        return status.isEmpty() || "ACTIVE".equals(status);
    }

    private long resolveEffectiveUnitPrice(Product product) {
        Long discount = product.getDiscountPrice();
        if (discount != null && discount > 0 && discount < product.getPrice()) {
            return discount;
        }
        return product.getPrice();
    }
}
