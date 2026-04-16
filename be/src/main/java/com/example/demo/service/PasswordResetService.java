package com.example.demo.service;

import com.example.demo.model.Account;
import com.example.demo.model.PasswordResetToken;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.PasswordResetTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;

@Service
public class PasswordResetService {

    private static final Duration TOKEN_TTL = Duration.ofHours(1);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AccountRepository accountRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetNotifier notifier;
    private final String publicAppBaseUrl;

    public PasswordResetService(
            AccountRepository accountRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            PasswordResetNotifier notifier,
            @Value("${app.password-reset.public-app-url:http://localhost:5173}") String publicAppBaseUrl) {
        this.accountRepository = accountRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.notifier = notifier;
        this.publicAppBaseUrl = normalizeBaseUrl(publicAppBaseUrl);
    }

    /**
     * Always behaves the same from the caller's perspective to avoid leaking whether an email is registered.
     */
    @Transactional
    public void requestReset(String emailInput) {
        String email = normalizeEmail(emailInput);
        Optional<Account> accountOpt = email.isEmpty()
                ? Optional.empty()
                : accountRepository.findByEmailIgnoreCase(email);

        if (accountOpt.isEmpty() || !canRequestReset(accountOpt.get())) {
            return;
        }

        Account account = accountOpt.get();
        tokenRepository.deleteByAccount(account);

        String rawToken = newRawToken();
        PasswordResetToken entity = new PasswordResetToken();
        entity.setAccount(account);
        entity.setTokenHash(sha256Hex(rawToken));
        entity.setExpiresAt(LocalDateTime.now().plus(TOKEN_TTL));
        tokenRepository.save(entity);

        String link = publicAppBaseUrl + "/reset-password?token=" + java.net.URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
        notifier.sendPasswordResetLink(account.getEmail(), link);
    }

    @Transactional
    public void confirmReset(String tokenInput, String newPassword, String confirmPassword) {
        PasswordPolicy.requireMatch(newPassword, confirmPassword);
        PasswordPolicy.validate(newPassword);

        String raw = tokenInput == null ? "" : tokenInput.trim();
        if (raw.isEmpty()) {
            throw new IllegalArgumentException("Reset link khong hop le hoac da het han.");
        }

        String hash = sha256Hex(raw);
        PasswordResetToken token = tokenRepository.findByTokenHash(hash).orElse(null);
        if (token == null || token.getUsedAt() != null || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Reset link khong hop le hoac da het han.");
        }

        Account account = token.getAccount();
        if (account == null || !canRequestReset(account)) {
            throw new IllegalArgumentException("Reset link khong hop le hoac da het han.");
        }

        token.setUsedAt(LocalDateTime.now());
        tokenRepository.save(token);

        account.setPassword(passwordEncoder.encode(newPassword));
        accountRepository.save(account);

        tokenRepository.deleteByAccount(account);
    }

    private static boolean canRequestReset(Account account) {
        if (account.isLocked()) {
            return false;
        }
        if (account.getStatus() != null && !account.getStatus().isBlank()
                && !"ACTIVE".equalsIgnoreCase(account.getStatus().trim())) {
            return false;
        }
        return account.getEmail() != null && !account.getEmail().isBlank();
    }

    private static String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeBaseUrl(String url) {
        if (url == null || url.isBlank()) {
            return "http://localhost:5173";
        }
        String trimmed = url.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private static String newRawToken() {
        byte[] buf = new byte[48];
        RANDOM.nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    private static String sha256Hex(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
