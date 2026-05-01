#!/bin/sh
# ControlX Production Build Script
# 通过 Docker Compose 构建生产镜像
#
# 使用方式: ./scripts/docker-build.sh
# 构建完成后可通过以下命令启动:
#   docker compose --profile prod up -d

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[controlx-build] Building production image..."

cd "$PROJECT_DIR"

# 构建生产镜像（使用 runner 阶段）
docker compose --profile prod build controlx-prod "$@"

echo "[controlx-build] Production image built successfully."
echo "[controlx-build] Start with: docker compose --profile prod up -d"
