package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.StorefrontSupportDtos.ReviewItem;
import com.example.demo.api.dto.StorefrontSupportDtos.ReviewSummaryResponse;
import com.example.demo.api.dto.StorefrontSupportDtos.ReviewUpsertRequest;
import com.example.demo.model.Account;
import com.example.demo.model.Product;
import com.example.demo.model.Review;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ReviewRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewApiController {

    private final ReviewRepository reviewRepository;
    private final AccountRepository accountRepository;
    private final ProductRepository productRepository;

    public ReviewApiController(ReviewRepository reviewRepository,
            AccountRepository accountRepository,
            ProductRepository productRepository) {
        this.reviewRepository = reviewRepository;
        this.accountRepository = accountRepository;
        this.productRepository = productRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getReviews(@RequestParam int productId,
            org.springframework.security.core.Authentication authentication) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Product not found."));
        }

        Account account = resolveAccount(authentication);
        Review my = account == null ? null : reviewRepository.findByUserAndProduct(account, product).orElse(null);

        List<Review> reviews = reviewRepository.findByProductOrderByCreatedAtDesc(product);
        int total = reviews.size();
        double average = total == 0 ? 0d : reviews.stream().mapToInt(Review::getRating).average().orElse(0d);

        List<ReviewItem> items = reviews.stream().map(this::toReviewItem).toList();
        ReviewItem myItem = my == null ? null : toReviewItem(my);
        boolean canReview = account != null && my == null;

        return ResponseEntity.ok(new ReviewSummaryResponse(product.getId(), total, average, canReview, myItem, items));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createOrUpdate(@RequestBody(required = false) ReviewUpsertRequest request,
            org.springframework.security.core.Authentication authentication) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("Chua dang nhap."));
        }

        if (request == null || request.productId() == null || request.rating() == null) {
            return ResponseEntity.badRequest().body(new ApiError("ProductId va rating bat buoc."));
        }

        if (request.rating() < 1 || request.rating() > 5) {
            return ResponseEntity.badRequest().body(new ApiError("Rating phai tu 1 den 5."));
        }

        Product product = productRepository.findById(request.productId()).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Product not found."));
        }

        Review review = reviewRepository.findByUserAndProduct(account, product).orElse(null);
        if (review == null) {
            review = new Review();
            review.setUser(account);
            review.setProduct(product);
        }
        review.setRating(request.rating());
        review.setComment(request.comment() == null ? null : request.comment().trim());
        Review saved = reviewRepository.save(review);
        return ResponseEntity.ok(toReviewItem(saved));
    }

    private Account resolveAccount(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return null;
        }
        return accountRepository.findByLoginName(authentication.getName()).orElse(null);
    }

    private ReviewItem toReviewItem(Review review) {
        String username = review.getUser() == null ? "unknown" : review.getUser().getLoginName();
        return new ReviewItem(
                review.getId(),
                review.getProduct() == null ? 0 : review.getProduct().getId(),
                username,
                review.getRating(),
                review.getComment(),
                review.getCreatedAt());
    }
}

