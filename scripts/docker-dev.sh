#!/bin/sh
# ControlX Development Entry Script
# 通过 Docker Compose 启动开发环境（热重载模式）
#
# 使用方式: ./scripts/docker-dev.sh
# 可通过环境变量覆盖端口:
#   WS_HOST_PORT=8081 ./scripts/docker-dev.sh
#   WEB_HOST_PORT=8080 ./scripts/docker-dev.sh
#
# 日志持久化到 /tmp/docker-logs/

set -e
set -o pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="/tmp/docker-logs"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/controlx-dev-$TIMESTAMP.log"

mkdir -p "$LOG_DIR"

echo "[controlx-dev] Starting development environment..."
echo "[controlx-dev] Log file: $LOG_FILE"

cd "$PROJECT_DIR"

# 启动开发服务（前台运行，支持 Ctrl+C 停止，日志同时输出到终端和文件）
docker compose --profile dev up --build "$@" 2>&1 | tee "$LOG_FILE"
