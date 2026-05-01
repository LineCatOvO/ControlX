# ControlX - 远程赛车输入控制系统

ControlX 是一个远程赛车输入控制系统，允许通过安卓设备上的用户操作生成控制结果，使目标赛车游戏在无需修改的情况下响应这些控制。

## 📋 待完成任务清单

详见 [TASKS.md](TASKS.md) 获取详细的任务分解和实施建议。

### 任务概览

| 优先级 | 任务数 | 已完成 | 子任务数 | 预计工作量 |
|--------|--------|--------|----------|------------|
| 🔴 P0 | 4 | 4 | 40+ | 2-3 周 |
| 🟡 P1 | 3 | 3 | 20+ | 1-2 周 |
| 🟢 P2 | 3 | 3 | 20+ | 1 周 |
| **总计** | **10** | **10** | **80+** | **4-6 周** |

### P0 - 核心功能缺失（必须立即实现）

- [x] **1. 游戏手柄真实实现（XInput + ViGEmBus）**
  - [x] 安装和配置系统级依赖
  - [x] 实现 GamepadXInputAdapter 类
  - [x] 实现完整的 XInput 通道映射
  - [x] 实现状态提交策略
  - [x] 修复 GamepadExecutor

- [x] **2. 键盘映射规则完善**
  - [x] 实现差集计算逻辑
  - [x] 实现幂等性保证
  - [x] 实现正确的按键顺序
  - [x] 实现清零时的键盘行为
  - [x] 添加键盘映射日志

- [x] **3. 输入验证器实现**
  - [x] 创建 InputValidator 类
  - [x] 实现键盘状态验证
  - [x] 实现游戏手柄状态验证
  - [x] 实现序列号单调性验证
  - [x] 集成验证器到消息处理流程

- [x] **4. WebSocket 协议完整实现**
  - [x] 实现状态消息处理器
  - [x] 实现输入事件处理器
  - [x] 实现延迟探测机制
  - [x] 实现 ACK 机制
  - [x] 完善 RTT 计算

### P1 - 重要功能缺失（近期实现）

- [x] **5. ApplyScheduler 时间权威明确**
- [x] **6. 心跳与延迟探测完整实现**
- [x] **7. 模块边界重构**

### P2 - 优化与增强（后续实现）

- [x] **8. WebSocket 协议增强**
- [x] **9. 可观测性指标完善**
- [x] **10. 集成测试完善**

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Android Client                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Input Layer (Native)                    │  │
│  │  MotionEvent → InteractionCapture → Node HitTest     │  │
│  │  → IntentComposer → DeviceProjection                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              UI Layer (WebView)                      │  │
│  │  HTML/CSS 渲染 UI 皮肤，提供布局引擎                │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│              WebSocket (localhost)                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Server                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         WebSocket Handler Layer                      │  │
│  │  State Store → Validator → Apply Scheduler           │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Input Executor Layer                         │  │
│  │  KeyboardExecutor | GamepadExecutor | JoystickExecutor│  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Device Adapter Layer                         │  │
│  │  KeyboardAdapter | GamepadXInputAdapter              │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Virtual Devices (Windows)                    │  │
│  │  Virtual Keyboard | ViGEmBus + Xbox 360 Controller   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 核心设计原则

1. **状态驱动执行模型**
   - 任意时刻的控制可被描述为"当前状态"
   - 控制中断后状态可被明确清空
   - 不依赖历史事件顺序形成隐式状态

2. **接收与应用解耦**
   - WebSocket 接收线程：仅更新 `desiredState`
   - ApplyScheduler：周期性读取 `desiredState` 并执行映射
   - 应用频率：固定 125Hz

3. **安全回退优先**
   - 任何异常、回退或禁用后的最终状态：必须等价于"没有任何控制输出"
   - 超时清零：默认 500ms
   - SafetyController 是唯一允许触发清零的模块

4. **模块边界清晰**
   - 执行端不得理解 UI/Operation/Mapping 语义
   - 不得修改控制状态内容
   - 不得引入脚本或 DSL

## 🛠️ 技术栈

- **前端**：Android (原生 + WebView)
- **后端**：Node.js + TypeScript
- **输入设备**：虚拟键盘、Xbox 360 控制器 (XInput)
- **通信**：WebSocket (本地 localhost)
- **驱动**：ViGEmBus（手柄）、node-key-sender（键盘）

## 📚 技术文档

- [需求文档](doc/requirements.md)
- [执行端技术设计 v1.3](doc/TechDesign/Server/ProjectStructure.md)
- [主逻辑设计 v1.1](doc/TechDesign/Server/MainLogic.md)
- [虚拟设备实现 v1.2](doc/TechDesign/Server/VirturalDeviceImplementation.md)
- [WebSocket 协议](doc/TechDesign/Server/protocol/websocket.md)
- [Android UI 渲染](doc/AndroidUiRendering.md)
- [Android 布局计算](doc/AndroidUILayoutCalculation.md)

## 🚀 开发指南

### 环境要求

- Node.js >= 16.x
- TypeScript >= 4.x
- Windows 操作系统
- 管理员权限（用于安装 ViGEmBus 驱动）

### 安装依赖

```bash
cd Server
npm install
```

### 运行模式

```bash
# Dry Run 模式（调试和测试）
DRY_RUN=true npm start

# Test 模式（无实际输入）
TEST_MODE=true npm start

# 生产模式
npm start
```

### 配置文件

配置文件位于 `config.example.json`，复制为 `config.json` 并根据需要修改。

## 📝 任务管理

- **查看详细任务**：[TASKS.md](TASKS.md)
- **任务统计**：
  - 总任务数：10 个主要类别
  - 总子任务数：80+ 个详细任务
  - 预计总工作量：4-6 周
  - **完成状态：✅ 全部完成**

## 📄 许可证

MIT
