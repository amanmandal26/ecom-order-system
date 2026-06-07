package com.ecom.productservice.controller;

import com.ecom.productservice.dto.ApiResponse;
import com.ecom.productservice.dto.PagedResponse;
import com.ecom.productservice.dto.ProductRequest;
import com.ecom.productservice.dto.ProductResponse;
import com.ecom.productservice.dto.ProductSearchRequest;
import com.ecom.productservice.dto.StockRequest;
import com.ecom.productservice.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Products", description = "Product catalog — GET endpoints are public, write operations require SELLER or ADMIN JWT")
public class ProductController {

    private final ProductService productService;

    // ─── Public (authenticated) endpoints ─────────────────────────────────────

    @Operation(summary = "Search and filter products",
               description = "All params optional. Supports keyword search, price range, in-stock filter, seller name, pagination, and sorting.")
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<ProductResponse>>> searchProducts(
            @RequestParam(required = false)            String search,
            @RequestParam(required = false)            BigDecimal minPrice,
            @RequestParam(required = false)            BigDecimal maxPrice,
            @RequestParam(defaultValue = "false")      boolean inStockOnly,
            @RequestParam(required = false)            String sellerName,
            @RequestParam(defaultValue = "0")          int page,
            @RequestParam(defaultValue = "10")         int size,
            @RequestParam(defaultValue = "createdAt")  String sortBy,
            @RequestParam(defaultValue = "desc")       String sortDir) {

        ProductSearchRequest request = new ProductSearchRequest();
        request.setSearch(search);
        request.setMinPrice(minPrice);
        request.setMaxPrice(maxPrice);
        request.setInStockOnly(inStockOnly);
        request.setSellerName(sellerName);
        request.setPage(page);
        request.setSize(size);
        request.setSortBy(sortBy);
        request.setSortDir(sortDir);

        return ResponseEntity.ok(ApiResponse.ok("Products fetched successfully",
            productService.searchProducts(request)));
    }

    @Operation(summary = "Get product by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Product fetched successfully", productService.getProductById(id)));
    }

    // ─── Seller-only endpoints ─────────────────────────────────────────────────

    @Operation(summary = "Get my products — SELLER only",
               description = "Returns the seller's own products, paginated. Default: page=0, size=10.")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/my-products")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<ApiResponse<PagedResponse<ProductResponse>>> getMyProducts(
            @RequestHeader("X-User-Id") String userIdStr,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        Long sellerId = Long.parseLong(userIdStr);
        log.info("Seller {} fetching their products (page={}, size={})", sellerId, page, size);
        return ResponseEntity.ok(ApiResponse.ok("Products fetched",
            productService.getMyProducts(sellerId, page, size)));
    }

    @Operation(summary = "Restock a product — SELLER only",
               description = "Adds quantity units to the product's current stock.")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{id}/restock")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<ApiResponse<ProductResponse>> restockProduct(
            @PathVariable Long id,
            @Valid @RequestBody StockRequest request,
            @RequestHeader("X-User-Id") String userIdStr,
            @RequestHeader(value = "X-Seller-Business-Name", required = false) String businessName) {
        Long sellerId = Long.parseLong(userIdStr);
        log.info("Seller {} restocking product {} by {} units", sellerId, id, request.getQuantity());
        ProductResponse response = productService.restockProduct(id, request.getQuantity(), sellerId, businessName);
        return ResponseEntity.ok(ApiResponse.ok("Stock updated successfully", response));
    }

    // ─── SELLER or ADMIN endpoints ─────────────────────────────────────────────

    @Operation(summary = "Create product — SELLER or ADMIN",
               description = "Seller identity is extracted from the JWT token, not from the request body.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SELLER')")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Valid @RequestBody ProductRequest request,
            @RequestHeader(value = "X-User-Id",              required = false) String userIdStr,
            @RequestHeader(value = "X-User-Email",           required = false) String userEmail,
            @RequestHeader(value = "X-Seller-Business-Name", required = false) String businessName) {
        if (userIdStr != null) {
            request.setSellerId(Long.parseLong(userIdStr));
            request.setSellerEmail(userEmail);
            request.setSellerName(businessName);
        }
        log.info("Creating product: {} (seller={})", request.getName(), request.getSellerId());
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Product created successfully", productService.createProduct(request)));
    }

    @Operation(summary = "Update product — SELLER (own) or ADMIN")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SELLER')")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Id",   required = false) String userIdStr) {
        ProductResponse response;
        if ("ADMIN".equals(role)) {
            response = productService.updateProduct(id, request);
        } else {
            Long sellerId = Long.parseLong(userIdStr);
            response = productService.updateMyProduct(id, request, sellerId);
        }
        log.info("Product {} updated by role={}", id, role);
        return ResponseEntity.ok(ApiResponse.ok("Product updated successfully", response));
    }

    @Operation(summary = "Delete product — SELLER (own) or ADMIN")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SELLER')")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Id",   required = false) String userIdStr) {
        if ("ADMIN".equals(role)) {
            productService.deleteProduct(id);
        } else {
            Long sellerId = Long.parseLong(userIdStr);
            productService.deleteMyProduct(id, sellerId);
        }
        log.info("Product {} deleted by role={}", id, role);
        return ResponseEntity.ok(ApiResponse.ok("Product deleted successfully", null));
    }

    // ─── Admin: cache monitoring ───────────────────────────────────────────────

    @Operation(summary = "Cache stats — ADMIN only",
               description = "Returns the number of keys currently held in Redis.")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/cache/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCacheStats() {
        return ResponseEntity.ok(ApiResponse.ok("Cache is active",
            Map.of("status", "Redis cache enabled", "ttl", "10 minutes")));
    }

    // ─── Internal endpoints (called by order-service, no user JWT) ────────────

    @PutMapping("/{id}/reduce-stock")
    public ResponseEntity<ApiResponse<ProductResponse>> reduceStock(
            @PathVariable Long id, @Valid @RequestBody StockRequest request) {
        log.info("Reducing stock for product {}: -{}", id, request.getQuantity());
        ProductResponse updated = productService.reduceStock(id, request.getQuantity());
        return ResponseEntity.ok(ApiResponse.ok("Stock reduced successfully", updated));
    }

    @PutMapping("/{id}/restore-stock")
    public ResponseEntity<ApiResponse<Void>> restoreStock(
            @PathVariable Long id, @Valid @RequestBody StockRequest request) {
        log.info("Restoring stock for product {}: +{}", id, request.getQuantity());
        productService.restoreStock(id, request.getQuantity());
        return ResponseEntity.ok(ApiResponse.ok("Stock restored successfully", null));
    }
}
