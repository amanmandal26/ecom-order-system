package com.ecom.productservice.specification;

import com.ecom.productservice.entity.Product;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;

public class ProductSpecification {

    private ProductSpecification() {}

    /**
     * WHERE LOWER(name) LIKE '%search%' OR LOWER(description) LIKE '%search%'
     *
     * root.get("name") gives us the "name" column.
     * criteriaBuilder.lower() converts it to lower-case on the DB side.
     * criteriaBuilder.like() builds the LIKE predicate.
     * criteriaBuilder.or() combines name and description checks.
     */
    public static Specification<Product> nameOrDescriptionContains(String search) {
        return (root, query, cb) -> {
            String pattern = "%" + search.toLowerCase() + "%";
            return cb.or(
                cb.like(cb.lower(root.get("name")), pattern),
                cb.like(cb.lower(root.get("description")), pattern)
            );
        };
    }

    /**
     * WHERE price >= minPrice AND price <= maxPrice
     */
    public static Specification<Product> priceBetween(BigDecimal minPrice, BigDecimal maxPrice) {
        return (root, query, cb) -> cb.between(root.get("price"), minPrice, maxPrice);
    }

    /** WHERE price >= minPrice */
    public static Specification<Product> priceGreaterThanOrEqual(BigDecimal minPrice) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("price"), minPrice);
    }

    /** WHERE price <= maxPrice */
    public static Specification<Product> priceLessThanOrEqual(BigDecimal maxPrice) {
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("price"), maxPrice);
    }

    /** WHERE stock_quantity > 0 */
    public static Specification<Product> inStockOnly() {
        return (root, query, cb) -> cb.greaterThan(root.get("stockQuantity"), 0);
    }

    /** WHERE seller_id = sellerId */
    public static Specification<Product> bySeller(Long sellerId) {
        return (root, query, cb) -> cb.equal(root.get("sellerId"), sellerId);
    }

    /** WHERE LOWER(seller_name) LIKE '%sellerName%' */
    public static Specification<Product> bySellerName(String sellerName) {
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("sellerName")), "%" + sellerName.toLowerCase() + "%");
    }
}
