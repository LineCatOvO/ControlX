# ControlX 构建指南

**更新日期**: 2026-04-10

本文档介绍 ControlX 项目（Server + AndroidClient）的完整构建流程。

---

## 项目结构

```
controlx/
├── Server/              # Node.js 服务端
│   ├── src/             # TypeScript 源代码
│   ├── dist/            # 编译输出
│   ├── tests/           # 测试文件
│   ├── scripts/         # 构建脚本
│   ├── docs/            # 文档
│   ├── package.json     # 依赖配置
│   ├── tsconfig.json    # TypeScript 配置
│   ├── Dockerfile       # 容器化配置
│   └── ecosystem.config.js  # PM2 配置
├── AndroidClient/       # Android 客户端
│   ├── app/             # 应用模块
│   └── gradle/          # Gradle 配置
└── docs/                # 项目文档
```

---

## 系统要求

### 服务端构建

| 要求 | 版本 | 说明 |
|------|------|------|
| Node.js | 20+ LTS | v24.14.0 推荐 |
| pnpm | 10+ | 快速、节省磁盘空间 |
| TypeScript | 5+ | 严格模式 |
| PM2 | 5+ | 可选，生产部署 |
| Docker | 24+ | 可选，容器化部署 |

### 客户端构建

| 要求 | 版本 | 说明 |
|------|------|------|
| JDK | 11+ | JetBrains Runtime 推荐 |
| Gradle | 9.3.0 | 通过 wrapper |
| Android SDK | 34+ | Command Line Tools |
| Build Tools | 34.0.0+ | 通过 sdkmanager |

---

## 服务端构建

### 1. 安装依赖

```bash
cd Server
pnpm install
```

### 2. 开发模式

```bash
# 方式 1: 使用 pnpm
pnpm run dev

# 方式 2: 使用脚本
./scripts/start.sh dev
```

### 3. 生产构建

```bash
# 方式 1: 使用 pnpm
pnpm run build

# 方式 2: 使用脚本
./scripts/build.sh build

# 完整构建（清理 + 测试 + 构建）
./scripts/build.sh all
```

### 4. 运行测试

```bash
# 运行所有测试
pnpm test

# 带覆盖率
pnpm run test:coverage

# 监听模式
pnpm run test:watch
```

### 5. 运行服务

```bash
# 直接运行
pnpm start

# 生产模式
pnpm run start:prod

# PM2 模式
pnpm run start:pm2

# 使用脚本
./scripts/start.sh prod
```

### 6. 停止服务

```bash
# 停止 PM2
pnpm run stop:pm2

# 使用脚本
./scripts/stop.sh pm2

# 停止所有
./scripts/stop.sh all
```

### 7. Docker 构建

```bash
# 构建镜像
pnpm run docker:build

# 多平台构建
pnpm run docker:buildx

# 运行容器
pnpm run docker:run:detach

# 停止容器
pnpm run docker:stop

# 或使用脚本
./scripts/start.sh docker
./scripts/stop.sh docker
```

**详细文档**: [Server/BUILD_CONFIG.md](Server/BUILD_CONFIG.md)

---

## 客户端构建

### 1. 配置环境

```bash
# 设置 JAVA_HOME
export JAVA_HOME=/opt/jbr

# 设置 ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk
```

### 2. 安装依赖

```bash
cd AndroidClient
./gradlew --version
```

### 3. Debug 构建

```bash
./gradlew assembleDebug
```

**输出**: `app/build/outputs/apk/debug/app-debug.apk`

### 4. Release 构建

```bash
# 配置签名（首次）
cp app/signing-config-example.properties app/signing-config.properties
# 编辑 signing-config.properties

# 构建
./gradlew assembleRelease
```

**输出**: `app/build/outputs/apk/release/app-release.apk`

### 5. 运行测试

```bash
./gradlew testDebugUnitTest
```

**详细文档**: [AndroidClient/BUILD_CONFIG.md](AndroidClient/BUILD_CONFIG.md)

---

## 构建脚本快速参考

### Server 脚本

