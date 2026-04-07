#!/bin/bash

# =============================================================================
# ControlX Android Client Build Script
# =============================================================================
#
# This script provides a unified interface for building the ControlX Android
# client application. It supports debug, release builds, testing, and more.
#
# Usage:
#   ./scripts/build-android.sh [command] [options]
#
# Commands:
#   debug          Build debug APK (default)
#   release        Build release APK
#   test           Run unit tests
#   lint           Run lint checks
#   clean          Clean build artifacts
#   install        Install debug APK to connected device
#   all            Full build: clean + test + debug
#   ci             CI build: lint + test + debug + release
#   help           Show help message
#
# Options:
#   --no-daemon    Disable Gradle daemon
#   --offline      Offline mode (use cached dependencies)
#   --info         Verbose output
#   --stacktrace   Show stacktrace on error
#   --profile      Generate build profile report
#
# Environment Variables:
#   ANDROID_HOME   Android SDK installation path
#   JAVA_HOME      Java installation path
#   CI             Set to 'true' for CI builds (non-interactive)
#
# Examples:
#   ./scripts/build-android.sh debug
#   ./scripts/build-android.sh release --info
#   ./scripts/build-android.sh ci --no-daemon
#   CI=true ./scripts/build-android.sh all

set -e

# =============================================================================
# Configuration
# =============================================================================

# Project paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/AndroidClient"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Gradle options
GRADLE_OPTS=()

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}============================================${NC}"
}

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

# Show usage information
show_usage() {
    cat << EOF
ControlX Android Client Build Script

Usage: $(basename "$0") [command] [options]

Commands:
  debug          Build debug APK (default)
  release        Build release APK
  test           Run unit tests
  lint           Run lint checks
  clean          Clean build artifacts
  install        Install debug APK to connected device
  all            Full build: clean + test + debug
  ci             CI build: lint + test + debug + release
  help           Show this help message

Options:
  --no-daemon    Disable Gradle daemon
  --offline      Offline mode (use cached dependencies)
  --info         Verbose output
  --stacktrace   Show stacktrace on error
  --profile      Generate build profile report
  -h, --help     Show this help message

Environment:
  ANDROID_HOME   Android SDK installation path
  JAVA_HOME      Java installation path
  CI             Set to 'true' for CI builds

Examples:
  $(basename "$0") debug              # Build debug APK
  $(basename "$0") release --info     # Build release with verbose output
  $(basename "$0") ci --no-daemon     # CI build without daemon
  CI=true $(basename "$0") all        # Non-interactive full build
EOF
}

# Check environment
check_environment() {
    print_header "Environment Check"

    # Check Java
    if [ -z "$JAVA_HOME" ]; then
        print_warning "JAVA_HOME is not set"
        if command -v java >/dev/null 2>&1; then
            print_info "Found java in PATH: $(java -version 2>&1 | head -n 1)"
        else
            print_error "Java is not installed"
            return 1
        fi
    else
        print_success "JAVA_HOME: $JAVA_HOME"
    fi

    # Check Android SDK
    if [ -z "$ANDROID_HOME" ]; then
        print_warning "ANDROID_HOME is not set"
    else
        print_success "ANDROID_HOME: $ANDROID_HOME"
    fi

    # Check Android project directory
    if [ ! -d "$ANDROID_DIR" ]; then
        print_error "Android project directory not found: $ANDROID_DIR"
        return 1
    fi
    print_success "Android project found: $ANDROID_DIR"

    # Check gradlew
    if [ ! -f "$ANDROID_DIR/gradlew" ]; then
        print_error "gradlew not found in $ANDROID_DIR"
        return 1
    fi

    # Make gradlew executable
    chmod +x "$ANDROID_DIR/gradlew"
    print_success "Gradle wrapper is ready"

    # Create local.properties if missing
    if [ ! -f "$ANDROID_DIR/local.properties" ] && [ -n "$ANDROID_HOME" ]; then
        print_info "Creating local.properties with ANDROID_HOME"
        echo "sdk.dir=$ANDROID_HOME" > "$ANDROID_DIR/local.properties"
    fi
}

