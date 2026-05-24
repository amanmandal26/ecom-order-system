#!/bin/bash

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}   E-Commerce Order System — Stopping All       ${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

for port in 8761 8081 8082 8083 8084 8080 3000; do
    pid=$(lsof -ti ":$port" 2>/dev/null)
    if [ -n "$pid" ]; then
        kill -9 $pid 2>/dev/null
        echo -e "  ${RED}Stopped${NC} port $port  (PID $pid)"
    else
        echo -e "  ${GREEN}Clear${NC}   port $port  (nothing running)"
    fi
done

echo ""
echo -e "${GREEN}All services stopped.${NC}"
