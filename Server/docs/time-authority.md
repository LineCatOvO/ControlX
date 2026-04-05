# ApplyScheduler 时间权威设计文档

**版本**：2.0.0
**创建日期**：2026-04-05
**最后更新**：2026-04-05

---

## 一、概述

### 1.1 时间权威定义

ApplyScheduler 是 ControlX 输入系统的**唯一时间权威**，负责生成和分发统一的 tickTime，确保整个系统时间一致性。

### 1.2 设计目标

- **单一时间源**：所有时间戳都由 ApplyScheduler 统一生成和分发
- **时间一致性**：同一 tick 周期内所有操作使用相同的时间戳
- **可追溯性**：所有时间相关操作都有明确的时间来源
- **可靠性**：时间权威机制必须稳定可靠，不受外部因素影响

---

## 二、时间权威机制

### 2.1 核心原理

**ApplyScheduler 作为唯一时间源的原理**：

```
ApplyScheduler (唯一时间源)
    ↓
生成 tickTime (每 8ms / 125Hz)
    ↓
分发给所有依赖模块
    ↓
┌─────────────────────────────┐
│ SafetyController            │
│ - updateTickTime(tickTime)  │
│ - recordValidState(tickTime)│
│ - checkTimeout (使用 tickTime)│
└─────────────────────────────┘
┌─────────────────────────────┐
│ StateStore                  │
│ - recordAppliedState(tickTime)│
│ - 时间戳记录                 │
└─────────────────────────────┘
```

### 2.2 时间流向

**时间戳流向图**：

```
ApplyScheduler.tickTime
    │
    ├─→ SafetyController.currentTickTime
    │       └─→ checkTimeout()
    │
    ├─→ SafetyController.recordValidState(state, tickTime)
    │       └─→ lastValidStateTime
    │
    └─→ StateStore.recordAppliedState(sequenceNumber, tickTime)
            └─→ appliedStateRecords
```

### 2.3 时间权威性保证

**保证机制**：

1. **单一生成源**：
   - ApplyScheduler 是唯一生成 tickTime 的模块
   - 其他模块禁止自行调用 `Date.now()` 获取时间

2. **强制同步**：
   - ApplyScheduler 在每个 tick 周期主动同步 tickTime
   - SafetyController 和 StateStore 必须使用传入的 tickTime

3. **时间一致性验证**：
   - 同一 tick 周期内所有操作必须使用相同时间戳
   - 时间戳差异检测和告警机制

4. **降级处理**：
   - 在 ApplyScheduler 未启动时，SafetyController 可回退到 `Date.now()`
   - 这是临时兼容机制，正式运行时必须确保 ApplyScheduler 先启动

---

## 三、模块职责

### 3.1 ApplyScheduler 职责

**核心职责**：
- ✅ 生成 tickTime（每 8ms 一次）
- ✅ 分发 tickTime 到 SafetyController 和 StateStore
- ✅ 确保时间戳一致性
- ✅ 处理异常情况下的时间同步

**禁止行为**：
- ❌ 不验证状态合法性（由 Validator 负责）
- ❌ 不直接操作执行器（通过 ExecutorManager）
- ❌ 不执行安全清零（由 SafetyController 负责）

**实现代码**：

```typescript
// applyScheduler.ts 核心逻辑
private applyCurrentState(): void {
    // 记录 Tick 时间（唯一时间源）
    const tickTime = Date.now();
    this.lastTickTime = tickTime;

    // 更新 SafetyController 的 tickTime（时间权威性）
    const safetyController = getSafetyController();
    safetyController.updateTickTime(tickTime);

    // 获取最新状态
    const latestState = this.stateStore.getLatestState();

    if (latestState) {
        // 应用状态
        this.executorManager.applyState(latestState);

        // 记录应用时间（使用 tickTime 保证时间一致性）
        this.stateStore.recordAppliedState(sequenceNumber, tickTime);

        // 记录有效状态时间到安全控制器（使用 tickTime 保证时间一致性）
        safetyController.recordValidState(latestState, tickTime);
    }
}
```

### 3.2 SafetyController 职责

**核心职责**：
- ✅ 接收 ApplyScheduler 的 tickTime
- ✅ 使用 tickTime 进行超时判断
- ✅ 使用 tickTime 记录有效状态时间
- ✅ 执行安全清零操作

**禁止行为**：
- ❌ 禁止自行调用 `Date.now()` 进行超时判断（必须使用 tickTime）
- ❌ 禁止自行生成时间戳（必须使用 ApplyScheduler 的 tickTime）
- ❌ 禁止缓存或推测时间

**实现代码**：

