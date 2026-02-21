# ControlX 服务端问题分析报告

**日期**: 2026-02-21  
**分析目标**: 识别服务端可能导致触摸穿透问题的因素

---

## 问题现象

用户反馈：进入主活动，点击启动服务后，点击事件无法穿透到浮窗后方，用户区域全部无法正常触摸，除了浮窗按钮。

---

## 问题根因（已确认）

**问题在 Android 客户端**，与服务端无关：

1. **FloatWindowManager** 的 `layout_render_container` 默认启用布局
2. **PlatformAdaptationLayer** 的 `OverlayView.onTouchEvent()` 返回 `true` 消费所有事件
3. **TouchThroughFrameLayout** 的 `onMeasure()` 包含全屏的 `layout_render_container`

---

## 服务端潜在问题分析

虽然服务端不是本次问题的根因，但分析发现以下潜在问题：

### 1. 数据格式不匹配问题 ⚠️

#### 客户端发送格式

```json
{
  "type": "input",
  "data": {
    "frameId": 1234567890,
    "runtimeStatus": "ok",
    "keyboard": ["KEY_W", "KEY_S"],
    "gamepad": ["BUTTON_A"],
    "mouse": {
      "x": 0.5,
      "y": 0.3,
      "left": true,
      "right": false,
      "middle": false
    },
    "joystick": {
      "x": 0.0,
      "y": 0.0,
      "deadzone": 0.1,
      "smoothing": 0.5
    }
  },
  "metadata": {
    "timestamp": 1234567890
  }
}
```

#### 服务端期望格式

```typescript
interface InputMessage {
    type: "input";
    data: {
        frameId?: number;
        runtimeStatus?: "ok" | "degraded" | "rollback";
        keyboard?: string[];
        mouse?: {
            x?: number;
            y?: number;
            left?: boolean;
            right?: boolean;
            middle?: boolean;
        };
        joystick?: {
            x?: number;
            y?: number;
            deadzone?: number;
            smoothing?: number;
        };
    };
    metadata: InputMetadata;
}
```

**问题**: 客户端发送了 `gamepad` 字段（数组），但服务端类型定义中没有 `gamepad` 字段！

**影响**: 
- 服务端 TypeScript 编译器会报错
- 运行时可能导致类型转换错误
- 游戏手柄数据可能被忽略

**修复建议**:

```typescript
// Server/src/types/ws.ts
export interface InputMessage extends WsMessage {
    type: "input";
    data: {
        frameId?: number;
        runtimeStatus?: "ok" | "degraded" | "rollback";
        keyboard?: string[];
        gamepad?: string[];  // ← 添加游戏手柄支持
        mouse?: {
            x?: number;
            y?: number;
            left?: boolean;
            right?: boolean;
            middle?: boolean;
        };
        joystick?: {
            x?: number;
            y?: number;
            deadzone?: number;
            smoothing?: number;
        };
    };
    metadata: InputMetadata;
}
```

---

### 2. 状态更新流程问题 ⚠️

#### 当前流程

```
handleInput()
    ↓
stateStore.storeState(inputData)
    ↓
存储到 stateStore
    ↓
发送 ACK
    ↓
结束（没有触发输入执行器！）
```

**问题**: `handleInput()` 只存储状态，**没有触发输入执行器**！

#### 代码分析

```typescript
// Server/src/ws/handlers/input.ts
export function handleInput(ws: any, message: InputMessage) {
    const stateStore = (global as any).stateStore;
    
    if (!stateStore) {
        return;  // ← 没有错误处理
    }

    const inputData = message.data || {};
    const stored = stateStore.storeState(inputData);

    if (stored) {
        // 发送 ACK
        ws.send(JSON.stringify(ackMessage));
    } else {
        // 发送错误 ACK
        ws.send(JSON.stringify(errorAckMessage));
    }
    
    // ❌ 没有调用 executorManager.applyState()！
}
```

**对比**: `handleInputEvent()` 正确调用了执行器：

