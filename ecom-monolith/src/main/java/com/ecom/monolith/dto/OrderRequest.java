package com.ecom.monolith.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class OrderRequest {

    // @Valid cascades validation into each OrderItemRequest in the list.
    // Without it, @NotNull and @Min inside OrderItemRequest would be ignored.
    @NotEmpty(message = "Order must contain at least one item")
    @Valid
    private List<OrderItemRequest> items;
}
