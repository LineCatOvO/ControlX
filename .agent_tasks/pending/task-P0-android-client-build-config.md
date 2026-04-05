# Task-P0-android-client-build-config: 安卓客户端构建配置完善

**创建时间**：2026-04-05 21:00:00
**优先级**：P0
**状态**：pending
**项目**：controlx
**预计时间**：60 分钟
**父任务**：任务 6 (TASKS.md)
**操作范围**：单子项目：controlx
**子项目路径**：/workspaces/agent-workspace/projects/controlx/
**禁止范围**：其他子项目、Server 目录

---

## 一、任务描述

**目标**：完善安卓客户端构建配置，确保生产构建配置完整，包括签名配置模板、ProGuard 规则、构建变体配置等。

**当前状态分析**：
- ✅ 基本构建配置已存在（app/build.gradle）
- ✅ Gradle 版本管理已配置（libs.versions.toml）
- ✅ Gradle wrapper 已配置（9.3.0）
- ⚠️ 缺少签名配置（signingConfigs）
- ⚠️ 缺少 debug buildType 详细配置
- ⚠️ ProGuard 规则几乎空白
- ⚠️ gradle.properties 配置可优化

---

## 二、任务背景

### 2.1 问题描述
安卓客户端构建配置不够完善，缺少生产构建所需的签名配置、ProGuard 规则、构建变体详细配置等。

### 2.2 影响范围
- 直接影响：AndroidClient/app/build.gradle、proguard-rules.pro、gradle.properties
- 间接影响：APK 构建、签名、代码混淆、发布流程

### 2.3 相关文件
- 主文件：AndroidClient/app/build.gradle
- 配置文件：AndroidClient/gradle.properties
- ProGuard：AndroidClient/app/proguard-rules.pro
- 签名模板：AndroidClient/app/signing-config-example.properties（需创建）
- 构建文档：AndroidClient/BUILD_CONFIG.md（需创建）

---

## 三、原子化任务分解

根据原子化原则，本任务分解为以下子任务：

| 子任务 ID | 子任务标题 | 文件 | 操作类型 | 预计时间 |
|-----------|------------|------|----------|----------|
| subtask-1 | 完善 build.gradle 签名配置和 buildTypes | app/build.gradle | 修改 | 20 分钟 |
| subtask-2 | 完善 ProGuard 规则 | app/proguard-rules.pro | 修改 | 10 分钟 |
| subtask-3 | 优化 gradle.properties 配置 | gradle.properties | 修改 | 5 分钟 |
| subtask-4 | 创建签名配置模板 | app/signing-config-example.properties | 创建 | 5 分钟 |
| subtask-5 | 创建构建配置文档 | BUILD_CONFIG.md | 创建 | 15 分钟 |

**子任务依赖关系**：
- subtask-1 → subtask-4（签名配置完成后创建模板）
- subtask-1 → subtask-5（配置完成后更新文档）
- subtask-2 → subtask-5（ProGuard 完成后更新文档）
- subtask-3 → subtask-5（优化完成后更新文档）

---

## 四、详细执行计划

### 4.1 subtask-1: 完善 build.gradle 签名配置和 buildTypes

**文件**：/workspaces/agent-workspace/projects/controlx/AndroidClient/app/build.gradle

**操作前内容**（关键部分）：
```groovy
android {
    ...
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    ...
}
```

**操作后内容**（添加内容）：
```groovy
android {
    ...
    // 签名配置
    signingConfigs {
        // Debug 签名使用默认调试密钥
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        
        // Release 签名配置（需要实际密钥文件）
        // 生产构建时需要配置实际的签名密钥
        // 可通过 signing-config.properties 文件配置
        release {
            // 签名配置将从 signing-config.properties 文件读取
            // 如果文件不存在，将使用 debug 签名（仅用于开发测试）
            def signingConfigFile = file('signing-config.properties')
            if (signingConfigFile.exists()) {
                def props = new Properties()
                props.load(new FileInputStream(signingConfigFile))
                storeFile file(props['storeFile'])
                storePassword props['storePassword']
                keyAlias props['keyAlias']
                keyPassword props['keyPassword']
            } else {
                // 开发测试时使用 debug 签名
                println 'WARNING: Using debug signing for release build'
                println 'Create signing-config.properties for production release'
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
    }
    
    buildTypes {
        debug {
            debuggable true
            minifyEnabled false
            shrinkResources false
            signingConfig signingConfigs.debug
            // Debug 构建标识
            applicationIdSuffix '.debug'
            versionNameSuffix '-debug'
            // Debug 构建日志配置
            buildConfigField 'boolean', 'DEBUG_MODE', 'true'
            buildConfigField 'String', 'LOG_LEVEL', '"DEBUG"'
        }
        
        release {
            debuggable false
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
            // Release 构建标识
            buildConfigField 'boolean', 'DEBUG_MODE', 'false'
            buildConfigField 'String', 'LOG_LEVEL', '"INFO"'
        }
    }
    ...
}
```

