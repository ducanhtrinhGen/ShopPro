package com.example.demo.api;

import com.example.demo.api.dto.AdminOpsDtos.AdminOrderDetailResponse;
import com.example.demo.api.dto.AdminOpsDtos.AdminOrderItem;
import com.example.demo.api.dto.AdminOpsDtos.AdminProductItem;
import com.example.demo.api.dto.AdminOpsDtos.DataIssueItem;
import com.example.demo.api.dto.AdminOpsDtos.OrderStatusUpdateRequest;
import com.example.demo.api.dto.AdminOpsDtos.ProductQuantityUpdateRequest;
import com.example.demo.api.dto.ApiError;
import com.example.demo.service.OperationalBackofficeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Operational APIs for {@code ROLE_STAFF} only. Does not overlap with catalog admin or owner reports.
 */
@RestController
@RequestMapping("/api/staff")
public class StaffOperationsApiController {

    private final OperationalBackofficeService operationalBackofficeService;

    public StaffOperationsApiController(OperationalBackofficeService operationalBackofficeService) {
        this.operationalBackofficeService = operationalBackofficeService;
    }

    @GetMapping("/orders")
    @Transactional(readOnly = true)
    public List<AdminOrderItem> listOrders(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "") String keyword) {
        return operationalBackofficeService.listOrders(status, keyword);
    }

    @GetMapping("/orders/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOrderById(@PathVariable int id) {
        AdminOrderDetailResponse detail = operationalBackofficeService.getOrderDetail(id);
        if (detail == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiError("Khong tim thay don hang voi id: " + id));
        }
        return ResponseEntity.ok(detail);
    }

    @PutMapping("/orders/{id}/status")
    @Transactional
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable int id,
            @RequestBody(required = false) OrderStatusUpdateRequest request) {
        if (request == null || request.status() == null || request.status().isBlank()) {
            return ResponseEntity.badRequest().body(new ApiError("Trang thai don hang khong hop le."));
        }
        try {
            AdminOrderDetailResponse updated = operationalBackofficeService.updateOrderStatus(id, request.status(), true);
            if (updated == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiError("Khong tim thay don hang voi id: " + id));
            }
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        }
    }

    @GetMapping("/inventory/low-stock")
    @Transactional(readOnly = true)
    public List<AdminProductItem> listLowStockProducts(@RequestParam(defaultValue = "5") int threshold) {
        return operationalBackofficeService.listLowStockProducts(threshold);
    }

    @GetMapping("/data-health/issues")
    @Transactional(readOnly = true)
    public List<DataIssueItem> listDataIssues() {
        return operationalBackofficeService.listDataIssues();
    }

    /**
     * Adjust on-hand stock only (no price, slug, or catalog fields).
     */
    @PatchMapping("/products/{id}/quantity")
    @Transactional
    public ResponseEntity<?> updateProductQuantity(
            @PathVariable int id,
            @RequestBody(required = false) ProductQuantityUpdateRequest request) {
        if (request == null || request.quantity() == null) {
            return ResponseEntity.badRequest().body(new ApiError("So luong khong hop le."));
        }
        try {
            AdminProductItem updated = operationalBackofficeService.updateProductQuantity(id, request.quantity());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        }
    }
}
