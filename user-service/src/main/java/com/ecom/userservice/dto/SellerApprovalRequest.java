package com.ecom.userservice.dto;

import com.ecom.userservice.entity.SellerStatus;
import lombok.Data;

@Data
public class SellerApprovalRequest {

    private Long sellerId;
    private SellerStatus status;   // APPROVED or REJECTED
    private String reason;         // optional — used in rejection email
}
