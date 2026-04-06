# ControlX 构建指南

**更新日期**: 2026-04-05

本文档介绍 ControlX 项目（Server + AndroidClient）的完整构建流程。

---

## 项目结构

```
controlx/
├── Server/              # Node.js 服务端
│   ├── src/             # TypeScript 源代码
│   ├── dist/            # 编译输出
│   ├── tests/           # 测试文件
│   └── docs/            # 文档
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

### 2. 开发构建

```bash
pnpm dev
```

### 3. 生产构建

```bash
pnpm build
```

### 4. 运行测试

```bash
pnpm test
```

### 5. 运行服务

```bash
node dist/index.js
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
- [ ] `pnpm type-check` 无错误
- [ ] `pnpm build` 成功
- [ ] `pnpm test` 全部通过
- [ ] `node dist/index.js` 正常启动

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

### 客户端常见问题

| 问题 | 解决方案 |
|------|----------|
| SDK 未找到 | 检查 ANDROID_HOME |
| JDK 版本不匹配 | 使用 JDK 11+ |
| 签名失败 | 检查 signing-config.properties |
| ProGuard 错误 | 检查 keep rules |

---

## 相关文档

- [Server/BUILD_CONFIG.md](Server/BUILD_CONFIG.md) - 服务端构建详细配置
- [AndroidClient/BUILD_CONFIG.md](AndroidClient/BUILD_CONFIG.md) - 客户端构建详细配置
- [Server/docs/monitoring-setup.md](Server/docs/monitoring-setup.md) - 监控部署文档
- [Server/docs/ci-cd-setup.md](Server/docs/ci-cd-setup.md) - CI/CD 配置文档

---

## 参考资料

- [Node.js 官方文档](https://nodejs.org/)
- [pnpm 文档](https://pnpm.io/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Android 构建系统](https://developer.android.com/build)
- [Gradle 性能优化](https://docs.gradle.org/current/userguide/performance.html)