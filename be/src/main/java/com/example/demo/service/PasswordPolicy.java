package com.example.demo.service;

import java.util.regex.Pattern;

/**
 * Shared password rules for registration, reset, and change-password flows.
 */
public final class PasswordPolicy {

    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 128;
    private static final Pattern HAS_LETTER = Pattern.compile("[A-Za-z]");
    private static final Pattern HAS_DIGIT = Pattern.compile("\\d");

    private PasswordPolicy() {
    }

    public static void validate(String rawPassword) {
        if (rawPassword == null || rawPassword.isEmpty()) {
            throw new IllegalArgumentException("Mat khau khong duoc de trong.");
        }
        if (rawPassword.length() < MIN_LENGTH) {
            throw new IllegalArgumentException("Mat khau phai co it nhat " + MIN_LENGTH + " ky tu.");
        }
        if (rawPassword.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Mat khau khong duoc dai qua " + MAX_LENGTH + " ky tu.");
        }
        if (!HAS_LETTER.matcher(rawPassword).find()) {
            throw new IllegalArgumentException("Mat khau phai chua it nhat mot chu cai.");
        }
        if (!HAS_DIGIT.matcher(rawPassword).find()) {
            throw new IllegalArgumentException("Mat khau phai chua it nhat mot chu so.");
        }
    }

    public static void requireMatch(String newPassword, String confirmPassword) {
        String a = newPassword == null ? "" : newPassword;
        String b = confirmPassword == null ? "" : confirmPassword;
        if (!a.equals(b)) {
            throw new IllegalArgumentException("Mat khau xac nhan khong khop.");
        }
    }
}
