package com.ecom.orderservice.client;

import com.ecom.orderservice.dto.ApiResponse;
import com.ecom.orderservice.dto.ProductResponse;
import com.ecom.orderservice.dto.StockRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;

// name = "product-service" — Feign resolves this service name via Eureka.
// No URL needed; load-balancer picks the real host:port at call time.
@FeignClient(name = "product-service")
public interface ProductClient {

    @GetMapping("/api/products/{id}")
    ApiResponse<ProductResponse> getProductById(@PathVariable("id") Long id);

    // These two match the permitAll endpoints in product-service's SecurityConfig.
    // No Authorization header is sent — reduce/restore-stock are internal-only.
    @PutMapping("/api/products/{id}/reduce-stock")
    void reduceStock(@PathVariable("id") Long id, @RequestBody StockRequest request);

    @PutMapping("/api/products/{id}/restore-stock")
    void restoreStock(@PathVariable("id") Long id, @RequestBody StockRequest request);
}
