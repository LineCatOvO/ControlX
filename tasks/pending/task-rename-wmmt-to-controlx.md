# Task-P1-RENAME: WMMT 重命名为 ControlX

**创建时间**：2026-03-17
**优先级**：P1
**状态**：待处理
**任务锁**：🔓 待处理 - Planner - 2026-03-17
**项目**：ControlX

## 任务描述

将ControlX项目中所有包含"wmmt"（不区分大小写）的名称字段全部重命名为"ControlX"相关的新名称。

## 任务背景

项目文件夹名为"ControlX"，但代码和配置中仍使用旧名称"WMMT"（Wangan Midnight Maximum Tune - 一个赛车游戏系列）。需要统一使用新名称"ControlX"以保持一致性。

## 名称映射规则

| 旧名称 | 新名称 | 说明 |
|--------|--------|------|
| `WMMT Controller` | `ControlX` | 项目名称 |
| `WMMTRemoteController` | `ControlX` | 项目名称（无空格） |
| `WMMTController` | `ControlX` | 应用名称 |
| `WMMT Controller Server` | `ControlX Server` | 服务器名称 |
| `WMMT 远程控制器` | `ControlX 远程控制器` | 中文显示名 |
| `WMMT Team` | `ControlX Team` | 团队名 |
| `com.linecat.wmmtcontroller` | `com.linecat.controlx` | Android包名 |
| `wmmtcontroller` | `controlx` | 进程名 |
| `WMMTController.apk` | `ControlX.apk` | APK文件名 |

## 搜索结果统计

- **总匹配数**：759处
- **涉及文件数**：约150+个文件
- **主要类别**：
  - Android Java源码：144个文件
  - 配置文件：build.gradle, strings.xml, package.json等
  - 测试代码：appium-e2e目录下的测试文件
  - 文档文件：README.md, CHANGELOG.md等

## 详细执行计划

### 阶段一：Android项目核心配置（P0 - 必须首先执行）

#### 任务1.1：修改Android应用名称

**任务ID**：task-rename-1.1
**操作类型**：文件编辑
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/res/values/strings.xml`
**预计执行时间**：约10秒

##### 任务背景
strings.xml定义了Android应用的显示名称，需要将"WMMTController"改为"ControlX"。

##### 操作命令（必填）
```
操作：使用 SearchReplace 工具
文件路径：/workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/res/values/strings.xml
搜索内容（old_str）：
    <string name="app_name">WMMTController</string>
替换内容（new_str）：
    <string name="app_name">ControlX</string>
```

##### 验证命令（必填）
```
验证命令：grep "app_name" /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/res/values/strings.xml
预期输出：    <string name="app_name">ControlX</string>
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
使用 SearchReplace 工具，将 "ControlX" 改回 "WMMTController"
```

---

#### 任务1.2：修改Android build.gradle包名配置

**任务ID**：task-rename-1.2
**操作类型**：文件编辑
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/build.gradle`
**预计执行时间**：约30秒

##### 任务背景
build.gradle定义了Android应用的namespace和applicationId，需要从"com.linecat.wmmtcontroller"改为"com.linecat.controlx"。

##### 操作命令（必填）
```
操作：使用 SearchReplace 工具（需要执行3次替换）

第一次替换：
文件路径：/workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/build.gradle
搜索内容（old_str）：
    namespace 'com.linecat.wmmtcontroller'
替换内容（new_str）：
    namespace 'com.linecat.controlx'

第二次替换：
搜索内容（old_str）：
        applicationId "com.linecat.wmmtcontroller"
替换内容（new_str）：
        applicationId "com.linecat.controlx"
```

##### 验证命令（必填）
```
验证命令：grep -E "(namespace|applicationId)" /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/build.gradle
预期输出：
    namespace 'com.linecat.controlx'
        applicationId "com.linecat.controlx"
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
将 namespace 和 applicationId 改回 "com.linecat.wmmtcontroller"
```

---

#### 任务1.3：重命名Java包目录

**任务ID**：task-rename-1.3
**操作类型**：目录重命名
**目标**：`/workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/wmmtcontroller`
**预计执行时间**：约10秒

##### 任务背景
Java包目录名需要从"wmmtcontroller"改为"controlx"以匹配新的包名。

