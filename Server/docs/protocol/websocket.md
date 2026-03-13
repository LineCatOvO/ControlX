# WebSocket 协议文档

## 1. 概述

本文档定义了 WMMT 远程赛车输入控制系统的 WebSocket 通信协议。该协议用于在 Android 客户端和 Node.js 服务端之间传输输入数据和配置信息。

## 2. 基本格式

所有 WebSocket 消息均为 JSON 格式，包含以下基本字段：

```json
{
  "type": "message_type",
  "data": { ... },
  "metadata": { ... }
}
```

| 字段名 | 类型 | 描述 |
|-------|------|------|
| `type` | string | 消息类型，必填 |
| `data` | any | 消息数据，根据消息类型不同而变化 |
| `metadata` | object | 消息元数据，包含客户端ID、时间戳等 |

## 3. 消息类型

### 3.1 欢迎消息

**客户端 → 服务端**：客户端连接后请求欢迎消息

**服务端 → 客户端**：服务端向客户端发送欢迎消息

```json
{
  "type": "welcome",
  "message": "Connected to WMMT Controller Server"
}
```

### 3.2 输入数据消息

**客户端 → 服务端**：客户端发送完整的输入状态

```json
{
  "type": "input",
  "data": {
    "keyboard": ["up", "right"],
    "mouse": {
      "x": 100,
      "y": 200,
      "left": true
    },
    "joystick": {
      "x": 0.5,
      "y": -0.3,
      "deadzone": 0.1,
      "smoothing": 0.5
    },

  },
  "metadata": {
    "clientId": "android-12345",
    "timestamp": 1679347200000
  }
}
```

### 3.3 输入增量消息

**客户端 → 服务端**：客户端发送输入状态的增量变化

```json
{
  "type": "input_delta",
  "data": {
    "keyboard": {
      "pressed": ["up"],
      "released": ["down"]
    },
    "joystick": {
      "x": 0.7
    }
  },
  "metadata": {
    "clientId": "android-12345",
    "timestamp": 1679347200000
  }
}
```

### 3.4 输入事件消息

**客户端 → 服务端**：客户端发送瞬时输入事件

```json
{
  "type": "input_event",
  "data": {
    "type": "key_down",
    "data": {
      "key": "space"
    },
    "metadata": {
      "clientId": "android-12345",
      "timestamp": 1679347200000
    }
  }
}
```

### 3.5 配置获取消息

**客户端 → 服务端**：客户端请求获取当前配置

```json
{
  "type": "config_get"
}
```

### 3.6 配置设置消息

**客户端 → 服务端**：客户端请求修改配置

```json
{
  "type": "config_set",
  "data": {
    "inputUpdateInterval": 8,
    "enableLogging": true
  }
}
```

### 3.6.1 配置保存消息（新增）

**客户端 → 服务端**：客户端请求保存配置到文件

```json
{
  "type": "config_save",
  "path": "/path/to/config.json"
}
```

### 3.6.2 配置重置消息（新增）

**客户端 → 服务端**：客户端请求重置配置为默认值

```json
{
  "type": "config_reset"
}
```

### 3.6.3 配置验证消息（新增）

**客户端 → 服务端**：客户端请求验证配置有效性

```json
{
  "type": "config_validate",
  "data": {
    "inputUpdateInterval": 16
  }
}
```

**服务端 → 客户端**：服务端返回验证结果

```json
{
  "type": "config_validate_result",
  "valid": true,
  "data": {
    "inputUpdateInterval": 16
  }
}
```

### 3.7 配置返回消息

**服务端 → 客户端**：服务端返回当前配置

```json
{
  "type": "config",
  "data": {
    "inputUpdateInterval": 8,
    "heartbeatInterval": 30000,
    "pingInterval": 10000,
    "safeStateTimeout": 5000,
    "enableLogging": true
  }
}
```

### 3.8 配置更新确认消息

**服务端 → 客户端**：服务端确认配置更新成功

```json
{
  "type": "config_ack",
  "message": "Config updated successfully",
  "data": {
    "inputUpdateInterval": 8,
    "heartbeatInterval": 30000,
    "pingInterval": 10000,
    "safeStateTimeout": 5000,
    "enableLogging": true
  }
}
```

