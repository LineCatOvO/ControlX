# WMMT Controller - 详细任务清单

本文档包含项目所有未完成的任务，按优先级分类，每个任务都细化为可执行的步骤。

## 📊 任务统计

| 优先级 | 任务数 | 子任务数 | 预计工作量 |
|--------|--------|----------|------------|
| 🔴 P0 | 6 | 60+ | 3-4 周 |
| 🟡 P1 | 4 | 25+ | 1-2 周 |
| 🟢 P2 | 4 | 25+ | 1 周 |
| **总计** | **14** | **110+** | **5-7 周** |

---

## ✅ 测试任务完成状态（2026-02-19 更新）

### 架构重构任务完成（2026-02-19 更新）✅

#### 阶段 1：地基搭建 ✅ 已完成
- [x] 创建 src/input/hosts/ 目录
- [x] 创建 src/input/router/ 目录
- [x] 实现 InputHost.ts 抽象基类（策略模式）
- [x] 实现 InputDeviceType 枚举
- [x] 实现 InputRouter.ts（门面模式）
- [x] 实现 WindowsKeyboardHost.ts（node-key-sender）
- [x] 实现 WindowsGamepadHost.ts（ViGEmBus）
- [x] 创建 hosts/index.ts 统一导出
- [x] 创建 router/index.ts 统一导出
- [x] TypeScript 编译验证通过

#### 阶段 2：影子模式 ✅ 已完成
- [x] 创建 ShadowModeManager.ts（501 行）
- [x] 实现双写机制（同时调用 Executor 和 Router）
- [x] 实现一致性比对（状态/耗时/错误）
- [x] 实现自动降级保护（连续 5 次失败切换）
- [x] 创建 ShadowModeExecutor.ts（装饰器模式）
- [x] 创建 initShadowMode.ts 辅助函数
- [x] 创建 executor_shadow.ts 集成模块
- [x] 修改 applyScheduler.ts 支持影子模式
- [x] 修改 app.ts 添加初始化调用
- [x] 环境变量控制：SHADOW_MODE=true

#### 阶段 3：流量切换 ✅ 已完成
- [x] 创建 RouterOnlyExecutor.ts（适配器模式）
- [x] 实现 Router-only 执行路径
- [x] 实现自动降级保护（连续 3 次失败切换）
- [x] 修改 applyScheduler.ts 支持 Router-only 模式
- [x] 修改 app.ts 添加初始化调用
- [x] 环境变量控制：ROUTER_ONLY=true
- [x] 三种模式优先级：Router-only > Shadow > Executor

#### 阶段 4：生态扩展（空类） ✅ 已完成
- [x] 创建 LinuxKeyboardHost.ts 空类（uinput 技术方案）
- [x] 创建 LinuxGamepadHost.ts 空类（uinput 技术方案）
- [x] 创建 MacOSKeyboardHost.ts 空类（Quartz 技术方案）
- [x] 创建 MacOSGamepadHost.ts 空类（GCController 技术方案）
- [x] 更新 hosts/index.ts 导出
- [ ] 实现 Linux 平台具体功能（待制作，低优先级）
- [ ] 实现 MacOS 平台具体功能（待制作，低优先级）

### 单元测试完成

| 模块 | 测试文件 | 测试用例数 | 通过率 | 状态 |
|------|----------|------------|--------|------|
| 输入验证器 | validator.test.ts | 48 | 100% | ✅ 完成 |
| 状态存储 | stateStore.test.ts | 24 | 100% | ✅ 完成 |
| 安全控制器 | safetyController.test.ts | 28 | 100% | ✅ 完成 |
| 应用调度器 | applyScheduler.test.ts | 18 | 100% | ✅ 完成 |
| 心跳模块 | heartbeat.test.ts | 24 | 83.3% | ⚠️ 部分失败 |
| 输入执行器 | executors.test.ts | 20 | 100% | ✅ 完成 |
| 键盘输出 | keyboard.test.ts | 8 | 25% | ⚠️ Mock 问题 |

### 集成测试完成

| 测试类型 | 测试文件 | 测试用例数 | 通过率 | 状态 |
|----------|----------|------------|--------|------|
| WebSocket 消息处理 | websocket-messages.test.ts | 18 | 100% | ✅ 完成 |
| 端到端流程 | e2e-integration.test.ts | 16 | 100% | ✅ 完成 |

### Android 测试完成（2026-02-19 新增）✅

| 模块 | 测试文件 | 测试用例数 | 状态 |
|------|----------|------------|------|
| 输入状态模型 | InputStateTest.java | 24 | ✅ 完成 |
| 原始输入模型 | RawInputTest.java | 22 | ✅ 完成 |
| 脚本配置 | ScriptProfileTest.java | 23 | ✅ 完成 |
| 游戏输入事件 | GameInputEventTest.java | 21 | ✅ 完成 |
| 输入状态控制器 | InputStateControllerTest.java | 22 | ✅ 完成 |
| 安全控制器 | SafetyControllerTest.java | 20 | ✅ 完成 |
| Profile 管理 | ProfileManagerIntegrationTest.java | 15 | ✅ 完成 |
| 静态处理器 | StaticProcessorTests.java | 5 | ✅ 已有 |
| Profile 契约 | ProfileManagerContractTests.java | 6 | ✅ 已有 |
| 输入抽象层 Golden | InputAbstractionLayerGoldenTest.java | 4 | ✅ 已有 |
| 输入抽象层 Gyro | InputAbstractionLayerGyroTest.java | - | ✅ 已有 |
| 输入抽象层 Pointer | InputAbstractionLayerPointerTest.java | - | ✅ 已有 |
| 输入抽象层 Rotation | InputAbstractionLayerRotationTest.java | - | ✅ 已有 |