**验证方法**：
```bash
cd /workspaces/agent-workspace/projects/controlx/AndroidClient
./gradlew tasks --all | grep assemble
```

---

### 4.2 subtask-2: 完善 ProGuard 规则

**文件**：/workspaces/agent-workspace/projects/controlx/AndroidClient/app/proguard-rules.pro

**操作后内容**：
```proguard
# ControlX ProGuard Rules
# Generated: 2026-04-05

# ==================== 基本配置 ====================

# 保留调试信息
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# 保留注解
-keepattributes *Annotation*

# 保留泛型签名
-keepattributes Signature

# 保留异常信息
-keepattributes Exceptions

# ==================== Gson 库 ====================

# Gson 使用反射，需要保留序列化类
-keepattributes Signature
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Gson 序列化的数据类
-keep class com.linecat.controlx.** { *; }
-keepclassmembers class com.linecat.controlx.** {
    <fields>;
    <methods>;
}

# ==================== OkHttp 库 ====================

# OkHttp 平台类
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }

# OkHttp 拦截器
-keep class * implements okhttp3.Interceptor { *; }

# ==================== WebSocket ====================

# WebSocket 连接相关
-keep class com.linecat.controlx.websocket.** { *; }
-keepclassmembers class com.linecat.controlx.websocket.** {
    <fields>;
    <methods>;
}

# ==================== Android 组件 ====================

# Activity 和 Fragment
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Fragment
-keep public class * extends androidx.fragment.app.Fragment

# Service
-keep public class * extends android.app.Service

# BroadcastReceiver
-keep public class * extends android.content.BroadcastReceiver

# View
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
    public void set*(***);
}

# ==================== 输入系统 ====================

# 输入状态模型
-keep class com.linecat.controlx.input.** { *; }
-keepclassmembers class com.linecat.controlx.input.** {
    <fields>;
    <methods>;
}

# 安全控制器
-keep class com.linecat.controlx.safety.** { *; }

# Profile 管理
-keep class com.linecat.controlx.profile.** { *; }

# ==================== 脚本系统 ====================

# JavaScript 引擎相关
-keep class com.linecat.controlx.script.** { *; }

# ==================== 优化配置 ====================

# 优化级别
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# 优化选项
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*,!code/simplification/cast

# ==================== 混淆配置 ====================

# 不混淆特定类
-keep class * {
    public protected *;
}

# 保留 native 方法
-keepclasseswithmembernames class * {
    native <methods>;
}

# 保留自定义 View 的构造方法
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# 保留枚举
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# 保留 Parcelable
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# 保留 Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ==================== 移除日志 ====================

# Release 构建移除日志调用（可选）
# -assumenosideeffects class android.util.Log {
#     public static int v(...);
#     public static int d(...);
#     public static int i(...);
# }
```

---

### 4.3 subtask-3: 优化 gradle.properties 配置

**文件**：/workspaces/agent-workspace/projects/controlx/AndroidClient/gradle.properties

