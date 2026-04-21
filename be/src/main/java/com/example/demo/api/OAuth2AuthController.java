package com.example.demo.api;

import com.example.demo.config.OAuth2FrontendRedirectSupport;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/api/auth/oauth2")
public class OAuth2AuthController {

    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider;
    private final OAuth2FrontendRedirectSupport redirectSupport;

    public OAuth2AuthController(
            ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider,
            OAuth2FrontendRedirectSupport redirectSupport) {
        this.clientRegistrationRepositoryProvider = clientRegistrationRepositoryProvider;
        this.redirectSupport = redirectSupport;
    }

    @GetMapping("/authorization/google")
    public void authorizeGoogle(
            @RequestParam(name = "redirect", required = false) String redirectPath,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        redirectSupport.storeRedirectPath(request, redirectPath);

        ClientRegistrationRepository repository = clientRegistrationRepositoryProvider.getIfAvailable();
        if (repository == null || repository.findByRegistrationId("google") == null) {
            response.sendRedirect(redirectSupport.buildLoginErrorRedirectUrl(request, "google_not_configured"));
            return;
        }

        response.sendRedirect(request.getContextPath() + "/oauth2/authorization/google");
    }
}
