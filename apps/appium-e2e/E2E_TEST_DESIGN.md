# ControlX 端到端测试体系设计

## 测试设计原则

### 核心原则

| 原则 | 说明 | 优先级 |
|------|------|--------|
| **Appium 模拟真实交互** | 通过 UI 点击、滑动等操作测试完整链路 | 🔴 主要 |
| **WebSocket 仅用于验证** | 监听后端收到的输入，确认 App→Server 通信正常 | 🟢 辅助 |

### 为什么这样设计？

1. **真实用户场景**：用户通过 App UI 操作，不是直接调用 WebSocket
2. **测试价值最大化**：Appium 模拟能发现 UI→逻辑→通信 全链路问题
3. **职责分离**：
   - Appium 测试：**App 能否正确响应用户操作并发送输入**
   - WebSocket 监听：**后端是否收到正确的输入**（验证用）

### 正确的测试流程

```
┌─────────────────────────────────────────────────────────────┐
│                    正确的 E2E 测试流程                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Appium 模拟用户点击 App 上的键盘区域                     │
│         │                                                   │
│         ▼                                                   │
│  2. App 检测到触摸事件，生成输入数据                         │
│         │                                                   │
│         ▼                                                   │
│  3. App 通过 WebSocket 发送输入到后端                        │
│         │                                                   │
│         ▼                                                   │
│  4. 测试脚本监听 WebSocket，验证后端收到了正确的输入         │
│         │                                                   │
│         ▼                                                   │
│  5. 断言：收到的输入 == 预期的输入                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 错误的测试流程（已修正）

```
┌─────────────────────────────────────────────────────────────┐
│                    错误的 E2E 测试流程                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  测试脚本 ──主动发送──> WebSocket ──> 后端                  │
│         │                                                   │
│         └────── 这跳过了 App 的 UI 和输入生成逻辑！          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 测试框架选型

### 为什么选择 Mocha + wd？

**决策矩阵**：

| 框架组合 | Appium 支持 | Web 测试 | 学习曲线 | 生态成熟度 | 选择 |
|----------|-------------|----------|----------|------------|------|
| **Mocha + wd** | ✅ 原生 | ❌ | 低 | 高 | ✅ **选用** |
| Playwright + Appium 插件 | ⚠️ 间接 | ✅ | 中 | 中 | ❌ |
| Jest + appium-jest | ⚠️ 社区 | ❌ | 中 | 低 | ❌ |
| WebdriverIO | ✅ 原生 | ✅ | 高 | 高 | 备选 |

**选择理由**：
1. **wd** 是 Appium 官方推荐的 Node.js 客户端，由 Appium 团队维护
2. **Mocha** 是最成熟的 Node.js 测试框架，灵活且可配置
3. **chai** 提供 BDD 风格的断言，可读性强
4. **生态一致** - 避免混用多个框架导致维护复杂

**不选 Playwright 的原因**：
- Playwright 主要设计用于 Web 浏览器自动化
- 对 Appium 的支持通过第三方插件，非官方
- 增加不必要的依赖复杂性
- 对于原生 Android App 测试，wd 更直接

### 测试框架栈

```
┌─────────────────────────────────────────┐
│           测试框架架构                   │
├─────────────────────────────────────────┤
│                                         │
│  Mocha (测试运行器)                     │
│  ├── 测试组织 (describe/it)            │
│  ├── 生命周期 (before/after)           │
│  └── 报告生成 (reporters)              │
│                                         │
│  wd (Appium 客户端)                     │
│  ├── 设备控制 (tap, swipe, etc.)       │
│  ├── 元素查找 (elementByAccessibilityId)│
│  └── 截图 (takeScreenshot)             │
│                                         │
│  chai (断言库)                          │
│  ├── expect 风格                        │
│  ├── chai-as-promised (Promise 断言)   │
│  └── 自定义断言                        │
│                                         │
│  WebSocket (原生客户端)                 │
│  ├── 后端通信                           │
│  ├── 延迟测量                           │
│  └── 协议验证                           │
│                                         │
└─────────────────────────────────────────┘
```

