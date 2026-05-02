# ControlX 项目 - 下一步工作计划

**分析日期**: 2026-05-02  
**分析依据**: 项目文档、代码现状、已完成工作

---

## 📊 当前项目状态

### ✅ 已完成工作

#### Android 客户端
- ✅ **架构优化** - 5 个阶段全部完成
  - 核心业务逻辑与 Android API 分离
  - 创建 Input Pipeline (3 阶段处理)
  - 实现 Platform Provider (4 个接口 +4 个实现)
  - 创建 RuntimeFacade 统一管理
- ✅ **测试覆盖** - 124 个测试 100% 通过
  - 模型层：69 个测试 (100%)
  - 处理器层：5 个测试 (100%)
  - 控制架构：7 个测试 (100%)
  - 输入抽象层：7 个测试 (100%)

#### Server 端 (TypeScript)
- ✅ **架构重构** - 4 个阶段完成
  - InputHost 抽象层 (策略模式)
  - 影子模式 (双写验证)
  - 流量切换 (Router-only)
  - 生态扩展 (Linux/MacOS空类)
- ✅ **单元测试** - 大部分通过
  - 输入验证器：48 个测试 (100%)
  - 状态存储：24 个测试 (100%)
  - 安全控制器：28 个测试 (100%)
  - 应用调度器：18 个测试 (100%)
- ✅ **Gamepad 状态流** - 完整实现并验证
  - InputState 类型定义正确 (gamepadAxes/gamepadTriggers)
  - GamepadAdapter 正确提取所有轴和触发器
  - GamepadXInputAdapter 正确映射到 XInput 格式
  - 详见 `VALIDATION_REPORT_gamepad_state_flow.md`
- ✅ **KeyboardExecutor** - 实现验证通过
  - 差集计算正确实现
  - 幂等性保证正确实现
  - 按键顺序控制正确实现
  - 清零逻辑正确实现
  - 详见 `VALIDATION_REPORT_keyboard_executor.md`
- ✅ **心跳模块** - 24 个测试 (100%)

---

## 🎯 下一步工作优先级

### 🔴 P0 - 核心功能缺失 (必须立即实现)

#### 1. Server 端输入验证器实现

**状态**: 部分完成，需要完善  
**优先级**: 🔴 P0  
**预计工作量**: 2-3 天

**待完成任务**:
- [ ] 完善 InputValidator 类 (已创建但功能不完整)
- [ ] 实现游戏手柄状态验证
- [ ] 实现序列号单调性验证
- [ ] 集成验证器到 WebSocket 消息处理流程
- [ ] 添加验证失败时的错误 ACK 机制

**相关文件**:
- `Server/src/input/validator.ts`
- `Server/src/ws/handlers/state.ts`
- `Server/tests/input/validator.test.ts`

**实施步骤**:
1. 检查 validator.ts 当前实现
2. 补充游戏手柄验证逻辑
3. 添加序列号验证
4. 集成到 WebSocket 处理器
5. 编写集成测试

---

#### 2. Server 端键盘映射规则完善 (状态: 已验证通过)

**状态**: ✅ 验证通过 - 所有核心功能正确实现  
**优先级**: 🟢 P2 (已验证，无紧急问题)  
**验证依据**: `VALIDATION_REPORT_keyboard_executor.md`

**已完成验证**:
- [x] 差集计算逻辑 (pressedKeys vs previousPressedKeys)
- [x] 幂等性保证 (不重复发送 KeyDown)
- [x] 正确的按键顺序 (先释放后按下)
- [x] 清零时的键盘行为 (遍历释放所有按键)

**相关文件**:
- `Server/src/input/hosts/WindowsKeyboardHost.ts`
- `Server/tests/cases/keyboard.test.ts` (49+ 测试用例)

**备注**: KeyboardExecutor 实现正确，测试覆盖完整。建议在生产环境进行实际 Windows key-sender 行为验证。

