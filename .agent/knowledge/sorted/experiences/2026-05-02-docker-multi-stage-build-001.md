---
title: Docker multi-stage build optimization for Node.js application
category: experiences
timestamp: 2026-05-02T02:00:00Z
related_files: [Server/Dockerfile, docker-compose.yml]
tags: [docker, nodejs, multi-stage-build, build-optimization]
---

## Problem Description
Building a Node.js application resulted in large Docker images (over 1GB). Need to optimize image size for faster deployments and better resource utilization.

## Technical Details
- Node.js build requires development dependencies (npm/pnpm install)
- Production only needs compiled output and runtime dependencies
- Multi-stage builds separate build and production environments
- Different stages needed: base, dev, test, deps, builder, runner
- Supporting hot-reload in dev mode vs optimized production image

## Code Example

### Multi-stage Dockerfile Structure
```dockerfile
# ==========================================
# Base 阶段：基础环境
# ==========================================
FROM node:20-alpine AS base
RUN npm install -g pnpm@10
WORKDIR /app

# ==========================================
# Dev 阶段：开发模式 (热重载)
# ==========================================
FROM base AS dev
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
CMD ["pnpm", "run", "dev"]

# ==========================================
# Test 阶段：运行测试
# ==========================================
FROM base AS test
ENV NODE_ENV=test
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
CMD ["pnpm", "run", "test"]

# ==========================================
# Deps 阶段：生产依赖安装
# ==========================================
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# ==========================================
# Builder 阶段：构建应用
# ==========================================
FROM base AS builder
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
RUN cp -r src/web/static dist/web/static 2>/dev/null || echo "No static files"

# ==========================================
# Runner 阶段：生产镜像
# ==========================================
FROM node:20-alpine AS runner
RUN apk add --no-cache ca-certificates tzdata && rm -rf /var/cache/apk/*
RUN addgroup --system --gid 1001 controlx && adduser --system --uid 1001 --ingroup controlx controlx
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN chown -R controlx:controlx /app
USER controlx
CMD ["node", "dist/app.js"]
```

### Build Commands
```bash
# 多平台构建
docker buildx build --platform linux/amd64,linux/arm64 -t controlx-server:latest .

# 仅构建特定阶段
docker build --target dev -t controlx-dev .
```

## Solution/Key Insight

1. **Use `--prod` flag for production dependencies**: In deps stage, use `pnpm install --frozen-lockfile --prod` to avoid installing devDependencies

2. **Copy only necessary artifacts**: Use `COPY --from=builder` to copy only compiled output (`dist/`) and production `node_modules/`

3. **Create non-root user**: Use `addgroup/adduser` to create a dedicated user (uid 1001) and switch with `USER` directive for security

4. **Clean up in same layer**: Use `&& rm -rf /var/cache/apk/*` in the same RUN to reduce image layers

5. **Separate concerns by stage**:
   - `dev`: For local development with hot-reload (exposed ports 3000, 28080)
   - `test`: For running tests (exits after test completion)
   - `deps`: Pre-installs production dependencies
   - `builder`: Compiles TypeScript/transpiles code
   - `runner`: Minimal production image with only runtime

6. **Health check**: Add `HEALTHCHECK` instruction for production stage to verify application responsiveness

7. **Multi-platform support**: Use `docker buildx` with `--platform` for Linux x64 and ARM64 builds

## Related Files
- Server/Dockerfile
- docker-compose.yml
- Server/package.json
- Server/pnpm-lock.yaml