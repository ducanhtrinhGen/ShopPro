package com.example.demo.service;

/**
 * Delivers password-reset links (email, SMS, etc.). Default impl logs without leaking the token.
 */
public interface PasswordResetNotifier {

    void sendPasswordResetLink(String email, String resetLink);
}