**操作后内容**：
```properties
# Project-wide Gradle settings.
# IDE (e.g. Android Studio) users:
# Gradle settings configured through the IDE *will override*
# any settings specified in this file.
# For more details on how to configure your build environment visit
# http://www.gradle.org/docs/current/userguide/build_environment.html

# ==================== JVM 配置 ====================

# Specifies the JVM arguments used for the daemon process.
# The setting is particularly useful for tweaking memory settings.
# 增加内存配置以提高构建性能
org.gradle.jvmargs=-Xmx4096m -XX:+UseParallelGC -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8

# Disable problematic services for Termux/PRoot environment
org.gradle.internal.launcher.welcomeMessageEnabled=false
org.gradle.console=plain

# ==================== 性能优化 ====================

# Enable parallel execution (decoupled projects)
org.gradle.parallel=true

# Enable build caching
org.gradle.caching=true

# Enable configuration caching (experimental)
# org.gradle.configuration-cache=true

# ==================== AndroidX 配置 ====================

# AndroidX package structure
android.useAndroidX=true

# Enables namespacing of each library's R class
android.nonTransitiveRClass=true

# ==================== 构建优化 ====================

# Enable build features only when needed
android.defaults.buildfeatures.buildconfig=true
android.defaults.buildfeatures.aidl=false
android.defaults.buildfeatures.renderscript=false
android.defaults.buildfeatures.resvalues=false
android.defaults.buildfeatures.shaders=false

# ==================== 环境兼容性 ====================

# Disable AAPT2 daemon for better compatibility
android.enableAapt2Daemon=false
android.enableAapt2DaemonAction=false

# ==================== Kotlin 配置（如需要）====================

# Kotlin incremental compilation
kotlin.incremental=true

# ==================== 调试配置 ====================

# Enable debug logging (set to false for production)
org.gradle.debug=false

# ==================== 版本信息 ====================

# Application version (override in app/build.gradle)
# applicationVersion=1.0.0
```

---

### 4.4 subtask-4: 创建签名配置模板

**文件**：/workspaces/agent-workspace/projects/controlx/AndroidClient/app/signing-config-example.properties

**内容**：
```properties
# ControlX Release Signing Configuration Template
# 
# This file should be renamed to 'signing-config.properties' and filled with
# your actual signing credentials for production release builds.
#
# WARNING: DO NOT commit this file with real credentials to the repository!
#          Add 'signing-config.properties' to .gitignore
#
# Instructions:
# 1. Generate a release keystore:
#    keytool -genkey -v -keystore release.keystore -alias release_key -keyalg RSA -keysize 2048 -validity 10000
#
# 2. Copy this file to 'signing-config.properties'
# 3. Fill in the values below
# 4. Add signing-config.properties to .gitignore
#
# ==================== Signing Configuration ====================

# Keystore file path (relative to app/ directory)
# Example: storeFile=release.keystore
storeFile=your-keystore-file.keystore

# Keystore password
# Example: storePassword=your_store_password
storePassword=YOUR_STORE_PASSWORD_HERE

# Key alias
# Example: keyAlias=release_key
keyAlias=YOUR_KEY_ALIAS_HERE

# Key password
# Example: keyPassword=your_key_password
keyPassword=YOUR_KEY_PASSWORD_HERE

# ==================== Additional Information ====================

# Keystore type (optional, default is JKS)
# storeType=JKS

# Key algorithm (optional, default is RSA)
# keyAlg=RSA

# Key size (optional, default is 2048)
# keySize=2048

# Validity days (optional, default is 10000)
# validity=10000

# ==================== Security Notes ====================

# 1. Keep your keystore file secure and backed up
# 2. Use strong passwords for both keystore and key
# 3. Never share your signing credentials
# 4. Consider using environment variables for CI/CD builds:
#    - KEYSTORE_FILE
#    - KEYSTORE_PASSWORD
#    - KEY_ALIAS
#    - KEY_PASSWORD
```

---

### 4.5 subtask-5: 创建构建配置文档

**文件**：/workspaces/agent-workspace/projects/controlx/AndroidClient/BUILD_CONFIG.md

**内容**：
```markdown
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

## References

- [Android Build System](https://developer.android.com/build)
- [ProGuard Configuration](https://www.guardsquare.com/manual/configuration/usage)
- [Gradle Performance](https://docs.gradle.org/current/userguide/performance.html)
```

---

## 五、验收标准

- [ ] app/build.gradle 签名配置和 buildTypes 配置完善
- [ ] app/proguard-rules.pro ProGuard 规则完善
- [ ] gradle.properties 配置优化
- [ ] app/signing-config-example.properties 签名配置模板创建
- [ ] BUILD_CONFIG.md 构建配置文档创建
- [ ] gradlew tasks 命令正常执行

---

