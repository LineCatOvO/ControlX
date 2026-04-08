# ADR-001: WebSocket 作为控制数据传输协议

## 状态

已采纳

## 背景

远程赛车输入控制系统需要在 Android 客户端与 Node.js 服务端之间传输控制数据。系统要求：
- 单设备本地运行场景
- 本地控制链路（localhost）
- 高频率控制状态更新（125Hz）
- 低延迟要求
- 连接稳定性

## 决策

采用 WebSocket 作为控制数据传输协议。

## 理由

1. **实时性**：WebSocket 提供全双工通信，适合高频状态传输
2. **低延迟**：本地 localhost 连接，WebSocket 开销小
3. **连接稳定性**：持久连接避免 HTTP 请求开销
4. **实现简单**：Node.js 和 Android 都有成熟的 WebSocket 实现
5. **本地场景适配**：localhost 场景下 WebSocket 性能优异

## 替代方案

### 方案 A：HTTP REST API
- 不适合：高频传输会产生大量 HTTP 开销
- 不适合：请求-响应模型不适合实时控制

### 方案 B：UDP Socket
- 适合高频低延迟场景
- 但本地 localhost 场景 WebSocket 已足够
- 实现复杂度更高

### 方案 C：TCP Socket（原生）
- 可实现自定义协议
- WebSocket 已提供足够功能
- 避免重复造轮子

## 后果

### 正面
- 实现简单，开发效率高
- 稳定可靠的通信层
- 便于调试和监控

### 负面
- WebSocket 连接需要维护心跳
- 断连后需要重连逻辑

### 风险
- WebSocket 在某些特殊网络环境可能被限制（本地场景无影响）

## 参考

- doc/TechDesign/TechDesign-TransportLayer.md
- docs/SRS.md §10 网络通信行为