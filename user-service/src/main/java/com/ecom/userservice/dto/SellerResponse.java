package com.ecom.userservice.dto;

import com.ecom.userservice.entity.SellerStatus;
import com.ecom.userservice.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SellerResponse {

    private Long id;
    private String name;
    private String email;
    private String businessName;
    private String businessDescription;
    private SellerStatus sellerStatus;
    private LocalDateTime sellerRequestedAt;
    private LocalDateTime sellerApprovedAt;
    private String role;

    public static SellerResponse fromUser(User user) {
        return SellerResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .businessName(user.getBusinessName())
                .businessDescription(user.getBusinessDescription())
                .sellerStatus(user.getSellerStatus())
                .sellerRequestedAt(user.getSellerRequestedAt())
                .sellerApprovedAt(user.getSellerApprovedAt())
                .role(user.getRole().name())
                .build();
    }
}
