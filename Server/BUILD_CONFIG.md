# ControlX Server 构建配置

**更新日期**: 2026-04-10

本文档详细介绍 ControlX Server 的构建配置和使用方法。

---

## 配置文件清单

| 文件 | 用途 | 说明 |
|------|------|------|
| `package.json` | 依赖管理和脚本 | npm/pnpm 配置 |
| `tsconfig.json` | TypeScript 编译配置 | 严格模式 |
| `Dockerfile` | 容器化构建 | 多阶段构建，支持多平台 |
| `.dockerignore` | Docker 忽略文件 | 优化镜像大小 |
| `ecosystem.config.js` | PM2 进程管理 | 生产部署配置 |
| `scripts/build.sh` | 构建脚本 | 完整构建流程 |
| `scripts/start.sh` | 启动脚本 | 多种启动模式 |
| `scripts/stop.sh` | 停止脚本 | 停止服务 |
| `scripts/restart.sh` | 重启脚本 | 重载配置 |

---

## TypeScript 配置

### 严格模式

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 编译选项

- **目标**: ES2020
- **模块**: CommonJS
- **输出目录**: `./dist`
- **源码目录**: `./src`
- **声明文件**: 启用
- **源映射**: 启用

---

## Package.json 脚本

### 构建相关

| 脚本 | 说明 |
|------|------|
| `build` | 标准构建 |
| `build:prod` | 生产环境构建 |
| `build:clean` | 清理后构建 |
| `type-check` | 类型检查（不输出） |
| `rebuild` | 完全重新构建 |
| `clean` | 清理构建产物 |

### 启动相关

| 脚本 | 说明 |
|------|------|
| `start` | 直接运行已构建的服务 |
| `start:prod` | 生产模式运行 |
| `start:pm2` | PM2 生产模式 |
| `start:pm2:dev` | PM2 开发模式 |
| `start:pm2:test` | PM2 测试模式 |
| `dev` | 开发模式（文件监听） |
| `dev:debug` | 调试模式 |

### PM2 管理

| 脚本 | 说明 |
|------|------|
| `stop:pm2` | 停止 PM2 服务 |
| `restart:pm2` | 重启 PM2 服务 |
| `reload:pm2` | 重载 PM2 配置 |
| `logs:pm2` | 查看 PM2 日志 |
| `monit:pm2` | PM2 监控界面 |

### Docker 相关

| 脚本 | 说明 |
|------|------|
| `docker:build` | 构建 Docker 镜像 |
| `docker:buildx` | 多平台构建 |
| `docker:run` | 运行 Docker 容器 |
| `docker:run:detach` | 后台运行 |
| `docker:stop` | 停止 Docker 容器 |
| `docker:push` | 推送 Docker 镜像 |

### 测试相关

| 脚本 | 说明 |
|------|------|
| `test` | 运行测试 |
| `test:coverage` | 带覆盖率测试 |
| `test:watch` | 监听模式测试 |

### 脚本快捷方式

| 脚本 | 说明 |
|------|------|
| `script:build` | 执行 build.sh build |
| `script:dev` | 执行 build.sh dev |
| `script:test` | 执行 build.sh test |
| `script:all` | 执行 build.sh all |
| `script:clean` | 执行 build.sh clean |

---

## Docker 配置

### 多阶段构建

Dockerfile 使用三阶段构建：

1. **deps 阶段**: 安装生产依赖
2. **builder 阶段**: 编译 TypeScript
3. **runner 阶段**: 最小化生产镜像

### 基础镜像

- `node:20-alpine` - 基于 Alpine Linux，体积小
- 包含 `libc6-compat` 支持原生模块

### 安全特性

- 使用非 root 用户 (`controlx:controlx`)
- 只复制必要的文件
- 健康检查配置

### 多平台构建

```bash
# 启用 buildx
docker buildx create --use

# 多平台构建
docker buildx build --platform linux/amd64,linux/arm64 -t controlx-server:latest .
```

### 端口映射

- `3000` - WebSocket 服务
- `8080` - Web 监控面板

---

## PM2 配置

### 应用配置

| 配置项 | 说明 |
|--------|------|
| `name` | 进程名称 |
| `script` | 启动脚本 |
| `instances` | 实例数量 |
| `exec_mode` | 执行模式 |
| `max_memory_restart` | 内存限制自动重启 |
| `autorestart` | 自动重启 |
| `watch` | 文件监听 |

