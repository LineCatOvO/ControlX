# WMMT Controller - 远程赛车输入控制系统

## 项目概述

WMMT Controller 是一个远程赛车输入控制系统，允许通过安卓设备上的用户操作生成控制结果，使目标赛车游戏在无需修改的情况下响应这些控制。

## 待完成任务清单

### 🔴 P0 - 核心功能缺失（必须立即实现）

#### 1. 游戏手柄真实实现（XInput + ViGEmBus）

- [ ] **1.1 安装和配置系统级依赖**
  - [ ] 安装 ViGEmBus 驱动（需要管理员权限）
  - [ ] 验证驱动可用性（`Test-ViGEmBus` 命令）
  - [ ] 安装 Windows Build Tools（用于编译 node-vigemclient）
  - [ ] 安装 node-vigemclient 包（`npm install vigemclient`）
  - [ ] 配置环境变量（`VIGEM_CLIENT_PATH`）

- [ ] **1.2 实现 GamepadXInputAdapter 类**
  - [ ] 创建 `src/input/adapters/GamepadXInputAdapter.ts`
  - [ ] 定义 XInput 状态数据结构（14按钮 + 4轴 + 2扳机）
  - [ ] 实现 ViGEmClient 初始化和连接管理
  - [ ] 实现虚拟控制器创建（Xbox 360）
  - [ ] 实现设备连接状态检测

- [ ] **1.3 实现完整的 XInput 通道映射**
  - [ ] 实现摇杆轴映射（LX, LY, RX, RY）
  - [ ] 实现扳机映射（LT, RT）
  - [ ] 实现 14 个按钮映射（A, B, X, Y, LB, RB, BACK, START, LS, RS, DPAD_UP, DPAD_DOWN, DPAD_LEFT, DPAD_RIGHT）
  - [ ] 实现值范围限制（轴 [-1.0, 1.0]，扳机 [0.0, 1.0]）
  - [ ] 实现缺失字段处理（等价于零状态）

- [ ] **1.4 实现状态提交策略**
  - [ ] 每个 tick 构造完整 XInput 状态
  - [ ] 通过 vigemclient 一次性提交整帧状态
  - [ ] 禁止事件驱动提交
  - [ ] 禁止局部字段更新
  - [ ] 禁止依赖历史残留

- [ ] **1.5 修复 GamepadExecutor**
  - [ ] 移除 node-key-sender 依赖
  - [ ] 集成 GamepadXInputAdapter
  - [ ] 更新 applyState 方法
  - [ ] 更新 reset 方法
  - [ ] 添加错误处理

#### 2. 键盘映射规则完善

- [ ] **2.1 实现差集计算逻辑**
  - [ ] 记录上一次的键盘状态（`previousPressedKeys`）
  - [ ] 在每次应用状态时计算差集
  - [ ] `toPress = current - previous`
  - [ ] `toRelease = previous - current`

- [ ] **2.2 实现幂等性保证**
  - [ ] 确保同一按键不得重复发送 KeyDown
  - [ ] KeyUp 仅在状态从 pressed → released 时发送
  - [ ] 不假设虚拟键盘 API 对重复 KeyDown 是安全的
  - [ ] 添加按键去重逻辑

- [ ] **2.3 实现正确的按键顺序**
  - [ ] 先释放不需要的键（toRelease）
  - [ ] 再按下新增的键（toPress）
  - [ ] 确保按键顺序符合系统要求

- [ ] **2.4 实现清零时的键盘行为**
  - [ ] 遍历所有已按下按键
  - [ ] 逐一发送 KeyUp
  - [ ] 清空内部状态

- [ ] **2.5 添加键盘映射日志**
  - [ ] 记录按下的键列表
  - [ ] 记录释放的键列表
  - [ ] 记录当前键盘状态
  - [ ] 添加调试信息

#### 3. 输入验证器实现

- [ ] **3.1 创建 InputValidator 类**
  - [ ] 创建 `src/input/validator.ts`
  - [ ] 定义验证器接口
  - [ ] 实现验证器构造函数

- [ ] **3.2 实现键盘状态验证**
  - [ ] 验证键盘状态对象存在
  - [ ] 验证按键合法性（必须是标准键码）
  - [ ] 验证按键数量合理性（不超过系统限制）
  - [ ] 验证按键组合合法性（不包含冲突按键）

