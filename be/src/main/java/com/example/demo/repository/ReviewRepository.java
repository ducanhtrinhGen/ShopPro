package com.example.demo.repository;

import com.example.demo.model.Account;
import com.example.demo.model.Product;
import com.example.demo.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Integer> {

    boolean existsByUserAndProduct(Account user, Product product);

    Optional<Review> findByUserAndProduct(Account user, Product product);

    List<Review> findByProductOrderByCreatedAtDesc(Product product);

    long deleteByProduct(Product product);
}
