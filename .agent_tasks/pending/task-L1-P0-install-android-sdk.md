# Task-L1-P0-install-android-sdk: 安装 Android SDK 命令行工具

**创建时间**：2026-04-02 09:50:00
**优先级**：P0
**状态**：pending
**层级**：L1（子任务）
**父任务**：task-L0-P0-android-build-config
**依赖任务**：task-L1-P0-jdk-env-verify（已完成）
**预计时间**：30-45 分钟

---

## 一、任务描述

**原子操作**：安装 Android SDK 命令行工具，包括 Command Line Tools、Platform Tools、Build Tools 和 Android Platform 34。

**任务类型**：合并任务（环境配置流程）
**合并原因**：SDK 安装是一个完整的安装流程，各步骤强关联，失败需整体回滚。

---

## 二、任务背景

### 2.1 问题描述
Android SDK 未安装，导致 Gradle 无法构建 Android 项目。当前阻塞任务 task-L1-P0-android-sdk-env-verify 无法继续。

### 2.2 当前状态
- **系统架构**：x86_64（可直接使用官方 SDK）
- **Java 环境**：OpenJDK 21.0.10（已就绪）
- **ANDROID_HOME**：未设置
- **SDK 目录**：不存在
- **缺失工具**：unzip（需要先安装）

### 2.3 SDK 需求（来自 build.gradle）
- compileSdk: 34
- minSdk: 28
- targetSdk: 34
- Build-tools: 34.0.1 或更高
- Platform-tools: 最新版本

### 2.4 影响范围
- 直接影响：AndroidClient 项目无法构建
- 间接影响：APK 编译、E2E 测试无法运行

---

## 三、分支规划

**任务类型**：环境配置任务
**基础分支**：master（当前分支）
**任务分支**：task-L1-P0-install-android-sdk
**合并目标**：master
**分支策略**：创建新分支

**创建分支命令**：
```bash
cd /home/linecat/agent-workspace/projects/ControlX
git checkout master
git pull origin master
git checkout -b task-L1-P0-install-android-sdk
git push origin task-L1-P0-install-android-sdk
```

**合并分支命令**（Reviewer 执行）：
```bash
git checkout master
git pull origin master
git merge task-L1-P0-install-android-sdk
git push origin master
```

---

## 四、详细执行计划

### 4.1 前置准备

#### 步骤 1：安装 unzip 工具
**操作类型**：系统命令
**命令**：
```bash
sudo apt-get update && sudo apt-get install -y unzip
```
**预期结果**：unzip 工具安装成功
**验证命令**：
```bash
which unzip && unzip -v
```

### 4.2 SDK 安装流程

#### 步骤 2：创建 SDK 目录
**操作类型**：创建目录
**命令**：
```bash
mkdir -p ~/android_sdk/cmdline-tools
```
**预期结果**：目录创建成功
**验证命令**：
```bash
ls -la ~/android_sdk/
```

#### 步骤 3：下载 Command Line Tools
**操作类型**：下载文件
**下载地址**：https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
**版本**：9.0 (11076708)
**命令**：
```bash
cd ~/android_sdk
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
```
**预期结果**：ZIP 文件下载成功
**验证命令**：
```bash
ls -la ~/android_sdk/commandlinetools-linux-11076708_latest.zip
```

#### 步骤 4：解压和配置 Command Line Tools
**操作类型**：解压和移动文件
**命令**：
```bash
cd ~/android_sdk
unzip commandlinetools-linux-11076708_latest.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
rm -f commandlinetools-linux-11076708_latest.zip
```
**预期结果**：sdkmanager 可执行
**验证命令**：
```bash
~/android_sdk/cmdline-tools/latest/bin/sdkmanager --version
```

#### 步骤 5：设置环境变量（临时）
**操作类型**：设置环境变量
**命令**：
```bash
export ANDROID_HOME=$HOME/android_sdk
export ANDROID_SDK_ROOT=$HOME/android_sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.1
```
**预期结果**：环境变量设置成功
**验证命令**：
```bash
echo "ANDROID_HOME: $ANDROID_HOME"
echo "ANDROID_SDK_ROOT: $ANDROID_SDK_ROOT"
```

