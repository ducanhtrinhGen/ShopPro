package com.example.demo.repository;

import com.example.demo.model.Cart;
import com.example.demo.model.CartLineItem;
import com.example.demo.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartLineItemRepository extends JpaRepository<CartLineItem, Integer> {

    Optional<CartLineItem> findByCartAndProduct(Cart cart, Product product);
}
