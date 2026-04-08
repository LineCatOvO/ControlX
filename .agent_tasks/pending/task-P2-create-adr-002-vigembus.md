# Task-P2-create-adr-002-vigembus: 创建 ViGEmBus 手柄方案决策记录

**创建时间**：2026-04-10 15:00:00
**优先级**：P2
**状态**：pending
**项目**：ControlX
**预计时间**：20 分钟
**父任务**：用户请求 - ControlX 项目文档改进方案执行
**依赖任务**：task-P1-create-docs-directory-structure

---

## 一、任务描述

**原子操作**：创建架构决策记录文档 ADR-002-vigembus-gamepad.md

---

## 二、任务背景

### 2.1 问题描述
项目采用 ViGEmBus + XInput 方案实现虚拟游戏手柄，但缺乏正式的架构决策记录（ADR）来记录这一选择的原因、背景和后果。

### 2.2 影响范围
- 直接影响：创建新的 ADR 文档
- 间接影响：补充项目架构文档完整性

### 2.3 相关文件
- 参考文档：docs/SRS.md（需求规格）
- 参考文档：docs/tech/server/VirtualDeviceImplementation.md（虚拟设备实现）
- 目标文件：docs/ADR-002-vigembus-gamepad.md

---

## 三、执行计划

### 3.1 操作步骤

#### 步骤 1：创建 ADR-002 文档

**操作类型**：创建
**文件路径**：/workspaces/agent-workspace/projects/ControlX/docs/ADR-002-vigembus-gamepad.md

**内容规划**（ADR 标准格式）：

```markdown
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
```

### 3.2 验证步骤

```bash
# 验证文件已创建
ls -la /workspaces/agent-workspace/projects/ControlX/docs/ADR-002-vigembus-gamepad.md

# 验证内容包含必要章节
grep "## 状态" /workspaces/agent-workspace/projects/ControlX/docs/ADR-002-vigembus-gamepad.md
grep "## 背景" /workspaces/agent-workspace/projects/ControlX/docs/ADR-002-vigembus-gamepad.md
grep "## 决策" /workspaces/agent-workspace/projects/ControlX/docs/ADR-002-vigembus-gamepad.md
```

### 3.3 回滚方案

**回滚操作**：
```bash
rm /workspaces/agent-workspace/projects/ControlX/docs/ADR-002-vigembus-gamepad.md
```

---

## 四、验收标准

- [ ] docs/ADR-002-vigembus-gamepad.md 已创建
- [ ] 包含状态、背景、决策、理由章节
- [ ] 包含替代方案分析
- [ ] 包含后果分析（正面、负面、风险）
- [ ] 包含完整 Xbox 通道定义
- [ ] 包含参考链接

---

## 五、风险评估

| 风险项 | 可能性 | 影响程度 | 缓解策略 |
|--------|--------|----------|----------|
| docs/ 目录不存在 | 低 | 高 | 依赖前置任务 |

---

## 六、分支信息

**基础分支**：develop
**任务分支**：task/P2-create-adr-002-vigembus
**合并目标**：develop
**分支策略**：创建新分支

---

## 七、执行进度（实时更新区域）

### 步骤一：创建 ADR-002 文档
**状态**：待执行
**开始时间**：
**完成时间**：
**执行结果**：
**备注**：

---

## 八、问题记录（实时更新区域）

（暂无问题）

---

## 九、有价值发现（实时更新区域）

（暂无发现）

---

## 十、审核记录（实时更新区域）

（待审核）