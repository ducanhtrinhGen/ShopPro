package com.example.demo.api;

import com.example.demo.api.dto.AdminOpsDtos.AdminBlogPostItem;
import com.example.demo.api.dto.AdminOpsDtos.AdminBrandItem;
import com.example.demo.api.dto.AdminOpsDtos.AdminCategoryItem;
import com.example.demo.api.dto.AdminOpsDtos.AdminOrderDetailItem;
import com.example.demo.api.dto.AdminOpsDtos.AdminOrderDetailResponse;
import com.example.demo.api.dto.AdminOpsDtos.AdminOrderItem;
import com.example.demo.api.dto.AdminOpsDtos.AdminProductItem;
import com.example.demo.api.dto.AdminOpsDtos.BlogPostUpsertRequest;
import com.example.demo.api.dto.AdminOpsDtos.BrandUpsertRequest;
import com.example.demo.api.dto.AdminOpsDtos.CategoryUpsertRequest;
import com.example.demo.api.dto.AdminOpsDtos.DataIssueItem;
import com.example.demo.api.dto.AdminOpsDtos.OrderStatusUpdateRequest;
import com.example.demo.api.dto.AdminOpsDtos.ProductUpsertRequest;
import com.example.demo.api.dto.AdminOpsDtos.PromotionUpdateRequest;
import com.example.demo.api.dto.ApiError;
import com.example.demo.model.BlogPost;
import com.example.demo.model.Brand;
import com.example.demo.model.Category;
import com.example.demo.model.Order;
import com.example.demo.model.OrderDetail;
import com.example.demo.model.Product;
import com.example.demo.repository.BlogPostRepository;
import com.example.demo.repository.BrandRepository;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.ProductRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/admin")
public class AdminOperationsApiController {

    private static final Pattern NON_SLUG = Pattern.compile("[^a-z0-9]+");
    private static final Pattern MULTI_DASH = Pattern.compile("-{2,}");
    private static final Set<String> ALLOWED_ORDER_STATUSES = Set.of(
            "PENDING",
            "CONFIRMED",
            "PROCESSING",
            "SHIPPING",
            "DELIVERED",
            "COMPLETED",
            "CANCELLED",
            "FAILED",
            "REFUNDED");

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final BlogPostRepository blogPostRepository;
    private final OrderRepository orderRepository;

    public AdminOperationsApiController(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            BrandRepository brandRepository,
            BlogPostRepository blogPostRepository,
            OrderRepository orderRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.brandRepository = brandRepository;
        this.blogPostRepository = blogPostRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping("/products")
    @Transactional(readOnly = true)
    public List<AdminProductItem> listProducts(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Integer brandId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "false") boolean lowStockOnly,
            @RequestParam(defaultValue = "5") int lowStockThreshold) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        String normalizedStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase(Locale.ROOT);
        int threshold = Math.max(lowStockThreshold, 0);

