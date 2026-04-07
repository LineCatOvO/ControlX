# ControlX Server Dockerfile
# 支持多平台构建：Linux x64/ARM64
# 构建命令：docker buildx build --platform linux/amd64,linux/arm64 -t controlx-server:latest .

# ==========================================
# 阶段 1：依赖安装
# ==========================================
FROM node:20-alpine AS deps

# 安装必要工具
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml* ./

# 安装 pnpm
RUN npm install -g pnpm@10

# 安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# ==========================================
# 阶段 2：构建
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@10

# 复制包管理文件
COPY package.json pnpm-lock.yaml* ./

# 安装所有依赖（包括开发依赖）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建 TypeScript
RUN pnpm run build

# 复制静态文件
RUN cp -r src/web/static dist/web/static 2>/dev/null || echo "No static files to copy"

# ==========================================
# 阶段 3：生产镜像
# ==========================================
FROM node:20-alpine AS runner

# 设置环境变量
ENV NODE_ENV=production
ENV WS_PORT=3000
ENV WEB_PORT=8080

# 安装必要的系统依赖
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# 创建非 root 用户
RUN addgroup --system --gid 1001 controlx \
    && adduser --system --uid 1001 --ingroup controlx controlx

WORKDIR /app

# 从 deps 阶段复制生产依赖
COPY --from=deps /app/node_modules ./node_modules

# 从 builder 阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# 设置权限
RUN chown -R controlx:controlx /app

# 切换到非 root 用户
USER controlx

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.WEB_PORT || 8080) + '/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))" || exit 1

# 暴露端口
EXPOSE 3000 8080

# 启动命令
CMD ["node", "dist/app.js"]
