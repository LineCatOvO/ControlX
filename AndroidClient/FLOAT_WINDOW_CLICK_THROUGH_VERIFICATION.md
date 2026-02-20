# 浮窗点击事件穿透功能验证报告

**日期**: 2026-02-20  
**验证目标**: 浮窗根 View 点击事件穿透、悬浮球和布局内容的穿透设置

---

## 📊 验证结果总结

| 功能 | 状态 | 实现位置 | 说明 |
|------|------|----------|------|
| **根 View 点击穿透** | ✅ 已实现 | `FLAG_NOT_TOUCH_MODAL` | 默认穿透到下层窗口 |
| **悬浮球点击处理** | ✅ 已实现 | `FloatWindowManager.onTouch()` | 悬浮球区域消费事件 |
| **布局内容点击处理** | ✅ 已实现 | `LayoutRenderer.onTouchEvent()` | 有内容区域消费事件 |
| **穿透设置字段** | 🟡 待实现 | - | 布局文件应添加 `clickThrough` 字段 |

---

## ✅ 当前实现分析

### 1. 根 View 点击事件穿透

**实现方式**: WindowManager.LayoutParams.flags

```java
// FloatWindowManager.java:114
windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON;
```

**FLAG_NOT_TOUCH_MODAL 标志**:
- ✅ **允许穿透**: 窗口区域外的点击事件会传递到下层窗口
- ✅ **正常接收**: 窗口区域内的点击事件由浮窗接收
- ✅ **默认行为**: 无需额外配置

**验证结果**: ✅ 根 View 点击事件默认穿透

---

### 2. 悬浮球点击事件处理

**实现位置**: `FloatWindowManager.java` (151-250 行)

```java
floatView.setOnTouchListener(new View.OnTouchListener() {
    @Override
    public boolean onTouch(View v, MotionEvent event) {
        switch (event.getAction()) {
            case MotionEvent.ACTION_DOWN:
                // 检查点击位置是否在圆形入口内
                if (rawX >= circleLeft && rawX <= circleRight && 
                    rawY >= circleTop && rawY <= circleBottom) {
                    isClickingCircle = true;
                }
                break;
                
            case MotionEvent.ACTION_UP:
                if (isClickingCircle) {
                    // 显示菜单
                    showPopupMenu();
                    return true; // 消费事件
                }
                break;
        }
        return false; // 非悬浮球区域，允许穿透
    }
});
```

**验证结果**:
- ✅ 悬浮球区域消费点击事件 (`return true`)
- ✅ 非悬浮球区域允许穿透 (`return false`)
- ✅ 点击悬浮球显示菜单
- ✅ 点击其他区域隐藏菜单并允许穿透

---

### 3. 布局内容点击事件处理

**实现位置**: `LayoutRenderer.onTouchEvent()` (205-280 行)

```java
@Override
public boolean onTouchEvent(MotionEvent event) {
    // 如果布局未启用，不处理触摸事件
    if (!isLayoutEnabled) {
        return false; // 不消费事件，允许穿透
    }
    
    // 如果没有布局或没有定义的区域，不处理触摸事件
    if (currentLayout == null || currentLayout.getRegions() == null || 
        currentLayout.getRegions().isEmpty()) {
        return false; // 没有 UI 元素，允许触摸穿透
    }
    
    // 查找触摸到的区域
    Region touchedRegion = findTouchedRegion(normalizedX, normalizedY);
    
    switch (event.getAction()) {
        case MotionEvent.ACTION_DOWN:
            if (touchedRegion != null) {
                // 触摸到区域，更新输入状态
                updateInputState(normalizedX, normalizedY, true);
                return true; // 消费事件
            } else {
                // 触摸不在任何 UI 区域内，允许穿透
                return false;
            }
            
        case MotionEvent.ACTION_MOVE:
        case MotionEvent.ACTION_UP:
        case MotionEvent.ACTION_CANCEL:
            if (currentTouchRegion != null) {
                return true; // 消费事件
            } else {
                return false; // 允许穿透
            }
    }
    
    return false; // 默认不消费事件
}
```

**验证结果**:
- ✅ 布局未启用时允许穿透
- ✅ 没有 UI 元素时允许穿透
- ✅ 触摸到 UI 区域时消费事件
- ✅ 触摸到空白区域时允许穿透

---

## 🟡 待实现功能：穿透设置字段

### 需求分析

根据用户要求，布局文件应该有一个字段可以设置点击事件是否穿透。当前布局文件的 UI 元素定义如下：

```json
{
  "ui": [{
    "id": "steering_wheel",
    "anchor": "bottom-center",
    "offset": {"x": 0, "y": -100},
    "size": {"mode": "absolute", "width": 200, "height": 200},
    "hitbox": {"shape": "circle", "padding": 10}
  }]
}
```

