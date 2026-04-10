package com.example.demo.api.dto;

import java.util.List;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(String username, String password) {
    }

    public record AuthUserResponse(String username, List<String> roles) {
    }
}
