package com.ecom.monolith.exception;

import com.ecom.monolith.entity.OrderStatus;

public class OrderCancellationException extends RuntimeException {

    public OrderCancellationException(Long orderId, OrderStatus currentStatus) {
        super("Order " + orderId + " cannot be cancelled — current status is " + currentStatus
              + ". Only PENDING orders can be cancelled.");
    }
}
