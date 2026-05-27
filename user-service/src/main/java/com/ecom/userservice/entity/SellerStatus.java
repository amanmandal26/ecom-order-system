package com.ecom.userservice.entity;

public enum SellerStatus {
    PENDING,    // submitted application, waiting for admin review
    APPROVED,   // admin approved — seller can log in and list products
    REJECTED    // admin rejected — seller is notified with a reason
}
