# 🛍️ EcomShop — E-Commerce Order Management System

<p align="center">
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 17"/>
  <img src="https://img.shields.io/badge/Spring_Boot-3.2.4-6DB33F?style=for-the-badge&logo=spring&logoColor=white" alt="Spring Boot"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/RabbitMQ-3.x-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" alt="RabbitMQ"/>
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL"/>
</p>

<p align="center">
  A production-grade full-stack e-commerce platform built with Spring Boot Microservices architecture
</p>

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Microservices Overview](#-microservices-overview)
- [How to Run](#-how-to-run)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Author](#-author)

---

## ✨ Features

### Platform
- **Multi-seller marketplace** with three distinct roles — ADMIN, SELLER, and CUSTOMER
- **Public product browsing** without login (like Flipkart/Amazon)
- **Seller registration & approval workflow** — sellers apply, admin approves/rejects with email notification
- **Product detail pages** with unique URLs for SEO and shareability

### Security
- **JWT authentication** with role-based access control (Spring Security 6)
- **API Gateway** validates JWT once and forwards identity headers to all downstream services
- **Forgot password** flow with time-limited email reset links
- **Route-level guards** on frontend — CustomerRoute, SellerRoute, AdminRoute

### Backend
- **5 independent Spring Boot microservices** communicating via REST and messaging
- **Service Discovery** with Netflix Eureka — services register and discover each other dynamically
- **API Gateway** with Spring Cloud Gateway acting as the single entry point
- **Asynchronous messaging** with RabbitMQ — order events and stock alerts are non-blocking
- **Circuit Breaker** with Resilience4j — graceful degradation when product-service is down
- **Email notifications** via JavaMailSender — order confirmation for customers, approval/rejection for sellers, low stock alerts
- **Dynamic search & filter** using JPA Specifications — no combinatorial repository methods
- **Pagination and sorting** on all list endpoints (products and orders)
- **Seller-product ownership** — sellers can only manage their own products, with restock functionality

### Frontend
- **Flipkart-inspired UI** with React 18 — blue design system, category bar, product grid
- **Toast notifications** on cart actions
- **Skeleton loading** cards while data loads
- **Order status timeline** — visual progress from Placed → Confirmed → Shipped → Delivered
- **Mobile responsive** — collapses to single column with hidden category bar on small screens
- **Two-panel products page** — sticky filter sidebar (price chips, sort, availability) + product grid

---

## 🏗️ Architecture

```
                          ┌──────────────────────────────────────────┐
                          │           React Frontend : 3000           │
                          └──────────────────┬───────────────────────┘
                                             │  HTTP
                                             ▼
                          ┌──────────────────────────────────────────┐
                          │         API Gateway : 8080                │
                          │   (Spring Cloud Gateway + JWT Filter)     │
                          └──────┬────────┬───────────┬──────────────┘
                                 │        │           │
               ┌─────────────────┘        │           └──────────────────┐
               │                          │                              │
               ▼                          ▼                              ▼
  ┌────────────────────┐   ┌──────────────────────┐   ┌─────────────────────────┐
  │  User Service      │   │  Product Service     │   │  Order Service          │
  │  :8081             │   │  :8082               │   │  :8083                  │
  │                    │   │                      │   │                         │
  │  - Registration    │   │  - Product CRUD      │   │  - Place orders         │
  │  - Login / JWT     │   │  - Search + Filter   │   │  - Order lifecycle      │
  │  - Forgot password │   │  - Stock management  │   │  - Feign → product-svc  │
  │  - Seller workflow │   │  - Pagination        │   │  - Cancel orders        │
  └────────┬───────────┘   └──────────┬───────────┘   └───────────┬─────────────┘
           │                          │                            │
           ▼                          ▼                            │
    ┌─────────────┐           ┌─────────────┐                     │ RabbitMQ
    │  users_db   │           │ products_db │                     │ (order.placed
    │  MySQL:3307 │           │ MySQL:3308  │                     │  stock.low)
    └─────────────┘           └─────────────┘                     │
                                                                   ▼
                          ┌────────────────────┐    ┌───────────────────────────┐
                          │  orders_db         │    │  Notification Service     │
                          │  MySQL:3309        │    │  :8084                    │
                          └────────────────────┘    │                           │
                                                     │  - Consumes RabbitMQ     │
                                                     │  - Sends emails via SMTP │
                                                     │  - Order confirmations   │
                                                     │  - Seller alerts         │
                                                     └───────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────────────┐
  │                     Eureka Server : 8761                                      │
  │              (All services register and discover here)                        │
  └───────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────────────┐
  │                     RabbitMQ : 5672  │  Management UI : 15672                 │
  └───────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Category      | Technology                                              |
|---------------|---------------------------------------------------------|
| **Backend**   | Java 17, Spring Boot 3.2.4, Spring MVC, Spring Security 6 |
| **Frontend**  | React 18, React Router v6, Axios, CSS3                  |
| **Database**  | MySQL 8.0 (3 separate databases, one per service)       |
| **Messaging** | RabbitMQ 3.x with Spring AMQP                           |
| **Security**  | JWT (JJWT), BCrypt password hashing, Role-based auth    |
| **Cloud**     | Spring Cloud Gateway, Netflix Eureka, OpenFeign         |
| **Resilience**| Resilience4j Circuit Breaker                            |
| **Email**     | JavaMailSender with Gmail SMTP                          |
| **Infra**     | Docker, Docker Compose, Maven                           |
| **Docs**      | Swagger / SpringDoc OpenAPI 3                           |

---

## 🔧 Microservices Overview

| Service                  | Port  | Database      | Responsibility                                                      |
|--------------------------|-------|---------------|---------------------------------------------------------------------|
| **Eureka Server**        | 8761  | —             | Service registry — all microservices register and discover here     |
| **API Gateway**          | 8080  | —             | Single entry point; JWT validation; routes to downstream services   |
| **User Service**         | 8081  | `users_db`    | Registration, login, JWT issuance, seller registration & approval   |
| **Product Service**      | 8082  | `products_db` | Product CRUD, search/filter with JPA Specs, stock management        |
| **Order Service**        | 8083  | `orders_db`   | Order lifecycle, Feign calls to product-service for stock updates   |
| **Notification Service** | 8084  | —             | RabbitMQ consumer; sends order & seller email notifications         |

---

## 🚀 How to Run

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Java 17](https://adoptium.net/) (for running services outside Docker)
- [Node.js 18+](https://nodejs.org/) (for frontend development)
- [Maven 3.8+](https://maven.apache.org/)

### Option 1 — Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/amanmandal26/ecom-order-system.git
cd ecom-order-system

# 2. Start all services (databases, RabbitMQ, all microservices)
docker-compose up --build

# 3. Open the frontend
open http://localhost:3000        # React app
open http://localhost:8761        # Eureka Dashboard
open http://localhost:15672       # RabbitMQ Management (guest/guest)
```

### Option 2 — Run Services Manually

```bash
# Terminal 1 — Start infrastructure (MySQL + RabbitMQ only)
docker-compose up mysql-users mysql-products mysql-orders rabbitmq

# Terminal 2 — Eureka Server
cd eureka-server && mvn spring-boot:run

# Terminal 3 — API Gateway
cd api-gateway && mvn spring-boot:run

# Terminal 4 — User Service
cd user-service && mvn spring-boot:run

# Terminal 5 — Product Service
cd product-service && mvn spring-boot:run

# Terminal 6 — Order Service
cd order-service && mvn spring-boot:run

# Terminal 7 — Notification Service
cd notification-service && mvn spring-boot:run

# Terminal 8 — React Frontend
cd frontend && npm install && npm start
```

### Option 3 — Shell Scripts

```bash
chmod +x start-all.sh stop-all.sh
./start-all.sh     # Starts everything
./stop-all.sh      # Stops everything
```

### Default Test Accounts

| Role     | Email                     | Password  |
|----------|---------------------------|-----------|
| Admin    | admin@ecomshop.com        | admin123  |
| Seller   | seller@ecomshop.com       | seller123 |
| Customer | _(register at /register)_ | —         |

---

## 📡 API Endpoints

All requests go through the **API Gateway at `http://localhost:8080`**.

### Auth (User Service) — Public
| Method | Endpoint                    | Description                      |
|--------|-----------------------------|----------------------------------|
| POST   | `/api/auth/register`        | Register new customer account    |
| POST   | `/api/auth/login`           | Login and receive JWT token      |
| POST   | `/api/auth/forgot-password` | Send password reset email        |
| POST   | `/api/auth/reset-password`  | Reset password with token        |

### Sellers (User Service)
| Method | Endpoint                    | Auth          | Description                       |
|--------|-----------------------------|---------------|-----------------------------------|
| POST   | `/api/sellers/register`     | Public        | Apply to become a seller          |
| GET    | `/api/sellers/pending`      | ADMIN         | List pending seller applications  |
| GET    | `/api/sellers`              | ADMIN         | List all sellers                  |
| PUT    | `/api/sellers/approve`      | ADMIN         | Approve or reject a seller        |

### Products (Product Service)
| Method | Endpoint                          | Auth          | Description                          |
|--------|-----------------------------------|---------------|--------------------------------------|
| GET    | `/api/products`                   | Public        | Search & filter products (paginated) |
| GET    | `/api/products/{id}`              | Public        | Get single product details           |
| GET    | `/api/products/my-products`       | SELLER        | Seller's own product listing         |
| POST   | `/api/products`                   | SELLER        | Create a new product                 |
| PUT    | `/api/products/{id}`              | SELLER        | Update a product                     |
| PUT    | `/api/products/{id}/restock`      | SELLER        | Restock product inventory            |

**Search Parameters:** `search`, `minPrice`, `maxPrice`, `inStockOnly`, `page`, `size`, `sortBy`, `sortDir`

### Orders (Order Service)
| Method | Endpoint                        | Auth              | Description                      |
|--------|---------------------------------|-------------------|----------------------------------|
| POST   | `/api/orders`                   | CUSTOMER          | Place a new order                |
| GET    | `/api/orders/my-orders`         | CUSTOMER          | Get my orders (paginated)        |
| PUT    | `/api/orders/{id}/cancel`       | CUSTOMER          | Cancel a pending order           |
| PUT    | `/api/orders/{id}/status`       | ADMIN             | Update order status              |
| GET    | `/api/orders/{id}`              | ADMIN, CUSTOMER   | Get order by ID                  |

---

## 📁 Project Structure

```
ecom-order-system/
│
├── 📂 eureka-server/              # Service registry (port 8761)
│   └── src/main/java/com/ecom/eureka/
│
├── 📂 api-gateway/                # Entry point + JWT filter (port 8080)
│   └── src/main/java/com/ecom/gateway/
│       └── filter/JwtAuthFilter.java
│
├── 📂 user-service/               # Auth + seller management (port 8081)
│   └── src/main/java/com/ecom/userservice/
│       ├── controller/   (AuthController, SellerController)
│       ├── service/      (AuthService, SellerService)
│       ├── entity/       (User)
│       └── security/     (JwtUtil, SecurityConfig)
│
├── 📂 product-service/            # Product catalog + stock (port 8082)
│   └── src/main/java/com/ecom/productservice/
│       ├── controller/   (ProductController)
│       ├── service/      (ProductService)
│       ├── specification/(ProductSpecification — JPA Specs)
│       └── messaging/    (StockAlertPublisher)
│
├── 📂 order-service/              # Order lifecycle (port 8083)
│   └── src/main/java/com/ecom/orderservice/
│       ├── controller/   (OrderController)
│       ├── service/      (OrderService)
│       ├── client/       (ProductClient — Feign)
│       └── messaging/    (OrderEventPublisher)
│
├── 📂 notification-service/       # Email notifications (port 8084)
│   └── src/main/java/com/ecom/notification/
│       ├── consumer/     (OrderEventConsumer, StockAlertConsumer)
│       └── service/      (EmailService)
│
├── 📂 frontend/                   # React 18 SPA (port 3000)
│   └── src/
│       ├── pages/        (Landing, Products, ProductDetail, Cart, Orders,
│       │                  Login, Register, SellerDashboard, AdminDashboard)
│       ├── components/   (Navbar, UserAvatar, LoginPromptModal)
│       ├── context/      (AuthContext, ToastContext)
│       └── services/     (api.js — Axios instance)
│
├── docker-compose.yml             # One-command startup
├── start-all.sh                   # Start all services script
└── stop-all.sh                    # Stop all services script
```

---

## 📸 Screenshots

> Screenshots coming soon — full UI demo with product browsing, cart flow, seller dashboard, and admin panel.

---

## 🧠 Key Design Decisions

| Decision | Reason |
|----------|--------|
| **Separate DB per service** | True microservice isolation — services cannot directly query each other's data |
| **JWT validated at Gateway** | Single validation point; downstream services trust forwarded `X-User-*` headers |
| **RabbitMQ for notifications** | Order placement is non-blocking; notification failures don't affect the order flow |
| **JPA Specifications for search** | O(1) complexity regardless of filter combinations; no combinatorial repository methods needed |
| **Circuit Breaker on Order→Product** | If product-service is down, orders still return a friendly error instead of cascading failure |
| **Public product browsing** | Matches real e-commerce UX (Flipkart/Amazon); SEO-friendly product URLs |

---

## 👨‍💻 Author

**Aman Kumar**
Final Year IT Student | Aspiring Java Backend Developer

- 💼 **LinkedIn:** [linkedin.com/in/aman-mandal](https://linkedin.com/in/aman-mandal)
- 🐙 **GitHub:** [github.com/amanmandal26](https://github.com/amanmandal26)
- 📧 **Email:** amankumar260899@gmail.com

---

<p align="center">
  Built with ❤️ to learn microservices architecture and land a Java Backend Developer role.
  <br/>
  ⭐ Star this repo if you found it useful!
</p>
