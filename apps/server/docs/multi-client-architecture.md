# ControlX 多客户端支持架构设计文档

## 文档信息
- **文档版本**: v1.0.0
- **创建日期**: 2026-04-05
- **作者**: Planner 子代理
- **状态**: 设计完成
- **目标**: 设计多客户端同时连接的架构方案

## 目录
1. [背景与问题](#背景与问题)
2. [现状分析](#现状分析)
3. [架构目标](#架构目标)
4. [核心组件设计](#核心组件设计)
5. [数据流设计](#数据流设计)
6. [接口定义](#接口定义)
7. [实现方案](#实现方案)
8. [风险评估](#风险评估)
9. [实施计划](#实施计划)

---

## 背景与问题

### 当前问题
ControlX Server 目前支持多个 WebSocket 客户端连接，但存在以下限制：

1. **无会话管理**：多个客户端连接但无会话概念，无法组织和管理连接
2. **无状态同步**：多个客户端无法同步输入状态，导致状态不一致
3. **无输入仲裁**：多个客户端同时发送输入时，无仲裁机制处理冲突
4. **无优先级机制**：所有客户端平等，无法设置优先级或主控关系
5. **无角色管理**：无法区分主控客户端和观察者客户端

### 业务需求
在实际应用场景中，可能需要：
- 多个用户同时观看同一设备的控制过程（观察者模式）
- 控制权交接（从客户端 A 切换到客户端 B）
- 优先级控制（高优先级客户端可以抢占控制权）
- 会话管理（创建、管理、销毁会话）

---

## 现状分析

### 已实现功能
基于 `Server/src/ws/server.ts` 分析：

| 功能 | 实现状态 | 说明 |
|------|----------|------|
| **客户端连接管理** | ✅ 已实现 | clients Map 存储 clientId -> ws |
| **连接数限制** | ✅ 已实现 | MAX_CONNECTIONS = 100 |
| **客户端 ID 生成** | ✅ 已实现 | generateClientId() |
| **心跳检测** | ✅ 已实现 | startHeartbeat(), stopHeartbeat() |
| **认证机制** | ✅ 已实现 | authManager.authenticate() |
| **连接生命周期** | ✅ 已实现 | connection, close, error 事件 |

### 缺失功能

| 功能 | 实现状态 | 影响 |
|------|----------|------|
| **会话管理** | ❌ 未实现 | 无法组织多个客户端 |
| **状态同步** | ❌ 未实现 | 多客户端状态不一致 |
| **输入仲裁** | ❌ 未实现 | 输入冲突无法处理 |
| **优先级机制** | ❌ 未实现 | 无法区分客户端重要性 |
| **角色管理** | ❌ 未实现 | 无法区分主控和观察者 |

---

## 架构目标

### 核心目标
1. **会话隔离**：支持多个独立会话，每个会话包含一组客户端
2. **状态同步**：实时同步输入状态到所有客户端
3. **输入仲裁**：智能处理多客户端输入冲突
4. **角色管理**：区分主控者（Controller）和观察者（Observer）
5. **优先级控制**：支持客户端优先级和抢占机制

### 性能目标
- **并发连接数**: 支持 100+ 客户端同时连接
- **状态同步延迟**: < 10ms
- **仲裁决策延迟**: < 5ms
- **会话切换延迟**: < 50ms

---

## 核心组件设计

### 4.1 会话管理器（SessionManager）

**职责**：
- 创建、管理、销毁会话
- 管理会话中的客户端列表
- 处理客户端加入和离开会话
- 维护会话状态

**接口定义**：

```typescript
/**
 * 会话状态
 */
export enum SessionState {
    ACTIVE = 'active',       // 会话活跃
    PAUSED = 'paused',       // 会话暂停
    CLOSED = 'closed',       // 会话已关闭
}

/**
 * 会话配置
 */
export interface SessionConfig {
    sessionId: string;
    name?: string;
    maxClients: number;      // 最大客户端数
    controlPolicy: ControlPolicy; // 控制策略
    createdAt: number;
    createdBy?: string;      // 创建者 clientId
}

/**
 * 会话信息
 */
export interface Session {
    id: string;
    config: SessionConfig;
    state: SessionState;
    clients: Map<string, ClientInfo>;
    controller?: string;     // 当前主控客户端 ID
    createdAt: number;
    updatedAt: number;
}

/**
 * 会话管理器接口
 */
export interface ISessionManager {
    // 会话管理
    createSession(config: Partial<SessionConfig>): Session;
    getSession(sessionId: string): Session | undefined;
    closeSession(sessionId: string): boolean;
    
    // 客户端管理
    addClient(sessionId: string, clientId: string, role: ClientRole): boolean;
    removeClient(sessionId: string, clientId: string): boolean;
    getClientRole(sessionId: string, clientId: string): ClientRole | undefined;
    
    // 主控管理
    setController(sessionId: string, clientId: string): boolean;
    getController(sessionId: string): string | undefined;
    transferControl(sessionId: string, fromClientId: string, toClientId: string): boolean;
    
    // 会话查询
    getActiveSessions(): Session[];
    getSessionByClient(clientId: string): Session | undefined;
}
```

### 4.2 客户端角色管理（ClientRole）

**角色定义**：

```typescript
/**
 * 客户端角色
 */
export enum ClientRole {
    CONTROLLER = 'controller',  // 主控者，可以发送输入
    OBSERVER = 'observer',      // 观察者，只能接收状态
    ADMIN = 'admin',            // 管理者，可以管理会话
}

/**
 * 客户端优先级
 */
export enum ClientPriority {
    LOW = 0,       // 低优先级
    NORMAL = 1,    // 正常优先级
    HIGH = 2,      // 高优先级
    CRITICAL = 3,  // 关键优先级
}

/**
 * 客户端信息
 */
export interface ClientInfo {
    clientId: string;
    role: ClientRole;
    priority: ClientPriority;
    connectedAt: number;
    lastActiveAt: number;
    capabilities: ClientCapabilities;
}

/**
 * 客户端能力
 */
export interface ClientCapabilities {
    canControl: boolean;        // 是否可以控制
    canObserve: boolean;        // 是否可以观察
    canManageSession: boolean;  // 是否可以管理会话
    supportedInputs: string[];  // 支持的输入类型
}
```

### 4.3 状态同步管理器（StateSyncManager）

**职责**：
- 维护全局输入状态
- 实时同步状态到所有客户端
- 处理状态变更广播
- 管理状态版本和历史

**接口定义**：

```typescript
/**
 * 输入状态快照
 */
export interface InputStateSnapshot {
    keyboard: Set<string>;      // 活跃按键
    mouse: MouseState;          // 鼠标状态
    joystick: JoystickState;    // 操纵杆状态
    gamepad: GamepadState;      // 游戏手柄状态
    timestamp: number;          // 快照时间戳
    version: number;            // 状态版本号
}

/**
 * 状态变更事件
 */
export interface StateChangeEvent {
    type: 'keyboard' | 'mouse' | 'joystick' | 'gamepad';
    action: 'press' | 'release' | 'move';
    data: any;
    clientId: string;
    timestamp: number;
}

/**
 * 状态同步管理器接口
 */
export interface IStateSyncManager {
    // 状态管理
    getCurrentState(): InputStateSnapshot;
    updateState(change: StateChangeEvent): boolean;
    
    // 状态同步
    broadcastState(sessionId: string): void;
    syncStateToClient(clientId: string): void;
    
    // 状态版本
    getStateVersion(): number;
    getStateHistory(limit?: number): InputStateSnapshot[];
    
    // 客户端状态管理
    getClientState(clientId: string): InputStateSnapshot | undefined;
    resetClientState(clientId: string): void;
}
```

### 4.4 输入仲裁器（InputArbitrator）

**职责**：
- 处理多客户端输入冲突
- 根据优先级和策略决定输入有效性
- 实现输入抢占和交接机制
- 记录仲裁历史

**控制策略**：

```typescript
/**
 * 控制策略
 */
export enum ControlPolicy {
    SINGLE_CONTROLLER = 'single_controller',   // 单主控模式
    ROUND_ROBIN = 'round_robin',               // 轮询模式
    PRIORITY_BASED = 'priority_based',         // 优先级模式
    CONSENSUS = 'consensus',                   // 共识模式
    FIRST_CLICK = 'first_click',               // 先到先得模式
}

/**
 * 输入仲裁结果
 */
export interface ArbitrationResult {
    accepted: boolean;         // 是否接受输入
    clientId: string;          // 接受输入的客户端 ID
    reason: string;            // 仲裁原因
    conflictingClients?: string[]; // 冲突的客户端列表
    timestamp: number;
}

/**
 * 输入仲裁器接口
 */
export interface IInputArbitrator {
    // 仲裁方法
    arbitrateInput(sessionId: string, clientId: string, input: any): ArbitrationResult;
    
    // 策略管理
    setPolicy(sessionId: string, policy: ControlPolicy): void;
    getPolicy(sessionId: string): ControlPolicy;
    
    // 主控管理
    canControl(sessionId: string, clientId: string): boolean;
    requestControl(sessionId: string, clientId: string): boolean;
    releaseControl(sessionId: string, clientId: string): boolean;
    
    // 仲裁历史
    getArbitrationHistory(sessionId: string, limit?: number): ArbitrationResult[];
}
```

---

## 数据流设计

### 5.1 客户端连接流程

```
客户端连接请求
    ↓
WebSocket Server 接收连接
    ↓
认证检查（authManager.authenticate）
    ↓
创建 ClientInfo（role, priority, capabilities）
    ↓
选择或创建会话（SessionManager.addClient）
    ↓
设置客户端角色（CONTROLLER 或 OBSERVER）
    ↓
同步当前状态到客户端（StateSyncManager.syncStateToClient）
    ↓
广播客户端加入事件（WebSocket broadcast）
    ↓
客户端连接完成
```

### 5.2 输入处理流程

```
客户端发送输入事件
    ↓
WebSocket Router 接收消息
    ↓
验证客户端角色（SessionManager.getClientRole）
    ↓
    CONTROLLER? ──否──→ 拒绝输入，返回错误
    │
    是
    ↓
输入仲裁（InputArbitrator.arbitrateInput）
    ↓
    accepted? ──否──→ 拒绝输入，返回仲裁结果
    │
    是
    ↓
更新输入状态（StateSyncManager.updateState）
    ↓
执行输入操作（InputExecutor）
    ↓
广播状态变更（StateSyncManager.broadcastState）
    ↓
返回成功响应
```

### 5.3 会话管理流程

```
创建会话请求
    ↓
验证请求者权限（ClientRole.ADMIN）
    ↓
创建会话（SessionManager.createSession）
    ↓
设置控制策略（InputArbitrator.setPolicy）
    ↓
初始化会话状态（StateSyncManager）
    ↓
返回会话 ID
    ↓
客户端加入会话
    ↓
设置客户端角色和优先级
    ↓
广播会话变更
```

### 5.4 控制权交接流程

```
请求控制权交接
    ↓
验证交接权限
    ↓
    当前主控者同意? ──否──→ 检查请求者优先级
    │
    是
    ↓
释放控制权（InputArbitrator.releaseControl）
    ↓
转移控制权（SessionManager.transferControl）
    ↓
    新主控者接管控制权（InputArbitrator.requestControl）
    ↓
广播控制权变更
    ↓
同步当前状态到新主控者
    ↓
通知所有客户端控制权已变更
```

---

## 接口定义

### 6.1 WebSocket 消息类型扩展

```typescript
/**
 * 会话相关消息类型
 */
export interface SessionMessageTypes {
    // 会话管理
    'session/create': {
        name?: string;
        maxClients?: number;
        controlPolicy?: ControlPolicy;
    };
    'session/join': {
        sessionId: string;
        role?: ClientRole;
    };
    'session/leave': {
        sessionId: string;
    };
    'session/close': {
        sessionId: string;
    };
    
    // 控制权管理
    'session/request_control': {
        sessionId: string;
    };
    'session/release_control': {
        sessionId: string;
    };
    'session/transfer_control': {
        sessionId: string;
        toClientId: string;
    };
    
    // 会话状态
    'session/state': {
        sessionId: string;
        state: SessionState;
        clients: ClientInfo[];
        controller?: string;
    };
    'session/client_joined': {
        sessionId: string;
        clientId: string;
        role: ClientRole;
    };
    'session/client_left': {
        sessionId: string;
        clientId: string;
    };
}
```

### 6.2 REST API 扩展（可选）

```typescript
/**
 * 会话管理 REST API
 */
GET    /api/sessions               // 获取所有活跃会话
GET    /api/sessions/:id           // 获取会话详情
POST   /api/sessions               // 创建新会话
PUT    /api/sessions/:id           // 更新会话配置
DELETE /api/sessions/:id           // 关闭会话

GET    /api/sessions/:id/clients   // 获取会话中的客户端列表
POST   /api/sessions/:id/clients   // 客户端加入会话
DELETE /api/sessions/:id/clients/:clientId // 客户端离开会话

PUT    /api/sessions/:id/controller // 设置主控客户端
```

---

## 实现方案

### 7.1 模块结构

```
Server/src/
├── session/
│   ├── SessionManager.ts       # 会话管理器
│   ├── Session.ts              # 会话类
│   ├── types.ts                # 会话类型定义
│   └── policies/
│       ├── SingleControllerPolicy.ts  # 单主控策略
│       ├── RoundRobinPolicy.ts        # 轮询策略
│       ├── PriorityBasedPolicy.ts     # 优先级策略
│       └── ConsensusPolicy.ts         # 共识策略
│
├── state/
│   ├── StateSyncManager.ts     # 状态同步管理器
│   ├── InputStateSnapshot.ts   # 输入状态快照
│   ├── StateHistory.ts         # 状态历史
│   └── types.ts                # 状态类型定义
│
├── arbitration/
│   ├── InputArbitrator.ts      # 输入仲裁器
│   ├── ArbitrationResult.ts    # 仲裁结果
│   ├── ConflictResolver.ts     # 冲突解决器
│   └── types.ts                # 仲裁类型定义
│
└── ws/
    ├── handlers/
    │   ├── session.ts          # 会话消息处理
    │   ├── control.ts          # 控制权消息处理
    │   └── state.ts            # 状态同步消息处理
    ├── router.ts               # 消息路由（扩展）
    └── server.ts               # WebSocket 服务器（扩展）
```

### 7.2 实现步骤

#### Phase 1: 核心组件实现
1. 实现会话类型定义（`session/types.ts`）
2. 实现会话管理器（`session/SessionManager.ts`）
3. 实现状态同步管理器（`state/StateSyncManager.ts`）
4. 实现输入仲裁器（`arbitration/InputArbitrator.ts`）

#### Phase 2: 控制策略实现
1. 实现单主控策略（`policies/SingleControllerPolicy.ts`）
2. 实现优先级策略（`policies/PriorityBasedPolicy.ts`）
3. 实现轮询策略（`policies/RoundRobinPolicy.ts`）
4. 实现共识策略（`policies/ConsensusPolicy.ts`）

#### Phase 3: WebSocket 集成
1. 扩展消息类型定义（`ws/messageTypes.ts`）
2. 实现会话消息处理器（`ws/handlers/session.ts`）
3. 实现控制权消息处理器（`ws/handlers/control.ts`）
4. 扩展消息路由（`ws/router.ts`）

#### Phase 4: 测试和优化
1. 单元测试
2. 性能测试
3. 冲突场景测试
4. 负载测试

---

## 风险评估

### 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **状态同步延迟** | 高 | 使用增量同步、压缩传输 |
| **输入冲突处理** | 中 | 实现多种仲裁策略，提供配置选项 |
| **会话管理开销** | 中 | 限制会话数量，实现会话池 |
| **内存占用增长** | 高 | 实现状态历史清理，限制历史长度 |

### 业务风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **控制权交接延迟** | 高 | 实现快速交接机制，预授权 |
| **观察者体验** | 中 | 提供实时状态同步，延迟补偿 |
| **权限管理复杂性** | 中 | 提供清晰的 API 文档，简化配置 |
| **客户端兼容性** | 中 | 提供版本协商机制 |

---

## 实施计划

### 时间规划

| 阶段 | 任务 | 预计时间 | 优先级 |
|------|------|----------|--------|
| **Phase 1** | 核心组件实现 | 2-3 天 | P0 |
| **Phase 2** | 控制策略实现 | 1-2 天 | P1 |
| **Phase 3** | WebSocket 集成 | 2-3 天 | P0 |
| **Phase 4** | 测试和优化 | 2-3 天 | P1 |

### 里程碑

1. **M1**: 会话管理器实现完成（Phase 1 结束）
2. **M2**: 输入仲裁器实现完成（Phase 1 结束）
3. **M3**: WebSocket 集成完成（Phase 3 结束）
4. **M4**: 测试通过，功能验证完成（Phase 4 结束）

---

## 附录

### A. 示例代码

#### A.1 会话管理器示例

```typescript
import { SessionManager } from './session/SessionManager';
import { ClientRole, ControlPolicy } from './session/types';

// 创建会话管理器
const sessionManager = new SessionManager();

// 创建新会话
const session = sessionManager.createSession({
    name: 'GameSession',
    maxClients: 10,
    controlPolicy: ControlPolicy.PRIORITY_BASED,
});

// 客户端加入会话
sessionManager.addClient(session.id, 'client_001', ClientRole.CONTROLLER);
sessionManager.addClient(session.id, 'client_002', ClientRole.OBSERVER);

// 设置主控者
sessionManager.setController(session.id, 'client_001');

// 转移控制权
sessionManager.transferControl(session.id, 'client_001', 'client_002');
```

#### A.2 输入仲裁示例

```typescript
import { InputArbitrator } from './arbitration/InputArbitrator';
import { ControlPolicy } from './session/types';

// 创建输入仲裁器
const arbitrator = new InputArbitrator(sessionManager);

// 设置控制策略
arbitrator.setPolicy(session.id, ControlPolicy.PRIORITY_BASED);

// 仲裁输入
const result = arbitrator.arbitrateInput(session.id, 'client_001', {
    type: 'keyboard',
    key: 'A',
    action: 'press',
});

console.log(result.accepted); // true or false
console.log(result.reason);   // 仲裁原因
```

---

## 总结

本架构设计文档提出了 ControlX 多客户端支持的完整架构方案，包括：

1. **会话管理机制**：支持多会话隔离，客户端分组管理
2. **角色管理机制**：区分主控者、观察者、管理者角色
3. **状态同步机制**：实时同步输入状态，广播变更
4. **输入仲裁机制**：处理多客户端输入冲突，支持多种策略
5. **优先级机制**：支持客户端优先级和抢占机制

下一步工作：
1. 实现核心组件（Phase 1）
2. 实现控制策略（Phase 2）
3. 集成 WebSocket（Phase 3）
4. 测试和优化（Phase 4）

---

**文档结束**