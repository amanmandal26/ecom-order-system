package com.ecom.productservice.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductSearchRequest {

    private String search;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private Boolean inStockOnly = false;
    private String sellerName;

    private int page = 0;
    private int size = 10;
    private String sortBy = "createdAt";
    private String sortDir = "desc";
}
