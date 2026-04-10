package com.example.demo.config;

import com.example.demo.model.Account;
import com.example.demo.model.BlogPost;
import com.example.demo.model.Brand;
import com.example.demo.model.Cart;
import com.example.demo.model.CartLineItem;
import com.example.demo.model.Category;
import com.example.demo.model.ContactMessage;
import com.example.demo.model.Product;
import com.example.demo.model.ProductImage;
import com.example.demo.model.Review;
import com.example.demo.model.Role;
import com.example.demo.model.Wishlist;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.BlogPostRepository;
import com.example.demo.repository.BrandRepository;
import com.example.demo.repository.CartLineItemRepository;
import com.example.demo.repository.CartRepository;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.ContactMessageRepository;
import com.example.demo.repository.ProductImageRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ReviewRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.WishlistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private WishlistRepository wishlistRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartLineItemRepository cartLineItemRepository;

    @Autowired
    private BlogPostRepository blogPostRepository;

    @Autowired
    private ContactMessageRepository contactMessageRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        ensureRole("ROLE_ADMIN");
        ensureRole("ROLE_OWNER");
        ensureRole("ROLE_STAFF");
        ensureRole("ROLE_CUSTOMER");
        ensureRole("ROLE_USER");

        Account admin = ensureAccount(
                "admin",
                "admin123",
                "Administrator",
                "admin@shoppro.local",
                "0900000001",
                "1 Admin Street, HCMC",
                "ACTIVE",
                false,
                "ROLE_ADMIN");

        Account owner = ensureAccount(
                "owner",
                "owner123",
                "Shop Owner",
                "owner@shoppro.local",
                "0900000002",
                "2 Owner Street, HCMC",
                "ACTIVE",
                false,
                "ROLE_OWNER");

        Account staff = ensureAccount(
                "staff",
                "staff123",
                "Staff One",
                "staff@shoppro.local",
                "0900000003",
                "3 Staff Street, HCMC",
                "ACTIVE",
                false,
                "ROLE_STAFF");

        Account customer = ensureAccount(
                "customer",
                "customer123",
                "Customer One",
                "customer@shoppro.local",
                "0900000004",
                "4 Customer Street, HCMC",
                "ACTIVE",
                false,
                "ROLE_CUSTOMER");

        Account user1 = ensureAccount(
                "user1",
                "user123",
                "User One",
                "user1@shoppro.local",
                "0900000005",
                "5 User Street, HCMC",
                "ACTIVE",
                false,
                "ROLE_USER");

        Category cpuCategory = ensureCategory("CPU", "Bo xu ly trung tam cho PC gaming va workstation.", "ACTIVE");
        Category gpuCategory = ensureCategory("VGA", "Card do hoa danh cho gaming va render.", "ACTIVE");
        Category ramCategory = ensureCategory("RAM", "Bo nho RAM DDR4/DDR5 dung luong cao.", "ACTIVE");
        Category ssdCategory = ensureCategory("SSD", "Luu tru toc do cao NVMe va SATA.", "ACTIVE");
        Category keyboardCategory = ensureCategory("Keyboard", "Ban phim co va ban phim gaming.", "ACTIVE");
        Category monitorCategory = ensureCategory("Monitor", "Man hinh gaming tan so quet cao.", "ACTIVE");

        Brand amdBrand = ensureBrand("AMD", "Thuong hieu CPU/GPU noi tieng cho gaming va workstation.", "ACTIVE");
        Brand intelBrand = ensureBrand("Intel", "Thuong hieu CPU va nen tang PC pho bien.", "ACTIVE");
        Brand nvidiaBrand = ensureBrand("NVIDIA", "Thuong hieu GPU manh cho AI va gaming.", "ACTIVE");
        Brand corsairBrand = ensureBrand("Corsair", "Phu kien gaming va linh kien cao cap.", "ACTIVE");
        Brand samsungBrand = ensureBrand("Samsung", "Thuong hieu SSD va bo nho tin cay.", "ACTIVE");
        Brand asusBrand = ensureBrand("ASUS", "Mainboard, GPU va monitor cho gamers.", "ACTIVE");

        Product p1 = ensureProduct(new ProductSeed(
                "amd-ryzen-7-7800x3d",
                "CPU AMD Ryzen 7 7800X3D",
                cpuCategory,
                amdBrand,
                11490000L,
                10690000L,
                35,
                "CPU 8 nhan 16 luong toi uu cho gaming.",
                "Ryzen 7 7800X3D phu hop gaming FPS cao, tieu thu dien nang hop ly.",
                "8C/16T, Base 4.2GHz, Boost 5.0GHz, Cache 96MB",
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
                "ACTIVE"));

        Product p2 = ensureProduct(new ProductSeed(
                "intel-core-i7-14700k",
                "CPU Intel Core i7-14700K",
                cpuCategory,
                intelBrand,
                11990000L,
                10990000L,
                28,
                "CPU hybrid core cho da nhiem va gaming.",
                "Intel Core i7-14700K can bang giua da nhiem, streaming va render.",
                "20 Cores (8P+12E), 28 Threads, Turbo 5.6GHz",
                "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80",
                "ACTIVE"));

        Product p3 = ensureProduct(new ProductSeed(
                "rtx-4070-super-12g",
                "VGA GeForce RTX 4070 SUPER 12GB",
                gpuCategory,
                nvidiaBrand,
                17990000L,
                16990000L,
                20,
                "GPU cho 2K gaming va creator.",
                "RTX 4070 SUPER mang lai hieu nang manh cho game AAA va phan mem do hoa.",
                "12GB GDDR6X, Ray Tracing, DLSS 3",
                "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80",
                "ACTIVE"));

        Product p4 = ensureProduct(new ProductSeed(
                "ddr5-32gb-6000",
                "RAM DDR5 32GB 6000MHz",
                ramCategory,
                corsairBrand,
                3190000L,
                2890000L,
                80,
                "Bo nho 32GB cho gaming va design.",
                "Ram DDR5 toc do cao, on dinh cho bo may hieu nang.",
                "32GB (2x16GB), Bus 6000MHz, CL36",
                "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1200&q=80",
                "ACTIVE"));

        Product p5 = ensureProduct(new ProductSeed(
                "ssd-990-pro-2tb",
                "SSD Samsung 990 PRO 2TB",
                ssdCategory,
                samsungBrand,
                4790000L,
                4390000L,
                50,
                "SSD NVMe gen4 toc do cao.",
                "SSD cho game load nhanh va xu ly du lieu lon.",
                "PCIe 4.0, Read 7450MB/s, Write 6900MB/s",
                "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80",
                "ACTIVE"));

        Product p6 = ensureProduct(new ProductSeed(
                "keyboard-k65-wireless",
                "Ban phim K65 Wireless",
                keyboardCategory,
                corsairBrand,
                2990000L,
                2590000L,
                70,
                "Ban phim khong day layout gon.",
                "Ban phim co 75% cho setup gon, pin ben va ket noi nhanh.",
                "Wireless 2.4G/Bluetooth, LED RGB, Hot-swap",
                "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1200&q=80",
                "ACTIVE"));

        Product p7 = ensureProduct(new ProductSeed(
                "asus-rog-27-2k-170hz",
                "Man hinh ASUS ROG 27 inch 2K 170Hz",
                monitorCategory,
                asusBrand,
                8990000L,
                8390000L,
                24,
                "Man hinh gaming 2K tan so quet cao.",
                "Man hinh phu hop cho esports va do hoa mau sac chuan.",
                "27 inch, 2560x1440, 170Hz, IPS",
                "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1200&q=80",
                "ACTIVE"));

        Product p8 = ensureProduct(new ProductSeed(
                "mainboard-b650-atx",
                "Mainboard B650 ATX",
                cpuCategory,
                asusBrand,
                5490000L,
                4990000L,
                30,
                "Mainboard cho nen tang AMD AM5.",
                "Mainboard B650 voi VRM manh va nhieu cong ket noi.",
                "AM5, DDR5, PCIe 4.0, Wi-Fi",
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
                "ACTIVE"));

        ensureProductImage(p1, "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80");
        ensureProductImage(p2, "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80");
        ensureProductImage(p3, "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80");

        ensureBlogPost(
                "Bi kip chon CPU phu hop nhu cau",
                "bi-kip-chon-cpu-phu-hop",
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
                "Huong dan chon CPU cho gaming, design va da nhiem.",
                "Noi dung chi tiet cach chon CPU theo budget va nhu cau su dung.",
                "PUBLISHED");

        ensureBlogPost(
                "5 meo toi uu FPS cho game thu",
                "5-meo-toi-uu-fps",
                "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
                "Tong hop meo toi uu hieu nang game tren Windows.",
                "Tat ung dung nen, cap nhat driver va tinh chinh setting de dat FPS on dinh.",
                "PUBLISHED");

        ensureBlogPost(
                "Khi nao nen nang cap SSD",
                "khi-nao-nen-nang-cap-ssd",
                "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80",
                "Dau hieu nhan biet SSD cu khong con dap ung.",
                "Huong dan nhan biet va lua chon SSD phu hop cho hoc tap, lam viec, gaming.",
                "DRAFT");

        ensureContactMessages();

        ensureWishlist(customer, p1);
        ensureWishlist(user1, p3);

        ensureReview(customer, p1, 5, "CPU chay rat mat va FPS on dinh.");
        ensureReview(user1, p3, 4, "Hieu nang 2K tot, rat dang tien.");

        Cart customerCart = ensureCart(customer);
        ensureCartItem(customerCart, p4, 2, p4.getDiscountPrice() != null ? p4.getDiscountPrice() : p4.getPrice());
        ensureCartItem(customerCart, p5, 1, p5.getDiscountPrice() != null ? p5.getDiscountPrice() : p5.getPrice());

        Cart userCart = ensureCart(user1);
        ensureCartItem(userCart, p6, 1, p6.getDiscountPrice() != null ? p6.getDiscountPrice() : p6.getPrice());

        // Keep references used in local variable to avoid accidental removal by future refactors.
        if (admin == null || owner == null || staff == null) {
            throw new IllegalStateException("Seed account initialization failed.");
        }
    }

    private void ensureRole(String roleName) {
        if (roleRepository.findByName(roleName).isPresent()) {
            return;
        }

        Role role = new Role();
        role.setName(roleName);
        roleRepository.save(role);
    }

    private Account ensureAccount(
            String loginName,
            String rawPassword,
            String fullName,
            String email,
            String phone,
            String address,
            String status,
            boolean locked,
            String... roleNames) {

        Account account = accountRepository.findByLoginName(loginName).orElseGet(Account::new);
        boolean isNew = account.getId() == 0;

        account.setLogin_name(loginName);
        if (isNew) {
            account.setPassword(passwordEncoder.encode(rawPassword));
        }
        account.setFullName(fullName);
        account.setEmail(email);
        account.setPhone(phone);
        account.setAddress(address);
        account.setStatus(status);
        account.setLocked(locked);

        Set<Role> assignedRoles = new HashSet<>();
        Arrays.stream(roleNames)
                .map(roleName -> roleRepository.findByName(roleName)
                        .orElseThrow(() -> new IllegalStateException("Khong tim thay role: " + roleName)))
                .forEach(assignedRoles::add);

        account.setRoles(assignedRoles);
        return accountRepository.save(account);
    }

    private Category ensureCategory(String name, String description, String status) {
        Category category = categoryRepository.findByName(name).orElseGet(Category::new);
        category.setName(name);
        category.setDescription(description);
        category.setStatus(status);
        return categoryRepository.save(category);
    }

    private Brand ensureBrand(String name, String description, String status) {
        Brand brand = brandRepository.findByName(name).orElseGet(Brand::new);
        brand.setName(name);
        brand.setDescription(description);
        brand.setStatus(status);
        return brandRepository.save(brand);
    }

    private Product ensureProduct(ProductSeed seed) {
        Product product = productRepository.findBySlug(seed.slug()).orElseGet(Product::new);

        product.setSlug(seed.slug());
        product.setName(seed.name());
        product.setCategory(seed.category());
        product.setBrand(seed.brand());
        product.setPrice(seed.price());
        product.setDiscountPrice(seed.discountPrice());
        product.setQuantity(seed.quantity());
        product.setShortDescription(seed.shortDescription());
        product.setDescription(seed.description());
        product.setSpecifications(seed.specifications());
        product.setThumbnail(seed.thumbnail());
        product.setImage(null);
        product.setStatus(seed.status());

        return productRepository.save(product);
    }

    private void ensureProductImage(Product product, String imageUrl) {
        if (productImageRepository.existsByProductAndImageUrl(product, imageUrl)) {
            return;
        }

        ProductImage image = new ProductImage();
        image.setProduct(product);
        image.setImageUrl(imageUrl);
        productImageRepository.save(image);
    }

    private void ensureBlogPost(String title, String slug, String thumbnail, String summary, String content, String status) {
        BlogPost post = blogPostRepository.findBySlug(slug).orElseGet(BlogPost::new);
        post.setTitle(title);
        post.setSlug(slug);
        post.setThumbnail(thumbnail);
        post.setSummary(summary);
        post.setContent(content);
        post.setStatus(status);
        blogPostRepository.save(post);
    }

    private void ensureContactMessages() {
        if (contactMessageRepository.count() > 0) {
            return;
        }

        List<ContactMessage> messages = List.of(
                createContactMessage("Nguyen Van A", "a@example.com", "Hoi ve bao hanh", "San pham nay bao hanh bao lau?", "NEW"),
                createContactMessage("Tran Thi B", "b@example.com", "Tu van build PC", "Nho tu van cau hinh 25 trieu de stream game.", "IN_PROGRESS"),
                createContactMessage("Le Van C", "c@example.com", "Gop y website", "Web dep, mong co them bo loc theo thuong hieu.", "RESOLVED"));

        contactMessageRepository.saveAll(messages);
    }

    private ContactMessage createContactMessage(String fullName, String email, String subject, String message, String status) {
        ContactMessage contactMessage = new ContactMessage();
        contactMessage.setFullName(fullName);
        contactMessage.setEmail(email);
        contactMessage.setSubject(subject);
        contactMessage.setMessage(message);
        contactMessage.setStatus(status);
        return contactMessage;
    }

    private void ensureWishlist(Account user, Product product) {
        if (wishlistRepository.findByUserAndProduct(user, product).isPresent()) {
            return;
        }

        Wishlist wishlist = new Wishlist();
        wishlist.setUser(user);
        wishlist.setProduct(product);
        wishlistRepository.save(wishlist);
    }

    private void ensureReview(Account user, Product product, int rating, String comment) {
        if (reviewRepository.existsByUserAndProduct(user, product)) {
            return;
        }

        Review review = new Review();
        review.setUser(user);
        review.setProduct(product);
        review.setRating(rating);
        review.setComment(comment);
        reviewRepository.save(review);
    }

    private Cart ensureCart(Account user) {
        Cart cart = cartRepository.findByUser(user).orElseGet(Cart::new);
        cart.setUser(user);
        return cartRepository.save(cart);
    }

    private void ensureCartItem(Cart cart, Product product, int quantity, long unitPrice) {
        CartLineItem lineItem = cartLineItemRepository.findByCartAndProduct(cart, product).orElseGet(CartLineItem::new);
        lineItem.setCart(cart);
        lineItem.setProduct(product);
        lineItem.setQuantity(quantity);
        lineItem.setUnitPrice(unitPrice);
        cartLineItemRepository.save(lineItem);
    }

    private record ProductSeed(
            String slug,
            String name,
            Category category,
            Brand brand,
            long price,
            Long discountPrice,
            int quantity,
            String shortDescription,
            String description,
            String specifications,
            String thumbnail,
            String status) {
    }
}