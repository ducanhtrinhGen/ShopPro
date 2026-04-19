package com.example.demo.api;

import com.example.demo.api.dto.CatalogDtos.ProductItem;
import com.example.demo.api.dto.CatalogDtos.ProductDetailResponse;
import com.example.demo.api.dto.CatalogDtos.ProductPageResponse;
import com.example.demo.model.ProductImage;
import com.example.demo.repository.ProductImageRepository;
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

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/products")
public class ProductApiController {

    private final ProductService productService;
    private final ProductImageRepository productImageRepository;

    public ProductApiController(ProductService productService, ProductImageRepository productImageRepository) {
        this.productService = productService;
        this.productImageRepository = productImageRepository;
    }

    @GetMapping
    public ProductPageResponse listProducts(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Integer brandId,
            @RequestParam(required = false) Boolean promoOnly,
            @RequestParam(required = false) Boolean clearanceOnly,
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
                clearanceOnly,
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
                product.isClearance(),
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
        List<String> galleryImages = buildGalleryImages(product);
        List<ProductItem> relatedProducts = productService.getRelatedProducts(product, 4).stream()
                .map(this::toProductItem)
                .toList();

        return new ProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getPrice(),
                product.getDiscountPrice(),
                product.isClearance(),
                product.getQuantity(),
                product.getStatus(),
                ImageUrlResolver.toPublicImageUrl(product.getImage()),
                ImageUrlResolver.toPublicImageUrl(product.getThumbnail()),
                categoryId,
                categoryName,
                brandId,
                brandName,
                galleryImages,
                buildSku(product),
                product.getShortDescription(),
                product.getDescription(),
                product.getSpecifications(),
                buildWarrantyPolicy(product),
                buildSupportHighlights(product),
                relatedProducts);
    }

    private List<String> buildGalleryImages(Product product) {
        LinkedHashSet<String> images = new LinkedHashSet<>();
        images.add(ImageUrlResolver.toPublicImageUrl(product.getImage()));
        images.add(ImageUrlResolver.toPublicImageUrl(product.getThumbnail()));

        List<ProductImage> subImages = productImageRepository.findByProductOrderByIdAsc(product);
        for (ProductImage image : subImages) {
            images.add(ImageUrlResolver.toPublicImageUrl(image.getImageUrl()));
        }
        return images.stream()
                .filter(value -> value != null && !value.isBlank())
                .toList();
    }

    private String buildSku(Product product) {
        return "SP-" + String.format(Locale.ROOT, "%05d", product.getId());
    }

    private String buildWarrantyPolicy(Product product) {
        String productName = product.getName() == null || product.getName().isBlank() ? "san pham" : product.getName().trim();
        return "Bao hanh chinh hang 12 thang cho " + productName + ". "
                + "Ho tro 1 doi 1 trong 7 ngay neu loi nha san xuat va tu van ky thuat trong suot qua trinh su dung.";
    }

    private List<String> buildSupportHighlights(Product product) {
        String category = product.getCategory() != null && product.getCategory().getName() != null
                ? product.getCategory().getName().trim()
                : "san pham";
        return List.of(
                "Giao nhanh toan quoc, kiem tra hang truoc khi nhan.",
                "Tu van lap dat va tuong thich cho nhom " + category + ".",
                "Ho tro doi tra minh bach neu phat sinh loi nha san xuat.");
    }
}
