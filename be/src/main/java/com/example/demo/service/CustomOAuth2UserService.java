package com.example.demo.service;

import com.example.demo.model.Account;
import com.example.demo.model.Role;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private static final String GOOGLE_PROVIDER = "GOOGLE";

    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
    private final AccountService accountService;

    public CustomOAuth2UserService(AccountService accountService) {
        this.accountService = accountService;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = delegate.loadUser(userRequest);
        Map<String, Object> attributes = oauth2User.getAttributes();

        String provider = userRequest.getClientRegistration().getRegistrationId().toUpperCase();
        String email = getAttribute(attributes, "email");
        String fullName = getAttribute(attributes, "name");
        String picture = getAttribute(attributes, "picture");
        String providerId = getAttribute(attributes, "sub");

        Account account;
        try {
            account = accountService.saveOrUpdateOAuth2Account(
                    email,
                    fullName,
                    picture,
                    provider,
                    providerId);
        } catch (IllegalArgumentException ex) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_oauth2_profile", ex.getMessage(), null),
                    ex.getMessage(),
                    ex);
        }

        Set<GrantedAuthority> authorities = account.getRoles().stream()
                .map(Role::getName)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toSet());

        Map<String, Object> mergedAttributes = new LinkedHashMap<>(attributes);
        mergedAttributes.put("provider", provider.isBlank() ? GOOGLE_PROVIDER : provider);
        mergedAttributes.put("providerId", providerId);
        mergedAttributes.put("loginName", account.getLoginName());
        mergedAttributes.put("accountId", account.getId());
        mergedAttributes.put("accountEmail", account.getEmail());

        return new DefaultOAuth2User(authorities, mergedAttributes, "loginName");
    }

    private String getAttribute(Map<String, Object> attributes, String key) {
        Object value = attributes.get(key);
        if (value instanceof String str && !str.isBlank()) {
            return str.trim();
        }
        return "";
    }
}