        return productRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .filter(product -> normalizedKeyword.isEmpty()
                        || product.getName().toLowerCase(Locale.ROOT).contains(normalizedKeyword)
                        || (product.getSlug() != null
                                && product.getSlug().toLowerCase(Locale.ROOT).contains(normalizedKeyword)))
                .filter(product -> categoryId == null
                        || (product.getCategory() != null && product.getCategory().getId() == categoryId))
                .filter(product -> brandId == null
                        || (product.getBrand() != null && product.getBrand().getId() == brandId))
                .filter(product -> normalizedStatus == null
                        || (product.getStatus() != null && product.getStatus().equalsIgnoreCase(normalizedStatus)))
                .filter(product -> !lowStockOnly || product.getQuantity() <= threshold)
                .map(this::toProductItem)
                .toList();
    }

    @GetMapping("/products/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getProductById(@PathVariable int id) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiError("Khong tim thay san pham voi id: " + id));
        }
        return ResponseEntity.ok(toProductItem(product));
    }

    @PostMapping("/products")
    public ResponseEntity<?> createProduct(@RequestBody(required = false) ProductUpsertRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(new ApiError("Du lieu san pham khong hop le."));
        }

        try {
            Product product = new Product();
            applyProductUpsert(product, request, null);
            Product created = productRepository.save(product);
            return ResponseEntity.status(HttpStatus.CREATED).body(toProductItem(created));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(ex.getMessage()));
        }
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable int id, @RequestBody(required = false) ProductUpsertRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(new ApiError("Du lieu san pham khong hop le."));
        }

        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay san pham voi id: " + id));
        }

        try {
            applyProductUpsert(product, request, id);
            Product updated = productRepository.save(product);
            return ResponseEntity.ok(toProductItem(updated));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(ex.getMessage()));
        }
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable int id) {
        if (!productRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay san pham voi id: " + id));
        }

        try {
            productRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiError("Khong the xoa san pham dang duoc su dung trong don hang."));
        }
    }

    @GetMapping("/categories")
    public List<AdminCategoryItem> listCategories() {
        return categoryRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(this::toCategoryItem)
                .toList();
    }

    @PostMapping("/categories")
    public ResponseEntity<?> createCategory(@RequestBody(required = false) CategoryUpsertRequest request) {
        if (request == null || isBlank(request.name())) {
            return ResponseEntity.badRequest().body(new ApiError("Ten danh muc khong duoc de trong."));
        }

        String normalizedName = request.name().trim();
        if (categoryRepository.findByName(normalizedName).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("Danh muc da ton tai."));
        }

        Category category = new Category();
        category.setName(normalizedName);
        category.setDescription(trimToNull(request.description()));
        category.setStatus(normalizeStatus(request.status(), "ACTIVE"));
        Category created = categoryRepository.save(category);
        return ResponseEntity.status(HttpStatus.CREATED).body(toCategoryItem(created));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable int id, @RequestBody(required = false) CategoryUpsertRequest request) {
        if (request == null || isBlank(request.name())) {
            return ResponseEntity.badRequest().body(new ApiError("Ten danh muc khong duoc de trong."));
        }

        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay danh muc voi id: " + id));
        }

        String normalizedName = request.name().trim();
        categoryRepository.findByName(normalizedName).ifPresent(existing -> {
            if (existing.getId() != id) {
                throw new IllegalStateException("Ten danh muc da ton tai.");
            }
        });

        category.setName(normalizedName);
        category.setDescription(trimToNull(request.description()));
        category.setStatus(normalizeStatus(request.status(), category.getStatus()));
        Category updated = categoryRepository.save(category);
        return ResponseEntity.ok(toCategoryItem(updated));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable int id) {
        if (!categoryRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay danh muc voi id: " + id));
        }

        try {
            categoryRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiError("Khong the xoa danh muc dang duoc gan cho san pham."));
        }
    }

    @GetMapping("/brands")
    public List<AdminBrandItem> listBrands() {
        return brandRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(this::toBrandItem)
                .toList();
    }

    @PostMapping("/brands")
    public ResponseEntity<?> createBrand(@RequestBody(required = false) BrandUpsertRequest request) {
        if (request == null || isBlank(request.name())) {
            return ResponseEntity.badRequest().body(new ApiError("Ten thuong hieu khong duoc de trong."));
        }

        String normalizedName = request.name().trim();
        if (brandRepository.findByName(normalizedName).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("Thuong hieu da ton tai."));
        }

        Brand brand = new Brand();
        brand.setName(normalizedName);
        brand.setDescription(trimToNull(request.description()));
        brand.setStatus(normalizeStatus(request.status(), "ACTIVE"));
        Brand created = brandRepository.save(brand);
        return ResponseEntity.status(HttpStatus.CREATED).body(toBrandItem(created));
    }

    @PutMapping("/brands/{id}")
    public ResponseEntity<?> updateBrand(@PathVariable int id, @RequestBody(required = false) BrandUpsertRequest request) {
        if (request == null || isBlank(request.name())) {
            return ResponseEntity.badRequest().body(new ApiError("Ten thuong hieu khong duoc de trong."));
        }

        Brand brand = brandRepository.findById(id).orElse(null);
        if (brand == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay thuong hieu voi id: " + id));
        }

        String normalizedName = request.name().trim();
        brandRepository.findByName(normalizedName).ifPresent(existing -> {
            if (existing.getId() != id) {
                throw new IllegalStateException("Ten thuong hieu da ton tai.");
            }
        });

        brand.setName(normalizedName);
        brand.setDescription(trimToNull(request.description()));
        brand.setStatus(normalizeStatus(request.status(), brand.getStatus()));
        Brand updated = brandRepository.save(brand);
        return ResponseEntity.ok(toBrandItem(updated));
    }

    @DeleteMapping("/brands/{id}")
    public ResponseEntity<?> deleteBrand(@PathVariable int id) {
        if (!brandRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay thuong hieu voi id: " + id));
        }

        try {
            brandRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiError("Khong the xoa thuong hieu dang duoc gan cho san pham."));
        }
    }

    @GetMapping("/blog-posts")
    public List<AdminBlogPostItem> listBlogPosts() {
        return blogPostRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::toBlogPostItem)
                .toList();
    }

    @PostMapping("/blog-posts")
    public ResponseEntity<?> createBlogPost(@RequestBody(required = false) BlogPostUpsertRequest request) {
        if (request == null || isBlank(request.title()) || isBlank(request.content())) {
            return ResponseEntity.badRequest().body(new ApiError("Title va content khong duoc de trong."));
        }

        String slug = resolveBlogSlug(request.slug(), request.title(), null);
        BlogPost blogPost = new BlogPost();
        blogPost.setTitle(request.title().trim());
        blogPost.setSlug(slug);
        blogPost.setThumbnail(trimToNull(request.thumbnail()));
        blogPost.setSummary(trimToNull(request.summary()));
        blogPost.setContent(request.content().trim());
        blogPost.setStatus(normalizeStatus(request.status(), "PUBLISHED"));
        BlogPost created = blogPostRepository.save(blogPost);
        return ResponseEntity.status(HttpStatus.CREATED).body(toBlogPostItem(created));
    }

    @PutMapping("/blog-posts/{id}")
    public ResponseEntity<?> updateBlogPost(@PathVariable int id, @RequestBody(required = false) BlogPostUpsertRequest request) {
        if (request == null || isBlank(request.title()) || isBlank(request.content())) {
            return ResponseEntity.badRequest().body(new ApiError("Title va content khong duoc de trong."));
        }

        BlogPost blogPost = blogPostRepository.findById(id).orElse(null);
        if (blogPost == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay bai viet voi id: " + id));
        }

        String slug = resolveBlogSlug(request.slug(), request.title(), id);
        blogPost.setTitle(request.title().trim());
        blogPost.setSlug(slug);
        blogPost.setThumbnail(trimToNull(request.thumbnail()));
        blogPost.setSummary(trimToNull(request.summary()));
        blogPost.setContent(request.content().trim());
        blogPost.setStatus(normalizeStatus(request.status(), blogPost.getStatus()));
        BlogPost updated = blogPostRepository.save(blogPost);
        return ResponseEntity.ok(toBlogPostItem(updated));
    }

    @DeleteMapping("/blog-posts/{id}")
    public ResponseEntity<?> deleteBlogPost(@PathVariable int id) {
        if (!blogPostRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay bai viet voi id: " + id));
        }

        blogPostRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/promotions")
    @Transactional(readOnly = true)
    public List<AdminProductItem> listPromotions() {
        return productRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .filter(product -> product.getDiscountPrice() != null && product.getDiscountPrice() > 0)
                .map(this::toProductItem)
                .toList();
    }

    @PatchMapping("/promotions/{productId}")
    public ResponseEntity<?> updatePromotion(
            @PathVariable int productId,
            @RequestBody(required = false) PromotionUpdateRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(new ApiError("Du lieu khuyen mai khong hop le."));
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay san pham voi id: " + productId));
        }

        Long discountPrice = request.discountPrice();
        if (discountPrice != null) {
            if (discountPrice <= 0) {
                return ResponseEntity.badRequest().body(new ApiError("Gia khuyen mai phai lon hon 0."));
            }
            if (discountPrice >= product.getPrice()) {
                return ResponseEntity.badRequest()
                        .body(new ApiError("Gia khuyen mai phai nho hon gia niem yet."));
            }
        }

        product.setDiscountPrice(discountPrice);
        if (!isBlank(request.status())) {
            product.setStatus(normalizeStatus(request.status(), product.getStatus()));
        }
        Product updated = productRepository.save(product);
        return ResponseEntity.ok(toProductItem(updated));
    }

    @GetMapping("/orders")
    @Transactional(readOnly = true)
    public List<AdminOrderItem> listOrders(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "") String keyword) {
        String normalizedStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase(Locale.ROOT);
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);

        return orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))).stream()
                .filter(order -> normalizedStatus == null
                        || normalizeOrderStatus(order.getOrderStatus(), "PENDING").equals(normalizedStatus))
                .filter(order -> {
                    if (normalizedKeyword.isEmpty()) {
                        return true;
                    }

                    String customerUsername = resolveCustomerUsername(order).toLowerCase(Locale.ROOT);
                    String receiver = order.getReceiverName() == null ? "" : order.getReceiverName().toLowerCase(Locale.ROOT);
                    String email = order.getEmail() == null ? "" : order.getEmail().toLowerCase(Locale.ROOT);
                    String idAsText = String.valueOf(order.getId());
                    return customerUsername.contains(normalizedKeyword)
                            || receiver.contains(normalizedKeyword)
                            || email.contains(normalizedKeyword)
                            || idAsText.contains(normalizedKeyword);
                })
                .map(this::toOrderItem)
                .toList();
    }

    @GetMapping("/orders/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOrderById(@PathVariable int id) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay don hang voi id: " + id));
        }
        return ResponseEntity.ok(toOrderDetailResponse(order));
    }

    @PutMapping("/orders/{id}/status")
    @Transactional
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable int id,
            @RequestBody(required = false) OrderStatusUpdateRequest request) {
        if (request == null || isBlank(request.status())) {
            return ResponseEntity.badRequest().body(new ApiError("Trang thai don hang khong hop le."));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Khong tim thay don hang voi id: " + id));
        }

        try {
            String nextStatus = normalizeOrderStatusForUpdate(request.status());
            order.setOrderStatus(nextStatus);
            Order updated = orderRepository.save(order);
            return ResponseEntity.ok(toOrderDetailResponse(updated));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        }
    }

    @GetMapping("/inventory/low-stock")
    @Transactional(readOnly = true)
    public List<AdminProductItem> listLowStockProducts(@RequestParam(defaultValue = "5") int threshold) {
        int safeThreshold = Math.max(threshold, 0);
        return productRepository.findAll(Sort.by(Sort.Direction.ASC, "quantity").and(Sort.by("id").ascending())).stream()
                .filter(product -> product.getQuantity() <= safeThreshold)
                .map(this::toProductItem)
                .toList();
    }

    @GetMapping("/data-health/issues")
    @Transactional(readOnly = true)
    public List<DataIssueItem> listDataIssues() {
        List<DataIssueItem> issues = new ArrayList<>();

        for (Product product : productRepository.findAll()) {
            if (product.getPrice() <= 0) {
                issues.add(new DataIssueItem("PRODUCT_PRICE_INVALID",
                        "San pham co gia khong hop le: " + product.getName(),
                        product.getId()));
            }
            if (product.getQuantity() < 0) {
                issues.add(new DataIssueItem("PRODUCT_QUANTITY_INVALID",
                        "San pham co ton kho am: " + product.getName(),
                        product.getId()));
            }
            if (product.getDiscountPrice() != null
                    && (product.getDiscountPrice() <= 0 || product.getDiscountPrice() >= product.getPrice())) {
                issues.add(new DataIssueItem("PRODUCT_DISCOUNT_INVALID",
                        "Gia khuyen mai khong hop le: " + product.getName(),
                        product.getId()));
            }
            if (product.getCategory() == null) {
                issues.add(new DataIssueItem("PRODUCT_CATEGORY_MISSING",
                        "San pham chua gan danh muc: " + product.getName(),
                        product.getId()));
            }
            if (product.getBrand() == null) {
                issues.add(new DataIssueItem("PRODUCT_BRAND_MISSING",
                        "San pham chua gan thuong hieu: " + product.getName(),
                        product.getId()));
            }
        }

        for (Order order : orderRepository.findAll()) {
            long subtotalSum = order.getOrderDetails().stream()
                    .mapToLong(OrderDetail::getSubtotal)
                    .sum();
            if (!order.getOrderDetails().isEmpty() && subtotalSum != order.getTotalAmount()) {
                issues.add(new DataIssueItem(
                        "ORDER_TOTAL_MISMATCH",
                        "Tong tien don hang khong khop voi chi tiet don.",
                        order.getId()));
            }
        }

        return issues;
    }

    private void applyProductUpsert(Product product, ProductUpsertRequest request, Integer existingProductId) {
        if (isBlank(request.name())) {
            throw new IllegalArgumentException("Ten san pham khong duoc de trong.");
        }
        if (request.categoryId() == null) {
            throw new IllegalArgumentException("CategoryId khong duoc de trong.");
        }
        if (request.brandId() == null) {
            throw new IllegalArgumentException("BrandId khong duoc de trong.");
        }
        if (request.price() == null || request.price() <= 0) {
            throw new IllegalArgumentException("Gia san pham phai lon hon 0.");
        }
        if (request.quantity() == null || request.quantity() < 0) {
            throw new IllegalArgumentException("So luong ton kho khong hop le.");
        }
        if (request.discountPrice() != null && request.discountPrice() >= request.price()) {
            throw new IllegalArgumentException("Gia khuyen mai phai nho hon gia niem yet.");
        }
        if (request.discountPrice() != null && request.discountPrice() <= 0) {
            throw new IllegalArgumentException("Gia khuyen mai phai lon hon 0.");
        }

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay category voi id: " + request.categoryId()));
        Brand brand = brandRepository.findById(request.brandId())
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay brand voi id: " + request.brandId()));

        String slug = resolveProductSlug(request.slug(), request.name(), existingProductId);

        String image = trimToNull(request.image());
        String thumbnail = trimToNull(request.thumbnail());
        if (image == null && thumbnail != null) {
            image = thumbnail;
        }
        if (thumbnail == null && image != null) {
            thumbnail = image;
        }

        product.setName(request.name().trim());
        product.setSlug(slug);
        product.setCategory(category);
        product.setBrand(brand);
        product.setPrice(request.price());
        product.setDiscountPrice(request.discountPrice());
        product.setQuantity(request.quantity());
        product.setShortDescription(trimToNull(request.shortDescription()));
        product.setDescription(trimToNull(request.description()));
        product.setSpecifications(trimToNull(request.specifications()));
        product.setImage(image);
        product.setThumbnail(thumbnail);
        product.setStatus(normalizeStatus(request.status(), product.getStatus() == null ? "ACTIVE" : product.getStatus()));
    }

    private String resolveProductSlug(String requestedSlug, String fallbackName, Integer existingProductId) {
        String baseSlug = toSlug(isBlank(requestedSlug) ? fallbackName : requestedSlug);
        if (baseSlug.isBlank()) {
            baseSlug = "product";
        }
        return ensureUniqueProductSlug(baseSlug, existingProductId);
    }

    private String ensureUniqueProductSlug(String baseSlug, Integer existingProductId) {
        String candidate = baseSlug;
        int suffix = 2;

        while (true) {
            Product existing = productRepository.findBySlug(candidate).orElse(null);
            if (existing == null || (existingProductId != null && existing.getId() == existingProductId)) {
                return candidate;
            }
            candidate = baseSlug + "-" + suffix;
            suffix++;
        }
    }

    private String resolveBlogSlug(String requestedSlug, String fallbackTitle, Integer existingBlogId) {
        String baseSlug = toSlug(isBlank(requestedSlug) ? fallbackTitle : requestedSlug);
        if (baseSlug.isBlank()) {
            baseSlug = "blog-post";
        }

        String candidate = baseSlug;
        int suffix = 2;
        while (true) {
            BlogPost existing = blogPostRepository.findBySlug(candidate).orElse(null);
            if (existing == null || (existingBlogId != null && existing.getId() == existingBlogId)) {
                return candidate;
            }
            candidate = baseSlug + "-" + suffix;
            suffix++;
        }
    }

    private AdminProductItem toProductItem(Product product) {
        Integer categoryId = product.getCategory() != null ? product.getCategory().getId() : null;
        String categoryName = product.getCategory() != null ? product.getCategory().getName() : null;
        Integer brandId = product.getBrand() != null ? product.getBrand().getId() : null;
        String brandName = product.getBrand() != null ? product.getBrand().getName() : null;

        return new AdminProductItem(
                product.getId(),
                product.getName(),
                product.getSlug(),
                categoryId,
                categoryName,
                brandId,
                brandName,
                product.getPrice(),
                product.getDiscountPrice(),
                product.getQuantity(),
                product.getShortDescription(),
                product.getDescription(),
                product.getSpecifications(),
                product.getImage(),
                product.getThumbnail(),
                product.getStatus(),
                product.getCreatedAt());
    }

    private AdminCategoryItem toCategoryItem(Category category) {
        return new AdminCategoryItem(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getStatus());
    }

    private AdminBrandItem toBrandItem(Brand brand) {
        return new AdminBrandItem(
                brand.getId(),
                brand.getName(),
                brand.getDescription(),
                brand.getStatus());
    }

    private AdminBlogPostItem toBlogPostItem(BlogPost blogPost) {
        return new AdminBlogPostItem(
                blogPost.getId(),
                blogPost.getTitle(),
                blogPost.getSlug(),
                blogPost.getThumbnail(),
                blogPost.getSummary(),
                blogPost.getContent(),
                blogPost.getStatus(),
                blogPost.getCreatedAt());
    }

    private AdminOrderItem toOrderItem(Order order) {
        int itemCount = order.getOrderDetails().stream()
                .mapToInt(OrderDetail::getQuantity)
                .sum();
        return new AdminOrderItem(
                order.getId(),
                order.getCreatedAt(),
                normalizeOrderStatus(order.getOrderStatus(), "PENDING"),
                order.getTotalAmount(),
                trimToNull(order.getPaymentMethod()),
                trimToNull(order.getReceiverName()),
                resolveCustomerUsername(order),
                itemCount);
    }

    private AdminOrderDetailResponse toOrderDetailResponse(Order order) {
        List<AdminOrderDetailItem> details = order.getOrderDetails().stream()
                .map(this::toOrderDetailItem)
                .toList();
        return new AdminOrderDetailResponse(
                order.getId(),
                order.getCreatedAt(),
                normalizeOrderStatus(order.getOrderStatus(), "PENDING"),
                order.getTotalAmount(),
                trimToNull(order.getPaymentMethod()),
                trimToNull(order.getReceiverName()),
                trimToNull(order.getPhone()),
                trimToNull(order.getAddress()),
                trimToNull(order.getEmail()),
                resolveCustomerUsername(order),
                details);
    }

    private AdminOrderDetailItem toOrderDetailItem(OrderDetail detail) {
        Integer productId = detail.getProduct() != null ? detail.getProduct().getId() : null;
        String productName = detail.getProductName();
        if (isBlank(productName) && detail.getProduct() != null) {
            productName = detail.getProduct().getName();
        }

        return new AdminOrderDetailItem(
                detail.getId(),
                productId,
                trimToNull(productName),
                detail.getUnitPrice(),
                detail.getQuantity(),
                detail.getSubtotal());
    }

    private String resolveCustomerUsername(Order order) {
        if (order.getAccount() == null || isBlank(order.getAccount().getLogin_name())) {
            return "guest";
        }
        return order.getAccount().getLogin_name();
    }

    private String toSlug(String raw) {
        String normalized = raw == null ? "" : raw.trim();
        if (normalized.isEmpty()) {
            return "";
        }

        String noDiacritics = Normalizer.normalize(normalized, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String slug = NON_SLUG.matcher(noDiacritics.toLowerCase(Locale.ROOT)).replaceAll("-");
        slug = MULTI_DASH.matcher(slug).replaceAll("-");
        slug = slug.replaceAll("(^-|-$)", "");
        return slug;
    }

    private String normalizeStatus(String status, String defaultValue) {
        if (status == null || status.isBlank()) {
            return defaultValue == null ? "ACTIVE" : defaultValue.trim().toUpperCase(Locale.ROOT);
        }
        return status.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeOrderStatus(String status, String defaultValue) {
        if (status == null || status.isBlank()) {
            return defaultValue;
        }
        return status.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeOrderStatusForUpdate(String status) {
        String normalized = normalizeOrderStatus(status, "PENDING");
        if (!ALLOWED_ORDER_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException(
                    "Trang thai don hang khong hop le. Cho phep: " + String.join(", ", ALLOWED_ORDER_STATUSES));
        }
        return normalized;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