```typescript
// safetyController.ts 核心逻辑

// 接收 tickTime（由 ApplyScheduler 调用）
updateTickTime(tickTime: number): void {
    this.currentTickTime = tickTime;
}

// 使用 tickTime 记录有效状态
recordValidState(state: InputState, tickTime: number): void {
    // 使用 tickTime 而不是 Date.now()，确保时间一致性
    this.lastValidStateTime = tickTime;
    this.currentTickTime = tickTime;
}

// 使用 tickTime 进行超时判断
private checkTimeout(): void {
    // 使用 currentTickTime（由 ApplyScheduler 提供）而不是 Date.now()
    const now = this.currentTickTime || Date.now(); // 回退机制
    const elapsed = now - this.lastValidStateTime;

    if (elapsed > this.config.timeoutMs) {
        this.triggerSafetyClear();
    }
}
```

### 3.3 StateStore 职责

**核心职责**：
- ✅ 接收 ApplyScheduler 的 tickTime
- ✅ 使用 tickTime 记录应用状态时间戳
- ✅ 维护状态历史记录

**禁止行为**：
- ❌ 禁止自行调用 `Date.now()` 记录时间戳
- ❌ 禁止推测或生成时间戳

---

## 四、时间同步验证

### 4.1 验证机制

**验证点**：
1. **ApplyScheduler 启动验证**：
   - 确保 ApplyScheduler 在其他模块之前启动
   - 确保 tickTime 生成正常

2. **SafetyController 时间同步验证**：
   - 确保 SafetyController 正确接收 tickTime
   - 确保 SafetyController 使用 tickTime 进行超时判断
   - 确保 SafetyController 不自行调用 `Date.now()`

3. **StateStore 时间记录验证**：
   - 确保 StateStore 正确记录时间戳
   - 确保 StateStore 使用 tickTime 记录

4. **时间一致性验证**：
   - 同一 tick 周期内所有时间戳必须相同
   - 时间戳差异检测和告警

### 4.2 验证测试

**测试文件**：
- `Server/tests/cases/applyScheduler.test.ts` - ApplyScheduler 时间权威测试
- `Server/tests/cases/safetyController.test.ts` - SafetyController 时间同步测试

**测试覆盖**：
- tickTime 生成和分发测试
- 时间同步验证测试
- 时间一致性测试
- 时间权威性验证测试
- 降级处理测试

---

## 五、使用规范

### 5.1 启动顺序

**必须遵守的启动顺序**：

```
1. ApplyScheduler.start(tickTime)  // 必须最先启动
    ↓
2. SafetyController.startTimeoutCheck()  // 依赖 ApplyScheduler 的 tickTime
    ↓
3. StateStore 初始化  // 依赖 ApplyScheduler 的 tickTime
    ↓
4. 其他模块启动
```

**禁止行为**：
- ❌ 禁止 SafetyController 在 ApplyScheduler 未启动时启动超时检查
- ❌ 禁止跳过 ApplyScheduler 启动步骤

### 5.2 时间使用规范

**必须遵守**：
- ✅ 所有时间相关操作必须使用 ApplyScheduler 的 tickTime
- ✅ 同一 tick 周期内必须使用相同时间戳
- ✅ 时间戳必须明确来源（来自 ApplyScheduler）

**禁止行为**：
- ❌ 禁止其他模块自行调用 `Date.now()` 获取时间
- ❌ 禁止缓存或推测时间戳
- ❌ 禁止使用不一致的时间戳

### 5.3 异常处理

**ApplyScheduler 未启动时的处理**：
- SafetyController 可回退到 `Date.now()` 进行超时判断（临时兼容）
- 必须记录告警日志
- 必须尽快启动 ApplyScheduler

**时间不一致时的处理**：
- 记录时间差异日志
- 触发告警机制
- 检查 ApplyScheduler 状态

---

## 六、注意事项

### 6.1 时间权威性

**重要提醒**：
- ApplyScheduler 是唯一的时间权威，所有模块必须遵守
- 时间一致性是系统稳定性的关键保证
- 任何违反时间权威规则的行为都可能导致系统异常

### 6.2 性能考虑

**性能优化**：
- tickTime 生成频率固定（125Hz），不会影响性能
- 时间同步操作简单高效，不影响整体性能
- 时间戳记录采用批量记录，减少性能开销

### 6.3 调试建议

**调试时注意**：
- 检查 ApplyScheduler 是否正常启动
- 检查 tickTime 是否正确传递到其他模块
- 检查时间戳一致性
- 查看时间相关日志

---

## 七、变更记录

| 版本 | 日期 | 变更内容 | 变更原因 |
|------|------|----------|----------|
| 2.0.0 | 2026-04-05 | 创建时间权威文档 | 明确时间权威设计 |

---

## 八、参考文档

- `Server/src/input/applyScheduler.ts` - ApplyScheduler 实现代码
- `Server/src/input/safetyController.ts` - SafetyController 实现代码
- `Server/tests/cases/applyScheduler.test.ts` - ApplyScheduler 测试代码
- `Server/tests/cases/safetyController.test.ts` - SafetyController 测试代码