**Android 测试总计**: 13 个测试文件，162+ 个测试用例

**测试运行方法**:
```bash
cd AndroidClient
./gradlew testDebugUnitTest
```

**详细报告**: `AndroidClient/ANDROID_TEST_REPORT.md`

### 测试统计

- **测试套件总数**：12
- **测试用例总数**：191
- **通过测试用例**：180 (94.2%)
- **失败测试用例**：11 (5.8%)
- **代码覆盖率**：84.87%

### 测试覆盖详情

| 文件 | 语句覆盖率 | 分支覆盖率 | 函数覆盖率 | 行覆盖率 |
|------|------------|------------|------------|----------|
| src/input/heartbeat.ts | 92.3% | 77.77% | 100% | 92.3% |
| src/input/safetyController.ts | 98.11% | 90% | 100% | 98.11% |
| src/input/stateStore.ts | 88.05% | 71.87% | 100% | 89.39% |
| src/input/validator.ts | 92.68% | 88.33% | 100% | 92.68% |
| tests/common/testUtils.ts | 57.14% | 100% | 50% | 57.14% |

---

## 🔴 P0 - 核心功能缺失（必须立即实现）

### 1. 游戏手柄真实实现（XInput + ViGEmBus）

#### 1.1 安装和配置系统级依赖
- [ ] 1.1.1 下载并安装 ViGEmBus 驱动（管理员权限）
- [ ] 1.1.2 安装 Windows Build Tools
- [x] 1.1.3 安装 node-vigemclient 包 - 已添加到 package.json
- [ ] 1.1.4 配置 VIGEM_CLIENT_PATH 环境变量
- [x] 1.1.5 创建 docs/dependencies.md 文档

#### 1.2 实现 GamepadXInputAdapter 类
- [x] 1.2.1 创建 src/input/adapters/ 目录结构
- [x] 1.2.2 定义 XInput 状态数据结构（4轴、14按钮、2扳机）
- [x] 1.2.3 实现 ViGEmClient 初始化和连接管理（含优雅降级）
- [x] 1.2.4 实现虚拟控制器创建（Xbox 360）
- [x] 1.2.5 实现设备连接状态检测

#### 1.3 实现完整的 XInput 通道映射
- [x] 1.3.1 实现摇杆轴映射（LX, LY, RX, RY）
- [x] 1.3.2 实现扳机映射（LT, RT）
- [x] 1.3.3 实现 14 个按钮映射
- [x] 1.3.4 实现值范围限制（轴 [-1.0, 1.0]，扳机 [0.0, 1.0]）
- [x] 1.3.5 实现缺失字段处理（等价于零状态）

#### 1.4 实现状态提交策略
- [x] 1.4.1 每个 tick 构造完整 XInput 状态
- [x] 1.4.2 通过 vigemclient 一次性提交整帧状态
- [x] 1.4.3 禁止事件驱动提交
- [x] 1.4.4 禁止局部字段更新
- [x] 1.4.5 禁止依赖历史残留

#### 1.5 修复 GamepadExecutor
- [x] 1.5.1 移除 node-key-sender 依赖
- [x] 1.5.2 集成 GamepadXInputAdapter
- [x] 1.5.3 更新 applyState 方法
- [x] 1.5.4 更新 reset 方法
- [x] 1.5.5 添加错误处理

#### 1.6 游戏手柄测试跳过机制
- [x] 1.6.1 创建 ViGEmBus 检测工具函数 (tests/utils/vigemDetector.ts)
- [x] 1.6.2 在游戏手柄测试中使用 test.skip() 或运行时检测
- [x] 1.6.3 添加清晰的跳过原因说明（平台、驱动要求）
- [x] 1.6.4 确保非 Windows 环境下测试报告清晰显示跳过原因

---

### 2. 键盘映射规则完善

#### 2.1 实现差集计算逻辑
- [x] 2.1.1 记录上一次的键盘状态（previousPressedKeys）
- [x] 2.1.2 在每次应用状态时计算差集
- [x] 2.1.3 实现 toPress = current - previous
- [x] 2.1.4 实现 toRelease = previous - current
- [x] 2.1.5 添加差集计算日志

#### 2.2 实现幂等性保证
- [x] 2.2.1 确保同一按键不得重复发送 KeyDown
- [x] 2.2.2 KeyUp 仅在状态从 pressed → released 时发送
- [x] 2.2.3 不假设虚拟键盘 API 对重复 KeyDown 是安全的
- [x] 2.2.4 添加按键去重逻辑
- [x] 2.2.5 添加去重统计