| 脚本 | 命令 | 说明 |
|------|------|------|
| 构建 | `./scripts/build.sh build` | 生产构建 |
| 开发 | `./scripts/build.sh dev` | 开发模式 |
| 测试 | `./scripts/build.sh test` | 运行测试 |
| 清理 | `./scripts/build.sh clean` | 清理构建 |
| 完整 | `./scripts/build.sh all` | 完整流程 |
| 启动 | `./scripts/start.sh dev` | 启动开发 |
| 启动 | `./scripts/start.sh prod` | 启动生产 |
| 启动 | `./scripts/start.sh pm2` | PM2 模式 |
| 启动 | `./scripts/start.sh docker` | Docker 模式 |
| 停止 | `./scripts/stop.sh pm2` | 停止 PM2 |
| 停止 | `./scripts/stop.sh docker` | 停止 Docker |
| 停止 | `./scripts/stop.sh all` | 停止全部 |
| 重启 | `./scripts/restart.sh pm2` | 重载 PM2 |
| 重启 | `./scripts/restart.sh docker` | 重启 Docker |

---

## PM2 部署

### 安装 PM2

```bash
npm install -g pm2
```

### 启动生产环境

```bash
cd Server
pnpm install --frozen-lockfile --prod
pnpm run build
pnpm run start:pm2
```

### 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs controlx-server

# 监控界面
pm2 monit

# 重载配置
pm2 reload ecosystem.config.js

# 停止服务
pm2 stop controlx-server

# 删除服务
pm2 delete controlx-server
```

---

## Docker 部署

### 单平台构建

```bash
cd Server
docker build -t controlx-server:latest .
docker run -d -p 3000:3000 -p 8080:8080 --name controlx-server controlx-server:latest
```

### 多平台构建

```bash
# 启用 buildx
docker buildx create --use

# 多平台构建
docker buildx build --platform linux/amd64,linux/arm64 -t controlx-server:latest --push .
```

### Docker Compose 示例

```yaml
version: '3.8'
services:
  controlx-server:
    image: controlx-server:latest
    container_name: controlx-server
    ports:
      - "3000:3000"
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - WS_PORT=3000
      - WEB_PORT=8080
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080/health')"]
      interval: 30s
      timeout: 3s
      retries: 3
```

---

## ARM64 环境配置

### Linux ARM64 (aarch64)

```bash
# 安装 JetBrains Runtime (JBR)
wget https://cache-redirector.jetbrains.com/intellij-jbr/jbr_jcef-21.0.8-linux-aarch64-b1163.59.tar.gz
tar -zxvf jbr_jcef-21.0.8-linux-aarch64-b1163.59.tar.gz
sudo mv jbr /opt/jbr
export JAVA_HOME=/opt/jbr

# 安装 Android SDK Command Line Tools
mkdir -p $HOME/Android/Sdk/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-11076708_latest.zip
mv cmdline-tools $HOME/Android/Sdk/cmdline-tools/latest
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# 安装 SDK 组件
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

---

## CI/CD 构建

### GitHub Actions

项目支持 GitHub Actions 自动构建：

- **Server**: 自动测试、构建、发布
- **AndroidClient**: 自动测试、构建 APK

**详细文档**: [Server/docs/ci-cd-setup.md](Server/docs/ci-cd-setup.md)

---

## 构建验证

### 服务端验证清单

- [ ] `pnpm install` 成功
- [ ] `pnpm run type-check` 无错误
- [ ] `pnpm run build` 成功
- [ ] `pnpm run test` 全部通过
- [ ] `pnpm start` 正常启动
- [ ] `./scripts/build.sh all` 成功
- [ ] `docker build` 成功（如有 Docker）
- [ ] PM2 启动正常（如有 PM2）

### 客户端验证清单

- [ ] `./gradlew --version` 显示版本
- [ ] `./gradlew assembleDebug` 成功
- [ ] APK 文件存在
- [ ] `./gradlew testDebugUnitTest` 全部通过

---

## 故障排查

### 服务端常见问题

| 问题 | 解决方案 |
|------|----------|
| TypeScript 错误 | 检查 tsconfig.json 严格模式 |
| 模块未找到 | 运行 `pnpm install` |
| 构建超时 | 增加 Node.js 内存 |
| 端口冲突 | 修改环境变量 WS_PORT/WEB_PORT |
| 权限错误 | 使用 sudo 或检查文件权限 |
| PM2 未找到 | `npm install -g pm2` |
| Docker 构建失败 | 检查 Dockerfile 语法 |

