package com.example.demo.config;

import com.example.demo.model.Account;
import com.example.demo.repository.AccountRepository;
import com.example.demo.service.JwtTokenService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final AccountRepository accountRepository;
    private final JwtTokenService jwtTokenService;
    private final FrontendUrlResolver frontendUrlResolver;

    public OAuth2SuccessHandler(
            AccountRepository accountRepository,
            JwtTokenService jwtTokenService,
            FrontendUrlResolver frontendUrlResolver) {
        this.accountRepository = accountRepository;
        this.jwtTokenService = jwtTokenService;
        this.frontendUrlResolver = frontendUrlResolver;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String loginName = readString(oauth2User, "loginName", authentication.getName());
        String email = readString(oauth2User, "email", null);

        Account account = accountRepository.findByLoginName(loginName)
                .or(() -> email == null ? java.util.Optional.empty() : accountRepository.findByEmailIgnoreCase(email))
                .orElse(null);

        if (account == null) {
            response.sendRedirect(buildLoginErrorRedirect("oauth2_account_not_found"));
            return;
        }
        if (account.isLocked() || !"ACTIVE".equalsIgnoreCase(account.getStatus())) {
            response.sendRedirect(buildLoginErrorRedirect("oauth2_account_inactive"));
            return;
        }

        String token = jwtTokenService.generateToken(account);
        String redirectUrl = UriComponentsBuilder
                .fromUriString(frontendUrlResolver.buildFrontendUrl("/oauth2/redirect"))
                .queryParam("token", token)
                .build(true)
                .toUriString();
        response.sendRedirect(redirectUrl);
    }

    private String buildLoginErrorRedirect(String errorCode) {
        return UriComponentsBuilder
                .fromUriString(frontendUrlResolver.buildFrontendUrl("/login"))
                .queryParam("oauthError", errorCode)
                .build(true)
                .toUriString();
    }

    private String readString(OAuth2User user, String key, String fallback) {
        Object value = user.getAttributes().get(key);
        if (value instanceof String str && !str.isBlank()) {
            return str;
        }
        return fallback;
    }
}
