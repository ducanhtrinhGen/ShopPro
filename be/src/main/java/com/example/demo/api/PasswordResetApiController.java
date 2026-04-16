package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.AuthDtos.PasswordResetConfirmRequest;
import com.example.demo.api.dto.AuthDtos.PasswordResetRequest;
import com.example.demo.api.dto.AuthDtos.PasswordResetRequestResponse;
import com.example.demo.api.dto.AuthDtos.SimpleMessageResponse;
import com.example.demo.service.PasswordResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/password-reset")
public class PasswordResetApiController {

    private static final String REQUEST_ACK_MESSAGE =
            "Neu email thuoc ve mot tai khoan hop le, ban se nhan huong dan dat lai mat khau trong thoi gian ngan.";

    private final PasswordResetService passwordResetService;

    public PasswordResetApiController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/request")
    public ResponseEntity<PasswordResetRequestResponse> request(@RequestBody(required = false) PasswordResetRequest request) {
        String email = request == null ? "" : request.email();
        passwordResetService.requestReset(email);
        return ResponseEntity.ok(new PasswordResetRequestResponse(REQUEST_ACK_MESSAGE));
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@RequestBody(required = false) PasswordResetConfirmRequest request) {
        if (request == null || request.token() == null || request.token().isBlank()) {
            return ResponseEntity.badRequest().body(new ApiError("Reset link khong hop le hoac da het han."));
        }
        try {
            passwordResetService.confirmReset(request.token(), request.newPassword(), request.confirmPassword());
            return ResponseEntity.ok(new SimpleMessageResponse("Mat khau da duoc dat lai. Ban co the dang nhap bang mat khau moi."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        }
    }
}
