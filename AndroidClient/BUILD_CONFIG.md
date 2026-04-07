# ControlX Android Client Build Configuration

**Updated**: 2026-04-05

This document describes the build configuration for the ControlX Android Client.

---

## Build Environment

### Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| JDK | 11+ | JetBrains Runtime recommended |
| Gradle | 9.3.0 | Via wrapper (gradlew) |
| Android SDK | 34+ | Command Line Tools |
| Build Tools | 34.0.0+ | Via sdkmanager |

### Environment Variables

```bash
# JDK
export JAVA_HOME=/opt/jbr

# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## Build Types

### Debug Build

```bash
cd AndroidClient
./gradlew assembleDebug
```

**Configuration**:
- `debuggable: true`
- `minifyEnabled: false`
- `shrinkResources: false`
- `applicationIdSuffix: .debug`
- `versionNameSuffix: -debug`
- Signing: Debug keystore (default)

**Output**: `app/build/outputs/apk/debug/app-debug.apk`

### Release Build

```bash
cd AndroidClient
./gradlew assembleRelease
```

**Configuration**:
- `debuggable: false`
- `minifyEnabled: true`
- `shrinkResources: true`
- ProGuard: Enabled with custom rules
- Signing: Release keystore (requires configuration)

**Output**: `app/build/outputs/apk/release/app-release.apk`

---

## Signing Configuration

### Debug Signing

The debug build uses the default Android debug keystore:
- Location: `app/debug.keystore` (auto-generated)
- Password: `android`
- Alias: `androiddebugkey`

### Release Signing

For production release builds, you need to configure your signing credentials:

#### Step 1: Generate Release Keystore

```bash
keytool -genkey -v -keystore release.keystore \
    -alias release_key \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000
```

#### Step 2: Create Signing Configuration

1. Copy `signing-config-example.properties` to `signing-config.properties`
2. Fill in your credentials:

```properties
storeFile=release.keystore
storePassword=your_store_password
keyAlias=release_key
keyPassword=your_key_password
```

3. Add `signing-config.properties` to `.gitignore`:

```gitignore
# Signing configuration (contains sensitive data)
app/signing-config.properties
app/release.keystore
```

#### CI/CD Environment Variables

For CI/CD builds, use environment variables:

```bash
# Create signing-config.properties from environment
echo "storeFile=${KEYSTORE_FILE}" > signing-config.properties
echo "storePassword=${KEYSTORE_PASSWORD}" >> signing-config.properties
echo "keyAlias=${KEY_ALIAS}" >> signing-config.properties
echo "keyPassword=${KEY_PASSWORD}" >> signing-config.properties
```

---

## ProGuard Configuration

ProGuard is enabled for release builds to:
- Optimize code
- Obfuscate class names
- Remove unused code
- Reduce APK size

### Custom Rules

ProGuard rules are defined in `app/proguard-rules.pro`:

- **Gson**: Preserves serialization classes
- **OkHttp**: Preserves HTTP client classes
- **WebSocket**: Preserves connection classes
- **Input System**: Preserves input models
- **Android Components**: Preserves Activity/Fragment/Service

### Verification

After building with ProGuard, verify:
- APK functionality
- Crash reporting readability
- Reflection-based code works

---

## Build Optimization

### gradle.properties

Key optimizations:
- JVM memory: `-Xmx4096m`
- Parallel execution: `org.gradle.parallel=true`
- Build caching: `org.gradle.caching=true`
- Non-transitive R class: `android.nonTransitiveRClass=true`

### Performance Tips

1. **Use Gradle Daemon**: Keep daemon running for faster builds
2. **Enable Caching**: Cache builds between CI runs
3. **Parallel Execution**: Build multiple modules concurrently
4. **Disable Unused Features**: Aidl, Renderscript, Shaders disabled

---

## Build Commands

### Clean Build

```bash
./gradlew clean assembleDebug
```

### All Tasks

```bash
./gradlew tasks --all
```

### Build Info

```bash
./gradlew assembleDebug --info
```

### Build Performance

```bash
./gradlew assembleDebug --profile
# Output: build/reports/profile/
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| SDK not found | Check ANDROID_HOME and local.properties |
| JDK version mismatch | Use JDK 11+ |
| Signing fails | Check signing-config.properties |
| ProGuard errors | Check keep rules for reflection classes |
| Build timeout | Increase JVM memory |

### Debug Build Without Signing

If signing configuration is missing, release build will use debug signing:
```
WARNING: Using debug signing for release build
Create signing-config.properties for production release
```

---

## Version Management

Version is defined in `app/build.gradle`:
- `versionCode`: Increment for each release
- `versionName`: Semantic version (e.g., "1.0.0")

Update version for new releases:
```groovy
defaultConfig {
    versionCode 2
    versionName "1.1.0"
}
```

---

## CI/CD 配置

### GitHub Actions

项目配置 `.github/workflows/android-build.yml`：

**工作流功能**：
- Debug 和 Release APK 构建
- 单元测试执行
- Lint 代码检查
- APK 产物上传
- ARM64 架构支持

**触发条件**：
```yaml
on:
  push:
    branches: [ main, develop, 'task/**', 'feature/**' ]
  pull_request:
    branches: [ main, develop ]
```

**使用签名密钥**：
```bash
# 生成 Base64 keystore
base64 -w 0 release.keystore > keystore.b64

# 在 GitHub Secrets 中设置:
# - KEYSTORE_BASE64
# - KEYSTORE_PASSWORD
# - KEY_ALIAS
# - KEY_PASSWORD
```

### Docker 构建

使用 `Dockerfile.android` 创建一致的构建环境：

```bash
# 构建镜像
docker build -f Dockerfile.android -t controlx-android-builder .

# 运行 Debug 构建
docker run --rm -v $(pwd):/workspace controlx-android-builder debug

# 运行 Release 构建
docker run --rm -v $(pwd):/workspace controlx-android-builder release

# 交互模式
docker run -it --rm -v $(pwd):/workspace controlx-android-builder bash
```

**Docker 镜像包含**：
- JDK 21 (Temurin)
- Android SDK (API 34)
- Build Tools 34.0.0
- Gradle 9.3.0
- NDK 26.1.10909125

---

## 构建脚本

### build-android.sh

统一构建脚本 `../scripts/build-android.sh`：

| 命令 | 说明 |
|------|------|
| `debug` | 构建 Debug APK |
| `release` | 构建 Release APK |
| `test` | 运行单元测试 |
| `lint` | 运行代码检查 |
| `clean` | 清理构建产物 |
| `all` | 完整构建（clean + test + debug） |
| `ci` | CI 构建（lint + test + debug + release） |

**选项**：
```bash
--no-daemon    # 禁用 Gradle 守护进程
--offline      # 离线模式
--info         # 详细输出
--stacktrace   # 显示堆栈跟踪
--profile      # 生成性能报告
```

### install-android-sdk.sh

SDK 安装脚本 `../scripts/install-android-sdk.sh`：

```bash
# 默认安装
./scripts/install-android-sdk.sh

# 指定 API 版本
./scripts/install-android-sdk.sh --api 35

# 安装 NDK
./scripts/install-android-sdk.sh --ndk 26.1.10909125

# 安装模拟器
./scripts/install-android-sdk.sh --emulator

# 强制重新安装
./scripts/install-android-sdk.sh --force
```

---

## References

- [Android Build System](https://developer.android.com/build)
- [ProGuard Configuration](https://www.guardsquare.com/manual/configuration/usage)
- [Gradle Performance](https://docs.gradle.org/current/userguide/performance.html)
- [GitHub Actions Android](https://github.com/android-actions/setup-android)