- [ ] **3.3 实现游戏手柄状态验证**
  - [ ] 验证游戏手柄状态对象存在
  - [ ] 验证按钮状态合法性（true/false）
  - [ ] 验证摇杆轴值范围（[-1.0, 1.0]）
  - [ ] 验证扳机值范围（[0.0, 1.0]）
  - [ ] 验证缺失字段处理（等价于零状态）

- [ ] **3.4 实现序列号单调性验证**
  - [ ] 提取序列号（frameId）
  - [ ] 验证序列号是数字类型
  - [ ] 验证序列号单调递增
  - [ ] 处理重传和重新连接场景
  - [ ] 记录序列号异常

- [ ] **3.5 集成验证器到消息处理流程**
  - [ ] 在状态存储前调用验证器
  - [ ] 验证失败时返回错误 ACK
  - [ ] 记录验证失败原因
  - [ ] 触发安全清零（可选）

#### 4. WebSocket 协议完整实现

- [ ] **4.1 实现状态消息处理器**
  - [ ] 创建 `src/ws/handlers/state.ts`
  - [ ] 实现 `handleState` 方法
  - [ ] 转换 StateMessage 为 InputState
  - [ ] 调用 StateStore 存储
  - [ ] 发送 ACK 消息

- [ ] **4.2 实现输入事件处理器**
  - [ ] 创建 `src/ws/handlers/inputEvent.ts`
  - [ ] 实现 `handleInputEvent` 方法
  - [ ] 调用执行器管理器应用事件
  - [ ] 记录详细日志

- [ ] **4.3 实现延迟探测机制**
  - [ ] 创建 `src/ws/handlers/latencyProbe.ts`
  - [ ] 实现 `handleLatencyProbe` 方法
  - [ ] 记录客户端时间戳
  - [ ] 返回服务端时间戳
  - [ ] 计算 RTT（服务端时间戳 - 客户端时间戳）

- [ ] **4.4 实现 ACK 机制**
  - [ ] 定义 ACK 消息格式
  - [ ] 在状态接收成功后发送 ACK
  - [ ] 在状态验证失败后发送错误 ACK
  - [ ] 记录 ACK 状态和时间戳

- [ ] **4.5 完善 RTT 计算**
  - [ ] 记录每次 RTT 测量
  - [ ] 计算 RTT 统计（平均、最小、最大）
  - [ ] 实现延迟监控 API
  - [ ] 添加延迟告警机制（超过阈值）

### 🟡 P1 - 重要功能缺失（近期实现）

#### 5. ApplyScheduler 时间权威明确

- [ ] **5.1 定义 ApplyScheduler 为唯一时间权威**
  - [ ] 在文档中明确说明
  - [ ] 在代码注释中说明
  - [ ] 在架构图中标注

- [ ] **5.2 重构安全控制器超时检查**
  - [ ] 修改 `checkTimeout` 使用 `tickTime` 而非 `Date.now()`
  - [ ] 修改 `recordValidState` 使用 `tickTime`
  - [ ] 确保时间一致性

- [ ] **5.3 添加时间戳记录**
  - [ ] 记录每次状态应用的时间戳
  - [ ] 记录每次状态接收的时间戳
  - [ ] 记录每次清零的时间戳
  - [ ] 添加时间差统计

#### 6. 心跳与延迟探测完整实现

- [ ] **6.1 实现客户端心跳**
  - [ ] 创建 `src/input/heartbeat.ts`
  - [ ] 实现心跳定时器（默认 30s）
  - [ ] 实现心跳消息发送
  - [ ] 处理心跳超时

- [ ] **6.2 实现服务端心跳处理**
  - [ ] 实现 `handlePing` 方法
  - [ ] 实现 `handlePong` 方法
  - [ ] 实现心跳超时检测
  - [ ] 心跳超时触发清零

- [ ] **6.3 完善 RTT 统计**
  - [ ] 定义 RTT 统计结构
  - [ ] 实现 RTT 累积
  - [ ] 实现 RTT 计算（平均、最小、最大、P95）
  - [ ] 添加 RTT 监控 API

#### 7. 模块边界重构

- [ ] **7.1 拆分执行器管理器**
  - [ ] 创建 `src/input/adapters/` 目录
  - [ ] 创建 `KeyboardAdapter.ts`
  - [ ] 创建 `GamepadXInputAdapter.ts`
  - [ ] 创建 `MouseAdapter.ts`（如果需要）
  - [ ] 删除 `executor.ts` 中的适配器逻辑

