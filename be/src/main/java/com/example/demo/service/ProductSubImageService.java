package com.example.demo.service;

import com.example.demo.model.Product;
import com.example.demo.model.ProductImage;
import com.example.demo.repository.ProductImageRepository;
import com.example.demo.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductSubImageService {

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final CloudinaryService cloudinaryService;

    public ProductSubImageService(
            ProductRepository productRepository,
            ProductImageRepository productImageRepository,
            CloudinaryService cloudinaryService) {
        this.productRepository = productRepository;
        this.productImageRepository = productImageRepository;
        this.cloudinaryService = cloudinaryService;
    }

    @Transactional(readOnly = true)
    public List<ProductImage> listSubImages(int productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return List.of();
        }
        return productImageRepository.findByProductOrderByIdAsc(product);
    }

    @Transactional
    public List<ProductImage> uploadSubImages(int productId, List<MultipartFile> files) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            throw new IllegalArgumentException("Khong tim thay san pham voi id: " + productId);
        }

        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("Can it nhat mot file anh.");
        }

        List<ProductImage> created = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }

            CloudinaryService.CloudinaryUploadResult uploaded = cloudinaryService.uploadImage(file, "shoppro/product-subimages");
            String secureUrl = uploaded.secureUrl();
            if (secureUrl == null || secureUrl.isBlank()) {
                continue;
            }

            if (productImageRepository.existsByProductAndImageUrl(product, secureUrl)) {
                continue;
            }

            ProductImage image = new ProductImage();
            image.setProduct(product);
            image.setImageUrl(secureUrl);
            created.add(productImageRepository.save(image));
        }

        if (created.isEmpty()) {
            throw new IllegalArgumentException("Khong co file anh hop le de luu.");
        }

        return created;
    }

    @Transactional
    public void deleteSubImage(int productId, int imageId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            throw new IllegalArgumentException("Khong tim thay san pham voi id: " + productId);
        }

        ProductImage image = productImageRepository.findById(imageId).orElse(null);
        if (image == null || image.getProduct() == null || image.getProduct().getId() != product.getId()) {
            throw new IllegalArgumentException("Khong tim thay anh phu voi id: " + imageId);
        }

        String url = image.getImageUrl();
        productImageRepository.delete(image);

        if (url != null && !url.isBlank()) {
            cloudinaryService.tryDestroyUploadedImage(url);
        }
    }
}
