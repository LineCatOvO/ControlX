#!/bin/sh
# ControlX Smoke Test Script
# 快速验证核心功能是否正常工作
#
# 使用方式: ./smoke-test.sh
# 测试结果日志持久化到 /tmp/docker-logs/

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/tmp/docker-logs"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/controlx-smoke-$TIMESTAMP.log"
WEB_PORT="${WEB_PORT:-28080}"
WS_PORT="${WS_PORT:-3000}"
CONTAINER_NAME="controlx-smoke-test"
MAX_WAIT=60

mkdir -p "$LOG_DIR"

echo "[smoke-test] Starting ControlX smoke test..."
echo "[smoke-test] Log file: $LOG_FILE"
echo "[smoke-test] Web port: $WEB_PORT, WebSocket port: $WS_PORT"

cd "$PROJECT_DIR"

cleanup() {
    echo "[smoke-test] Cleaning up..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
}
trap cleanup EXIT

echo "[smoke-test] Building Docker image..."
docker compose build controlx-dev --build 2>&1 | tee -a "$LOG_FILE"

echo "[smoke-test] Starting container..."
docker compose up -d controlx-dev 2>&1 | tee -a "$LOG_FILE"

echo "[smoke-test] Waiting for service to be healthy (max ${MAX_WAIT}s)..."
elapsed=0
while [ $elapsed -lt $MAX_WAIT ]; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$WEB_PORT/health" 2>/dev/null | grep -q "200"; then
        echo "[smoke-test] Health check passed!"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo "[smoke-test] Waiting... ${elapsed}s"
done

if [ $elapsed -ge $MAX_WAIT ]; then
    echo "[smoke-test] FAILED: Service did not become healthy within ${MAX_WAIT}s"
    docker logs "$CONTAINER_NAME" 2>&1 | tail -50
    exit 1
fi

echo "[smoke-test] Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s "http://localhost:$WEB_PORT/health" 2>&1)
echo "$HEALTH_RESPONSE" | tee -a "$LOG_FILE"

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "[smoke-test] /health endpoint OK"
else
    echo "[smoke-test] FAILED: /health endpoint returned unexpected response"
    exit 1
fi

echo "[smoke-test] All smoke tests passed!"
echo "[smoke-test] Results saved to $LOG_FILE"
exit 0