---

## 测试体系架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    ControlX E2E 测试体系                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  L1 - 单元测试层 (Unit Tests)                                  │
│  ├── Server 单元测试 (Jest)                                    │
│  ├── Android 单元测试 (JUnit)                                  │
│  └── 覆盖率目标：>85%                                          │
│                                                                 │
│  L2 - 集成测试层 (Integration Tests)                           │
│  ├── WebSocket 通信测试                                        │
│  ├── 输入处理管道测试                                          │
│  ├── 适配器层测试                                              │
│  └── 数据库/存储测试                                           │
│                                                                 │
│  L3 - 端到端测试层 (E2E Tests) ← 本文档重点                    │
│  ├── 完整用户流程测试                                          │
│  ├── 跨组件交互测试                                            │
│  ├── 性能与压力测试                                            │
│  └── 异常恢复测试                                              │
│                                                                 │
│  L4 - 系统测试层 (System Tests)                                │
│  ├── 真实设备测试                                              │
│  ├── 兼容性测试                                                │
│  └── 生产环境测试                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 测试金字塔

```
                    /\
                   /  \
                  / L4 \      系统测试 (10%)
                 /______\
                /        \
               /   L3     \    E2E 测试 (20%)
              /____________\
             /              \
            /      L2        \  集成测试 (30%)
           /__________________\
          /                    \
         /         L1           \  单元测试 (40%)
        /________________________\
```

## E2E 测试分类

### 1. 功能测试 (Functional Tests)

#### 1.1 核心功能流程

```
测试场景：完整用户操作流程
├── 应用启动
├── 服务初始化
├── 连接建立
├── 输入模拟
│   ├── 键盘输入
│   ├── 游戏手柄输入
│   ├── 鼠标输入
│   └── 摇杆输入
├── 状态验证
└── 服务停止
```

#### 1.2 输入设备测试矩阵

| 输入类型 | 测试场景 | 验证点 |
|----------|----------|--------|
| **键盘** | 单键按下/释放 | 后端收到正确键码 |
| | 多键组合 | 同时处理多个按键 |
| | 快速连击 | 高频输入不丢失 |
| | 长按 | 持续输入状态 |
| **游戏手柄** | 按钮按下 | XInput 映射正确 |
| | 摇杆偏移 | 轴值范围 -1~1 |
| | 扳机按压 | 值范围 0~1 |
| | 组合输入 | 按钮 + 摇杆同时 |
| **鼠标** | 移动 | 坐标更新 |
| | 点击 | 左/右/中键 |
| | 滚轮 | 滚动事件 |
| **摇杆** | 方向输入 | 8 个方向 |
| | 死区测试 | 小偏移忽略 |

### 2. 协议测试 (Protocol Tests)

#### 2.1 WebSocket 通信

```javascript
测试用例：
├── 连接建立
│   ├── 正常连接
│   ├── 拒绝连接 (无效配置)
│   └── 重连机制
├── 消息格式
│   ├── 输入消息
│   ├── 状态消息
│   ├── 心跳消息
│   └── 错误消息
├── 可靠性
│   ├── ACK 确认
│   ├── 超时重传
│   └── 序列号连续性
└── 性能
    ├── 延迟测量 (RTT)
    ├── 吞吐量测试
    └── 并发连接
```

#### 2.2 输入协议验证

| 消息类型 | 字段 | 验证规则 |
|----------|------|----------|
| `input` | frameId | 单调递增 |
| | runtimeStatus | ok/degraded/rollback |
| | keyboard | Set<string> |
| | mouse | {x, y, buttons} |
| | gamepad | {buttons, axes, triggers} |
| | joystick | {x, y, deadzone} |

### 3. 异常测试 (Exception Tests)

#### 3.1 错误恢复