##### 操作命令（必填）
```
操作：使用 RunCommand 工具
命令：mv /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/wmmtcontroller /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/controlx
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

##### 验证命令（必填）
```
验证命令：ls /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/
预期输出：controlx
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
mv /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/controlx /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/wmmtcontroller
```

---

#### 任务1.4：修改所有Java文件的package声明

**任务ID**：task-rename-1.4
**操作类型**：批量文件编辑
**目标文件**：所有Java文件（144个）
**预计执行时间**：约5分钟

##### 任务背景
所有Java文件的package声明需要从"com.linecat.wmmtcontroller"改为"com.linecat.controlx"。

##### 操作命令（必填）
```
操作：使用 RunCommand 工具执行批量替换
命令：find /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/controlx -name "*.java" -exec sed -i 's/com\.linecat\.wmmtcontroller/com.linecat.controlx/g' {} +
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

##### 验证命令（必填）
```
验证命令：grep -r "com.linecat.wmmtcontroller" /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/java/ | wc -l
预期输出：0
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
find /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/controlx -name "*.java" -exec sed -i 's/com\.linecat\.controlx/com.linecat.wmmtcontroller/g' {} +
```

---

#### 任务1.5：修改Android测试文件的package声明

**任务ID**：task-rename-1.5
**操作类型**：批量文件编辑
**目标文件**：所有测试Java文件
**预计执行时间**：约2分钟

##### 任务背景
测试文件也需要更新package声明。

##### 操作命令（必填）
```
操作：使用 RunCommand 工具执行批量替换
命令：find /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/test -name "*.java" -exec sed -i 's/com\.linecat\.wmmtcontroller/com.linecat.controlx/g' {} + && find /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/androidTest -name "*.java" -exec sed -i 's/com\.linecat\.wmmtcontroller/com.linecat.controlx/g' {} +
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

##### 验证命令（必填）
```
验证命令：grep -r "com.linecat.wmmtcontroller" /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/test /workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/androidTest 2>/dev/null | wc -l
预期输出：0
```

---

### 阶段二：Server端代码修改

#### 任务2.1：修改Server欢迎消息

**任务ID**：task-rename-2.1
**操作类型**：文件编辑
**目标文件**：
- `/workspaces/AgentWorkspace/projects/ControlX/Server/index.js`
- `/workspaces/AgentWorkspace/projects/ControlX/Server/src/ws/handlers/welcome.ts`
- `/workspaces/AgentWorkspace/projects/ControlX/Server/src/ws/connection.ts`
**预计执行时间**：约1分钟

##### 操作命令（必填）
```
操作：使用 SearchReplace 工具
搜索内容（old_str）：Connected to WMMT Controller Server
替换内容（new_str）：Connected to ControlX Server
```

##### 验证命令（必填）
```
验证命令：grep -r "Connected to WMMT Controller Server" /workspaces/AgentWorkspace/projects/ControlX/Server/src/ | wc -l
预期输出：0
```

---

#### 任务2.2：修改Server日志输出

**任务ID**：task-rename-2.2
**操作类型**：文件编辑
**目标文件**：
- `/workspaces/AgentWorkspace/projects/ControlX/Server/index.js`
- `/workspaces/AgentWorkspace/projects/ControlX/Server/src/app.ts`
- `/workspaces/AgentWorkspace/projects/ControlX/Server/src/ws/server.ts`
- `/workspaces/AgentWorkspace/projects/ControlX/Server/src/utils/terminalMonitor.ts`
**预计执行时间**：约2分钟

##### 操作命令（必填）
```
操作：使用 SearchReplace 工具（多次替换）
搜索内容（old_str）：WMMT Controller Server
替换内容（new_str）：ControlX Server
```

---

#### 任务2.3：修改Server Web界面

**任务ID**：task-rename-2.3
**操作类型**：文件编辑
**目标文件**：
- `/workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/index.html`
- `/workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/style.css`
- `/workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/app.js`
**预计执行时间**：约1分钟

##### 操作命令（必填）
```
操作：使用 SearchReplace 工具
搜索内容（old_str）：WMMT Controller Server
替换内容（new_str）：ControlX Server
```

---

### 阶段三：测试代码修改

#### 任务3.1：修改appium-e2e配置文件

**任务ID**：task-rename-3.1
**操作类型**：文件编辑
**目标文件**：
- `/workspaces/AgentWorkspace/projects/ControlX/appium-e2e/utils/config.ts`
- `/workspaces/AgentWorkspace/projects/ControlX/appium-e2e/utils/config.js`
- `/workspaces/AgentWorkspace/projects/ControlX/appium-e2e/configs/capabilities.json`
**预计执行时间**：约2分钟

##### 操作命令（必填）
```
操作：使用 SearchReplace 工具
搜索内容（old_str）：com.linecat.wmmtcontroller
替换内容（new_str）：com.linecat.controlx

