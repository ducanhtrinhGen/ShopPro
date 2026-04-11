package com.example.demo.service;

import com.example.demo.model.Account;
import com.example.demo.model.Role;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AccountService implements UserDetailsService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_OWNER = "ROLE_OWNER";
    private static final String ROLE_STAFF = "ROLE_STAFF";
    private static final String ROLE_CUSTOMER = "ROLE_CUSTOMER";
    private static final String ROLE_USER = "ROLE_USER";

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Account account = accountRepository.findByLoginName(username)
                .orElseThrow(() -> new UsernameNotFoundException("Could not find user"));

        Collection<GrantedAuthority> authorities = account.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority(role.getName()))
                .collect(Collectors.toSet());

        return new User(
                account.getLogin_name(),
                account.getPassword(),
                true,
                true,
                true,
                !account.isLocked() && !"INACTIVE".equalsIgnoreCase(account.getStatus()),
                authorities);
    }

    public List<Account> getAllAccounts() {
        return accountRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    public Account createUserAccount(String loginName, String rawPassword) {
        String normalizedLoginName = loginName == null ? "" : loginName.trim();
        String normalizedPassword = rawPassword == null ? "" : rawPassword.trim();

        if (normalizedLoginName.isEmpty()) {
            throw new IllegalArgumentException("Ten dang nhap khong duoc de trong.");
        }
        if (normalizedPassword.isEmpty()) {
            throw new IllegalArgumentException("Mat khau khong duoc de trong.");
        }

        if (accountRepository.findByLoginName(normalizedLoginName).isPresent()) {
            throw new IllegalStateException("Ten dang nhap da ton tai.");
        }

        Role userRole = roleRepository.findByName("ROLE_CUSTOMER")
                .or(() -> roleRepository.findByName("ROLE_USER"))
                .orElseThrow(() -> new IllegalStateException("Khong tim thay role mac dinh cho customer."));

        Account account = new Account();
        account.setLogin_name(normalizedLoginName);
        account.setFullName(normalizedLoginName);
        account.setPassword(passwordEncoder.encode(normalizedPassword));
        account.setLocked(false);
        account.setStatus("ACTIVE");
        account.setRoles(new HashSet<>(Set.of(userRole)));

        return accountRepository.save(account);
    }

    public Account updateUserRole(int accountId, String role, String actingUsername) {
        Account actingAccount = requireActingAccount(actingUsername);
        ensureOwnerPrivileges(actingAccount);

        Account account = getAccountById(accountId);
        String normalizedRole = normalizeRole(role);
        ensureCanManageTargetAccount(account, actingAccount);

        if (hasRole(account, ROLE_OWNER)) {
            throw new IllegalStateException("Khong the thay doi role cua OWNER.");
        }

        if (isSelfAccount(account, actingUsername) && "user".equals(normalizedRole)) {
            throw new IllegalStateException("Ban khong the tu ha quyen tai khoan admin cua minh.");
        }

        Role targetRole = resolveTargetRole(normalizedRole);
        account.setRoles(new HashSet<>(Set.of(targetRole)));
        return accountRepository.save(account);
    }

    public Account updateAccountLockState(int accountId, boolean locked, String actingUsername) {
        Account actingAccount = requireActingAccount(actingUsername);
        ensureOwnerPrivileges(actingAccount);

        Account account = getAccountById(accountId);
        ensureCanManageTargetAccount(account, actingAccount);

        if (hasRole(account, ROLE_OWNER) && locked) {
            throw new IllegalStateException("Khong the khoa tai khoan OWNER.");
        }

        if (isSelfAccount(account, actingUsername) && locked) {
            throw new IllegalStateException("Ban khong the tu khoa tai khoan cua minh.");
        }

        account.setLocked(locked);
        return accountRepository.save(account);
    }

    public Account createManagementAccount(String loginName, String rawPassword, String role, String actingUsername) {
        Account actingAccount = requireActingAccount(actingUsername);
        ensureOwnerPrivileges(actingAccount);

        String normalizedLoginName = loginName == null ? "" : loginName.trim();
        String normalizedPassword = rawPassword == null ? "" : rawPassword.trim();

        if (normalizedLoginName.isEmpty()) {
            throw new IllegalArgumentException("Ten dang nhap khong duoc de trong.");
        }
        if (normalizedPassword.isEmpty()) {
            throw new IllegalArgumentException("Mat khau khong duoc de trong.");
        }
        if (accountRepository.findByLoginName(normalizedLoginName).isPresent()) {
            throw new IllegalStateException("Ten dang nhap da ton tai.");
        }

        String normalizedRole = normalizeOwnerCreatableRole(role);
        Role targetRole = resolveTargetRole(normalizedRole);

        Account account = new Account();
        account.setLogin_name(normalizedLoginName);
        account.setFullName(normalizedLoginName);
        account.setPassword(passwordEncoder.encode(normalizedPassword));
        account.setLocked(false);
        account.setStatus("ACTIVE");
        account.setRoles(new HashSet<>(Set.of(targetRole)));

        return accountRepository.save(account);
    }

    public void deleteManagementAccount(int accountId, String actingUsername) {
        Account actingAccount = requireActingAccount(actingUsername);
        ensureOwnerPrivileges(actingAccount);

        Account account = getAccountById(accountId);
        ensureCanManageTargetAccount(account, actingAccount);

        if (isSelfAccount(account, actingUsername)) {
            throw new IllegalStateException("Ban khong the xoa tai khoan dang dang nhap.");
        }
        if (hasRole(account, ROLE_OWNER)) {
            throw new IllegalArgumentException("Khong the xoa tai khoan OWNER.");
        }

        accountRepository.delete(account);
    }

    private Account getAccountById(int accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new NoSuchElementException("Khong tim thay tai khoan voi id: " + accountId));
    }

    private Role resolveTargetRole(String normalizedRole) {
        String roleName;
        if ("admin".equals(normalizedRole)) {
            roleName = ROLE_ADMIN;
        } else if ("staff".equals(normalizedRole)) {
            roleName = ROLE_STAFF;
        } else {
            roleName = ROLE_USER;
        }

        Optional<Role> role = roleRepository.findByName(roleName);

        if (role.isPresent()) {
            return role.get();
        }

        if (ROLE_USER.equals(roleName)) {
            return roleRepository.findByName(ROLE_CUSTOMER)
                    .orElseThrow(() -> new IllegalStateException("Khong tim thay role ROLE_USER hoac ROLE_CUSTOMER."));
        }

        throw new IllegalStateException("Khong tim thay role " + roleName + ".");
    }

    private String normalizeRole(String role) {
        if (role == null || role.trim().isEmpty()) {
            throw new IllegalArgumentException("Role khong duoc de trong.");
        }

        String normalized = role.trim().toLowerCase(Locale.ROOT);
        if (!normalized.equals("admin") && !normalized.equals("staff") && !normalized.equals("user")) {
            throw new IllegalArgumentException("Role khong hop le. Chi chap nhan admin, staff hoac user.");
        }
        return normalized;
    }

    private String normalizeOwnerCreatableRole(String role) {
        return normalizeRole(role);
    }

    private boolean isSelfAccount(Account targetAccount, String actingUsername) {
        if (actingUsername == null || actingUsername.trim().isEmpty()) {
            return false;
        }
        return targetAccount.getLogin_name().equalsIgnoreCase(actingUsername.trim());
    }

    private void ensureCanManageTargetAccount(Account targetAccount, Account actingAccount) {
        if (!hasRole(targetAccount, ROLE_OWNER)) {
            return;
        }

        if (actingAccount == null || !hasRole(actingAccount, ROLE_OWNER)) {
            throw new AccessDeniedException("Chi OWNER moi duoc thay doi tai khoan OWNER.");
        }
    }

    private Account requireActingAccount(String actingUsername) {
        if (actingUsername == null || actingUsername.trim().isEmpty()) {
            throw new AccessDeniedException("Khong xac dinh duoc tai khoan dang thao tac.");
        }

        return accountRepository.findByLoginName(actingUsername.trim())
                .orElseThrow(() -> new AccessDeniedException("Khong tim thay tai khoan thao tac."));
    }

    private void ensureOwnerPrivileges(Account actingAccount) {
        if (!hasRole(actingAccount, ROLE_OWNER)) {
            throw new AccessDeniedException("Chi OWNER moi duoc phep thuc hien thao tac nay.");
        }
    }

    private boolean hasRole(Account account, String roleName) {
        return account.getRoles().stream()
                .map(Role::getName)
                .anyMatch(roleName::equals);
    }

}
