package com.ecom.monolith.controller;

import com.ecom.monolith.dto.ApiResponse;
import com.ecom.monolith.dto.ProductRequest;
import com.ecom.monolith.dto.ProductResponse;
import com.ecom.monolith.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ProductController — REST API for the product catalog.
 *
 * Access rules:
 *  GET  /api/products        — any authenticated user (customers browse products)
 *  GET  /api/products/{id}   — any authenticated user
 *  POST /api/products        — ADMIN only (create a product)
 *  PUT  /api/products/{id}   — ADMIN only (update a product)
 *  DELETE /api/products/{id} — ADMIN only (remove a product)
 *
 * @PreAuthorize checks the role from the JWT token before the method runs.
 * If the role is wrong, Spring Security returns 403 Forbidden automatically —
 * no manual check needed in the service or controller body.
 *
 * Errors (404, 400, 403) are handled centrally by GlobalExceptionHandler.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {

    private final ProductService productService;

    // ─── Public (authenticated) endpoints ────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAllProducts() {
        List<ProductResponse> products = productService.getAllProducts();
        return ResponseEntity.ok(ApiResponse.ok("Products fetched successfully", products));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        ProductResponse product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.ok("Product fetched successfully", product));
    }

    // ─── ADMIN-only endpoints ────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Valid @RequestBody ProductRequest request) {
        log.info("Admin creating product: {}", request.getName());
        ProductResponse product = productService.createProduct(request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Product created successfully", product));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request) {
        log.info("Admin updating product id: {}", id);
        ProductResponse product = productService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Product updated successfully", product));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        log.info("Admin deleting product id: {}", id);
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.ok("Product deleted successfully", null));
    }
}
