package com.example.demo.service;

import com.example.demo.model.CartItem;
import com.example.demo.model.Product;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CartService {

    public static final String CART_SESSION_KEY = "cart";

    public void addToCart(Product product, int quantity, HttpSession session) {
        if (product == null) {
            return;
        }

        Map<Integer, CartItem> cart = getCart(session);
        CartItem existingItem = cart.get(product.getId());

        if (existingItem == null) {
            cart.put(product.getId(), new CartItem(
                    product.getId(),
                    product.getName(),
                    product.getPrice(),
                    product.getImage(),
                    Math.max(quantity, 1)));
        } else {
            existingItem.setQuantity(existingItem.getQuantity() + Math.max(quantity, 1));
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
}
