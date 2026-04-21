package com.example.demo.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class GoogleOAuth2AuthenticationFailureHandler implements AuthenticationFailureHandler {

    private final OAuth2FrontendRedirectSupport redirectSupport;

    public GoogleOAuth2AuthenticationFailureHandler(OAuth2FrontendRedirectSupport redirectSupport) {
        this.redirectSupport = redirectSupport;
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {
        response.sendRedirect(redirectSupport.buildLoginErrorRedirectUrl(request, "google_auth_failed"));
    }
}
