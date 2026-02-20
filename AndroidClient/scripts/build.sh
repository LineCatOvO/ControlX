#!/bin/bash

# ControlX Android 客户端构建脚本
# 用法：./scripts/build.sh [debug|release|test|clean|install|all]

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
    echo "  debug        构建 Debug 版本"
    echo "  release      构建 Release 版本"
    echo "  test         运行单元测试"
    echo "  lint         代码检查"
    echo "  clean        清理构建产物"
    echo "  install      安装到设备"
    echo "  all          完整构建 (清理 + 测试 + Debug)"
    echo ""
    echo "示例:"
    echo "  $0 debug     # 构建 Debug 版本"
    echo "  $0 release   # 构建 Release 版本"
    echo "  $0 install   # 安装到设备"
    echo "  $0 all       # 完整构建"
}

# 检查环境变量
check_env() {
    # 检查 JAVA_HOME
    if [ -z "$JAVA_HOME" ]; then
        print_warning "JAVA_HOME 未设置，可能影响构建"
    fi
    
    # 检查 ANDROID_HOME
    if [ -z "$ANDROID_HOME" ]; then
        print_warning "ANDROID_HOME 未设置，可能影响构建"
    fi
    
    # 检查 gradlew
    if [ ! -f "./gradlew" ]; then
        print_error "gradlew 不存在，请确认在正确的目录运行"
        exit 1
    fi
}

# 清理
clean_build() {
    print_info "清理构建产物..."
    ./gradlew clean
    print_success "清理完成"
}

# 构建 Debug 版本
build_debug() {
    print_info "构建 Debug 版本..."
    ./gradlew assembleDebug
    print_success "Debug 构建完成"
    print_info "输出文件：app/build/outputs/apk/debug/app-debug.apk"
}

# 构建 Release 版本
build_release() {
    print_info "构建 Release 版本..."
    ./gradlew assembleRelease
    print_success "Release 构建完成"
    print_info "输出文件：app/build/outputs/apk/release/app-release.apk"
}

# 运行测试
run_tests() {
    print_info "运行单元测试..."
    ./gradlew testDebugUnitTest
    print_success "测试完成"
    print_info "测试报告：app/build/reports/tests/testDebugUnitTest/index.html"
}

# 代码检查
run_lint() {
    print_info "运行代码检查..."
    ./gradlew lint
    print_success "代码检查完成"
    print_info "检查报告：app/build/reports/lint-results-debug.html"
}

# 安装到设备
install_debug() {
    print_info "安装 Debug 版本到设备..."
    ./gradlew installDebug
    print_success "安装完成"
}

# 完整构建
full_build() {
    print_info "开始完整构建..."
    
    # 清理
    clean_build
    
    # 测试
    run_tests
    
    # 构建 Debug
    build_debug
    
    print_success "完整构建完成！"
}

# 主函数
main() {
    check_env
    
    case "${1:-all}" in
        debug)
            build_debug
            ;;
        release)
            build_release
            ;;
        test)
            run_tests
            ;;
        lint)
            run_lint
            ;;
        clean)
            clean_build
            ;;
        install)
            install_debug
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
