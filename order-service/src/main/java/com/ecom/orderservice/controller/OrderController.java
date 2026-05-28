package com.ecom.orderservice.controller;

import com.ecom.orderservice.dto.ApiResponse;
import com.ecom.orderservice.dto.OrderRequest;
import com.ecom.orderservice.dto.OrderResponse;
import com.ecom.orderservice.dto.PagedResponse;
import com.ecom.orderservice.entity.OrderStatus;
import com.ecom.orderservice.service.OrderService;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Orders", description = "Order lifecycle management — all endpoints require a JWT token")
public class OrderController {

    private final OrderService orderService;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    @Operation(summary = "Place a new order", description = "Deducts stock from product-service and creates the order. Publishes an event to RabbitMQ.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> placeOrder(
            @Valid @RequestBody OrderRequest request,
            HttpServletRequest httpRequest) {

        Long userId = (Long) httpRequest.getAttribute("userId");
        String userEmail = resolveEmail(httpRequest);

        // userId is embedded in the JWT by user-service. If it's missing the token
        // was issued before that change — a fresh login produces a valid token.
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Your session token is outdated. Please login again to get a new token."));
        }

        log.info("User {} placing order", userEmail);
        OrderResponse response = orderService.placeOrder(request, userId, userEmail);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Order placed successfully", response));
    }

    @Operation(summary = "Get my orders", description = "Returns the authenticated user's orders, newest first. Paginated.")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/my-orders")
    public ResponseEntity<ApiResponse<PagedResponse<OrderResponse>>> getMyOrders(
            HttpServletRequest httpRequest,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        String userEmail = resolveEmail(httpRequest);

        PagedResponse<OrderResponse> orders = (userId != null)
            ? orderService.getMyOrders(userId, page, size)
            : orderService.getMyOrdersByEmail(userEmail, page, size);

        return ResponseEntity.ok(ApiResponse.ok("Orders fetched successfully", orders));
    }

    @Operation(summary = "Get all orders — ADMIN only", description = "Returns all orders across all users, newest first. Paginated.")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<OrderResponse>>> getAllOrders(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Admin fetching all orders (page={}, size={})", page, size);
        return ResponseEntity.ok(ApiResponse.ok("All orders fetched successfully",
            orderService.getAllOrders(page, size)));
    }

    @Operation(summary = "Get order by ID", description = "Admins can view any order; customers can only view their own.")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        String role = (String) httpRequest.getAttribute("role");
        String userEmail = resolveEmail(httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Order fetched successfully",
            orderService.getOrderById(id, userId, userEmail, role)));
    }

    @Operation(summary = "Update order status — ADMIN only", description = "Moves order through the lifecycle. Publishing SHIPPED status triggers a notification email.")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        log.info("Admin updating order {} to {}", id, status);
        return ResponseEntity.ok(ApiResponse.ok("Order status updated successfully",
            orderService.updateOrderStatus(id, status)));
    }

    @Operation(summary = "Cancel order", description = "Cancels a PENDING order and restores stock. Only the order owner can cancel.")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        Long userId = (Long) httpRequest.getAttribute("userId");
        String userEmail = resolveEmail(httpRequest);
        log.info("User {} cancelling order {}", userEmail, id);
        return ResponseEntity.ok(ApiResponse.ok("Order cancelled successfully",
            orderService.cancelOrder(id, userId, userEmail)));
    }

    @Operation(summary = "Circuit breaker status — ADMIN only", description = "Returns the current state and call metrics of the productService circuit breaker.")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/health/circuit-breaker")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCircuitBreakerStatus() {
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("productService");
        CircuitBreaker.Metrics metrics = cb.getMetrics();

        Map<String, Object> status = Map.of(
            "state", cb.getState().name(),
            "failureRate", metrics.getFailureRate() + "%",
            "slowCallRate", metrics.getSlowCallRate() + "%",
            "numberOfSuccessfulCalls", metrics.getNumberOfSuccessfulCalls(),
            "numberOfFailedCalls", metrics.getNumberOfFailedCalls(),
            "numberOfSlowCalls", metrics.getNumberOfSlowCalls()
        );

        return ResponseEntity.ok(ApiResponse.ok("Circuit breaker status fetched", status));
    }

    // Reads userEmail from request attribute (set by JwtAuthFilter).
    // Falls back to SecurityContext principal if the attribute is somehow missing.
    private String resolveEmail(HttpServletRequest httpRequest) {
        String email = (String) httpRequest.getAttribute("userEmail");
        if (email == null) {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            email = principal instanceof String ? (String) principal : principal.toString();
        }
        return email;
    }
}