## 六、风险评估

| 风险项 | 可能性 | 影响程度 | 缓解策略 |
|--------|--------|----------|----------|
| JDK/Android SDK 环境问题 | 高 | 中 | 无法执行构建验证时记录问题但不阻塞 |
| 签名配置缺失 | 低 | 低 | 使用 debug 签名作为开发测试默认 |
| ProGuard 规则不完整 | 中 | 中 | 根据项目依赖库添加保留规则 |
| 构建超时 | 中 | 低 | 增加 JVM 内存配置 |

---

## 七、分支规划

**任务类型**：配置完善任务
**基础分支**：master
**任务分支**：task/P0-android-client-build-config
**合并目标**：master
**分支策略**：创建新分支

---

## 八、执行进度（实时更新区域）

### subtask-1: 完善 build.gradle 签名配置和 buildTypes
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### subtask-2: 完善 ProGuard 规则
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### subtask-3: 优化 gradle.properties 配置
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### subtask-4: 创建签名配置模板
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### subtask-5: 创建构建配置文档
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

---

## 九、问题记录（实时更新区域）

（待执行期间记录）

---

## 十、有价值发现（实时更新区域）

（待执行期间记录）

---

## 十一、环境问题处理（最高优先级）

**核心原则**：
- ⚠️ 如无法验证构建（JDK/Android SDK 环境问题），记录问题但不阻塞任务完成
- ⚠️ 配置文件修改完成后，即使无法执行构建验证，也视为任务完成
- ⚠️ 在任务报告中明确记录环境问题和后续建议

**处理方式**：
- 尝试执行 gradlew tasks 命令验证配置
- 如果命令执行失败（环境问题），记录错误信息
- 继续完成所有配置文件修改
- 在任务报告中标注"环境验证待完成"

---

## 十二、调度指令

**调度目标**：Coder 子代理
**调度方式**：直接调度执行

**调度命令**（由 Manager 执行）：
```markdown
CODER:执行安卓客户端构建配置完善任务

## 角色
你是 **Coder 子代理**

## 任务文档
- 文件：/workspaces/agent-workspace/projects/controlx/.agent_tasks/pending/task-P0-android-client-build-config.md
- 必须实时更新任务文档内容
- 每步骤完成后立即更新进度状态

## 执行顺序
1. subtask-1: 完善 build.gradle 签名配置和 buildTypes
2. subtask-2: 完善 ProGuard 规则
3. subtask-3: 优化 gradle.properties 配置
4. subtask-4: 创建签名配置模板
5. subtask-5: 创建构建配置文档

## 禁止
- 越界操作（修改 Server 目录或其他子项目）
- 禁止跳过任何子任务
```

---

## 十三、细致度检查报告

**检测时间**：2026-04-05 21:00:00

### 隐形知识检测项（4项）

- [x] **模糊词汇检查**：无"大概"、"可能"、"应该"等模糊词汇（10分）
- [x] **歧义表述检查**：无歧义表述，理解一致（10分）
- [x] **假设性表述检查**：无"假设"、"推断"等假设性表述（10分）
- [x] **隐含信息检查**：所有必要信息显式提供（10分）

**隐形知识检测评分**：40分

### 上下文完整性检测项（5项）

- [x] **文件路径检查**：使用绝对路径（10分）
- [x] **代码片段检查**：配置文件内容已提供（10分）
- [x] **依赖信息检查**：依赖信息已明确（10分）
- [x] **配置信息检查**：配置内容已提供（10分）
- [x] **技术栈检查**：技术栈明确（10分）

**上下文完整性评分**：50分

### 任务描述明确性检测项（6项）

- [x] **操作目标明确**：明确指定完善目标（5分）
- [x] **操作类型明确**：明确指定修改/创建类型（5分）
- [x] **操作位置明确**：精确到文件路径（5分）
- [x] **验收标准明确**：提供明确的验收条件（5分）
- [x] **执行步骤明确**：步骤顺序清晰（5分）
- [x] **回滚方案明确**：Git 分支策略提供回滚能力（5分）

**任务描述明确性评分**：30分

### 综合评分

**总分**：40 + 50 + 30 = 120分（满分）
**细致度级别**：零决策级
**未通过项**：无

**结论**：任务文档合格，可执行