#!/bin/sh
# ControlX Test Entry Script
# 通过 Docker Compose 构建并运行测试
#
# 使用方式: ./scripts/docker-test.sh
# 可通过环境变量覆盖端口:
#   WS_PORT=3001 ./scripts/docker-test.sh
#
# 测试结果日志持久化到 /tmp/docker-logs/

set -e
set -o pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="/tmp/docker-logs"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/controlx-test-$TIMESTAMP.log"

mkdir -p "$LOG_DIR"

echo "[controlx-test] Building test image..."
echo "[controlx-test] Log file: $LOG_FILE"

cd "$PROJECT_DIR"

# 构建测试镜像并前台运行测试容器（执行完毕后自动删除容器，日志同时输出到终端和文件）
{
    docker compose --profile test build controlx-test \
        && docker compose --profile test run --rm controlx-test "$@"
} 2>&1 | tee "$LOG_FILE"
