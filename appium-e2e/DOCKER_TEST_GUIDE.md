# ControlX Docker E2E 测试环境指南

## 概述

本文档介绍如何使用 Docker 环境进行 ControlX 项目的端到端测试。Docker 环境提供了隔离、可重复的测试环境，包含 Appium 2.x 和后端服务。

## 环境要求

### 必需软件

- Docker Desktop 4.0+ 或 Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

### 可选软件（用于本地设备测试）

- Android SDK Platform Tools（ADB）
- Android 设备或模拟器

## 快速开始

### 1. 启动测试环境

```bash
# 进入项目目录
cd appium-e2e

# 使用启动脚本（推荐）
./docker/scripts/start-test-env.sh start

# 或使用 docker-compose 直接启动
docker-compose up -d
```

### 2. 检查环境状态

```bash
# 使用健康检查脚本
./docker/scripts/health-check.sh

# 或手动检查
curl http://localhost:4723/status
```

### 3. 运行测试

```bash
# 设置 Docker 环境变量
export DOCKER_ENV=true
export APPIUM_HOST=localhost
export APPIUM_PORT=4723

# 运行测试
npm run test
```

### 4. 停止测试环境

```bash
# 使用启动脚本
./docker/scripts/start-test-env.sh stop

# 或使用 docker-compose
docker-compose down
```

## 服务说明

### Appium 服务

- **容器名称**: controlx-appium
- **端口**: 4723
- **基础路径**: /wd/hub
- **状态检查**: `curl http://localhost:4723/status`

### Backend 服务

- **容器名称**: controlx-backend
- **端口范围**: 10000-60000（动态分配）
- **环境变量**:
  - NODE_ENV=test
  - TEST_MODE=true
  - DISABLE_ACTUAL_INPUT=true

## 环境变量

### Docker 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| DOCKER_ENV | false | 是否在 Docker 环境中运行 |
| NODE_ENV | development | 运行环境（设为 docker 启用 Docker 配置） |
| APPIUM_HOST | localhost | Appium 服务器地址 |
| APPIUM_PORT | 4723 | Appium 服务器端口 |
| BACKEND_HOST | localhost | 后端服务器地址 |

### 使用方式

```bash
# 方式1：命令行设置
export DOCKER_ENV=true
npm run test

# 方式2：在测试脚本中设置
DOCKER_ENV=true npm run test

# 方式3：在 docker-compose.yml 中设置
environment:
  - DOCKER_ENV=true
```

## 配置文件

### config.ts Docker 配置

项目配置文件 `utils/config.ts` 已支持 Docker 环境：

```typescript
docker: {
    enabled: isDockerEnvironment,
    appiumHost: process.env.APPIUM_HOST || "localhost",
    appiumPort: parseInt(process.env.APPIUM_PORT || "4723", 10),
    backendHost: process.env.BACKEND_HOST || "localhost",
    backendPortRange: {
        start: 10000,
        end: 60000
    },
    networkName: "controlx-network",
    containers: {
        appium: "controlx-appium",
        backend: "controlx-backend"
    }
}
```

## 常用命令

### 启动脚本命令

```bash
# 启动环境
./docker/scripts/start-test-env.sh start

# 停止环境
./docker/scripts/start-test-env.sh stop

# 重启环境
./docker/scripts/start-test-env.sh restart

# 查看状态
./docker/scripts/start-test-env.sh status

# 查看日志
./docker/scripts/start-test-env.sh logs
./docker/scripts/start-test-env.sh logs appium
./docker/scripts/start-test-env.sh logs backend
```

### Docker Compose 命令

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps

# 进入容器
docker exec -it controlx-appium bash
docker exec -it controlx-backend bash
```

### 健康检查命令

```bash
# 运行完整健康检查
./docker/scripts/health-check.sh

# 检查特定服务
curl http://localhost:4723/status
docker ps --filter "name=controlx"
```

## 测试场景

### 场景1：本地设备测试

连接本地 Android 设备或模拟器：

```bash
# 确保设备已连接
adb devices

