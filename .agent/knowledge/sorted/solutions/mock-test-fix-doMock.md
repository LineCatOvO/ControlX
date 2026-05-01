# 解决方案：jest.doMock工厂函数正确使用模式

## 元信息
- 版本：1.0.0
- 最后修改：2026-05-02
- 作者：Learner
- 分类：解决方案
- 验证状态：已验证 (task-P1-002)

## 摘要

记录jest.doMock工厂函数中直接throw与返回throwing函数的区别，以及正确的模块mock清理方式。

## 问题背景

在WindowsKeyboardHost.test.ts中，jest.doMock的工厂函数在模块评估时直接throw Error，导致后续测试无法执行。

## 问题表现

```typescript
// 错误写法：工厂函数在模块加载时立即抛出
jest.doMock('path/to/module', () => {
  throw new Error('test error');  // 评估时立即抛出，测试中断
});
```

## 根本原因

jest.doMock的第二个参数是工厂函数，该函数在模块被首次require/import时执行。如果工厂函数直接throw，错误会在模块加载时立即抛出，而不是在测试运行时抛出。这会导致：
1. 当前测试立即失败
2. 模块缓存被污染
3. 后续测试可能受到影响

## 解决方案

```typescript
// 正确写法：返回一个函数，在调用时才抛出
jest.doMock('path/to/module', () => {
  return () => {
    throw new Error('test error');  // 仅当Mock函数被调用时才抛出
  };
});
```

## 测试后清理

```typescript
afterEach(() => {
  jest.resetModules();           // 清除模块缓存
  jest.unmock('path/to/module'); // 取消mock
});
```

**清理的必要性**：
- `jest.resetModules()` 清除所有模块的require缓存，确保每个测试使用新鲜模块
- `jest.unmock()` 清除特定模块的mock注册，避免影响后续测试

## 验证结果

- 修复后测试数量：159 tests
- 通过率：100%

## 应用场景

- 测试有副作用的模块加载
- 测试模块初始化阶段的异常处理
- 需要mock模块加载逻辑的单元测试
- 任何使用jest.doMock的场景

## 关键发现

| 场景 | 错误写法 | 正确写法 |
|------|---------|---------|
| doMock工厂函数 | 直接throw | 返回函数，函数内throw |
| 测试清理 | 无清理 | jest.resetModules() + jest.unmock() |
| 模块缓存 | 不处理 | 每次测试后清除 |

## 相关文件

- `packages/electron-host/src/__tests__/WindowsKeyboardHost.test.ts`

## 标签

- jest
- doMock
- testing
- mock
- error-handling
- controlx
