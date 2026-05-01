# 配置模式：Docker入口Shell脚本标准化

## 元信息
- 版本：1.0.0
- 最后修改：2026-05-02
- 作者：Learner
- 分类：配置说明
- 验证状态：已验证 (task-P2-003)

## 摘要

记录ControlX项目中Docker入口Shell脚本的标准化模式，包括日志持久化、错误处理、环境变量传递等最佳实践。

## 模式定义

### 基础结构

```sh
#!/bin/sh
# 项目名称 - 脚本用途
# Usage: ./scripts/docker-{action}.sh

set -e                # 错误立即退出
set -o pipefail       # 管道命令中任一失败即退出

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="/tmp/docker-logs"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/{service-name}-$TIMESTAMP.log"

mkdir -p "$LOG_DIR"

echo "[{tag}] Starting..."
echo "[{tag}] Log file: $LOG_FILE"

cd "$PROJECT_DIR"

# 实际Docker操作，日志tee到文件和终端
docker compose --profile {profile} {command} 2>&1 | tee "$LOG_FILE"
```

### 三种脚本模式

| 脚本 | Docker命令 | Profile | 特点 |
|------|-----------|---------|------|
| docker-dev.sh | `up --build` | dev | 前台运行，支持Ctrl+C停止 |
| docker-test.sh | `build && run --rm` | test | 成功build后才run，自动删除 |
| docker-build.sh | `build` | prod | 仅构建，不运行 |

### 日志持久化

遵循AGENTS_GENERAL.xml中的ContainerLogManagement规范：
- 日志目录：`/tmp/docker-logs/`
- 文件命名：`{container-name}-{YYYYMMDD}-{HHMMSS}.log`
- 同时输出到终端和文件（`tee`）
- 同时捕获stdout和stderr（`2>&1`）

### 环境变量传递

脚本自动继承当前shell环境变量，可在运行时覆盖：
```bash
WS_HOST_PORT=8081 ./scripts/docker-dev.sh
WEB_HOST_PORT=8080 ./scripts/docker-dev.sh
```

## 应用场景

- 任何Docker化的项目入口脚本
- CI/CD pipeline中的构建/测试阶段
- 开发团队的标准化工作流

## 注意事项

1. `set -e` 确保任何命令失败时脚本立即退出
2. `set -o pipefail` 确保管道中任一命令失败也被捕获
3. 日志文件需要`mkdir -p`提前创建目录
4. `$PROJECT_DIR` 通过`$(dirname "$0")/..`动态计算，确保脚本可任意位置调用
5. `tee` 同时输出到终端（实时查看）和文件（事后排查）

## 相关文件

- [scripts/docker-dev.sh](file:///workspaces/agent-workspace/projects/ControlX/scripts/docker-dev.sh)
- [scripts/docker-test.sh](file:///workspaces/agent-workspace/projects/ControlX/scripts/docker-test.sh)
- [scripts/docker-build.sh](file:///workspaces/agent-workspace/projects/ControlX/scripts/docker-build.sh)

## 标签

- docker
- shell-script
- entry-script
- logging
- best-practice
- controlx
