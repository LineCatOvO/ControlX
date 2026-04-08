# ADR-002: ViGEmBus + Xbox 360 控制器作为虚拟手柄方案

## 状态

已采纳

## 背景

远程赛车输入控制系统需要在 Windows 平台上生成虚拟游戏手柄输入，用于控制赛车游戏。系统要求：
- 输出必须被 Windows 游戏识别为真实手柄输入
- 支持完整的 Xbox 360 控制器功能（摇杆、扳机、按钮）
- 目标游戏运行于 Wine/Proton 环境
- 需要稳定、可靠的虚拟设备驱动

## 决策

采用 ViGEmBus 驱动 + Xbox 360 控制器（XInput）方案。

具体技术路线：
- 虚拟手柄驱动：ViGEmBus
- Node.js 绑定库：vigemclient (node-ViGEmClient)
- 呈现设备类型：Xbox 360 控制器（XInput）
- 通道范围：完整 Xbox 通道（摇杆、扳机、按钮）

## 理由

1. **XInput 标准化**：Xbox 360 控制器是 Windows 游戏最广泛支持的手柄标准
2. **ViGEmBus 成熟性**：ViGEmBus 是开源、稳定、广泛使用的虚拟手柄驱动
3. **游戏兼容性**：几乎所有 Windows 游戏都能识别 Xbox 360 控制器
4. **Wine/Proton 支持**：XInput 在 Wine/Proton 环境下有良好支持
5. **Node.js 绑定可用**：vigemclient 提供可靠的 Node.js 绑定

## 替代方案

### 方案 A：DirectInput 虚拟手柄
- DirectInput 是旧标准
- 现代游戏更偏好 XInput
- 兼容性不如 XInput

### 方案 B：自定义 HID 驱动
- 可完全自定义设备类型
- 开发和维护成本高
- 不必要，XInput 已满足需求

### 方案 C：使用其他虚拟手柄软件（如 vJoy）
- vJoy 功能丰富
- ViGEmBus 专注 Xbox/PS 控制器，更简单直接
- ViGEmBus 在游戏兼容性上表现更好

## 后果

### 正面
- 游戏兼容性极佳
- 技术路线简单明确
- 开发效率高
- 维护成本低

### 负面
- 需要安装系统级驱动（管理员权限）
- 需要用户手动安装 ViGEmBus

### 风险
- ViGEmBus 是第三方驱动，需确保来源可信
- 部分反作弊系统可能检测虚拟设备（系统外部约束）

## 参考

- docs/tech/server/VirtualDeviceImplementation.md
- docs/SRS.md §6 控制结果类型
- ViGEmBus 官方文档：https://github.com/ViGEm/KbViGEmBusSetup