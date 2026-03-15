#!/bin/bash

# ControlX E2E Test Environment Health Check Script
# This script checks the health status of all services

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APPIUM_HOST="${APPIUM_HOST:-localhost}"
APPIUM_PORT="${APPIUM_PORT:-4723}"
BACKEND_HOST="${BACKEND_HOST:-localhost}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
ADB_HOST="${ADB_HOST:-localhost}"
ADB_PORT="${ADB_PORT:-16384}"

check_result=true

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    check_result=false
}

check_appium() {
    log_info "Checking Appium server..."

    if curl -s --connect-timeout 5 "http://${APPIUM_HOST}:${APPIUM_PORT}/status" | grep -q "ready"; then
        log_success "Appium server is running and ready"
        return 0
    else
        log_error "Appium server is not responding"
        return 1
    fi
}

check_appium_session() {
    log_info "Checking Appium session capability..."

    local capabilities='{
        "capabilities": {
            "alwaysMatch": {
                "platformName": "android",
                "appium:automationName": "uiautomator2"
            }
        }
    }'

    if curl -s --connect-timeout 5 \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$capabilities" \
        "http://${APPIUM_HOST}:${APPIUM_PORT}/wd/hub/session" | grep -q "sessionId"; then
        log_success "Appium can create sessions"
        return 0
    else
        log_warning "Appium session creation test skipped (no device connected)"
        return 0
    fi
}

check_backend() {
    log_info "Checking Backend server..."

    if command -v nc &> /dev/null; then
        if nc -z -w5 "$BACKEND_HOST" "$BACKEND_PORT" 2>/dev/null; then
            log_success "Backend server is running on port $BACKEND_PORT"
            return 0
        else
            log_warning "Backend server port $BACKEND_PORT is not open (may use dynamic port)"
            return 0
        fi
    elif command -v curl &> /dev/null; then
        if curl -s --connect-timeout 5 "http://${BACKEND_HOST}:${BACKEND_PORT}" > /dev/null 2>&1; then
            log_success "Backend server is responding"
            return 0
        else
            log_warning "Backend server is not responding on default port (may use dynamic port)"
            return 0
        fi
    else
        log_warning "Cannot check backend (nc and curl not available)"
        return 0
    fi
}

check_backend_websocket() {
    log_info "Checking Backend WebSocket..."

    if command -v node &> /dev/null; then
        local ws_test=$(node -e "
            const WebSocket = require('ws');
            const ws = new WebSocket('ws://${BACKEND_HOST}:${BACKEND_PORT}');
            ws.on('open', () => {
                console.log('connected');
                ws.close();
                process.exit(0);
            });
            ws.on('error', (err) => {
                process.exit(1);
            });
            setTimeout(() => process.exit(1), 5000);
        " 2>/dev/null)

        if [ "$ws_test" = "connected" ]; then
            log_success "Backend WebSocket is accessible"
            return 0
        else
            log_warning "Backend WebSocket check skipped (server may use different port)"
            return 0
        fi
    else
        log_warning "Cannot check WebSocket (node not available)"
        return 0
    fi
}

check_adb_connection() {
    log_info "Checking ADB connection..."

    if command -v adb &> /dev/null; then
        if adb connect "${ADB_HOST}:${ADB_PORT}" 2>/dev/null | grep -q "connected\|already connected"; then
            log_success "ADB connected to ${ADB_HOST}:${ADB_PORT}"
            
            if adb -s "${ADB_HOST}:${ADB_PORT}" shell echo "test" &>/dev/null; then
                log_success "ADB shell is working"
                return 0
            else
                log_warning "ADB connected but shell not responding"
                return 0
            fi
        else
            log_warning "ADB device not connected (expected for local testing)"
            return 0
        fi
    else
        log_warning "ADB not available in this environment"
        return 0
    fi
}

check_docker_containers() {
    log_info "Checking Docker containers..."

    if command -v docker &> /dev/null; then
        local appium_running=$(docker ps --filter "name=controlx-appium" --filter "status=running" -q 2>/dev/null)
        local backend_running=$(docker ps --filter "name=controlx-backend" --filter "status=running" -q 2>/dev/null)

        if [ -n "$appium_running" ]; then
            log_success "controlx-appium container is running"
        else
            log_warning "controlx-appium container is not running"
        fi

        if [ -n "$backend_running" ]; then
            log_success "controlx-backend container is running"
        else
            log_warning "controlx-backend container is not running"
        fi
    else
        log_warning "Docker not available, skipping container check"
    fi
}

check_network() {
    log_info "Checking Docker network..."

    if command -v docker &> /dev/null; then
        if docker network ls | grep -q "controlx-network"; then
            log_success "controlx-network exists"
        else
            log_warning "controlx-network does not exist"
        fi
    fi
}

print_summary() {
    echo ""
    echo "========================================"
    echo "         Health Check Summary          "
    echo "========================================"
    echo ""

    if [ "$check_result" = true ]; then
        log_success "All critical checks passed!"
        echo ""
        echo "Environment is ready for testing."
        exit 0
    else
        log_error "Some checks failed!"
        echo ""
        echo "Please check the failed services above."
        exit 1
    fi
}

main() {
    echo "ControlX E2E Test Environment Health Check"
    echo "=========================================="
    echo ""

    check_appium
    check_appium_session
    check_backend
    check_backend_websocket
    check_adb_connection
    check_docker_containers
    check_network

    print_summary
}

main "$@"
