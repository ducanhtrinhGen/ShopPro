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
                    : account.getLogin_name());
            order.setPhone(account.getPhone());
            order.setAddress(account.getAddress());
            order.setEmail(account.getEmail());
        }

        long totalAmount = 0L;
        for (CartItem cartItem : cartItems) {
            Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
            if (product == null) {
                continue;
            }

            OrderDetail detail = new OrderDetail();
            detail.setProduct(product);
            detail.setProductName(cartItem.getProductName());
            detail.setUnitPrice(cartItem.getPrice());
            detail.setPrice(cartItem.getPrice());
            detail.setQuantity(cartItem.getQuantity());
            detail.setSubtotal(cartItem.getSubtotal());
            order.addOrderDetail(detail);

            totalAmount += cartItem.getSubtotal();
        }

        if (order.getOrderDetails().isEmpty()) {
            throw new IllegalStateException("No valid items to checkout");
        }

        order.setTotalAmount(totalAmount);
        Order savedOrder = orderRepository.save(order);
        cartService.clearCart(session);
        return savedOrder;
    }
}
