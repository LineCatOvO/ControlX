# Layout 和 Region 关系详解

**日期**: 2026-02-20  
**目的**: 解释 Layout 配置、LayoutSnapshot 和 Region 之间的关系

---

## 📊 架构关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    LayoutConfiguration                      │
│                    (布局配置文件)                            │
│                                                             │
│  {                                                          │
│    "version": "1.0.0",                                      │
│    "ui": [UiElement, UiElement, ...],  ← UI 元素定义         │
│    "operation": [Operation, ...],      ← 操作定义           │
│    "mapping": [Mapping, ...]           ← 映射定义           │
│  }                                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ LayoutToRegionConverter.convertToRegions()
                     │ (布局配置 → 区域列表转换)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    LayoutSnapshot                           │
│                    (布局快照 - 运行时表示)                    │
│                                                             │
│  - List<Region> regions    ← Region 列表（按 zIndex 排序）   │
│  - long timestamp          ← 时间戳                         │
│  - float screenWidth       ← 屏幕宽度                       │
│  - float screenHeight      ← 屏幕高度                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ getRegions() / hitTest()
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                       Region                                │
│                       (区域 - 最小交互单元)                   │
│                                                             │
│  - String id               ← 区域 ID                        │
│  - RegionType type         ← 区域类型 (BUTTON/AXIS 等)       │
│  - float left/top/right/bottom ← 边界坐标 (0.0-1.0)         │
│  - int zIndex              ← Z 轴顺序                        │
│  - boolean clickThrough    ← 点击穿透设置                   │
│  - ... (其他属性)                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 详细说明

### 1. LayoutConfiguration (布局配置)

**位置**: `model/layout/LayoutConfiguration.java`

**职责**: 定义布局的静态配置，包含 UI、操作、映射三个部分

**结构**:
```java
public class LayoutConfiguration {
    private String version;              // 版本号
    private List<UiElement> ui;          // UI 元素列表
    private List<Operation> operation;   // 操作列表
    private List<Mapping> mapping;       // 映射列表
}
```

**特点**:
- ✅ **静态配置**: 从 JSON 文件加载，定义布局的结构
- ✅ **三层架构**: UI → Operation → Mapping 的映射关系
- ✅ **可序列化**: 可以保存为 JSON 文件或从 JSON 加载
- ✅ **平台无关**: 不依赖 Android 特定 API

**示例**:
```json
{
  "version": "1.0.0",
  "ui": [
    {
      "id": "steering_wheel",
      "anchor": "bottom-center",
      "offset": {"x": 0, "y": -100},
      "size": {"mode": "absolute", "width": 200, "height": 200},
      "clickThrough": false
    }
  ],
  "operation": [
    {"id": "steering_op", "type": "axis"}
  ],
  "mapping": [
    {"operation": "steering_op", "output": "gamepad:leftX", "trigger": "axis"}
  ]
}
```

---

### 2. LayoutSnapshot (布局快照)

**位置**: `input/LayoutSnapshot.java`

**职责**: 运行时布局表示，包含 Region 列表和屏幕信息

**结构**:
```java
public class LayoutSnapshot {
    private final List<Region> regions;      // Region 列表
    private final long timestamp;            // 时间戳
    private final float screenWidth;         // 屏幕宽度
    private final float screenHeight;        // 屏幕高度
}
```

**特点**:
- ✅ **运行时表示**: 在内存中使用的布局表示
- ✅ **包含 Region**: 持有所有 Region 的列表
- ✅ **屏幕信息**: 包含屏幕尺寸信息
- ✅ **命中检测**: 提供 `hitTest()` 方法进行点击检测
- ✅ **按 zIndex 排序**: Region 列表按 zIndex 降序排序

**核心方法**:
```java
// 命中检测 - 返回点击的 Region
public Region hitTest(float normalizedX, float normalizedY) {
    for (Region region : regions) {
        if (region.hitTest(normalizedX, normalizedY)) {
            return region;
        }
    }
    return null;
}

// 获取所有 Region
public List<Region> getRegions() {
    return Collections.unmodifiableList(regions);
}

// 根据 ID 获取 Region
public Region getRegionById(String regionId) {
    for (Region region : regions) {
        if (region.getId().equals(regionId)) {
            return region;
        }
    }
    return null;
}
```

---

### 3. Region (区域)

**位置**: `input/Region.java`

**职责**: 最小的交互单元，定义屏幕上的一个可交互区域

**结构**:
```java
public class Region {
    // 基本信息
    private final String id;                    // 区域 ID
    private final RegionType type;              // 区域类型
    private final int zIndex;                   // Z 轴顺序
    
    // 边界坐标 (0.0-1.0 归一化)
    private final float left, top, right, bottom;
    
    // 功能属性
    private final float deadzone;               // 死区
    private final String curve;                 // 曲线类型
    private final float[] range;                // 输入范围
    private final float[] outputRange;          // 输出范围
    
    // 穿透设置
    private final boolean clickThrough;         // 点击穿透
    
    // ... (其他属性)
}
```

**特点**:
- ✅ **最小单元**: 布局的最小组成单位
- ✅ **归一化坐标**: 使用 0.0-1.0 的归一化坐标
- ✅ **命中检测**: 提供 `hitTest()` 方法检测点是否在区域内
- ✅ **功能完整**: 包含死区、曲线、范围等游戏手柄相关属性
- ✅ **穿透设置**: 支持点击穿透配置

