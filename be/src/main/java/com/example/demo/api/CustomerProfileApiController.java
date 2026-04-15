package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.CustomerProfileDtos.CustomerProfileResponse;
import com.example.demo.api.dto.CustomerProfileDtos.CustomerProfileUpdateRequest;
import com.example.demo.model.Account;
import com.example.demo.repository.AccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer/profile")
public class CustomerProfileApiController {

    private final AccountRepository accountRepository;

    public CustomerProfileApiController(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getProfile(Authentication authentication) {
        String loginName = resolveLoginName(authentication);
        if (loginName == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("You are not logged in."));
        }

        Account account = accountRepository.findByLoginName(loginName).orElse(null);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Account not found."));
        }

        return ResponseEntity.ok(toProfile(account));
    }

    @PutMapping
    @Transactional
    public ResponseEntity<?> updateProfile(
            @RequestBody(required = false) CustomerProfileUpdateRequest request,
            Authentication authentication) {
        String loginName = resolveLoginName(authentication);
        if (loginName == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("You are not logged in."));
        }

        if (request == null) {
            return ResponseEntity.badRequest().body(new ApiError("Profile data is required."));
        }

        Account account = accountRepository.findByLoginName(loginName).orElse(null);
        if (account == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("Account not found."));
        }

        String nextEmail = trimToNull(request.email());
        if (nextEmail != null) {
            Account existing = accountRepository.findByEmail(nextEmail).orElse(null);
            if (existing != null && existing.getId() != account.getId()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("Email already in use."));
            }
        }

        account.setFullName(trimToNull(request.fullName()));
        account.setEmail(nextEmail);
        account.setPhone(trimToNull(request.phone()));
        account.setAddress(trimToNull(request.address()));

        Account saved = accountRepository.save(account);
        return ResponseEntity.ok(toProfile(saved));
    }

    private CustomerProfileResponse toProfile(Account account) {
        return new CustomerProfileResponse(
                account.getLoginName(),
                trimToNull(account.getFullName()),
                trimToNull(account.getEmail()),
                trimToNull(account.getPhone()),
                trimToNull(account.getAddress()));
    }

    private String resolveLoginName(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        String name = authentication.getName();
        return name == null || name.isBlank() ? null : name.trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

