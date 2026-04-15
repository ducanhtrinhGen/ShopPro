package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.AuthDtos.AuthUserResponse;
import com.example.demo.api.dto.AuthDtos.LoginRequest;
import com.example.demo.api.dto.AuthDtos.RegisterRequest;
import com.example.demo.model.Account;
import com.example.demo.service.AccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthApiController {

    private final AuthenticationManager authenticationManager;
    private final AccountService accountService;

    public AuthApiController(AuthenticationManager authenticationManager, AccountService accountService) {
        this.authenticationManager = authenticationManager;
        this.accountService = accountService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody(required = false) LoginRequest request, HttpServletRequest httpRequest) {
        if (request == null || isBlank(request.username()) || isBlank(request.password())) {
            return ResponseEntity.badRequest().body(new ApiError("Username and password are required."));
        }

        try {
            Authentication authentication = authenticateAndStoreSession(request.username(), request.password(), httpRequest);
            return ResponseEntity.ok(toAuthResponse(authentication));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiError("Invalid username or password."));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody(required = false) RegisterRequest request,
            HttpServletRequest httpRequest) {
        if (request == null || isBlank(request.username()) || isBlank(request.password())) {
            return ResponseEntity.badRequest().body(new ApiError("Username and password are required."));
        }

        try {
            Account created = accountService.createUserAccount(request.username(), request.password());
            Authentication authentication = authenticateAndStoreSession(
                    created.getLoginName(),
                    request.password(),
                    httpRequest);
            return ResponseEntity.status(HttpStatus.CREATED).body(toAuthResponse(authentication));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(ex.getMessage()));
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiError("Cannot authenticate newly registered account."));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (!isAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiError("You are not logged in."));
        }

        return ResponseEntity.ok(toAuthResponse(authentication));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        return ResponseEntity.noContent().build();
    }

    private AuthUserResponse toAuthResponse(Authentication authentication) {
        List<String> roles = authentication.getAuthorities().stream()
                .map(grantedAuthority -> grantedAuthority.getAuthority())
                .sorted()
                .toList();
        return new AuthUserResponse(authentication.getName(), roles);
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private Authentication authenticateAndStoreSession(String username, String password, HttpServletRequest httpRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username.trim(), password));

        SecurityContext context = new SecurityContextImpl(authentication);
        SecurityContextHolder.setContext(context);
        httpRequest.getSession(true)
                .setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return authentication;
    }
}

