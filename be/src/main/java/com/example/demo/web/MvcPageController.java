package com.example.demo.web;

import com.example.demo.model.Account;
import com.example.demo.model.Product;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.BlogPostRepository;
import com.example.demo.repository.BrandRepository;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.ContactMessageRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ReviewRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Controller
@RequestMapping("/mvc")
public class MvcPageController {

    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final ReviewRepository reviewRepository;
    private final BlogPostRepository blogPostRepository;
    private final ContactMessageRepository contactMessageRepository;

    public MvcPageController(
            AccountRepository accountRepository,
            CategoryRepository categoryRepository,
            BrandRepository brandRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            ReviewRepository reviewRepository,
            BlogPostRepository blogPostRepository,
            ContactMessageRepository contactMessageRepository) {
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.brandRepository = brandRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.reviewRepository = reviewRepository;
        this.blogPostRepository = blogPostRepository;
        this.contactMessageRepository = contactMessageRepository;
    }

    @GetMapping({ "", "/" })
    public String index() {
        return "redirect:/mvc/dashboard";
    }

    @GetMapping("/login")
    public String loginPage() {
        return "mvc/login";
    }

    @GetMapping("/dashboard")
    @Transactional(readOnly = true)
    public String dashboard(Model model) {
        model.addAttribute("accountCount", accountRepository.count());
        model.addAttribute("categoryCount", categoryRepository.count());
        model.addAttribute("brandCount", brandRepository.count());
        model.addAttribute("productCount", productRepository.count());
        model.addAttribute("orderCount", orderRepository.count());
        model.addAttribute("reviewCount", reviewRepository.count());
        model.addAttribute("blogPostCount", blogPostRepository.count());
        model.addAttribute("contactCount", contactMessageRepository.count());

        List<AccountSummary> users = accountRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .limit(8)
                .map(this::toAccountSummary)
                .toList();

        List<ProductSummary> products = productRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .limit(8)
                .map(this::toProductSummary)
                .toList();

        model.addAttribute("users", users);
        model.addAttribute("products", products);
        model.addAttribute("createdAtFormat", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        return "mvc/dashboard";
    }

    private AccountSummary toAccountSummary(Account account) {
        String roleName = account.getRoles().stream()
                .map(role -> role.getName())
                .sorted()
                .findFirst()
                .orElse("ROLE_USER");

        return new AccountSummary(
                account.getId(),
                account.getLogin_name(),
                account.getFullName(),
                account.getEmail(),
                roleName,
                account.isLocked(),
                account.getStatus());
    }

    private ProductSummary toProductSummary(Product product) {
        String categoryName = product.getCategory() != null ? product.getCategory().getName() : "-";
        String brandName = product.getBrand() != null ? product.getBrand().getName() : "-";

        return new ProductSummary(
                product.getId(),
                product.getName(),
                product.getSlug(),
                categoryName,
                brandName,
                product.getPrice(),
                product.getDiscountPrice(),
                product.getQuantity(),
                product.getStatus());
    }

    public record AccountSummary(
            int id,
            String username,
            String fullName,
            String email,
            String roleName,
            boolean locked,
            String status) {
    }

    public record ProductSummary(
            int id,
            String name,
            String slug,
            String categoryName,
            String brandName,
            long price,
            Long discountPrice,
            int quantity,
            String status) {
    }
}