**核心方法**:
```java
// 命中检测
public boolean hitTest(float x, float y) {
    return x >= left && x <= right && y >= top && y <= bottom;
}

// 兼容方法
public boolean contains(float x, float y) {
    return hitTest(x, y);
}

// 获取中心点
public float[] getCenter() {
    return new float[] {
        (left + right) / 2f,
        (top + bottom) / 2f
    };
}
```

---

## 🔄 转换流程

### 完整转换链

```
JSON 文件
   ↓
Gson 反序列化
   ↓
LayoutConfiguration (配置对象)
   ↓
LayoutToRegionConverter.convertToRegions()
   ↓
List<Region> (区域列表)
   ↓
LayoutSnapshot (布局快照)
   ↓
LayoutRenderer.onTouchEvent() (触摸事件处理)
   ↓
Region.hitTest() (命中检测)
   ↓
InputState (输入状态)
```

### 代码示例

**1. 加载布局配置**:
```java
// 从 JSON 字符串加载布局配置
NewLayoutLoader loader = new NewLayoutLoader();
LayoutConfiguration config = loader.loadLayoutConfiguration(jsonString);
```

**2. 转换为 LayoutSnapshot**:
```java
// 将配置转换为运行时快照
LayoutSnapshot snapshot = LayoutToRegionConverter.convertToLayoutSnapshot(config);
```

**3. 命中检测**:
```java
// 检测点击位置
Region touchedRegion = snapshot.hitTest(normalizedX, normalizedY);

if (touchedRegion != null) {
    // 处理点击事件
    if (touchedRegion.isClickThrough()) {
        // 允许穿透
        updateInputState(...);
        return false;
    } else {
        // 消费事件
        updateInputState(...);
        return true;
    }
}
```

---

## 📋 对比总结

| 特性 | LayoutConfiguration | LayoutSnapshot | Region |
|------|---------------------|----------------|--------|
| **位置** | `model/layout/` | `input/` | `input/` |
| **职责** | 静态配置定义 | 运行时表示 | 最小交互单元 |
| **数据来源** | JSON 文件 | LayoutConfiguration | LayoutConfiguration 转换 |
| **包含内容** | UI + Operation + Mapping | Region 列表 + 屏幕信息 | 单个区域的属性和边界 |
| **生命周期** | 持久化存储 | 运行时创建 | 运行时创建 |
| **序列化** | ✅ 支持 JSON | ❌ 运行时对象 | ❌ 运行时对象 |
| **命中检测** | ❌ | ✅ | ✅ |
| **穿透设置** | ✅ (UiElement.clickThrough) | ❌ | ✅ (isClickThrough) |

---

## 🎯 使用场景

### LayoutConfiguration

**何时使用**:
- 从文件加载布局配置
- 保存布局配置到文件
- 验证布局配置格式
- 序列化/反序列化布局

**示例**:
```java
// 加载布局
String json = loadLayoutFromFile("layout.json");
LayoutConfiguration config = LayoutSerializer.deserialize(json);

// 保存布局
String json = LayoutSerializer.serialize(config);
saveLayoutToFile(json, "layout.json");
```

### LayoutSnapshot

**何时使用**:
- 运行时处理触摸事件
- 进行命中检测
- 获取当前布局的所有 Region
- 根据 ID 查找 Region

**示例**:
```java
// 创建布局快照
LayoutSnapshot snapshot = new LayoutSnapshot(regions, 1080f, 1920f);

// 命中检测
Region region = snapshot.hitTest(0.5f, 0.5f);

// 查找 Region
Region steering = snapshot.getRegionById("steering_wheel");
```

### Region

**何时使用**:
- 定义单个交互区域
- 进行点击检测
- 获取区域属性（死区、曲线等）
- 检查点击穿透设置

**示例**:
```java
// 创建区域
Region region = new Region(
    "steering",
    RegionType.BUTTON,
    0.3f, 0.7f, 0.7f, 0.9f,  // left, top, right, bottom
    1,                        // zIndex
    0.1f,                     // deadzone
    "linear",                 // curve
    null, null,               // range, outputRange
    null, null,               // operationType, mappingType
    null, null, null,         // mappingKey, mappingAxis, mappingButton
    null,                     // customMappingTarget
    null,                     // customData
    false                     // clickThrough
);

// 命中检测
boolean hit = region.hitTest(0.5f, 0.8f);

// 检查穿透设置
if (region.isClickThrough()) {
    // 允许穿透
}
```

---

## 🔍 常见问题

### Q1: 为什么不直接使用 LayoutConfiguration 进行命中检测？

**A**: LayoutConfiguration 是静态配置，包含 UI/Operation/Mapping 三层结构，不适合直接用于运行时的命中检测。LayoutSnapshot 将配置转换为扁平的 Region 列表，并按 zIndex 排序，更适合运行时使用。

### Q2: Region 的坐标为什么使用归一化 (0.0-1.0)？

**A**: 归一化坐标使得布局可以适配不同尺寸的屏幕。0.0-1.0 的范围表示相对于屏幕的百分比，与实际像素无关。

### Q3: clickThrough 字段在哪里定义？

**A**: 
- **配置层**: `UiElement.clickThrough` (Boolean, 默认 false)
- **运行时层**: `Region.clickThrough` (boolean, 从 UiElement 传递)

### Q4: LayoutSnapshot 中的 Region 列表为什么按 zIndex 排序？

**A**: zIndex 高的 Region 在上层，应该优先响应点击事件。排序后，命中检测可以从前到后遍历，第一个命中的就是最上层的 Region。

---

**文档生成时间**: 2026-02-20  
**适用版本**: ControlX Android Client v1.0
