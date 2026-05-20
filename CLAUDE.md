# Project: E-Commerce Order Management System

## My background
- Final year IT student, learning backend development for job placement
- Experience: Spring Boot, Spring Security, JWT, MySQL, Cucumber/Playwright (automation)
- Building this to learn microservices and get hired as a Java Backend Developer

## Tech Stack
- Backend: Java 17, Spring Boot 3.x, Spring Cloud
- Database: MySQL 8
- Messaging: RabbitMQ
- Frontend: React 18
- Infrastructure: Docker, Docker Compose

## Project Structure
- eureka-server: Service registry (Spring Cloud Netflix Eureka)
- api-gateway: Single entry point (Spring Cloud Gateway + JWT filter)
- user-service: Registration, login, JWT auth — database: users_db
- product-service: Product catalog, stock management — database: products_db
- order-service: Order lifecycle, Feign calls to product-service — database: orders_db
- notification-service: RabbitMQ consumer, sends email on order events
- frontend: React app with Login, Products, Cart, Orders pages

## Coding Rules
- Always use package name: com.ecom.<servicename>
- Always use Lombok (@Data, @Builder, @RequiredArgsConstructor)
- Always include proper exception handling with custom exceptions
- Always explain what you are doing and why, step by step
- Use REST best practices: proper HTTP verbs, status codes, response wrappers
- Every entity must have: id (Long, auto-increment), createdAt, updatedAt
- Java version: 17 (even though machine has Java 23, use 17 in pom.xml)

## Current Phase
Phase 1 — Building the monolith first (all features in one Spring Boot app called ecom-monolith)