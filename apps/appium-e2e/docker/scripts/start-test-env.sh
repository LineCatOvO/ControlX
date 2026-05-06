#!/bin/bash

# ControlX E2E Test Environment Startup Script
# This script starts the Docker-based test environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi

    log_success "Docker is available and running"
}

check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        log_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi

    log_success "Docker Compose is available"
}

wait_for_service() {
    local service_name=$1
    local max_retries=30
    local retry_count=0

    log_info "Waiting for $service_name to be ready..."

    while [ $retry_count -lt $max_retries ]; do
        if docker ps --filter "name=$service_name" --filter "status=running" | grep -q "$service_name"; then
            log_success "$service_name is running"
            return 0
        fi
        retry_count=$((retry_count + 1))
        sleep 2
    done

    log_error "$service_name failed to start within timeout"
    return 1
}

wait_for_appium() {
    local max_retries=30
    local retry_count=0

    log_info "Waiting for Appium to be ready..."

    while [ $retry_count -lt $max_retries ]; do
        if curl -s http://localhost:4723/status | grep -q "ready"; then
            log_success "Appium is ready"
            return 0
        fi
        retry_count=$((retry_count + 1))
        sleep 2
    done

    log_error "Appium failed to start within timeout"
    return 1
}

start_environment() {
    log_info "Starting ControlX E2E test environment..."

    cd "$PROJECT_DIR/appium-e2e"

    log_info "Building Docker images..."
    $COMPOSE_CMD build

    log_info "Starting services..."
    $COMPOSE_CMD up -d

    log_info "Waiting for services to be ready..."
    wait_for_service "controlx-appium"
    wait_for_appium
    wait_for_service "controlx-backend"

    log_success "Test environment is ready!"
    echo ""
    echo "Services:"
    echo "  - Appium: http://localhost:4723"
    echo "  - Backend: Dynamic port (check logs)"
    echo ""
    echo "To view logs: $COMPOSE_CMD logs -f"
    echo "To stop: $COMPOSE_CMD down"
}

stop_environment() {
    log_info "Stopping ControlX E2E test environment..."

    cd "$PROJECT_DIR/appium-e2e"
    $COMPOSE_CMD down

    log_success "Test environment stopped"
}

show_status() {
    log_info "Checking test environment status..."

    cd "$PROJECT_DIR/appium-e2e"
    $COMPOSE_CMD ps

    echo ""
    log_info "Appium Status:"
    if curl -s http://localhost:4723/status 2>/dev/null; then
        echo ""
    else
        log_warning "Appium is not responding"
    fi
}

show_logs() {
    cd "$PROJECT_DIR/appium-e2e"
    $COMPOSE_CMD logs -f "$@"
}

case "${1:-start}" in
    start)
        check_docker
        check_docker_compose
        start_environment
        ;;
    stop)
        check_docker
        check_docker_compose
        stop_environment
        ;;
    restart)
        check_docker
        check_docker_compose
        stop_environment
        start_environment
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${@:2}"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the test environment"
        echo "  stop    - Stop the test environment"
        echo "  restart - Restart the test environment"
        echo "  status  - Show environment status"
        echo "  logs    - Show logs (optional: appium, backend)"
        exit 1
        ;;
esac
