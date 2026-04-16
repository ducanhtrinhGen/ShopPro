package com.example.demo.api;

import com.example.demo.api.dto.CatalogDtos.ProductItem;
import com.example.demo.api.dto.CatalogDtos.ProductDetailResponse;
import com.example.demo.api.dto.CatalogDtos.ProductPageResponse;
import com.example.demo.model.Product;
import com.example.demo.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductApiController {

    private final ProductService productService;

    public ProductApiController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ProductPageResponse listProducts(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Integer brandId,
            @RequestParam(required = false) Boolean promoOnly,
            @RequestParam(required = false) Boolean inStockOnly,
            @RequestParam(defaultValue = "default") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int pageSize) {

        int sanitizedPageSize = Math.min(Math.max(pageSize, 1), 40);
        Page<Product> productPage = productService.getProducts(
                keyword,
                categoryId,
                brandId,
                promoOnly,
                inStockOnly,
                sort,
                page,
                sanitizedPageSize);

        List<ProductItem> items = productPage.getContent().stream()
                .map(this::toProductItem)
                .toList();

        return new ProductPageResponse(
                items,
                productPage.getNumber(),
                productPage.getSize(),
                productPage.getTotalPages(),
                productPage.getTotalElements(),
                productPage.hasPrevious(),
                productPage.hasNext());
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<?> getProductBySlug(@PathVariable String slug) {
        String normalized = slug == null ? "" : slug.trim();
        if (normalized.isEmpty()) {
            return ResponseEntity.badRequest().body("Slug khong hop le.");
        }

        Product product = productService.getProductBySlug(normalized);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Khong tim thay san pham.");
        }
        return ResponseEntity.ok(toProductDetail(product));
    }

    private ProductItem toProductItem(Product product) {
        Integer categoryId = product.getCategory() != null ? product.getCategory().getId() : null;
        String categoryName = product.getCategory() != null ? product.getCategory().getName() : null;
        Integer brandId = product.getBrand() != null ? product.getBrand().getId() : null;
        String brandName = product.getBrand() != null ? product.getBrand().getName() : null;

        return new ProductItem(
                product.getId(),
                product.getName(),
                product.getPrice(),
                product.getDiscountPrice(),
                ImageUrlResolver.toPublicImageUrl(product.getImage()),
                ImageUrlResolver.toPublicImageUrl(product.getThumbnail()),
                product.getSlug(),
                product.getQuantity(),
                product.getStatus(),
                categoryId,
                categoryName,
                brandId,
                brandName);
    }

    private ProductDetailResponse toProductDetail(Product product) {
        Integer categoryId = product.getCategory() != null ? product.getCategory().getId() : null;
        String categoryName = product.getCategory() != null ? product.getCategory().getName() : null;
        Integer brandId = product.getBrand() != null ? product.getBrand().getId() : null;
        String brandName = product.getBrand() != null ? product.getBrand().getName() : null;

        return new ProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getPrice(),
                product.getDiscountPrice(),
                product.getQuantity(),
                product.getStatus(),
                ImageUrlResolver.toPublicImageUrl(product.getImage()),
                ImageUrlResolver.toPublicImageUrl(product.getThumbnail()),
                categoryId,
                categoryName,
                brandId,
                brandName,
                product.getShortDescription(),
                product.getDescription(),
                product.getSpecifications());
    }
}
