# E-Commerce Monolith

Spring Boot 3 monolithic application for the E-Commerce Order Management System.

## Tech Stack
- Java 17
- Spring Boot 3.2.4
- Spring Data JPA
- Spring Security
- MySQL 8
- Maven
- Lombok

## Prerequisites
- Java 17 or higher
- Maven 3.6+
- MySQL 8

## Setup

1. Create database:
```sql
CREATE DATABASE ecom_monolith;
CREATE DATABASE ecom_monolith_dev;
```

2. Build the project:
```bash
mvn clean install
```

3. Run the application:
```bash
mvn spring-boot:run
```

4. Run with development profile:
```bash
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=dev"
```

## Project Structure
```
ecom-monolith/
├── src/
│   ├── main/
│   │   ├── java/com/ecom/monolith/
│   │   │   ├── entity/          # JPA entities
│   │   │   ├── dto/             # Data transfer objects
│   │   │   ├── controller/      # REST controllers
│   │   │   ├── service/         # Business logic
│   │   │   ├── repository/      # Data access
│   │   │   ├── security/        # Security config
│   │   │   ├── exception/       # Custom exceptions
│   │   │   └── util/            # Utility classes
│   │   └── resources/
│   │       ├── application.properties
│   │       └── application-dev.properties
│   └── test/
│       └── java/com/ecom/monolith/
├── pom.xml
└── README.md
```

## API Endpoints
- Will be documented as features are added

## License
Proprietary
