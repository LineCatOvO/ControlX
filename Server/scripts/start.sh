#!/bin/bash

# ControlX Server 启动脚本
# 支持多种启动模式：开发、生产、PM2

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# 进入项目根目录
cd "$(dirname "$0")/.."

# 显示用法
show_usage() {
    echo "ControlX Server 启动脚本"
    echo ""
    echo "用法: $0 [模式]"
    echo ""
    echo "模式:"
    echo "  dev          开发模式（监听文件变化）"
    echo "  prod         生产模式（Node.js 直接运行）"
    echo "  pm2          PM2 生产模式"
    echo "  pm2:dev      PM2 开发模式（带文件监听）"
    echo "  pm2:test     PM2 测试模式"
    echo "  docker       Docker 容器模式"
    echo ""
    echo "示例:"
    echo "  $0 dev       # 开发模式"
    echo "  $0 prod      # 生产模式"
    echo "  $0 pm2       # PM2 生产模式"
}

# 检查 Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装"
        exit 1
    fi
    local version
    version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$version" -lt 20 ]; then
        print_error "需要 Node.js 20+，当前版本: $(node -v)"
        exit 1
    fi
    print_success "Node.js 版本: $(node -v)"
}

# 检查 pnpm
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm 未安装，请先安装: npm install -g pnpm"
        exit 1
    fi
    print_success "pnpm 版本: $(pnpm -v)"
}

# 检查构建产物
check_build() {
    if [ ! -d "dist" ] || [ ! -f "dist/app.js" ]; then
        print_warning "未找到构建产物，开始构建..."
        pnpm run build
    else
        print_success "构建产物已存在"
    fi
}

# 检查 PM2
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 未安装，正在安装..."
        npm install -g pm2
    fi
    print_success "PM2 版本: $(pm2 -v)"
}

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi
    print_success "Docker 版本: $(docker -v)"
}

# 开发模式
start_dev() {
    print_info "启动开发模式..."
    check_node
    check_pnpm
    pnpm install
    pnpm run dev
}

# 生产模式
start_prod() {
    print_info "启动生产模式..."
    check_node
    check_pnpm
    pnpm install --frozen-lockfile --prod
    check_build
    NODE_ENV=production node dist/app.js
}

# PM2 生产模式
start_pm2() {
    print_info "启动 PM2 生产模式..."
    check_node
    check_pnpm
    check_pm2
    pnpm install --frozen-lockfile --prod
    check_build
    pm2 start ecosystem.config.js --env production
    print_success "服务已启动，使用 'pm2 logs' 查看日志"
}

# PM2 开发模式
start_pm2_dev() {
    print_info "启动 PM2 开发模式..."
    check_node
    check_pnpm
    check_pm2
    pnpm install
    pnpm run build
    pm2 start ecosystem.config.js --only controlx-server-dev
}

# PM2 测试模式
start_pm2_test() {
    print_info "启动 PM2 测试模式..."
    check_node
    check_pnpm
    check_pm2
    pnpm install
    pnpm run build
    pm2 start ecosystem.config.js --only controlx-server-test
}

# Docker 模式
start_docker() {
    print_info "启动 Docker 模式..."
    check_docker

    if ! docker image inspect controlx-server:latest &> /dev/null; then
        print_warning "Docker 镜像不存在，开始构建..."
        docker build -t controlx-server:latest .
    fi

    # 检查容器是否已存在
    if docker ps -a --format '{{.Names}}' | grep -q "^controlx-server$"; then
        print_info "停止并删除现有容器..."
        docker stop controlx-server 2>/dev/null || true
        docker rm controlx-server 2>/dev/null || true
    fi

    print_info "启动 Docker 容器..."
    docker run -d \
        --name controlx-server \
        -p 3000:3000 \
        -p 28080:28080 \
        -e NODE_ENV=production \
        --restart unless-stopped \
        controlx-server:latest

    print_success "Docker 容器已启动"
    print_info "WebSocket: ws://localhost:3000"
    print_info "Web Monitor: http://localhost:28080"
    print_info "使用 'docker logs controlx-server' 查看日志"
}

# 主函数
main() {
    case "${1:-dev}" in
        dev)
            start_dev
            ;;
        prod|production)
            start_prod
            ;;
        pm2|pm2:prod)
            start_pm2
            ;;
        pm2:dev)
            start_pm2_dev
            ;;
        pm2:test)
            start_pm2_test
            ;;
        docker)
            start_docker
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
