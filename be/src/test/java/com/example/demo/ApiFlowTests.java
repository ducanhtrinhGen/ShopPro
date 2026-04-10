package com.example.demo;

import com.example.demo.model.Product;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.ProductRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Test
    void loginAndCartCheckoutFlowShouldWorkThroughApi() throws Exception {
        Product product = new Product();
        product.setName("API Smoke Product");
        product.setPrice(1000L);
        product = productRepository.save(product);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "admin123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"))
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"));

        mockMvc.perform(post("/api/cart/items").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": %d,
                                  "quantity": 2
                                }
                                """.formatted(product.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalQuantity").value(2));

        mockMvc.perform(post("/api/cart/checkout").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").isNumber());
    }

    @Test
    void ownerShouldBeAbleToManageAdminStaffAccounts() throws Exception {
        int userId = accountRepository.findByLoginName("user1")
                .orElseThrow()
                .getId();

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "owner",
                                  "password": "owner123"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);

        mockMvc.perform(get("/api/admin/users").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id==%d)]".formatted(userId)).exists());

        MvcResult createdUser = mockMvc.perform(post("/api/admin/users").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "staff_new",
                                  "password": "staff123",
                                  "role": "staff"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("staff"))
                .andReturn();
        int createdUserId = JsonPath.read(createdUser.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(put("/api/admin/users/{id}/role", userId).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "staff"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId))
                .andExpect(jsonPath("$.role").value("staff"))
                .andExpect(jsonPath("$.roles").isArray());

        mockMvc.perform(put("/api/admin/users/{id}/role", createdUserId).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "admin"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdUserId))
                .andExpect(jsonPath("$.role").value("admin"));

        mockMvc.perform(patch("/api/admin/users/{id}/lock", createdUserId).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "locked": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdUserId))
                .andExpect(jsonPath("$.locked").value(true));

        mockMvc.perform(patch("/api/admin/users/{id}/lock", createdUserId).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "locked": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdUserId))
                .andExpect(jsonPath("$.locked").value(false));

        mockMvc.perform(put("/api/admin/users/{id}/role", userId).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "user"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId))
                .andExpect(jsonPath("$.role").value("user"));

        mockMvc.perform(post("/api/admin/users").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin_new",
                                  "password": "admin123",
                                  "role": "admin"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("admin"));

        mockMvc.perform(delete("/api/admin/users/{id}", createdUserId)
                        .session(session))
                .andExpect(status().isNoContent());
    }

    @Test
    void adminShouldNotBeAbleToChangeUserRoleOrLockState() throws Exception {
        int userId = accountRepository.findByLoginName("user1")
                .orElseThrow()
                .getId();

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "admin123"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);

        mockMvc.perform(put("/api/admin/users/{id}/role", userId).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "admin"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/admin/users/{id}/lock", userId).session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "locked": true
                                }
                                """))
                .andExpect(status().isForbidden());
    }
}
