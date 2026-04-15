package com.example.demo.api;

import com.example.demo.api.dto.AdminUserDtos.AdminUserItem;
import com.example.demo.api.dto.AdminUserDtos.CreateUserRequest;
import com.example.demo.api.dto.AdminUserDtos.UpdateLockRequest;
import com.example.demo.api.dto.AdminUserDtos.UpdateRoleRequest;
import com.example.demo.api.dto.ApiError;
import com.example.demo.model.Account;
import com.example.demo.service.AccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserApiController {

    private final AccountService accountService;

    public AdminUserApiController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public List<AdminUserItem> listUsers() {
        return accountService.getAllAccounts().stream()
                .map(this::toAdminUserItem)
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestBody(required = false) CreateUserRequest request,
            Authentication authentication) {
        if (request == null || isBlank(request.username()) || isBlank(request.password()) || isBlank(request.role())) {
            return ResponseEntity.badRequest().body(new ApiError("Username, password va role khong duoc de trong."));
        }

        try {
            String actingUsername = authentication != null ? authentication.getName() : null;
            Account created = accountService.createManagementAccount(
                    request.username(),
                    request.password(),
                    request.role(),
                    actingUsername);
            return ResponseEntity.status(HttpStatus.CREATED).body(toAdminUserItem(created));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiError(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(ex.getMessage()));
        }
    }

    @PutMapping("/{accountId}/role")
    public ResponseEntity<?> updateRole(
            @PathVariable int accountId,
            @RequestBody(required = false) UpdateRoleRequest request,
            Authentication authentication) {
        if (request == null || isBlank(request.role())) {
            return ResponseEntity.badRequest().body(new ApiError("Role khong duoc de trong."));
        }

        try {
            String actingUsername = authentication != null ? authentication.getName() : null;
            Account updatedAccount = accountService.updateUserRole(accountId, request.role(), actingUsername);
            return ResponseEntity.ok(toAdminUserItem(updatedAccount));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiError(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(ex.getMessage()));
        }
    }

    @PatchMapping("/{accountId}/lock")
    public ResponseEntity<?> updateLockState(
            @PathVariable int accountId,
            @RequestBody(required = false) UpdateLockRequest request,
            Authentication authentication) {
        if (request == null || request.locked() == null) {
            return ResponseEntity.badRequest().body(new ApiError("Trang thai khoa tai khoan khong hop le."));
        }

        try {
            String actingUsername = authentication != null ? authentication.getName() : null;
            Account updatedAccount = accountService.updateAccountLockState(accountId, request.locked(), actingUsername);
            return ResponseEntity.ok(toAdminUserItem(updatedAccount));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiError(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(ex.getMessage()));
        }
    }

    @DeleteMapping("/{accountId}")
    public ResponseEntity<?> deleteUser(@PathVariable int accountId, Authentication authentication) {
        try {
            String actingUsername = authentication != null ? authentication.getName() : null;
            accountService.deleteManagementAccount(accountId, actingUsername);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ApiError(ex.getMessage()));
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiError(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(ex.getMessage()));
        }
    }

    private AdminUserItem toAdminUserItem(Account account) {
        List<String> roles = account.getRoles().stream()
                .map(role -> role.getName())
                .sorted()
                .toList();

        String role = roles.contains("ROLE_OWNER")
                ? "owner"
                : (roles.contains("ROLE_ADMIN")
                        ? "admin"
                        : (roles.contains("ROLE_STAFF") ? "staff" : "user"));

        return new AdminUserItem(
                account.getId(),
                account.getLoginName(),
                role,
                account.isLocked(),
                roles);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
