# ControlX Android 客户端架构优化设计

**日期**: 2026-02-19  
**版本**: v2.0  
**状态**: 设计稿

---

## 📋 目录

1. [当前架构分析](#1-当前架构分析)
2. [核心问题识别](#2-核心问题识别)
3. [优化架构设计](#3-优化架构设计)
4. [分层详细设计](#4-分层详细设计)
5. [数据流设计](#5-数据流设计)
6. [迁移路径](#6-迁移路径)
7. [实施建议](#7-实施建议)

---

## 1. 当前架构分析

### 1.1 现有包结构

```
com.linecat.wmmtcontroller/
├── annotation/              # 注解类 (Experimental, Stable)
├── control/                 # 三层控制架构 (新旧混杂)
│   ├── ui/                  # UI 层节点 (ControlNode 等)
│   ├── operation/           # Operation 层 (ControlAction 等)
│   └── mapping/             # Mapping 层 (DeviceMapping 等)
├── core/layout/             # 核心布局引擎
├── database/                # 数据库
├── debug/                   # 调试工具
├── floatwindow/             # 浮窗管理
├── input/                   # 输入处理 (50+ 类，职责混杂)
├── layer/                   # 五层架构实现
├── migration/               # 迁移工具
├── model/                   # 数据模型
├── monitor/                 # 系统监控
├── service/                 # 服务层
└── util/                    # 工具类
```

### 1.2 现有架构模式

#### 五层架构 (Layer 包)

```
InputRuntimeService
├── PlatformAdaptationLayer    # 平台适配层 (传感器/触摸/Raw 事件)
├── UIInputLayer              # UI 层 (浮窗/渲染)
├── ConversionLayer           # 转换层 (坐标归一化)
├── InputAbstractionLayer     # 输入抽象层 (状态机/合并)
├── MappingLayer              # 映射层 (脚本执行)
└── NetworkLayer              # 网络层 (WebSocket)
```

#### 三层控制架构 (Control 包)

```
ThreeTierControlManager
├── UINodeManager             # UI 节点管理 (ControlNode)
├── OperationNodeManager      # Operation 管理 (ControlAction)
└── MappingNodeManager        # Mapping 管理 (DeviceMapping)
```

### 1.3 核心类职责分析

| 类名 | 当前职责 | 问题 |
|------|----------|------|
| `InputRuntimeService` | 管理 5 层生命周期 + 组件协调 | 职责过重，违反单一职责 |
| `InputAbstractionLayer` | 指针状态机 + 事件合并 + 归一化 | 混合多层职责 |
| `PlatformAdaptationLayer` | Overlay + 传感器 + 触摸 + Raw 事件 | 职责清晰但耦合重 |
| `LayoutEngine` (旧) | 布局加载 + 渲染 + 执行 | 与新架构功能重复 |
| `EnhancedLayoutEngine` | 使用三层架构管理布局 | 新架构但未完全整合 |
| `ThreeTierControlManager` | 三层架构总控 | 未与 Layer 架构整合 |
| `ProfileManager` | Profile 切换/回滚/验证 | 职责清晰 |
| `SafetyController` | 安全清零/异常处理 | 职责清晰 |
| `InputStateController` | 输出状态管理 | 职责清晰 |

---

## 2. 核心问题识别

### 2.1 架构问题矩阵

| 问题维度 | 症状描述 | 影响等级 | 优先级 |
|----------|----------|----------|--------|
| **架构双轨制** | Layer 五层架构与 Control 三层架构并存 | 🔴 高 | P0 |
| **职责边界模糊** | InputAbstractionLayer 混合状态机/合并/归一化 | 🔴 高 | P0 |
| **服务类过重** | InputRuntimeService 管理所有组件 | 🟡 中 | P1 |
| **包结构混乱** | input/ 包包含 50+ 个职责不同的类 | 🟡 中 | P1 |
| **重复代码** | LayoutEngine 新旧版本并存 | 🟡 中 | P1 |
| **依赖倒置缺失** | 高层模块直接依赖低层模块 | 🟡 中 | P2 |
| **测试困难** | 核心逻辑与 Android API 强耦合 | 🟢 低 | P2 |

### 2.2 依赖关系问题

```
❌ 当前问题依赖链:

InputRuntimeService (Service)
    ↓
InputAbstractionLayer (业务逻辑)
    ↓
PlatformAdaptationLayer (Android API)
    ↓
    SensorManager, WindowManager, etc.

问题:
1. 业务逻辑与 Android API 强耦合
2. 无法在 JVM 测试环境中测试
3. 难以替换 Mock 实现
```

### 2.3 代码重复分析

| 重复功能 | 旧实现 | 新实现 | 建议 |
|----------|--------|--------|------|
| 布局引擎 | `LayoutEngine` | `EnhancedLayoutEngine` | 迁移到新版 |
| UI 层处理 | `UILayerHandler` | `UINodeManager` + `ControlNode` | 使用新架构 |
| Operation 层 | `OperationLayerHandler` | `OperationNodeManager` + `ControlAction` | 使用新架构 |
| Mapping 层 | `MappingLayerHandler` | `MappingNodeManager` + `DeviceMapping` | 使用新架构 |
| 区域管理 | `Region`/`RegionResolver` | `ControlNode` | 使用新架构 |

---

## 3. 优化架构设计

### 3.1 架构设计原则

1. **单一职责原则 (SRP)** - 每个类只负责一个职责
2. **开闭原则 (OCP)** - 对扩展开放，对修改关闭
3. **依赖倒置原则 (DIP)** - 依赖抽象而非具体实现
4. **接口隔离原则 (ISP)** - 使用细粒度接口
5. **分层架构** - 清晰的分层边界和单向依赖

### 3.2 优化后包结构

```
com.linecat.wmmtcontroller/
├── annotation/                    # 注解类
│   ├── Experimental.java
│   └── Stable.java
│
├── core/                          # 核心业务逻辑 (纯 Java，无 Android 依赖)
│   ├── input/                     # 输入处理核心
│   │   ├── pipeline/              # 输入管道
│   │   │   ├── InputPipeline.java
│   │   │   ├── InputStage.java    # 处理阶段接口
│   │   │   ├── NormalizationStage.java
│   │   │   ├── MergeStage.java
│   │   │   └── AbstractionStage.java
│   │   ├── state/                 # 状态管理
│   │   │   ├── InputStateHolder.java
│   │   │   ├── StateValidator.java
│   │   │   └── StateMerger.java
│   │   └── processor/             # 处理器
│   │       ├── DeadzoneProcessor.java
│   │       ├── CurveProcessor.java
│   │       └── SmoothingProcessor.java
│   │
│   ├── control/                   # 三层控制架构
│   │   ├── ui/                    # UI 层
│   │   │   ├── ControlNode.java
│   │   │   ├── UINodeManager.java
│   │   │   ├── ButtonControlNode.java
│   │   │   ├── AxisControlNode.java
│   │   │   └── GyroControlNode.java
│   │   ├── operation/             # Operation 层
│   │   │   ├── ControlAction.java
│   │   │   ├── OperationNodeManager.java
│   │   │   └── ActionProcessor.java
│   │   └── mapping/               # Mapping 层
│   │       ├── DeviceMapping.java
│   │       ├── MappingNodeManager.java
│   │       └── DeviceAdapter.java
│   │
│   ├── script/                    # 脚本引擎
│   │   ├── ScriptEngine.java      # 引擎接口
│   │   ├── ScriptProfile.java
│   │   ├── ProfileManager.java
│   │   └── ScriptContext.java
│   │
│   └── safety/                    # 安全控制
│       ├── SafetyController.java
│       ├── SafetyPolicy.java
│       └── SafetyState.java
│
├── platform/                      # 平台适配层 (Android 特定实现)
│   ├── android/                   # Android 平台实现
│   │   ├── sensor/                # 传感器
│   │   │   ├── SensorManager.java
│   │   │   ├── GyroscopeSensor.java
│   │   │   └── AccelerometerSensor.java
│   │   ├── touch/                 # 触摸
│   │   │   ├── TouchCollector.java
│   │   │   └── PointerTracker.java
│   │   ├── overlay/               # 覆盖层
│   │   │   ├── OverlayWindow.java
│   │   │   └── OverlayController.java
│   │   └── input/                 # 输入
│   │       ├── RawInputCollector.java
│   │       └── InputEventParser.java
│   │
│   └── api/                       # 平台接口 (核心层依赖)
│       ├── ISensorProvider.java
│       ├── ITouchProvider.java
│       ├── IOverlayProvider.java
│       └── IInputProvider.java
│
├── network/                       # 网络通信
│   ├── transport/                 # 传输层
│   │   ├── TransportProtocol.java
│   │   ├── WebSocketTransport.java
│   │   └── MessageCodec.java
│   ├── messages/                  # 消息定义
│   │   ├── InputMessage.java
│   │   ├── StateMessage.java
│   │   └── ControlMessage.java
│   └── client/                    # 客户端
│       ├── ServerClient.java
│       └── ConnectionManager.java
│
├── service/                       # Android Service 层
│   ├── InputRuntimeService.java   # 运行时服务 (精简)
│   ├── ServiceLifecycle.java
│   └── ServiceComponent.java
│
├── ui/                            # UI 组件
│   ├── floatwindow/               # 浮窗
│   │   ├── FloatWindowManager.java
│   │   └── OverlayView.java
│   ├── layout/                    # 布局
│   │   ├── LayoutEngine.java
│   │   ├── LayoutLoader.java
│   │   └── LayoutRenderer.java
│   └── debug/                     # 调试 UI
│       ├── DebugModeManager.java
│       └── RawInputInspectorView.java
│
├── model/                         # 数据模型 (保持不变)
│   ├── InputState.java
│   ├── RawInput.java
│   ├── ConnectionInfo.java
│   └── layout/                    # 布局模型
│       ├── LayoutConfiguration.java
│       ├── LayoutSnapshot.java
│       └── Mapping.java
│
├── database/                      # 数据库 (保持不变)
│   └── DatabaseHelper.java
│
├── monitor/                       # 监控 (保持不变)
│   └── SystemMonitor.java
│
└── util/                          # 工具类
    ├── Logger.java
    └── Preconditions.java
```

### 3.3 架构分层图

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│                    (MainActivity, etc.)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        Service Layer                         │
│                  (InputRuntimeService)                       │
│                                                              │
│  职责：Android 生命周期管理、前台服务、通知、绑定            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Platform Abstraction                     │
│              (platform/api/* 接口定义)                       │
│                                                              │
│  接口：ISensorProvider, ITouchProvider, IOverlayProvider    │
└─────────────────────────────────────────────────────────────┘
                    ↑                       ↓
┌─────────────────────────┐     ┌─────────────────────────────┐
│    Core Business Logic  │     │   Platform Implementation   │
│   (core/ 纯 Java 逻辑)   │     │  (platform/android/* 实现)  │
│                         │     │                             │
│  • Input Pipeline       │     │  • SensorManager           │
│  • Control Architecture │     │  • TouchCollector          │
│  • Script Engine        │     │  • OverlayWindow           │
│  • Safety Controller    │     │  • RawInputCollector       │
│                         │     │                             │
│  依赖：只依赖 platform/api 接口                            │
└─────────────────────────┘     └─────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Network Layer                          │
│                   (network/* 网络通信)                       │
│                                                              │
│  组件：Transport, MessageCodec, ServerClient                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        Model Layer                           │
│                   (model/* 数据模型)                         │
│                                                              │
│  模型：InputState, RawInput, ConnectionInfo                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 关键设计决策

#### 决策 1: 核心业务逻辑与平台实现分离

**问题**: 当前 `InputAbstractionLayer` 和 `PlatformAdaptationLayer` 混合了业务逻辑和 Android API

**方案**: 
- 创建 `core/` 包存放纯 Java 业务逻辑
- 创建 `platform/api/` 定义平台接口
- 创建 `platform/android/` 实现 Android 特定功能

**收益**:
- 核心逻辑可在 JVM 测试环境测试
- 易于替换 Mock 实现
- 为未来支持其他平台 (Linux/Mac) 奠定基础

#### 决策 2: 统一三层控制架构

**问题**: Layer 五层架构与 Control 三层架构并存

**方案**:
- 保留 Control 三层架构作为输入处理主架构
- 将 Layer 架构的功能拆解并整合到三层架构中
- `InputAbstractionLayer` 的状态机/合并功能迁移到 `core/input/pipeline/`

**收益**:
- 消除架构双轨制
- 清晰的职责边界
- 简化代码结构

#### 决策 3: 精简 InputRuntimeService

**问题**: `InputRuntimeService` 管理所有组件，职责过重

**方案**:
- Service 只负责 Android 生命周期管理
- 创建 `RuntimeFacade` 统一管理系统组件
- Service 只依赖 `RuntimeFacade` 接口

**收益**:
- Service 职责单一
- 易于测试和替换
- 符合单一职责原则

---

## 4. 分层详细设计

### 4.1 Core 层设计

#### 4.1.1 Input Pipeline

```java
// core/input/pipeline/InputPipeline.java
public class InputPipeline {
    private final List<InputStage> stages;
    private final InputStateHolder stateHolder;
    
    public InputPipeline() {
        this.stages = Arrays.asList(
            new NormalizationStage(),    // 归一化
            new MergeStage(),            // 合并
            new AbstractionStage()       // 抽象
        );
        this.stateHolder = new InputStateHolder();
    }
    
    /**
     * 处理原始输入，生成抽象输入原语
     */
    public InputPrimitives process(RawInputData rawInput) {
        InputPrimitives primitives = new InputPrimitives();
        
        for (InputStage stage : stages) {
            primitives = stage.process(rawInput, primitives);
        }
        
        return primitives;
    }
}

// core/input/pipeline/InputStage.java
public interface InputStage {
    InputPrimitives process(RawInputData rawInput, InputPrimitives current);
}
```

#### 4.1.2 Control Architecture

```java
// core/control/ThreeTierControlManager.java
public class ThreeTierControlManager {
    private final UINodeManager uiManager;
    private final OperationNodeManager operationManager;
    private final MappingNodeManager mappingManager;
    
    public ThreeTierControlManager() {
        this.uiManager = new UINodeManager();
        this.operationManager = new OperationNodeManager();
        this.mappingManager = new MappingNodeManager();
    }
    
    /**
     * 处理完整输入流程
     */
    public InputState processInput(RawInput rawInput, long frameId) {
        // UI 层：原始输入 → 控制动作
        List<ControlAction> actions = uiManager.processInput(rawInput);
        
        // Operation 层：应用处理算法
        List<ControlAction> processed = operationManager.process(actions);
        
        // Mapping 层：映射到设备输出
        InputState state = new InputState();
        mappingManager.apply(processed, state);
        
        return state;
    }
}
```

### 4.2 Platform 层设计

#### 4.2.1 Platform API (接口)

```java
// platform/api/ISensorProvider.java
public interface ISensorProvider {
    void registerListener(SensorListener listener);
    void unregisterListener(SensorListener listener);
    
    interface SensorListener {
        void onGyroscopeData(float pitch, float roll, float yaw, long timestampNs);
        void onAccelerometerData(float x, float y, float z, long timestampNs);
    }
}

// platform/api/ITouchProvider.java
public interface ITouchProvider {
    void setTouchListener(TouchListener listener);
    
    interface TouchListener {
        void onPointerDown(int pointerId, float x, float y, long timestampNs);
        void onPointerMove(int pointerId, float x, float y, long timestampNs);
        void onPointerUp(int pointerId, long timestampNs);
        void onPointerCancel(int pointerId, long timestampNs);
    }
}
```

#### 4.2.2 Android Implementation

```java
// platform/android/sensor/AndroidSensorProvider.java
public class AndroidSensorProvider implements ISensorProvider {
    private final SensorManager sensorManager;
    private final Sensor gyroscopeSensor;
    private final List<SensorListener> listeners;
    
    public AndroidSensorProvider(Context context) {
        this.sensorManager = context.getSystemService(SensorManager.class);
        this.gyroscopeSensor = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
        this.listeners = new CopyOnWriteArrayList<>();
    }
    
    @Override
    public void registerListener(SensorListener listener) {
        listeners.add(listener);
        sensorManager.registerListener(
            sensorEventListener,
            gyroscopeSensor,
            SensorManager.SENSOR_DELAY_FASTEST
        );
    }
    
    private final SensorEventListener sensorEventListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            float pitch = event.values[0];
            float roll = event.values[1];
            float yaw = event.values[2];
            
            for (SensorListener listener : listeners) {
                listener.onGyroscopeData(pitch, roll, yaw, event.timestamp);
            }
        }
        
        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {
            // 处理精度变化
        }
    };
}
```

### 4.3 Service 层设计

#### 4.3.1 精简的 InputRuntimeService

```java
// service/InputRuntimeService.java
public class InputRuntimeService extends Service {
    private RuntimeFacade runtimeFacade;
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        // 创建运行时外观
        runtimeFacade = new RuntimeFacade(
            new AndroidPlatformProviders(this),
            new NetworkClient()
        );
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        runtimeFacade.start();
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        runtimeFacade.stop();
        super.onDestroy();
    }
}

// core/RuntimeFacade.java
public class RuntimeFacade {
    private final PlatformProviders providers;
    private final InputPipeline inputPipeline;
    private final ThreeTierControlManager controlManager;
    private final SafetyController safetyController;
    private final NetworkClient networkClient;
    
    public RuntimeFacade(PlatformProviders providers, NetworkClient networkClient) {
        this.providers = providers;
        this.inputPipeline = new InputPipeline();
        this.controlManager = new ThreeTierControlManager();
        this.safetyController = new SafetyController();
        this.networkClient = networkClient;
    }
    
    public void start() {
        providers.initialize();
        networkClient.connect();
        safetyController.enable();
    }
    
    public void stop() {
        safetyController.disable();
        networkClient.disconnect();
        providers.release();
    }
    
    public InputState processFrame(RawInputData rawInput, long frameId) {
        // 安全监控
        if (!safetyController.isSafe()) {
            safetyController.triggerSafetyClear();
            return new InputState();
        }
        
        // 处理输入
        InputState state = controlManager.processInput(rawInput, frameId);
        
        // 发送状态
        networkClient.sendState(state);
        
        return state;
    }
}
```

---

## 5. 数据流设计

### 5.1 完整输入处理流程

```
┌──────────────────┐
│  Android System  │
│  (Sensor/Touch)  │
└────────┬─────────┘
         │
         ↓ Raw Sensor/Touch Events
┌─────────────────────────────────────────┐
│      Platform Adaptation Layer          │
│  (AndroidSensorProvider, TouchCollector)│
└────────┬────────────────────────────────┘
         │
         ↓ RawInputData (pitch, roll, touchX, touchY)
┌─────────────────────────────────────────┐
│         Input Pipeline                  │
│  ┌─────────────────────────────────┐    │
│  │  NormalizationStage             │    │
│  │  • 坐标归一化 (0.0-1.0)         │    │
│  │  • 传感器数据标准化             │    │
│  └─────────────┬───────────────────┘    │
│                ↓                         │
│  ┌─────────────────────────────────┐    │
│  │  MergeStage                     │    │
│  │  • MOVE 事件合并 (60Hz)          │    │
│  │  • 时间戳对齐                   │    │
│  └─────────────┬───────────────────┘    │
│                ↓                         │
│  ┌─────────────────────────────────┐    │
│  │  AbstractionStage               │    │
│  │  • 生成 InputPrimitives         │    │
│  │  • 指针状态机                   │    │
│  └─────────────┬───────────────────┘    │
└────────────────┼─────────────────────────┘
                 │
                 ↓ InputPrimitives
┌─────────────────────────────────────────┐
│      Three-Tier Control Architecture    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  UI Layer (UINodeManager)       │   │
│  │  • ControlNode.processInput()   │   │
│  │  • 生成 ControlAction           │   │
│  └─────────────┬───────────────────┘   │
│                ↓                        │
│  ┌─────────────────────────────────┐   │
│  │  Operation Layer                │   │
│  │  • 应用死区/平滑/曲线           │   │
│  │  • ControlAction 处理           │   │
│  └─────────────┬───────────────────┘   │
│                ↓                        │
│  ┌─────────────────────────────────┐   │
│  │  Mapping Layer                  │   │
│  │  • DeviceMapping 映射           │   │
│  │  • 生成 InputState              │   │
│  └─────────────┬───────────────────┘   │
└────────────────┼────────────────────────┘
                 │
                 ↓ InputState
┌─────────────────────────────────────────┐
│         Safety Controller               │
│  • 验证状态合法性                       │
│  • 超时检测                             │
│  • 异常清零                             │
└────────┬────────────────────────────────┘
         │
         ↓ InputState (validated)
┌─────────────────────────────────────────┐
│          Network Layer                  │
│  • WebSocket 序列化                    │
│  • 发送到服务端                         │
└─────────────────────────────────────────┘
```

### 5.2 关键数据结构

```java
// model/RawInputData.java
/**
 * 原始输入数据 (从 Platform 层输出)
 */
public class RawInputData {
    // 陀螺仪数据 (弧度/秒)
    public final float gyroPitch;
    public final float gyroRoll;
    public final float gyroYaw;
    public final long gyroTimestampNs;
    
    // 触摸数据 (像素坐标)
    public final List<PointerData> pointers;
    
    // 窗口 metrics
    public final DisplayMetrics displayMetrics;
}

// core/input/primitives/InputPrimitives.java
/**
 * 输入原语 (从 Input Pipeline 输出)
 */
public class InputPrimitives {
    // 指针帧 (归一化坐标 0.0-1.0)
    public final PointerFrame pointerFrame;
    
    // 陀螺仪帧 (归一化角速度)
    public final GyroFrame gyroFrame;
    
    // 时间戳
    public final long frameTimeNs;
}

// core/control/ControlAction.java
/**
 * 控制动作 (从 UI 层输出)
 */
public class ControlAction {
    public final String actionId;
    public final ActionType type;  // BUTTON, AXIS, GESTURE
    public final float value;      // 归一化值 0.0-1.0
    public final Map<String, Object> metadata;
}

// model/InputState.java
/**
 * 输入状态 (最终输出)
 */
public class InputState {
    // 键盘按键
    private Set<String> keyboard;
    
    // 游戏手柄
    private Set<String> gamepad;
    private Map<String, Float> axes;
    
    // 鼠标
    private float mouseX, mouseY;
    private boolean mouseLeft, mouseRight;
    
    // 元数据
    private long frameId;
    private String runtimeStatus;
}
```

---

## 6. 迁移路径

### 6.1 阶段 1: 基础架构搭建 (1-2 周)

**目标**: 创建新的包结构，不破坏现有功能

**任务**:
1. ✅ 创建新的包目录结构
2. ✅ 移动纯 Java 类到 `core/` (无 Android 依赖)
   - `DeadzoneProcessor`, `CurveProcessor`, etc.
   - `SafetyController`
   - `ProfileManager`, `ScriptProfile`
3. 创建 `platform/api/` 接口
   - `ISensorProvider`
   - `ITouchProvider`
   - `IOverlayProvider`
4. 创建适配器类保持向后兼容

**验收标准**:
- 编译通过
- 现有功能不受影响
- 新包结构就位

### 6.2 阶段 2: Platform 层重构 (2-3 周)

**目标**: 实现 Platform 抽象，解耦核心逻辑与 Android API

**任务**:
1. 实现 `AndroidSensorProvider` 实现 `ISensorProvider`
2. 实现 `AndroidTouchProvider` 实现 `ITouchProvider`
3. 实现 `AndroidOverlayProvider` 实现 `IOverlayProvider`
4. 重构 `PlatformAdaptationLayer` 使用新的 Provider
5. 为核心逻辑添加单元测试

**验收标准**:
- 核心逻辑可在 JVM 测试
- Platform 接口测试覆盖
- 现有功能测试通过

### 6.3 阶段 3: Input Pipeline 整合 (2-3 周)

**目标**: 将 `InputAbstractionLayer` 功能迁移到 Input Pipeline

**任务**:
1. 创建 `InputPipeline` 和 `InputStage` 接口
2. 实现 `NormalizationStage` (坐标归一化)
3. 实现 `MergeStage` (MOVE 合并)
4. 实现 `AbstractionStage` (状态机)
5. 逐步替换 `InputAbstractionLayer` 的使用
6. 保留旧类作为过渡，标记 `@Deprecated`

**验收标准**:
- Input Pipeline 测试覆盖
- 行为与旧实现一致
- 性能无回退

### 6.4 阶段 4: Service 层精简 (1 周)

**目标**: 精简 `InputRuntimeService`，创建 `RuntimeFacade`

**任务**:
1. 创建 `RuntimeFacade` 统一管理组件
2. 精简 `InputRuntimeService` 只保留 Android 生命周期
3. 更新依赖注入
4. 添加 Service 集成测试

**验收标准**:
- Service 职责清晰
- 集成测试通过
- 内存/CPU 使用无回退

### 6.5 阶段 5: 清理与优化 (1-2 周)

**目标**: 删除废弃代码，优化架构

**任务**:
1. 删除标记为 `@Deprecated` 的类
2. 统一三层控制架构
3. 整合 `LayoutEngine` 新旧版本
4. 更新文档
5. 性能优化

**验收标准**:
- 无重复代码
- 架构清晰
- 文档完整

---

## 7. 实施建议

### 7.1 编码规范

#### 包命名规范
- 核心业务逻辑：`core.<domain>`
- 平台实现：`platform.<platform_name>`
- 平台接口：`platform.api`
- 数据模型：`model`

#### 类命名规范
- 接口：`IProvider`, `IListener` (平台接口)
- 抽象类：`AbstractStage`, `BaseNode`
- 实现类：`AndroidSensorProvider`, `NormalizationStage`

#### 依赖规则
```
core/  → 只能依赖 platform/api/ 和 model/
platform/android/ → 可以依赖 core/, platform/api/, model/
service/ → 可以依赖所有层
```

### 7.2 测试策略

#### 单元测试 (core/)
```java
// 纯 Java 测试，无需 Android
@Test
public void testDeadzoneProcessor() {
    DeadzoneProcessor processor = new DeadzoneProcessor(0.2f);
    assertEquals(0.0f, processor.process(0.1f), 0.001f);
    assertEquals(0.125f, processor.process(0.3f), 0.001f);
}
```

#### 接口测试 (platform/api/)
```java
// 使用 Mock 测试接口契约
@Test
public void testSensorProviderContract() {
    ISensorProvider mockProvider = mock(ISensorProvider.class);
    doAnswer(invocation -> {
        SensorListener listener = invocation.getArgument(0);
        listener.onGyroscopeData(1.0f, 2.0f, 3.0f, 1000L);
        return null;
    }).when(mockProvider).registerListener(any());
    
    // 验证回调
}
```

#### 集成测试 (service/)
```java
// Android Instrumentation 测试
@RunWith(AndroidJUnit4.class)
public class InputRuntimeServiceTest {
    @Test
    public void testServiceLifecycle() {
        Intent intent = new Intent(context, InputRuntimeService.class);
        context.startService(intent);
        
        // 验证服务启动
        assertTrue(ServiceTestRule.waitForService());
    }
}
```

### 7.3 风险管理

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 迁移期间功能回退 | 高 | 中 | 保留旧代码作为备用，逐步切换 |
| 性能下降 | 中 | 低 | 每阶段进行性能测试 |
| 测试覆盖率不足 | 中 | 中 | 强制要求新代码测试覆盖>80% |
| 团队学习曲线 | 低 | 高 | 提供架构文档和培训 |

### 7.4 成功指标

#### 代码质量指标
- 单元测试覆盖率 > 80%
- 核心逻辑 100% JVM 可测试
- 无循环依赖

#### 架构指标
- 包依赖符合分层规则
- Service 类行数 < 200
- 核心业务逻辑无 Android 依赖

#### 性能指标
- 输入延迟 < 16ms (60Hz)
- CPU 使用率 < 5%
- 内存占用 < 50MB

---

## 附录

### A. 类对照表

| 旧类名 | 新类名/位置 | 状态 |
|--------|-------------|------|
| `input/DeadzoneProcessor` | `core/input/processor/DeadzoneProcessor` | 移动 |
| `input/SafetyController` | `core/safety/SafetyController` | 移动 |
| `input/ProfileManager` | `core/script/ProfileManager` | 移动 |
| `layer/InputAbstractionLayer` | `core/input/pipeline/*` | 重构 |
| `layer/PlatformAdaptationLayer` | `platform/android/*` | 重构 |
| `control/ui/ControlNode` | `core/control/ui/ControlNode` | 移动 |

### B. 参考文档

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Injection](https://martinfowler.com/articles/injection.html)
- [Android Architecture Guide](https://developer.android.com/topic/architecture)

---

**文档版本**: v2.0  
**最后更新**: 2026-02-19  
**审核状态**: 待审核