### 环境变量

- **production**: 生产环境配置
- **test**: 测试环境配置
- **dev**: 开发环境配置

### 日志配置

- 日志文件路径: `./logs/`
- 日志格式: `YYYY-MM-DD HH:mm:ss Z`
- 日志分割: 10MB
- 保留数量: 10个历史文件

### 部署配置

支持自动化部署到 production 和 staging 环境（需配置服务器信息）。

---

## 脚本使用指南

### 启动服务

```bash
# 开发模式
./scripts/start.sh dev

# 生产模式
./scripts/start.sh prod

# PM2 生产模式
./scripts/start.sh pm2

# PM2 开发模式
./scripts/start.sh pm2:dev

# PM2 测试模式
./scripts/start.sh pm2:test

# Docker 模式
./scripts/start.sh docker
```

### 停止服务

```bash
# 停止 PM2 服务
./scripts/stop.sh pm2

# 停止 PM2 开发模式
./scripts/stop.sh pm2:dev

# 停止 PM2 测试模式
./scripts/stop.sh pm2:test

# 停止 Docker 容器
./scripts/stop.sh docker

# 停止所有服务
./scripts/stop.sh all
```

### 重启服务

```bash
# 重载 PM2 配置
./scripts/restart.sh pm2

# 重启 Docker 容器
./scripts/restart.sh docker
```

### 构建

```bash
# 标准构建
./scripts/build.sh build

# 开发模式
./scripts/build.sh dev

# 运行测试
./scripts/build.sh test

# 清理构建
./scripts/build.sh clean

# 完整构建
./scripts/build.sh all
```

---

## 快速开始

### 开发环境

```bash
cd Server
pnpm install
pnpm run dev
```

### 生产环境

```bash
cd Server
pnpm install --frozen-lockfile --prod
pnpm run build
pnpm start
```

### PM2 部署

```bash
cd Server
pnpm install --frozen-lockfile --prod
pnpm run build
pnpm run start:pm2
```

### Docker 部署

```bash
cd Server
docker build -t controlx-server:latest .
docker run -d -p 3000:3000 -p 8080:8080 controlx-server:latest
```

---

## 构建验证

### 验证清单

- [ ] `pnpm install` 成功
- [ ] `pnpm run type-check` 无错误
- [ ] `pnpm run build` 成功
- [ ] `pnpm run test` 全部通过
- [ ] `pnpm start` 正常启动
- [ ] WebSocket 服务响应
- [ ] Web 监控面板可访问

### Docker 验证

- [ ] `docker build` 成功
- [ ] 镜像大小合理
- [ ] 容器正常启动
- [ ] 健康检查通过

---

## 故障排查

### 构建失败

| 问题 | 解决方案 |
|------|----------|
| TypeScript 错误 | 检查 `tsconfig.json` 严格模式 |
| 模块未找到 | 运行 `pnpm install` |
| 构建超时 | 增加 Node.js 内存限制 |

### 启动失败

| 问题 | 解决方案 |
|------|----------|
| 端口冲突 | 修改环境变量 WS_PORT/WEB_PORT |
| 权限错误 | 检查文件权限 |
| 依赖缺失 | 运行 `pnpm install` |

### Docker 问题

| 问题 | 解决方案 |
|------|----------|
| 镜像构建失败 | 检查 Dockerfile 语法 |
| 容器无法启动 | 查看日志 `docker logs controlx-server` |
| 网络问题 | 检查端口映射 |

---

## 性能优化

### Node.js 优化

```bash
# 增加堆内存
node --max-old-space-size=2048 dist/app.js

# 启用 GC 日志
node --trace-gc dist/app.js
```

### PM2 优化

- 使用 `cluster` 模式利用多核
- 配置内存限制自动重启
- 启用日志分割

### Docker 优化

- 使用多阶段构建减小镜像
- 启用层缓存
- 使用 .dockerignore 减少上下文

---

## 相关文档

- [BUILDING.md](../BUILDING.md) - 项目构建指南
- [../CHANGELOG.md](../CHANGELOG.md) - 变更日志
- [../README.md](../README.md) - 项目说明
