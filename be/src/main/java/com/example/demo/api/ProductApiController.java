package com.example.demo.api;

import com.example.demo.api.dto.CatalogDtos.ProductItem;
import com.example.demo.api.dto.CatalogDtos.ProductPageResponse;
import com.example.demo.model.Product;
import com.example.demo.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
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
            @RequestParam(defaultValue = "default") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int pageSize) {

        int sanitizedPageSize = Math.min(Math.max(pageSize, 1), 40);
        Page<Product> productPage = productService.getProducts(keyword, categoryId, sort, page, sanitizedPageSize);

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

    private ProductItem toProductItem(Product product) {
        Integer categoryId = product.getCategory() != null ? product.getCategory().getId() : null;
        String categoryName = product.getCategory() != null ? product.getCategory().getName() : null;

        return new ProductItem(
                product.getId(),
                product.getName(),
                product.getPrice(),
                ImageUrlResolver.toPublicImageUrl(product.getImage()),
                categoryId,
                categoryName);
    }
}
