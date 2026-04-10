package com.example.demo.service;

import com.example.demo.model.Product;
import com.example.demo.repository.ProductRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    public Page<Product> getProducts(String keyword, Integer categoryId, String sort, int page, int pageSize) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), pageSize, buildSort(sort));
        Specification<Product> specification = buildSpecification(keyword, categoryId);
        return productRepository.findAll(specification, pageable);
    }

    public void saveProduct(Product product) {
        productRepository.save(product);
    }

    public Product getProductById(int id) {
        return productRepository.findById(id).orElse(null);
    }

    public void deleteProduct(int id) {
        productRepository.deleteById(id);
    }

    private Specification<Product> buildSpecification(String keyword, Integer categoryId) {
        return (root, query, cb) -> {
            Predicate predicate = cb.conjunction();

            if (keyword != null && !keyword.isBlank()) {
                predicate = cb.and(predicate,
                        cb.like(cb.lower(root.get("name")), "%" + keyword.trim().toLowerCase() + "%"));
            }

            if (categoryId != null) {
                predicate = cb.and(predicate,
                        cb.equal(root.get("category").get("id"), categoryId));
            }

            return predicate;
        };
    }

    private Sort buildSort(String sort) {
        if ("priceAsc".equals(sort)) {
            return Sort.by("price").ascending().and(Sort.by("id").ascending());
        }

        if ("priceDesc".equals(sort)) {
            return Sort.by("price").descending().and(Sort.by("id").ascending());
        }

        return Sort.by("id").ascending();
    }
}
