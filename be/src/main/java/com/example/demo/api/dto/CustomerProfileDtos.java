package com.example.demo.api.dto;

public final class CustomerProfileDtos {

    private CustomerProfileDtos() {
    }

    public record CustomerProfileResponse(
            String username,
            String fullName,
            String email,
            String phone,
            String address) {
    }

    public record CustomerProfileUpdateRequest(
            String fullName,
            String email,
            String phone,
            String address) {
    }
}

