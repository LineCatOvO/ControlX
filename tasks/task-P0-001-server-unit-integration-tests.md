# Task-P0-001: ControlX Server 单元测试和集成测试规划

**创建时间**：2026-03-18
**优先级**：P0
**状态**：待处理
**任务锁**：🔓 待处理 - Planner - 2026-03-18
**项目**：ControlX

---

## 一、服务端项目分析结果

### 1.1 技术栈

| 技术 | 版本/说明 |
|------|----------|
| **语言** | TypeScript 5.9.3 |
| **运行时** | Node.js v24.13.1 |
| **Web框架** | Express 5.2.1 |
| **WebSocket** | ws 8.19.0 |
| **测试框架** | Jest 29.7.0 + ts-jest 29.1.5 |
| **构建工具** | TypeScript Compiler (tsc) |
| **包管理** | pnpm 10.30.2 |

### 1.2 项目目录结构

```
Server/
├── src/                          # 源代码
│   ├── app.ts                    # 入口文件
│   ├── config/                   # 配置模块 (4个文件)
│   │   ├── config.ts
│   │   ├── configManager.ts
│   │   ├── loadConfig.ts
│   │   └── validate.ts
│   ├── health/                   # 健康检查 (1个文件)
│   ├── heartbeat/                # 心跳模块 (1个文件)
│   ├── input/                    # 输入处理核心 (23个文件)
│   │   ├── adapters/             # 输入适配器 (7个文件)
│   │   ├── hosts/                # 平台相关主机 (8个文件)
│   │   ├── router/               # 输入路由 (2个文件)
│   │   ├── shadow/               # 影子模式 (2个文件)
│   │   ├── executor.ts           # 执行器管理
│   │   ├── validator.ts          # 输入验证器
│   │   ├── stateStore.ts         # 状态存储
│   │   ├── safetyController.ts   # 安全控制器
│   │   ├── applyScheduler.ts     # 应用调度器
│   │   └── ...                   # 其他核心模块
│   ├── types/                    # 类型定义 (2个文件)
│   ├── utils/                    # 工具函数 (5个文件)
│   ├── web/                      # Web监控服务器
│   └── ws/                       # WebSocket服务器
│       ├── handlers/             # 消息处理器 (10个文件)
│       ├── server.ts
│       ├── connection.ts
│       ├── router.ts
│       └── messageTypes.ts
├── tests/                        # 测试目录
│   ├── cases/                    # 测试用例 (24个文件)
│   ├── common/                   # 测试工具 (5个文件)
│   └── runner/                   # 测试运行器
├── jest.config.js                # Jest配置
├── tsconfig.json                 # TypeScript配置
└── package.json                  # 项目配置
```

### 1.3 现有测试状态

| 指标 | 数量 | 百分比 |
|------|------|--------|
| 测试套件 | 10 | 100% 通过 |
| 总测试数 | 221 | - |
| 通过测试 | 214 | 96.8% |
| 跳过测试 | 7 | 3.2% |
| 失败测试 | 0 | 0% |

### 1.4 现有覆盖率

| 类型 | 覆盖率 |
|------|--------|
| 语句覆盖率 | 65.39% |
| 分支覆盖率 | 52.38% |
| 函数覆盖率 | 62.63% |
| 行覆盖率 | 66.66% |

### 1.5 模块覆盖率详情

| 模块 | 语句 | 分支 | 函数 | 行 | 状态 |
|------|------|------|------|-----|------|
| config/ | 100% | 100% | 100% | 100% | ✅ 完美 |
| input/validator.ts | 92.68% | 88.33% | 100% | 92.68% | ✅ 优秀 |
| input/stateStore.ts | 88.05% | 71.87% | 100% | 89.39% | ✅ 优秀 |
| input/safetyController.ts | 98.11% | 90% | 100% | 98.11% | ✅ 优秀 |
| input/heartbeat.ts | 98.07% | 88.88% | 100% | 98.07% | ✅ 优秀 |
| input/keyboard.ts | 54.54% | 42.1% | 53.33% | 56.25% | 🟡 良好 |
| input/gamepad.ts | 45.45% | 27.27% | 30% | 45.45% | 🟡 待改进 |
| input/adapters/ | 26% | 8.77% | 50% | 29.32% | 🟡 待改进 |
| input/hosts/ | 9.03% | 4.08% | 3.22% | 9.43% | 🔴 低 |
| input/router/ | 3.17% | 0% | 0% | 3.17% | 🔴 低 |
| input/shadow/ | 1.02% | 0% | 0% | 1.02% | 🔴 低 |
| ws/ | 67.44% | 52.63% | 82.35% | 67.44% | 🟢 良好 |
| ws/handlers/ | 14.83% | 1.44% | 3.33% | 14.56% | 🔴 低 |

