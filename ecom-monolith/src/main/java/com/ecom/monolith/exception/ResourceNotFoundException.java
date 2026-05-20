package com.ecom.monolith.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " not found with id: " + id);
    }

    // Used when the lookup key is a String (e.g., email address) rather than a numeric id.
    public ResourceNotFoundException(String resourceName, String identifier) {
        super(resourceName + " not found: " + identifier);
    }
}
