package com.example.demo.api;

import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;

public final class ImageUrlResolver {

    private ImageUrlResolver() {
    }

    public static String toPublicImageUrl(String rawImageValue) {
        if (rawImageValue == null || rawImageValue.isBlank()) {
            return null;
        }

        String trimmed = rawImageValue.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }

        return "/products/image/" + UriUtils.encodePathSegment(trimmed, StandardCharsets.UTF_8);
    }
}
