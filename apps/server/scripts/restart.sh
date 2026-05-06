#!/bin/bash

# ControlX Server 重启脚本

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

# 进入项目根目录
cd "$(dirname "$0")/.."

show_usage() {
    echo "ControlX Server 重启脚本"
    echo ""
    echo "用法: $0 [模式]"
    echo ""
    echo "模式:"
    echo "  pm2          重载 PM2 配置"
    echo "  docker       重启 Docker 容器"
    echo ""
    echo "示例:"
    echo "  $0 pm2       # 重载 PM2"
    echo "  $0 docker    # 重启 Docker"
}

# 重启 PM2
restart_pm2() {
    print_info "重载 PM2..."
    pm2 reload ecosystem.config.js
    print_success "PM2 已重载"
}

# 重启 Docker
restart_docker() {
    print_info "重启 Docker 容器..."
    if docker ps -q -f name=controlx-server | grep -q .; then
        docker stop controlx-server
        docker start controlx-server
        print_success "Docker 容器已重启"
    else
        print_warning "Docker 容器未运行，使用 start.sh docker 启动"
    fi
}

# 主函数
main() {
    case "${1:-pm2}" in
        pm2)
            restart_pm2
            ;;
        docker)
            restart_docker
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
