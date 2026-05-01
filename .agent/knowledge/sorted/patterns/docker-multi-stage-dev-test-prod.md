# 设计模式：Docker多阶段构建Dev/Test/Prod分离

## 元信息
- 版本：1.0.0
- 最后修改：2026-05-02
- 作者：Learner
- 分类：设计模式
- 验证状态：已验证 (task-P2-003)

## 摘要

展示如何通过单个Dockerfile的多个构建阶段（base/dev/test/deps/builder/runner）配合docker-compose的profile机制，实现开发、测试、生产三种环境的清晰分离。

## 问题描述

在Docker化的Node.js项目中，常见的问题：
1. 开发/测试/生产环境需要不同的依赖和构建策略
2. 开发环境需要热重载（volume挂载），生产环境需要最小化镜像
3. 三种环境经常各自维护一个Dockerfile，导致代码重复和配置漂移

## 解决方案

### 1. Dockerfile多阶段构建

```
FROM node:20-alpine AS base          # 基础层：Node.js + pnpm + workdir
FROM base AS dev                     # 开发层：全量依赖 + dev CMD
FROM base AS test                    # 测试层：全量依赖 + test CMD
FROM base AS deps                    # 依赖层：仅生产依赖
FROM base AS builder                 # 构建层：全量依赖 + tsc编译
FROM node:20-alpine AS runner        # 生产层：精简镜像 + 非root用户
```

**关键设计原则**：
- `base` 阶段提供所有阶段共享的基础环境（Node.js版本、包管理器、工作目录）
- `dev` 和 `test` 阶段安装全量依赖（含devDependencies），体积大但功能全
- `deps` 阶段仅安装生产依赖（`--prod`），精简体积
- `builder` 阶段执行TypeScript编译
- `runner` 阶段使用精简基础镜像，通过COPY --from复用前序构建产物

### 2. Docker Compose Profile分离

```yaml
services:
  controlx-dev:
    profiles: ["dev"]
    build: { target: dev }
    volumes: [源码挂载]
    restart: unless-stopped

  controlx-test:
    profiles: ["test"]
    build: { target: test }
    # 测试容器：前台运行，不暴露端口，无healthcheck

  controlx-prod:
    profiles: ["prod"]
    build: { target: runner }
    ports: [端口暴露]
    restart: unless-stopped
    healthcheck: [HTTP GET /health]
```

**使用方式**：
```bash
docker compose --profile dev up              # 开发模式
docker compose --profile test run --rm test  # 测试模式
docker compose --profile prod up -d          # 生产模式
```

### 3. 容器生命周期差异化

| 环境 | 运行模式 | 自动删除 | 端口暴露 |
|------|---------|---------|---------|
| dev | `up` (前台) | 否 | 是 |
| test | `run --rm` (前台) | 是 | 否 |
| prod | `up -d` (后台) | 否 | 是 |

## 应用场景

- Node.js/TypeScript后端服务项目
- 需要统一构建管道的CI/CD环境
- 多环境部署场景（dev/staging/prod）
- 任何需要环境隔离的Docker化项目

## 代码示例

### 开发模式热重载实现

```dockerfile
FROM base AS dev
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
CMD ["pnpm", "run", "dev"]
```

在docker-compose中通过volume挂载覆盖源码实现热重载：
```yaml
volumes:
  - ./Server/src:/app/src
```

### 生产镜像优化

```dockerfile
FROM node:20-alpine AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER controlx  # 非root用户
CMD ["node", "dist/app.js"]
```

## 注意事项

1. `deps`阶段必须安装pnpm（因为`base`阶段已安装），否则生产依赖安装失败
2. Dockerfile的HEALTHCHECK参数会被docker-compose.yml中的同名参数覆盖
3. 测试容器不设置healthcheck，因为测试容器执行完毕后自动退出
4. 生产容器必须使用非root用户运行

## 相关文件

- [Server/Dockerfile](file:///workspaces/agent-workspace/projects/ControlX/Server/Dockerfile)
- [docker-compose.yml](file:///workspaces/agent-workspace/projects/ControlX/docker-compose.yml)
- [scripts/docker-dev.sh](file:///workspaces/agent-workspace/projects/ControlX/scripts/docker-dev.sh)
- [scripts/docker-test.sh](file:///workspaces/agent-workspace/projects/ControlX/scripts/docker-test.sh)
- [scripts/docker-build.sh](file:///workspaces/agent-workspace/projects/ControlX/scripts/docker-build.sh)

## 标签

- docker
- multi-stage
- dev-test-prod
- docker-compose
- profile
- controlx
