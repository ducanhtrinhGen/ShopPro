package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class FrontendUrlResolver {

    @Value("${app.frontend-url:https://shoppro.id.vn,http://localhost:5173}")
    private String frontendUrl;

    public String resolvePrimaryBaseUrl() {
        if (frontendUrl == null) {
            return "https://shoppro.id.vn";
        }

        for (String value : frontendUrl.split(",")) {
            String normalized = trimTrailingSlash(value);
            if (!normalized.isEmpty()) {
                return normalized;
            }
        }

        return "https://shoppro.id.vn";
    }

    public String buildFrontendUrl(String path) {
        String normalizedPath = normalizePath(path);
        return resolvePrimaryBaseUrl() + normalizedPath;
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "/";
        }
        return path.startsWith("/") ? path : "/" + path;
    }

    private String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
