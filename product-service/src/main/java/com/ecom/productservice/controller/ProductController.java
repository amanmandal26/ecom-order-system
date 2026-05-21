package com.ecom.productservice.controller;

import com.ecom.productservice.dto.ApiResponse;
import com.ecom.productservice.dto.ProductRequest;
import com.ecom.productservice.dto.ProductResponse;
import com.ecom.productservice.dto.StockRequest;
import com.ecom.productservice.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {

    private final ProductService productService;

    // ─── Public (authenticated) endpoints ─────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAllProducts() {
        return ResponseEntity.ok(ApiResponse.ok("Products fetched successfully", productService.getAllProducts()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Product fetched successfully", productService.getProductById(id)));
    }

    // ─── ADMIN-only endpoints ──────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(@Valid @RequestBody ProductRequest request) {
        log.info("Admin creating product: {}", request.getName());
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Product created successfully", productService.createProduct(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        log.info("Admin updating product id: {}", id);
        return ResponseEntity.ok(ApiResponse.ok("Product updated successfully", productService.updateProduct(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        log.info("Admin deleting product id: {}", id);
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.ok("Product deleted successfully", null));
    }

    // ─── Internal endpoints (called by order-service, no user JWT) ────────────

    @PutMapping("/{id}/reduce-stock")
    public ResponseEntity<ApiResponse<Void>> reduceStock(
            @PathVariable Long id, @Valid @RequestBody StockRequest request) {
        log.info("Reducing stock for product {}: -{}", id, request.getQuantity());
        productService.reduceStock(id, request.getQuantity());
        return ResponseEntity.ok(ApiResponse.ok("Stock reduced successfully", null));
    }

    @PutMapping("/{id}/restore-stock")
    public ResponseEntity<ApiResponse<Void>> restoreStock(
            @PathVariable Long id, @Valid @RequestBody StockRequest request) {
        log.info("Restoring stock for product {}: +{}", id, request.getQuantity());
        productService.restoreStock(id, request.getQuantity());
        return ResponseEntity.ok(ApiResponse.ok("Stock restored successfully", null));
    }
}