```
测试场景：
├── 网络中断恢复
│   ├── WiFi 断开重连
│   └── 数据连接切换
├── 服务崩溃恢复
│   ├── 后端崩溃重启
│   └── 前端崩溃重启
├── 资源耗尽
│   ├── 内存不足
│   └── 文件描述符耗尽
└── 外部干扰
    ├── 来电中断
    └── 其他应用抢占
```

#### 3.2 边界条件

```
测试场景：
├── 输入边界
│   ├── 摇杆最大值/最小值
│   ├── 鼠标坐标溢出
│   └── 超多键同时按下
├── 时间边界
│   ├── 帧间隔为 0
│   ├── 帧间隔过大
│   └── 时钟跳变
└── 状态边界
    ├── 空输入状态
    ├── 全键按下
    └── 快速状态切换
```

### 4. 性能测试 (Performance Tests)

#### 4.1 性能指标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| **输入延迟** | <50ms | 触摸到后端接收时间 |
| **端到端延迟** | <100ms | 触摸到游戏响应时间 |
| **帧率** | 60 FPS | 输入采样率 |
| **CPU 使用** | <20% | 后台服务占用 |
| **内存使用** | <100MB | 后台服务占用 |
| **网络带宽** | <10KB/s | WebSocket 流量 |

#### 4.2 压力测试

```
测试场景：
├── 高频输入
│   └── 1000 次/秒 输入事件
├── 长时间运行
│   └── 24 小时 连续运行
├── 多连接
│   └── 10 个 并发客户端
└── 大数据量
    └── 超大输入状态 包
```

### 5. 兼容性测试 (Compatibility Tests)

#### 5.1 设备兼容性

| 设备类型 | Android 版本 | 分辨率 | 测试重点 |
|----------|-------------|--------|----------|
| 手机 | 9-14 | 1080x2400 | 触控、性能 |
| 平板 | 10-14 | 2560x1600 | 大屏布局 |
| 折叠屏 | 12-14 | 动态 | 展开/折叠 |
| 模拟器 | 9-14 | 可变 | 自动化测试 |

#### 5.2 系统兼容性

```
测试矩阵：
├── Android 版本
│   ├── Android 9 (API 28) - 最低支持
│   ├── Android 10-12 - 主流版本
│   └── Android 13-14 - 最新版本
├── 厂商定制
│   ├── 原生 Android
│   ├── MIUI (Xiaomi)
│   ├── OneUI (Samsung)
│   └── ColorOS (OPPO)
└── 权限模型
    ├── 传统权限
    └── 运行时权限
```

## 测试目录结构

```
appium-e2e/
├── tests/
│   ├── pipeline/                  # 测试管道
│   │   ├── run-e2e-pipeline.js   # 主运行器
│   │   └── setup.js              # 环境搭建
│   │
│   ├── functional/                # 功能测试
│   │   ├── app-launch.test.js
│   │   ├── service-lifecycle.test.js
│   │   ├── keyboard-input.test.js
│   │   ├── gamepad-input.test.js
│   │   ├── mouse-input.test.js
│   │   └── joystick-input.test.js
│   │
│   ├── protocol/                  # 协议测试
│   │   ├── websocket-connection.test.js
│   │   ├── message-format.test.js
│   │   ├── ack-mechanism.test.js
│   │   └── rtt-measurement.test.js
│   │
│   ├── exception/                 # 异常测试
│   │   ├── network-interruption.test.js
│   │   ├── service-crash.test.js
│   │   ├── boundary-conditions.test.js
│   │   └── error-recovery.test.js
│   │
│   ├── performance/               # 性能测试
│   │   ├── input-latency.test.js
│   │   ├── throughput.test.js
│   │   ├── stress-test.js
│   │   └── longevity.test.js
│   │
│   └── compatibility/             # 兼容性测试
│       ├── device-compatibility.test.js
│       ├── android-version.test.js
│       └── screen-size.test.js
│
├── helpers/
│   ├── test-runner.js            # 测试运行器
│   ├── reporter.js               # 报告生成器
│   ├── coverage.js               # 覆盖率收集
│   └── ...
│
├── fixtures/
│   ├── test-data.json
│   ├── input-scenarios.json
│   └── device-profiles.json
│
├── reports/
│   ├── junit/                    # JUnit 格式报告
│   ├── html/                     # HTML 报告
│   └── coverage/                 # 覆盖率报告
│
└── configs/
    ├── capabilities.json         # 设备配置
    └── thresholds.json           # 性能阈值
```

