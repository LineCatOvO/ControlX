# WMMT Remote Controller - 需求驱动的完整Appium测试方案

**设计日期**：2026-02-10
**设计目标**：根据项目需求文档，设计完整的Appium端到端测试架构，覆盖Android客户端和Server项目的所有核心功能

---

## 一、需求分析总结

### 1.1 核心需求概述

根据[requirements.md](file:///c:\Users\15013\Projects\WMMTRemoteController\doc\requirements.md)，项目的核心需求包括：

**项目目标**：
- 在安卓设备上，通过用户操作生成控制结果
- 使目标赛车游戏在无需修改的情况下响应这些控制
- 保证控制行为稳定、可预测，异常情况下不产生残留输入

**输入源支持**：
- 触控：必须支持
- 陀螺仪：必须支持
- 键盘：可选支持
- 手柄：可选支持

**控制结果类型**：
- 键盘控制结果：等价于真实键盘输入
- 手柄控制结果：等价于真实游戏手柄输入

**控制模型**：
- 状态驱动模型：任意时刻的控制可被描述为"当前状态"
- 控制刷新能力：不低于125Hz的控制状态更新能力
- 控制平滑与映射：连续控制平滑、死区设置、非线性映射

**操作布局**：
- 操作布局定义：一组用于描述用户操作方式、操作区域与控制结果映射关系的配置集合
- 多布局管理：同时管理多套布局、运行过程中随时切换、布局导入与导出
- 布局编辑能力：完备的操作布局编辑工具（核心用户能力）

**控制状态管理**：
- 控制启用与禁用：允许用户在运行过程中启用或禁用控制输出
- 控制作用范围：控制默认对宿主环境全局生效、不基于当前运行应用筛选
- 控制状态可见性：允许用户确认当前控制状态

**网络通信**：
- WebSocket传输：通过WebSocket传输控制数据
- 连接校验与反馈：连接异常时提示用户连接信息缺失、明确告知连接失败、清空所有控制结果

**异常与回退**：
- 异常隔离：单一异常不得导致系统整体失效或控制失控
- 安全回退状态：任何异常、回退或禁用后的最终状态必须等价于"没有任何控制输出"

### 1.2 功能文档需求总结

根据[function.md](file:///c:\Users\15013\Projects\WMMTRemoteController\doc\function.md)，功能需求包括：

**输入源采集功能**：
- 连续输入可被持续感知
- 多输入源可同时存在
- 输入采集不依赖UI是否可见

**控制语义处理功能**：
- 控制语义以状态形式存在
- 任意时刻可完整描述当前状态
- 状态可被统一清空与重置

**控制结果输出功能**：
- 键盘控制结果：按键按下与释放、多按键同时存在、持续按键在释放前保持有效
- 手柄控制结果：按键状态、摇杆轴状态、扳机模拟量、多轴多按键同时存在

**操作布局管理功能**：
- 创建布局、删除布局、修改布局、切换布局
- 多布局维护：同时管理多套布局、布局之间互不影响、切换即时生效

**布局编辑工具功能**：
- 操作元素管理：添加、删除、调整操作元素
- 布局结构调整：调整操作区域位置与尺寸
- 控制映射编辑：修改操作与控制结果的对应关系
- 参数编辑：调整灵敏度、范围、曲线等参数
- 实时预览：编辑过程中可观察控制行为变化

**控制状态管理功能**：
- 控制启用与禁用：禁用状态下不产生任何控制结果
- 控制作用范围：控制默认对宿主环境全局生效
- 安全机制介入时：立即进入零输出状态、提供可感知中断反馈

**控制结果发送策略**：
- 状态发送：固定节奏发送完整状态
- 事件发送：状态变化时发送
- 状态同步频率配置：同步频率影响延迟、稳定性与资源消耗

**通信与连接功能**：
- 控制数据传输：控制数据持续发送、暂短中断后可恢复、中断期间控制结果安全
- ACK确认机制：执行端返回ACK类型数据、ACK确认对应控制结果ID已执行
- 延迟检测与告警：基于ACK计算延迟、≤50ms正常、>50ms黄色警告、>100ms红色严重警告

**执行端功能**：
- 控制结果执行：接收并执行控制结果、维护当前控制状态
- 执行端安全回退：连接中断、控制异常、客户端禁用、超时自动清零
- 超时清空配置：执行端支持超时自动清零、默认值500ms

**异常与回退功能**：
- 异常隔离：单一异常不影响整体运行、异常不扩散至其他功能域
- 单一清零流程：键盘按键释放、手柄状态归零、状态一致性恢复
- 行为可重复性：相同操作与异常应产生一致结果

### 1.3 测试流程需求总结

根据[tests/AndroidClient/main.md](file:///c:\Users\15013\Projects\WMMTRemoteController\doc\tests\AndroidClient\main.md)，Android客户端测试流程包括：

**测试范围**：
- 触控输入采集
- 物理按键输入
- 传感器输入
- 布局加载与切换
- LayoutEngine执行
- ControlResultState生成
- WebSocket发送
- 禁用/清零行为
- 异常与断连处理

**测试流程**：
1. 启动与初始化测试
2. 输入采集测试
3. 布局加载与切换测试
4. LayoutEngine执行测试
5. ControlResultState生成测试
6. WebSocket发送测试
7. 异常与安全测试

**测试覆盖率要求**：
- 输入采集覆盖率：100%
- LayoutEngine分支覆盖率：100%
- ControlResultState字段覆盖率：100%
- 异常路径覆盖率：100%

---

## 二、测试架构设计

### 2.1 整体架构

```
WMMT Remote Controller E2E Test Architecture (Requirements-Driven)
├── Test Framework (测试框架)
│   ├── Test Runner (测试运行器)
│   ├── Test Reporter (测试报告器)
│   └── Test Utilities (测试工具)
├── Test Modules (测试模块)
│   ├── Backend Management Module (后端管理模块)
│   ├── Android Build Module (Android编译模块)
│   ├── Device Management Module (设备管理模块)
│   ├── App Installation Module (应用安装模块)
│   ├── UI Interaction Module (UI交互模块)
│   ├── WebSocket Communication Module (WebSocket通信模块)
│   ├── Input Simulation Module (输入模拟模块)
│   ├── Service Lifecycle Module (服务生命周期模块)
│   ├── Layout Management Module (布局管理模块)
│   ├── Control State Management Module (控制状态管理模块)
│   ├── Exception Handling Module (异常处理模块)
│   └── Cleanup Module (清理模块)
└── Test Cases (测试用例)
    ├── Input Source Acquisition Tests (输入源采集测试)
    ├── Control Semantic Processing Tests (控制语义处理测试)
    ├── Control Result Output Tests (控制结果输出测试)
    ├── Operation Layout Management Tests (操作布局管理测试)
    ├── Layout Editing Tool Tests (布局编辑工具测试)
    ├── Control State Management Tests (控制状态管理测试)
    ├── Communication & Connection Tests (通信与连接测试)
    ├── Execution Endpoint Tests (执行端测试)
    ├── Exception & Rollback Tests (异常与回退测试)
    └── Performance Tests (性能测试)
```

### 2.2 测试框架特性

- **需求驱动**：所有测试用例直接映射到需求文档中的具体需求
- **模块化设计**：每个测试模块独立，可单独运行
- **可配置性**：支持配置文件，可自定义测试参数
- **可扩展性**：易于添加新的测试模块和测试用例
- **错误处理**：完善的错误处理和恢复机制
- **日志记录**：详细的日志记录，便于调试
- **测试报告**：生成详细的测试报告
- **并行执行**：支持并行执行测试用例
- **重试机制**：支持失败重试
- **超时控制**：支持测试超时控制
- **资源清理**：完善的资源清理机制

---

## 三、测试模块设计

### 3.1 后端管理模块 (Backend Management Module)

**功能**：
- 随机端口查找
- 后端进程启动
- 后端进程停止
- 后端进程监控
- 后端输出捕获
- 后端错误处理

**接口设计**：
```javascript
class BackendManager {
    async findAvailablePort(startPort, endPort)
    async startBackend(port, config)
    async stopBackend()
    getBackendStatus()
    getBackendOutput()
    getBackendError()
    isBackendRunning()
}
```

**测试用例**：
- 测试随机端口查找功能
- 测试后端启动功能
- 测试后端停止功能
- 测试后端进程监控功能
- 测试后端输出捕获功能
- 测试后端错误处理功能

### 3.2 Android编译模块 (Android Build Module)

**功能**：
- Android应用编译
- 编译状态监控
- 编译错误处理
- 编译产物验证
- 增量编译支持

**接口设计**：
```javascript
class AndroidBuilder {
    async buildAndroidApp(config)
    async buildIncremental(config)
    getBuildStatus()
    getBuildOutput()
    getBuildError()
    verifyBuildArtifacts()
}
```

**测试用例**：
- 测试Android应用编译功能
- 测试编译状态监控功能
- 测试编译错误处理功能
- 测试编译产物验证功能
- 测试增量编译功能

### 3.3 设备管理模块 (Device Management Module)

**功能**：
- 设备自动检测
- 设备连接验证
- 设备状态监控
- 设备信息获取
- 多设备支持

**接口设计**：
```javascript
class DeviceManager {
    async getAvailableDevices()
    async getDeviceInfo(deviceId)
    async verifyDeviceConnection(deviceId)
    async monitorDeviceStatus(deviceId)
    async getDeviceProperties(deviceId)
}
```

**测试用例**：
- 测试设备自动检测功能
- 测试设备连接验证功能
- 测试设备状态监控功能
- 测试设备信息获取功能
- 测试多设备支持功能

### 3.4 应用安装模块 (App Installation Module)

**功能**：
- APK安装
- 应用卸载
- 应用启动
- 应用停止
- 应用状态验证
- 应用权限检查

**接口设计**：
```javascript
class AppInstaller {
    async installApp(deviceId, apkPath)
    async uninstallApp(deviceId, packageName)
    async launchApp(deviceId, packageName, activity)
    async stopApp(deviceId, packageName)
    async verifyAppInstalled(deviceId, packageName)
    async verifyAppRunning(deviceId, packageName)
    async checkAppPermissions(deviceId, packageName)
}
```

**测试用例**：
- 测试APK安装功能
- 测试应用卸载功能
- 测试应用启动功能
- 测试应用停止功能
- 测试应用状态验证功能
- 测试应用权限检查功能

### 3.5 UI交互模块 (UI Interaction Module)

**功能**：
- UI元素定位
- UI元素检测
- UI元素点击
- UI元素输入
- UI元素等待
- UI元素状态验证
- UI元素拖拽
- UI元素缩放

**接口设计**：
```javascript
class UIInteractor {
    async findElement(selector)
    async findElements(selector)
    async clickElement(selector)
    async inputText(selector, text)
    async waitForElement(selector, timeout)
    async verifyElementState(selector, state)
    async getElementText(selector)
    async getElementAttribute(selector, attribute)
    async screenshot(filename)
    async dragElement(selector, x, y)
    async scaleElement(selector, scale)
}
```

**测试用例**：
- 测试UI元素定位功能
- 测试UI元素检测功能
- 测试UI元素点击功能
- 测试UI元素输入功能
- 测试UI元素等待功能
- 测试UI元素状态验证功能
- 测试UI元素拖拽功能
- 测试UI元素缩放功能

### 3.6 WebSocket通信模块 (WebSocket Communication Module)

**功能**：
- WebSocket连接
- WebSocket断开
- WebSocket消息发送
- WebSocket消息接收
- WebSocket消息验证
- WebSocket错误处理
- 延迟测量

**接口设计**：
```javascript
class WebSocketCommunicator {
    async connect(url)
    async disconnect()
    async sendMessage(message)
    async onMessage(callback)
    async waitForMessage(type, timeout)
    async verifyMessage(message)
    async getMessages()
    async clearMessages()
    measureLatency()
}
```

**测试用例**：
- 测试WebSocket连接功能
- 测试WebSocket断开功能
- 测试WebSocket消息发送功能
- 测试WebSocket消息接收功能
- 测试WebSocket消息验证功能
- 测试WebSocket错误处理功能
- 测试延迟测量功能

### 3.7 输入模拟模块 (Input Simulation Module)

**功能**：
- 触控输入模拟
- 陀螺仪输入模拟
- 键盘输入模拟
- 手柄输入模拟
- 多点触控模拟
- 手势输入模拟
- 输入事件验证

**接口设计**：
```javascript
class InputSimulator {
    async simulateTouch(x, y, pressure)
    async simulateMultiTouch(touches)
    async simulateGyroscope(x, y, z)
    async simulateKeyPress(key)
    async simulateKeySequence(keys)
    async simulateGamepadButton(buttonId, state)
    async simulateGamepadAxis(axisId, value)
    async simulateGesture(gesture)
    async verifyInputEvent(event)
}
```

**测试用例**：
- 测试触控输入模拟功能
- 测试陀螺仪输入模拟功能
- 测试键盘输入模拟功能
- 测试手柄输入模拟功能
- 测试多点触控模拟功能
- 测试手势输入模拟功能
- 测试输入事件验证功能

### 3.8 服务生命周期模块 (Service Lifecycle Module)

**功能**：
- 服务启动
- 服务停止
- 服务重启
- 服务状态监控
- 服务状态验证
- 服务错误处理

**接口设计**：
```javascript
class ServiceLifecycleManager {
    async startService(deviceId)
    async stopService(deviceId)
    async restartService(deviceId)
    async monitorServiceStatus(deviceId)
    async verifyServiceStatus(deviceId, expectedStatus)
    async handleServiceError(deviceId, error)
}
```

**测试用例**：
- 测试服务启动功能
- 测试服务停止功能
- 测试服务重启功能
- 测试服务状态监控功能
- 测试服务状态验证功能
- 测试服务错误处理功能

### 3.9 布局管理模块 (Layout Management Module)

**功能**：
- 布局创建
- 布局删除
- 布局修改
- 布局切换
- 布局导入
- 布局导出
- 布局验证

**接口设计**：
```javascript
class LayoutManager {
    async createLayout(name, elements)
    async deleteLayout(layoutId)
    async modifyLayout(layoutId, elements)
    async switchLayout(layoutId)
    async importLayout(source)
    async exportLayout(layoutId, destination)
    async validateLayout(layout)
}
```

**测试用例**：
- 测试布局创建功能
- 测试布局删除功能
- 测试布局修改功能
- 测试布局切换功能
- 测试布局导入功能
- 测试布局导出功能
- 测试布局验证功能

### 3.10 控制状态管理模块 (Control State Management Module)

**功能**：
- 控制启用
- 控制禁用
- 控制状态查询
- 控制状态验证
- 控制状态清零
- 控制状态持久化

**接口设计**：
```javascript
class ControlStateManager {
    async enableControl()
    async disableControl()
    async getControlState()
    async verifyControlState(expectedState)
    async clearControlState()
    async persistControlState(state)
}
```

**测试用例**：
- 测试控制启用功能
- 测试控制禁用功能
- 测试控制状态查询功能
- 测试控制状态验证功能
- 测试控制状态清零功能
- 测试控制状态持久化功能

### 3.11 异常处理模块 (Exception Handling Module)

**功能**：
- 异常捕获
- 异常记录
- 异常隔离
- 异常恢复
- 异常报告
- 异常重试

**接口设计**：
```javascript
class ExceptionHandler {
    async captureException(error)
    async logException(error)
    async isolateException(error)
    async recoverFromException(error)
    async reportException(error)
    async retryOperation(operation, maxRetries)
}
```

**测试用例**：
- 测试异常捕获功能
- 测试异常记录功能
- 测试异常隔离功能
- 测试异常恢复功能
- 测试异常报告功能
- 测试异常重试功能

### 3.12 清理模块 (Cleanup Module)

**功能**：
- 后端进程清理
- 应用进程清理
- 临时文件清理
- 资源释放
- 环境恢复

**接口设计**：
```javascript
class CleanupManager {
    async cleanupBackend()
    async cleanupApp(deviceId)
    async cleanupTempFiles()
    async releaseResources()
    async restoreEnvironment()
}
```

**测试用例**：
- 测试后端进程清理功能
- 测试应用进程清理功能
- 测试临时文件清理功能
- 测试资源释放功能
- 测试环境恢复功能

---

## 四、测试用例设计

### 4.1 输入源采集测试 (Input Source Acquisition Tests)

#### TC-INPUT-001: 触控输入采集测试

**需求映射**：requirements.md §4.1、function.md §4

**测试目标**：验证系统能够正确采集触控输入

**测试步骤**：
1. 启动应用
2. 在屏幕上执行单点触控操作
3. 验证触控事件被正确采集
4. 验证触控事件包含正确的坐标和压力信息
5. 验证触控事件被正确转换为Operation

**预期结果**：
- 触控事件被正确采集
- 触控事件包含正确的坐标和压力信息
- 触控事件被正确转换为Operation

**验证点**：
- 触控事件存在
- 触控坐标正确
- 触控压力正确
- Operation生成正确

#### TC-INPUT-002: 多点触控输入采集测试

**需求映射**：requirements.md §4.1、function.md §4

**测试目标**：验证系统能够同时采集多点触控输入

**测试步骤**：
1. 启动应用
2. 在屏幕上执行多点触控操作
3. 验证多点触控事件被正确采集
4. 验证多点触控事件包含所有触控点信息
5. 验证多点触控事件被正确转换为Operation

**预期结果**：
- 多点触控事件被正确采集
- 多点触控事件包含所有触控点信息
- 多点触控事件被正确转换为Operation

**验证点**：
- 多点触控事件存在
- 所有触控点信息正确
- Operation生成正确

#### TC-INPUT-003: 陀螺仪输入采集测试

**需求映射**：requirements.md §4.1、function.md §4

**测试目标**：验证系统能够正确采集陀螺仪输入

**测试步骤**：
1. 启动应用
2. 旋转设备
3. 验证陀螺仪事件被正确采集
4. 验证陀螺仪事件包含正确的x、y、z值
5. 验证陀螺仪事件被正确转换为Operation

**预期结果**：
- 陀螺仪事件被正确采集
- 陀螺仪事件包含正确的x、y、z值
- 陀螺仪事件被正确转换为Operation

**验证点**：
- 陀螺仪事件存在
- 陀螺仪坐标正确
- Operation生成正确

#### TC-INPUT-004: 键盘输入采集测试

**需求映射**：requirements.md §4.1、function.md §4

**测试目标**：验证系统能够正确采集键盘输入

**测试步骤**：
1. 启动应用
2. 执行键盘输入操作
3. 验证键盘事件被正确采集
4. 验证键盘事件包含正确的按键ID和状态
5. 验证键盘事件被正确转换为Operation

**预期结果**：
- 键盘事件被正确采集
- 键盘事件包含正确的按键ID和状态
- 键盘事件被正确转换为Operation

**验证点**：
- 键盘事件存在
- 键盘按键ID正确
- 键盘按键状态正确
- Operation生成正确

### 4.2 控制语义处理测试 (Control Semantic Processing Tests)

#### TC-SEMANTIC-001: 状态驱动模型测试

**需求映射**：requirements.md §5.1、function.md §5

**测试目标**：验证系统采用状态驱动控制模型

**测试步骤**：
1. 执行一系列输入操作
2. 验证任意时刻的控制可被描述为"当前状态"
3. 验证控制中断后状态可被明确清空
4. 验证不依赖历史事件顺序形成隐式状态

**预期结果**：
- 控制状态可被完整描述
- 控制中断后状态可被清空
- 控制状态不依赖历史事件

**验证点**：
- 控制状态完整
- 控制状态清空正确
- 控制状态独立

#### TC-SEMANTIC-002: 控制刷新能力测试

**需求映射**：requirements.md §5.2、function.md §5

**测试目标**：验证系统支持不低于125Hz的控制状态更新能力

**测试步骤**：
1. 持续执行输入操作
2. 测量控制状态更新频率
3. 验证控制状态更新频率不低于125Hz

**预期结果**：
- 控制状态更新频率不低于125Hz
- 控制状态更新稳定

**验证点**：
- 控制状态更新频率≥125Hz
- 控制状态更新稳定

#### TC-SEMANTIC-003: 控制平滑与映射测试

**需求映射**：requirements.md §5.3、function.md §5

**测试目标**：验证系统支持连续控制平滑、死区设置、非线性映射

**测试步骤**：
1. 执行连续输入操作
2. 验证控制输出平滑
3. 验证死区设置正确
4. 验证非线性映射正确

**预期结果**：
- 控制输出平滑
- 死区设置正确
- 非线性映射正确

**验证点**：
- 控制输出平滑
- 死区设置生效
- 非线性映射生效

### 4.3 控制结果输出测试 (Control Result Output Tests)

#### TC-OUTPUT-001: 键盘控制结果测试

**需求映射**：requirements.md §6.1、function.md §6

**测试目标**：验证系统能够生成等价于真实键盘输入的控制结果

**测试步骤**：
1. 执行键盘输入操作
2. 验证键盘控制结果生成
3. 验证多按键同时生效
4. 验证持续按键在释放前保持有效
5. 验证异常中断后按键状态被清空

**预期结果**：
- 键盘控制结果生成正确
- 多按键同时生效
- 持续按键保持有效
- 异常中断后按键状态清空

**验证点**：
- 键盘控制结果正确
- 多按键同时生效
- 持续按键保持有效
- 异常中断后清空

#### TC-OUTPUT-002: 手柄控制结果测试

**需求映射**：requirements.md §6.2、function.md §6

**测试目标**：验证系统能够生成等价于真实游戏手柄输入的控制结果

**测试步骤**：
1. 执行手柄输入操作
2. 验证手柄控制结果生成
3. 验证摇杆与扳机为连续模拟量
4. 验证多轴、多按键同时存在
5. 验证异常中断后手柄状态被重置

**预期结果**：
- 手柄控制结果生成正确
- 摇杆与扳机为连续模拟量
- 多轴多按键同时存在
- 异常中断后手柄状态重置

**验证点**：
- 手柄控制结果正确
- 摇杆与扳机连续
- 多轴多按键同时存在
- 异常中断后重置

### 4.4 操作布局管理测试 (Operation Layout Management Tests)

#### TC-LAYOUT-001: 布局创建测试

**需求映射**：requirements.md §7、function.md §7

**测试目标**：验证系统能够创建新的操作布局

**测试步骤**：
1. 执行布局创建操作
2. 验证布局被成功创建
3. 验证布局包含正确的元素
4. 验证布局可被使用

**预期结果**：
- 布局被成功创建
- 布局包含正确的元素
- 布局可被使用

**验证点**：
- 布局创建成功
- 布局元素正确
- 布局可用

#### TC-LAYOUT-002: 布局删除测试

**需求映射**：requirements.md §7、function.md §7

**测试目标**：验证系统能够删除操作布局

**测试步骤**：
1. 执行布局删除操作
2. 验证布局被成功删除
3. 验证删除后其他布局不受影响

**预期结果**：
- 布局被成功删除
- 其他布局不受影响

**验证点**：
- 布局删除成功
- 其他布局正常

#### TC-LAYOUT-003: 布局切换测试

**需求映射**：requirements.md §7、function.md §7

**测试目标**：验证系统能够切换操作布局

**测试步骤**：
1. 执行布局切换操作
2. 验证布局被成功切换
3. 验证新布局立即生效
4. 验证切换不产生残留控制状态

**预期结果**：
- 布局被成功切换
- 新布局立即生效
- 无残留控制状态

**验证点**：
- 布局切换成功
- 新布局生效
- 无残留状态

#### TC-LAYOUT-004: 多布局管理测试

**需求映射**：requirements.md §7.3、function.md §7

**测试目标**：验证系统能够同时管理多套布局

**测试步骤**：
1. 创建多个布局
2. 在不同布局间切换
3. 验证布局之间互不影响
4. 验证切换即时生效

**预期结果**：
- 多个布局可同时管理
- 布局之间互不影响
- 切换即时生效

**验证点**：
- 多布局管理正确
- 布局互不影响
- 切换即时生效

### 4.5 布局编辑工具测试 (Layout Editing Tool Tests)

#### TC-EDIT-001: 操作元素管理测试

**需求映射**：requirements.md §8、function.md §8

**测试目标**：验证布局编辑工具支持操作元素管理

**测试步骤**：
1. 打开布局编辑工具
2. 添加操作元素
3. 删除操作元素
4. 调整操作元素
5. 验证所有操作正确执行

**预期结果**：
- 操作元素可被添加
- 操作元素可被删除
- 操作元素可被调整

**验证点**：
- 操作元素添加正确
- 操作元素删除正确
- 操作元素调整正确

#### TC-EDIT-002: 布局结构调整测试

**需求映射**：requirements.md §8.2、function.md §8

**测试目标**：验证布局编辑工具支持布局结构调整

**测试步骤**：
1. 打开布局编辑工具
2. 调整操作区域位置
3. 调整操作区域尺寸
4. 验证调整结果正确

**预期结果**：
- 操作区域位置可被调整
- 操作区域尺寸可被调整
- 调整结果正确

**验证点**：
- 操作区域位置调整正确
- 操作区域尺寸调整正确
- 调整结果正确

#### TC-EDIT-003: 实时预览测试

**需求映射**：requirements.md §8.4、function.md §8

**测试目标**：验证布局编辑工具支持实时预览

**测试步骤**：
1. 打开布局编辑工具
2. 执行编辑操作
3. 验证控制行为变化可被实时观察
4. 验证预览结果正确

**预期结果**：
- 控制行为变化可被实时观察
- 预览结果正确

**验证点**：
- 实时预览功能正常
- 控制行为变化可见
- 预览结果正确

### 4.6 控制状态管理测试 (Control State Management Tests)

#### TC-STATE-001: 控制启用与禁用测试

**需求映射**：requirements.md §9、function.md §9

**测试目标**：验证系统能够启用和禁用控制输出

**测试步骤**：
1. 启用控制
2. 验证控制输出正常
3. 禁用控制
4. 验证控制输出停止
5. 验证禁用不影响布局和连接状态

**预期结果**：
- 控制可被启用
- 控制可被禁用
- 禁用状态不影响其他功能

**验证点**：
- 控制启用正确
- 控制禁用正确
- 其他功能不受影响

#### TC-STATE-002: 控制作用范围测试

**需求映射**：requirements.md §9.2、function.md §9

**测试目标**：验证控制默认对宿主环境全局生效

**测试步骤**：
1. 在不同应用中设置控制作用范围
2. 验证控制作用范围正确应用
3. 验证控制作用范围不基于当前运行应用筛选

**预期结果**：
- 控制作用范围正确应用
- 控制作用范围不基于当前应用筛选

**验证点**：
- 控制作用范围正确
- 控制作用范围全局生效
- 控制作用范围不筛选

#### TC-STATE-003: 安全机制介入测试

**需求映射**：requirements.md §9.3、function.md §9

**测试目标**：验证安全机制介入时立即进入零输出状态

**测试步骤**：
1. 触发安全机制（UAC权限、系统安全机制等）
2. 验证控制输出立即进入零状态
3. 验证提供可感知中断反馈

**预期结果**：
- 控制输出立即进入零状态
- 提供中断反馈

**验证点**：
- 零输出状态正确
- 中断反馈正确
- 安全机制响应正确

### 4.7 通信与连接测试 (Communication & Connection Tests)

#### TC-COMM-001: WebSocket连接测试

**需求映射**：requirements.md §10、function.md §10

**测试目标**：验证系统能够通过WebSocket传输控制数据

**测试步骤**：
1. 启动后端服务器
2. 连接WebSocket服务器
3. 验证连接成功
4. 验证欢迎消息接收

**预期结果**：
- WebSocket连接成功
- 接收到欢迎消息

**验证点**：
- WebSocket连接成功
- 欢迎消息接收正确

#### TC-COMM-002: 控制数据持续发送测试

**需求映射**：requirements.md §10.1、function.md §10

**测试目标**：验证控制数据持续发送

**测试步骤**：
1. 连接WebSocket服务器
2. 执行输入操作
3. 验证控制数据持续发送
4. 验证发送频率正确

**预期结果**：
- 控制数据持续发送
- 发送频率正确

**验证点**：
- 控制数据发送持续
- 发送频率正确
- 数据格式正确

#### TC-COMM-003: ACK确认机制测试

**需求映射**：requirements.md §10.2、function.md §10

**测试目标**：验证ACK确认机制正确工作

**测试步骤**：
1. 发送控制消息
2. 验证ACK消息接收
3. 验证ACK消息包含正确的控制结果ID
4. 验证ACK消息确认执行

**预期结果**：
- ACK消息正确接收
- ACK消息包含正确的控制结果ID
- ACK消息确认执行

**验证点**：
- ACK消息接收正确
- ACK消息格式正确
- ACK消息ID正确

#### TC-COMM-004: 延迟检测与告警测试

**需求映射**：requirements.md §10.3、function.md §10

**测试目标**：验证延迟检测与告警正确工作

**测试步骤**：
1. 发送控制消息
2. 测量延迟
3. 验证延迟≤50ms正常
4. 验证延迟>50ms黄色警告
5. 验证延迟>100ms红色严重警告

**预期结果**：
- 延迟测量正确
- 告警正确触发

**验证点**：
- 延迟测量正确
- 告警触发正确
- 告警级别正确

### 4.8 执行端测试 (Execution Endpoint Tests)

#### TC-EXEC-001: 控制结果执行测试

**需求映射**：requirements.md §11、function.md §11

**测试目标**：验证执行端能够接收并执行控制结果

**测试步骤**：
1. 发送控制消息
2. 验证控制结果被执行
3. 验证当前控制状态维护

**预期结果**：
- 控制结果被执行
- 当前控制状态维护

**验证点**：
- 控制结果执行正确
- 控制状态维护正确

#### TC-EXEC-002: 执行端安全回退测试

**需求映射**：requirements.md §11.2、function.md §11

**测试目标**：验证执行端具备独立清零能力

**测试步骤**：
1. 连接中断
2. 验证控制结果停止
3. 验证控制异常
4. 验证客户端禁用
5. 验证超时自动清零

**预期结果**：
- 连接中断时控制结果停止
- 控制异常时处理正确
- 客户端禁用时停止发送
- 超时时自动清零

**验证点**：
- 连接中断处理正确
- 控制异常处理正确
- 客户端禁用处理正确
- 超时清零正确

#### TC-EXEC-003: 超时清空配置测试

**需求映射**：requirements.md §11.3、function.md §11

**测试目标**：验证超时清空配置正确工作

**测试步骤**：
1. 设置超时清空配置
2. 等待超时
3. 验证控制状态自动清零
4. 验证默认值500ms

**预期结果**：
- 超时时控制状态自动清零
- 默认值500ms

**验证点**：
- 超时清零正确
- 默认值正确

### 4.9 异常与回退测试 (Exception & Rollback Tests)

#### TC-EXCEPT-001: 异常隔离测试

**需求映射**：requirements.md §12、function.md §12

**测试目标**：验证单一异常不影响整体运行

**测试步骤**：
1. 触发单一异常
2. 验证异常不影响整体运行
3. 验证异常不扩散至其他功能域

**预期结果**：
- 单一异常不影响整体运行
- 异常不扩散

**验证点**：
- 异常隔离正确
- 整体运行正常
- 其他功能域正常

#### TC-EXCEPT-002: 单一清零流程测试

**需求映射**：requirements.md §12.2、function.md §12

**测试目标**：验证单一清零流程正确工作

**测试步骤**：
1. 触发清零流程
2. 验证键盘按键释放
3. 验证手柄状态归零
4. 验证状态一致性恢复

**预期结果**：
- 键盘按键释放
- 手柄状态归零
- 状态一致性恢复

**验证点**：
- 键盘按键释放正确
- 手柄状态归零正确
- 状态一致性恢复正确

#### TC-EXCEPT-003: 行为可重复性测试

**需求映射**：requirements.md §12.3、function.md §12

**测试目标**：验证相同操作与异常应产生一致结果

**测试步骤**：
1. 执行相同操作
2. 触发相同异常
3. 验证结果一致

**预期结果**：
- 相同操作产生一致结果
- 相同异常产生一致结果

**验证点**：
- 操作结果一致
- 异常结果一致
- 行为可重复

### 4.10 性能测试 (Performance Tests)

#### TC-PERF-001: 控制刷新频率测试

**需求映射**：requirements.md §5.2、function.md §5

**测试目标**：验证控制刷新频率不低于125Hz

**测试步骤**：
1. 持续执行输入操作
2. 测量控制状态更新频率
3. 验证控制状态更新频率不低于125Hz

**预期结果**：
- 控制状态更新频率不低于125Hz

**验证点**：
- 控制状态更新频率≥125Hz
- 控制状态更新稳定

#### TC-PERF-002: 延迟测试

**需求映射**：requirements.md §10.3、function.md §10

**测试目标**：验证延迟在可接受范围内

**测试步骤**：
1. 发送控制消息
2. 测量延迟
3. 验证延迟≤50ms

**预期结果**：
- 延迟≤50ms

**验证点**：
- 延迟≤50ms
- 延迟稳定

---

## 五、测试报告设计

### 5.1 测试报告格式

```json
{
  "testRunId": "unique-test-run-id",
  "timestamp": "2026-02-10T00:00:00Z",
  "requirements": {
    "document": "requirements.md",
    "version": "final"
  },
  "environment": {
    "os": "Windows",
    "nodeVersion": "v18.0.0",
    "adbVersion": "1.0.41",
    "deviceId": "localhost:16384",
    "backendPort": 57128
  },
  "summary": {
    "totalTests": 30,
    "passedTests": 30,
    "failedTests": 0,
    "skippedTests": 0,
    "passRate": "100%",
    "duration": "180s"
  },
  "testResults": [
    {
      "testCaseId": "TC-INPUT-001",
      "name": "触控输入采集测试",
      "requirementId": "4.1",
      "status": "passed",
      "duration": "5s",
      "verificationPoints": [
        {
          "pointId": 1,
          "name": "触控事件存在",
          "status": "passed"
        },
        {
          "pointId": 2,
          "name": "触控坐标正确",
          "status": "passed"
        }
      ],
      "error": null
    }
  ],
  "requirementsCoverage": {
    "inputSourceAcquisition": {
      "total": 4,
      "passed": 4,
      "passRate": "100%"
    },
    "controlSemanticProcessing": {
      "total": 3,
      "passed": 3,
      "passRate": "100%"
    },
    "controlResultOutput": {
      "total": 2,
      "passed": 2,
      "passRate": "100%"
    },
    "operationLayoutManagement": {
      "total": 4,
      "passed": 4,
      "passRate": "100%"
    },
    "layoutEditingTool": {
      "total": 3,
      "passed": 3,
      "passRate": "100%"
    },
    "controlStateManagement": {
      "total": 3,
      "passed": 3,
      "passRate": "100%"
    },
    "communicationConnection": {
      "total": 4,
      "passed": 4,
      "passRate": "100%"
    },
    "executionEndpoint": {
      "total": 3,
      "passed": 3,
      "passRate": "100%"
    },
    "exceptionRollback": {
      "total": 3,
      "passed": 3,
      "passRate": "100%"
    },
    "performance": {
      "total": 2,
      "passed": 2,
      "passRate": "100%"
    }
  },
  "errors": [],
  "warnings": []
}
```

### 5.2 测试报告输出

- **控制台输出**：实时显示测试进度和结果
- **JSON文件**：生成详细的JSON格式测试报告
- **HTML文件**：生成可视化的HTML格式测试报告
- **JUnit XML**：生成JUnit格式的测试报告，便于CI/CD集成

---

## 六、实施计划

### 6.1 实施阶段

**阶段1：测试框架搭建**
- 实现测试运行器
- 实现测试报告器
- 实现测试工具库
- 实现配置管理

**阶段2：测试模块实现**
- 实现后端管理模块
- 实现Android编译模块
- 实现设备管理模块
- 实现应用安装模块
- 实现UI交互模块
- 实现WebSocket通信模块
- 实现输入模拟模块
- 实现服务生命周期模块
- 实现布局管理模块
- 实现控制状态管理模块
- 实现异常处理模块
- 实现清理模块

**阶段3：测试用例实现**
- 实现输入源采集测试用例（4个）
- 实现控制语义处理测试用例（3个）
- 实现控制结果输出测试用例（2个）
- 实现操作布局管理测试用例（4个）
- 实现布局编辑工具测试用例（3个）
- 实现控制状态管理测试用例（3个）
- 实现通信与连接测试用例（4个）
- 实现执行端测试用例（3个）
- 实现异常与回退测试用例（3个）
- 实现性能测试用例（2个）

**阶段4：测试和优化**
- 执行所有测试用例
- 修复发现的问题
- 优化测试性能
- 完善测试文档

### 6.2 优先级

**高优先级**：
- 输入源采集测试
- 控制语义处理测试
- 控制结果输出测试
- 操作布局管理测试
- 通信与连接测试
- 执行端测试
- 异常与回退测试

**中优先级**：
- 布局编辑工具测试
- 控制状态管理测试
- 性能测试

---

## 七、总结

本测试方案根据项目需求文档，设计了完整的Appium端到端测试架构，包括：

1. **需求驱动设计**：所有测试用例直接映射到需求文档中的具体需求
2. **全面的测试模块**：12个测试模块，覆盖所有核心功能
3. **完整的测试用例**：30个测试用例，覆盖各种场景
4. **完善的错误处理**：错误捕获、记录、恢复、报告
5. **详细的测试报告**：JSON、HTML、JUnit多种格式，包含需求覆盖率
6. **灵活的配置**：支持配置文件和环境变量
7. **可扩展性**：易于添加新的测试模块和测试用例
8. **资源清理**：完善的资源清理机制

该测试方案能够全面验证WMMT Remote Controller项目的功能完整性和稳定性，确保满足所有需求文档中的要求。
