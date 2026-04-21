package com.example.demo.config;

import com.example.demo.model.Account;
import com.example.demo.service.AccountService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class GoogleOAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final AccountService accountService;
    private final OAuth2FrontendRedirectSupport redirectSupport;

    public GoogleOAuth2AuthenticationSuccessHandler(
            AccountService accountService,
            OAuth2FrontendRedirectSupport redirectSupport) {
        this.accountService = accountService;
        this.redirectSupport = redirectSupport;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        try {
            Account account = accountService.createOrLinkGoogleCustomerAccount(
                    readString(oauthUser, "sub", oauthUser.getName()),
                    readString(oauthUser, "email", null),
                    readString(oauthUser, "name", null));

            UserDetails userDetails = accountService.loadUserByUsername(account.getLoginName());
            if (!userDetails.isEnabled()) {
                throw new IllegalStateException("Google account is linked to a disabled ShopPro account.");
            }
            UsernamePasswordAuthenticationToken localAuthentication = UsernamePasswordAuthenticationToken.authenticated(
                    userDetails,
                    null,
                    userDetails.getAuthorities());
            localAuthentication.setDetails(authentication.getDetails());

            SecurityContext context = new SecurityContextImpl(localAuthentication);
            SecurityContextHolder.setContext(context);
            request.getSession(true)
                    .setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

            response.sendRedirect(redirectSupport.buildSuccessRedirectUrl(request));
        } catch (IllegalArgumentException ex) {
            SecurityContextHolder.clearContext();
            response.sendRedirect(redirectSupport.buildLoginErrorRedirectUrl(request, "google_profile_incomplete"));
        } catch (IllegalStateException ex) {
            SecurityContextHolder.clearContext();
            response.sendRedirect(redirectSupport.buildLoginErrorRedirectUrl(request, "google_account_conflict"));
        }
    }

    private String readString(OAuth2User oauthUser, String attributeName, String fallback) {
        Object value = oauthUser.getAttributes().get(attributeName);
        if (value instanceof String stringValue && !stringValue.isBlank()) {
            return stringValue;
        }
        return fallback;
    }
}
