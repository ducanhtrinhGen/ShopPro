package com.example.demo.config;

import com.example.demo.service.AccountService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletResponse;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Deployed frontend origin(s), e.g. "https://shoppro.id.vn".
     * Supports comma-separated list for preview/staging domains.
     */
    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:}")
    private String frontendUrl;

    @Bean
    public DaoAuthenticationProvider daoAuthenticationProvider(AccountService accountService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(accountService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http,
            DaoAuthenticationProvider daoAuthenticationProvider) throws Exception {
        AuthenticationManagerBuilder authBuilder = http.getSharedObject(AuthenticationManagerBuilder.class);
        authBuilder.authenticationProvider(daoAuthenticationProvider);
        return authBuilder.build();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests((authz) -> authz
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/api/products",
                                "/api/products/**",
                                "/api/categories",
                                "/api/brands",
                                "/api/brands/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/blog-posts/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/contact/messages").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews").permitAll()
                        .requestMatchers("/products/image/**").permitAll()
                        .requestMatchers("/mvc/login", "/mvc/perform_login").permitAll()
                        // Customer storefront (không dùng chung cho Staff/Admin)
                        .requestMatchers("/api/customer/**").hasAnyRole("CUSTOMER", "USER")
                        .requestMatchers("/api/cart/**").hasAnyRole("CUSTOMER", "USER")
                        .requestMatchers("/api/orders/**").hasAnyRole("CUSTOMER", "USER")
                        .requestMatchers("/api/wishlist/**").hasAnyRole("CUSTOMER", "USER")
                        .requestMatchers(HttpMethod.POST, "/api/reviews").hasAnyRole("CUSTOMER", "USER")
                        .requestMatchers("/mvc/**").hasAnyRole("OWNER", "ADMIN")
                        .requestMatchers("/api/owner/**").hasRole("OWNER")
                        .requestMatchers("/api/admin/users/**").hasRole("OWNER")
                        // Staff: dedicated operational API only (no /api/admin/**)
                        .requestMatchers("/api/staff/**").hasRole("STAFF")
                        // Admin/Owner: catalog, nội dung, khuyến mãi, upload
                        .requestMatchers("/api/admin/products/**").hasAnyRole("OWNER", "ADMIN")
                        .requestMatchers("/api/admin/categories/**").hasAnyRole("OWNER", "ADMIN")
                        .requestMatchers("/api/admin/brands/**").hasAnyRole("OWNER", "ADMIN")
                        .requestMatchers("/api/admin/blog-posts/**").hasAnyRole("OWNER", "ADMIN")
                        .requestMatchers("/api/admin/promotions/**").hasAnyRole("OWNER", "ADMIN")
                        .requestMatchers("/api/admin/cloudinary/**").hasAnyRole("OWNER", "ADMIN")
                        .requestMatchers("/api/admin/**").hasAnyRole("OWNER", "ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling((exception) -> exception
                        .defaultAuthenticationEntryPointFor(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                                new AntPathRequestMatcher("/api/**"))
                        .defaultAuthenticationEntryPointFor(
                                new LoginUrlAuthenticationEntryPoint("/mvc/login"),
                                new AntPathRequestMatcher("/mvc/**"))
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            String uri = request.getRequestURI();
                            String context = request.getContextPath();
                            if (uri != null && context != null && uri.startsWith(context + "/mvc")
                                    && !uri.startsWith(context + "/mvc/login")) {
                                response.sendRedirect(context + "/mvc/login?forbidden");
                                return;
                            }
                            if (!response.isCommitted()) {
                                response.sendError(HttpServletResponse.SC_FORBIDDEN);
                            }
                        }))
                .formLogin(form -> form
                        .loginPage("/mvc/login")
                        .loginProcessingUrl("/mvc/perform_login")
                        .defaultSuccessUrl("/mvc/dashboard", true)
                        .permitAll())
                .csrf(AbstractHttpConfigurer::disable);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(buildAllowedOriginPatterns());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        source.registerCorsConfiguration("/products/image/**", config);
        return source;
    }

    private List<String> buildAllowedOriginPatterns() {
        List<String> base = List.of("http://localhost:*", "http://127.0.0.1:*");

        String raw = frontendUrl == null ? "" : frontendUrl.trim();
        if (raw.isEmpty()) {
            return base;
        }

        List<String> configured = Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toList());

        if (configured.isEmpty()) {
            return base;
        }

        // Allow configured origins + keep local development origins.
        return Arrays.asList(
                configured.toArray(new String[0])
        ).stream().collect(Collectors.collectingAndThen(Collectors.toList(), list -> {
            list.addAll(base);
            return list;
        }));
    }
}
