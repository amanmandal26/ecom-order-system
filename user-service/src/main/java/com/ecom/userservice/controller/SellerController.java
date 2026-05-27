package com.ecom.userservice.controller;

import com.ecom.userservice.dto.ApiResponse;
import com.ecom.userservice.dto.SellerApprovalRequest;
import com.ecom.userservice.dto.SellerRegistrationRequest;
import com.ecom.userservice.dto.SellerResponse;
import com.ecom.userservice.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sellers")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Seller Management", description = "Seller registration and admin approval endpoints")
public class SellerController {

    private final UserService userService;

    @Operation(
        summary = "Register as a seller",
        description = "Public endpoint — no JWT required. Submits application for admin review."
    )
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> registerAsSeller(
            @Valid @RequestBody SellerRegistrationRequest request) {
        log.info("Seller registration request: {}", request.getEmail());
        String message = userService.registerAsSeller(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(message, message));
    }

    @Operation(
        summary = "Approve or reject a seller",
        description = "ADMIN only. Send status=APPROVED or REJECTED, and an optional reason for rejections."
    )
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/approve")
    public ResponseEntity<ApiResponse<SellerResponse>> approveSeller(
            @RequestBody SellerApprovalRequest request) {
        log.info("Admin approval action on seller id={}: {}", request.getSellerId(), request.getStatus());
        SellerResponse response = userService.approveSeller(request);
        return ResponseEntity.ok(ApiResponse.ok("Seller status updated successfully", response));
    }

    @Operation(
        summary = "Get all pending seller applications",
        description = "ADMIN only. Returns sellers with status=PENDING."
    )
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<SellerResponse>>> getPendingSellers() {
        List<SellerResponse> sellers = userService.getPendingSellers();
        return ResponseEntity.ok(ApiResponse.ok("Pending sellers fetched", sellers));
    }

    @Operation(
        summary = "Get all sellers",
        description = "ADMIN only. Returns all sellers regardless of status."
    )
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<SellerResponse>>> getAllSellers() {
        List<SellerResponse> sellers = userService.getAllSellers();
        return ResponseEntity.ok(ApiResponse.ok("All sellers fetched", sellers));
    }
}
