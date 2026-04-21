# 代码片段：可选属性安全提取模式

## 元信息
- 版本：1.0.0
- 最后修改：2026-04-21
- 作者：Learner
- 分类：代码片段
- 语言：TypeScript

## 摘要

在处理可能为 undefined 的嵌套对象属性时，使用渐进式提取模式确保类型安全。

## 代码片段

```typescript
/**
 * 安全提取可选嵌套属性的模式
 * 适用于处理可能未定义的复杂对象结构
 */
function safeExtractProperties<T extends Record<string, unknown>>(
    source: T | undefined,
    keys: (keyof T)[]
): Partial<T> {
    const result: Partial<T> = {};
    
    if (source) {
        for (const key of keys) {
            if (source[key] !== undefined) {
                result[key] = source[key];
            }
        }
    }
    
    return result;
}

// 使用示例：提取游戏手柄摇杆轴值
const axes = state.gamepadAxes;
const xinputAxes = safeExtractProperties(axes, ['LX', 'LY', 'RX', 'RY']);
```

## 替代实现（直接模式）

```typescript
// 逐个属性检查模式（更直观，适合少量属性）
const axes = state.gamepadAxes;
const xinputAxes: { [key: string]: number } = {};

if (axes) {
    if (axes.LX !== undefined) xinputAxes.LX = axes.LX;
    if (axes.LY !== undefined) xinputAxes.LY = axes.LY;
    if (axes.RX !== undefined) xinputAxes.RX = axes.RX;
    if (axes.RY !== undefined) xinputAxes.RY = axes.RY;
}
```

## 使用场景

- 处理可选的嵌套对象
- API 响应数据提取
- 配置对象处理
- 状态映射转换

## 最佳实践

1. **先检查父对象**：在访问嵌套属性前检查父对象是否存在
2. **逐个检查属性**：对于可选属性，逐个检查避免 undefined 值污染
3. **使用 Partial 类型**：返回类型使用 Partial<T> 表示部分属性可能缺失

## 来源

- 项目：ControlX
- 文件：[GamepadAdapter.ts:78-85](file:///workspaces/agent-workspace/projects/ControlX/Server/src/input/adapters/GamepadAdapter.ts#L78-L85)

## 标签

- typescript
- null-safety
- optional-properties
- snippet
