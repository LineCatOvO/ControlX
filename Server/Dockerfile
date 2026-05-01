# ControlX Server Dockerfile
# 多阶段构建: dev (热重载) / test (测试) / prod (生产部署)
# 支持多平台构建：Linux x64/ARM64
# 构建命令：docker buildx build --platform linux/amd64,linux/arm64 -t controlx-server:latest .

# ==========================================
# Base 阶段：基础环境
# ==========================================
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10
WORKDIR /app

# ==========================================
# Dev 阶段：开发模式 (热重载)
# Usage: docker compose --profile dev up
# ==========================================
FROM base AS dev

# 环境变量（可在 docker-compose 中覆盖）
ENV WS_PORT=3000
ENV WEB_PORT=28080
ENV NODE_ENV=development

# 安装所有依赖（含 devDependencies）
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# 复制源码（开发时通过卷挂载覆盖实现热重载）
COPY . .

# 健康检查：验证 Web 监控 HTTP 端点可访问
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.WEB_PORT || 28080) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

EXPOSE 3000 28080

# 启动开发服务器（tsc-watch 支持编译热重载）
CMD ["pnpm", "run", "dev"]

# ==========================================
# Test 阶段：运行测试
# Usage: docker compose --profile test run --rm controlx-test
# ==========================================
FROM base AS test

ENV NODE_ENV=test
ENV WS_PORT=3000
ENV WEB_PORT=28080

# 安装所有依赖（含 devDependencies 如 jest）
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 运行测试（jest），容器执行后自动退出
CMD ["pnpm", "run", "test"]

# ==========================================
# 阶段 3：生产依赖安装
# ==========================================
FROM base AS deps

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# ==========================================
# 阶段 4：构建
# ==========================================
FROM base AS builder

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
RUN cp -r src/web/static dist/web/static 2>/dev/null || echo "No static files to copy"

# ==========================================
# 阶段 5：生产镜像
# ==========================================
FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV WS_PORT=3000
ENV WEB_PORT=28080

RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

RUN addgroup --system --gid 1001 controlx \
    && adduser --system --uid 1001 --ingroup controlx controlx

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

RUN chown -R controlx:controlx /app

USER controlx

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.WEB_PORT || 28080) + '/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))" || exit 1

EXPOSE 3000 28080

CMD ["node", "dist/app.js"]
