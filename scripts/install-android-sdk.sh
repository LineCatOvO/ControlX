#!/bin/bash

# =============================================================================
# ControlX Android SDK Installation Script
# =============================================================================
#
# This script installs the Android SDK for ARM64 and x86_64 architectures.
# It supports Linux ARM64 (aarch64) and x86_64 hosts.
#
# Usage:
#   ./scripts/install-android-sdk.sh [options]
#
# Options:
#   -h, --help          Show this help message
#   -p, --path PATH     Set Android SDK installation path (default: $HOME/Android/Sdk)
#   -a, --api API       Set Android API level (default: 34)
#   -b, --build-tools   Set build tools version (default: 34.0.0)
#   -n, --ndk VERSION   Install NDK with specified version
#   -e, --emulator      Install emulator and system images
#   --force             Force reinstallation even if SDK exists
#
# Environment Variables:
#   ANDROID_HOME        Target SDK installation directory
#   JAVA_HOME           Java installation directory (required)
#
# Examples:
#   ./scripts/install-android-sdk.sh
#   ./scripts/install-android-sdk.sh --path /opt/android-sdk --api 35
#   ./scripts/install-android-sdk.sh --ndk 26.1.10909125 --emulator

set -e

# =============================================================================
# Configuration
# =============================================================================

# Default values
DEFAULT_SDK_PATH="${ANDROID_HOME:-$HOME/Android/Sdk}"
DEFAULT_API_LEVEL="34"
DEFAULT_BUILD_TOOLS="34.0.0"
DEFAULT_CMDLINE_TOOLS_VERSION="11076708"

# User options
SDK_PATH="$DEFAULT_SDK_PATH"
API_LEVEL="$DEFAULT_API_LEVEL"
BUILD_TOOLS="$DEFAULT_BUILD_TOOLS"
INSTALL_NDK=false
NDK_VERSION=""
INSTALL_EMULATOR=false
FORCE_REINSTALL=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

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

print_header() {
    echo ""
    echo "============================================"
    echo "  $1"
    echo "============================================"
}

# Detect system architecture
detect_arch() {
    local arch=$(uname -m)
    case "$arch" in
        x86_64)
            echo "x86_64"
            ;;
        aarch64|arm64)
            echo "arm64"
            ;;
        *)
            print_error "Unsupported architecture: $arch"
            exit 1
            ;;
    esac
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check Java
    if [ -z "$JAVA_HOME" ]; then
        print_warning "JAVA_HOME is not set"
        if command_exists java; then
            print_info "Found java in PATH: $(java -version 2>&1 | head -n 1)"
        else
            print_error "Java is not installed. Please install JDK 11 or higher."
            print_info "Recommended: JetBrains Runtime (JBR) for ARM64"
            exit 1
        fi
    else
        print_success "JAVA_HOME is set: $JAVA_HOME"
    fi

    # Check curl or wget
    if ! command_exists curl && ! command_exists wget; then
        print_error "Neither curl nor wget is installed. Please install one of them."
        exit 1
    fi

    # Check unzip
    if ! command_exists unzip; then
        print_error "unzip is not installed. Please install unzip."
        exit 1
    fi

    print_success "Prerequisites check passed"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -p|--path)
                SDK_PATH="$2"
                shift 2
                ;;
            -a|--api)
                API_LEVEL="$2"
                shift 2
                ;;
            -b|--build-tools)
                BUILD_TOOLS="$2"
                shift 2
                ;;
            -n|--ndk)
                INSTALL_NDK=true
                NDK_VERSION="${2:-26.1.10909125}"
                shift 2
                ;;
            -e|--emulator)
                INSTALL_EMULATOR=true
                shift
                ;;
            --force)
                FORCE_REINSTALL=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help
show_help() {
    cat << EOF
ControlX Android SDK Installation Script

Usage: $0 [options]

Options:
  -h, --help          Show this help message
  -p, --path PATH     Set Android SDK installation path
                      (default: $DEFAULT_SDK_PATH)
  -a, --api API       Set Android API level (default: $DEFAULT_API_LEVEL)
  -b, --build-tools   Set build tools version (default: $DEFAULT_BUILD_TOOLS)
  -n, --ndk VERSION   Install NDK with specified version
  -e, --emulator      Install emulator and system images
  --force             Force reinstallation even if SDK exists

Examples:
  $0                          # Install with defaults
  $0 --path /opt/android-sdk  # Install to custom path
  $0 --api 35 --ndk 26.1.10909125  # Install API 35 with NDK
EOF
}

# Download file with curl or wget
download_file() {
    local url="$1"
    local output="$2"

    if command_exists curl; then
        curl -fsSL "$url" -o "$output"
    else
        wget -q "$url" -O "$output"
    fi
}