搜索内容（old_str）：wmmtcontroller
替换内容（new_str）：controlx
```

---

#### 任务3.2：修改appium-e2e测试脚本

**任务ID**：task-rename-3.2
**操作类型**：批量文件编辑
**目标文件**：appium-e2e目录下所有包含wmmt的文件
**预计执行时间**：约3分钟

##### 操作命令（必填）
```
操作：使用 RunCommand 工具执行批量替换
命令：find /workspaces/AgentWorkspace/projects/ControlX/appium-e2e -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i 's/com\.linecat\.wmmtcontroller/com.linecat.controlx/g' {} +
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

---

#### 任务3.3：修改appium-e2e文档和脚本中的显示名称

**任务ID**：task-rename-3.3
**操作类型**：批量文件编辑
**目标文件**：appium-e2e目录下所有文件
**预计执行时间**：约2分钟

##### 操作命令（必填）
```
操作：使用 RunCommand 工具执行批量替换
命令：
find /workspaces/AgentWorkspace/projects/ControlX/appium-e2e -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" -o -name "*.sh" -o -name "*.bat" \) -exec sed -i 's/WMMT Controller/ControlX/g' {} +
find /workspaces/AgentWorkspace/projects/ControlX/appium-e2e -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" -o -name "*.sh" -o -name "*.bat" \) -exec sed -i 's/WMMTRemoteController/ControlX/g' {} +
find /workspaces/AgentWorkspace/projects/ControlX/appium-e2e -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" -o -name "*.sh" -o -name "*.bat" \) -exec sed -i 's/WMMTController/ControlX/g' {} +
find /workspaces/AgentWorkspace/projects/ControlX/appium-e2e -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" -o -name "*.sh" -o -name "*.bat" \) -exec sed -i 's/WMMT Team/ControlX Team/g' {} +
find /workspaces/AgentWorkspace/projects/ControlX/appium-e2e -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" -o -name "*.sh" -o -name "*.bat" \) -exec sed -i 's/WMMT 远程控制器/ControlX 远程控制器/g' {} +
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

---

### 阶段四：文档文件修改

#### 任务4.1：修改README.md

**任务ID**：task-rename-4.1
**操作类型**：文件编辑
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/README.md`
**预计执行时间**：约1分钟

##### 操作命令（必填）
```
操作：使用 SearchReplace 工具
搜索内容（old_str）：# WMMT Controller - 远程赛车输入控制系统
替换内容（new_str）：# ControlX - 远程赛车输入控制系统

搜索内容（old_str）：WMMT Controller 是一个远程赛车输入控制系统
替换内容（new_str）：ControlX 是一个远程赛车输入控制系统
```

---

#### 任务4.2：修改项目根目录文档

**任务ID**：task-rename-4.2
**操作类型**：批量文件编辑
**目标文件**：项目根目录下的所有MD文件
**预计执行时间**：约3分钟

##### 操作命令（必填）
```
操作：使用 RunCommand 工具执行批量替换
命令：
find /workspaces/AgentWorkspace/projects/ControlX -maxdepth 1 -name "*.md" -exec sed -i 's/WMMT Controller/ControlX/g' {} +
find /workspaces/AgentWorkspace/projects/ControlX -maxdepth 1 -name "*.md" -exec sed -i 's/WMMTRemoteController/ControlX/g' {} +
find /workspaces/AgentWorkspace/projects/ControlX -maxdepth 1 -name "*.md" -exec sed -i 's/WMMTController/ControlX/g' {} +
find /workspaces/AgentWorkspace/projects/ControlX -maxdepth 1 -name "*.md" -exec sed -i 's/com\.linecat\.wmmtcontroller/com.linecat.controlx/g' {} +
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

---

#### 任务4.3：修改docs目录文档

**任务ID**：task-rename-4.3
**操作类型**：批量文件编辑
**目标文件**：docs目录下所有MD文件
**预计执行时间**：约2分钟

##### 操作命令（必填）
```
操作：使用 RunCommand 工具执行批量替换
命令：
find /workspaces/AgentWorkspace/projects/ControlX/docs -name "*.md" -exec sed -i 's/WMMT Controller/ControlX/g' {} +
find /workspaces/AgentWorkspace/projects/ControlX/docs -name "*.md" -exec sed -i 's/WMMTController/ControlX/g' {} +
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

