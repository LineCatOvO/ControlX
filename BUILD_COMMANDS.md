# ControlX 项目构建命令规范

**日期**: 2026-02-20  
**目的**: 统一 Server 和 Android 客户端的构建命令，简化开发和部署流程

---

## 📋 目录结构

```
ControlX/
├── Server/                    # TypeScript 服务端
│   ├── package.json
│   ├── tsconfig.json
│   └── ...
├── AndroidClient/             # Android 客户端
│   ├── build.gradle
│   ├── gradlew
│   └── ...
└── BUILD_COMMANDS.md          # 本文档
```

---

## 🖥️ Server 端构建命令

### 前置要求

- Node.js >= 20.x
- npm >= 10.x
- pnpm >= 8.x (推荐使用 pnpm)

### 安装依赖

```bash
cd Server

# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 开发模式

```bash
# 开发模式 (监听文件变化，自动重启)
pnpm dev

# 或
npm run dev
```

**说明**: 
- 使用 `tsc-watch` 监听 TypeScript 文件变化
- 自动编译并重启服务
- 适合本地开发调试

### 生产构建

```bash
# 编译 TypeScript 为 JavaScript
pnpm build

# 或
npm run build
```

**输出目录**: `Server/dist/`

### 运行服务

```bash
# 运行编译后的服务
pnpm start

# 或
npm run start
```

**说明**: 
- 先执行 `build` 编译
- 然后运行 `node dist/app.js`

### 运行测试

```bash
# 运行所有测试
pnpm test

# 或
npm test

# 运行特定测试文件
pnpm test -- --testPathPattern=validator

# 运行测试并生成覆盖率报告
pnpm test -- --coverage
```

### 快速参考

| 命令 | 说明 | 输出 |
|------|------|------|
| `pnpm install` | 安装依赖 | node_modules/ |
| `pnpm dev` | 开发模式 | 自动重启 |
| `pnpm build` | 生产构建 | dist/ |
| `pnpm start` | 运行服务 | 运行中服务 |
| `pnpm test` | 运行测试 | 测试报告 |

---

## 📱 Android 客户端构建命令

### 前置要求

- JDK >= 17
- Android SDK >= 34
- Android Gradle Plugin >= 9.0.0

### 环境变量配置

```bash
# 设置 JAVA_HOME
export JAVA_HOME=/path/to/jdk

# 设置 ANDROID_HOME
export ANDROID_HOME=/path/to/android-sdk

# 添加到 PATH
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### 安装依赖

```bash
cd AndroidClient

# Gradle 会自动下载依赖
# 首次构建可能需要较长时间
```

### 清理构建

```bash
# 清理构建缓存
./gradlew clean

# 或在 Windows 上
gradlew.bat clean
```

### Debug 构建

```bash
# 构建 Debug 版本 APK
./gradlew assembleDebug

# 安装 Debug 版本到设备
./gradlew installDebug

# 构建并安装
./gradlew installDebug
```

**输出位置**: `AndroidClient/app/build/outputs/apk/debug/app-debug.apk`

### Release 构建

```bash
# 构建 Release 版本 APK
./gradlew assembleRelease

# 构建 Release 版本 Bundle (用于 Google Play)
./gradlew bundleRelease
```

**输出位置**: 
- APK: `AndroidClient/app/build/outputs/apk/release/app-release.apk`
- Bundle: `AndroidClient/app/build/outputs/bundle/release/app-release.aab`

### 运行测试

```bash
# 运行所有单元测试
./gradlew testDebugUnitTest

# 运行特定测试类
./gradlew testDebugUnitTest --tests "*.InputStateTest"

# 运行所有测试 (包括集成测试)
./gradlew test

# 生成测试报告
./gradlew testDebugUnitTest --info
```

### 代码分析

```bash
# 检查代码依赖
./gradlew app:dependencies

# 检查 Lint 问题
./gradlew lint

# 生成 Lint 报告
./gradlew lintDebug
```

### 查看构建信息

```bash
# 查看 Gradle 版本
./gradlew --version

# 查看项目依赖
./gradlew dependencies

# 查看任务列表
./gradlew tasks

# 查看特定任务详情
./gradlew help --task assembleDebug
```

### 快速参考

| 命令 | 说明 | 输出 |
|------|------|------|
| `./gradlew clean` | 清理构建 | - |
| `./gradlew assembleDebug` | Debug APK | app-debug.apk |
| `./gradlew assembleRelease` | Release APK | app-release.apk |
| `./gradlew installDebug` | 安装到设备 | - |
| `./gradlew testDebugUnitTest` | 单元测试 | 测试报告 |
| `./gradlew lint` | 代码检查 | Lint 报告 |