### 3.9 配置错误消息

**服务端 → 客户端**：服务端返回配置更新错误

```json
{
  "type": "config_error",
  "message": "Invalid configuration: inputUpdateInterval must be greater than 0"
}
```

### 3.10 延迟测量消息

**客户端 → 服务端**：客户端发送延迟测量请求

```json
{
  "type": "latency_probe",
  "timestamp": 1679347200000
}
```

### 3.11 延迟测量响应消息

**服务端 → 客户端**：服务端返回延迟测量响应

```json
{
  "type": "latency_probe_response",
  "timestamp": 1679347200050,
  "clientTimestamp": 1679347200000
}
```

### 3.12 调试消息

**双向**：发送调试信息

```json
{
  "type": "debug",
  "level": "info",
  "message": "Input state updated",
  "timestamp": 1679347200000,
  "source": "InputHandler",
  "data": {
    "keyboard": ["up", "right"]
  }
}
```

**日志级别**：
- `DEBUG` - 调试信息，详细的内部状态
- `INFO` - 一般信息，正常的操作日志
- `WARN` - 警告信息，潜在问题
- `ERROR` - 错误信息，需要关注的问题

### 3.12.1 调试配置设置消息（新增）

**客户端 → 服务端**：客户端设置调试配置

```json
{
  "type": "debug_config_set",
  "data": {
    "enabled": true,
    "level": "INFO",
    "filters": ["InputHandler", "ConfigManager"],
    "includeTimestamp": true,
    "includeSource": true
  }
}
```

### 3.12.2 调试配置获取消息（新增）

**客户端 → 服务端**：客户端请求获取调试配置

```json
{
  "type": "debug_config_get"
}
```

**服务端 → 客户端**：服务端返回调试配置

```json
{
  "type": "debug_config",
  "data": {
    "enabled": true,
    "level": "INFO",
    "filters": [],
    "includeTimestamp": true,
    "includeSource": true
  }
}
```

### 3.13 错误消息

**服务端 → 客户端**：服务端返回错误信息

```json
{
  "type": "error",
  "code": "INVALID_MESSAGE",
  "message": "Invalid message format",
  "details": {
    "field": "type",
    "expected": "string",
    "actual": "number"
  }
}
```

### 3.14 确认消息

**服务端 → 客户端**：服务端确认消息接收

```json
{
  "type": "ack",
  "messageId": "msg-12345",
  "status": "success",
  "message": "Message received successfully"
}
```

### 3.15 Ping消息

**双向**：心跳检测

```json
{
  "type": "ping"
}
```

### 3.16 Pong消息

**双向**：心跳响应

```json
{
  "type": "pong"
}
```

## 4. 输入模型

### 4.1 输入状态（InputState）

```json
{
  "keyboard": ["up", "right"],
  "mouse": {
    "x": 100,
    "y": 200,
    "left": true,
    "right": false,
    "middle": false
  },
  "joystick": {
    "x": 0.5,
    "y": -0.3,
    "deadzone": 0.1,
    "smoothing": 0.5
  },

}
```

### 4.2 输入增量（InputDelta）

```json
{
  "keyboard": {
    "pressed": ["up"],
    "released": ["down"]
  },
  "joystick": {
    "x": 0.7
  }
}
```

### 4.3 输入事件（InputEvent）

```json
{
  "type": "key_down",
  "data": {
    "key": "space"
  },
  "metadata": {
    "clientId": "android-12345",
    "timestamp": 1679347200000
  }
}
```

### 4.4 输入元数据（InputMetadata）

```json
{
  "clientId": "android-12345",
  "timestamp": 1679347200000,
  "latency": 50
}
```

## 5. 协议流程

### 5.1 客户端连接流程

1. 客户端建立 WebSocket 连接
2. 服务端发送 `welcome` 消息
3. 客户端发送 `config_get` 消息
4. 服务端返回 `config` 消息
5. 客户端开始发送 `input` 或 `input_delta` 消息

### 5.2 输入传输流程

