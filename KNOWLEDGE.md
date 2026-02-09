# 项目知识库

## 项目基本信息

- 项目名称：WMMT Remote Controller
- 项目描述：一个用于远程控制的软件应用，支持游戏手柄等输入设备的远程控制
- 项目类型：跨平台远程控制解决方案（Android客户端 + Node.js服务端）

## 技术架构分析

### 整体架构

```
WMMT Remote Controller
├── AndroidClient/          # Android客户端（控制端）
├── Server/                 # Node.js服务端（被控制端）
└── doc/                    # 项目文档
```

### Android客户端架构

- **开发语言**：Java (Java 11)
- **SDK版本**：minSdk 28, targetSdk 36, compileSdk 36
- **架构模式**：三层架构（ControlNode/ControlAction/DeviceMapping）
- **包结构**：
  - `com.linecat.wmmtcontroller.control` - 控制层（新架构核心）
  - `com.linecat.wmmtcontroller.input` - 输入处理核心
  - `com.linecat.wmmtcontroller.service` - 服务层
  - `com.linecat.wmmtcontroller.model` - 数据模型
  - `com.linecat.wmmtcontroller.network` - 网络通信

### 服务端架构

- **开发语言**：TypeScript (Node.js)
- **核心框架**：Express.js + WebSocket
- **架构特点**：模块化设计，WebSocket层与输入执行层分离
- **目录结构**：
  - `src/ws/` - WebSocket相关
  - `src/input/` - 输入处理
  - `src/config/` - 配置管理
  - `src/types/` - 类型定义

## 核心技术栈

### Android客户端依赖

- **UI框架**：AndroidX AppCompat, Material Design
- **网络通信**：OkHttp (WebSocket)
- **数据处理**：Gson (JSON序列化)
- **测试框架**：JUnit, Mockito, Espresso, AssertJ

### 服务端依赖

- **Web框架**：Express.js
- **WebSocket**：ws库
- **输入控制**：node-key-sender
- **跨域支持**：cors
- **配置管理**：dotenv
- **测试框架**：Jest
- **类型检查**：TypeScript

## 项目特色功能

### Android客户端特性

- 三层架构控制系统（UI层/操作层/映射层）
- 支持多种输入设备（游戏手柄、键盘、鼠标、陀螺仪）
- 脚本引擎支持（JavaScript）
- 浮窗管理和系统监控
- 布局引擎和区域识别
- **Debug模式支持**：可绕过浮窗权限进行测试
- **输入事件模拟**：支持触摸和陀螺仪事件的程序化模拟

### 服务端特性

- WebSocket实时通信
- 输入状态管理和执行
- 配置热更新
- 心跳检测机制
- TypeScript类型安全

## 开发框架规范

基于 AGENTS.md 的文档驱动开发模式：

1. 所有开发活动必须围绕文档进行
2. 严格执行文档优先原则
3. 采用循环迭代的开发方式
4. 强调实时文档更新

## 已知约束条件

- 必须遵循 AGENTS.md 定义的工作流程
- 文档是唯一可信的信息源
- 禁止在上下文中保留未文档化的内容
- 每轮只能推进最小可验证步骤

## 开发最佳实践

- 操作前先查询相关文档
- 实时记录执行过程和结果
- 及时归档可复用的知识
- 保持文档与代码同步更新

## 环境相关信息

- 操作系统：Windows
- 工作目录：c:\Users\15013\Projects\WMMTRemoteController
- 当前时间：2026-02-10

## 端口配置信息

- 服务端支持自动端口选择：在测试模式下会从10000-60000范围内随机选择端口
- 本次测试使用端口：3002
- Appium服务器端口：4723
- 服务器会在端口被占用时自动尝试下一个可用端口（最多尝试5次）

## 浮窗权限处理变更

- 移除了MainActivity中的自动浮窗权限检查和跳转逻辑
- InputRuntimeService现在会自动检测浮窗权限状态
- 有权限时使用SYSTEM_OVERLAY模式，无权限时使用ACTIVITY_PANEL模式
- 应用可以在无浮窗权限情况下正常启动核心服务
- 用户可以手动在系统设置中授予浮窗权限以获得完整功能
