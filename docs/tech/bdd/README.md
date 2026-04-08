# ControlX 用户行为驱动开发文档

## 概述

本文档定义了 ControlX 项目的用户行为场景，用于指导端到端测试开发。

BDD（Behavior-Driven Development）文档基于需求文档和功能文档，将用户行为转换为可执行的测试场景。每个 feature 文件使用 Gherkin 语法描述用户行为，包含多个场景（Scenario），每个场景由 Given-When-Then 步骤组成。

## 文档索引

| 文档 | 说明 | 用户行为覆盖 |
|------|------|--------------|
| 01-app-lifecycle.feature | 应用生命周期场景 | 应用启动、停止、重启、后端服务管理 |
| 02-input-acquisition.feature | 输入采集场景 | 触控、陀螺仪、键盘、手柄输入采集 |
| 03-control-result.feature | 控制结果生成场景 | 键盘、手柄控制结果生成、状态驱动、平滑、死区、非线性映射 |
| 04-layout-management.feature | 布局管理场景 | 创建、修改、删除、切换、导入、导出布局 |
| 05-layout-editing.feature | 布局编辑场景 | 添加/删除元素、调整位置/尺寸、编辑映射、调整参数、实时预览 |
| 06-control-state.feature | 控制状态管理场景 | 启用/禁用控制、安全切断、作用范围 |
| 07-connection.feature | 连接管理场景 | WebSocket 连接、ACK 确认、延迟检测、连接恢复 |
| 08-exception-handling.feature | 异常处理场景 | 异常隔离、安全回退、状态清空、超时清空 |

## Gherkin 语法说明

### 基本结构

```gherkin
Feature: 功能名称
  作为 [角色]
  我想要 [执行某个操作]
  以便 [达到某个目标]

  Background:
    Given [前置条件]

  Scenario: 场景名称
    Given [前置条件]
    When [用户操作]
    Then [预期结果]
```

### 关键字说明

| 关键字 | 说明 | 示例 |
|--------|------|------|
| **Feature** | 功能描述，定义一组相关场景 | `Feature: 输入采集` |
| **作为** | 定义用户角色 | `作为 ControlX 用户` |
| **我想要** | 定义用户目标 | `我想要采集用户输入` |
| **以便** | 定义目标价值 | `以便生成控制结果` |
| **Background** | 场景前置条件，所有场景共享 | `Background: Given ControlX 应用已启动` |
| **Scenario** | 单个场景描述 | `Scenario: 触控输入采集` |
| **Given** | 场景前置条件 | `Given 触控输入源可用` |
| **When** | 用户操作 | `When 用户触摸屏幕` |
| **Then** | 预期结果 | `Then 系统感知触控位置` |
| **And** | 连接多个步骤 | `And 连续输入可被持续感知` |

### 最佳实践

1. **场景命名**：使用描述性名称，清晰表达场景目标
2. **步骤简洁**：每个步骤只描述一个动作或状态
3. **可测试性**：每个 Then 步骤都应该是可验证的
4. **独立性**：每个场景应该独立，不依赖其他场景的执行结果
5. **完整性**：覆盖所有用户行为，包括正常流程和异常流程

## 用户行为覆盖分析

### 已覆盖的用户行为

| 用户行为类别 | Feature 文件 | 场景数量 |
|--------------|--------------|----------|
| **应用生命周期** | 01-app-lifecycle.feature | 7 |
| **输入采集** | 02-input-acquisition.feature | 7 |
| **控制结果生成** | 03-control-result.feature | 8 |
| **布局管理** | 04-layout-management.feature | 9 |
| **布局编辑** | 05-layout-editing.feature | 10 |
| **控制状态管理** | 06-control-state.feature | 7 |
| **连接管理** | 07-connection.feature | 10 |
| **异常处理** | 08-exception-handling.feature | 6 |

**总计**：8 个 feature 文件，64 个场景

### 用户行为映射表

