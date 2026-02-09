# 升级终端监控器为blessed UI

## 目标
将现有的基于ANSI转义序列的终端监控器升级为使用blessed库的终端UI，分离核心逻辑和UI渲染，消除日志冲突和频闪问题。

## 实现步骤

### 1. 安装依赖
- 安装blessed库：`npm install blessed`
- 安装TypeScript类型定义（如果使用TypeScript）：`npm install -D @types/blessed`

### 2. 重构项目结构
- 创建`src/viewer/`目录，用于存放blessed UI相关代码
- 保留`src/runtime/`目录结构（当前代码已符合要求）

### 3. 创建blessed终端Viewer
- 新建`src/viewer/terminalViewer.ts`文件
- 实现`createViewer`函数，初始化blessed screen
- 划分布局：顶部状态面板 + 底部滚动日志区
- 实现渲染函数，将状态格式化为字符串
- 提供日志记录器，将日志路由到日志区

### 4. 迁移现有状态监控逻辑
- 将`TerminalMonitor`类的状态渲染逻辑迁移到blessed Viewer
- 保持状态模型不变，Viewer只负责渲染状态
- 实现固定刷新率驱动渲染（15 FPS）

### 5. 替换现有终端监控器
- 修改`app.ts`，使用新的blessed Viewer替代现有的`TerminalMonitor`
- 添加TUI环境变量控制，允许开关Viewer
- 实现依赖注入，将日志记录器传递给核心逻辑

### 6. 处理日志路由
- 提供viewer logger，将`console.log`等输出路由到日志区
- 实现临时的`console`拦截方案，确保现有日志正常显示
- 确保不往stdout直接输出，消除冲突

### 7. 处理终端事件
- 添加退出快捷键（q和Ctrl+C）
- 实现日志滚动快捷键（PageUp/PageDown）
- 处理终端resize事件

### 8. 测试和验证
- 测试终端UI的正常显示和交互
- 验证日志正确路由到日志区
- 测试终端resize处理
- 验证没有频闪和冲突问题

## 预期效果
- 分离核心逻辑和UI层，提高代码可维护性
- 彻底消除日志冲突和频闪问题
- 提供更美观、更交互的终端UI
- 支持日志滚动和终端resize
- 可通过环境变量开关UI，避免污染生产环境