#### 2.3 实现正确的按键顺序
- [x] 2.3.1 先释放不需要的键（toRelease）
- [x] 2.3.2 再按下新增的键（toPress）
- [x] 2.3.3 确保按键顺序符合系统要求
- [x] 2.3.4 添加顺序验证逻辑
- [x] 2.3.5 添加顺序统计

#### 2.4 实现清零时的键盘行为
- [x] 2.4.1 遍历所有已按下按键
- [x] 2.4.2 逐一发送 KeyUp
- [x] 2.4.3 清空内部状态
- [x] 2.4.4 添加清零日志
- [x] 2.4.5 添加清零统计

#### 2.5 添加键盘映射日志
- [x] 2.5.1 记录按下的键列表
- [x] 2.5.2 记录释放的键列表
- [x] 2.5.3 记录当前键盘状态
- [x] 2.5.4 添加调试信息
- [x] 2.5.5 添加日志开关控制

---

### 3. 输入验证器实现

#### 3.1 创建 InputValidator 类
- [x] 3.1.1 创建 src/input/validator.ts
- [x] 3.1.2 定义验证器接口
- [x] 3.1.3 实现验证器构造函数
- [x] 3.1.4 定义验证规则
- [x] 3.1.5 添加错误处理

#### 3.2 实现键盘状态验证
- [x] 3.2.1 验证键盘状态对象存在
- [x] 3.2.2 验证按键合法性（标准键码）
- [x] 3.2.3 验证按键数量合理性
- [x] 3.2.4 验证按键组合合法性
- [x] 3.2.5 添加验证统计

#### 3.3 实现游戏手柄状态验证
- [x] 3.3.1 验证游戏手柄状态对象存在
- [x] 3.3.2 验证按钮状态合法性（true/false）
- [x] 3.3.3 验证摇杆轴值范围（[-1.0, 1.0]）
- [x] 3.3.4 验证扳机值范围（[0.0, 1.0]）
- [x] 3.3.5 验证缺失字段处理

#### 3.4 实现序列号单调性验证
- [x] 3.4.1 提取序列号（frameId）
- [x] 3.4.2 验证序列号是数字类型
- [x] 3.4.3 验证序列号单调递增
- [x] 3.4.4 处理重传和重新连接场景
- [x] 3.4.5 记录序列号异常

#### 3.5 集成验证器到消息处理流程
- [x] 3.5.1 在状态存储前调用验证器
- [x] 3.5.2 验证失败时返回错误 ACK
- [x] 3.5.3 记录验证失败原因
- [x] 3.5.4 触发安全清零（可选）
- [x] 3.5.5 添加验证统计

---

### 4. WebSocket 协议完整实现

#### 4.1 实现状态消息处理器
- [x] 4.1.1 创建 src/ws/handlers/state.ts
- [x] 4.1.2 实现 handleState 方法
- [x] 4.1.3 转换 StateMessage 为 InputState
- [x] 4.1.4 调用 StateStore 存储
- [x] 4.1.5 发送 ACK 消息

#### 4.2 实现输入事件处理器
- [ ] 4.2.1 创建 src/ws/handlers/inputEvent.ts
- [ ] 4.2.2 实现 handleInputEvent 方法
- [ ] 4.2.3 调用执行器管理器应用事件
- [ ] 4.2.4 记录详细日志
- [ ] 4.2.5 添加错误处理

#### 4.3 实现延迟探测机制
- [x] 4.3.1 创建 src/ws/handlers/latencyProbe.ts
- [x] 4.3.2 实现 handleLatencyProbe 方法
- [x] 4.3.3 记录客户端时间戳
- [x] 4.3.4 返回服务端时间戳
- [x] 4.3.5 计算 RTT

#### 4.4 实现 ACK 机制
- [x] 4.4.1 定义 ACK 消息格式
- [x] 4.4.2 在状态接收成功后发送 ACK
- [x] 4.4.3 在状态验证失败后发送错误 ACK
- [x] 4.4.4 记录 ACK 状态和时间戳
- [x] 4.4.5 添加 ACK 统计

#### 4.5 完善 RTT 计算
- [x] 4.5.1 记录每次 RTT 测量
- [x] 4.5.2 计算 RTT 统计（平均、最小、最大）
- [x] 4.5.3 实现延迟监控 API
- [x] 4.5.4 添加延迟告警机制
- [x] 4.5.5 添加 RTT 统计

---

## 🟡 P1 - 重要功能缺失（近期实现）

### 5. ApplyScheduler 时间权威明确

#### 5.1 定义 ApplyScheduler 为唯一时间权威
- [ ] 5.1.1 在文档中明确说明
- [ ] 5.1.2 在代码注释中说明
- [ ] 5.1.3 在架构图中标注

#### 5.2 重构安全控制器超时检查
- [ ] 5.2.1 修改 checkTimeout 使用 tickTime
- [ ] 5.2.2 修改 recordValidState 使用 tickTime
- [ ] 5.2.3 确保时间一致性