---

## 🚀 一键构建脚本

### Server 端构建脚本

创建 `Server/scripts/build.sh`:

```bash
#!/bin/bash

# Server 端构建脚本
set -e

echo "🔧 Building Server..."

# 进入 Server 目录
cd "$(dirname "$0")/.."

# 安装依赖
echo "📦 Installing dependencies..."
pnpm install

# 运行测试
echo "🧪 Running tests..."
pnpm test

# 构建
echo "🏗️  Building..."
pnpm build

echo "✅ Server build completed!"
echo "📁 Output: dist/"
```

使用方式:
```bash
cd Server
chmod +x scripts/build.sh
./scripts/build.sh
```

### Android 端构建脚本

创建 `AndroidClient/scripts/build.sh`:

```bash
#!/bin/bash

# Android 端构建脚本
set -e

echo "🔧 Building Android Client..."

# 进入 AndroidClient 目录
cd "$(dirname "$0")/.."

# 清理
echo "🧹 Cleaning..."
./gradlew clean

# 运行测试
echo "🧪 Running tests..."
./gradlew testDebugUnitTest

# 构建 Debug 版本
echo "📱 Building Debug APK..."
./gradlew assembleDebug

echo "✅ Android build completed!"
echo "📁 Output: app/build/outputs/apk/debug/app-debug.apk"
```

使用方式:
```bash
cd AndroidClient
chmod +x scripts/build.sh
./scripts/build.sh
```

---

## 🎯 常用构建场景

### 场景 1: 开发调试

**Server**:
```bash
cd Server
pnpm dev
```

**Android**:
```bash
cd AndroidClient
./gradlew installDebug
```

### 场景 2: 发布前验证

**Server**:
```bash
cd Server
pnpm install
pnpm test
pnpm build
```

**Android**:
```bash
cd AndroidClient
./gradlew clean
./gradlew testDebugUnitTest
./gradlew assembleRelease
```

### 场景 3: 完整构建

**Server + Android**:
```bash
# 构建 Server
cd Server
pnpm install && pnpm test && pnpm build

# 构建 Android
cd ../AndroidClient
./gradlew clean && ./gradlew assembleRelease
```

---

## 📊 构建时间优化

### Server 端

1. **使用 pnpm 代替 npm**
   ```bash
   pnpm install  # 比 npm install 快 2-3 倍
   ```

2. **使用增量编译**
   ```bash
   pnpm dev  # 监听模式，只编译变化的文件
   ```

### Android 端

1. **配置 Gradle 缓存**
   在 `gradle.properties` 中添加:
   ```properties
   org.gradle.caching=true
   org.gradle.parallel=true
   org.gradle.daemon=true
   ```

2. **使用 Gradle Wrapper**
   ```bash
   ./gradlew  # 自动使用正确的 Gradle 版本
   ```

3. **只构建需要的变体**
   ```bash
   ./gradlew assembleDebug  # 只构建 Debug 版本
   ```

---

## 🔍 故障排查

### Server 端

**问题**: TypeScript 编译错误
```bash
# 查看详细错误
pnpm build --diagnostics

# 清理缓存
rm -rf dist/
pnpm build
```

**问题**: 依赖冲突
```bash
# 清理 node_modules
rm -rf node_modules/
pnpm install
```

### Android 端

**问题**: Gradle 下载慢
```bash
# 使用国内镜像
# 在 gradle/wrapper/gradle-wrapper.properties 中修改
distributionUrl=https\://mirrors.cloud.tencent.com/gradle/...
```

**问题**: 构建内存不足
```bash
# 在 gradle.properties 中增加内存
org.gradle.jvmargs=-Xmx4096m
```

**问题**: SDK 版本不匹配
```bash
# 检查 SDK 版本
sdkmanager --list

# 安装所需版本
sdkmanager "platforms;android-34"
```

---

## 📝 最佳实践

### 1. 使用版本控制

- 锁定 Node.js 版本 (`.nvmrc`)
- 锁定 Gradle 版本 (`gradle/wrapper/gradle-wrapper.properties`)
- 锁定依赖版本 (`package.json`, `build.gradle`)

### 2. 自动化构建

- 使用 CI/CD 自动构建
- 每次提交自动运行测试
- 自动生成构建报告

### 3. 文档化

- 记录构建步骤
- 记录常见问题和解决方案
- 定期更新本文档

---

**文档更新时间**: 2026-02-20  
**适用版本**: Server v1.0, Android Client v1.0
