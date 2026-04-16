package com.example.demo;

import com.example.demo.config.TestDataSeedConfig;
import com.example.demo.model.Product;
import com.example.demo.repository.AccountRepository;
import com.example.demo.repository.ProductRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
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
@Import(TestDataSeedConfig.class)
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
        product.setQuantity(10);
        product = productRepository.save(product);

        String buyer = "buyer_" + System.currentTimeMillis();
        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "buyer123"
                                }
                                """.formatted(buyer)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value(buyer))
                .andReturn();

        MockHttpSession session = (MockHttpSession) registerResult.getRequest().getSession(false);

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(buyer));

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
    void checkoutShouldRejectWhenStockIsInsufficient() throws Exception {
        Product product = new Product();
        product.setName("Low Stock Product");
        product.setPrice(2000L);
        product.setQuantity(1);
        product = productRepository.save(product);

        String buyer = "buyer_stock_" + System.currentTimeMillis();
        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "buyer123"
                                }
                                """.formatted(buyer)))
                .andExpect(status().isCreated())
                .andReturn();

        MockHttpSession session = (MockHttpSession) registerResult.getRequest().getSession(false);

        mockMvc.perform(post("/api/cart/items").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": %d,
                                  "quantity": 2
                                }
                                """.formatted(product.getId())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/cart/checkout").session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Tồn kho")));
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

    @Test
    void staffShouldUseStaffApiAndNotAdminOperationalOrCatalog() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "staff1",
                                  "password": "staff123"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);

        mockMvc.perform(get("/api/staff/orders").session(session))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/staff/inventory/low-stock").session(session))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/orders").session(session))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/products").session(session))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffShouldNotAccessCustomerCart() throws Exception {
        Product product = new Product();
        product.setName("Staff Cart Product");
        product.setPrice(500L);
        product.setQuantity(10);
        product = productRepository.save(product);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "staff1",
                                  "password": "staff123"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);

        mockMvc.perform(post("/api/cart/items").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": %d,
                                  "quantity": 1
                                }
                                """.formatted(product.getId())))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerShouldListAndReadOwnOrdersOnly() throws Exception {
        Product product = new Product();
        product.setName("Customer Order Product");
        product.setPrice(900L);
        product.setQuantity(10);
        product = productRepository.save(product);

        String buyerA = "buyerA_" + System.currentTimeMillis();
        MvcResult registerA = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "buyer123"
                                }
                                """.formatted(buyerA)))
                .andExpect(status().isCreated())
                .andReturn();

        MockHttpSession sessionA = (MockHttpSession) registerA.getRequest().getSession(false);
        MvcResult checkoutA = mockMvc.perform(post("/api/cart/items").session(sessionA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": %d,
                                  "quantity": 1
                                }
                                """.formatted(product.getId())))
                .andExpect(status().isOk())
                .andReturn();

        MvcResult orderA = mockMvc.perform(post("/api/cart/checkout").session(sessionA))
                .andExpect(status().isOk())
                .andReturn();
        int orderAId = JsonPath.read(orderA.getResponse().getContentAsString(), "$.orderId");

        String buyerB = "buyerB_" + System.currentTimeMillis();
        MvcResult registerB = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "buyer123"
                                }
                                """.formatted(buyerB)))
                .andExpect(status().isCreated())
                .andReturn();
        MockHttpSession sessionB = (MockHttpSession) registerB.getRequest().getSession(false);

        mockMvc.perform(get("/api/orders").session(sessionA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id==%d)]".formatted(orderAId)).exists());

        mockMvc.perform(get("/api/orders/{id}", orderAId).session(sessionA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orderAId))
                .andExpect(jsonPath("$.status").exists());

        mockMvc.perform(get("/api/orders/{id}", orderAId).session(sessionB))
                .andExpect(status().isForbidden());
    }
}
