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

import java.util.Locale;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    public Page<Product> getProducts(String keyword,
            Integer categoryId,
            Integer brandId,
            Boolean promoOnly,
            Boolean clearanceOnly,
            Boolean inStockOnly,
            String sort,
            int page,
            int pageSize) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), pageSize, buildSort(sort));
        Specification<Product> specification = buildSpecification(keyword, categoryId, brandId, promoOnly, clearanceOnly,
                inStockOnly);
        return productRepository.findAll(specification, pageable);
    }

    public void saveProduct(Product product) {
        productRepository.save(product);
    }

    public Product getProductById(int id) {
        return productRepository.findById(id).orElse(null);
    }

    public Product getProductBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return null;
        }
        return productRepository.findBySlug(slug.trim()).orElse(null);
    }

    public java.util.List<Product> getRelatedProducts(Product product, int limit) {
        if (product == null || limit <= 0) {
            return java.util.List.of();
        }

        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<Product> page;

        if (product.getCategory() != null) {
            page = productRepository.findByStatusIgnoreCaseAndCategory_IdAndIdNot("ACTIVE", product.getCategory().getId(), product.getId(), pageable);
            if (page.hasContent()) {
                return page.getContent();
            }
        }

        if (product.getBrand() != null) {
            page = productRepository.findByStatusIgnoreCaseAndBrand_IdAndIdNot("ACTIVE", product.getBrand().getId(), product.getId(), pageable);
            if (page.hasContent()) {
                return page.getContent();
            }
        }

        return productRepository.findByStatusIgnoreCaseAndIdNot("ACTIVE", product.getId(), pageable).getContent();
    }

    public void deleteProduct(int id) {
        productRepository.deleteById(id);
    }

    private Specification<Product> buildSpecification(String keyword,
            Integer categoryId,
            Integer brandId,
            Boolean promoOnly,
            Boolean clearanceOnly,
            Boolean inStockOnly) {
        return (root, query, cb) -> {
            Predicate predicate = cb.conjunction();

            if (keyword != null && !keyword.isBlank()) {
                String normalizedKeyword = keyword.trim().toLowerCase(Locale.ROOT);
                predicate = cb.and(predicate, cb.like(cb.lower(root.get("name")), "%" + normalizedKeyword + "%"));
            }

            if (categoryId != null) {
                predicate = cb.and(predicate,
                        cb.equal(root.get("category").get("id"), categoryId));
            }

            if (brandId != null) {
                predicate = cb.and(predicate, cb.equal(root.get("brand").get("id"), brandId));
            }

            boolean promo = promoOnly != null && promoOnly;
            if (promo) {
                predicate = cb.and(predicate,
                        cb.isNotNull(root.get("discountPrice")),
                        cb.greaterThan(root.get("discountPrice"), 0L),
                        cb.lessThan(root.get("discountPrice"), root.get("price")));
            }

            boolean clearance = clearanceOnly != null && clearanceOnly;
            if (clearance) {
                predicate = cb.and(predicate, cb.isTrue(root.get("clearance")));
            }

            boolean inStock = inStockOnly != null && inStockOnly;
            if (inStock) {
                predicate = cb.and(predicate, cb.greaterThan(root.get("quantity"), 0));
            }

            return predicate;
        };
    }

    private Sort buildSort(String sort) {
        String normalized = sort == null ? "" : sort.trim();
        if ("priceAsc".equals(sort)) {
            return Sort.by("price").ascending().and(Sort.by("id").ascending());
        }

        if ("priceDesc".equals(sort)) {
            return Sort.by("price").descending().and(Sort.by("id").ascending());
        }

        if ("newest".equals(normalized)) {
            return Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
        }

        if ("discountDesc".equals(normalized)) {
            // Promotion first: higher (price - discountPrice) then newest.
            return Sort.by(Sort.Direction.DESC, "discountPrice").and(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        // default
        return Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
    }
}