#### 5.3 添加时间戳记录
- [ ] 5.3.1 记录每次状态应用的时间戳
- [ ] 5.3.2 记录每次状态接收的时间戳
- [ ] 5.3.3 记录每次清零的时间戳
- [ ] 5.3.4 添加时间差统计

---

### 6. 心跳与延迟探测完整实现 ✅ 已完成（2026-02-20 更新）

#### 6.1 实现客户端心跳 ✅ 已完成
- [x] 6.1.1 创建 src/input/heartbeat.ts
- [x] 6.1.2 实现心跳定时器（默认 30s）
- [x] 6.1.3 实现心跳消息发送
- [x] 6.1.4 处理心跳超时
- [x] 6.1.5 实现心跳统计（getStats() 方法）
- [x] 6.1.6 实现 RTT 计算（getRTT() 方法）

#### 6.2 实现服务端心跳处理 ✅ 已完成
- [x] 6.2.1 实现 handlePing 方法
- [x] 6.2.2 实现 handlePong 方法
- [x] 6.2.3 实现心跳超时检测
- [x] 6.2.4 心跳超时触发清零
- [x] 6.2.5 添加连续超时计数和告警

#### 6.3 完善 RTT 统计 ✅ 已完成
- [x] 6.3.1 定义 RTT 统计结构
- [x] 6.3.2 实现 RTT 累积
- [x] 6.3.3 实现 RTT 计算（平均、最小、最大、P95）
- [x] 6.3.4 添加 RTT 监控 API（getLatencyMonitor()）
- [x] 6.3.5 添加延迟告警机制（100ms 阈值）

---

### 7. 模块边界重构

#### 7.1 拆分执行器管理器
- [ ] 7.1.1 创建 src/input/adapters/ 目录
- [ ] 7.1.2 创建 KeyboardAdapter.ts
- [ ] 7.1.3 创建 GamepadXInputAdapter.ts
- [ ] 7.1.4 创建 MouseAdapter.ts（如果需要）
- [ ] 7.1.5 删除 executor.ts 中的适配器逻辑

#### 7.2 定义适配器接口
- [ ] 7.2.1 定义 InputAdapter 基类接口
- [ ] 7.2.2 定义 KeyboardAdapter 接口
- [ ] 7.2.3 定义 GamepadAdapter 接口
- [ ] 7.2.4 定义 MouseAdapter 接口

#### 7.3 重构 SafetyController
- [ ] 7.3.1 确保只允许 SafetyController 触发清零
- [ ] 7.3.2 移除其他模块的清零逻辑
- [ ] 7.3.3 添加清零权限检查
- [ ] 7.3.4 添加清零原因记录

#### 7.4 明确模块职责
- [ ] 7.4.1 在注释中明确每个模块的职责
- [ ] 7.4.2 添加模块边界说明
- [ ] 7.4.3 添加模块依赖关系图
- [ ] 7.4.4 添加模块交互时序图

---

## 🟢 P2 - 优化与增强（后续实现）

### 8. WebSocket 协议增强

#### 8.1 实现配置管理
- [ ] 8.1.1 定义配置接口
- [ ] 8.1.2 实现配置加载（从 config.json）
- [ ] 8.1.3 实现配置验证
- [ ] 8.1.4 实现配置热更新

#### 8.2 实现配置处理器
- [ ] 8.2.1 创建 src/ws/handlers/config.ts
- [ ] 8.2.2 实现 config_get 处理器
- [ ] 8.2.3 实现 config_set 处理器
- [ ] 8.2.4 实现 config_ack 处理器
- [ ] 8.2.5 实现 config_error 处理器

#### 8.3 实现调试消息
- [ ] 8.3.1 定义调试消息格式
- [ ] 8.3.2 实现日志级别控制（DEBUG, INFO, WARN, ERROR）
- [ ] 8.3.3 实现日志过滤
- [ ] 8.3.4 实现日志导出

---

### 9. 可观测性指标完善

#### 9.1 创建 Metrics 模块
- [ ] 9.1.1 创建 src/input/metrics.ts
- [ ] 9.1.2 定义指标接口
- [ ] 9.1.3 实现指标收集逻辑

#### 9.2 实现连接状态监控
- [ ] 9.2.1 记录连接状态（connected/disconnected）
- [ ] 9.2.2 记录连接时间
- [ ] 9.2.3 记录断开原因
- [ ] 9.2.4 记录重连次数

#### 9.3 实现输入统计
- [ ] 9.3.1 记录键盘事件数量
- [ ] 9.3.2 记录游戏手柄事件数量
- [ ] 9.3.3 记录鼠标事件数量
- [ ] 9.3.4 记录输入频率

#### 9.4 实现系统资源监控
- [ ] 9.4.1 记录 CPU 使用率
- [ ] 9.4.2 记录内存使用量
- [ ] 9.4.3 记录网络延迟
- [ ] 9.4.4 记录应用延迟

---

### 10. 集成测试完善

#### ✅ 已完成（2026-02-19 更新）

