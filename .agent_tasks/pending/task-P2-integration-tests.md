# Task-P2-integration-tests: 集成测试完善（任务 12）

**创建时间**：2026-04-05 21:15:00
**优先级**：P2
**状态**：pending
**项目**：ControlX
**子项目**：ControlX
**子项目路径**：/workspaces/agent-workspace/projects/ControlX/
**禁止范围**：其他子项目、AndroidClient 目录
**预计时间**：3-4 天
**父任务**：NEXT_SERVER_TASKS.md 任务 12

---

## 一、任务描述

**原子操作**：完善 ControlX Server 端集成测试，补充缺失的测试场景，提升测试覆盖率

---

## 二、任务背景

### 2.1 当前测试状态

根据 TASKS.md 和 NEXT_SERVER_TASKS.md 分析：

**已完成测试**：
- WebSocket 消息处理测试（handlers-integration.test.ts，约 400 行）
- 端到端流程测试（e2e-integration.test.ts，959 行）
- 核心模块单元测试：
  - InputValidator: 92.68% ✅
  - SafetyController: 98.11% ✅
  - StateStore: 88.05% ✅
  - Heartbeat: 98.07% ✅
  - ApplyScheduler: 已完成 ✅
  - Executors: 已完成 ✅

**整体覆盖率**：84.87%（核心模块 > 90%）

**待完成测试**：
- Xbox 通道测试（需要 ViGEmBus 环境，Windows only）
- 网络中断测试
- 应用崩溃测试
- 资源占用测试
- 模块边界测试

### 2.2 低覆盖率模块（需重点测试）

| 模块 | 当前覆盖率 | 目标覆盖率 | 差距 |
|------|------------|------------|------|
| input/hosts/ | 9.03% | 60% | -51% |
| input/router/ | 3.17% | 70% | -67% |
| input/shadow/ | 1.02% | 60% | -59% |
| ws/handlers/ | 14.83% | 60% | -45% |

### 2.3 影响范围
- 直接影响：Server/tests/ 目录
- 间接影响：整体测试覆盖率、代码质量信心

---

## 三、执行计划（原子化分解）

### 3.1 任务分解清单

本任务将分解为以下原子化子任务：

