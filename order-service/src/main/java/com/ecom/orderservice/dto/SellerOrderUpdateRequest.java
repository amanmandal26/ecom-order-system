package com.ecom.orderservice.dto;

import com.ecom.orderservice.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SellerOrderUpdateRequest {

    @NotNull(message = "orderId is required")
    private Long orderId;

    @NotNull(message = "status is required")
    private OrderStatus status;
}
