# 当前任务：使用 Appium MCP 工具测试 Android 端基础操作

**开始时间**: 2026-02-20 15:00
**目标**: 使用 Appium MCP 工具在默认模拟器上测试 ControlX Android 客户端的基础操作

---

## 任务背景

ControlX 项目已有完整的 Appium E2E 测试框架，现在需要使用 Appium MCP 工具直接在默认模拟器上测试 Android 端的基础操作。

### 前置条件

- ✅ Android 模拟器已启动并连接
- ✅ ControlX Android 客户端已构建
- ✅ Appium MCP 工具可用

---

## 测试目标

### 基础操作测试清单

| 序号 | 测试项 | 操作描述 | 预期结果 |
|------|--------|----------|----------|
| 1 | 设备安装 | 安装 APK 到模拟器 | 安装成功 |
| 2 | 应用启动 | 启动 ControlX 应用 | 应用正常启动，显示主界面 |
| 3 | UI 元素识别 | 识别 Start/Stop 按钮 | 成功定位按钮元素 |
| 4 | 启动服务 | 点击 Start 按钮 | 服务启动，状态变更 |
| 5 | 停止服务 | 点击 Stop 按钮 | 服务停止，状态恢复 |
| 6 | 应用卸载 | 卸载应用 | 卸载成功 |

---

## 技术方案

### 使用 Appium MCP 工具

| 工具 | 用途 |
|------|------|
| `select_platform` | 选择 Android 平台 |
| `select_device` | 选择模拟器设备 |
| `create_session` | 创建 Appium 会话 |
| `appium_install_app` | 安装 APK |
| `appium_find_element` | 查找 UI 元素 |
| `appium_click` | 点击元素 |
| `appium_get_text` | 获取元素文本 |
| `appium_screenshot` | 截图验证 |
| `appium_uninstall_app` | 卸载应用 |
| `delete_session` | 删除会话 |

### 测试流程

```
1. 选择平台 (Android) 
   ↓
2. 选择设备 (模拟器)
   ↓
3. 创建会话
   ↓
4. 安装应用
   ↓
5. 启动应用
   ↓
6. UI 元素验证
   ↓
7. 功能测试 (Start/Stop)
   ↓
8. 截图记录
   ↓
9. 卸载应用
   ↓
10. 清理会话
```

---

## APK 路径

**Android 客户端路径**: `projects/ControlX/AndroidClient/`

**APK 输出路径**: `projects/ControlX/AndroidClient/app/build/outputs/apk/debug/app-debug.apk`

---

## 注意事项

- ⚠️ 确保模拟器已启动并连接
- ⚠️ 确保 APK 已构建
- ⚠️ 测试期间不得操作模拟器
- ⚠️ 每个步骤失败时需截图记录

---

## 执行记录

### [2026-02-20 15:00] 任务开始
- 已读取相关文档
- 已制定测试计划
- 准备执行测试

---

## 待迁移内容
- [ ] 测试结果迁移到 TASKS.md
- [ ] 最佳实践记录到 KNOWLEDGE.md
