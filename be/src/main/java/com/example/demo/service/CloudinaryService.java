package com.example.demo.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Locale;
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
        validateImageMultipart(file);

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
        } catch (RuntimeException ex) {
            throw new IllegalStateException(buildUploadFailureMessage(ex), ex);
        }
    }

    /**
     * Best-effort delete for images uploaded to this Cloudinary account.
     * If the URL cannot be mapped to a public_id, this becomes a no-op.
     */
    public void tryDestroyUploadedImage(String secureUrl) {
        if (isBlank(secureUrl)) {
            return;
        }

        String publicId = extractCloudinaryPublicId(secureUrl.trim());
        if (publicId == null || publicId.isBlank()) {
            return;
        }

        try {
            Cloudinary cloudinary = buildClient();
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
        } catch (Exception ignored) {
            // Best-effort: DB row is already removed; avoid failing the admin flow on Cloudinary issues.
        }
    }

    private void validateImageMultipart(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("Chi chap nhan file anh (image/*).");
        }

        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (!original.isBlank()) {
            boolean looksLikeImage = original.endsWith(".png")
                    || original.endsWith(".jpg")
                    || original.endsWith(".jpeg")
                    || original.endsWith(".webp")
                    || original.endsWith(".gif")
                    || original.endsWith(".avif");
            if (!looksLikeImage) {
                throw new IllegalArgumentException("Dinh dang file khong hop le. Hay dung PNG/JPG/WEBP.");
            }
        }
    }

    private String extractCloudinaryPublicId(String secureUrl) {
        try {
            URI uri = URI.create(secureUrl);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (!host.contains("res.cloudinary.com")) {
                return null;
            }

            String path = uri.getPath();
            if (path == null || path.isBlank()) {
                return null;
            }

            // Typical path: /{cloud_name}/image/upload/v1234567890/{public_id}.{ext}
            // or: /{cloud_name}/image/upload/{public_id}.{ext}
            String normalized = path.startsWith("/") ? path.substring(1) : path;
            String[] segments = normalized.split("/");
            int uploadIndex = -1;
            for (int i = 0; i < segments.length; i++) {
                if ("upload".equalsIgnoreCase(segments[i])) {
                    uploadIndex = i;
                    break;
                }
            }

            if (uploadIndex < 0 || uploadIndex + 1 >= segments.length) {
                return null;
            }

            int next = uploadIndex + 1;
            if (next < segments.length && segments[next].matches("v\\d+")) {
                next++;
            }

            if (next >= segments.length) {
                return null;
            }

            StringBuilder publicId = new StringBuilder();
            for (int i = next; i < segments.length; i++) {
                if (!publicId.isEmpty()) {
                    publicId.append('/');
                }
                publicId.append(segments[i]);
            }

            String candidate = publicId.toString();
            int dot = candidate.lastIndexOf('.');
            if (dot > 0) {
                candidate = candidate.substring(0, dot);
            }
            return candidate;
        } catch (IllegalArgumentException ex) {
            return null;
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

    private String buildUploadFailureMessage(RuntimeException ex) {
        String detail = ex.getMessage();
        if (detail == null || detail.isBlank()) {
            return "Upload anh len Cloudinary that bai.";
        }
        String compact = detail.replace('\n', ' ').replace('\r', ' ').trim();
        if (compact.length() > 220) {
            compact = compact.substring(0, 220) + "...";
        }
        return "Upload anh len Cloudinary that bai: " + compact;
    }

    public record CloudinaryUploadResult(String secureUrl, String publicId, String format, long bytes) {
    }
}