---

## 二、测试框架选择及理由

### 2.1 现有测试框架（继续使用）

| 框架 | 版本 | 选择理由 |
|------|------|----------|
| **Jest** | 29.7.0 | 业界标准，功能全面，内置断言、Mock、覆盖率 |
| **ts-jest** | 29.1.5 | TypeScript支持，与Jest无缝集成 |

### 2.2 测试类型规划

| 测试类型 | 框架/工具 | 用途 |
|----------|----------|------|
| **单元测试** | Jest | 测试独立函数和类的行为 |
| **集成测试** | Jest + Mock WebSocket | 测试模块间交互 |
| **E2E测试** | Jest + WsClient | 测试完整流程 |

### 2.3 测试工具类（已存在）

| 工具类 | 路径 | 用途 |
|--------|------|------|
| TestUtils | tests/common/testUtils.ts | 创建测试状态 |
| WsClient | tests/common/wsClient.ts | WebSocket客户端 |
| assert | tests/common/assert.ts | 断言工具 |
| time | tests/common/time.ts | 时间工具 |
| vigemDetector | tests/common/vigemDetector.ts | ViGEm检测 |

---

## 三、详细执行计划

### 阶段一：修复现有测试问题（P0）

#### 任务1.1：修复 keyboard.test.ts 测试

**任务ID**：task-server-1-1
**操作类型**：文件编辑
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/keyboard.test.ts
**预计执行时间**：约30分钟

**任务背景**：
keyboard.test.ts 存在 mock 配置问题，导致部分测试失败。需要修复 node-key-sender 的 mock 配置。

**操作内容**：
1. 读取现有测试文件，分析失败原因
2. 修复 mock 配置，确保与实际实现匹配
3. 添加缺失的测试用例

**验收标准**：
- [ ] 所有测试通过
- [ ] 覆盖率提升至 >80%

---

#### 任务1.2：修复 heartbeat.test.ts 测试

**任务ID**：task-server-1-2
**操作类型**：文件编辑
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/heartbeat.test.ts
**预计执行时间**：约20分钟

**任务背景**：
heartbeat.test.ts 有4个测试失败，原因是定时器模拟与实际回调触发时机不匹配。

**操作内容**：
1. 分析失败的测试用例
2. 调整测试超时时间或改进回调触发逻辑
3. 使用 Jest 的 fake timers 正确模拟定时器

**验收标准**：
- [ ] 所有24个测试通过
- [ ] 覆盖率保持 >95%

---

### 阶段二：提高核心模块覆盖率（P1）

#### 任务2.1：添加 GamepadExecutor 单元测试

**任务ID**：task-server-2-1
**操作类型**：文件创建
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/gamepadExecutor.test.ts
**预计执行时间**：约45分钟

**任务背景**：
GamepadExecutor 当前覆盖率仅 45.45%，需要添加更多测试用例覆盖所有 Xbox 通道。

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| 轴测试 | 10 | LX, LY, RX, RY 正负方向和边界值 |
| 扳机测试 | 6 | LT, RT 各种压力值 |
| 按钮测试 | 15 | A/B/X/Y/LB/RB/Start/Back/L3/R3/DPad |
| 状态转换 | 8 | 按下/释放序列 |
| 边界条件 | 6 | 越界值 clamp、空状态处理 |
| **总计** | **45** | - |

**验收标准**：
- [ ] 覆盖率提升至 >80%
- [ ] 所有 Xbox 通道测试覆盖

---

#### 任务2.2：添加 KeyboardExecutor 扩展测试

**任务ID**：task-server-2-2
**操作类型**：文件编辑
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/keyboard.test.ts
**预计执行时间**：约30分钟

**任务背景**：
KeyboardExecutor 当前覆盖率 54.54%，需要添加边界条件和异常处理测试。

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| 幂等性测试 | 5 | 重复状态不重复输出 |
| 边界条件 | 8 | 空状态、大量按键、特殊键 |
| 状态转换 | 6 | 按键序列、组合键 |
| 错误处理 | 4 | 无效按键、异常恢复 |
| **新增总计** | **23** | - |

**验收标准**：
- [ ] 覆盖率提升至 >80%

---

#### 任务2.3：添加 MouseExecutor 单元测试

