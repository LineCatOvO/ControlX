# Heartbeat模块测试覆盖率100%经验总结

**日期**: 2026-05-02
**项目**: ControlX
**类型**: 经验记录 (raw)
**标签**: jest, testing, coverage, heartbeat, typescript

---

## 任务摘要

将心跳模块测试覆盖率从 83.3% 提升到 100%，新增 18 个测试用例。

## 核心知识点

### 1. dispatchHeartbeat 在 start() 中的调用验证

```typescript
test("should be called during start()", () => {
    const dispatchSpy = jest.spyOn(heartbeatModule, "dispatchHeartbeat");
    heartbeatModule.start();
    expect(dispatchSpy).toHaveBeenCalled();
});
```

**关键点**：使用 `jest.spyOn()` 监控方法调用，验证 start() 内部确实调用了 dispatchHeartbeat。

### 2. handlePong() stats logging 逻辑

```typescript
test("should not log stats when consecutiveFailures is not multiple of 10", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation();
    heartbeatModule.handlePong(baseTime);
    expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Heartbeat Stats:")
    );
});

test("should log stats when consecutiveFailures is exactly 10", () => {
    // ... 测试当 consecutiveFailures === 10 时会记录 stats
});
```

**关键点**：
- 条件 `this.state.consecutiveFailures % 10 === 0` 才输出 stats
- 需要先让 consecutiveFailures 达到 10（通过超时触发）

### 3. checkTimeout() 连续超时警告

```typescript
test("should log warning when consecutiveTimeouts reaches 5", () => {
    // 触发 5 次超时
    for (let i = 0; i < 5; i++) {
        heartbeatModule.checkTimeout();
        jest.advanceTimersByTime(150);
    }
    expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("High consecutive timeouts (5)")
    );
});
```

**关键点**：
- 条件 `consecutiveTimeouts % 5 === 0` 输出警告
- 使用 FakeTimers 控制时间流逝

### 4. onTimeout() null 回调边界情况

```typescript
test("should not throw when callback is null and timeout occurs", () => {
    heartbeatModule.handlePong(baseTime);
    jest.advanceTimersByTime(150);
    expect(() => heartbeatModule.checkTimeout()).not.toThrow();
});
```

**关键点**：代码中有 null 检查 `if (this.onTimeoutCallback)`，测试验证不会抛出异常。

## 测试覆盖率分析方法

| 方法 | 说明 |
|------|------|
| `jest.spyOn(obj, methodName)` | 监控方法调用 |
| `jest.useFakeTimers()` | 使用假计时器 |
| `jest.setSystemTime(time)` | 设置假时间 |
| `jest.advanceTimersByTime(ms)` | 快进时间 |
| `mockImplementation()` | 捕获 console 输出 |

## 覆盖率从 83.3% 到 100% 的关键

1. **边界条件覆盖**：null 回调、连续超时阈值
2. **代码路径覆盖**：if/else 分支、% 取模条件
3. **状态转换覆盖**：start→running→timeout→stop

## 相关文件

- `Server/src/input/heartbeat.ts` - 被测模块
- `Server/tests/cases/heartbeat.test.ts` - 测试文件 (458行，42测试)
- `NEXT_STEPS_PLAN.md` - 已更新状态

## 验证结果

- ✅ 42 个测试全部通过
- ✅ 语句/分支/函数/行覆盖率均为 100%
- ✅ 无遗留未覆盖代码路径

---

**下次参考**：测试其他模块覆盖率时，先分析条件分支，再针对边界值设计测试用例。