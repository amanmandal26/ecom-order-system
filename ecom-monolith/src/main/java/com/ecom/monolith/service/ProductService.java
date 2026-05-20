package com.ecom.monolith.service;

import com.ecom.monolith.dto.ProductRequest;
import com.ecom.monolith.dto.ProductResponse;
import com.ecom.monolith.entity.Product;
import com.ecom.monolith.exception.InsufficientStockException;
import com.ecom.monolith.exception.ResourceNotFoundException;
import com.ecom.monolith.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProductService {

    private final ProductRepository productRepository;

    /**
     * Create a new product. ADMIN only — enforced by @PreAuthorize in the controller.
     */
    public ProductResponse createProduct(ProductRequest request) {
        log.info("Creating product: {}", request.getName());
        Product product = Product.builder()
            .name(request.getName())
            .description(request.getDescription())
            .price(request.getPrice())
            .stockQuantity(request.getStockQuantity())
            .build();
        product = productRepository.save(product);
        log.info("Product created with id: {}", product.getId());
        return ProductResponse.fromProduct(product);
    }

    /**
     * Return all products. Available to any authenticated user.
     */
    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll()
            .stream()
            .map(ProductResponse::fromProduct)
            .toList();
    }

    /**
     * Return a single product by id. Throws 404 if not found.
     */
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        return ProductResponse.fromProduct(findProductOrThrow(id));
    }

    /**
     * Update an existing product. ADMIN only — enforced by @PreAuthorize in the controller.
     * All fields are replaced (full update, not partial PATCH).
     */
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        log.info("Updating product id: {}", id);
        Product product = findProductOrThrow(id);
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        // No explicit save() needed — @Transactional detects the dirty entity and flushes automatically.
        log.info("Product updated: {}", id);
        return ProductResponse.fromProduct(product);
    }

    /**
     * Delete a product by id. ADMIN only — enforced by @PreAuthorize in the controller.
     */
    public void deleteProduct(Long id) {
        log.info("Deleting product id: {}", id);
        Product product = findProductOrThrow(id);
        productRepository.delete(product);
        log.info("Product deleted: {}", id);
    }

    /**
     * Reduce stock after an order is placed. Called internally by OrderService (not exposed via HTTP).
     * Throws InsufficientStockException if available stock < requested quantity.
     * @Transactional ensures the read + write happen atomically.
     */
    @Transactional
    public void reduceStock(Long productId, Integer quantity) {
        Product product = findProductOrThrow(productId);
        if (product.getStockQuantity() < quantity) {
            throw new InsufficientStockException(productId, quantity, product.getStockQuantity());
        }
        product.setStockQuantity(product.getStockQuantity() - quantity);
        log.info("Stock reduced for product {}: -{} units (remaining: {})",
            productId, quantity, product.getStockQuantity());
    }

    /**
     * Restore stock when an order is cancelled. Called internally by OrderService.
     * The inverse of reduceStock() — adds quantity back to the product's stock.
     */
    @Transactional
    public void restoreStock(Long productId, Integer quantity) {
        Product product = findProductOrThrow(productId);
        product.setStockQuantity(product.getStockQuantity() + quantity);
        log.info("Stock restored for product {}: +{} units (new total: {})",
            productId, quantity, product.getStockQuantity());
    }

    // Private helper — avoids repeating .orElseThrow() in every method above.
    private Product findProductOrThrow(Long id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }
}
