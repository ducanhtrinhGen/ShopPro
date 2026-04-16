package com.example.demo.service;

import com.example.demo.model.CartItem;
import com.example.demo.model.Product;
import com.example.demo.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CartService {

    public static final String CART_SESSION_KEY = "cart";

    @Autowired
    private ProductRepository productRepository;

    public void addToCart(Product product, int quantity, HttpSession session) {
        if (product == null) {
            return;
        }

        if (!isPurchasable(product)) {
            throw new IllegalStateException("Sản phẩm hiện không thể mua.");
        }

        if (product.getQuantity() <= 0) {
            throw new IllegalStateException("Sản phẩm đã hết hàng.");
        }

        int available = product.getQuantity();
        long unitPrice = resolveEffectiveUnitPrice(product);
        Map<Integer, CartItem> cart = getCart(session);
        CartItem existingItem = cart.get(product.getId());

        if (existingItem == null) {
            int requested = Math.max(quantity, 1);
            if (requested > available) {
                throw new IllegalStateException(
                        "Tồn kho không đủ. Còn " + available + " sản phẩm, bạn chọn " + requested + ".");
            }
            cart.put(product.getId(), new CartItem(
                    product.getId(),
                    product.getName(),
                    unitPrice,
                    product.getImage(),
                    requested));
        } else {
            int requested = existingItem.getQuantity() + Math.max(quantity, 1);
            if (requested > available) {
                throw new IllegalStateException(
                        "Tồn kho không đủ. Còn " + available + " sản phẩm, trong giỏ đã có "
                                + existingItem.getQuantity() + ".");
            }
            existingItem.setPrice(unitPrice);
            existingItem.setQuantity(requested);
        }
    }

    public void updateQuantity(int productId, int quantity, HttpSession session) {
        Map<Integer, CartItem> cart = getCart(session);
        CartItem cartItem = cart.get(productId);

        if (cartItem == null) {
            return;
        }

        if (quantity <= 0) {
            cart.remove(productId);
            return;
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            throw new IllegalStateException("Sản phẩm không tồn tại.");
        }
        if (!isPurchasable(product)) {
            throw new IllegalStateException("Sản phẩm hiện không thể mua.");
        }
        if (product.getQuantity() <= 0) {
            throw new IllegalStateException("Sản phẩm đã hết hàng.");
        }
        if (quantity > product.getQuantity()) {
            throw new IllegalStateException(
                    "Tồn kho không đủ. Còn " + product.getQuantity() + " sản phẩm, bạn chọn " + quantity + ".");
        }

        cartItem.setQuantity(quantity);
    }

    public void removeFromCart(int productId, HttpSession session) {
        getCart(session).remove(productId);
    }

    public List<CartItem> getCartItems(HttpSession session) {
        return new ArrayList<>(getCart(session).values());
    }

    public int getTotalQuantity(HttpSession session) {
        return getCart(session).values().stream()
                .mapToInt(CartItem::getQuantity)
                .sum();
    }

    public long getTotalAmount(HttpSession session) {
        return getCart(session).values().stream()
                .mapToLong(CartItem::getSubtotal)
                .sum();
    }

    public void clearCart(HttpSession session) {
        getCart(session).clear();
    }

    @SuppressWarnings("unchecked")
    private Map<Integer, CartItem> getCart(HttpSession session) {
        Object cartObject = session.getAttribute(CART_SESSION_KEY);
        if (cartObject instanceof Map<?, ?> cart) {
            return (Map<Integer, CartItem>) cart;
        }

        Map<Integer, CartItem> newCart = new LinkedHashMap<>();
        session.setAttribute(CART_SESSION_KEY, newCart);
        return newCart;
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
