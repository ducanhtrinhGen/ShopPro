package com.example.demo.repository;

import com.example.demo.model.Account;
import com.example.demo.model.Product;
import com.example.demo.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Integer> {

    boolean existsByUserAndProduct(Account user, Product product);
}
