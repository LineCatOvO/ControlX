# Android SDK ARM64 安装指南

本文档记录了在 ARM64 Linux (Debian 13) 系统上安装 Android SDK 的完整过程。

## 系统环境

- **操作系统**: Debian GNU/Linux 13 (trixie)
- **架构**: ARM64 (aarch64)
- **Java 版本**: OpenJDK 21.0.10

## 安装总结

### ✅ 已安装的组件

| 组件 | 版本 | 架构 | 状态 |
|------|------|------|------|
| **Command Line Tools** | 9.0 | Java (跨平台) | ✅ 完成 |
| **Platform Tools** | 34.0.4 | ARM64 原生 | ✅ 完成 |
| **Build Tools** | 34.0.0, 36.0.0 | ARM64 原生 | ✅ 完成 |
| **Android Platforms** | 34, 36 | - | ✅ 完成 |
| **NDK** | 25.2.9519653 | ARM64 原生 | ✅ 完成 |

### 验证结果

```bash
$ adb --version
Android Debug Bridge version 1.0.41
Version 34.0.4-OS3.0.7.0.WONCNXM
Running on Linux 6.17.0-PRoot-Distro (aarch64)

$ fastboot --version
fastboot version 34.0.4-OS3.0.7.0.WONCNXM

$ sdkmanager --version
9.0
```

## 安装步骤

### 1. 检查 Java 环境

```bash
java -version
# OpenJDK 21.0.10
```

### 2. 创建 SDK 目录

```bash
mkdir -p ~/android_sdk
```

### 3. 下载 Command Line Tools

```bash
cd ~/android_sdk
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-11076708_latest.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/
rmdir cmdline-tools
```

### 4. 配置环境变量

```bash
export ANDROID_HOME=$HOME/android_sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0
```

永久配置（添加到 ~/.bashrc）：

```bash
echo 'export ANDROID_HOME=$HOME/android_sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0' >> ~/.bashrc
source ~/.bashrc
```

### 5. 接受许可证

```bash
sdkmanager --licenses
```

### 6. 安装组件

```bash
# 安装 platform-tools（注意：官方 sdkmanager 下载的是 x86-64 版本）
sdkmanager "platform-tools"

# 安装 build-tools 和 platforms
sdkmanager "build-tools;34.0.0" "platforms;android-34"
```

### 7. 替换为 ARM64 版本的 platform-tools

由于官方 sdkmanager 在 ARM64 Linux 上会下载 x86-64 版本的 platform-tools，需要手动替换为 ARM64 版本：

```bash
# 下载 ARM64 版本（来自 AndroidIDEOfficial 社区维护）
cd ~/android_sdk
curl -L -o platform-tools-34.0.4-aarch64.tar.xz \
  https://github.com/AndroidIDEOfficial/platform-tools/releases/download/v34.0.4/platform-tools-34.0.4-aarch64.tar.xz

# 替换 x86-64 版本
rm -rf platform-tools
tar -xf platform-tools-34.0.4-aarch64.tar.xz

# 验证架构
file platform-tools/adb
# 应该显示：ELF 64-bit LSB executable, ARM aarch64
```

### 8. 验证安装

```bash
adb --version
fastboot --version
sdkmanager --list_installed
```

## 重要注意事项

### ⚠️ Platform Tools ARM64 版本

Google 官方 sdkmanager 在 ARM64 Linux 上会下载 x86-64 版本的 platform-tools，这无法在 ARM64 系统上运行。

**解决方案**：使用社区维护的 ARM64 版本：
- **来源**: AndroidIDEOfficial/platform-tools
- **地址**: https://github.com/AndroidIDEOfficial/platform-tools/releases
- **版本**: v34.0.4 (最新 ARM64 版本)

### ⚠️ 环境变量

确保 `~/.bashrc` 中只有一套环境变量配置，避免冲突。

## 已安装的包列表

```
Installed packages:
  Path                        | Version      | Description
  --------------------------- | ------------ | --------------------------
  build-tools;30.0.3          | 30.0.3       | Android SDK Build-Tools 30.0.3
  build-tools;34.0.0          | 34.0.0       | Android SDK Build-Tools 34
  build-tools;36.0.0          | 36.0.0       | Android SDK Build-Tools 36
  extras;android;m2repository | 47.0.0       | Android Support Repository
  extras;google;m2repository  | 58           | Google Repository
  ndk;25.2.9519653            | 25.2.9519653 | NDK (Side by side) 25.2.9519653
  platforms;android-34        | 3            | Android SDK Platform 34
  platforms;android-36        | 2            | Android SDK Platform 36
  platform-tools              | 34.0.4       | Android SDK Platform-Tools (ARM64)
```

## 参考资源

- [AndroidIDEOfficial/platform-tools](https://github.com/AndroidIDEOfficial/platform-tools/releases) - ARM64 版本
- [lzhiyong/android-sdk-tools](https://github.com/Lzhiyong/android-sdk-tools/releases) - 另一个 ARM64 版本来源
- [在 ARM64 Linux 上配置安卓开发环境](https://blog.chyk.ink/2025/03/14/android-development-on-linux-arm64/) - 详细教程

## 下一步

1. 配置安卓客户端项目
2. 设置 gradle.properties
3. 构建安卓客户端 APK

---

**安装日期**: 2026-02-19  
**安装位置**: /home/linecat/android_sdk  
**系统架构**: ARM64 (aarch64)