- [x] 10.1.1 WebSocket 消息处理测试（websocket-messages.test.ts，18 个测试）
- [x] 10.1.2 端到端流程测试（e2e-integration.test.ts，16 个测试）
- [x] 10.2.1 输入验证器测试（validator.test.ts，48 个测试）
- [x] 10.2.2 状态存储测试（stateStore.test.ts，24 个测试）
- [x] 10.2.3 安全控制器测试（safetyController.test.ts，28 个测试）
- [x] 10.2.4 应用调度器测试（applyScheduler.test.ts，18 个测试）
- [x] 10.2.5 心跳模块测试（heartbeat.test.ts，24 个测试）
- [x] 10.2.6 输入执行器测试（executors.test.ts，20 个测试）

#### 10.1 Xbox 通道测试（待实现）
- [ ] 10.1.1 测试所有 14 个按钮
- [ ] 10.1.2 测试所有 4 个摇杆轴
- [ ] 10.1.3 测试所有 2 个扳机
- [ ] 10.1.4 测试完整状态提交

#### 10.2 清零机制测试（部分完成）
- [x] 10.2.1 测试超时清零（safetyController.test.ts）
- [x] 10.2.2 测试断开清零（safetyController.test.ts）
- [x] 10.2.3 测试状态校验失败清零（validator.test.ts）
- [x] 10.2.4 测试显式清零（safetyController.test.ts）

#### 10.3 异常场景测试（部分完成）
- [x] 10.3.1 测试序列号倒退（stateStore.test.ts, validator.test.ts）
- [x] 10.3.2 测试非法状态（validator.test.ts）
- [ ] 10.3.3 测试网络中断（待实现）
- [ ] 10.3.4 测试应用崩溃（待实现）

#### 10.4 性能测试（部分完成）
- [x] 10.4.1 测试 125Hz 应用频率（applyScheduler.test.ts, e2e-integration.test.ts）
- [x] 10.4.2 测试延迟（RTT）（heartbeat.test.ts, websocket-messages.test.ts）
- [x] 10.4.3 测试吞吐量（e2e-integration.test.ts）
- [ ] 10.4.4 测试资源占用（待实现）

---

## 📚 架构设计说明

### 远程输入代理架构（Remote Input Proxy Architecture）

**服务端定位**：独立的远程输入代理（Remote Input Proxy），不内嵌于任何具体应用，而是作为通用系统级服务运行。

**核心职责**：
1. 接收来自客户端的网络输入事件
2. 将其转化为本地操作系统原生输入事件（Windows 的 SendInput 或 Linux 的 uinput/evdev）
3. 注入到宿主 OS 的输入子系统中

**架构特点**：
- 面对整个桌面环境（多个窗口、多个进程竞争输入焦点）
- 没有"应用逻辑帧"的概念
- 输入注入由网络事件驱动（即时），而非固定频率批量处理

### 输入注入策略：事件驱动 + 节流（Throttling）

#### ❌ 为什么「固定帧率」不合适？

1. **宿主 OS 没有统一帧率**
   - 桌面环境是事件驱动的
   - 浏览器、记事本、游戏、终端各自有自己的事件循环
   - 无法定义"全局逻辑帧"来对齐所有应用

2. **延迟敏感性极高**
   - 用户打字、移动鼠标时，强制等到下一帧（如 16ms）才注入会明显感知卡顿
   - 远程桌面/远程控制的核心体验指标就是「输入延迟」

3. **输入事件天然稀疏且突发**
   - 键盘输入是离散的（按一下是一次事件）
   - 鼠标移动虽连续但通常由硬件以固定频率上报（125Hz/1000Hz）
   - 不需要"每帧都注入"，而是在事件到达时尽快注入

#### ⚠️ 为什么「纯即时注入」也有风险？

| 风险 | 说明 |
|------|------|
| 注入风暴（Injection Storm） | 网络抖动或客户端 bug 可能瞬间发送数千个事件，导致 SendInput 调用过于频繁，被 OS 限流或丢弃 |
| 事件顺序错乱 | 若多线程处理网络包，可能先收到"松开 A"再收到"按下 A"，导致状态错误 |
| 资源耗尽 | 高频系统调用消耗 CPU，影响宿主系统性能 |

#### ✅ 推荐方案：事件驱动 + 节流 + 状态同步

```
[客户端]
   ↓ (网络事件：keyDown('A'), mouseMove(Δx=5))
[服务端网络接收线程]
   ↓ (放入 MPSC 队列)
[输入处理线程]
   ├─ 维护当前键盘/鼠标状态机（keyState[A]=true）
   ├─ 对每个事件：
   │   • 检查是否与当前状态重复（防重放）
   │   • 合并连续鼠标移动（可选）
   └─ 调用 OS 注入 API（SendInput/uinput_write）
       └─ 但施加「最小间隔限制」（如≥1ms/event）→ 防止注入风暴
```

**关键策略**：

1. **事件驱动为主**
   - 收到有效输入事件 → 尽快注入（目标延迟<5ms）

2. **轻量节流（Throttling）**
   - 对相同类型事件（如鼠标移动）可做微合并（例如 2ms 内的Δx 合并为一次移动）
   - 对系统调用频率设上限（如最多 1000 次/秒），避免触发 OS 保护机制