```typescript
// Server/src/ws/handlers/inputEvent.ts
export function handleInputEvent(ws: any, message: InputEventMessage) {
    const executorManager = getExecutorManager();
    
    // ✅ 应用输入事件到所有执行器
    executorManager.applyEvent(message.data);
    
    console.log(formatInputEventMessageLog(message));
}
```

**影响**:
- 客户端发送的 `input` 消息只被存储，没有被执行
- 只有 `input_event` 消息会触发实际输入
- 可能导致控制延迟或无响应

**修复建议**:

```typescript
// Server/src/ws/handlers/input.ts
import { getExecutorManager } from "../../input/executor";
import { inputState } from "../../input/state";

export function handleInput(ws: any, message: InputMessage) {
    const stateStore = (global as any).stateStore;
    
    if (!stateStore) {
        console.error("InputHandlerError: StateStore not available");
        return;
    }

    const inputData = message.data || {};
    const stored = stateStore.storeState(inputData);

    if (stored) {
        // ✅ 更新全局输入状态
        if (inputData.keyboard) {
            inputState.keyboard = new Set(inputData.keyboard);
        }
        if (inputData.gamepad) {
            inputState.gamepad = new Set(inputData.gamepad);
        }
        if (inputData.mouse) {
            inputState.mouse = { ...inputState.mouse, ...inputData.mouse };
        }
        if (inputData.joystick) {
            inputState.joystick = { ...inputState.joystick, ...inputData.joystick };
        }

        // ✅ 触发输入执行器
        const executorManager = getExecutorManager();
        executorManager.applyState(inputState);

        // 发送 ACK
        ws.send(JSON.stringify(ackMessage));
    } else {
        // 发送错误 ACK
        ws.send(JSON.stringify(errorAckMessage));
    }
}
```

---

### 3. 错误处理不足 ⚠️

#### 问题代码

```typescript
// Server/src/ws/handlers/input.ts
if (!stateStore) {
    // 已注释，减少日志输出
    // console.error("InputHandlerError: StateStore not available");
    return;  // ← 静默失败
}
```

**问题**: 
- 错误日志被注释
- 没有向客户端发送错误消息
- 客户端不知道请求失败原因

**影响**:
- 调试困难
- 客户端无法感知服务端错误
- 可能导致客户端无限重试

**修复建议**:

```typescript
if (!stateStore) {
    console.error("InputHandlerError: StateStore not available");
    
    const errorMsg = {
        type: "error",
        code: "INTERNAL_ERROR",
        message: "StateStore not available",
    };
    
    ws.send(JSON.stringify(errorMsg));
    return;
}
```

---

### 4. ACK 消息格式不一致 ⚠️

#### 当前 ACK 格式

```json
{
  "type": "ack",
  "data": {
    "sequenceNumber": 1234567890,
    "timestamp": 1234567890,
    "status": "success"
  }
}
```

#### 服务端类型定义

```typescript
export interface AckMessage extends WsMessage {
    type: "ack";
    messageId: string;  // ← 期望的字段名
    status: "success" | "error";
    message?: string;
}
```

**问题**: 
- 实际发送 `sequenceNumber`，类型定义期望 `messageId`
- 实际发送在 `data` 对象内，类型定义在根对象

**影响**:
- 客户端解析可能失败
- TypeScript 类型检查失效

**修复建议**: 统一 ACK 消息格式

```typescript
// 服务端发送
const ackMessage = {
    type: "stateAck",  // ← 使用具体类型
    ackStateId: inputData?.frameId || Date.now(),
    serverRecvTs: Date.now(),
    serverApplyTs: applyTime,  // ← 添加应用时间
    status: "success" as const,
};

// 或者修改类型定义
export interface InputAckMessage extends WsMessage {
    type: "ack";
    data: {
        sequenceNumber: number;
        timestamp: number;
        status: "success" | "error";
        reason?: string;
    };
}
```

---

### 5. 输入执行器初始化问题 ⚠️

#### 当前代码

