-- =====================================================
-- E-Commerce Order Management System - Database Schema
-- =====================================================
-- This schema defines the core tables for the e-commerce
-- monolith application. All tables follow audit pattern
-- with created_at and updated_at timestamps.
-- =====================================================

-- DROP TABLES IF THEY EXIST (comment out if you want to preserve data)
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS products;
-- DROP TABLE IF EXISTS users;

-- =====================================================
-- TABLE: users
-- =====================================================
-- Purpose: Stores user account information and authentication data
-- 
-- Why we need it:
-- - Central user registry for the e-commerce platform
-- - Supports role-based access control (ADMIN vs CUSTOMER)
-- - Stores credentials for authentication and authorization
-- - Enables audit trail with timestamps
-- - Links to orders table via foreign key relationship
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: products
-- =====================================================
-- Purpose: Maintains the product catalog with pricing and inventory
--
-- Why we need it:
-- - Single source of truth for product information
-- - Tracks available inventory (stock_quantity)
-- - Enables product search and filtering in the storefront
-- - Supports order fulfillment and stock management
-- - Price stored at product level for reference
--   (actual order price stored separately in order_items for historical accuracy)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_price (price),
    INDEX idx_stock_quantity (stock_quantity),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: orders
-- =====================================================
-- Purpose: Tracks customer orders and their lifecycle
--
-- Why we need it:
-- - Core transaction record for the business
-- - Maintains order status workflow (PENDING → CONFIRMED → SHIPPED → DELIVERED)
-- - Supports order history and tracking for customers
-- - Enables business analytics (sales, order volume, metrics)
-- - Links users to multiple orders (one-to-many relationship)
-- - Status field enables order fulfillment pipeline
-- - total_amount denormalized for performance (sum of order_items in real-time would be inefficient)
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: order_items
-- =====================================================
-- Purpose: Breakdown of products within each order (junction table)
--
-- Why we need it:
-- - Normalizes many-to-many relationship between orders and products
-- - Enables orders to contain multiple products
-- - Stores historical price per item (unit_price)
--   (decoupled from current product price in case prices change)
-- - Tracks quantity per product in the order
-- - Supports order detail viewing and invoicing
-- - Enables product-level analytics (top-selling products, revenue per product)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    
    CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_order_items_product_id FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE KEY uk_order_product (order_id, product_id),
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Database Notes and Best Practices
-- =====================================================
-- 1. InnoDB Engine: Used for ACID compliance and foreign key support
-- 2. UTF8MB4: Full UTF-8 support for international characters and emojis
-- 3. Indexes:
--    - Foreign keys are indexed for JOIN performance
--    - Status fields indexed for filtering
--    - created_at indexed for sorting/pagination
--    - Composite indexes (uk_order_product, idx_user_created) for common queries
-- 4. DECIMAL(10,2): Used for prices to avoid floating-point precision issues
-- 5. ENUM: Used for role and status to enforce valid values
-- 6. Audit Columns: created_at and updated_at on all tables for auditing
-- 7. Auto-increment: BIGINT for future scalability
-- =====================================================