- [ ] **7.2 定义适配器接口**
  - [ ] 定义 `InputAdapter` 基类接口
  - [ ] 定义 `KeyboardAdapter` 接口
  - [ ] 定义 `GamepadAdapter` 接口
  - [ ] 定义 `MouseAdapter` 接口

- [ ] **7.3 重构 SafetyController**
  - [ ] 确保只允许 SafetyController 触发清零
  - [ ] 移除其他模块的清零逻辑
  - [ ] 添加清零权限检查
  - [ ] 添加清零原因记录

- [ ] **7.4 明确模块职责**
  - [ ] 在注释中明确每个模块的职责
  - [ ] 添加模块边界说明
  - [ ] 添加模块依赖关系图
  - [ ] 添加模块交互时序图

### 🟢 P2 - 优化与增强（后续实现）

#### 8. WebSocket 协议增强

- [ ] **8.1 实现配置管理**
  - [ ] 定义配置接口
  - [ ] 实现配置加载（从 config.json）
  - [ ] 实现配置验证
  - [ ] 实现配置热更新

- [ ] **8.2 实现配置处理器**
  - [ ] 创建 `src/ws/handlers/config.ts`
  - [ ] 实现 `config_get` 处理器
  - [ ] 实现 `config_set` 处理器
  - [ ] 实现 `config_ack` 处理器
  - [ ] 实现 `config_error` 处理器

- [ ] **8.3 实现调试消息**
  - [ ] 定义调试消息格式
  - [ ] 实现日志级别控制（DEBUG, INFO, WARN, ERROR）
  - [ ] 实现日志过滤
  - [ ] 实现日志导出

#### 9. 可观测性指标完善

- [ ] **9.1 创建 Metrics 模块**
  - [ ] 创建 `src/input/metrics.ts`
  - [ ] 定义指标接口
  - [ ] 实现指标收集逻辑

- [ ] **9.2 实现连接状态监控**
  - [ ] 记录连接状态（connected/disconnected）
  - [ ] 记录连接时间
  - [ ] 记录断开原因
  - [ ] 记录重连次数

- [ ] **9.3 实现输入统计**
  - [ ] 记录键盘事件数量
  - [ ] 记录游戏手柄事件数量
  - [ ] 记录鼠标事件数量
  - [ ] 记录输入频率

- [ ] **9.4 实现系统资源监控**
  - [ ] 记录 CPU 使用率
  - [ ] 记录内存使用量
  - [ ] 记录网络延迟
  - [ ] 记录应用延迟

#### 10. 集成测试完善

- [ ] **10.1 添加 Xbox 通道测试**
  - [ ] 测试所有 14 个按钮
  - [ ] 测试所有 4 个摇杆轴
  - [ ] 测试所有 2 个扳机
  - [ ] 测试完整状态提交

- [ ] **10.2 添加清零机制测试**
  - [ ] 测试超时清零
  - [ ] 测试断开清零
  - [ ] 测试状态校验失败清零
  - [ ] 测试显式清零

- [ ] **10.3 添加异常场景测试**
  - [ ] 测试序列号倒退
  - [ ] 测试非法状态
  - [ ] 测试网络中断
  - [ ] 测试应用崩溃

- [ ] **10.4 添加性能测试**
  - [ ] 测试 125Hz 应用频率
  - [ ] 测试延迟（RTT）
  - [ ] 测试吞吐量
  - [ ] 测试资源占用

## 技术文档

- [需求文档](doc/requirements.md)
- [执行端技术设计 v1.3](doc/TechDesign/Server/ProjectStructure.md)
- [主逻辑设计 v1.1](doc/TechDesign/Server/MainLogic.md)
- [虚拟设备实现 v1.2](doc/TechDesign/Server/VirturalDeviceImplementation.md)
- [WebSocket 协议](doc/TechDesign/Server/protocol/websocket.md)
- [Android UI 渲染](doc/AndroidUiRendering.md)
- [Android 布局计算](doc/AndroidUILayoutCalculation.md)

## 开发指南

### 环境要求

- Node.js >= 16.x
- TypeScript >= 4.x
- Windows 操作系统
- 管理员权限（用于安装 ViGEmBus 驱动）

### 安装依赖

```bash
cd Server
npm install
```

### 运行模式

```bash
# Dry Run 模式（调试和测试）
DRY_RUN=true npm start

# Test 模式（无实际输入）
TEST_MODE=true npm start

# 生产模式
npm start
```

### 配置文件

配置文件位于 `config.example.json`，复制为 `config.json` 并根据需要修改。

## 许可证

MIT