3. **维护本地状态机（必须！）**
   - 记录哪些键当前处于按下状态
   - 记录鼠标当前位置（用于相对/绝对模式转换）
   - 即使网络丢包，也能在收到"松开"事件时正确释放

4. **定期状态校验（可选但推荐）**
   - 每 1~2 秒发送一次完整状态快照（如"当前按下的键列表"）
   - 用于纠正长期漂移（如客户端崩溃未发"keyup"）

#### 实际案例参考

| 项目 | 策略 |
|------|------|
| Windows RDP / Parsec / Moonlight | 事件驱动 + 鼠标移动压缩 + 键盘状态跟踪 |
| Synergy/Barrier（跨屏共享） | 即时注入，但对高频鼠标事件做采样 |
| Linux evrouter/inputpipe | 直接转发 evdev 事件，无帧概念 |

**共同点**：没有固定帧率，但有智能节流和状态管理。

### 总结

对于独立远程输入服务端：
- ❌ 不要用"固定刷新率"注入（因为没有全局帧）
- ✅ 采用事件驱动注入
- ✅ 必须配合：
  - 本地输入状态机（防状态错乱）
  - 轻量节流/合并（防注入风暴）
  - （可选）低频状态快照（防长期漂移）

这样既能保证最低输入延迟，又能维持系统稳定性与状态一致性，符合远程控制场景的核心需求。

---

## 🔵 长期任务

### 源代码注释英文化
- [ ] 将 Server/src/ 目录下 44 个 TypeScript 文件的中文注释替换为英文
- 详见：`TASKS_CURRENT.md`（执行期间记录）

---

## ✅ 架构重构任务完成总结（2026-02-19）

### 重构目标
解决路由逻辑分散、状态分裂、平台耦合问题，为跨平台支持奠定基础。

### 重构阶段

| 阶段 | 名称 | 状态 | 文件数 | 代码行数 | 完成时间 |
|------|------|------|--------|----------|----------|
| 阶段 1 | 地基搭建 | ✅ 完成 | 7 | 1,316 | 2026-02-19 14:45 |
| 阶段 2 | 影子模式 | ✅ 完成 | 6 | 1,135 | 2026-02-19 21:00 |
| 阶段 3 | 流量切换 | ✅ 完成 | 1 | 359 | 2026-02-19 22:00 |
| 阶段 4 | 生态扩展（空类） | ✅ 完成 | 4 | 811 | 2026-02-19 22:30 |

### 设计模式应用

| 模式 | 应用场景 | 价值 |
|------|----------|------|
| **策略模式** | InputHost 抽象 + 具体实现 | 隔离平台差异，易于扩展 |
| **门面模式** | InputRouter 统一接口 | 简化调用方，隐藏复杂性 |
| **装饰器模式** | ShadowModeExecutor | 透明添加影子模式功能 |
| **适配器模式** | RouterOnlyExecutor | 将 Router 适配为 ExecutorManager 接口 |

### 三种运行模式

```bash
# 普通模式（默认）- 使用旧 Executor
# 无环境变量

# 影子模式 - 双写验证
SHADOW_MODE=true

# Router-only 模式 - 直接使用 Router
ROUTER_ONLY=true
```

### 待制作任务（低优先级）

- [ ] 实现 LinuxKeyboardHost（uinput）
- [ ] 实现 LinuxGamepadHost（uinput）
- [ ] 实现 MacOSKeyboardHost（Quartz）
- [ ] 实现 MacOSGamepadHost（GCController）

---

## 🔴 P0 - 构建与部署（必须完成）

### 5. 服务端构建配置

#### 5.1 Node.js 环境配置
- [ ] 5.1.1 安装 Node.js 20+ LTS 版本
- [ ] 5.1.2 安装 pnpm 包管理器（`npm install -g pnpm`）
- [ ] 5.1.3 配置 .nvmrc 文件指定 Node 版本
- [ ] 5.1.4 创建 .tool-versions 文件（ASDF 支持）

#### 5.2 TypeScript 编译配置
- [ ] 5.2.1 验证 tsconfig.json 配置正确
- [ ] 5.2.2 配置生产环境编译选项（noEmit: false, sourceMap: false）
- [ ] 5.2.3 添加编译脚本 `npm run build`
- [ ] 5.2.4 添加类型检查脚本 `npm run type-check`

#### 5.3 依赖管理
- [ ] 5.3.1 运行 `pnpm install` 安装所有依赖
- [ ] 5.3.2 验证 pnpm-lock.yaml 已提交
- [ ] 5.3.3 清理未使用的依赖（`pnpm prune`）
- [ ] 5.3.4 添加依赖审计脚本 `npm run audit`

#### 5.4 生产环境配置
- [ ] 5.4.1 创建 .env.example 模板文件
- [ ] 5.4.2 配置环境变量验证逻辑
- [ ] 5.4.3 添加进程管理配置（PM2 或 systemd）
- [ ] 5.4.4 创建 Dockerfile（可选）

#### 5.5 构建验证
- [ ] 5.5.1 运行完整编译 `pnpm run build`
- [ ] 5.5.2 验证输出目录结构正确
- [ ] 5.5.3 运行生产环境测试
- [ ] 5.5.4 添加 CI/CD 构建脚本

