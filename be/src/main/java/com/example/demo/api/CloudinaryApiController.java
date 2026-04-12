package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.CloudinaryDtos.UploadImageResponse;
import com.example.demo.model.Product;
import com.example.demo.service.CloudinaryService;
import com.example.demo.service.CloudinaryService.CloudinaryUploadResult;
import com.example.demo.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/cloudinary")
public class CloudinaryApiController {

    private final CloudinaryService cloudinaryService;
    private final ProductService productService;

    public CloudinaryApiController(CloudinaryService cloudinaryService, ProductService productService) {
        this.cloudinaryService = cloudinaryService;
        this.productService = productService;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Integer productId,
            @RequestParam(required = false) String folder) {
        try {
            CloudinaryUploadResult result = cloudinaryService.uploadImage(file, folder);
            Integer updatedProductId = null;

            if (productId != null) {
                Product product = productService.getProductById(productId);
                if (product == null) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(new ApiError("Khong tim thay product voi id: " + productId));
                }
                product.setImage(result.secureUrl());
                product.setThumbnail(result.secureUrl());
                productService.saveProduct(product);
                updatedProductId = product.getId();
            }

            return ResponseEntity.ok(new UploadImageResponse(
                    result.secureUrl(),
                    result.publicId(),
                    result.format(),
                    result.bytes(),
                    updatedProductId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ApiError(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new ApiError("Upload anh len Cloudinary that bai."));
        }
    }
}
