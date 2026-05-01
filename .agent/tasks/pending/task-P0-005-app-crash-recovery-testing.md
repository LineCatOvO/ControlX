# 任务文档

## 元信息

| 字段 | 内容 |
|------|------|
| 任务ID | P0-005 |
| 任务名称 | 应用崩溃恢复测试 |
| 任务类型 | 异常场景测试 |
| 优先级 | P0 |
| 状态 | pending |
| 来源 | TASKS.md 10.3.4 |
| 创建时间 | 2026-04-30 |
| 创建者 | Planner |

## 任务目标

实现服务端应用崩溃场景的测试，验证系统在应用崩溃后的恢复能力和状态完整性。

## 任务背景

根据 TASKS.md 10.3 集成测试完善中的描述，应用崩溃是异常场景测试的关键部分。当前系统已实现状态存储、安全控制器等模块的单元测试，但缺少应用崩溃场景的专项测试。

应用崩溃会导致：
- 内存状态全部丢失
- 需要从持久化存储恢复状态
- 客户端可能处于不确定状态
- 需要正确的恢复流程

## 任务范围

### 涉及的模块
- 状态存储 (`src/input/stateStore.ts`)
- 应用调度器 (`src/input/applyScheduler.ts`)
- 安全控制器 (`src/input/safetyController.ts`)
- WebSocket 连接管理 (`src/ws/`)

### 涉及的文件
- `tests/common/testUtils.ts` - 测试工具
- `tests/stateStore.test.ts` - 状态存储测试（参考）
- `tests/safetyController.test.ts` - 安全控制器测试（参考）

### 测试环境
- 使用 Jest 测试框架
- 需要模拟进程崩溃场景
- 需要验证状态恢复机制

## 验收标准

- [x] 实现服务端崩溃恢复测试
- [x] 验证状态持久化完整性
- [x] 验证应用重启后的状态恢复
- [x] 验证客户端重连后的状态同步
- [x] 验证安全控制器的崩溃保护机制
- [x] 测试覆盖崩溃-恢复的完整生命周期

## 审核结果

| 项目 | 结果 |
|------|------|
| 测试文件 | Server/tests/cases/app-crash-recovery.test.ts (547行, 32测试) |
| 测试覆盖 | 8个测试组覆盖完整崩溃恢复生命周期 |
| 状态持久化 | 通过 StateStore 序列化/反序列化验证 |
| 重启恢复 | 通过冷启动/热启动场景测试 |
| 客户端同步 | 通过重连序列号验证测试 |
| 安全保护 | 通过 SafetyController 清除机制测试 |
| 代码规范 | 无固定时长等待，符合规范 |

**审核结论**：通过

## 任务分解

### 步骤 1：创建应用崩溃测试文件
- 创建 `tests/app-crash-recovery.test.ts`
- 参考现有的 `tests/stateStore.test.ts` 结构

### 步骤 2：实现状态持久化测试
- 测试状态序列化和反序列化
- 测试持久化存储的完整性
- 测试状态恢复的正确性

### 步骤 3：实现崩溃模拟测试
- 模拟进程异常退出
- 验证内存状态丢失
- 验证持久化状态保留

### 步骤 4：实现恢复流程测试
- 测试重启后的状态加载
- 测试与客户端的状态同步
- 测试状态一致性验证

### 步骤 5：实现安全保护测试
- 测试崩溃时的安全清零
- 测试恢复后的输入验证
- 测试异常状态处理

## 输入文件

- `/workspaces/agent-workspace/projects/ControlX/src/input/stateStore.ts` - 状态存储源码
- `/workspaces/agent-workspace/projects/ControlX/src/input/applyScheduler.ts` - 应用调度器源码
- `/workspaces/agent-workspace/projects/ControlX/src/input/safetyController.ts` - 安全控制器源码
- `/workspaces/agent-workspace/projects/ControlX/tests/stateStore.test.ts` - 状态存储测试参考
- `/workspaces/agent-workspace/projects/ControlX/tests/safetyController.test.ts` - 安全控制器测试参考

## 输出文件

- `/workspaces/agent-workspace/projects/ControlX/tests/app-crash-recovery.test.ts` - 应用崩溃恢复测试文件

## 风险与注意事项

1. 崩溃测试需要模拟进程级别的故障，可能需要使用 child_process 或其他机制
2. 测试应该覆盖冷启动（完全重启）和热重启（部分恢复）场景
3. 状态持久化可能涉及文件操作，需要清理测试产物
4. 注意 AGENTS_GENERAL.xml 中的禁止使用固定时长等待规则
5. 测试后需要清理可能留下的临时文件或进程

## 失败处理

如果测试执行失败：
1. 检查状态持久化机制是否正常工作
2. 验证 applyScheduler 的状态管理逻辑
3. 审查安全控制器的崩溃保护触发条件
4. 检查 WebSocket 连接在恢复时的状态同步
