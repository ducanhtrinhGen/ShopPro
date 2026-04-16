package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.StorefrontSupportDtos.WishlistAddResponse;
import com.example.demo.api.dto.StorefrontSupportDtos.WishlistItem;
import com.example.demo.api.dto.StorefrontSupportDtos.WishlistToggleResponse;
import com.example.demo.model.Account;
import com.example.demo.model.Product;
import com.example.demo.model.Wishlist;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.WishlistRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistApiController {

    private final WishlistRepository wishlistRepository;
    private final AccountRepository accountRepository;
    private final ProductRepository productRepository;

    public WishlistApiController(WishlistRepository wishlistRepository,
            AccountRepository accountRepository,
            ProductRepository productRepository) {
        this.wishlistRepository = wishlistRepository;
        this.accountRepository = accountRepository;
        this.productRepository = productRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> listMyWishlist(org.springframework.security.core.Authentication authentication) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("Chua dang nhap."));
        }

        List<WishlistItem> items = wishlistRepository.findAllByUser(account).stream()
                .map(Wishlist::getProduct)
                .filter(product -> product != null)
                .map(this::toWishlistItem)
                .toList();
        return ResponseEntity.ok(items);
    }

    @PostMapping("/{productId}")
    @Transactional
    public ResponseEntity<?> toggle(@PathVariable int productId,
            org.springframework.security.core.Authentication authentication) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("Chua dang nhap."));
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Product not found."));
        }

        Wishlist existing = wishlistRepository.findByUserAndProduct(account, product).orElse(null);
        if (existing != null) {
            wishlistRepository.delete(existing);
            return ResponseEntity.ok(new WishlistToggleResponse(false));
        }

        Wishlist created = new Wishlist();
        created.setUser(account);
        created.setProduct(product);
        wishlistRepository.save(created);
        return ResponseEntity.ok(new WishlistToggleResponse(true));
    }

    /**
     * Adds product to wishlist if missing. Does not remove existing rows (no toggle).
     */
    @PostMapping("/{productId}/add")
    @Transactional
    public ResponseEntity<?> add(
            @PathVariable int productId,
            org.springframework.security.core.Authentication authentication) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("Chua dang nhap."));
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Product not found."));
        }

        Wishlist existing = wishlistRepository.findByUserAndProduct(account, product).orElse(null);
        if (existing != null) {
            return ResponseEntity.ok(new WishlistAddResponse(true, true));
        }

        Wishlist created = new Wishlist();
        created.setUser(account);
        created.setProduct(product);
        wishlistRepository.save(created);
        return ResponseEntity.ok(new WishlistAddResponse(true, false));
    }

    @DeleteMapping("/{productId}")
    @Transactional
    public ResponseEntity<?> remove(@PathVariable int productId,
            org.springframework.security.core.Authentication authentication) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("Chua dang nhap."));
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.noContent().build();
        }

        wishlistRepository.findByUserAndProduct(account, product).ifPresent(wishlistRepository::delete);
        return ResponseEntity.noContent().build();
    }

    private Account resolveAccount(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return null;
        }
        return accountRepository.findByLoginName(authentication.getName()).orElse(null);
    }

    private WishlistItem toWishlistItem(Product product) {
        Integer categoryId = product.getCategory() != null ? product.getCategory().getId() : null;
        String categoryName = product.getCategory() != null ? product.getCategory().getName() : null;
        Integer brandId = product.getBrand() != null ? product.getBrand().getId() : null;
        String brandName = product.getBrand() != null ? product.getBrand().getName() : null;

        return new WishlistItem(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getPrice(),
                product.getDiscountPrice(),
                product.getQuantity(),
                ImageUrlResolver.toPublicImageUrl(product.getImage()),
                ImageUrlResolver.toPublicImageUrl(product.getThumbnail()),
                categoryId,
                categoryName,
                brandId,
                brandName);
    }
}

