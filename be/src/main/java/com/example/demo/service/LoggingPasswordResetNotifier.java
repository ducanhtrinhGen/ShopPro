package com.example.demo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LoggingPasswordResetNotifier implements PasswordResetNotifier {

    private static final Logger log = LoggerFactory.getLogger(LoggingPasswordResetNotifier.class);

    @Override
    public void sendPasswordResetLink(String email, String resetLink) {
        log.info("Password reset link generated for {} (configure email delivery in production).", mask(email));
        log.debug("Reset link target host: {}", safeHost(resetLink));
    }

    private static String mask(String email) {
        if (email == null || email.isBlank()) {
            return "(empty)";
        }
        int at = email.indexOf('@');
        if (at <= 1) {
            return "***@" + email.substring(Math.max(at, 0));
        }
        return email.charAt(0) + "***" + email.substring(at);
    }

    private static String safeHost(String resetLink) {
        if (resetLink == null) {
            return "";
        }
        try {
            java.net.URI uri = java.net.URI.create(resetLink);
            return uri.getHost() == null ? "" : uri.getHost();
        } catch (Exception ex) {
            return "";
        }
    }
}
