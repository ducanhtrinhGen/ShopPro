package com.example.demo.repository;

import com.example.demo.model.Account;
import com.example.demo.model.Product;
import com.example.demo.model.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Integer> {

    Optional<Wishlist> findByUserAndProduct(Account user, Product product);

    List<Wishlist> findAllByUser(Account user);

    long deleteByProduct(Product product);
}
