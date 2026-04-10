package com.example.demo.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class FrontendRedirectFilter extends OncePerRequestFilter {

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api")
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
        String target = frontendUrl + request.getRequestURI() + (query != null ? "?" + query : "");

        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader("Location", target);
    }
}
