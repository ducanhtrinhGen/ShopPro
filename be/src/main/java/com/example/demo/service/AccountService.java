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

import java.text.Normalizer;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AccountService implements UserDetailsService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_OWNER = "ROLE_OWNER";
    private static final String ROLE_STAFF = "ROLE_STAFF";
    private static final String ROLE_CUSTOMER = "ROLE_CUSTOMER";
    private static final String ROLE_USER = "ROLE_USER";
    private static final String PROVIDER_GOOGLE = "GOOGLE";

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
                account.getLoginName(),
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

    @org.springframework.transaction.annotation.Transactional
    public void changePassword(String loginName, String currentRaw, String newRaw, String confirmRaw) {
        PasswordPolicy.requireMatch(newRaw, confirmRaw);
        PasswordPolicy.validate(newRaw);

        String normalizedLogin = loginName == null ? "" : loginName.trim();
        if (normalizedLogin.isEmpty()) {
            throw new IllegalArgumentException("Tai khoan khong hop le.");
        }

        Account account = accountRepository.findByLoginName(normalizedLogin)
                .orElseThrow(() -> new IllegalArgumentException("Tai khoan khong ton tai."));

        String current = currentRaw == null ? "" : currentRaw;
        if (!passwordEncoder.matches(current, account.getPassword())) {
            throw new IllegalArgumentException("Mat khau hien tai khong dung.");
        }

        if (passwordEncoder.matches(newRaw, account.getPassword())) {
            throw new IllegalArgumentException("Mat khau moi phai khac mat khau hien tai.");
        }

        account.setPassword(passwordEncoder.encode(newRaw));
        accountRepository.save(account);
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

        PasswordPolicy.validate(normalizedPassword);

        if (accountRepository.findByLoginName(normalizedLoginName).isPresent()) {
            throw new IllegalStateException("Ten dang nhap da ton tai.");
        }

        Role userRole = roleRepository.findByName("ROLE_CUSTOMER")
                .or(() -> roleRepository.findByName("ROLE_USER"))
                .orElseThrow(() -> new IllegalStateException("Khong tim thay role mac dinh cho customer."));

        Account account = new Account();
        account.setLoginName(normalizedLoginName);
        account.setFullName(normalizedLoginName);
        account.setPassword(passwordEncoder.encode(normalizedPassword));
        account.setLocked(false);
        account.setStatus("ACTIVE");
        account.setRoles(new HashSet<>(Set.of(userRole)));

        return accountRepository.save(account);
    }

    @org.springframework.transaction.annotation.Transactional
    public Account saveOrUpdateOAuth2Account(
            String email,
            String fullName,
            String avatarUrl,
            String provider,
            String providerId) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isEmpty()) {
            throw new IllegalArgumentException("OAuth2 account does not provide a usable email.");
        }

        String normalizedProvider = normalizeProvider(provider);
        String normalizedProviderId = normalizeProviderId(providerId);
        String normalizedFullName = normalizeFullName(fullName);
        String normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl);

        Account account = accountRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        if (account == null) {
            Role userRole = resolveDefaultCustomerRole();
            account = new Account();
            account.setLoginName(generateGoogleLoginName(normalizedEmail, normalizedFullName));
            account.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            account.setLocked(false);
            account.setStatus("ACTIVE");
            account.setRoles(new HashSet<>(Set.of(userRole)));
        }

        applyOAuth2Profile(
                account,
                normalizedEmail,
                normalizedFullName != null ? normalizedFullName : normalizedEmail,
                normalizedAvatarUrl,
                normalizedProvider,
                normalizedProviderId);
        return accountRepository.save(account);
    }

    @org.springframework.transaction.annotation.Transactional
    public Account createOrLinkGoogleCustomerAccount(String googleSubject, String email, String fullName) {
        String normalizedSubject = normalizeGoogleSubject(googleSubject);
        Account account = saveOrUpdateOAuth2Account(email, fullName, null, PROVIDER_GOOGLE, normalizedSubject);
        account.setGoogleSubject(normalizedSubject);
        if (account.getProvider() == null || account.getProvider().isBlank()) {
            account.setProvider(PROVIDER_GOOGLE);
        }
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

        PasswordPolicy.validate(normalizedPassword);

        if (accountRepository.findByLoginName(normalizedLoginName).isPresent()) {
            throw new IllegalStateException("Ten dang nhap da ton tai.");
        }

        String normalizedRole = normalizeOwnerCreatableRole(role);
        Role targetRole = resolveTargetRole(normalizedRole);

        Account account = new Account();
        account.setLoginName(normalizedLoginName);
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
        return targetAccount.getLoginName().equalsIgnoreCase(actingUsername.trim());
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

    private void applyOAuth2Profile(
            Account account,
            String email,
            String fullName,
            String avatarUrl,
            String provider,
            String providerId) {
        account.setEmail(email);
        account.setProvider(provider);
        account.setProviderId(providerId);
        account.setAvatar(avatarUrl);
        if (PROVIDER_GOOGLE.equals(provider)) {
            account.setGoogleSubject(providerId);
        }
        if (fullName != null && !fullName.isBlank()) {
            account.setFullName(fullName);
        } else if (account.getFullName() == null || account.getFullName().isBlank()) {
            account.setFullName(account.getLoginName());
        }
    }

    private Role resolveDefaultCustomerRole() {
        return roleRepository.findByName(ROLE_CUSTOMER)
                .or(() -> roleRepository.findByName(ROLE_USER))
                .orElseThrow(() -> new IllegalStateException("Khong tim thay role mac dinh cho customer."));
    }

    private String generateGoogleLoginName(String normalizedEmail, String normalizedFullName) {
        if (normalizedEmail.length() <= 100 && !accountRepository.existsByLoginNameIgnoreCase(normalizedEmail)) {
            return normalizedEmail;
        }

        String base = normalizedFullName != null ? normalizedFullName : normalizedEmail;
        String sanitized = sanitizeLoginBase(base);
        if (sanitized.isBlank()) {
            sanitized = "googleuser";
        }

        String candidate = trimToMaxLength(sanitized, 100);
        if (!accountRepository.existsByLoginNameIgnoreCase(candidate)) {
            return candidate;
        }

        for (int suffix = 2; suffix < 10_000; suffix++) {
            String suffixValue = "-" + suffix;
            String prefix = trimToMaxLength(sanitized, 100 - suffixValue.length());
            candidate = prefix + suffixValue;
            if (!accountRepository.existsByLoginNameIgnoreCase(candidate)) {
                return candidate;
            }
        }

        throw new IllegalStateException("Khong the tao username duy nhat cho tai khoan Google.");
    }

    private String sanitizeLoginBase(String rawValue) {
        String normalized = rawValue == null ? "" : Normalizer.normalize(rawValue, Normalizer.Form.NFD);
        String withoutMarks = normalized.replaceAll("\\p{M}+", "");
        String compact = withoutMarks
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]+", "-")
                .replaceAll("^[._-]+|[._-]+$", "")
                .replaceAll("-{2,}", "-");
        return compact;
    }

    private String trimToMaxLength(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private String normalizeGoogleSubject(String googleSubject) {
        return normalizeProviderId(googleSubject);
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeFullName(String fullName) {
        String normalized = trimToNull(fullName);
        return normalized == null ? null : normalized.strip();
    }

    private String normalizeAvatarUrl(String avatarUrl) {
        return trimToNull(avatarUrl);
    }

    private String normalizeProvider(String provider) {
        String normalized = provider == null ? "" : provider.trim().toUpperCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("OAuth2 provider is missing.");
        }
        return normalized;
    }

    private String normalizeProviderId(String providerId) {
        String normalized = providerId == null ? "" : providerId.trim();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("OAuth2 provider id is missing.");
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

}
