package com.ecom.monolith.exception;

public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(Long productId, Integer requested, Integer available) {
        super("Insufficient stock for product id " + productId +
              ": requested " + requested + ", available " + available);
    }
}
