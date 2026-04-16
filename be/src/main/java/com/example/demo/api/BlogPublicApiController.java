package com.example.demo.api;

import com.example.demo.api.dto.StorefrontSupportDtos.BlogPostDetail;
import com.example.demo.api.dto.StorefrontSupportDtos.BlogPostSummary;
import com.example.demo.model.BlogPost;
import com.example.demo.repository.BlogPostRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/blog-posts")
public class BlogPublicApiController {

    private final BlogPostRepository blogPostRepository;

    public BlogPublicApiController(BlogPostRepository blogPostRepository) {
        this.blogPostRepository = blogPostRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<BlogPostSummary> listPublished() {
        return blogPostRepository.findByStatusOrderByCreatedAtDesc("PUBLISHED").stream()
                .map(this::toSummary)
                .toList();
    }

    @GetMapping("/{slug}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getBySlug(@PathVariable String slug) {
        String normalized = slug == null ? "" : slug.trim();
        if (normalized.isEmpty()) {
            return ResponseEntity.badRequest().body("Slug khong hop le.");
        }

        BlogPost post = blogPostRepository.findBySlug(normalized).orElse(null);
        if (post == null || !"PUBLISHED".equalsIgnoreCase(post.getStatus())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Khong tim thay bai viet.");
        }
        return ResponseEntity.ok(toDetail(post));
    }

    private BlogPostSummary toSummary(BlogPost post) {
        return new BlogPostSummary(
                post.getId(),
                post.getTitle(),
                post.getSlug(),
                ImageUrlResolver.toPublicImageUrl(post.getThumbnail()),
                post.getSummary(),
                post.getCreatedAt());
    }

    private BlogPostDetail toDetail(BlogPost post) {
        return new BlogPostDetail(
                post.getId(),
                post.getTitle(),
                post.getSlug(),
                ImageUrlResolver.toPublicImageUrl(post.getThumbnail()),
                post.getSummary(),
                post.getContent(),
                post.getCreatedAt());
    }
}

