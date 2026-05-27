package com.ecom.productservice.repository;

import com.ecom.productservice.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByNameContainingIgnoreCase(String name);

    List<Product> findByStockQuantityGreaterThan(Integer quantity);

    List<Product> findBySellerId(Long sellerId);

    List<Product> findBySellerIdAndStockQuantityLessThan(Long sellerId, Integer threshold);
}
