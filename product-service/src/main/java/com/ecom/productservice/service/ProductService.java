package com.ecom.productservice.service;

import com.ecom.productservice.dto.PagedResponse;
import com.ecom.productservice.dto.ProductRequest;
import com.ecom.productservice.dto.ProductResponse;
import com.ecom.productservice.dto.ProductSearchRequest;
import com.ecom.productservice.entity.Product;
import com.ecom.productservice.exception.BadRequestException;
import com.ecom.productservice.exception.ForbiddenException;
import com.ecom.productservice.exception.InsufficientStockException;
import com.ecom.productservice.exception.ResourceNotFoundException;
import com.ecom.productservice.repository.ProductRepository;
import com.ecom.productservice.specification.ProductSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final ImageUploadService imageUploadService;

    // ─── Admin / public endpoints ──────────────────────────────────────────────

    @Caching(evict = {
        @CacheEvict(value = "products",       allEntries = true),
        @CacheEvict(value = "sellerProducts", allEntries = true)
    })
    public ProductResponse createProduct(ProductRequest request, MultipartFile[] images) {
        log.info("Cache EVICTED — new product created");
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

        if (images != null && images.length > 0) {
            try {
                List<String> urls = imageUploadService.uploadImages(images, product.getId());
                product.setImageUrls(urls);
                product = productRepository.save(product);
            } catch (BadRequestException e) {
                throw e;  // validation failures (wrong type, count) must surface to the caller
            } catch (Exception e) {
                log.error("Image upload failed for product {}, keeping product without images: {}",
                    product.getId(), e.getMessage());
            }
        }

        return ProductResponse.fromProduct(product);
    }

    @Transactional(readOnly = true)
    @Cacheable(
        value = "products",
        key = "T(String).valueOf(#request.page) + ':' + T(String).valueOf(#request.size) + ':'"
            + "+ (#request.search ?: 'null') + ':'"
            + "+ (#request.sortBy ?: 'createdAt') + ':' + (#request.sortDir ?: 'desc') + ':'"
            + "+ T(String).valueOf(#request.inStockOnly) + ':'"
            + "+ (#request.minPrice != null ? #request.minPrice.toPlainString() : 'null') + ':'"
            + "+ (#request.maxPrice != null ? #request.maxPrice.toPlainString() : 'null') + ':'"
            + "+ (#request.sellerName ?: 'null')"
    )
    public PagedResponse<ProductResponse> searchProducts(ProductSearchRequest request) {
        log.info("Cache MISS — fetching products from database");
        Specification<Product> spec = Specification.where(null);

        if (request.getSearch() != null && !request.getSearch().isBlank()) {
            log.info("Filter: search='{}'", request.getSearch());
            spec = spec.and(ProductSpecification.nameOrDescriptionContains(request.getSearch()));
        }
        if (request.getMinPrice() != null) {
            log.info("Filter: minPrice={}", request.getMinPrice());
            spec = spec.and(ProductSpecification.priceGreaterThanOrEqual(request.getMinPrice()));
        }
        if (request.getMaxPrice() != null) {
            log.info("Filter: maxPrice={}", request.getMaxPrice());
            spec = spec.and(ProductSpecification.priceLessThanOrEqual(request.getMaxPrice()));
        }
        if (Boolean.TRUE.equals(request.getInStockOnly())) {
            log.info("Filter: inStockOnly=true");
            spec = spec.and(ProductSpecification.inStockOnly());
        }
        if (request.getSellerName() != null && !request.getSellerName().isBlank()) {
            log.info("Filter: sellerName='{}'", request.getSellerName());
            spec = spec.and(ProductSpecification.bySellerName(request.getSellerName()));
        }

        Sort.Direction direction = "asc".equalsIgnoreCase(request.getSortDir())
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PagedResponse.of(
            productRepository.findAll(spec,
                    PageRequest.of(request.getPage(), request.getSize(),
                            Sort.by(direction, request.getSortBy())))
                .map(ProductResponse::fromProduct)
        );
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "product", key = "#id")
    public ProductResponse getProductById(Long id) {
        log.info("Cache MISS — fetching product {} from database", id);
        return ProductResponse.fromProduct(findProductOrThrow(id));
    }

    @Caching(evict = {
        @CacheEvict(value = "products",       allEntries = true),
        @CacheEvict(value = "product",        key = "#id"),
        @CacheEvict(value = "sellerProducts", allEntries = true)
    })
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        log.info("Updating product id: {}", id);
        Product product = findProductOrThrow(id);
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        return ProductResponse.fromProduct(product);
    }

    @Caching(evict = {
        @CacheEvict(value = "products",       allEntries = true),
        @CacheEvict(value = "product",        key = "#id"),
        @CacheEvict(value = "sellerProducts", allEntries = true)
    })
    public void deleteProduct(Long id) {
        log.info("Deleting product id: {}", id);
        productRepository.delete(findProductOrThrow(id));
        log.info("Product deleted: {}", id);
    }

    // ─── Seller-scoped endpoints ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    @Cacheable(value = "sellerProducts", key = "#sellerId + ':' + #page + ':' + #size")
    public PagedResponse<ProductResponse> getMyProducts(Long sellerId, int page, int size) {
        log.info("Cache MISS — fetching seller {} products from database", sellerId);
        return PagedResponse.of(
            productRepository.findBySellerId(sellerId,
                    PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(ProductResponse::fromProduct)
        );
    }

    @Caching(evict = {
        @CacheEvict(value = "products",       allEntries = true),
        @CacheEvict(value = "product",        key = "#productId"),
        @CacheEvict(value = "sellerProducts", allEntries = true)
    })
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

    @Caching(evict = {
        @CacheEvict(value = "products",       allEntries = true),
        @CacheEvict(value = "product",        key = "#productId"),
        @CacheEvict(value = "sellerProducts", allEntries = true)
    })
    public ProductResponse addProductImages(Long productId, MultipartFile[] images, Long sellerId) {
        Product product = findProductOrThrow(productId);
        assertOwnership(product, sellerId);
        int existing = product.getImageUrls().size();
        if (images == null || images.length == 0) {
            throw new BadRequestException("Please upload between 1 and 4 images");
        }
        if (existing + images.length > 4) {
            throw new BadRequestException("Cannot add " + images.length + " image(s). Product already has "
                + existing + " — maximum is 4 total.");
        }
        List<String> newUrls = imageUploadService.uploadImages(images, productId);
        product.getImageUrls().addAll(newUrls);
        log.info("Seller {} added {} image(s) to product {}", sellerId, newUrls.size(), productId);
        return ProductResponse.fromProduct(product);
    }

    @Caching(evict = {
        @CacheEvict(value = "products",       allEntries = true),
        @CacheEvict(value = "product",        key = "#productId"),
        @CacheEvict(value = "sellerProducts", allEntries = true)
    })
    public ProductResponse removeProductImage(Long productId, String imageUrl, Long sellerId) {
        Product product = findProductOrThrow(productId);
        assertOwnership(product, sellerId);
        if (product.getImageUrls().size() <= 1) {
            throw new BadRequestException("Cannot remove the last image — a product must have at least 1 image");
        }
        if (!product.getImageUrls().contains(imageUrl)) {
            throw new BadRequestException("Image URL not found on this product");
        }
        imageUploadService.deleteImage(imageUrl);
        product.getImageUrls().remove(imageUrl);
        log.info("Seller {} removed an image from product {}", sellerId, productId);
        return ProductResponse.fromProduct(product);
    }

    @Caching(evict = {
        @CacheEvict(value = "products",       allEntries = true),
        @CacheEvict(value = "product",        key = "#productId"),
        @CacheEvict(value = "sellerProducts", allEntries = true)
    })
    public void deleteMyProduct(Long productId, Long sellerId) {
        Product product = findProductOrThrow(productId);
        assertOwnership(product, sellerId);
        productRepository.delete(product);
        log.info("Seller {} deleted product {}", sellerId, productId);
    }

    @Caching(evict = {
        @CacheEvict(value = "products",       allEntries = true),
        @CacheEvict(value = "product",        key = "#productId"),
        @CacheEvict(value = "sellerProducts", allEntries = true)
    })
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

    @Caching(evict = {
        @CacheEvict(value = "products",       allEntries = true),
        @CacheEvict(value = "product",        key = "#productId"),
        @CacheEvict(value = "sellerProducts", allEntries = true)
    })
    public ProductResponse reduceStock(Long productId, Integer quantity) {
        Product product = findProductOrThrow(productId);
        if (product.getStockQuantity() < quantity) {
            throw new InsufficientStockException(productId, quantity, product.getStockQuantity());
        }
        product.setStockQuantity(product.getStockQuantity() - quantity);
        log.info("Stock reduced for product {}: -{} (remaining: {})",
            productId, quantity, product.getStockQuantity());
        return ProductResponse.fromProduct(product);
    }

    @Caching(evict = {
        @CacheEvict(value = "products",       allEntries = true),
        @CacheEvict(value = "product",        key = "#productId"),
        @CacheEvict(value = "sellerProducts", allEntries = true)
    })
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
