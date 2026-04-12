package com.example.demo.repository;

import com.example.demo.model.Product;
import com.example.demo.model.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductImageRepository extends JpaRepository<ProductImage, Integer> {

    boolean existsByProductAndImageUrl(Product product, String imageUrl);

    long deleteByProduct(Product product);
}