**任务ID**：task-server-2-3
**操作类型**：文件创建
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/mouseExecutor.test.ts
**预计执行时间**：约30分钟

**任务背景**：
MouseExecutor 缺少专门的测试文件，需要创建完整的单元测试。

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| 移动测试 | 6 | 坐标移动、相对移动 |
| 点击测试 | 6 | 左/右/中键点击 |
| 滚轮测试 | 4 | 滚轮滚动 |
| 组合操作 | 4 | 拖拽、点击+移动 |
| 边界条件 | 4 | 坐标边界、空状态 |
| **总计** | **24** | - |

**验收标准**：
- [ ] 新测试文件创建完成
- [ ] 覆盖率 >80%

---

### 阶段三：添加 WebSocket Handlers 集成测试（P1）

#### 任务3.1：添加 inputDelta Handler 测试

**任务ID**：task-server-3-1
**操作类型**：文件创建
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/inputDeltaHandler.test.ts
**预计执行时间**：约40分钟

**任务背景**：
inputDelta 处理器当前覆盖率约 20%，需要添加完整的集成测试。

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| 增量键盘输入 | 6 | 按键增量更新 |
| 增量鼠标移动 | 5 | 鼠标增量移动 |
| 增量摇杆移动 | 5 | 摇杆增量更新 |
| 增量手柄输入 | 5 | 手柄增量更新 |
| 错误处理 | 4 | 无效增量、空增量 |
| **总计** | **25** | - |

**验收标准**：
- [ ] 覆盖率提升至 >60%

---

#### 任务3.2：添加 config Handler 测试

**任务ID**：task-server-3-2
**操作类型**：文件创建
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/configHandler.test.ts
**预计执行时间**：约30分钟

**任务背景**：
config 处理器缺少测试，需要添加配置相关的集成测试。

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| 配置获取 | 4 | 获取当前配置 |
| 配置更新 | 6 | 更新配置项 |
| 配置验证 | 4 | 无效配置拒绝 |
| 错误处理 | 3 | 配置错误恢复 |
| **总计** | **17** | - |

**验收标准**：
- [ ] 覆盖率 >70%

---

#### 任务3.3：添加 event Handler 测试

**任务ID**：task-server-3-3
**操作类型**：文件创建
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/eventHandler.test.ts
**预计执行时间**：约30分钟

**任务背景**：
event 处理器缺少测试，需要添加事件处理的集成测试。

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| 键盘事件 | 5 | key_down/key_up |
| 鼠标事件 | 5 | mouse_click/mouse_move |
| 手柄事件 | 5 | button_press/axis_move |
| 自定义事件 | 3 | 扩展事件类型 |
| 错误处理 | 4 | 无效事件处理 |
| **总计** | **22** | - |

**验收标准**：
- [ ] 覆盖率 >70%

---

### 阶段四：添加 InputRouter 和 ShadowMode 测试（P2）

#### 任务4.1：添加 InputRouter 单元测试

**任务ID**：task-server-4-1
**操作类型**：文件创建
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/inputRouter.test.ts
**预计执行时间**：约45分钟

**任务背景**：
InputRouter 当前覆盖率仅 3.17%，需要添加完整的单元测试和集成测试。

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| 路由规则 | 8 | 输入路由规则测试 |
| 设备映射 | 6 | 设备到执行器映射 |
| 优先级处理 | 5 | 输入优先级 |
| 状态合并 | 5 | 多输入源合并 |
| 错误处理 | 4 | 路由错误恢复 |
| **总计** | **28** | - |

**验收标准**：
- [ ] 覆盖率提升至 >80%

---

#### 任务4.2：添加 ShadowModeManager 单元测试

**任务ID**：task-server-4-2
**操作类型**：文件创建
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/shadowModeManager.test.ts
**预计执行时间**：约40分钟

**任务背景**：
ShadowModeManager 当前覆盖率仅 1.02%，需要添加 Mock 测试。

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| 模式切换 | 6 | 进入/退出影子模式 |
| 状态同步 | 5 | 影子状态同步 |
| 冲突处理 | 4 | 输入冲突解决 |
| 恢复机制 | 4 | 模式退出恢复 |
| 错误处理 | 3 | 异常处理 |
| **总计** | **22** | - |

**验收标准**：
- [ ] 覆盖率提升至 >70%

---

### 阶段五：添加平台相关模块测试（P2）

#### 任务5.1：添加 InputHosts 测试（Mock模式）

**任务ID**：task-server-5-1
**操作类型**：文件创建
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/hosts/inputHosts.test.ts
**预计执行时间**：约50分钟