### 客户端常见问题

| 问题 | 解决方案 |
|------|----------|
| SDK 未找到 | 检查 ANDROID_HOME 和 local.properties |
| JDK 版本不匹配 | 使用 JDK 11+ |
| 签名失败 | 检查 signing-config.properties |
| ProGuard 错误 | 检查 keep rules |
| 构建超时 | 增加 JVM 内存（gradle.properties） |
| Gradle 守护进程问题 | 使用 `--no-daemon` 选项 |

---

## 自动化构建脚本

### Android 构建脚本

项目提供统一的 Android 构建脚本 `scripts/build-android.sh`：

```bash
# 构建 Debug APK
./scripts/build-android.sh debug

# 构建 Release APK
./scripts/build-android.sh release

# 运行单元测试
./scripts/build-android.sh test

# 代码检查
./scripts/build-android.sh lint

# 完整构建（清理 + 测试 + Debug）
./scripts/build-android.sh all

# CI 构建（lint + 测试 + Debug + Release）
./scripts/build-android.sh ci --no-daemon
```

### SDK 安装脚本

使用 `scripts/install-android-sdk.sh` 自动安装 Android SDK：

```bash
# 默认安装（API 34）
./scripts/install-android-sdk.sh

# 安装指定 API 版本
./scripts/install-android-sdk.sh --api 35

# 安装带 NDK
./scripts/install-android-sdk.sh --ndk 26.1.10909125

# 安装带模拟器
./scripts/install-android-sdk.sh --emulator

# 安装到指定路径
./scripts/install-android-sdk.sh --path /opt/android-sdk
```

### Docker 构建

使用 Dockerfile.android 创建一致的构建环境：

```bash
# 构建 Docker 镜像
docker build -f Dockerfile.android -t controlx-android-builder .

# 运行构建
docker run --rm -v $(pwd):/workspace controlx-android-builder debug

# 交互式 Shell
docker run -it --rm -v $(pwd):/workspace controlx-android-builder bash
```

---

## CI/CD 集成

### GitHub Actions

项目包含 `.github/workflows/android-build.yml` 工作流：

- **触发条件**: push 到 main/develop 分支或 PR
- **构建任务**: Debug APK、Release APK（main 分支）
- **测试任务**: 单元测试、Lint 检查
- **产物上传**: APK 文件、测试报告、Lint 报告

### 配置签名密钥

在 GitHub Secrets 中配置以下变量：

| Secret | 说明 |
|--------|------|
| `KEYSTORE_BASE64` | Base64 编码的 keystore 文件 |
| `KEYSTORE_PASSWORD` | Keystore 密码 |
| `KEY_ALIAS` | 密钥别名 |
| `KEY_PASSWORD` | 密钥密码 |

生成 Base64 keystore：
```bash
base64 -w 0 release.keystore > keystore.b64
```

### 本地 CI 测试

在本地测试 CI 构建：

```bash
# 模拟 CI 环境
export CI=true
./scripts/build-android.sh ci --no-daemon
```

---

## 相关文档

- [Server/BUILD_CONFIG.md](Server/BUILD_CONFIG.md) - 服务端构建详细配置
- [Server/Dockerfile](Server/Dockerfile) - Docker 构建配置
- [Server/ecosystem.config.js](Server/ecosystem.config.js) - PM2 配置
- [AndroidClient/BUILD_CONFIG.md](AndroidClient/BUILD_CONFIG.md) - 客户端构建详细配置
- [Server/docs/monitoring-setup.md](Server/docs/monitoring-setup.md) - 监控部署文档
- [Server/docs/ci-cd-setup.md](Server/docs/ci-cd-setup.md) - CI/CD 配置文档
- [CHANGELOG.md](CHANGELOG.md) - 变更日志

---

## 参考资料

- [Node.js 官方文档](https://nodejs.org/)
- [pnpm 文档](https://pnpm.io/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [PM2 文档](https://pm2.keymetrics.io/)
- [Docker 文档](https://docs.docker.com/)
- [Android 构建系统](https://developer.android.com/build)
- [Gradle 性能优化](https://docs.gradle.org/current/userguide/performance.html)