# Parse options
parse_options() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-daemon)
                GRADLE_OPTS+=("--no-daemon")
                shift
                ;;
            --offline)
                GRADLE_OPTS+=("--offline")
                shift
                ;;
            --info)
                GRADLE_OPTS+=("--info")
                shift
                ;;
            --stacktrace)
                GRADLE_OPTS+=("--stacktrace")
                shift
                ;;
            --profile)
                GRADLE_OPTS+=("--profile")
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
}

# Run Gradle task
run_gradle() {
    local task="$1"
    shift

    print_info "Running: ./gradlew $task ${GRADLE_OPTS[*]} $*"
    echo ""

    (cd "$ANDROID_DIR" && ./gradlew "$task" "${GRADLE_OPTS[@]}" "$@")
}

# Print build time
print_build_time() {
    local start_time=$1
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))

    echo ""
    print_success "Build completed in ${minutes}m ${seconds}s"
}

# =============================================================================
# Build Commands
# =============================================================================

# Clean build artifacts
cmd_clean() {
    print_header "Cleaning Build Artifacts"
    run_gradle clean
    print_success "Clean completed"
}

# Build debug APK
cmd_debug() {
    print_header "Building Debug APK"
    run_gradle assembleDebug
    print_success "Debug build completed"

    local apk_path="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$apk_path" ]; then
        local apk_size=$(du -h "$apk_path" | cut -f1)
        print_info "APK: $apk_path ($apk_size)"
    fi
}

# Build release APK
cmd_release() {
    print_header "Building Release APK"
    run_gradle assembleRelease
    print_success "Release build completed"

    local apk_path="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$apk_path" ]; then
        local apk_size=$(du -h "$apk_path" | cut -f1)
        print_info "APK: $apk_path ($apk_size)"
    fi
}

# Run unit tests
cmd_test() {
    print_header "Running Unit Tests"
    run_gradle testDebugUnitTest --continue
    print_success "Tests completed"

    local report_path="$ANDROID_DIR/app/build/reports/tests/testDebugUnitTest/index.html"
    if [ -f "$report_path" ]; then
        print_info "Test report: file://$report_path"
    fi
}

# Run lint checks
cmd_lint() {
    print_header "Running Lint Checks"
    run_gradle lint
    print_success "Lint completed"

    local report_path="$ANDROID_DIR/app/build/reports/lint-results-debug.html"
    if [ -f "$report_path" ]; then
        print_info "Lint report: file://$report_path"
    fi
}

# Install debug APK to device
cmd_install() {
    print_header "Installing Debug APK"

    # Check for connected devices
    local devices=$(cd "$ANDROID_DIR" && ./gradlew devices 2>/dev/null | grep -c "device$" || echo "0")
    if [ "$devices" -eq 0 ]; then
        print_warning "No devices connected"
        print_info "Please connect a device or start an emulator"
        return 1
    fi

    run_gradle installDebug
    print_success "Installation completed"
}

# Full build: clean + test + debug
cmd_all() {
    local start_time=$(date +%s)

    cmd_clean
    cmd_test
    cmd_debug

    print_build_time $start_time
}

# CI build: lint + test + debug + release
cmd_ci() {
    local start_time=$(date +%s)

    print_header "CI Build"

    # Add CI-specific options
    GRADLE_OPTS+=("--no-daemon")
    
    cmd_clean
    cmd_lint
    cmd_test
    cmd_debug
    cmd_release

    print_build_time $start_time
}

# =============================================================================
# Main
# =============================================================================

main() {
    # Check if no arguments provided
    if [ $# -eq 0 ]; then
        COMMAND="debug"
    else
        COMMAND="$1"
        shift
    fi

    # Parse remaining options
    parse_options "$@"

    # Show banner
    print_header "ControlX Android Build"
    print_info "Project: $ANDROID_DIR"
    print_info "Command: $COMMAND"

    # Check environment
    check_environment

    # Execute command
    case "$COMMAND" in
        clean)
            cmd_clean
            ;;
        debug)
            cmd_debug
            ;;
        release)
            cmd_release
            ;;
        test)
            cmd_test
            ;;
        lint)
            cmd_lint
            ;;
        install)
            cmd_install
            ;;
        all)
            cmd_all
            ;;
        ci)
            cmd_ci
            ;;
        help|-h|--help)
            show_usage
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac

    echo ""
    print_success "All tasks completed successfully!"
}

# Run main function
main "$@"
