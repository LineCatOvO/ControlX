# 配置说明：Android应用重命名完整指南

## 元信息
- 版本：1.0.0
- 最后修改：2026-04-29
- 作者：Learner
- 分类：配置说明
- 验证状态：已验证

## 摘要

记录WMMT项目重命名为ControlX过程中，Android应用配置的完整修改清单，包括包名、目录、文件声明的批量修改方法。

## 重命名概述

**项目**：WMMT → ControlX
**Android包名**：`com.linecat.wmmtcontroller` → `com.linecat.controlx`
**Java包目录**：`wmmtcontroller` → `controlx`

## Android配置修改清单

### 1. 应用名称

**文件**：`AndroidClient/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">ControlX</string>
```

### 2. build.gradle配置

**文件**：`AndroidClient/app/build.gradle`
```groovy
namespace 'com.linecat.controlx'
applicationId "com.linecat.controlx"
```

### 3. Java包目录

**操作**：重命名目录
```
原：/AndroidClient/app/src/main/java/com/linecat/wmmtcontroller
新：/AndroidClient/app/src/main/java/com/linecat/controlx
```

### 4. Java文件package声明

**数量**：144个Java文件
**变更**：将 `package com.linecat.wmmtcontroller;` 替换为 `package com.linecat.controlx;`

### 5. 测试配置

**文件**：config.ts (Appium E2E)
**变更**：包名更新为 `com.linecat.controlx`

## Server端修改

### 欢迎消息和日志
- Server欢迎消息显示 "ControlX Server"
- 日志输出使用 "ControlX" 命名

### Web界面
- Web监控面板显示 "ControlX Server"

## 项目文件

### .iml文件重命名
```
原：WMMTControllerServer.iml
新：ControlXServer.iml
```

## 批量重命名执行阶段

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| 1 | Android核心配置（app_name, package, build.gradle） | P0 |
| 2 | Java包目录和文件package声明 | P0 |
| 3 | Server端代码修改 | P1 |
| 4 | 测试配置修改 | P1 |
| 5 | 文档文件修改 | P2 |
| 6 | 配置文件和项目文件重命名 | P2 |

## 验证清单

- [x] Android应用名称显示为"ControlX"
- [x] Android包名为"com.linecat.controlx"
- [x] Java包目录为 `com.linecat.controlx`
- [x] Server欢迎消息显示"ControlX Server"
- [x] .iml文件已重命名为 `ControlXServer.iml`
- [x] 源代码中无残留wmmt引用

## 注意事项

1. **历史文件**：任务文档和日志文件中仍包含旧名称引用，属于正常情况
2. **Windows日志**：hs_err*.log包含旧路径，不影响Linux环境
3. **测试日志**：test-run*.log包含旧配置，不影响功能

## 标签

- rename
- android
- package-refactor
- gradle
- configuration
- controlx
