package com.example.demo.api.dto;

import java.util.List;

public final class AdminUserDtos {

    private AdminUserDtos() {
    }

    public record AdminUserItem(
            int id,
            String username,
            String role,
            boolean locked,
            List<String> roles) {
    }

    public record UpdateRoleRequest(String role) {
    }

    public record CreateUserRequest(String username, String password, String role) {
    }

    public record UpdateLockRequest(Boolean locked) {
    }
}