### 6. 安卓客户端构建配置

#### 6.1 ARM64 Android SDK 环境配置
- [ ] 6.1.1 安装 JetBrains Runtime (JBR) linux-aarch64 版本
- [ ] 6.1.2 配置 JAVA_HOME 环境变量
- [ ] 6.1.3 下载 Android SDK Command Line Tools (linux-aarch64)
- [ ] 6.1.4 配置 ANDROID_HOME 环境变量
- [ ] 6.1.5 配置 PATH 包含 sdkmanager 和 platform-tools

#### 6.2 SDK 组件安装
- [ ] 6.2.1 接受 SDK 许可证 `sdkmanager --licenses`
- [ ] 6.2.2 安装 platform-tools (adb, fastboot)
- [ ] 6.2.3 安装 Android 平台 (android-34 或更高)
- [ ] 6.2.4 安装 Build Tools (34.0.0 或更高)
- [ ] 6.2.5 安装 NDK（如需 native 编译）

#### 6.3 安卓客户端项目配置
- [ ] 6.3.1 验证 Android/client/ 目录结构
- [ ] 6.3.2 配置 gradle.properties（SDK 路径、JVM 参数）
- [ ] 6.3.3 配置 local.properties（sdk.dir 路径）
- [ ] 6.3.4 验证 build.gradle.kts 配置正确

#### 6.4 构建脚本配置
- [ ] 6.4.1 创建 gradlew 包装器脚本
- [ ] 6.4.2 添加 debug 构建任务 `./gradlew assembleDebug`
- [ ] 6.4.3 添加 release 构建任务 `./gradlew assembleRelease`
- [ ] 6.4.4 配置签名密钥（release 构建）

#### 6.5 ARM64 架构优化
- [ ] 6.5.1 配置 ABI 过滤器（仅 arm64-v8a）
- [ ] 6.5.2 优化 JVM 参数 for ARM64
- [ ] 6.5.3 配置 Gradle Daemon 内存限制
- [ ] 6.5.4 添加 ARM64 特定构建参数

#### 6.6 构建验证
- [ ] 6.6.1 运行 clean 构建 `./gradlew clean`
- [ ] 6.6.2 运行 debug 构建 `./gradlew assembleDebug`
- [ ] 6.6.3 验证 APK 输出路径正确
- [ ] 6.6.4 添加构建时间统计

---

## 🟡 P1 - ARM64 Android SDK 配置指南

### 7. ARM64 架构 Android SDK 完整配置

#### 7.1 背景与可行性分析
- [x] 7.1.1 调研 ARM64 架构支持情况
- [x] 7.1.2 验证官方命令行工具支持
- [x] 7.1.3 确认主流生产环境方案成熟度

**核心结论**：
- ✅ Android SDK 完全支持 arm64 架构（linux-aarch64 / darwin-aarch64）
- ✅ 无需 x86 转译（Rosetta 2 / QEMU），原生性能
- ✅ Apple Silicon (M1/M2/M3) 和 ARM Linux 服务器均为成熟生产环境

#### 7.2 第一步：安装 JDK (关键)

**推荐**：使用 JetBrains Runtime (JBR) linux-aarch64 版本（Android Studio 依赖）

```bash
# 下载 JBR 21.0.8 linux-aarch64
wget https://cache-redirector.jetbrains.com/intellij-jbr/jbr_jcef-21.0.8-linux-aarch64-b1163.59.tar.gz

# 解压
tar -zxvf jbr_jcef-21.0.8-linux-aarch64-b1163.59.tar.gz

# 移动到合适位置
sudo mv jbr_jcef-21.0.8-linux-aarch64-b1163.59 /opt/jbr

# 配置环境变量（添加到 ~/.bashrc 或 ~/.zshrc）
export JAVA_HOME=/opt/jbr
export PATH=$JAVA_HOME/bin:$PATH

# 验证
java -version
```

#### 7.3 第二步：下载 Command Line Tools

```bash
# 创建 Android SDK 目录（不要放在 / 或 /root 下）
mkdir -p $HOME/Android/Sdk/cmdline-tools

# 下载 Command Line Tools（选择 Linux 版本）
# 访问：https://developer.android.com/studio#command-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip

# 解压到 cmdline-tools/latest 目录（重要！目录结构必须如此）
unzip commandlinetools-linux-11076708_latest.zip
mv cmdline-tools $HOME/Android/Sdk/cmdline-tools/latest

# 配置环境变量（添加到 ~/.bashrc 或 ~/.zshrc）
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
```

#### 7.4 第三步：安装 SDK 组件

```bash
# 接受许可证
sdkmanager --licenses

# 安装核心组件
sdkmanager "platform-tools"
sdkmanager "platforms;android-34"
sdkmanager "build-tools;34.0.0"

# 可选：安装 NDK（如需 native 编译）
sdkmanager "ndk;26.1.10909125"

# 可选：安装 ARM64 系统镜像（用于模拟器）
sdkmanager "system-images;android-34;google_apis;arm64-v8a"
```

#### 7.5 第四步：验证安装