### 建议实现

**1. 在 UiElement 中添加 `clickThrough` 字段**:

```java
// UiElement.java
public class UiElement {
    private String id;
    private Boolean enabled = true;
    // ... 其他字段
    
    /**
     * 点击穿透设置
     * true: 点击事件穿透到下层窗口
     * false: 点击事件由布局消费 (默认)
     */
    private Boolean clickThrough = false;
    
    // Getter/Setter
    public Boolean getClickThrough() { return clickThrough; }
    public void setClickThrough(Boolean clickThrough) { this.clickThrough = clickThrough; }
}
```

**2. 在 LayoutRenderer 中处理穿透设置**:

```java
// LayoutRenderer.onTouchEvent()
Region touchedRegion = findTouchedRegion(normalizedX, normalizedY);

if (touchedRegion != null) {
    // 检查该区域是否设置了穿透
    if (touchedRegion.isClickThrough()) {
        // 允许穿透，但仍然更新输入状态
        updateInputState(normalizedX, normalizedY, true);
        return false; // 允许穿透
    } else {
        // 正常消费事件
        updateInputState(normalizedX, normalizedY, true);
        return true; // 消费事件
    }
}
```

**3. 在 Region 中添加 `clickThrough` 字段**:

```java
// Region.java
public class Region {
    private final String id;
    // ... 其他字段
    private final boolean clickThrough; // 点击穿透设置
    
    // Getter
    public boolean isClickThrough() {
        return clickThrough;
    }
}
```

**4. 在 LayoutToRegionConverter 中传递穿透设置**:

```java
// LayoutToRegionConverter.java
public static List<Region> convertLayoutToRegions(LayoutConfiguration config) {
    List<Region> regions = new ArrayList<>();
    
    for (UiElement element : config.getUi()) {
        Region region = new Region(
            element.getId(),
            // ... 其他参数
            element.getClickThrough() != null ? element.getClickThrough() : false
        );
        regions.add(region);
    }
    
    return regions;
}
```

---

## 📋 布局文件格式建议

### 完整示例

```json
{
  "version": "1.0.0",
  "ui": [
    {
      "id": "steering_wheel",
      "enabled": true,
      "anchor": "bottom-center",
      "offset": {"x": 0, "y": -100, "unit": "px"},
      "size": {"mode": "absolute", "width": 200, "height": 200},
      "opacity": 0.8,
      "resource": "steering_wheel.png",
      "hitbox": {"shape": "circle", "padding": 10},
      "clickThrough": false
    },
    {
      "id": "transparent_button",
      "enabled": true,
      "anchor": "top-right",
      "offset": {"x": -20, "y": 20, "unit": "px"},
      "size": {"mode": "absolute", "width": 100, "height": 50},
      "hitbox": {"shape": "rect", "padding": 0},
      "clickThrough": true
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

### 字段说明

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `clickThrough` | Boolean | false | 点击事件是否穿透到下层窗口 |

**使用场景**:
- `clickThrough: false` (默认): 方向盘、油门、刹车等需要响应的控件
- `clickThrough: true`: 透明按钮、信息显示区域等不需要阻挡下层窗口的元素

---

## 🎯 实施建议

### 高优先级 (P0)

1. **在 UiElement 中添加 `clickThrough` 字段**
   - 添加字段定义
   - 添加 Getter/Setter
   - 设置默认值为 false

2. **在 Region 中添加 `clickThrough` 字段**
   - 添加字段定义
   - 添加 Getter
   - 在构造函数中接收参数

3. **在 LayoutToRegionConverter 中传递穿透设置**
   - 从 UiElement 读取 `clickThrough`
   - 传递给 Region 构造函数

4. **在 LayoutRenderer 中处理穿透设置**
   - 检查区域的 `clickThrough` 设置
   - 根据设置决定是否消费事件

### 中优先级 (P1)

5. **更新布局管理 UI**
   - 在布局编辑器中添加穿透设置选项
   - 在属性面板中显示/修改穿透设置

6. **添加单元测试**
   - 测试 `clickThrough` 字段序列化/反序列化
   - 测试 `LayoutRenderer` 的穿透处理逻辑

---

## 📊 验证结论

| 功能 | 状态 | 测试 | 说明 |
|------|------|------|------|
| 根 View 点击穿透 | ✅ | 已验证 | `FLAG_NOT_TOUCH_MODAL` |
| 悬浮球点击处理 | ✅ | 已验证 | 消费事件 |
| 布局内容点击处理 | ✅ | 已验证 | 有内容消费，空白穿透 |
| 穿透设置字段 | 🟡 | 待实现 | 需添加到布局文件 |

---

**报告生成时间**: 2026-02-20  
**验证状态**: ✅ 穿透功能已实现，🟡 穿透设置字段待实现