```typescript
// Server/src/input/executor.ts
const isTestMode = process.env.TEST_MODE === "true";
const disableActualInput = process.env.DISABLE_ACTUAL_INPUT === "true";
const isDryRunMode = process.env.DRY_RUN === "true" || (isTestMode && disableActualInput);

if (isDryRunMode) {
    console.log("🏃 Using DRY RUN mode executors");
    dryRunExecutor = new DryRunExecutor({ verbose: true, logToFile: false });
    executorManager.addExecutor(dryRunExecutor);
} else if (isTestMode && disableActualInput) {
    console.log("🧪 Using test mode executors");
    executorManager.addExecutor(new TestModeKeyboardExecutor());
} else {
    console.log("🎮 Using production mode executors");
    executorManager.addExecutor(new KeyboardExecutor());
    executorManager.addExecutor(new MouseExecutor());
    executorManager.addExecutor(new JoystickExecutor());
    executorManager.addExecutor(new GamepadExecutor());
}
```

**问题**:
- 环境变量配置复杂
- 没有明确的配置文档
- 生产环境可能意外使用测试执行器

**影响**:
- 部署时可能配置错误
- 生产环境无实际输入

**修复建议**:
- 添加配置验证
- 启动时明确显示当前模式
- 添加健康检查端点

---

### 6. WebSocket 连接管理问题 ⚠️

#### 问题

服务端没有明确的连接状态管理：

```typescript
// Server/src/ws/server.ts
wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    
    ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
    });
    
    // ❌ 没有错误处理
    // ❌ 没有连接超时处理
    // ❌ 没有心跳检测
});
```

**影响**:
- 僵尸连接占用资源
- 客户端断开后服务端可能不知道
- 无法统计在线客户端数量

**修复建议**:

```typescript
wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    
    // 初始化连接状态
    (ws as any).isAlive = true;
    (ws as any).clientId = generateClientId();
    
    // 心跳检测
    ws.on("pong", () => {
        (ws as any).isAlive = true;
    });
    
    ws.on("close", () => {
        console.log(`WebSocket closed: ${(ws as any).clientId}`);
        // 清理连接状态
        handleDisconnect();
    });
    
    ws.on("error", (error) => {
        console.error(`WebSocket error: ${error}`);
        ws.close();
    });
});

// 定期发送心跳
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!(ws as any).isAlive) {
            return ws.terminate();
        }
        (ws as any).isAlive = false;
        ws.ping();
    });
}, heartbeatInterval);
```

---

## 问题优先级

| 优先级 | 问题 | 影响 | 建议修复时间 |
|--------|------|------|--------------|
| **P0** | 数据格式不匹配（gamepad 字段） | 游戏手柄无法使用 | 立即 |
| **P0** | 状态更新流程缺失 | 控制无响应 | 立即 |
| **P1** | 错误处理不足 | 调试困难 | 近期 |
| **P1** | ACK 消息格式不一致 | 客户端解析失败 | 近期 |
| **P2** | 输入执行器初始化复杂 | 部署风险 | 规划 |
| **P2** | WebSocket 连接管理不足 | 资源泄漏 | 规划 |

---

## 修复建议总结

### 立即修复（P0）

1. **添加 gamepad 字段到 InputMessage 类型**
2. **在 handleInput 中触发输入执行器**

### 近期修复（P1）

3. **恢复错误日志并添加错误消息**
4. **统一 ACK 消息格式**

### 规划修复（P2）

5. **简化输入执行器配置**
6. **添加 WebSocket 连接管理**

---

## 测试验证

修复后需要验证：

1. ✅ 客户端发送 `input` 消息后，服务端实际执行输入
2. ✅ 游戏手柄数据正确传递到执行器
3. ✅ 错误情况下客户端收到错误消息
4. ✅ ACK 消息格式一致
5. ✅ 生产环境使用正确的执行器
6. ✅ WebSocket 连接正常管理

---

## 相关文档

- [服务端代码路径](./Server/src/)
- [类型定义](./Server/src/types/ws.ts)
- [输入处理器](./Server/src/ws/handlers/input.ts)
- [输入执行器](./Server/src/input/executor.ts)
