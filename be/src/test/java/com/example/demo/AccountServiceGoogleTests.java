package com.example.demo;

import com.example.demo.config.TestDataSeedConfig;
import com.example.demo.model.Account;
import com.example.demo.repository.AccountRepository;
import com.example.demo.service.AccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Import(TestDataSeedConfig.class)
class AccountServiceGoogleTests {

    @Autowired
    private AccountService accountService;

    @Autowired
    private AccountRepository accountRepository;

    @Test
    void saveOrUpdateOAuth2AccountShouldCreateNewCustomerAccount() {
        String unique = String.valueOf(System.currentTimeMillis());
        String email = "google-" + unique + "@example.test";
        String providerId = "google-sub-" + unique;

        Account account = accountService.saveOrUpdateOAuth2Account(
                email,
                "Google User " + unique,
                "https://cdn.example.test/avatar-" + unique + ".png",
                "GOOGLE",
                providerId);

        assertNotNull(account.getId());
        assertEquals(email, account.getEmail());
        assertEquals("GOOGLE", account.getProvider());
        assertEquals(providerId, account.getProviderId());
        assertEquals(providerId, account.getGoogleSubject());
        assertTrue(account.getRoles().stream()
                .anyMatch(role -> "ROLE_CUSTOMER".equals(role.getName()) || "ROLE_USER".equals(role.getName())));
    }

    @Test
    void saveOrUpdateOAuth2AccountShouldUpdateExistingLocalAccountByEmail() {
        String unique = String.valueOf(System.nanoTime());
        String email = "linked-" + unique + "@example.test";
        Account localAccount = accountService.createUserAccount("buyer_google_" + unique, "Buyer123");
        localAccount.setEmail(email);
        localAccount.setFullName("Before Link");
        localAccount = accountRepository.save(localAccount);

        Account linkedAccount = accountService.saveOrUpdateOAuth2Account(
                email,
                "Google Linked " + unique,
                "https://cdn.example.test/avatar-linked.png",
                "GOOGLE",
                "google-linked-" + unique);

        assertEquals(localAccount.getId(), linkedAccount.getId());
        assertEquals("GOOGLE", linkedAccount.getProvider());
        assertEquals("google-linked-" + unique, linkedAccount.getProviderId());
        assertEquals("google-linked-" + unique, linkedAccount.getGoogleSubject());
        assertEquals("Google Linked " + unique, linkedAccount.getFullName());
        assertEquals(localAccount.getLoginName(), linkedAccount.getLoginName());
    }

    @Test
    void saveOrUpdateOAuth2AccountShouldRejectBlankEmail() {
        assertThrows(IllegalArgumentException.class, () -> accountService.saveOrUpdateOAuth2Account(
                " ",
                "No Email",
                null,
                "GOOGLE",
                "sub-no-email"));
    }
}
