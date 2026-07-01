package com.ecom.productservice.service;

import com.ecom.productservice.dto.PagedResponse;
import com.ecom.productservice.dto.ProductRequest;
import com.ecom.productservice.dto.ProductResponse;
import com.ecom.productservice.dto.ProductSearchRequest;
import com.ecom.productservice.entity.Product;
import com.ecom.productservice.exception.ForbiddenException;
import com.ecom.productservice.exception.InsufficientStockException;
import com.ecom.productservice.exception.ResourceNotFoundException;
import com.ecom.productservice.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ProductService.
 *
 * Key design notes:
 *
 * 1. Caching annotations (@Cacheable, @CacheEvict) are AOP-based. Without a Spring context
 *    they are completely ignored — the raw method runs every time. This is correct for
 *    unit tests: we test the business logic, not the caching layer.
 *
 * 2. Several write methods (updateProduct, reduceStock, restockProduct) do NOT call
 *    save() explicitly. They rely on JPA dirty-checking: JPA sees that the managed entity
 *    was mutated inside a @Transactional method and issues an UPDATE at commit time.
 *    In a unit test there is no transaction or EntityManager — the mock just holds a plain
 *    Java object. So instead of verifying save(), these tests assert on the returned
 *    response's field values (which come from the same in-memory object).
 *
 * 3. createProduct() does call save() explicitly, so that one CAN be verified.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ProductService Unit Tests")
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ImageUploadService imageUploadService;

    @InjectMocks
    private ProductService productService;

    private Product laptop;

    @BeforeEach
    void setUp() {
        laptop = Product.builder()
            .id(1L)
            .name("Laptop")
            .description("High performance laptop")
            .price(new BigDecimal("79999"))
            .stockQuantity(10)
            .sellerId(6L)
            .sellerName("Rajesh Electronics")
            .sellerEmail("rajesh@seller.com")
            .build();
    }

    // ─── createProduct ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("createProduct: valid request → persists and returns product with seller info")
    void createProduct_withValidData_shouldSaveProduct() {
        // Arrange
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product p = invocation.getArgument(0);
            p.setId(1L);
            return p;
        });

        ProductRequest request = new ProductRequest();
        request.setName("Laptop");
        request.setDescription("High performance laptop");
        request.setPrice(new BigDecimal("79999"));
        request.setStockQuantity(10);
        request.setSellerId(6L);
        request.setSellerName("Rajesh Electronics");
        request.setSellerEmail("rajesh@seller.com");

        // Act — pass null for images (no upload in this unit test)
        ProductResponse response = productService.createProduct(request, null);

        // Assert
        assertEquals(1L, response.getId());
        assertEquals("Rajesh Electronics", response.getSellerName());
        // With null images the upload block is skipped — save() is called exactly once
        verify(productRepository, times(1)).save(any(Product.class));
    }

    // ─── reduceStock ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("reduceStock: sufficient stock → reduces quantity and returns updated product")
    void reduceStock_whenSufficientStock_shouldReduceCorrectly() {
        // Arrange — stock = 10, order asks for 3
        when(productRepository.findById(1L)).thenReturn(Optional.of(laptop));

        // Act
        ProductResponse response = productService.reduceStock(1L, 3);

        // Assert — 10 - 3 = 7
        // We assert on the response value, not save(), because the service uses JPA
        // dirty-checking (no explicit save call). The in-memory Product object IS
        // mutated, and the response is built from that same object.
        assertEquals(7, response.getStockQuantity());
    }

    @Test
    @DisplayName("reduceStock: insufficient stock → throws InsufficientStockException, product unchanged")
    void reduceStock_whenInsufficientStock_shouldThrowException() {
        // Arrange — stock = 2, but we try to order 5
        laptop.setStockQuantity(2);
        when(productRepository.findById(1L)).thenReturn(Optional.of(laptop));

        // Act + Assert
        assertThrows(
            InsufficientStockException.class,
            () -> productService.reduceStock(1L, 5)
        );

        // Stock must not have been touched — no save of corrupted data
        assertEquals(2, laptop.getStockQuantity());
        verify(productRepository, never()).save(any(Product.class));
    }

    // ─── restockProduct ────────────────────────────────────────────────────────

    @Test
    @DisplayName("restockProduct: correct seller adds quantity → stock increases")
    void restockProduct_shouldIncreaseStock() {
        // Arrange — stock = 10, restock by 50
        when(productRepository.findById(1L)).thenReturn(Optional.of(laptop));

        // Act
        ProductResponse response = productService.restockProduct(1L, 50, 6L, "Rajesh Electronics");

        // Assert — 10 + 50 = 60
        assertEquals(60, response.getStockQuantity());
    }

    @Test
    @DisplayName("restockProduct: wrong seller → throws ForbiddenException")
    void restockProduct_wrongSeller_shouldThrowException() {
        // Arrange — product belongs to sellerId=6, but sellerId=99 tries to restock
        when(productRepository.findById(1L)).thenReturn(Optional.of(laptop));

        // Act + Assert
        assertThrows(
            ForbiddenException.class,
            () -> productService.restockProduct(1L, 50, 99L, "Other Seller")
        );

        // Stock must remain unchanged
        assertEquals(10, laptop.getStockQuantity());
    }

    // ─── searchProducts ────────────────────────────────────────────────────────

    @Test
    @DisplayName("searchProducts: no filters applied → returns all products from repository")
    void searchProducts_withNoFilters_shouldReturnAllProducts() {
        // Arrange — repository returns a page of 5 products
        List<Product> products = List.of(
            buildProduct(1L, "Laptop",   new BigDecimal("79999")),
            buildProduct(2L, "Phone",    new BigDecimal("29999")),
            buildProduct(3L, "Tablet",   new BigDecimal("49999")),
            buildProduct(4L, "Monitor",  new BigDecimal("19999")),
            buildProduct(5L, "Keyboard", new BigDecimal("4999"))
        );
        Page<Product> productPage = new PageImpl<>(products);

        // any(Specification.class) matches regardless of which filters were combined —
        // the Specification is built inside the method so we can't match it exactly
        when(productRepository.findAll(any(Specification.class), any(Pageable.class)))
            .thenReturn(productPage);

        // Act — default request (all fields at defaults, no filters)
        ProductSearchRequest request = new ProductSearchRequest();

        PagedResponse<ProductResponse> result = productService.searchProducts(request);

        // Assert
        assertEquals(5, result.getTotalItems());
        assertEquals(5, result.getContent().size());
    }

    // ─── getProductById ────────────────────────────────────────────────────────

    @Test
    @DisplayName("getProductById: product exists → returns correct response")
    void getProductById_whenExists_shouldReturnProduct() {
        // Arrange
        when(productRepository.findById(1L)).thenReturn(Optional.of(laptop));

        // Act
        ProductResponse response = productService.getProductById(1L);

        // Assert
        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("Laptop", response.getName());
        assertEquals(new BigDecimal("79999"), response.getPrice());
    }

    @Test
    @DisplayName("getProductById: product not found → throws ResourceNotFoundException")
    void getProductById_whenNotExists_shouldThrowException() {
        // Arrange — empty Optional simulates a DB miss
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        // Act + Assert
        ResourceNotFoundException ex = assertThrows(
            ResourceNotFoundException.class,
            () -> productService.getProductById(99L)
        );

        assertTrue(ex.getMessage().contains("99"));
    }

    // ─── Helper ────────────────────────────────────────────────────────────────

    private Product buildProduct(Long id, String name, BigDecimal price) {
        return Product.builder()
            .id(id)
            .name(name)
            .price(price)
            .stockQuantity(10)
            .sellerId(6L)
            .sellerName("Rajesh Electronics")
            .sellerEmail("rajesh@seller.com")
            .build();
    }
}
