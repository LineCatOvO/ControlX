# E2E 测试架构文档

## 测试架构概述

本项目的端到端测试采用**三阶段架构**：

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E 测试管道                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  阶段 1: 环境搭建 (Setup)                                   │
│  ├── 检查依赖 (Node.js, npm, ADB)                          │
│  ├── 检查设备连接                                           │
│  ├── 启动 Appium Server                                     │
│  ├── 启动后端 Server                                        │
│  ├── 安装 Android 应用                                      │
│  ├── 初始化 Appium 驱动                                     │
│  └── 授予必要权限                                           │
│                                                             │
│  阶段 2: 核心测试 (Core Tests)                              │
│  ├── 应用启动测试                                           │
│  ├── 服务启动测试                                           │
│  ├── 键盘输入测试                                           │
│  ├── 游戏手柄输入测试                                       │
│  ├── 摇杆输入测试                                           │
│  ├── 鼠标输入测试                                           │
│  ├── 服务停止测试                                           │
│  └── 后端通信验证                                           │
│                                                             │
│  阶段 3: 清理收尾 (Cleanup)                                 │
│  ├── 停止应用                                               │
│  ├── 关闭 Appium 驱动                                       │
│  ├── 停止后端 Server                                        │
│  └── 停止 Appium Server                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 文件结构

```
appium-e2e/
├── tests/
│   ├── run-e2e-pipeline.js    # 主测试管道运行器（推荐）
│   ├── run-e2e.js             # 旧版测试运行器（保留兼容）
│   ├── real-appium-e2e.test.js # Playwright 风格的 Appium 测试
│   ├── basic-flow.test.js     # 基础流程测试
│   ├── advanced.test.js       # 高级测试
│   └── lib/
│       ├── config.js          # 测试配置
│       ├── device.js          # 设备操作封装
│       ├── utils.js           # 工具函数
│       └── ...
├── helpers/
│   ├── api.js                 # API 测试辅助
│   └── device.js              # 设备辅助（旧版）
├── fixtures/
│   └── test-data.json         # 测试数据
├── test-results/              # 测试结果输出
│   ├── *.png                  # 测试截图
│   └── report.json            # 测试报告
├── screenshots/               # 截图输出（旧版）
├── package.json
└── README.md
```

## 运行测试

### 推荐方式（新测试管道）

```bash
# 运行完整测试管道
npm test

# 或等价命令
npm run test:full

# 详细输出
npm run test:verbose

# 跳过构建阶段（快速测试）
npm run test:quick
```

### 旧版测试（保留兼容）

```bash
# 运行旧版测试
npm run test:legacy
```

### Playwright 风格测试

```bash
# 运行 Playwright 风格的 Appium 测试
npm run test:real
```

## 测试模块说明

### 阶段 1: 环境搭建

| 模块 | 说明 | 失败处理 |
|------|------|----------|
| 依赖检查 | 验证 Node.js、npm、ADB 已安装 | 终止测试 |
| 设备检查 | 验证有设备/模拟器连接 | 终止测试 |
| Appium 启动 | 启动 Appium Server | 终止测试 |
| 后端启动 | 启动临时后端 Server | 终止测试 |
| 应用安装 | 安装 APK 到设备 | 终止测试 |
| 驱动初始化 | 初始化 Appium WebDriver | 终止测试 |
| 权限授予 | 授予浮窗等权限 | 警告继续 |

### 阶段 2: 核心测试

| 测试模块 | 测试内容 | 验证点 |
|----------|----------|--------|
| 应用启动 | 启动应用并验证 UI | UI 元素存在 |
| 服务启动 | 点击启动按钮 | 后端收到连接 |
| 键盘输入 | 模拟键盘区域点击 | 输入事件发送 |
| 游戏手柄 | 模拟手柄按钮点击 | 输入事件发送 |
| 摇杆输入 | 模拟摇杆拖动 | 输入事件发送 |
| 鼠标输入 | 模拟鼠标点击 | 输入事件发送 |
| 服务停止 | 点击停止按钮 | 后端收到断开 |
| 后端通信 | WebSocket 通信 | Ping/Pong响应 |

### 阶段 3: 清理收尾

| 操作 | 说明 |
|------|------|
| 停止应用 | `am force-stop` 包名 |
| 关闭驱动 | `driver.quit()` |
| 停止后端 | `kill SIGTERM` |
| 停止 Appium | `kill SIGTERM` |

## 测试报告

测试完成后生成 `test-results/report.json`：

```json
{
  "timestamp": "2026-02-19T13:50:00.000Z",
  "totalDuration": 50000,
  "passed": 7,
  "failed": 1,
  "total": 8,
  "results": [
    {
      "name": "应用启动测试",
      "passed": true,
      "duration": 3500
    },
    {
      "name": "键盘输入测试",
      "passed": false,
      "duration": 1200,
      "error": "错误信息"
    }
  ]
}
```

同时生成测试截图：
- `app-launch.png` - 应用启动截图
- `service-start.png` - 服务启动截图
- `keyboard-input.png` - 键盘输入截图
- `service-stop.png` - 服务停止截图

## 配置说明

### 测试配置 (`tests/lib/config.js`)

```javascript
{
    packageName: "com.linecat.controlx",
    mainActivity: "com.linecat.controlx/.MainActivity",
    appiumHost: "localhost",
    appiumPort: 4723,
    // ...
}
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TEST_MODE` | 测试模式 | `true` |
| `DISABLE_ACTUAL_INPUT` | 禁用实际输入 | `true` |
| `PORT` | 后端端口 | 随机 |
| `VERBOSE` | 详细日志 | `false` |

## 故障排查

### 常见问题

1. **设备未找到**
   ```bash
   adb devices
   # 确保有设备显示
   ```

2. **Appium 启动失败**
   ```bash
   npm install -g appium
   appium --version
   ```

3. **应用安装失败**
   ```bash
   adb uninstall com.linecat.controlx
   # 然后重新运行测试
   ```

4. **权限授予失败**
   ```bash
   adb shell appops set com.linecat.controlx SYSTEM_ALERT_WINDOW allow
   ```

### 日志位置

- 测试日志：控制台输出
- 截图：`test-results/*.png`
- 报告：`test-results/report.json`

## 最佳实践

1. **测试隔离**：每个测试模块独立，互不影响
2. **自动清理**：测试完成后自动清理所有资源
3. **截图记录**：关键步骤自动截图
4. **超时处理**：所有异步操作都有超时保护
5. **错误恢复**：单个测试失败不影响其他测试

## 扩展测试

添加新测试模块：

1. 在 `runCoreTests()` 中添加测试配置
2. 实现测试函数
3. 添加截图保存（可选）

```javascript
async function testNewFeature() {
    const driver = state.wdDriver;
    
    // 测试逻辑
    await driver.tap([{ x: 100, y: 200 }]);
    
    // 截图
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync('test-results/new-feature.png', screenshot, 'base64');
}
```

## 维护说明

- **旧版测试**：`run-e2e.js` 保留用于向后兼容
- **推荐测试**：`run-e2e-pipeline.js` 是推荐的测试方式
- **Playwright 测试**：`real-appium-e2e.test.js` 用于复杂场景

---

**最后更新**: 2026-02-19  
**维护者**: ControlX Team
