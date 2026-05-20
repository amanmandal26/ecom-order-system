package com.ecom.monolith.repository;

import com.ecom.monolith.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Spring Data generates: WHERE LOWER(name) LIKE LOWER('%keyword%')
    // Used for the product search feature on the frontend.
    List<Product> findByNameContainingIgnoreCase(String name);

    // Spring Data generates: WHERE stock_quantity > quantity
    // Used to show only in-stock products: findByStockQuantityGreaterThan(0)
    List<Product> findByStockQuantityGreaterThan(Integer quantity);
}