| 需求文档用户行为 | Feature 文件 | 场景 |
|------------------|--------------|------|
| 应用启动 | 01-app-lifecycle.feature | Scenario: 应用启动 |
| 应用停止 | 01-app-lifecycle.feature | Scenario: 应用停止 |
| 应用重启 | 01-app-lifecycle.feature | Scenario: 应用重启 |
| 后端服务启动 | 01-app-lifecycle.feature | Scenario: 后端服务启动 |
| 后端服务停止 | 01-app-lifecycle.feature | Scenario: 后端服务停止 |
| 触控输入 | 02-input-acquisition.feature | Scenario: 触控输入采集 |
| 陀螺仪输入 | 02-input-acquisition.feature | Scenario: 陀螺仪输入采集 |
| 键盘输入 | 02-input-acquisition.feature | Scenario: 键盘输入采集（可选） |
| 手柄输入 | 02-input-acquisition.feature | Scenario: 手柄输入采集（可选） |
| 键盘控制结果 | 03-control-result.feature | Scenario: 键盘控制结果生成 |
| 手柄控制结果 | 03-control-result.feature | Scenario: 手柄控制结果生成 |
| 控制结果组合 | 03-control-result.feature | Scenario: 控制结果组合 |
| 创建布局 | 04-layout-management.feature | Scenario: 创建布局 |
| 修改布局 | 04-layout-management.feature | Scenario: 修改布局 |
| 删除布局 | 04-layout-management.feature | Scenario: 删除布局 |
| 切换布局 | 04-layout-management.feature | Scenario: 切换布局 |
| 导入布局 | 04-layout-management.feature | Scenario: 导入布局 |
| 导出布局 | 04-layout-management.feature | Scenario: 导出布局 |
| 添加操作元素 | 05-layout-editing.feature | Scenario: 添加操作元素 |
| 删除操作元素 | 05-layout-editing.feature | Scenario: 删除操作元素 |
| 调整元素位置 | 05-layout-editing.feature | Scenario: 调整元素位置 |
| 调整元素尺寸 | 05-layout-editing.feature | Scenario: 调整元素尺寸 |
| 编辑控制映射 | 05-layout-editing.feature | Scenario: 编辑控制映射 |
| 调整参数 | 05-layout-editing.feature | Scenario: 调整灵敏度参数、调整范围参数、调整曲线参数 |
| 实时预览 | 05-layout-editing.feature | Scenario: 实时预览编辑结果 |
| 启用控制 | 06-control-state.feature | Scenario: 启用控制 |
| 禁用控制 | 06-control-state.feature | Scenario: 禁用控制 |
| 安全切断 | 06-control-state.feature | Scenario: 安全切断 |
| WebSocket 连接 | 07-connection.feature | Scenario: WebSocket 连接建立 |
| 连接校验 | 07-connection.feature | Scenario: 连接校验 |
| 连接恢复 | 07-connection.feature | Scenario: 连接恢复 |
| 连接断开 | 07-connection.feature | Scenario: 连接断开 |
| 异常隔离 | 08-exception-handling.feature | Scenario: 单一异常隔离 |
| 安全回退 | 08-exception-handling.feature | Scenario: 异常安全回退 |
| 状态清空 | 08-exception-handling.feature | Scenario: 异常中断后状态清空 |

## 测试覆盖分析

### 已覆盖的测试场景

根据现有测试文件分析，以下 BDD 场景已有对应测试：

| BDD 场景 | 现有测试文件 | 测试覆盖 |
|----------|--------------|----------|
| 应用启动 | main-test.ts, core-e2e-test.ts | ✅ 已覆盖 |
| 应用停止 | main-test.ts, core-e2e-test.ts | ✅ 已覆盖 |
| WebSocket 连接建立 | WebSocketCommunicator | ✅ 已覆盖 |
| 后端服务启动 | BackendManager | ✅ 已覆盖 |
| 基本输入采集 | input-e2e-test.ts | ✅ 已覆盖 |
| 布局加载 | layout-interaction-test.ts | ✅ 已覆盖 |

### 未覆盖的测试场景

以下 BDD 场景需要创建新的测试用例：

| BDD 场景 | 需要创建的测试 | 建议测试文件 |
|----------|----------------|--------------|
| 触控输入采集 | 触控输入测试 | input-touch-test.ts |
| 陀螺仪输入采集 | 陀螺仪输入测试 | input-gyro-test.ts |
| 键盘输入采集 | 键盘输入测试 | input-keyboard-test.ts |
| 手柄输入采集 | 手柄输入测试 | input-gamepad-test.ts |
| 控制结果生成 | 控制结果测试 | control-result-test.ts |
| 布局编辑 | 布局编辑测试 | layout-edit-test.ts |
| 布局导入导出 | 布局导入导出测试 | layout-import-export-test.ts |
| 控制启用/禁用 | 控制状态管理测试 | control-state-test.ts |
| 延迟检测与告警 | 延迟检测测试 | latency-test.ts |
| 异常处理 | 异常处理测试 | exception-handling-test.ts |
| 超时清空 | 超时清空测试 | timeout-clear-test.ts |

## 使用指南

### 如何使用 BDD 文档

1. **测试开发参考**：每个 Scenario 对应一个或多个测试用例
2. **验收标准**：每个 Then 步骤都是可验证的验收标准
3. **需求沟通**：使用 Gherkin 语法与团队沟通需求
4. **测试覆盖率分析**：对比 BDD 场景与现有测试，识别测试缺口

### 如何扩展 BDD 文档

1. **添加新场景**：在对应 feature 文件中添加新的 Scenario
2. **添加新 feature**：创建新的 feature 文件，更新 README.md 索引
3. **更新场景**：根据需求变更更新现有场景
4. **保持一致性**：确保 BDD 文档与需求文档、功能文档一致

## 相关文档

| 文档 | 说明 |
|------|------|
| requirements.md | 需求文档，定义用户行为承诺 |
| function.md | 功能文档，定义功能能力集合 |
| E2E_TEST_SPEC.md | 端到端测试规范 |

## 更新记录

| 时间 | 更新内容 |
|------|----------|
| 2026-03-28 | 创建 BDD 文档框架，包含 8 个 feature 文件，64 个场景 |

---

**文档结束**