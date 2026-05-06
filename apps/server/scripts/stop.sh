#!/bin/bash

# ControlX Server 停止脚本
# 支持多种停止模式

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# 进入项目根目录
cd "$(dirname "$0")/.."

show_usage() {
    echo "ControlX Server 停止脚本"
    echo ""
    echo "用法: $0 [模式]"
    echo ""
    echo "模式:"
    echo "  pm2          停止所有 PM2 进程"
    echo "  pm2:dev      停止 PM2 开发模式"
    echo "  pm2:test     停止 PM2 测试模式"
    echo "  docker       停止 Docker 容器"
    echo "  all          停止所有模式"
    echo ""
    echo "示例:"
    echo "  $0 pm2       # 停止 PM2 进程"
    echo "  $0 docker    # 停止 Docker 容器"
    echo "  $0 all       # 停止所有"
}

# 停止 PM2 生产模式
stop_pm2() {
    print_info "停止 PM2 生产模式..."
    if pm2 list | grep -q "controlx-server"; then
        pm2 stop ecosystem.config.js
        pm2 delete ecosystem.config.js
        print_success "PM2 生产模式已停止"
    else
        print_warning "PM2 生产模式未运行"
    fi
}

# 停止 PM2 开发模式
stop_pm2_dev() {
    print_info "停止 PM2 开发模式..."
    if pm2 list | grep -q "controlx-server-dev"; then
        pm2 stop controlx-server-dev
        pm2 delete controlx-server-dev
        print_success "PM2 开发模式已停止"
    else
        print_warning "PM2 开发模式未运行"
    fi
}

# 停止 PM2 测试模式
stop_pm2_test() {
    print_info "停止 PM2 测试模式..."
    if pm2 list | grep -q "controlx-server-test"; then
        pm2 stop controlx-server-test
        pm2 delete controlx-server-test
        print_success "PM2 测试模式已停止"
    else
        print_warning "PM2 测试模式未运行"
    fi
}

# 停止 Docker
stop_docker() {
    print_info "停止 Docker 容器..."
    if docker ps -q -f name=controlx-server | grep -q .; then
        docker stop controlx-server
        docker rm controlx-server
        print_success "Docker 容器已停止"
    else
        print_warning "Docker 容器未运行"
    fi
}

# 停止所有
stop_all() {
    print_info "停止所有服务..."
    stop_pm2_dev 2>/dev/null || true
    stop_pm2_test 2>/dev/null || true
    stop_pm2 2>/dev/null || true
    stop_docker 2>/dev/null || true
    print_success "所有服务已停止"
}

# 主函数
main() {
    case "${1:-pm2}" in
        pm2)
            stop_pm2
            ;;
        pm2:dev)
            stop_pm2_dev
            ;;
        pm2:test)
            stop_pm2_test
            ;;
        docker)
            stop_docker
            ;;
        all)
            stop_all
            ;;
        help|-h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "未知模式: $1"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
