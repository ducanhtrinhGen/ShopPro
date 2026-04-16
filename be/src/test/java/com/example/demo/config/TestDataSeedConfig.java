package com.example.demo.config;

import com.example.demo.model.Account;
import com.example.demo.model.Role;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.RoleRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Set;

/**
 * Seeds roles and demo accounts for integration tests (H2, empty schema).
 */
@TestConfiguration
public class TestDataSeedConfig {

    @Bean
    ApplicationRunner seedTestSecurityData(
            RoleRepository roleRepository,
            AccountRepository accountRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            if (accountRepository.count() > 0) {
                return;
            }

            Role ownerRole = roleRepository.save(roleNamed("ROLE_OWNER"));
            Role adminRole = roleRepository.save(roleNamed("ROLE_ADMIN"));
            Role staffRole = roleRepository.save(roleNamed("ROLE_STAFF"));
            Role customerRole = roleRepository.save(roleNamed("ROLE_CUSTOMER"));

            accountRepository.save(buildAccount("owner", "owner123", passwordEncoder, Set.of(ownerRole)));
            accountRepository.save(buildAccount("admin", "admin123", passwordEncoder, Set.of(adminRole)));
            accountRepository.save(buildAccount("staff1", "staff123", passwordEncoder, Set.of(staffRole)));
            accountRepository.save(buildAccount("user1", "user1234", passwordEncoder, Set.of(customerRole)));
        };
    }

    private static Account buildAccount(
            String login,
            String rawPassword,
            PasswordEncoder passwordEncoder,
            Set<Role> roles) {
        Account account = new Account();
        account.setLoginName(login);
        account.setFullName(login);
        account.setPassword(passwordEncoder.encode(rawPassword));
        account.setLocked(false);
        account.setStatus("ACTIVE");
        account.setRoles(new HashSet<>(roles));
        return account;
    }

    private static Role roleNamed(String name) {
        Role role = new Role();
        role.setName(name);
        return role;
    }
}