| 序号 | 子任务 | 文件 | 预计时间 | 状态 |
|------|--------|------|----------|------|
| 1 | 补充 InputRouter 测试 | InputRouter.test.ts | 1 天 | 待执行 |
| 2 | 补充 ShadowModeManager 测试 | ShadowModeManager.test.ts | 1 天 | 待执行 |
| 3 | 补充 WebSocket Handlers 测试 | ws/handlers/*.test.ts | 1 天 | 待执行 |
| 4 | 补充网络中断测试 | network-interrupt.test.ts | 0.5 天 | 待执行 |
| 5 | 补充资源占用测试 | resource-monitor.test.ts | 0.5 天 | 待执行 |

---

### 3.2 子任务一：补充 InputRouter 测试

**操作类型**：创建/修改测试文件
**文件路径**：`/workspaces/agent-workspace/projects/ControlX/Server/tests/cases/inputRouter.test.ts`
**操作位置**：整个文件

**待添加测试场景**：
- 路由分发逻辑测试
- 状态缓存测试
- 故障隔离测试
- 多设备类型测试
- 输入状态合并测试

**测试用例设计**：
```typescript
describe('InputRouter Tests', () => {
    // 基础路由功能
    test('should route keyboard input to correct host');
    test('should route gamepad input to correct host');
    test('should route mouse input to correct host');
    
    // 状态缓存
    test('should cache last input state');
    test('should update cache on new input');
    test('should return cached state on no input');
    
    // 故障隔离
    test('should isolate host failure');
    test('should fallback to safe state on error');
    test('should continue other hosts on single failure');
    
    // 多设备类型
    test('should handle simultaneous keyboard and gamepad');
    test('should handle all device types simultaneously');
    
    // 状态合并
    test('should merge multiple input states');
    test('should handle conflicting states');
});
```

---

### 3.3 子任务二：补充 ShadowModeManager 测试

**操作类型**：创建/修改测试文件
**文件路径**：`/workspaces/agent-workspace/projects/ControlX/Server/tests/cases/shadowModeManager.test.ts`
**操作位置**：整个文件

**待添加测试场景**：
- 双写机制测试
- 一致性比对测试
- 自动降级测试
- 错误计数测试
- 状态同步测试

**测试用例设计**：
```typescript
describe('ShadowModeManager Tests', () => {
    // 双写机制
    test('should write to both executor and router');
    test('should handle executor write failure');
    test('should handle router write failure');
    
    // 一致性比对
    test('should compare executor and router output');
    test('should detect state inconsistency');
    test('should log inconsistency details');
    
    // 自动降级
    test('should degrade to router-only after 5 failures');
    test('should reset error count on success');
    test('should track consecutive failure count');
    
    // 错误处理
    test('should handle timeout in executor');
    test('should handle timeout in router');
    
    // 状态同步
    test('should sync state between executor and router');
    test('should handle state drift');
});
```

---

### 3.4 子任务三：补充 WebSocket Handlers 测试

**操作类型**：创建/修改测试文件
**文件路径**：`/workspaces/agent-workspace/projects/ControlX/Server/tests/cases/ws/handlers/*.test.ts`
**操作位置**：多个文件

**待添加测试场景**：
- config 处理器测试（已有部分）
- state 处理器测试（已有部分）
- inputDelta 处理器测试（已有部分）
- 错误处理测试
- 并发测试

**需要创建的测试文件**：
- `tests/ws/handlers/config.test.ts` - 配置处理器测试
- `tests/ws/handlers/state.test.ts` - 状态处理器测试（可能已存在）
- `tests/ws/handlers/inputDelta.test.ts` - 输入差异处理器测试

---

### 3.5 子任务四：补充网络中断测试

**操作类型**：创建测试文件
**文件路径**：`/workspaces/agent-workspace/projects/ControlX/Server/tests/cases/network-interrupt.test.ts`
**操作位置**：整个文件

**待添加测试场景**：
- WebSocket 连接中断测试
- 重连机制测试
- 状态恢复测试
- 心跳超时测试
- 输入队列处理测试

**测试用例设计**：
```typescript
describe('Network Interrupt Tests', () => {
    // 连接中断
    test('should handle WebSocket disconnect');
    test('should trigger safety clear on disconnect');
    test('should log disconnect reason');
    
    // 重连机制
    test('should handle client reconnect');
    test('should restore state after reconnect');
    test('should handle reconnect with new client');
    
    // 状态恢复
    test('should clear input state on disconnect');
    test('should restore last valid state on reconnect');
    test('should handle state mismatch after reconnect');
    
    // 心跳超时
    test('should trigger timeout after heartbeat interval');
    test('should send safety clear on heartbeat timeout');
    test('should reset on valid heartbeat after timeout');
});
```

---

### 3.6 子任务五：补充资源占用测试

**操作类型**：创建测试文件
**文件路径**：`/workspaces/agent-workspace/projects/ControlX/Server/tests/cases/resource-monitor.test.ts`
**操作位置**：整个文件

**待添加测试场景**：
- CPU 使用监控测试
- 内存使用监控测试
- 延迟监控测试
- 吞吐量测试
- 长时间运行稳定性测试

**测试用例设计**：
```typescript
describe('Resource Monitor Tests', () => {
    // CPU 监控
    test('should track CPU usage');
    test('should alert on high CPU usage');
    
    // 内存监控
    test('should track memory usage');
    test('should detect memory leak');
    test('should alert on high memory usage');
    
    // 延迟监控
    test('should track input latency');
    test('should track processing latency');
    test('should alert on high latency');
    
    // 吞吐量
    test('should measure message throughput');
    test('should handle high frequency messages');
    
    // 长时间运行
    test('should run stably for extended period');
    test('should not degrade over time');
});
```

---

## 四、验收标准（必须全部满足）

- [ ] **InputRouter 测试覆盖率 > 70%**
- [ ] **ShadowModeManager 测试覆盖率 > 60%**
- [ ] **ws/handlers/ 测试覆盖率 > 60%**
- [ ] **网络中断测试场景覆盖**
- [ ] **资源占用测试场景覆盖**
- [ ] **所有新测试通过**
- [ ] **无副作用（不影响现有功能）**
- [ ] **Git 提交（提交信息规范）**

---

## 五、风险评估

| 风险项 | 可能性 | 影响程度 | 缓解策略 |
|--------|--------|----------|----------|
| ViGEmBus 环境依赖 | 高 | 中 | Xbox 测试使用 Mock 或跳过机制 |
| 测试运行时间过长 | 中 | 低 | 分批运行，使用并行测试 |
| Mock 复杂度高 | 中 | 中 | 使用现有测试工具，参考已有测试 |
| 网络中断难以模拟 | 中 | 中 | 使用 WebSocket Mock，手动触发事件 |

---

## 六、分支规划

**任务类型**：测试完善（具体任务执行）
**基础分支**：master（当前分支）
**任务分支**：task-P2-integration-tests
**合并目标**：master
**分支策略**：创建新分支

**创建分支命令**：
```bash
git checkout master
git pull origin master
git checkout -b task-P2-integration-tests
git push origin task-P2-integration-tests
```

---

## 七、执行进度（实时更新区域）

### 步骤一：检查现有测试结构
**状态**：已完成
**开始时间**：2026-04-05 21:15:00
**完成时间**：2026-04-05 21:20:00
**执行结果**：成功
**备注**：
- 发现测试文件 30 个
- e2e-integration.test.ts 已存在（959 行）
- handlers-integration.test.ts 已存在（约 400 行）
- 测试覆盖率 84.87%（根据文档）
- 低覆盖率模块：input/hosts/, input/router/, input/shadow/, ws/handlers/

### 步骤二：分析任务 12 详细要求
**状态**：已完成
**开始时间**：2026-04-05 21:15:00
**完成时间**：2026-04-05 21:20:00
**执行结果**：成功
**备注**：
- 已读取 NEXT_SERVER_TASKS.md 和 TASKS.md
- 确认任务 12 为"集成测试完善"
- 已分析已完成部分和待完成部分

### 步骤三：创建任务文档
**状态**：已完成
**开始时间**：2026-04-05 21:20:00
**完成时间**：2026-04-05 21:25:00
**执行结果**：成功
**备注**：任务文档已创建在 pending 目录

### 步骤四：补充 InputRouter 测试
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：等待 Coder 执行

### 步骤五：补充 ShadowModeManager 测试
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：等待 Coder 执行

### 步骤六：补充 WebSocket Handlers 测试
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：等待 Coder 执行

### 步骤七：补充网络中断测试
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：等待 Coder 执行

### 步骤八：补充资源占用测试
**状态**：待执行
**开始时间**：-
**完成时间**：-
**执行结果**：-
**备注**：等待 Coder 执行

---

## 八、问题记录（实时更新区域）

### 问题一：测试运行超时
**发现时间**：2026-04-05 21:20:00
**问题描述**：运行 `npm test -- --coverage` 命令超时（180秒）
**影响范围**：无法获取实时覆盖率数据
**解决方案**：参考 TASKS.md 中的覆盖率数据（84.87%）
**解决状态**：已解决
**解决时间**：2026-04-05 21:21:00

---

## 九、有价值发现（实时更新区域）

### 发现一：测试文件结构完善
**发现时间**：2026-04-05 21:15:00
**发现内容**：现有测试文件 30 个，覆盖大部分核心模块
**价值说明**：可参考现有测试结构编写新测试
**应用建议**：复用 WsClient Mock 和测试工具类

### 发现二：低覆盖率模块清单
**发现时间**：2026-04-05 21:18:00
**发现内容**：input/hosts/ (9.03%), input/router/ (3.17%), input/shadow/ (1.02%), ws/handlers/ (14.83%)
**价值说明**：明确需要重点补充的模块
**应用建议**：优先补充低覆盖率模块的测试

---

## 十、审核记录（实时更新区域）

### 审核一
**审核时间**：-
**审核结论**：待审核
**审核者**：Reviewer

#### 问题列表
| 问题 | 级别 | 位置 | 描述 | 建议 |
|------|------|------|------|------|
| - | - | - | - | - |

#### 改进建议
- -

---

## 十一、调度建议

建议 Manager 将本任务分解为 5 个独立的原子化子任务，分别调度 Coder 执行：

1. **子任务 1**：补充 InputRouter 测试（优先级最高，覆盖率最低）
2. **子任务 2**：补充 ShadowModeManager 测试
3. **子任务 3**：补充 WebSocket Handlers 测试
4. **子任务 4**：补充网络中断测试
5. **子任务 5**：补充资源占用测试

每个子任务可独立执行，并行调度。

---

**版本**：v1.0.0
**创建日期**：2026-04-05
**创建者**：Planner 子代理