#### 3. Server 端游戏手柄实现 (XInput + ViGEmBus) (状态: 代码验证通过，待 Windows 环境测试)

**状态**: ✅ 代码验证通过 - 状态流完整实现  
**优先级**: 🟡 P1  
**验证依据**: `VALIDATION_REPORT_gamepad_state_flow.md`

**已验证**:
- [x] InputState 类型定义正确 (gamepadAxes/gamepadTriggers)
- [x] GamepadAdapter 正确提取所有轴和触发器
- [x] GamepadXInputAdapter 正确映射到 XInput 格式
- [x] 4 轴映射 (LX, LY, RX, RY)
- [x] 2 扳机映射 (LT, RT)
- [x] 14 按钮映射

**待完成**:
- [ ] Windows 环境下 ViGEmBus 驱动安装验证
- [ ] 实际 Xbox 360 控制器端到端测试
- [ ] 生产环境 key-sender 行为验证

**相关文件**:
- `Server/src/input/hosts/WindowsGamepadHost.ts`
- `Server/src/input/adapter/GamepadAdapter.ts`
- `Server/src/input/adapter/GamepadXInputAdapter.ts`
- `Server/tests/cases/gamepad.test.ts`

---

### 🟡 P1 - 重要功能缺失 (近期实现)

#### 4. Server 端 ApplyScheduler 时间权威明确

**状态**: 未开始  
**优先级**: 🟡 P1  
**预计工作量**: 2-3 天

**待完成任务**:
- [ ] 在文档中明确 ApplyScheduler 为唯一时间权威
- [ ] 重构 SafetyController 超时检查使用 tickTime
- [ ] 添加时间戳记录 (接收/应用/清零时间)
- [ ] 实现时间差统计

**相关文件**:
- `Server/src/input/applyScheduler.ts`
- `Server/src/input/safetyController.ts`

---

#### 5. Server 端心跳与延迟探测 (状态: 完整实现)

**状态**: 测试 100% 通过  
**优先级**: 🟡 P1  
**已完成**: 心跳模块测试覆盖 100% (24/24 测试)

**相关文件**:
- `Server/src/input/heartbeat.ts`
- `Server/src/ws/handlers/latencyProbe.ts`
- `Server/tests/input/heartbeat.test.ts`

---

#### 6. Android 端新架构整合

**状态**: 架构完成，待整合  
**优先级**: 🟡 P1  
**预计工作量**: 4-5 天

**待完成任务**:
- [ ] Input Pipeline 与 ThreeTierControlManager 数据流整合
- [ ] RuntimeFacade 完整实现 (当前有部分 TODO)
- [ ] Platform Provider 与现有系统集成
- [ ] 新架构端到端测试
- [ ] 性能基准测试

**相关文件**:
- `AndroidClient/app/src/main/java/com/linecat/controlx/core/RuntimeFacade.java`
- `AndroidClient/app/src/main/java/com/linecat/controlx/core/input/pipeline/`
- `AndroidClient/app/src/main/java/com/linecat/controlx/control/`

---

### 🟢 P2 - 优化与增强 (后续实现)

#### 7. Server 端 WebSocket 协议增强

**状态**: 未开始  
**优先级**: 🟢 P2  
**预计工作量**: 2-3 天

**待完成任务**:
- [ ] 实现配置管理 (config.json 加载)
- [ ] 实现配置热更新
- [ ] 实现调试消息 (日志级别控制)
- [ ] 实现日志导出

---

#### 8. Server 端可观测性指标完善

**状态**: 未开始  
**优先级**: 🟢 P2  
**预计工作量**: 3-4 天

**待完成任务**:
- [ ] 创建 Metrics 模块
- [ ] 实现连接状态监控
- [ ] 实现输入统计 (键盘/手柄事件数)
- [ ] 实现系统资源监控 (CPU/内存)
- [ ] 添加监控 API

---

#### 9. Android 端新架构测试补充

**状态**: 需要补充  
**优先级**: 🟢 P2  
**预计工作量**: 2-3 天

