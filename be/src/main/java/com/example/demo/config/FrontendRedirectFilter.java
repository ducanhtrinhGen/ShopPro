package com.example.demo.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class FrontendRedirectFilter extends OncePerRequestFilter {

    private final FrontendUrlResolver frontendUrlResolver;

    public FrontendRedirectFilter(FrontendUrlResolver frontendUrlResolver) {
        this.frontendUrlResolver = frontendUrlResolver;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api")
                || path.startsWith("/oauth2/")
                || path.startsWith("/login/oauth2/")
                || path.startsWith("/products/image/")
                || path.startsWith("/mvc")
                || path.startsWith("/css/")
                || path.startsWith("/js/")
                || path.startsWith("/images/")
                || path.startsWith("/webjars/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String query = request.getQueryString();
        String target = frontendUrlResolver.resolvePrimaryBaseUrl()
                + request.getRequestURI()
                + (query != null ? "?" + query : "");

        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader("Location", target);
    }
}