# 启动 Docker 环境
./docker/scripts/start-test-env.sh start

# 运行测试
DOCKER_ENV=true npm run test
```

### 场景2：仅后端测试

仅启动后端服务进行 API 测试：

```bash
# 仅启动后端
docker-compose up -d backend

# 运行后端测试
npm run test:backend
```

### 场景3：完整 E2E 测试

运行完整的端到端测试流程：

```bash
# 启动完整环境
./docker/scripts/start-test-env.sh start

# 等待服务就绪
./docker/scripts/health-check.sh

# 运行完整测试
DOCKER_ENV=true npm run test:full
```

## 故障排除

### 常见问题

#### 1. Appium 无法启动

**症状**: 容器启动失败或健康检查失败

**解决方案**:
```bash
# 检查日志
docker-compose logs appium

# 重新构建镜像
docker-compose build --no-cache appium

# 检查端口占用
netstat -an | grep 4723
```

#### 2. 后端服务连接失败

**症状**: 测试无法连接后端

**解决方案**:
```bash
# 检查后端日志
docker-compose logs backend

# 检查网络连接
docker network inspect controlx-network

# 验证后端端口
docker exec controlx-backend netstat -tlnp
```

#### 3. 设备连接问题

**症状**: ADB 无法连接设备

**解决方案**:
```bash
# 在容器内安装 ADB（如果需要）
docker exec -it controlx-appium bash
apt-get update && apt-get install -y android-tools-adb

# 连接外部设备
adb connect <设备IP>:<端口>
```

#### 4. 内存不足

**症状**: 容器频繁重启或测试失败

**解决方案**:
```bash
# 增加 Docker 内存限制
# 编辑 docker-compose.yml
deploy:
  resources:
    limits:
      memory: 4G

# 或在 Docker Desktop 设置中增加内存
```

### 日志查看

```bash
# 查看所有日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f appium
docker-compose logs -f backend

# 查看最近 100 行日志
docker-compose logs --tail=100 appium
```

## 高级配置

### 自定义 Dockerfile

如需自定义 Docker 镜像，编辑 `Dockerfile`：

```dockerfile
# 添加额外的依赖
RUN apt-get update && apt-get install -y \
    your-package

# 添加自定义配置
ENV CUSTOM_VAR=value
```

### 自定义 docker-compose.yml

如需修改服务配置，编辑 `docker-compose.yml`：

```yaml
services:
  appium:
    environment:
      - CUSTOM_VAR=value
    volumes:
      - ./custom-path:/app/custom
```

### 网络配置

Docker 网络默认使用 bridge 模式。如需自定义：

```yaml
networks:
  controlx-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start Docker environment
        run: |
          cd appium-e2e
          ./docker/scripts/start-test-env.sh start
      
      - name: Wait for services
        run: |
          cd appium-e2e
          ./docker/scripts/health-check.sh
      
      - name: Run tests
        run: |
          cd appium-e2e
          DOCKER_ENV=true npm run test
      
      - name: Stop Docker environment
        if: always()
        run: |
          cd appium-e2e
          ./docker/scripts/start-test-env.sh stop
```

## 资源清理

### 清理 Docker 资源

```bash
# 停止并删除容器
docker-compose down

# 删除镜像
docker rmi controlx-appium

# 清理未使用的资源
docker system prune -a

# 删除网络
docker network rm controlx-network
```

## 附录

### 文件结构

```
appium-e2e/
├── Dockerfile                 # Docker 镜像定义
├── docker-compose.yml         # Docker Compose 配置
├── docker/
│   └── scripts/
│       ├── start-test-env.sh  # 启动脚本
│       └── health-check.sh    # 健康检查脚本
├── utils/
│   └── config.ts              # 配置文件（含 Docker 支持）
└── DOCKER_TEST_GUIDE.md       # 本文档
```

### 参考链接

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Appium 官方文档](https://appium.io/)
- [Appium Docker 镜像](https://github.com/appium/appium-docker-android)
