package com.example.demo.repository;

import com.example.demo.model.BlogPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BlogPostRepository extends JpaRepository<BlogPost, Integer> {

    Optional<BlogPost> findBySlug(String slug);

    List<BlogPost> findByStatusOrderByCreatedAtDesc(String status);
}
