package com.example.demo.repository;

import com.example.demo.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Integer> {

    @Query("SELECT a FROM Account a WHERE a.loginName = :loginName")
    Optional<Account> findByLoginName(@Param("loginName") String loginName);

    Optional<Account> findByEmail(String email);

    Optional<Account> findByEmailIgnoreCase(String email);
}
