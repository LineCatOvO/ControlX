# 将InputRuntimeService分散到五层架构

## 1. 架构设计

### 1.1 层定义与职责

| 层名 | 职责 | 相关组件 |
|------|------|----------|
| 采集层 | 归纳转换系统原始输入接口 | InteractionCapture, EventNormalizer |
| UI输入层 | 负责浮窗、显示、事件绑定 | OverlayController, FloatWindowManager |
| 转换层 | 将UI输入转换为抽象操作，为映射层提供终点事件 | IntentComposer, InputInterpreter, RegionResolver |
| 映射层 | 维护最终映射设备的状态，按照规则调用网络层与服务端交互 | InputStateController, LayoutEngine, EnhancedLayoutEngine, DeviceProjector |
| 网络层 | 负责websocket的访问接口实现 | TransportController, WebSocketClient |

### 1.2 层间依赖关系

```
UI输入层 → 采集层 → 转换层 → 映射层 → 网络层
```

## 2. 实现步骤

### 2.1 创建层基类

创建一个层基类`LayerBase.java`，定义层的基本生命周期方法：
- `init()`: 初始化层
- `start()`: 启动层
- `stop()`: 停止层
- `destroy()`: 销毁层

### 2.2 创建采集层

创建`InputCaptureLayer.java`：
- 包含`InteractionCapture`和`EventNormalizer`组件
- 实现原始输入的采集和标准化
- 提供获取原始输入的接口

### 2.3 创建UI输入层

创建`UIInputLayer.java`：
- 包含`OverlayController`组件
- 负责悬浮球的显示、隐藏和状态更新
- 处理用户交互事件

### 2.4 创建转换层

创建`ConversionLayer.java`：
- 包含`IntentComposer`、`InputInterpreter`和`RegionResolver`组件
- 实现输入的处理和抽象化
- 应用过滤、平滑、死区处理等算法

### 2.5 创建映射层

创建`MappingLayer.java`：
- 包含`InputStateController`、`LayoutEngine`、`EnhancedLayoutEngine`、`LayoutEngineAdapter`和`DeviceProjector`组件
- 维护设备映射关系
- 生成和管理控制结果状态

### 2.6 创建网络层

创建`NetworkLayer.java`：
- 包含`TransportController`和`WebSocketClient`组件
- 处理WebSocket连接、消息发送和接收
- 管理连接状态

### 2.7 修改InputRuntimeService

修改`InputRuntimeService.java`：
- 移除各个组件的直接引用
- 替换为对五个层类的引用
- 在生命周期方法中调用各个层的相应方法
- 协调各个层的工作

## 3. 代码实现

### 3.1 LayerBase.java

```java
public abstract class LayerBase {
    protected Context context;
    
    public LayerBase(Context context) {
        this.context = context;
    }
    
    public abstract void init();
    public abstract void start();
    public abstract void stop();
    public abstract void destroy();
}
```

### 3.2 InputCaptureLayer.java

```java
public class InputCaptureLayer extends LayerBase {
    private InteractionCapture interactionCapture;
    private EventNormalizer eventNormalizer;
    
    // 实现层的生命周期方法和功能
}
```

### 3.3 UIInputLayer.java

```java
public class UIInputLayer extends LayerBase {
    private OverlayController overlayController;
    
    // 实现层的生命周期方法和功能
}
```

### 3.4 ConversionLayer.java

```java
public class ConversionLayer extends LayerBase {
    private IntentComposer intentComposer;
    private InputInterpreter inputInterpreter;
    private RegionResolver regionResolver;
    
    // 实现层的生命周期方法和功能
}
```

### 3.5 MappingLayer.java

```java
public class MappingLayer extends LayerBase {
    private InputStateController inputStateController;
    private LayoutEngine layoutEngine;
    private EnhancedLayoutEngine enhancedLayoutEngine;
    private LayoutEngineAdapter layoutEngineAdapter;
    private DeviceProjector deviceProjector;
    
    // 实现层的生命周期方法和功能
}
```

### 3.6 NetworkLayer.java

```java
public class NetworkLayer extends LayerBase {
    private TransportController transportController;
    
    // 实现层的生命周期方法和功能
}
```

### 3.7 修改InputRuntimeService.java

```java
public class InputRuntimeService extends Service {
    // 替换各个组件的直接引用为层引用
    private InputCaptureLayer inputCaptureLayer;
    private UIInputLayer uiInputLayer;
    private ConversionLayer conversionLayer;
    private MappingLayer mappingLayer;
    private NetworkLayer networkLayer;
    
    // 修改初始化、启动、停止和销毁方法，调用各个层的相应方法
    
    // 其他方法根据需要修改
}
```

## 4. 测试与验证

1. 编译项目，确保没有编译错误
2. 运行项目，确保功能正常
3. 测试各种输入场景，确保输入处理流程正常
4. 测试网络连接，确保消息发送和接收正常
5. 测试悬浮球UI，确保用户交互正常

## 5. 注意事项

1. 确保各个层之间的依赖关系正确，避免循环依赖
2. 保持原有功能不变，确保系统的稳定性和兼容性
3. 注意线程安全，特别是在多线程环境下访问共享资源
4. 确保资源的正确释放，避免内存泄漏
5. 保持代码的可维护性和可读性，遵循现有的代码风格和命名规范