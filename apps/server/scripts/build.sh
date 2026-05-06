#!/bin/bash

# ControlX Server 端构建脚本
# 用法：./scripts/build.sh [dev|build|test|clean|all]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 进入项目根目录
cd "$(dirname "$0")/.."

# 显示用法
show_usage() {
    echo "用法：$0 [命令]"
    echo ""
    echo "命令:"
    echo "  dev      开发模式 (监听文件变化)"
    echo "  build    生产构建"
    echo "  test     运行测试"
    echo "  clean    清理构建产物"
    echo "  all      完整构建 (清理 + 测试 + 构建)"
    echo "  start    运行服务"
    echo ""
    echo "示例:"
    echo "  $0 dev     # 开发模式"
    echo "  $0 build   # 生产构建"
    echo "  $0 all     # 完整构建"
}

# 检查 Node.js 版本
check_node_version() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js >= 20.x"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_warning "Node.js 版本 $NODE_VERSION 低于推荐版本 20.x"
    fi
}

# 检查 pnpm
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm 未安装，使用 npm 代替"
        PM_CMD="npm"
    else
        PM_CMD="pnpm"
    fi
}

# 安装依赖
install_deps() {
    print_info "安装依赖..."
    $PM_CMD install
    print_success "依赖安装完成"
}

# 开发模式
dev_mode() {
    print_info "启动开发模式..."
    $PM_CMD run dev
}

# 生产构建
build_prod() {
    print_info "进行生产构建..."
    $PM_CMD run build
    print_success "构建完成，输出目录：dist/"
}

# 运行测试
run_tests() {
    print_info "运行测试..."
    $PM_CMD test
    print_success "测试完成"
}

# 清理
clean_build() {
    print_info "清理构建产物..."
    rm -rf dist/
    rm -rf node_modules/
    print_success "清理完成"
}

# 运行服务
start_server() {
    print_info "启动服务..."
    $PM_CMD start
}

# 完整构建
full_build() {
    print_info "开始完整构建..."
    
    # 清理
    clean_build
    
    # 安装依赖
    install_deps
    
    # 测试
    run_tests
    
    # 构建
    build_prod
    
    print_success "完整构建完成！"
}

# 主函数
main() {
    check_node_version
    check_pnpm
    
    case "${1:-all}" in
        dev)
            install_deps
            dev_mode
            ;;
        build)
            install_deps
            build_prod
            ;;
        test)
            install_deps
            run_tests
            ;;
        clean)
            clean_build
            ;;
        start)
            start_server
            ;;
        all)
            full_build
            ;;
        help|-h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "未知命令：$1"
            show_usage
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
