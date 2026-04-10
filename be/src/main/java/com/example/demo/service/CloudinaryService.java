package com.example.demo.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

@Service
public class CloudinaryService {

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${cloudinary.folder:shoppro/products}")
    private String defaultFolder;

    public CloudinaryUploadResult uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File anh khong hop le.");
        }

        Cloudinary cloudinary = buildClient();
        String effectiveFolder = normalizeFolder(folder);

        Map<String, Object> options = new LinkedHashMap<>();
        options.put("resource_type", "image");
        options.put("folder", effectiveFolder);
        options.put("overwrite", true);
        options.put("unique_filename", true);

        try {
            Map<?, ?> uploaded = cloudinary.uploader().upload(file.getBytes(), options);

            String secureUrl = Objects.toString(uploaded.get("secure_url"), null);
            String publicId = Objects.toString(uploaded.get("public_id"), null);
            String format = Objects.toString(uploaded.get("format"), null);
            long bytes = toLong(uploaded.get("bytes"));

            if (secureUrl == null || secureUrl.isBlank()) {
                throw new IllegalStateException("Cloudinary khong tra ve secure_url.");
            }

            return new CloudinaryUploadResult(secureUrl, publicId, format, bytes);
        } catch (IOException ex) {
            throw new IllegalStateException("Upload anh len Cloudinary that bai.", ex);
        }
    }

    private Cloudinary buildClient() {
        if (isBlank(cloudName) || isBlank(apiKey) || isBlank(apiSecret)) {
            throw new IllegalStateException(
                    "Chua cau hinh Cloudinary. Can cloudinary.cloud-name, cloudinary.api-key, cloudinary.api-secret.");
        }

        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName.trim(),
                "api_key", apiKey.trim(),
                "api_secret", apiSecret.trim(),
                "secure", true));
    }

    private String normalizeFolder(String folder) {
        String candidate = isBlank(folder) ? defaultFolder : folder;
        if (candidate == null || candidate.isBlank()) {
            return "shoppro/products";
        }
        return candidate.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value != null) {
            try {
                return Long.parseLong(value.toString());
            } catch (NumberFormatException ignored) {
                return 0L;
            }
        }
        return 0L;
    }

    public record CloudinaryUploadResult(String secureUrl, String publicId, String format, long bytes) {
    }
}
