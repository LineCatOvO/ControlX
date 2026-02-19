# 当前任务：虚拟手柄相关处理

**开始时间**: 2026-02-19
**目标**: 实现游戏手柄 ViGEmBus 检测、连接管理和降级方案

## 任务策略

**核心目标**：
1. 实现完善的 ViGEmBus 检测和连接管理
2. 当 ViGEmBus 驱动不可用时提供友好的错误处理和降级方案
3. 提示用户安装 ViGEmBus，未安装时只能使用键盘映射
4. vigemclient 作为普通依赖，但代码需优雅处理驱动未安装的情况

## 执行记录

### 2026-02-19 完成的工作

**1. 重构 GamepadXInputAdapter.ts**
- ✅ 移除了循环导入（之前从自身导入自己）
- ✅ 实现了 ViGEmBus 动态加载（try-catch 处理模块加载失败）
- ✅ 实现了 detect() 方法检测驱动可用性
- ✅ 实现了 connect()/disconnect() 连接管理
- ✅ 实现了完整的 XInput 状态映射（4 轴、14 按钮、2 扳机）
- ✅ 实现了状态提交（submitState 通过 vigemclient.sendState）
- ✅ 实现了值范围限制（轴 [-1.0, 1.0]，扳机 [0.0, 1.0]）

**2. 创建 GamepadAdapter.ts**
- ✅ 封装 GamepadXInputAdapter
- ✅ 实现 initialize() 检测和连接
- ✅ 实现降级逻辑（ViGEmBus 不可用时禁用）
- ✅ 提供友好的用户提示信息
- ✅ 实现 applyState() 和 reset() 方法

**3. 更新 GamepadExecutor.ts**
- ✅ 集成 GamepadAdapter
- ✅ 实现启用状态检查 isEnabled()
- ✅ ViGEmBus 不可用时优雅降级（跳过游戏手柄，键盘仍可用）
- ✅ 添加详细的日志输出

**4. 更新 package.json**
- ✅ 添加 vigemclient: "^1.0.3" 为依赖

**5. 更新 adapters/index.ts**
- ✅ 修正导出路径

**6. 编译验证**
- ✅ 游戏手柄相关代码编译通过

### 代码关键点

**GamepadXInputAdapter 检测流程**：
```typescript
// 1. 尝试动态加载 vigemclient 模块
try {
    this.vigemClient = require('vigemclient');
    console.log('🎮 GamepadXInputAdapter: ViGEmClient loaded successfully');
} catch (error: any) {
    console.warn('⚠️  GamepadXInputAdapter: ViGEmClient not available');
    // 记录警告，但不抛出异常
}

// 2. 检测驱动是否可用
detect(): ViGEmDetectionResult {
    if (!this.vigemClient) {
        return { available: false, error: 'ViGEmClient module not loaded' };
    }
    try {
        const testController = this.vigemClient.createX360Controller();
        return { available: true };
    } catch (error) {
        return { available: false, error: error.message };
    }
}
```

**降级策略**：
```
┌─────────────────────────────────────┐
│   Server 启动                       │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   GamepadExecutor 初始化            │
│   → 创建 GamepadXInputAdapter       │
│   → 创建 GamepadAdapter             │
│   → 调用 initialize()               │
└─────────────┬───────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ ViGEmBus 可用？     │
    └────┬────────────┬───┘
         │ 是         │ 否
         │            │
         ▼            ▼
    ┌─────────┐  ┌────────────────────┐
    │ 连接    │  │ 记录警告日志       │
    │ 启用    │  │ 显示安装说明       │
    │ 游戏手柄│  │ 禁用游戏手柄       │
    └─────────┘  │ 键盘映射继续工作   │
                 └────────────────────┘
```

**用户提示信息**：
```
⚠️  GamepadAdapter: ViGEmBus not available
   ViGEmClient module not loaded. Please install vigemclient package.
   Gamepad functionality will be disabled.
   To enable gamepad support:
   1. Install ViGEmBus driver: https://github.com/ViGEm/ViGEmBus/releases
   2. Run: npm install vigemclient
   3. Restart the server
```

## 知识沉淀

### ViGEmBus 架构
- ViGEmBus 驱动创建虚拟 Xbox 360 控制器
- node-vigemclient 提供 Node.js 绑定
- 通过 XInput 接口提交控制器状态

### XInput 按钮映射
```typescript
const XINPUT_BUTTON = {
    A: 0x0001, B: 0x0002, X: 0x0004, Y: 0x0008,
    LB: 0x0100, RB: 0x0200,
    Start: 0x0010, Back: 0x0020, Guide: 0x0400,
    L3: 0x0040, R3: 0x0080,
    DPadUp: 0x00010000, DPadDown: 0x00020000,
    DPadLeft: 0x00040000, DPadRight: 0x00080000
};
```

### 状态提交流程
```
InputState (WebSocket)
    ↓
GamepadExecutor.applyState()
    ↓
GamepadAdapter.applyState()
    ↓
GamepadXInputAdapter.applyState()
    ↓
vigemclient.sendState()
    ↓
Virtual Xbox 360 Controller
    ↓
Windows Input System
    ↓
Game
```

### 注意事项
- vigemclient 是 native addon，需要 Windows 环境编译
- ViGEmBus 驱动安装需要管理员权限
- 代码需要优雅处理模块加载失败和驱动未安装两种情况
- 当前开发环境是 Linux，无法实际测试 ViGEmBus 功能
- 在 Windows 上运行时，需要先安装 ViGEmBus 驱动

## 待办事项

- [x] 修复 GamepadXInputAdapter 循环导入
- [x] 实现 ViGEmBus 检测模块
- [x] 实现连接管理器
- [x] 实现降级方案（键盘映射 fallback）
- [x] 添加用户友好的提示信息
- [x] 将 vigemclient 添加为依赖
- [x] 验证代码编译通过（游戏手柄相关）
- [ ] 更新 TASKS.md 任务状态
- [ ] 在 Windows 环境下测试 ViGEmBus 功能