```bash
# 验证 adb
adb --version

# 验证 sdkmanager
sdkmanager --version

# 列出已安装的包
sdkmanager --list_installed
```

#### 7.6 第五步：常见坑点处理

**坑点 1：SDK 路径权限问题**
```
错误：The android sdk location cannot be at the filesystem root
解决：将 SDK 放在用户目录下，如 $HOME/Android/Sdk
```

**坑点 2：模拟器 GPU 加速（ARM Linux）**
```bash
# 使用 SwiftShader 软件渲染启动模拟器
emulator -avd <your_avd_name> -gpu swiftshader_indirect -no-snapshot
```

**坑点 3：NDK 交叉编译配置**
```bash
# ARM64 主机上编译 ARM64 目标（原生编译，速度快）
export NDK_HOME=$ANDROID_HOME/ndk/26.1.10909125
export PATH=$PATH:$NDK_HOME/toolchains/llvm/prebuilt/linux-aarch64/bin
```

#### 7.7 性能优势

| 优势 | 说明 |
|------|------|
| **架构一致性** | 宿主 (arm64) + 模拟器 (arm64) 无需指令集翻译 |
| **能效比** | ARM 服务器功耗远低于 x86，适合 24 小时 CI/CD |
| **真机调试** | USB 直连 arm64 真机，链路最短 |
| **原生编译** | NDK 编译 arm64 代码无需交叉编译 |

#### 7.8 限制与注意事项

| 限制 | 影响 | 解决方案 |
|------|------|----------|
| 第三方插件兼容性 | 部分插件可能失效 | 使用主流插件（Gradle/Kotlin 已支持） |
| x86 镜像无法运行 | 只能运行 arm64-v8a 镜像 | 99% 真机都是 arm64，影响很小 |
| 旧版工具链 | 老版本可能只有 x86 | 使用最新版 Command Line Tools |

---

## 🟢 P2 - 文档与优化

### 8. 构建文档完善
- [ ] 8.1 创建 BUILDING.md 构建指南
- [ ] 8.2 创建 ANDROID_SDK_ARM64_SETUP.md ARM64 配置指南
- [ ] 8.3 更新 README.md 添加构建章节
- [ ] 8.4 创建 CI/CD 配置文档

### 待制作任务（低优先级）

- [ ] 实现 LinuxKeyboardHost（uinput）
- [ ] 实现 LinuxGamepadHost（uinput）
- [ ] 实现 MacOSKeyboardHost（Quartz）
- [ ] 实现 MacOSGamepadHost（GCController）

---

## 🔵 长期任务

### 源代码注释英文化
- [ ] 将 Server/src/ 目录下 44 个 TypeScript 文件的中文注释替换为英文
- 详见：`TASKS_CURRENT.md`（执行期间记录）

---

## ✅ 架构重构任务完成总结（2026-02-19）

### 重构目标
解决路由逻辑分散、状态分裂、平台耦合问题，为跨平台支持奠定基础。

### 重构阶段

| 阶段 | 名称 | 状态 | 文件数 | 代码行数 | 完成时间 |
|------|------|------|--------|----------|----------|
| 阶段 1 | 地基搭建 | ✅ 完成 | 7 | 1,316 | 2026-02-19 14:45 |
| 阶段 2 | 影子模式 | ✅ 完成 | 6 | 1,135 | 2026-02-19 21:00 |
| 阶段 3 | 流量切换 | ✅ 完成 | 1 | 359 | 2026-02-19 22:00 |
| 阶段 4 | 生态扩展（空类） | ✅ 完成 | 4 | 811 | 2026-02-19 22:30 |

### 设计模式应用

| 模式 | 应用场景 | 价值 |
|------|----------|------|
| **策略模式** | InputHost 抽象 + 具体实现 | 隔离平台差异，易于扩展 |
| **门面模式** | InputRouter 统一接口 | 简化调用方，隐藏复杂性 |
| **装饰器模式** | ShadowModeExecutor | 透明添加影子模式功能 |
| **适配器模式** | RouterOnlyExecutor | 将 Router 适配为 ExecutorManager 接口 |

### 三种运行模式

```bash
# 普通模式（默认）- 使用旧 Executor
# 无环境变量

# 影子模式 - 双写验证
SHADOW_MODE=true

# Router-only 模式 - 直接使用 Router
ROUTER_ONLY=true
```

### 待制作任务（低优先级）

- [ ] 实现 LinuxKeyboardHost（uinput）
- [ ] 实现 LinuxGamepadHost（uinput）
- [ ] 实现 MacOSKeyboardHost（Quartz）
- [ ] 实现 MacOSGamepadHost（GCController）

### 相关文档

- [TASKS_CURRENT.md](TASKS_CURRENT.md) - 当前任务执行记录
- [CHANGELOG.md](CHANGELOG.md) - 架构重构变更日志

---

## 📚 相关文档

- [README.md](README.md) - 项目概述和快速开始
- [需求文档](doc/requirements.md) - 功能需求说明
- [执行端技术设计 v1.3](doc/TechDesign/Server/ProjectStructure.md) - 技术设计文档
- [主逻辑设计 v1.1](doc/TechDesign/Server