#### 步骤 6：接受 SDK 许可证
**操作类型**：接受许可证
**命令**：
```bash
yes | ~/android_sdk/cmdline-tools/latest/bin/sdkmanager --licenses
```
**预期结果**：所有许可证已接受
**验证命令**：
```bash
ls -la ~/android_sdk/.android/
```

#### 步骤 7：安装 Platform Tools
**操作类型**：SDK 安装
**命令**：
```bash
~/android_sdk/cmdline-tools/latest/bin/sdkmanager "platform-tools"
```
**预期结果**：platform-tools 安装成功
**验证命令**：
```bash
~/android_sdk/platform-tools/adb --version
```

#### 步骤 8：安装 Build Tools 34.0.1
**操作类型**：SDK 安装
**命令**：
```bash
~/android_sdk/cmdline-tools/latest/bin/sdkmanager "build-tools;34.0.1"
```
**预期结果**：build-tools;34.0.1 安装成功
**验证命令**：
```bash
ls -la ~/android_sdk/build-tools/34.0.1/
```

#### 步骤 9：安装 Android Platform 34
**操作类型**：SDK 安装
**命令**：
```bash
~/android_sdk/cmdline-tools/latest/bin/sdkmanager "platforms;android-34"
```
**预期结果**：platforms;android-34 安装成功
**验证命令**：
```bash
ls -la ~/android_sdk/platforms/android-34/
```

#### 步骤 10：设置环境变量（永久）
**操作类型**：修改 ~/.bashrc
**命令**：
```bash
cat >> ~/.bashrc << 'EOF'

# Android SDK Environment
export ANDROID_HOME=$HOME/android_sdk
export ANDROID_SDK_ROOT=$HOME/android_sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.1
EOF
source ~/.bashrc
```
**预期结果**：环境变量永久设置
**验证命令**：
```bash
grep "ANDROID_HOME" ~/.bashrc
```

#### 步骤 11：创建 local.properties
**操作类型**：创建文件
**文件路径**：/home/linecat/agent-workspace/projects/ControlX/AndroidClient/local.properties
**内容**：
```
sdk.dir=/home/linecat/android_sdk
```
**命令**：
```bash
echo "sdk.dir=/home/linecat/android_sdk" > /home/linecat/agent-workspace/projects/ControlX/AndroidClient/local.properties
```
**预期结果**：local.properties 创建成功
**验证命令**：
```bash
cat /home/linecat/agent-workspace/projects/ControlX/AndroidClient/local.properties
```

### 4.3 最终验证

#### 步骤 12：验证 SDK 安装完整性
**操作类型**：验证
**命令**：
```bash
# 验证环境变量
echo "ANDROID_HOME: $ANDROID_HOME"

# 验证 sdkmanager
sdkmanager --version

# 验证 adb
adb --version

# 验证已安装组件
sdkmanager --list_installed

# 验证目录结构
ls -la ~/android_sdk/
```
**预期输出**：
```
Installed packages:
  build-tools;34.0.1    | 34.0.1    | Android SDK Build-Tools
  platforms;android-34  | X         | Android SDK Platform 34
  platform-tools        | X         | Android SDK Platform-Tools
```

---

## 五、验收标准（双勾选框）

