package com.ecom.orderservice.service;

import com.ecom.orderservice.client.ProductClient;
import com.ecom.orderservice.config.RabbitMQConfig;
import com.ecom.orderservice.dto.ApiResponse;
import com.ecom.orderservice.dto.OrderItemRequest;
import com.ecom.orderservice.dto.OrderRequest;
import com.ecom.orderservice.dto.OrderResponse;
import com.ecom.orderservice.dto.PagedResponse;
import com.ecom.orderservice.dto.ProductResponse;
import com.ecom.orderservice.dto.StockRequest;
import com.ecom.orderservice.entity.Order;
import com.ecom.orderservice.entity.OrderItem;
import com.ecom.orderservice.entity.OrderStatus;
import com.ecom.orderservice.event.OrderPlacedEvent;
import com.ecom.orderservice.exception.BadRequestException;
import com.ecom.orderservice.exception.InsufficientStockException;
import com.ecom.orderservice.exception.SellerActionException;
import com.ecom.orderservice.repository.OrderRepository;
import feign.FeignException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for OrderService.
 *
 * WHY @ExtendWith(MockitoExtension.class) instead of @SpringBootTest?
 * - @SpringBootTest loads the ENTIRE Spring context: database, RabbitMQ, Eureka, Redis.
 *   It takes 10–30 seconds to start and requires all infrastructure to be running.
 * - @ExtendWith(MockitoExtension.class) creates ONLY the class under test and replaces
 *   every dependency with a mock — pure Java, runs in milliseconds, zero infrastructure needed.
 *   We test logic, not wiring. Wiring is Spring's job, not ours.
 *
 * WHY mocks instead of real objects?
 * - OrderService talks to: a database (OrderRepository), another service over HTTP (ProductClient),
 *   and a message broker (AmqpTemplate). None of these should be real in a unit test.
 * - Mocks let us define exactly what each dependency returns for a given input,
 *   so each test exercises one specific behaviour in complete isolation.
 *
 * NOTE: @CircuitBreaker on placeOrder is an AOP annotation processed at runtime by Spring.
 * Without the Spring context, AOP proxies are never created — the annotation is simply ignored
 * and the raw method runs. This is exactly what we want: test the logic, not the resilience wrapper.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("OrderService Unit Tests")
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductClient productClient;

    @Mock
    private AmqpTemplate rabbitTemplate;

    // @InjectMocks creates an instance of OrderService and injects the three mocks above
    // into its constructor automatically (Mockito reads @RequiredArgsConstructor fields).
    @InjectMocks
    private OrderService orderService;

    // Shared test data — rebuilt fresh before every test by @BeforeEach
    // so no test can accidentally affect another.
    private ProductResponse laptop;
    private ApiResponse<ProductResponse> laptopApiResponse;
    private ApiResponse<ProductResponse> laptopReducedStockApiResponse;
    private OrderRequest orderRequest;

    /**
     * @BeforeEach runs before EVERY test method.
     * It rebuilds the shared objects so each test starts with a clean, predictable state.
     * Without this, a test that mutates shared data would silently break the next test.
     */
    @BeforeEach
    void setUp() {
        laptop = new ProductResponse();
        laptop.setId(1L);
        laptop.setName("Laptop");
        laptop.setPrice(new BigDecimal("79999"));
        laptop.setStockQuantity(10);
        laptop.setSellerEmail("rajesh@seller.com");
        laptop.setSellerName("Rajesh Electronics");

        // After reduceStock, stock goes from 10 to 8 (ordered 2 units)
        ProductResponse laptopUpdated = new ProductResponse();
        laptopUpdated.setId(1L);
        laptopUpdated.setName("Laptop");
        laptopUpdated.setPrice(new BigDecimal("79999"));
        laptopUpdated.setStockQuantity(8);
        laptopUpdated.setSellerEmail("rajesh@seller.com");
        laptopUpdated.setSellerName("Rajesh Electronics");

        laptopApiResponse        = ApiResponse.ok("Product fetched", laptop);
        laptopReducedStockApiResponse = ApiResponse.ok("Stock reduced", laptopUpdated);

        OrderItemRequest itemRequest = new OrderItemRequest();
        itemRequest.setProductId(1L);
        itemRequest.setQuantity(2);

        orderRequest = new OrderRequest();
        orderRequest.setItems(List.of(itemRequest));
    }

    // ─── placeOrder ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("placeOrder: product in stock → creates order with PENDING status and correct total")
    void placeOrder_whenProductInStock_shouldCreateOrder() {
        // Arrange
        when(productClient.getProductById(1L)).thenReturn(laptopApiResponse);
        when(productClient.reduceStock(eq(1L), any(StockRequest.class)))
            .thenReturn(laptopReducedStockApiResponse);

        // The service calls orderRepository.save(order). We set id=1L on the order
        // that arrives as the argument and return it, mimicking what JPA does.
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        // Act
        OrderResponse response = orderService.placeOrder(orderRequest, 5L, "customer@test.com");

        // Assert
        assertEquals(OrderStatus.PENDING, response.getStatus());
        // 79999 × 2 = 159998
        assertEquals(new BigDecimal("159998"), response.getTotalAmount());

        // verify() checks that a method was called with the expected arguments.
        // It fails if the method was NOT called — proving our code hit that line.
        verify(orderRepository, times(1)).save(any(Order.class));
        verify(rabbitTemplate, times(1)).convertAndSend(
            eq(RabbitMQConfig.EXCHANGE),
            eq(RabbitMQConfig.KEY_PLACED),
            any(OrderPlacedEvent.class)
        );
    }

    @Test
    @DisplayName("placeOrder: product out of stock → throws InsufficientStockException, order NOT saved")
    void placeOrder_whenProductOutOfStock_shouldThrowException() {
        // Arrange — getProductById succeeds (we need the name for the error message),
        // then reduceStock throws 400 Bad Request (product-service returns this when stock is low)
        when(productClient.getProductById(1L)).thenReturn(laptopApiResponse);

        FeignException.BadRequest feignException = mock(FeignException.BadRequest.class);
        when(productClient.reduceStock(anyLong(), any(StockRequest.class)))
            .thenThrow(feignException);

        // Act + Assert — assertThrows verifies that the lambda throws the expected type.
        // It also returns the exception so you can check the message if needed.
        assertThrows(
            InsufficientStockException.class,
            () -> orderService.placeOrder(orderRequest, 5L, "customer@test.com")
        );

        // The order must NOT be persisted if stock reduction failed
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("placeOrder: empty items list → throws BadRequestException immediately")
    void placeOrder_whenItemListEmpty_shouldThrowException() {
        // Arrange — empty items list; no productClient calls should be made
        OrderRequest emptyRequest = new OrderRequest();
        emptyRequest.setItems(List.of());

        // Act + Assert
        BadRequestException ex = assertThrows(
            BadRequestException.class,
            () -> orderService.placeOrder(emptyRequest, 5L, "customer@test.com")
        );

        assertEquals("Order must contain at least one item", ex.getMessage());

        // No downstream calls should be made if validation fails early
        verifyNoInteractions(productClient);
        verify(orderRepository, never()).save(any(Order.class));
    }

    // ─── getMyOrders ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("getMyOrders: returns only orders belonging to the requesting user")
    void getMyOrders_shouldReturnOnlyUserOrders() {
        // Arrange — two orders, both for userId=5
        Order order1 = Order.builder()
            .id(1L).userId(5L).userEmail("user@test.com")
            .status(OrderStatus.PENDING)
            .totalAmount(new BigDecimal("79999"))
            .orderItems(new ArrayList<>())
            .build();
        Order order2 = Order.builder()
            .id(2L).userId(5L).userEmail("user@test.com")
            .status(OrderStatus.CONFIRMED)
            .totalAmount(new BigDecimal("159998"))
            .orderItems(new ArrayList<>())
            .build();

        Page<Order> orderPage = new PageImpl<>(List.of(order1, order2));
        when(orderRepository.findByUserIdOrderByCreatedAtDesc(5L, PageRequest.of(0, 10)))
            .thenReturn(orderPage);

        // Act
        PagedResponse<OrderResponse> result = orderService.getMyOrders(5L, 0, 10);

        // Assert
        assertEquals(2, result.getContent().size());
        assertTrue(result.getContent().stream().allMatch(o -> o.getUserId().equals(5L)));
    }

    // ─── updateOrderStatusBySeller ─────────────────────────────────────────────

    @Test
    @DisplayName("updateOrderStatusBySeller: PENDING → CONFIRMED succeeds and saves order")
    void updateOrderStatusBySeller_pendingToConfirmed_shouldSucceed() {
        // Arrange
        Order order = buildOrderWithSeller(OrderStatus.PENDING, "rajesh@seller.com");
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);

        // Act
        OrderResponse response = orderService.updateOrderStatusBySeller(
            1L, OrderStatus.CONFIRMED, "rajesh@seller.com");

        // Assert
        assertEquals(OrderStatus.CONFIRMED, response.getStatus());
        verify(orderRepository, times(1)).save(order);
        // No RabbitMQ event for CONFIRMED — only SHIPPED triggers an event
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), any(Object.class));
    }

    @Test
    @DisplayName("updateOrderStatusBySeller: CONFIRMED → SHIPPED publishes shipped event")
    void updateOrderStatusBySeller_confirmedToShipped_shouldPublishEvent() {
        // Arrange
        Order order = buildOrderWithSeller(OrderStatus.CONFIRMED, "rajesh@seller.com");
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);

        // Act
        OrderResponse response = orderService.updateOrderStatusBySeller(
            1L, OrderStatus.SHIPPED, "rajesh@seller.com");

        // Assert
        assertEquals(OrderStatus.SHIPPED, response.getStatus());
        verify(rabbitTemplate, times(1)).convertAndSend(
            eq(RabbitMQConfig.EXCHANGE),
            eq(RabbitMQConfig.KEY_SHIPPED),
            any(OrderPlacedEvent.class)
        );
    }

    @Test
    @DisplayName("updateOrderStatusBySeller: sellers cannot set status to PENDING → SellerActionException")
    void updateOrderStatusBySeller_invalidTransition_shouldThrowException() {
        // Arrange — SHIPPED order; trying to go to PENDING is an invalid seller action
        Order order = buildOrderWithSeller(OrderStatus.SHIPPED, "rajesh@seller.com");
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        // Act + Assert — sellers can only set CONFIRMED or SHIPPED
        SellerActionException ex = assertThrows(
            SellerActionException.class,
            () -> orderService.updateOrderStatusBySeller(1L, OrderStatus.PENDING, "rajesh@seller.com")
        );

        assertTrue(ex.getMessage().contains("Sellers can only confirm or ship orders"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("updateOrderStatusBySeller: wrong seller email → AccessDeniedException")
    void updateOrderStatusBySeller_wrongSeller_shouldThrowException() {
        // Arrange — order belongs to rajesh, but "other@seller.com" tries to update it
        Order order = buildOrderWithSeller(OrderStatus.PENDING, "rajesh@seller.com");
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        // Act + Assert
        assertThrows(
            AccessDeniedException.class,
            () -> orderService.updateOrderStatusBySeller(1L, OrderStatus.CONFIRMED, "other@seller.com")
        );

        verify(orderRepository, never()).save(any(Order.class));
    }

    // ─── Helper ────────────────────────────────────────────────────────────────

    /**
     * Builds an Order containing one item owned by the given seller.
     * The order must have the item's order reference set or stream operations will NPE.
     */
    private Order buildOrderWithSeller(OrderStatus status, String sellerEmail) {
        Order order = Order.builder()
            .id(1L)
            .userId(5L)
            .userEmail("customer@test.com")
            .status(status)
            .totalAmount(new BigDecimal("159998"))
            .orderItems(new ArrayList<>())
            .build();

        OrderItem item = OrderItem.builder()
            .id(1L)
            .productId(1L)
            .productName("Laptop")
            .quantity(2)
            .unitPrice(new BigDecimal("79999"))
            .sellerEmail(sellerEmail)
            .sellerName("Rajesh Electronics")
            .build();
        item.setOrder(order);
        order.getOrderItems().add(item);

        return order;
    }
}