**待完成任务**:
- [ ] core/safety/SafetyControllerTest (新架构)
- [ ] core/input/pipeline/*Test (Input Pipeline 测试)
- [ ] Platform Provider 集成测试
- [ ] RuntimeFacade 集成测试

---

## 📋 建议实施顺序

### 第 1 周：Server 端核心功能

**目标**: 完成输入验证器和键盘映射

| 天数 | 任务 | 交付物 |
|------|------|--------|
| Day 1-2 | 输入验证器完善 | InputValidator 完整实现 |
| Day 3-5 | 键盘映射规则 | 差集计算/幂等性/按键顺序 |
| Day 6-7 | 缓冲/测试 | 单元测试和集成测试 |

### 第 2 周：Server 端游戏手柄实现

**目标**: 完成 ViGEmBus 集成

| 天数 | 任务 | 交付物 |
|------|------|--------|
| Day 1-2 | 环境配置 | ViGEmBus 驱动安装 |
| Day 3-5 | GamepadXInputAdapter | XInput 映射实现 |
| Day 6-7 | 集成测试 | Windows 环境测试 |

### 第 3 周：时间权威与心跳

**目标**: 完成 ApplyScheduler 和心跳

| 天数 | 任务 | 交付物 |
|------|------|--------|
| Day 1-3 | ApplyScheduler | 时间权威明确 |
| Day 4-7 | 心跳模块 | 心跳/RTT 完整实现 |

### 第 4 周：Android 端整合

**目标**: 完成新架构整合

| 天数 | 任务 | 交付物 |
|------|------|--------|
| Day 1-3 | 数据流整合 | Input Pipeline → ControlManager |
| Day 4-5 | 系统集成 | Platform Provider 集成 |
| Day 6-7 | 测试验证 | 端到端测试 |

---

## 🎯 立即执行任务 (Next Actions)

基于优先级和依赖关系，**建议立即执行以下任务**:

### 1. Server 端输入验证器完善 (最高优先级)

**原因**:
- 是其他功能的基础
- 影响系统安全性
- 已有部分实现，完成成本低

**第一步**: 读取并分析 `Server/src/input/validator.ts` 当前实现

---

### 2. Android 端新架构测试补充

**原因**:
- 新架构已实现但缺少测试
- 确保架构重构不引入回归问题
- 为后续整合奠定基础

**第一步**: 创建 `core/safety/SafetyControllerTest.java`

---

### 3. Server 端 ApplyScheduler 时间权威明确

**原因**:
- 时间权威不明确可能导致状态应用时序问题
- 影响系统一致性和可预测性

**第一步**: 检查 `Server/src/input/applyScheduler.ts` 当前实现

---

## 📊 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| ViGEmBus 驱动兼容性问题 | 中 | 低 | 代码已验证通过，实际测试待 Windows 环境 |
| Android 新架构整合复杂度 | 中 | 中 | 分阶段整合，充分测试 |
| 输入验证器功能不完整 | 高 | 中 | 优先完善验证器 |

---

## 📈 成功指标

### 短期 (1-2 周)
- ✅ 键盘映射规则 - 已验证通过
- ✅ 心跳模块 - 100% 测试通过
- 🔄 输入验证器完善 (进行中)
- 🔄 游戏手柄状态流 (代码已验证，待 Windows 环境测试)

### 中期 (3-4 周)
- ✅ 游戏手柄实现完成
- 🔄 ApplyScheduler 时间权威明确
- ✅ Android 新架构整合

### 长期 (1-2 月)
- ✅ Android 新架构完全整合
- ✅ 所有 P0/P1 任务完成
- ✅ 整体测试覆盖率 >90%

---

**报告生成时间**: 2026-05-02
**上次更新**: 移除已验证完成的功能 (Gamepad状态流、KeyboardExecutor)；心跳模块测试状态从 83.3% 更新到 100%
**建议**: 从 Server 端输入验证器完善开始执行
