package com.example.demo.api;

import com.example.demo.api.dto.ApiError;
import com.example.demo.api.dto.StorefrontSupportDtos.ContactMessageCreateRequest;
import com.example.demo.api.dto.StorefrontSupportDtos.ContactMessageCreateResponse;
import com.example.demo.model.ContactMessage;
import com.example.demo.repository.ContactMessageRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contact")
public class ContactApiController {

    private final ContactMessageRepository contactMessageRepository;

    public ContactApiController(ContactMessageRepository contactMessageRepository) {
        this.contactMessageRepository = contactMessageRepository;
    }

    @PostMapping("/messages")
    @Transactional
    public ResponseEntity<?> create(@RequestBody(required = false) ContactMessageCreateRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(new ApiError("Du lieu lien he khong hop le."));
        }
        if (isBlank(request.fullName()) || isBlank(request.email()) || isBlank(request.subject()) || isBlank(request.message())) {
            return ResponseEntity.badRequest().body(new ApiError("Vui long dien day du ho ten, email, chu de va noi dung."));
        }

        ContactMessage message = new ContactMessage();
        message.setFullName(request.fullName().trim());
        message.setEmail(request.email().trim());
        message.setSubject(request.subject().trim());
        message.setMessage(request.message().trim());
        contactMessageRepository.save(message);
        return ResponseEntity.ok(new ContactMessageCreateResponse(true));
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}

