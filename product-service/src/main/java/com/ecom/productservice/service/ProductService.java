package com.ecom.productservice.service;

import com.ecom.productservice.dto.ProductRequest;
import com.ecom.productservice.dto.ProductResponse;
import com.ecom.productservice.entity.Product;
import com.ecom.productservice.exception.ForbiddenException;
import com.ecom.productservice.exception.InsufficientStockException;
import com.ecom.productservice.exception.ResourceNotFoundException;
import com.ecom.productservice.repository.ProductRepository;
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

    // ─── Admin / public endpoints ──────────────────────────────────────────────

    public ProductResponse createProduct(ProductRequest request) {
        log.info("Creating product: {} (sellerId={})", request.getName(), request.getSellerId());
        Product product = Product.builder()
            .name(request.getName())
            .description(request.getDescription())
            .price(request.getPrice())
            .stockQuantity(request.getStockQuantity())
            .sellerId(request.getSellerId())
            .sellerName(request.getSellerName())
            .sellerEmail(request.getSellerEmail())
            .build();
        product = productRepository.save(product);
        log.info("Product created with id: {}", product.getId());
        return ProductResponse.fromProduct(product);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll()
            .stream()
            .map(ProductResponse::fromProduct)
            .toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        return ProductResponse.fromProduct(findProductOrThrow(id));
    }

    public ProductResponse updateProduct(Long id, ProductRequest request) {
        log.info("Updating product id: {}", id);
        Product product = findProductOrThrow(id);
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        return ProductResponse.fromProduct(product);
    }

    public void deleteProduct(Long id) {
        log.info("Deleting product id: {}", id);
        productRepository.delete(findProductOrThrow(id));
        log.info("Product deleted: {}", id);
    }

    // ─── Seller-scoped endpoints ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ProductResponse> getMyProducts(Long sellerId) {
        return productRepository.findBySellerId(sellerId)
            .stream()
            .map(ProductResponse::fromProduct)
            .toList();
    }

    public ProductResponse updateMyProduct(Long productId, ProductRequest request, Long sellerId) {
        Product product = findProductOrThrow(productId);
        assertOwnership(product, sellerId);
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        log.info("Seller {} updated product {}", sellerId, productId);
        return ProductResponse.fromProduct(product);
    }

    public void deleteMyProduct(Long productId, Long sellerId) {
        Product product = findProductOrThrow(productId);
        assertOwnership(product, sellerId);
        productRepository.delete(product);
        log.info("Seller {} deleted product {}", sellerId, productId);
    }

    public ProductResponse restockProduct(Long productId, Integer quantity, Long sellerId, String sellerName) {
        Product product = findProductOrThrow(productId);
        assertOwnership(product, sellerId);
        int newStock = product.getStockQuantity() + quantity;
        product.setStockQuantity(newStock);
        log.info("Seller {} restocked product '{}' by {} units. New stock: {}",
            sellerName, product.getName(), quantity, newStock);
        return ProductResponse.fromProduct(product);
    }

    // ─── Internal (order-service) ──────────────────────────────────────────────

    public ProductResponse reduceStock(Long productId, Integer quantity) {
        Product product = findProductOrThrow(productId);
        if (product.getStockQuantity() < quantity) {
            throw new InsufficientStockException(productId, quantity, product.getStockQuantity());
        }
        product.setStockQuantity(product.getStockQuantity() - quantity);
        log.info("Stock reduced for product {}: -{} (remaining: {})",
            productId, quantity, product.getStockQuantity());
        // Return the updated product so order-service gets remaining stock in the same call
        return ProductResponse.fromProduct(product);
    }

    public void restoreStock(Long productId, Integer quantity) {
        Product product = findProductOrThrow(productId);
        product.setStockQuantity(product.getStockQuantity() + quantity);
        log.info("Stock restored for product {}: +{} (new total: {})",
            productId, quantity, product.getStockQuantity());
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private Product findProductOrThrow(Long id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    private void assertOwnership(Product product, Long sellerId) {
        if (product.getSellerId() == null || !product.getSellerId().equals(sellerId)) {
            throw new ForbiddenException("You can only manage your own products");
        }
    }
}