---

#### 任务4.4：修改Server/docs文档

**任务ID**：task-rename-4.4
**操作类型**：批量文件编辑
**目标文件**：Server/docs目录下所有MD文件
**预计执行时间**：约1分钟

##### 操作命令（必填）
```
操作：使用 RunCommand 工具执行批量替换
命令：
find /workspaces/AgentWorkspace/projects/ControlX/Server/docs -name "*.md" -exec sed -i 's/WMMT 远程赛车输入控制系统/ControlX 远程赛车输入控制系统/g' {} +
find /workspaces/AgentWorkspace/projects/ControlX/Server/docs -name "*.md" -exec sed -i 's/WMMT Controller/ControlX/g' {} +
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

---

### 阶段五：配置文件修改

#### 任务5.1：修改package.json

**任务ID**：task-rename-5.1
**操作类型**：文件编辑
**目标文件**：
- `/workspaces/AgentWorkspace/projects/ControlX/package.json`
- `/workspaces/AgentWorkspace/projects/ControlX/package-lock.json`
- `/workspaces/AgentWorkspace/projects/ControlX/appium-e2e/package.json`
**预计执行时间**：约1分钟

##### 操作命令（必填）
```
操作：使用 SearchReplace 工具
搜索内容（old_str）：WMMTRemoteController
替换内容（new_str）：ControlX

搜索内容（old_str）：WMMT Remote Controller
替换内容（new_str）：ControlX Remote Controller

搜索内容（old_str）：WMMT Team
替换内容（new_str）：ControlX Team
```

---

#### 任务5.2：修改其他配置文件

**任务ID**：task-rename-5.2
**操作类型**：文件编辑
**目标文件**：
- `/workspaces/AgentWorkspace/projects/ControlX/get-ui-dump.js`
- `/workspaces/AgentWorkspace/projects/ControlX/Server/WMMTControllerServer.iml`（需要重命名）
**预计执行时间**：约1分钟

##### 操作命令（必填）
```
操作：使用 SearchReplace 工具
搜索内容（old_str）：com.linecat.wmmtcontroller
替换内容（new_str）：com.linecat.controlx

搜索内容（old_str）：WMMT 远程控制器
替换内容（new_str）：ControlX 远程控制器
```

---

#### 任务5.3：重命名.iml文件

**任务ID**：task-rename-5.3
**操作类型**：文件重命名
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/Server/WMMTControllerServer.iml`
**预计执行时间**：约10秒

##### 操作命令（必填）
```
操作：使用 RunCommand 工具
命令：mv /workspaces/AgentWorkspace/projects/ControlX/Server/WMMTControllerServer.iml /workspaces/AgentWorkspace/projects/ControlX/Server/ControlXServer.iml
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

---

### 阶段六：清理和验证

#### 任务6.1：验证所有wmmt引用已清除

**任务ID**：task-rename-6.1
**操作类型**：命令执行
**预计执行时间**：约30秒

##### 操作命令（必填）
```
操作：使用 RunCommand 工具
命令：grep -ri "wmmt" /workspaces/AgentWorkspace/projects/ControlX --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build --exclude-dir=.gradle --exclude="*.log" --exclude="hs_err_*.log" 2>/dev/null | grep -v "Binary file" | head -50
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

##### 验证标准
- 核心代码文件中不应有wmmt引用
- 文档文件中不应有WMMT相关名称
- 配置文件中不应有wmmt相关配置

---

#### 任务6.2：构建验证

**任务ID**：task-rename-6.2
**操作类型**：命令执行
**预计执行时间**：约5分钟

##### 操作命令（必填）
```
操作：使用 RunCommand 工具
命令：cd /workspaces/AgentWorkspace/projects/ControlX/AndroidClient && ./gradlew assembleDebug
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

##### 验证标准
- 构建成功，无错误
- 生成的APK包名为com.linecat.controlx

---

## 任务列表

**总任务数**：18
**预计执行时间**：约30-40分钟

### 任务依赖图
```
任务1.1 → 任务1.2 → 任务1.3 → 任务1.4 → 任务1.5
                                        ↓
