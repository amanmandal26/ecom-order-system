package com.ecom.orderservice.exception;

import com.ecom.orderservice.entity.OrderStatus;

public class OrderCancellationException extends RuntimeException {

    public OrderCancellationException(Long orderId, OrderStatus currentStatus) {
        super("Order " + orderId + " cannot be cancelled. Current status: " + currentStatus);
    }
}