## 测试运行命令

```bash
# 运行完整测试套件
npm test

# 运行特定类别测试
npm run test:functional      # 功能测试
npm run test:protocol        # 协议测试
npm run test:exception       # 异常测试
npm run test:performance     # 性能测试
npm run test:compatibility   # 兼容性测试

# 运行单个测试文件
npm run test:single tests/functional/keyboard-input.test.js

# 带覆盖率运行
npm run test:coverage

# 生成 HTML 报告
npm run test:report

# 性能基准测试
npm run test:benchmark

# CI/CD 模式
npm run test:ci
```

## 测试报告格式

### JUnit XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="ControlX E2E Tests" tests="50" failures="2" errors="0" time="120.5">
  <testsuite name="功能测试" tests="20" failures="1" time="45.2">
    <testcase name="键盘输入 - 单键测试" classname="keyboard-input" time="2.3"/>
    <testcase name="键盘输入 - 多键组合" classname="keyboard-input" time="2.5">
      <failure message="预期 3 个按键，实际收到 2 个">AssertionError</failure>
    </testcase>
  </testsuite>
</testsuites>
```

### HTML 报告

包含：
- 测试执行摘要
- 通过率趋势图
- 失败测试详情
- 截图和日志
- 性能指标对比

## CI/CD 集成

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
      
      - name: Start Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 28
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Build
        run: |
          cd Server && npm run build
          cd ../AndroidClient && ./gradlew assembleDebug
      
      - name: Run E2E Tests
        run: npm run test:ci
      
      - name: Upload Test Report
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: appium-e2e/reports/
```

## 测试数据管理

### 测试数据工厂

```javascript
// fixtures/factories/input-factory.js
module.exports = {
  createKeyboardInput(keys = ['W']), {
    return {
      type: 'input',
      data: {
        keyboard: new Set(keys),
        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
        joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
        gamepad: new Set()
      }
    };
  },
  
  createGamepadInput(buttons = ['A'], axes = {}) {
    // ...
  },
  
  createMouseInput(x, y, buttons) {
    // ...
  }
};
```

### 测试场景配置

```json
// fixtures/input-scenarios.json
{
  "keyboard": {
    "single_key": {
      "description": "单键按下",
      "input": { "keys": ["W"] },
      "expected": { "received": true, "keyCode": "KeyW" }
    },
    "multi_key": {
      "description": "多键组合",
      "input": { "keys": ["W", "A", "S"] },
      "expected": { "received": true, "keyCount": 3 }
    }
  },
  "gamepad": {
    "button_press": {
      "description": "按钮按下",
      "input": { "buttons": ["A"] },
      "expected": { "xinput": 0x1000 }
    }
  }
}
```

## 质量门禁

| 指标 | 阈值 | 处理 |
|------|------|------|
| **测试通过率** | >95% | CI 失败 |
| **代码覆盖率** | >85% | 警告 |
| **输入延迟** | <50ms | 性能回归 |
| **端到端延迟** | <100ms | 性能回归 |
| **崩溃率** | <0.1% | 阻塞发布 |
| **ANR 率** | <0.5% | 阻塞发布 |

## 持续改进

### 测试有效性分析

每周分析：
1. 失败测试的根本原因
2. 漏测的缺陷分析
3. 测试执行时间优化
4.  Flakey 测试识别和修复

### 测试资产复用

- 测试工具库发布为 npm 包
- 测试用例文档化
- 最佳实践分享
- 自动化测试模板

---

**文档版本**: 1.0  
**最后更新**: 2026-02-19  
**维护者**: ControlX Team
