package com.example.demo.api.dto;

import java.util.List;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(String username, String password) {
    }

    public record RegisterRequest(String username, String password) {
    }

    public record AuthUserResponse(String username, List<String> roles) {
    }

    public record PasswordResetRequest(String email) {
    }

    public record PasswordResetRequestResponse(String message) {
    }

    public record PasswordResetConfirmRequest(String token, String newPassword, String confirmPassword) {
    }

    public record PasswordChangeRequest(String currentPassword, String newPassword, String confirmPassword) {
    }

    public record SimpleMessageResponse(String message) {
    }
}