**任务背景**：
input/hosts/ 模块当前覆盖率仅 9.03%，这些是平台相关的代码，需要使用 Mock 进行测试。

**测试策略**：
- 使用 Jest Mock 模拟平台 API
- 测试逻辑分支而非实际硬件交互
- 条件跳过无法模拟的测试

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| LinuxGamepadHost | 8 | Linux 手柄主机 Mock 测试 |
| LinuxKeyboardHost | 6 | Linux 键盘主机 Mock 测试 |
| WindowsGamepadHost | 8 | Windows 手柄主机 Mock 测试 |
| WindowsKeyboardHost | 6 | Windows 键盘主机 Mock 测试 |
| MacOSHosts | 6 | macOS 主机 Mock 测试 |
| Host工厂 | 4 | 主机创建工厂测试 |
| **总计** | **38** | - |

**验收标准**：
- [ ] 覆盖率提升至 >50%
- [ ] 所有平台分支测试覆盖

---

### 阶段六：添加 Adapters 测试（P1）

#### 任务6.1：完善 GamepadAdapter 测试

**任务ID**：task-server-6-1
**操作类型**：文件编辑
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/adapters/gamepadAdapter.test.ts
**预计执行时间**：约40分钟

**任务背景**：
GamepadAdapter 当前覆盖率较低，需要添加更多测试用例。

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| 按钮映射 | 10 | 所有按钮映射测试 |
| 轴映射 | 8 | 所有轴映射测试 |
| 扳机映射 | 4 | 扳机映射测试 |
| 状态转换 | 6 | 按钮状态转换 |
| 错误处理 | 4 | 异常处理 |
| **新增总计** | **32** | - |

**验收标准**：
- [ ] 覆盖率提升至 >70%

---

#### 任务6.2：完善 KeyboardAdapter 测试

**任务ID**：task-server-6-2
**操作类型**：文件编辑
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/adapters/keyboardAdapter.test.ts
**预计执行时间**：约30分钟

**任务背景**：
KeyboardAdapter 需要添加更多边界条件测试。

**验收标准**：
- [ ] 覆盖率提升至 >80%

---

#### 任务6.3：完善 MouseAdapter 测试

**任务ID**：task-server-6-3
**操作类型**：文件编辑
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/adapters/mouseAdapter.test.ts
**预计执行时间**：约30分钟

**任务背景**：
MouseAdapter 需要添加更多测试用例。

**验收标准**：
- [ ] 覆盖率提升至 >80%

---

### 阶段七：添加 E2E 测试扩展（P2）

#### 任务7.1：扩展 e2e-integration.test.ts

**任务ID**：task-server-7-1
**操作类型**：文件编辑
**目标文件**：/home/linecat/agent-workspace/projects/ControlX/Server/tests/cases/e2e-integration.test.ts
**预计执行时间**：约45分钟

**任务背景**：
E2E 测试需要添加更多场景覆盖。

**测试用例规划**：

| 测试分类 | 测试用例数 | 说明 |
|----------|------------|------|
| 多客户端竞争 | 4 | 多客户端同时输入 |
| 断线重连 | 4 | 断线后重连恢复 |
| 压力测试 | 3 | 高频输入处理 |
| 安全机制 | 4 | 超时清零、异常清零 |
| 性能基准 | 3 | 延迟、吞吐量测试 |
| **新增总计** | **18** | - |

**验收标准**：
- [ ] 所有 E2E 场景覆盖

---

## 四、需要修改/创建的文件列表

### 4.1 需要修改的文件

| 序号 | 文件路径 | 操作类型 | 说明 |
|------|----------|----------|------|
| 1 | Server/tests/cases/keyboard.test.ts | 编辑 | 修复 mock 配置，添加测试用例 |
| 2 | Server/tests/cases/heartbeat.test.ts | 编辑 | 修复定时器测试 |
| 3 | Server/tests/cases/adapters/gamepadAdapter.test.ts | 编辑 | 添加测试用例 |
| 4 | Server/tests/cases/adapters/keyboardAdapter.test.ts | 编辑 | 添加测试用例 |
| 5 | Server/tests/cases/adapters/mouseAdapter.test.ts | 编辑 | 添加测试用例 |
| 6 | Server/tests/cases/e2e-integration.test.ts | 编辑 | 扩展 E2E 测试 |

### 4.2 需要创建的文件

