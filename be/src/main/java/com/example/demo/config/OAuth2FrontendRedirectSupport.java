package com.example.demo.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2FrontendRedirectSupport {

    private static final String REDIRECT_PATH_SESSION_KEY = OAuth2FrontendRedirectSupport.class.getName() + ".redirectPath";
    private static final String DEFAULT_SUCCESS_PATH = "/customer";

    private final FrontendUrlResolver frontendUrlResolver;

    public OAuth2FrontendRedirectSupport(FrontendUrlResolver frontendUrlResolver) {
        this.frontendUrlResolver = frontendUrlResolver;
    }

    public void storeRedirectPath(HttpServletRequest request, String requestedPath) {
        request.getSession(true).setAttribute(REDIRECT_PATH_SESSION_KEY, sanitizePath(requestedPath));
    }

    public String buildSuccessRedirectUrl(HttpServletRequest request) {
        return frontendUrlResolver.buildFrontendUrl(consumeRedirectPath(request));
    }

    public String buildLoginErrorRedirectUrl(HttpServletRequest request, String errorCode) {
        String redirectPath = consumeRedirectPath(request);
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(frontendUrlResolver.buildFrontendUrl("/login"))
                .queryParam("oauthError", errorCode);
        if (!DEFAULT_SUCCESS_PATH.equals(redirectPath)) {
            builder.queryParam("from", redirectPath);
        }
        return builder.build(true).toUriString();
    }

    private String consumeRedirectPath(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return DEFAULT_SUCCESS_PATH;
        }

        Object rawValue = session.getAttribute(REDIRECT_PATH_SESSION_KEY);
        session.removeAttribute(REDIRECT_PATH_SESSION_KEY);

        if (!(rawValue instanceof String value)) {
            return DEFAULT_SUCCESS_PATH;
        }

        return sanitizePath(value);
    }

    private String sanitizePath(String value) {
        if (value == null) {
            return DEFAULT_SUCCESS_PATH;
        }

        String normalized = value.trim();
        if (normalized.isEmpty()
                || !normalized.startsWith("/")
                || normalized.startsWith("//")
                || normalized.contains("://")
                || normalized.contains("\r")
                || normalized.contains("\n")) {
            return DEFAULT_SUCCESS_PATH;
        }

        return normalized;
    }
}
