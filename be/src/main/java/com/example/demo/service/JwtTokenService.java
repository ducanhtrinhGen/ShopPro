package com.example.demo.service;

import com.example.demo.model.Account;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@Service
public class JwtTokenService {

    @Value("${app.jwt.secret:shoppro-dev-jwt-secret-change-in-production-2026}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-seconds:86400}")
    private long expirationSeconds;

    public String generateToken(Account account) {
        Instant now = Instant.now();
        Instant expiration = now.plusSeconds(Math.max(expirationSeconds, 60L));

        List<String> roles = account.getRoles().stream()
                .map(role -> role.getName())
                .sorted()
                .toList();

        return Jwts.builder()
                .subject(account.getLoginName())
                .claim("email", account.getEmail())
                .claim("roles", roles)
                .claim("provider", account.getProvider())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiration))
                .signWith(buildSigningKey())
                .compact();
    }

    private SecretKey buildSigningKey() {
        byte[] secretBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(secretBytes, 0, padded, 0, secretBytes.length);
            for (int i = secretBytes.length; i < padded.length; i++) {
                padded[i] = (byte) '0';
            }
            secretBytes = padded;
        }
        return Keys.hmacShaKeyFor(secretBytes);
    }
}
