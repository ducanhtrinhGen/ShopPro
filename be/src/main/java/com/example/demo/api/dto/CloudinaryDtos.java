package com.example.demo.api.dto;

public final class CloudinaryDtos {

    private CloudinaryDtos() {
    }

    public record UploadImageResponse(
            String secureUrl,
            String publicId,
            String format,
            long bytes,
            Integer productId) {
    }
}
