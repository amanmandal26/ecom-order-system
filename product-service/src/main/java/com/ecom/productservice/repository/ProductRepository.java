package com.ecom.productservice.repository;

import com.ecom.productservice.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>,
        JpaSpecificationExecutor<Product> {

    List<Product> findByNameContainingIgnoreCase(String name);

    List<Product> findByStockQuantityGreaterThan(Integer quantity);

    List<Product> findBySellerId(Long sellerId);

    Page<Product> findBySellerId(Long sellerId, Pageable pageable);

    List<Product> findBySellerIdAndStockQuantityLessThan(Long sellerId, Integer threshold);
}
