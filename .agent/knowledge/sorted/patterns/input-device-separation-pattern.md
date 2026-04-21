# 设计模式：输入设备类型分离设计

## 元信息
- 版本：1.0.0
- 最后修改：2026-04-21
- 作者：Learner
- 分类：设计模式
- 验证状态：已验证

## 摘要

在多输入设备系统中，采用类型系统实现设备类型的清晰分离，避免不同设备输入数据的混淆。本模式展示了如何通过TypeScript接口设计区分独立摇杆设备和游戏手柄摇杆。

## 问题描述

在ControlX项目中，系统需要同时支持：
1. 独立摇杆设备（如飞行摇杆）
2. 游戏手柄（如Xbox控制器）

两种设备都提供摇杆输入，但数据结构和处理方式不同。如果使用单一类型表示，会导致：
- 类型混淆
- 数据映射错误
- 代码可维护性下降

## 解决方案

### 类型定义

```typescript
// 游戏手柄摇杆轴状态（四轴设计）
export interface GamepadAxesState {
    LX: number; // 左摇杆X轴 [-1.0, 1.0]
    LY: number; // 左摇杆Y轴 [-1.0, 1.0]
    RX: number; // 右摇杆X轴 [-1.0, 1.0]
    RY: number; // 右摇杆Y轴 [-1.0, 1.0]
}

// 游戏手柄扳机状态
export interface GamepadTriggersState {
    LT: number; // 左扳机 [0.0, 1.0]
    RT: number; // 右扳机 [0.0, 1.0]
}

// 统一输入状态接口
export interface InputState {
    // ... 其他属性
    
    // 游戏手柄专用属性（可选，因为手柄可能未连接）
    gamepadAxes?: GamepadAxesState;
    gamepadTriggers?: GamepadTriggersState;
    
    // 独立摇杆设备属性（必需，有默认值）
    joystick: {
        x: number;
        y: number;
        deadzone: number;
        smoothing: number;
    };
}
```

### 设计要点

1. **命名区分**：使用 `gamepadAxes` vs `joystick` 明确区分设备类型
2. **可选性设计**：手柄属性使用可选标记（`?`），独立设备属性为必需
3. **四轴映射**：手柄摇杆使用LX/LY/RX/RY命名，与XInput标准对齐
4. **扳机分离**：扳机状态单独定义，因为其值域（0-1）与摇杆（-1到1）不同

## 应用场景

- 多输入设备游戏系统
- 远程控制应用
- 模拟器输入处理
- 任何需要区分不同输入设备的系统

## 相关代码位置

- 类型定义：[ws.ts:157-191](file:///workspaces/agent-workspace/projects/ControlX/Server/src/types/ws.ts#L157-L191)
- 适配器实现：[GamepadAdapter.ts:68-97](file:///workspaces/agent-workspace/projects/ControlX/Server/src/input/adapters/GamepadAdapter.ts#L68-L97)
- 状态处理：[state.ts:154-190](file:///workspaces/agent-workspace/projects/ControlX/Server/src/ws/handlers/state.ts#L154-L190)

## 注意事项

1. 确保数据流转路径中每个环节都正确处理可选属性
2. 在适配器层添加空值检查
3. 文档中明确说明两种设备的区别

## 标签

- design-pattern
- typescript
- input-handling
- device-separation
- controlx