# Install Android SDK Command Line Tools
install_cmdline_tools() {
    print_header "Installing Android SDK Command Line Tools"

    local arch=$(detect_arch)
    local tools_url="https://dl.google.com/android/repository/commandlinetools-linux-${DEFAULT_CMDLINE_TOOLS_VERSION}_latest.zip"
    local temp_dir=$(mktemp -d)

    print_info "Downloading Command Line Tools for $arch..."
    print_info "URL: $tools_url"

    download_file "$tools_url" "$temp_dir/cmdline-tools.zip"

    print_info "Extracting..."
    mkdir -p "$SDK_PATH/cmdline-tools"
    unzip -q "$temp_dir/cmdline-tools.zip" -d "$temp_dir"
    mv "$temp_dir/cmdline-tools" "$SDK_PATH/cmdline-tools/latest"
    rm -rf "$temp_dir"

    print_success "Command Line Tools installed"
}

# Install SDK components
install_sdk_components() {
    print_header "Installing SDK Components"

    export ANDROID_HOME="$SDK_PATH"
    export PATH="$SDK_PATH/cmdline-tools/latest/bin:$SDK_PATH/platform-tools:$PATH"

    print_info "Accepting licenses..."
    yes | sdkmanager --licenses || true

    print_info "Installing platform-tools..."
    sdkmanager "platform-tools"

    print_info "Installing Android platform (API $API_LEVEL)..."
    sdkmanager "platforms;android-$API_LEVEL"

    print_info "Installing build tools ($BUILD_TOOLS)..."
    sdkmanager "build-tools;$BUILD_TOOLS"

    if [ "$INSTALL_NDK" = true ]; then
        print_info "Installing NDK ($NDK_VERSION)..."
        sdkmanager "ndk;$NDK_VERSION"
    fi

    if [ "$INSTALL_EMULATOR" = true ]; then
        print_info "Installing emulator..."
        sdkmanager "emulator"
        print_info "Installing system images..."
        sdkmanager "system-images;android-$API_LEVEL;google_apis;arm64-v8a"
    fi

    print_success "SDK components installed"
}

# Configure environment
configure_environment() {
    print_header "Configuring Environment"

    local shell_rc=""
    if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
        shell_rc="$HOME/.zshrc"
    else
        shell_rc="$HOME/.bashrc"
    fi

    print_info "Adding environment variables to $shell_rc"

    # Check if already configured
    if grep -q "ANDROID_HOME=$SDK_PATH" "$shell_rc" 2>/dev/null; then
        print_warning "Android SDK already configured in $shell_rc"
    else
        cat >> "$shell_rc" << EOF

# Android SDK Configuration
export ANDROID_HOME=$SDK_PATH
export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=\$PATH:\$ANDROID_HOME/platform-tools
EOF
        print_success "Environment configured in $shell_rc"
    fi

    print_info ""
    print_info "To use Android SDK in current session, run:"
    print_info "  export ANDROID_HOME=$SDK_PATH"
    print_info "  export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin"
    print_info "  export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
}

# Verify installation
verify_installation() {
    print_header "Verifying Installation"

    export ANDROID_HOME="$SDK_PATH"
    export PATH="$SDK_PATH/cmdline-tools/latest/bin:$SDK_PATH/platform-tools:$PATH"

    print_info "Checking adb..."
    if adb --version >/dev/null 2>&1; then
        print_success "adb is working: $(adb version | head -n 1)"
    else
        print_warning "adb not found in PATH"
    fi

    print_info "Checking sdkmanager..."
    if sdkmanager --version >/dev/null 2>&1; then
        print_success "sdkmanager is working: $(sdkmanager --version)"
    else
        print_warning "sdkmanager not found in PATH"
    fi

    print_info "Installed packages:"
    sdkmanager --list_installed | grep -E "^(build-tools|platform-tools|platforms)" || true
}

# Print summary
print_summary() {
    print_header "Installation Summary"

    echo "Android SDK Path:     $SDK_PATH"
    echo "API Level:            $API_LEVEL"
    echo "Build Tools:          $BUILD_TOOLS"
    echo "NDK Installed:        $INSTALL_NDK"
    if [ "$INSTALL_NDK" = true ]; then
        echo "NDK Version:          $NDK_VERSION"
    fi
    echo "Emulator Installed:   $INSTALL_EMULATOR"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
    echo "  2. Verify installation: adb --version"
    echo "  3. Build ControlX: cd AndroidClient && ./scripts/build.sh"
}

# Main function
main() {
    print_header "ControlX Android SDK Installer"

    parse_arguments "$@"

    print_info "Installation path: $SDK_PATH"
    print_info "Architecture: $(detect_arch)"

    # Check if SDK already exists
    if [ -d "$SDK_PATH/cmdline-tools" ] && [ "$FORCE_REINSTALL" = false ]; then
        print_warning "Android SDK already exists at $SDK_PATH"
        print_info "Use --force to reinstall or use existing SDK"
        
        read -p "Do you want to use the existing SDK? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            print_info "Installation cancelled"
            exit 0
        fi
        
        configure_environment
        verify_installation
        print_summary
        exit 0
    fi

    check_prerequisites
    install_cmdline_tools
    install_sdk_components
    configure_environment
    verify_installation
    print_summary
}

# Run main function
main "$@"
