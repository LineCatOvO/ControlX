# ControlX 构建命令快速参考

## 🖥️ Server 端

```bash
cd Server

# 开发
./scripts/build.sh dev       # 开发模式 (监听 + 自动重启)

# 构建
./scripts/build.sh build     # 生产构建
./scripts/build.sh all       # 完整构建 (清理 + 测试 + 构建)

# 测试
./scripts/build.sh test      # 运行测试

# 运行
./scripts/build.sh start     # 运行服务

# 清理
./scripts/build.sh clean     # 清理构建产物
```

### 原生命令

```bash
pnpm install      # 安装依赖
pnpm dev          # 开发模式
pnpm build        # 生产构建
pnpm start        # 运行服务
pnpm test         # 运行测试
```

---

## 📱 Android 端

```bash
cd AndroidClient

# 构建
./scripts/build.sh debug      # Debug APK
./scripts/build.sh release    # Release APK
./scripts/build.sh all        # 完整构建 (清理 + 测试 + Debug)

# 测试
./scripts/build.sh test       # 单元测试
./scripts/build.sh lint       # 代码检查

# 安装
./scripts/build.sh install    # 安装到设备

# 清理
./scripts/build.sh clean      # 清理构建产物
```

### 原生命令

```bash
./gradlew clean                    # 清理
./gradlew assembleDebug            # Debug APK
./gradlew assembleRelease          # Release APK
./gradlew installDebug             # 安装 Debug
./gradlew testDebugUnitTest        # 单元测试
./gradlew lint                     # 代码检查
```

---

## 🎯 常用场景

### 开发调试

```bash
# Server
cd Server && ./scripts/build.sh dev

# Android
cd AndroidClient && ./gradlew installDebug
```

### 发布前验证

```bash
# Server
cd Server && ./scripts/build.sh all

# Android
cd AndroidClient && ./scripts/build.sh release
```

### 完整构建

```bash
# Server
cd Server && ./scripts/build.sh all

# Android
cd AndroidClient && ./scripts/build.sh all
```

---

## 📁 输出位置

### Server

| 构建类型 | 输出目录 |
|----------|----------|
| 生产构建 | `Server/dist/` |
| 测试报告 | `Server/coverage/` |

### Android

| 构建类型 | 输出文件 |
|----------|----------|
| Debug APK | `AndroidClient/app/build/outputs/apk/debug/app-debug.apk` |
| Release APK | `AndroidClient/app/build/outputs/apk/release/app-release.apk` |
| 测试报告 | `AndroidClient/app/build/reports/tests/testDebugUnitTest/index.html` |
| Lint 报告 | `AndroidClient/app/build/reports/lint-results-debug.html` |

---

**详细文档**: [BUILD_COMMANDS.md](BUILD_COMMANDS.md)
