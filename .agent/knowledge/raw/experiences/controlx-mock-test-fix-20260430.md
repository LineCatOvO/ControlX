# ControlX Mock测试修复经验

## 任务信息
- **任务ID**: task-P1-002-fix-mock-test-failures.md
- **项目**: ControlX
- **执行者**: Coder
- **审核者**: Reviewer
- **结果**: 通过
- **日期**: 2026-04-30

## 关键发现

### 1. jest.doMock 工厂函数使用错误

**问题**: WindowsKeyboardHost.test.ts 中 jest.doMock 的工厂函数在评估时直接 throw Error，导致测试失败。

**错误写法**:
```typescript
jest.doMock('path/to/module', () => {
  throw new Error('test error');  // 评估时立即抛出
});
```

**正确写法**:
```typescript
jest.doMock('path/to/module', () => {
  return () => {
    throw new Error('test error');  // 返回函数，调用时才抛出
  };
});
```

**原因**: jest.doMock 的第二个参数是工厂函数，该函数在模块被引入时执行。如果工厂函数直接 throw，错误会在模块加载时立即抛出，而不是在测试运行时抛出。

### 2. 测试后清理

在测试完成后需要添加清理操作：
```typescript
jest.resetModules();
jest.unmock('path/to/module');
```

这确保模块缓存被清除，避免影响后续测试。

### 3. 测试结果

- 测试数量: 159 tests
- 通过率: 100%
- 所有测试通过

## 经验总结

| 场景 | 错误写法 | 正确写法 |
|------|----------|----------|
| doMock工厂函数 | 直接 throw | 返回函数，函数内 throw |
| 测试清理 | 无 | jest.resetModules() + jest.unmock() |

## 相关文件

- `packages/electron-host/src/__tests__/WindowsKeyboardHost.test.ts`