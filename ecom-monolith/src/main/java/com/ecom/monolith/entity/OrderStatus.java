package com.ecom.monolith.entity;

public enum OrderStatus {
    PENDING,    // order placed, awaiting confirmation
    CONFIRMED,  // admin confirmed the order
    SHIPPED,    // order handed to courier
    DELIVERED,  // customer received the order
    CANCELLED   // order cancelled (only allowed from PENDING)
}
