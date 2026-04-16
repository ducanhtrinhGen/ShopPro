package com.example.demo.service;

import com.example.demo.api.dto.AdminOpsDtos.AdminOrderDetailItem;
import com.example.demo.api.dto.AdminOpsDtos.AdminOrderDetailResponse;
import com.example.demo.api.dto.AdminOpsDtos.AdminOrderItem;
import com.example.demo.api.dto.AdminOpsDtos.AdminProductItem;
import com.example.demo.api.dto.AdminOpsDtos.DataIssueItem;
import com.example.demo.model.Order;
import com.example.demo.model.OrderDetail;
import com.example.demo.model.Product;
import com.example.demo.repository.OrderDetailRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.ProductRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Shared operational logic for Admin and Staff backoffice APIs.
 * Staff uses a restricted subset of order statuses (no REFUNDED/FAILED).
 */
@Service
public class OperationalBackofficeService {

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

    /** Operational transitions; financial exception statuses reserved for Owner/Admin. */
    private static final Set<String> STAFF_ALLOWED_ORDER_STATUSES = Set.of(
            "PENDING",
            "CONFIRMED",
            "PROCESSING",
            "SHIPPING",
            "DELIVERED",
            "COMPLETED",
            "CANCELLED");

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public OperationalBackofficeService(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminOrderItem> listOrders(String status, String keyword) {
        String normalizedStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase(Locale.ROOT);
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);

        return orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")))
                .stream()
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

    @Transactional(readOnly = true)
    public AdminOrderDetailResponse getOrderDetail(int id) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return null;
        }
        return toOrderDetailResponse(order);
    }

    @Transactional
    public AdminOrderDetailResponse updateOrderStatus(int id, String status, boolean staffActor) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return null;
        }
        String currentStatus = normalizeOrderStatus(order.getOrderStatus(), "PENDING");
        String nextStatus = staffActor
                ? normalizeOrderStatusForStaffUpdate(status)
                : normalizeOrderStatusForAdminUpdate(status);

        if (!isAllowedTransition(currentStatus, nextStatus, staffActor)) {
            throw new IllegalArgumentException("Khong the chuyen trang thai tu " + currentStatus + " sang " + nextStatus + ".");
        }
        order.setOrderStatus(nextStatus);
        Order updated = orderRepository.save(order);
        return toOrderDetailResponse(updated);
    }

    @Transactional(readOnly = true)
    public List<AdminProductItem> listLowStockProducts(int threshold) {
        int safeThreshold = Math.max(threshold, 0);
        return productRepository.findAll(Sort.by(Sort.Direction.ASC, "quantity").and(Sort.by("id").ascending())).stream()
                .filter(product -> product.getQuantity() <= safeThreshold)
                .map(this::toProductItem)
                .toList();
    }

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

    @Transactional
    public AdminProductItem updateProductQuantity(int productId, int quantity) {
        if (quantity < 0) {
            throw new IllegalArgumentException("So luong ton kho khong hop le.");
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay san pham voi id: " + productId));
        product.setQuantity(quantity);
        return toProductItem(productRepository.save(product));
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

    private String resolveCustomerUsername(Order order) {
        if (order.getAccount() == null || isBlank(order.getAccount().getLoginName())) {
            return "guest";
        }
        return order.getAccount().getLoginName();
    }

    private String normalizeOrderStatus(String status, String defaultValue) {
        if (status == null || status.isBlank()) {
            return defaultValue;
        }
        return status.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeOrderStatusForAdminUpdate(String status) {
        String normalized = normalizeOrderStatus(status, "PENDING");
        if (!ALLOWED_ORDER_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException(
                    "Trang thai don hang khong hop le. Cho phep: " + String.join(", ", ALLOWED_ORDER_STATUSES));
        }
        return normalized;
    }

    private String normalizeOrderStatusForStaffUpdate(String status) {
        String normalized = normalizeOrderStatus(status, "PENDING");
        if (!STAFF_ALLOWED_ORDER_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException(
                    "Staff chi duoc dat trang thai van hanh: " + String.join(", ", STAFF_ALLOWED_ORDER_STATUSES));
        }
        return normalized;
    }

    private boolean isAllowedTransition(String current, String next, boolean staffActor) {
        if (current.equals(next)) {
            return true;
        }

        // Terminal states.
        if ("COMPLETED".equals(current) || "CANCELLED".equals(current) || "REFUNDED".equals(current)) {
            return false;
        }

        // Staff cannot set FAILED/REFUNDED by normalization; keep a guard anyway.
        if (staffActor && ("FAILED".equals(next) || "REFUNDED".equals(next))) {
            return false;
        }

        return switch (current) {
            case "PENDING" -> Set.of("CONFIRMED", "CANCELLED").contains(next);
            case "CONFIRMED" -> Set.of("PROCESSING", "CANCELLED").contains(next);
            case "PROCESSING" -> Set.of("SHIPPING", "CANCELLED", "FAILED").contains(next);
            case "SHIPPING" -> Set.of("DELIVERED", "FAILED").contains(next);
            case "DELIVERED" -> Set.of("COMPLETED").contains(next);
            case "FAILED" -> staffActor ? false : Set.of("REFUNDED").contains(next);
            default -> false;
        };
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