任务2.1 → 任务2.2 → 任务2.3 ────────────→│
                                        ↓
任务3.1 → 任务3.2 → 任务3.3 ────────────→│
                                        ↓
任务4.1 → 任务4.2 → 任务4.3 → 任务4.4 ──→│
                                        ↓
任务5.1 → 任务5.2 → 任务5.3 ────────────→│
                                        ↓
                              任务6.1 → 任务6.2
```

### 任务列表
| 序号 | 任务ID | 任务名称 | 操作类型 | 依赖 | 预计时间 |
|------|--------|----------|----------|------|----------|
| 1 | task-rename-1.1 | 修改Android应用名称 | 文件编辑 | 无 | 10秒 |
| 2 | task-rename-1.2 | 修改Android build.gradle包名配置 | 文件编辑 | 1.1 | 30秒 |
| 3 | task-rename-1.3 | 重命名Java包目录 | 目录重命名 | 1.2 | 10秒 |
| 4 | task-rename-1.4 | 修改所有Java文件的package声明 | 批量编辑 | 1.3 | 5分钟 |
| 5 | task-rename-1.5 | 修改Android测试文件的package声明 | 批量编辑 | 1.4 | 2分钟 |
| 6 | task-rename-2.1 | 修改Server欢迎消息 | 文件编辑 | 无 | 1分钟 |
| 7 | task-rename-2.2 | 修改Server日志输出 | 文件编辑 | 2.1 | 2分钟 |
| 8 | task-rename-2.3 | 修改Server Web界面 | 文件编辑 | 2.2 | 1分钟 |
| 9 | task-rename-3.1 | 修改appium-e2e配置文件 | 文件编辑 | 无 | 2分钟 |
| 10 | task-rename-3.2 | 修改appium-e2e测试脚本 | 批量编辑 | 3.1 | 3分钟 |
| 11 | task-rename-3.3 | 修改appium-e2e文档和脚本中的显示名称 | 批量编辑 | 3.2 | 2分钟 |
| 12 | task-rename-4.1 | 修改README.md | 文件编辑 | 无 | 1分钟 |
| 13 | task-rename-4.2 | 修改项目根目录文档 | 批量编辑 | 4.1 | 3分钟 |
| 14 | task-rename-4.3 | 修改docs目录文档 | 批量编辑 | 4.2 | 2分钟 |
| 15 | task-rename-4.4 | 修改Server/docs文档 | 批量编辑 | 4.3 | 1分钟 |
| 16 | task-rename-5.1 | 修改package.json | 文件编辑 | 无 | 1分钟 |
| 17 | task-rename-5.2 | 修改其他配置文件 | 文件编辑 | 5.1 | 1分钟 |
| 18 | task-rename-5.3 | 重命名.iml文件 | 文件重命名 | 5.2 | 10秒 |
| 19 | task-rename-6.1 | 验证所有wmmt引用已清除 | 命令执行 | 1-5全部 | 30秒 |
| 20 | task-rename-6.2 | 构建验证 | 命令执行 | 6.1 | 5分钟 |

## 验收标准

- [ ] Android应用名称显示为"ControlX"
- [ ] Android包名为"com.linecat.controlx"
- [ ] Server欢迎消息显示"Connected to ControlX Server"
- [ ] 所有文档中不再出现"WMMT"相关名称
- [ ] 所有测试配置使用新的包名
- [ ] 构建成功，无错误
- [ ] grep搜索确认无遗漏的wmmt引用

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Java包重命名导致构建失败 | 高 | 确保所有import语句同步更新 |
| 测试用例失败 | 中 | 重命名后运行完整测试套件 |
| 第三方库引用旧包名 | 低 | 检查是否有外部依赖引用旧包名 |
| 用户数据迁移 | 中 | 需要考虑已安装应用的升级策略 |

## 注意事项

1. **执行顺序**：必须先完成阶段一（Android核心配置），再执行其他阶段
2. **备份**：执行前建议创建git分支或备份
3. **测试**：重命名后需要运行完整测试套件验证
4. **已安装应用**：包名变更会导致已安装的应用无法直接升级，需要先卸载

## 相关资源

- 项目路径：/workspaces/AgentWorkspace/projects/ControlX
- Android源码：/workspaces/AgentWorkspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/wmmtcontroller
- Server源码：/workspaces/AgentWorkspace/projects/ControlX/Server/src

## 标签
rename, android, server, documentation, configuration