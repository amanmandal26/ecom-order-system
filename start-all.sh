#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}   E-Commerce Order System — Starting Up        ${NC}"
echo -e "${YELLOW}================================================${NC}"

# ── Create logs directory ──────────────────────────────────────────────────────
mkdir -p "$ROOT/logs"

# ── Clear previous logs and stamp with run timestamp ──────────────────────────
echo "Clearing previous logs..."
for svc in eureka user-service product-service order-service notification-service api-gateway frontend; do
    > "$ROOT/logs/$svc.log"
    echo "=== Started at $(date) ===" >> "$ROOT/logs/$svc.log"
done
echo "Logs cleared. Starting fresh..."

# ── Kill anything already on our ports ────────────────────────────────────────
echo -e "\n${YELLOW}Clearing ports 8080 8081 8082 8083 8084 8761 3000...${NC}"
for port in 8080 8081 8082 8083 8084 8761 3000; do
    pid=$(lsof -ti ":$port" 2>/dev/null)
    if [ -n "$pid" ]; then
        kill -9 $pid 2>/dev/null
        echo -e "  ${RED}Killed PID $pid on port $port${NC}"
    fi
done
sleep 1

# ── 1. Eureka Server ──────────────────────────────────────────────────────────
echo -e "\n${CYAN}[1/6] Starting Eureka Server  (port 8761)...${NC}"
(cd "$ROOT/eureka-server" && mvn spring-boot:run) > "$ROOT/logs/eureka.log" 2>&1 &
echo -e "      Log → logs/eureka.log"
echo -e "      Waiting 15 s for Eureka to be ready..."
sleep 15

# ── 2–5. Backend microservices (start in parallel) ────────────────────────────
echo -e "\n${CYAN}[2/6] Starting User Service        (port 8081)...${NC}"
(cd "$ROOT/user-service" && mvn spring-boot:run) > "$ROOT/logs/user-service.log" 2>&1 &
echo -e "      Log → logs/user-service.log"

echo -e "\n${CYAN}[3/6] Starting Product Service     (port 8082)...${NC}"
(cd "$ROOT/product-service" && mvn spring-boot:run) > "$ROOT/logs/product-service.log" 2>&1 &
echo -e "      Log → logs/product-service.log"

echo -e "\n${CYAN}[4/6] Starting Order Service       (port 8083)...${NC}"
(cd "$ROOT/order-service" && mvn spring-boot:run) > "$ROOT/logs/order-service.log" 2>&1 &
echo -e "      Log → logs/order-service.log"

echo -e "\n${CYAN}[5/6] Starting Notification Service (port 8084)...${NC}"
(cd "$ROOT/notification-service" && mvn spring-boot:run) > "$ROOT/logs/notification-service.log" 2>&1 &
echo -e "      Log → logs/notification-service.log"

echo -e "\n      Waiting 20 s for all services to register with Eureka..."
sleep 20

# ── 6. API Gateway ────────────────────────────────────────────────────────────
echo -e "\n${CYAN}[6/6] Starting API Gateway         (port 8080)...${NC}"
(cd "$ROOT/api-gateway" && mvn spring-boot:run) > "$ROOT/logs/api-gateway.log" 2>&1 &
echo -e "      Log → logs/api-gateway.log"
echo -e "      Waiting 10 s for gateway to start..."
sleep 10

# ── 7. React Frontend ─────────────────────────────────────────────────────────
echo -e "\n${CYAN}[7/7] Starting React Frontend      (port 3000)...${NC}"
(cd "$ROOT/frontend" && npm start) > "$ROOT/logs/frontend.log" 2>&1 &
echo -e "      Log → logs/frontend.log"

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}   All services started!                        ${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e ""
echo -e "${CYAN}  Frontend:         ${NC}http://localhost:3000"
echo -e "${CYAN}  Eureka Dashboard: ${NC}http://localhost:8761"
echo -e "${CYAN}  RabbitMQ UI:      ${NC}http://localhost:15672"
echo -e "${CYAN}  API Gateway:      ${NC}http://localhost:8080"
echo -e ""
echo -e "${CYAN}  Swagger — User:   ${NC}http://localhost:8081/swagger-ui.html"
echo -e "${CYAN}  Swagger — Product:${NC}http://localhost:8082/swagger-ui.html"
echo -e "${CYAN}  Swagger — Order:  ${NC}http://localhost:8083/swagger-ui.html"
echo -e ""
echo -e "${YELLOW}  Logs folder: $ROOT/logs/${NC}"
echo -e "    eureka.log  user-service.log  product-service.log"
echo -e "    order-service.log  notification-service.log"
echo -e "    api-gateway.log  frontend.log"
echo -e ""
echo -e "${YELLOW}  Tip: tail -f logs/<name>.log  to watch a service${NC}"
