# ControlX 端到端测试运行指南

## 测试框架说明

### 为什么使用 Mocha + wd 而不是 Playwright？

**原因**：
1. **Appium 原生支持** - `wd` 是 Appium 官方推荐的 Node.js 客户端
2. **职责分离** - Playwright 主要用于 Web 浏览器测试，不适用于原生 Android App
3. **生态一致** - Mocha + wd + chai 是标准的 Appium 测试组合

**测试框架栈**：
```
├── Mocha          - 测试运行器
├── wd             - Appium Node.js 客户端
├── chai           - 断言库
├── chai-as-promised - Promise 断言扩展
└── WebSocket      - 原生 WebSocket 客户端
```

### 各测试类型使用的框架

| 测试类型 | 测试框架 | 移动端驱动 | 说明 |
|----------|----------|------------|------|
| **功能测试** | Mocha + wd | Appium (UiAutomator2) | 真正的 App UI 交互 |
| **协议测试** | Mocha + WebSocket | 无 | 纯网络协议测试 |
| **性能测试** | Mocha + wd | Appium + WebSocket | 延迟/吞吐量测量 |
| **异常测试** | Mocha + wd | Appium | 错误恢复测试 |
| **兼容性测试** | Mocha + wd | Appium | 多设备测试 |

---

## 快速开始

### 前置条件

1. **Node.js** >= 20
2. **Android SDK** (包含 adb)
3. **Android 设备/模拟器** (API 28+)
4. **已构建的 Server 和 Android 客户端**

### 一键运行

```bash
cd appium-e2e
npm install
npm test
```

---

## 测试套件结构

```
appium-e2e/
├── tests/
│   ├── run-e2e-pipeline.js      # 主测试管道（推荐）
│   ├── functional/              # 功能测试
│   │   ├── keyboard-input.test.js
│   │   ├── gamepad-input.test.js
│   │   ├── mouse-input.test.js
│   │   └── joystick-input.test.js
│   ├── protocol/                # 协议测试
│   │   └── websocket-protocol.test.js
│   ├── performance/             # 性能测试
│   │   └── performance.test.js
│   ├── exception/               # 异常测试
│   └── compatibility/           # 兼容性测试
├── fixtures/                    # 测试数据
├── configs/                     # 配置文件
├── test-results/                # 测试结果
└── reports/                     # 测试报告
```

---

## 运行命令

### 完整测试套件

```bash
# 运行完整 E2E 管道
npm test

# 详细输出
npm run test:verbose

# 跳过构建（快速测试）
npm run test:quick
```

### 按类别运行

```bash
# 功能测试
npm run test:functional

# 协议测试
npm run test:protocol

# 性能测试
npm run test:performance

# 异常测试
npm run test:exception

# 兼容性测试
npm run test:compatibility
```

### 运行单个测试

```bash
# 运行特定测试文件
npx playwright test tests/functional/keyboard-input.test.js

# 运行特定测试用例
npx playwright test tests/functional/keyboard-input.test.js -g "单键"

# 调试模式
npx playwright test tests/functional/keyboard-input.test.js --debug
```

### CI/CD 模式

```bash
# CI 模式（无头，JUnit 报告）
npm run test:ci

# 生成覆盖率报告
npm run test:coverage

# 性能基准测试
npm run test:benchmark
```

---

## 测试类别说明

### 1. 功能测试 (Functional Tests)

测试应用的核心功能是否正常工作。

**测试文件**: `tests/functional/*.test.js`

| 测试文件 | 测试内容 | 预计耗时 |
|----------|----------|----------|
| `keyboard-input.test.js` | 键盘输入功能 | 30 秒 |
| `gamepad-input.test.js` | 游戏手柄输入 | 30 秒 |
| `mouse-input.test.js` | 鼠标输入 | 30 秒 |
| `joystick-input.test.js` | 摇杆输入 | 30 秒 |

**运行示例**:
```bash
npm run test:functional
```

### 2. 协议测试 (Protocol Tests)

测试 WebSocket 通信协议的正确性。

**测试文件**: `tests/protocol/*.test.js`

| 测试用例 | 测试内容 |
|----------|----------|
| WebSocket 连接 | 正常连接、拒绝连接、重连 |
| 消息格式 | 输入消息、状态消息、错误消息 |
| ACK 机制 | 确认响应、超时重传 |
| RTT 测量 | 往返延迟测量 |
| 并发连接 | 多客户端同时连接 |

**运行示例**:
```bash
npm run test:protocol
```

### 3. 性能测试 (Performance Tests)

测试系统的性能指标。

**测试文件**: `tests/performance/performance.test.js`

| 测试用例 | 目标值 | 说明 |
|----------|--------|------|
| 输入延迟 | <50ms | 触摸到后端接收时间 |
| 吞吐量 | 60 FPS | 输入采样率 |
| 压力测试 | 错误率<1% | 高频输入 |
| 长时间运行 | 60 秒 | 稳定性测试 |
| 内存监控 | 增长<50MB | 内存泄漏检测 |

**运行示例**:
```bash
npm run test:performance
```

### 4. 异常测试 (Exception Tests)

测试系统的错误处理和恢复能力。

**测试文件**: `tests/exception/*.test.js`