1. 客户端采集输入数据
2. 客户端发送 `input` 或 `input_delta` 消息
3. 服务端接收消息并更新输入状态
4. 服务端执行输入操作

### 5.3 配置更新流程

1. 客户端发送 `config_set` 消息
2. 服务端验证配置有效性
3. 服务端应用新配置
4. 服务端返回 `config_ack` 消息

## 6. 错误处理

| 错误码 | 描述 | 处理建议 |
|-------|------|----------|
| `INVALID_MESSAGE` | 无效的消息格式 | 检查消息格式是否符合规范 |
| `UNSUPPORTED_MESSAGE_TYPE` | 不支持的消息类型 | 检查消息类型是否正确 |
| `INVALID_CONFIG` | 无效的配置 | 检查配置值是否在有效范围内 |
| `CONNECTION_ERROR` | 连接错误 | 检查网络连接，尝试重连 |
| `SERVER_ERROR` | 服务器内部错误 | 联系服务器管理员 |

## 7. 安全考虑

1. 建议使用 WSS（WebSocket Secure）协议进行加密通信
2. 客户端应验证服务端证书
3. 考虑添加身份验证机制
4. 限制消息大小，防止 DoS 攻击
5. 实现速率限制，防止消息洪水攻击

## 8. 性能优化

1. 优先使用 `input_delta` 消息，减少数据传输量
2. 合理设置输入更新频率，平衡延迟和性能
3. 实现消息压缩
4. 考虑使用二进制消息格式，减少序列化开销

## 9. 版本控制

| 版本 | 日期 | 变更描述 |
|------|------|----------|
| 1.0 | 2026-01-21 | 初始版本 |
| 1.1 | YYYY-MM-DD | 添加陀螺仪支持 |
| 1.2 | YYYY-MM-DD | 添加延迟测量功能 |
| 1.3 | 2026-03-13 | 添加配置管理增强（config_save, config_reset, config_validate） |
| 1.3 | 2026-03-13 | 添加调试消息增强（debug_config_set, debug_config_get, 日志级别控制） |

## 10. 附录

### 10.1 键盘键名映射

| 客户端键名 | 服务端键名 |
|-----------|------------|
| `up` | `up` |
| `down` | `down` |
| `left` | `left` |
| `right` | `right` |
| `space` | `space` |
| `enter` | `enter` |
| `shift` | `shift` |
| `ctrl` | `ctrl` |
| `alt` | `alt` |

### 10.2 消息类型列表

| 类型 | 方向 | 描述 |
|------|------|------|
| `welcome` | 双向 | 欢迎消息 |
| `input` | 客户端→服务端 | 完整输入状态 |
| `input_delta` | 客户端→服务端 | 输入状态增量 |
| `input_event` | 客户端→服务端 | 瞬时输入事件 |
| `config_get` | 客户端→服务端 | 获取配置 |
| `config_set` | 客户端→服务端 | 设置配置 |
| `config_save` | 客户端→服务端 | 保存配置到文件（v1.3新增） |
| `config_reset` | 客户端→服务端 | 重置配置为默认值（v1.3新增） |
| `config_validate` | 客户端→服务端 | 验证配置有效性（v1.3新增） |
| `config_validate_result` | 服务端→客户端 | 配置验证结果（v1.3新增） |
| `config` | 服务端→客户端 | 返回配置 |
| `config_ack` | 服务端→客户端 | 配置更新确认 |
| `config_error` | 服务端→客户端 | 配置错误 |
| `latency_probe` | 客户端→服务端 | 延迟测量请求 |
| `latency_probe_response` | 服务端→客户端 | 延迟测量响应 |
| `debug` | 双向 | 调试信息 |
| `debug_config_set` | 客户端→服务端 | 设置调试配置（v1.3新增） |
| `debug_config_get` | 客户端→服务端 | 获取调试配置（v1.3新增） |
| `debug_config` | 服务端→客户端 | 返回调试配置（v1.3新增） |
| `error` | 服务端→客户端 | 错误信息 |
| `ack` | 服务端→客户端 | 消息确认 |
| `ping` | 双向 | 心跳检测 |
| `pong` | 双向 | 心跳响应 |