- [C] [ ] unzip 工具已安装 - Coder 完成确认
- [R] [ ] unzip 工具已安装 - Reviewer 二次确认
- [C] [ ] ANDROID_HOME 环境变量已设置 - Coder 完成确认
- [R] [ ] ANDROID_HOME 环境变量已设置 - Reviewer 二次确认
- [C] [ ] sdkmanager 可执行 - Coder 完成确认
- [R] [ ] sdkmanager 可执行 - Reviewer 二次确认
- [C] [ ] platform-tools 已安装（adb 可执行） - Coder 完成确认
- [R] [ ] platform-tools 已安装（adb 可执行） - Reviewer 二次确认
- [C] [ ] build-tools;34.0.1 已安装 - Coder 完成确认
- [R] [ ] build-tools;34.0.1 已安装 - Reviewer 二次确认
- [C] [ ] platforms;android-34 已安装 - Coder 完成确认
- [R] [ ] platforms;android-34 已安装 - Reviewer 二次确认
- [C] [ ] local.properties 已创建 - Coder 完成确认
- [R] [ ] local.properties 已创建 - Reviewer 二次确认
- [C] [ ] ~/.bashrc 已更新 - Coder 完成确认
- [R] [ ] ~/.bashrc 已更新 - Reviewer 二次确认

---

## 六、风险评估

| 风险项 | 可能性 | 影响程度 | 缓解策略 |
|--------|--------|----------|----------|
| 下载失败（网络问题） | 中 | 高 | 使用 curl 替代 wget，检查网络连接 |
| 许可证接受失败 | 低 | 中 | 手动运行 sdkmanager --licenses |
| 环境变量冲突 | 低 | 中 | 检查 ~/.bashrc 中是否有重复配置 |
| 空间不足 | 低 | 高 | 检查磁盘空间（需要约 2GB） |

---

## 七、回滚方案

**回滚条件**：
- 安装失败
- 验证失败
- 环境变量设置错误

**回滚操作**：
```bash
# 删除 SDK 目录
rm -rf ~/android_sdk

# 清除环境变量
unset ANDROID_HOME
unset ANDROID_SDK_ROOT

# 从 ~/.bashrc 中删除 SDK 配置
# 手动编辑 ~/.bashrc，删除以下行：
# export ANDROID_HOME=$HOME/android_sdk
# export ANDROID_SDK_ROOT=$HOME/android_sdk
# export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:...

# 删除 local.properties
rm -f /home/linecat/agent-workspace/projects/ControlX/AndroidClient/local.properties
```

---

## 八、执行进度（实时更新区域）

### 步骤一：安装 unzip 工具
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤二：创建 SDK 目录
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤三：下载 Command Line Tools
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤四：解压和配置 Command Line Tools
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤五：设置环境变量（临时）
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤六：接受 SDK 许可证
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤七：安装 Platform Tools
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤八：安装 Build Tools 34.0.1
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤九：安装 Android Platform 34
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤十：设置环境变量（永久）
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤十一：创建 local.properties
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

### 步骤十二：验证 SDK 安装完整性
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：-

---

## 九、问题记录（实时更新区域）

### 问题一：[问题名称]
**发现时间**：-
**问题描述**：-
**影响范围**：-
**解决方案**：-
**解决状态**：-
**解决时间**：-

---

## 十、有价值发现（实时更新区域）

### 发现一：系统架构为 x86_64
**发现时间**：2026-04-02 09:50:00
**发现内容**：系统架构为 x86_64，可直接使用 Google 官方 Android SDK，无需使用 ARM64 特殊版本
**价值说明**：简化安装流程，无需从社区维护的仓库下载 ARM64 版本
**应用建议**：直接使用 sdkmanager 安装所有组件

### 发现二：unzip 工具缺失
**发现时间**：2026-04-02 09:50:00
**发现内容**：系统缺少 unzip 工具，需要先安装才能解压 Command Line Tools
**价值说明**：明确了前置依赖，避免安装失败
**应用建议**：在安装 SDK 前先安装 unzip

---

## 十一、审核记录（实时更新区域）

### 审核一
**审核时间**：-
**审核结论**：-
**审核者**：Reviewer

#### 问题列表
| 问题 | 级别 | 位置 | 描述 | 建议 |
|------|------|------|------|------|
| - | - | - | - | - |

#### 改进建议
- -

---

## 十二、标签

`安装` `环境配置` `Android SDK` `P0` `L1` `ControlX`