| 测试场景 | 说明 |
|----------|------|
| 网络中断 | WiFi 断开重连 |
| 服务崩溃 | 后端崩溃重启 |
| 边界条件 | 输入边界、时间边界 |
| 错误恢复 | 自动恢复机制 |

**运行示例**:
```bash
npm run test:exception
```

### 5. 兼容性测试 (Compatibility Tests)

测试不同设备和 Android 版本的兼容性。

**测试文件**: `tests/compatibility/*.test.js`

| 测试维度 | 测试内容 |
|----------|----------|
| Android 版本 | API 28-34 |
| 设备厂商 | 原生、MIUI、OneUI |
| 屏幕尺寸 | 手机、平板、折叠屏 |
| 权限模型 | 传统、运行时 |

**运行示例**:
```bash
npm run test:compatibility
```

---

## 测试结果

### 结果位置

```
test-results/
├── *.png              # 测试截图
└── report.json        # JSON 测试报告

reports/
├── junit/             # JUnit 格式报告
├── html/              # HTML 报告
├── coverage/          # 覆盖率报告
└── performance-report.json  # 性能报告
```

### JSON 报告格式

```json
{
  "timestamp": "2026-02-19T13:50:00.000Z",
  "totalDuration": 50000,
  "passed": 48,
  "failed": 2,
  "total": 50,
  "results": [
    {
      "name": "键盘输入 - 单键测试",
      "passed": true,
      "duration": 2300
    },
    {
      "name": "游戏手柄输入 - 按钮测试",
      "passed": false,
      "duration": 1500,
      "error": "预期收到按钮事件，实际未收到"
    }
  ]
}
```

### 查看 HTML 报告

```bash
npm run report
```

---

## 配置说明

### 性能阈值配置

编辑 `configs/thresholds.json`:

```json
{
  "performance": {
    "inputLatency": {
      "threshold": 50,
      "unit": "ms",
      "severity": "error"
    }
  }
}
```

### 测试数据配置

编辑 `fixtures/input-scenarios.json` 添加新的测试场景。

### 设备配置

编辑 `configs/capabilities.json` 配置测试设备：

```json
{
  "devices": [
    {
      "name": "Pixel 4",
      "apiLevel": 30,
      "resolution": "1080x2280"
    }
  ]
}
```

---

## 故障排查

### 常见问题

#### 1. 设备未找到

```bash
# 检查设备连接
adb devices

# 重启 adb 服务器
adb kill-server
adb start-server

# 重新连接
adb connect localhost:5667
```

#### 2. Appium 启动失败

```bash
# 检查 Appium 是否安装
npx appium --version

# 重新安装
npm install -g appium
```

#### 3. 应用安装失败

```bash
# 卸载旧版本
adb uninstall com.linecat.wmmtcontroller

# 清理构建
cd ../AndroidClient
./gradlew clean

# 重新构建
./gradlew assembleDebug
```

#### 4. 测试超时

```bash
# 增加超时时间（在测试文件中）
test("测试名称", async () => {
  // ...
}, 60000); // 60 秒超时
```

### 日志收集

```bash
# 详细日志
npm run test:verbose

# 保存日志
npm test 2>&1 | tee test.log

# ADB 日志
adb logcat -s ControlX:*
```

---

## 持续集成

### GitHub Actions

创建 `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
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
        working-directory: ./appium-e2e
      
      - name: Build
        run: |
          cd Server && npm run build
          cd ../AndroidClient && ./gradlew assembleDebug
      
      - name: Run E2E Tests
        run: npm run test:ci
        working-directory: ./appium-e2e
      
      - name: Upload Test Report
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: appium-e2e/reports/
```

---

## 最佳实践

### 1. 测试编写

```javascript
// 好的测试命名
test("键盘输入 - 单键按下 (W)", async () => {
  // 清晰的测试步骤
  // 1. 准备
  const initialCount = receivedInputs.length;
  
  // 2. 执行
  await driver.tap([{ x: 100, y: 200 }]);
  
  // 3. 验证
  expect(receivedInputs.length).toBeGreaterThan(initialCount);
});
```

### 2. 等待机制

```javascript
// ❌ 不好的做法
await new Promise(r => setTimeout(r, 5000));

// ✅ 好的做法
await waitForElement(driver, "accessibility id", "button");
```

### 3. 截图时机

```javascript
// 关键操作后截图
await driver.tap([{ x: 100, y: 200 }]);
const screenshot = await driver.takeScreenshot();
fs.writeFileSync(`test-results/step-${Date.now()}.png`, screenshot, 'base64');
```

### 4. 错误处理

```javascript
try {
  await testStep();
} catch (error) {
  // 截图记录错误状态
  const screenshot = await driver.takeScreenshot();
  fs.writeFileSync(`test-results/error-${Date.now()}.png`, screenshot, 'base64');
  throw error;
}
```

---

## 测试覆盖目标

| 指标 | 目标值 | 当前状态 |
|------|--------|----------|
| 测试通过率 | >95% | - |
| 代码覆盖率 | >85% | - |
| 输入延迟 | <50ms | - |
| 端到端延迟 | <100ms | - |
| 崩溃率 | <0.1% | - |

---

## 相关文档

- [测试架构设计](TEST_ARCHITECTURE.md)
- [E2E 测试设计](E2E_TEST_DESIGN.md)
- [测试数据工厂](fixtures/README.md)

---

**最后更新**: 2026-02-19  
**维护者**: ControlX Team
