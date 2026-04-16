package com.example.demo.repository;

import com.example.demo.model.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Integer>, JpaSpecificationExecutor<Product> {

    Page<Product> findByNameContainingIgnoreCase(String keyword, Pageable pageable);

    Optional<Product> findBySlug(String slug);

    Optional<Product> findByName(String name);

    Page<Product> findByStatusIgnoreCaseAndCategory_IdAndIdNot(String status, int categoryId, int excludedId, Pageable pageable);

    Page<Product> findByStatusIgnoreCaseAndBrand_IdAndIdNot(String status, int brandId, int excludedId, Pageable pageable);

    Page<Product> findByStatusIgnoreCaseAndIdNot(String status, int excludedId, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") int id);
}
