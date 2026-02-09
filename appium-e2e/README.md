# Appium E2E 测试项目

这是一个专门为 WMMT Remote Controller 设计的端到端自动化测试项目，基于 Appium 和 Playwright Test Runner。

## 🚀 主要特性

### 🔒 安全测试模式

- **自动后端管理**：测试前后自动启动/停止临时后端
- **输入隔离**：测试模式下禁用实际的键盘/鼠标/手柄输出
- **零系统干扰**：确保测试不会影响系统正常使用
- **完整验证**：记录所有输入事件用于测试验证

### 📁 项目结构

```
appium-e2e/
├── package.json
├── appium.config.js
├── tests/
│   ├── basic-flow.test.js
│   └── advanced.test.js
├── helpers/
│   ├── api.js          # API测试工具
│   ├── device.js       # 设备操作封装
│   ├── test-backend.js # 测试后端管理器
│   └── test-runner.js  # 集成测试运行器
├── fixtures/
│   └── test-data.json
├── android/
│   └── WMMTController.apk
├── screenshots/
└── README.md
```

## 🛠️ 环境准备

### 系统要求

- Node.js (>= 14.0.0)
- Android SDK
- Appium Server

### 安装依赖

```bash
cd appium-e2e
npm install
```

### 准备测试APK

将 WMMT Remote Controller 的 APK 文件放置在 `android/WMMTController.apk`

## ▶️ 运行测试

### 一键运行完整测试套件

```bash
npm test
```

### 运行特定测试

```bash
npm run test:single tests/basic-flow.test.js
```

### 调试模式运行

```bash
npm run test:debug
```

### 手动控制后端

```bash
# 启动测试后端
npm run backend:start

# 检查后端状态
npm run backend:status

# 停止测试后端
npm run backend:stop
```

## 🧪 测试用例说明

### 基础流程测试 (`basic-flow.test.js`)

- App启动和UI验证
- 服务启停功能测试
- Debug模式激活验证
- 服务器连接测试
- 输入事件模拟测试
- 浮窗权限绕过测试

### 高级集成测试 (`advanced.test.js`)

- 完整端到端流程测试
- 性能和压力测试
- 错误处理和恢复测试

## 🔧 配置说明

### Appium 配置 (`appium.config.js`)

```javascript
{
  port: 4723,
  specs: ['./tests/**/*.test.js'],
  capabilities: {
    platformName: 'Android',
    automationName: 'UiAutomator2',
    deviceName: 'Android Emulator',
    app: './android/WMMTController.apk',
    noReset: false
  }
}
```

### 真机测试配置

修改 `capabilities` 中的设备信息：

```javascript
{
  'appium:deviceName': 'Your_Device_Name',
  'appium:udid': 'your_device_udid'
}
```

## 🛡️ 安全特性

### 测试模式保障

- **环境隔离**：测试在独立环境中运行
- **输入屏蔽**：测试模式下不产生实际系统输入
- **自动清理**：测试完成后自动清理所有资源
- **状态验证**：确保测试环境正确配置

### 后端测试模式

后端在测试模式下：

- 不生成真实的键盘/鼠标事件
- 记录所有输入用于验证
- 提供专门的测试API端点
- 支持测试环境的快速重置

## 📊 测试数据

测试数据存储在 `fixtures/test-data.json` 中，包含：

- 测试用户信息
- 预定义的输入事件
- 测试场景配置

## 📸 截图和报告

测试过程中会自动生成截图到 `screenshots/` 目录，便于问题排查和测试结果展示。

## 🔄 CI/CD 集成

可在 CI/CD 流程中集成：

```yaml
# 示例 GitHub Actions 配置
- name: Run E2E Tests
  run: |
    cd appium-e2e
    npm test
```

## 🔧 开发工具

### 辅助工具说明

**Device Helper** (`helpers/device.js`)

- 元素定位和操作封装
- 屏幕截图功能
- 手势操作支持
- 等待机制

**API Helper** (`helpers/api.js`)

- 服务端API交互
- 测试模式验证
- 输入事件发送
- 状态监控

**Test Backend Manager** (`helpers/test-backend.js`)

- 自动后端生命周期管理
- 测试模式验证
- 健康检查

**Integrated Test Runner** (`helpers/test-runner.js`)

- 完整测试流程编排
- 自动环境设置和清理
- 详细的测试报告生成

## ⚠️ 注意事项

1. 确保测试设备/模拟器已正确配置
2. 测试APK需要包含Debug模式支持
3. 某些测试可能需要特定的设备权限
4. 测试模式下不会产生真实的系统输入事件

## 📞 支持

如有问题，请联系项目维护团队或提交 Issue。
