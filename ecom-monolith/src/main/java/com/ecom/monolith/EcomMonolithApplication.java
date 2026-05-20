package com.ecom.monolith;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * EcomMonolithApplication is the entry point for the E-Commerce Order Management System.
 *
 * @EnableJpaAuditing enables Spring Data JPA auditing for automatic
 * timestamp management via @CreatedDate and @LastModifiedDate annotations.
 * This ensures createdAt and updatedAt fields are populated automatically.
 */
@SpringBootApplication
@EnableJpaAuditing
public class EcomMonolithApplication {

    public static void main(String[] args) {
        SpringApplication.run(EcomMonolithApplication.class, args);
    }

}