| 序号 | 文件路径 | 操作类型 | 说明 |
|------|----------|----------|------|
| 1 | Server/tests/cases/gamepadExecutor.test.ts | 创建 | GamepadExecutor 单元测试 |
| 2 | Server/tests/cases/mouseExecutor.test.ts | 创建 | MouseExecutor 单元测试 |
| 3 | Server/tests/cases/inputDeltaHandler.test.ts | 创建 | InputDelta 处理器测试 |
| 4 | Server/tests/cases/configHandler.test.ts | 创建 | Config 处理器测试 |
| 5 | Server/tests/cases/eventHandler.test.ts | 创建 | Event 处理器测试 |
| 6 | Server/tests/cases/inputRouter.test.ts | 创建 | InputRouter 单元测试 |
| 7 | Server/tests/cases/shadowModeManager.test.ts | 创建 | ShadowModeManager 测试 |
| 8 | Server/tests/cases/hosts/inputHosts.test.ts | 创建 | InputHosts Mock 测试 |

---

## 五、验收标准

### 5.1 测试通过率

- [ ] 所有测试通过率 100%
- [ ] 无跳过的测试（除非平台限制）

### 5.2 覆盖率目标

| 模块 | 当前覆盖率 | 目标覆盖率 |
|------|------------|------------|
| 总体 | 65.39% | **>80%** |
| input/validator.ts | 92.68% | >95% |
| input/keyboard.ts | 54.54% | >80% |
| input/gamepad.ts | 45.45% | >80% |
| input/adapters/ | 26% | >70% |
| input/hosts/ | 9.03% | >50% |
| input/router/ | 3.17% | >80% |
| input/shadow/ | 1.02% | >70% |
| ws/handlers/ | 14.83% | >60% |

### 5.3 测试用例数量目标

| 类型 | 当前数量 | 目标数量 |
|------|----------|----------|
| 单元测试 | ~180 | **>300** |
| 集成测试 | ~40 | **>80** |
| E2E测试 | ~16 | **>30** |
| **总计** | ~221 | **>410** |

---

## 六、风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 平台相关代码难以测试 | 高 | 中 | 使用 Mock 模拟平台 API，条件跳过无法模拟的测试 |
| WebSocket 测试不稳定 | 中 | 低 | 增加超时时间，使用 fake timers |
| 测试执行时间过长 | 中 | 中 | 优化测试并行度，分离快速/慢速测试 |
| Mock 配置与实际实现不匹配 | 高 | 中 | 定期验证 Mock 行为与实际实现一致性 |
| 测试覆盖虚假（只覆盖简单路径） | 高 | 中 | 代码审查测试用例，确保覆盖边界条件 |

---

## 七、执行顺序建议

```
阶段一（P0）：修复现有测试问题
    ├── 任务1.1: 修复 keyboard.test.ts
    └── 任务1.2: 修复 heartbeat.test.ts
            ↓
阶段二（P1）：提高核心模块覆盖率
    ├── 任务2.1: 添加 GamepadExecutor 测试
    ├── 任务2.2: 添加 KeyboardExecutor 扩展测试
    └── 任务2.3: 添加 MouseExecutor 测试
            ↓
阶段三（P1）：添加 WebSocket Handlers 集成测试
    ├── 任务3.1: 添加 inputDelta Handler 测试
    ├── 任务3.2: 添加 config Handler 测试
    └── 任务3.3: 添加 event Handler 测试
            ↓
阶段四（P2）：添加 InputRouter 和 ShadowMode 测试
    ├── 任务4.1: 添加 InputRouter 测试
    └── 任务4.2: 添加 ShadowModeManager 测试
            ↓
阶段五（P2）：添加平台相关模块测试
    └── 任务5.1: 添加 InputHosts 测试
            ↓
阶段六（P1）：添加 Adapters 测试
    ├── 任务6.1: 完善 GamepadAdapter 测试
    ├── 任务6.2: 完善 KeyboardAdapter 测试
    └── 任务6.3: 完善 MouseAdapter 测试
            ↓
阶段七（P2）：添加 E2E 测试扩展
    └── 任务7.1: 扩展 e2e-integration.test.ts
```

---

## 八、相关资源

- 项目路径：/home/linecat/agent-workspace/projects/ControlX/Server
- 测试文档：Server/TESTS_DOCUMENTATION.md
- 测试状态报告：Server/TEST_STATUS_REPORT.md
- 技术设计文档：doc/TechDesign/Server/
- 测试流程文档：doc/tests/server/main.md

---

## 九、标签

测试, 单元测试, 集成测试, Jest, TypeScript, 覆盖率, Server