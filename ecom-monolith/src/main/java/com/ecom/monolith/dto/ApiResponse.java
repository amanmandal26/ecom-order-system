package com.ecom.monolith.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

/**
 * Generic API response envelope used by every endpoint.
 *
 * Shape:
 * {
 *   "success": true,
 *   "message": "User registered successfully",
 *   "data": { ... }          // null on error responses
 * }
 *
 * Use the static factory methods (ok / error) instead of the builder directly
 * so call-sites stay concise.
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final String message;
    private final T data;

    public static <T> ApiResponse<T> ok(String message, T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .message(message)
            .data(data)
            .build();
    }

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
            .success(false)
            .message(message)
            .build();
    }
}
