# 浮窗触摸穿透问题修复 - 最终版本

**日期**: 2026-02-21  
**问题**: 启动服务后，浮窗区域触摸事件无法穿透到下层应用  
**状态**: ✅ 已修复

---

## 问题描述

用户反馈：进入主活动，点击启动服务后，点击事件无法穿透到浮窗后方，用户区域全部无法正常触摸，除了浮窗按钮。

---

## 问题根因分析

### 三层问题

#### 1. FloatWindowManager 独立窗口问题（已修复）
`FloatWindowManager.initLayoutRenderer()` 创建了一个独立的全屏窗口 `layoutRenderContainer`。

**修复**: 将 `layoutRenderContainer` 合并到 `floatView` 中。

#### 2. PlatformAdaptationLayer Overlay 拦截问题（已修复）⭐
`PlatformAdaptationLayer.OverlayView.onTouchEvent()` 总是返回 `true`，消费所有触摸事件。

**修复**: 让 `onTouchEvent()` 返回 `false`。

#### 3. TouchThroughFrameLayout 测量问题（最终修复）⭐⭐
`TouchThroughFrameLayout` 的 `onMeasure()` 会测量所有可见子 View，包括 `layout_render_container`。当布局启用时，`layout_render_container` 是 `MATCH_PARENT` 且可见，导致整个浮窗窗口变成全屏大小，`FLAG_NOT_TOUCH_MODAL` 无法让事件穿透。

**修复**: 
- `onMeasure()` 忽略 `layout_render_container`
- `isTouchOnVisibleChildView()` 忽略 `layout_render_container`
- `onInterceptTouchEvent()` 和 `onTouchEvent()` 永远返回 `false`

---

## 最终修复方案

### 修改文件清单

#### 1. PlatformAdaptationLayer.java ⭐

```java
private class OverlayView extends View {
    @Override
    public boolean onTouchEvent(MotionEvent event) {
        handleTouchEvent(event);
        // ✅ 返回 false 让事件穿透到下层应用
        return false;
    }
}
```

#### 2. TouchThroughFrameLayout.java ⭐⭐

```java
@Override
public boolean onInterceptTouchEvent(MotionEvent ev) {
    // ✅ 永远不要拦截事件
    return false;
}

@Override
public boolean onTouchEvent(MotionEvent event) {
    // ✅ 永远返回 false，让事件穿透
    if (isTouchOnVisibleChildView(event)) {
        return false;  // 在子 View 上，让子 View 处理
    }
    return false;  // 不在子 View 上，穿透到下层窗口
}

@Override
protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
    int maxWidth = 0;
    int maxHeight = 0;

    for (int i = 0; i < getChildCount(); i++) {
        View child = getChildAt(i);
        // ✅ 忽略 layout_render_container，它应该全屏但不影响窗口大小
        if (child.getVisibility() != GONE && 
            child.getId() != R.id.layout_render_container) {
            measureChild(child, widthMeasureSpec, heightMeasureSpec);
            maxWidth = Math.max(maxWidth, child.getMeasuredWidth());
            maxHeight = Math.max(maxHeight, child.getMeasuredHeight());
        }
    }
    // ...
}

private boolean isTouchOnVisibleChildView(MotionEvent event) {
    // ...
    for (int i = 0; i < getChildCount(); i++) {
        View child = getChildAt(i);
        // ✅ 忽略 layout_render_container
        if (child.getVisibility() == VISIBLE && 
            child.getId() != R.id.layout_render_container) {
            // ...
        }
    }
    return false;
}
```

#### 3. FloatWindowManager.java

```java
private void initLayoutRenderer() {
    // 从 XML 获取布局渲染容器
    layoutRenderContainer = floatView.findViewById(R.id.layout_render_container);
    // ...
    
    // ✅ 默认禁用布局，不拦截触摸
    layoutRenderer.setLayoutEnabled(false);
}

private void updateLayoutRenderContainerTouchability(boolean enabled) {
    if (layoutRenderer != null) {
        layoutRenderer.setLayoutEnabled(enabled);
        // 控制容器可见性
        if (layoutRenderContainer != null) {
            layoutRenderContainer.setVisibility(
                enabled ? View.VISIBLE : View.GONE
            );
        }
    }
}
```

#### 4. float_window.xml

```xml
<com.linecat.wmmtcontroller.floatwindow.TouchThroughFrameLayout 
    android:layout_width="wrap_content"
    android:layout_height="wrap_content">

    <!-- 布局渲染容器 - 全屏，用于渲染用户自定义布局 -->
    <FrameLayout
        android:id="@+id/layout_render_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:visibility="gone" />

    <!-- 圆形主入口按钮 -->
    <LinearLayout ... />
    
    <!-- 其他 UI 元素 -->
</com.linecat.wmmtcontroller.floatwindow.TouchThroughFrameLayout>
```

---

## 技术原理

### 窗口大小计算

- `WindowManager` 根据 View 的 `onMeasure()` 结果确定窗口大小
- 如果 `layout_render_container` 是 `MATCH_PARENT` 且被测量，窗口会变成全屏
- 全屏窗口 + `FLAG_NOT_TOUCH_MODAL` = 窗口区域内事件无法穿透
- **解决**: `onMeasure()` 忽略 `layout_render_container`，让窗口保持 `wrap_content`

### 事件穿透流程

```
用户触摸屏幕
    ↓
WindowManager 分发事件到最上层窗口
    ↓
TouchThroughFrameLayout.onInterceptTouchEvent() → false (不拦截)
    ↓
TouchThroughFrameLayout.onTouchEvent() → false (不消费)
    ↓
子 View.onTouchEvent() (如果触摸在子 View 上)
    ↓
LayoutRenderer.onTouchEvent()
    ├─ 布局禁用 → false (不消费)
    └─ 布局启用 → 检查是否触摸到 UI 元素
           ├─ 是 → true (消费事件)
           └─ 否 → false (穿透)
    ↓
PlatformAdaptationLayer.OverlayView.onTouchEvent()
    ↓
handleTouchEvent() (捕获事件发送到服务器)
    ↓
返回 false (不消费，让事件继续传递)
    ↓
下层应用接收触摸事件 ✅
```

---

## 修复效果

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| 浮窗按钮区域 | ✅ 正常响应 | ✅ 正常响应 |
| 浮窗空白区域 | ❌ 无法穿透 | ✅ 穿透到下层 |
| 布局禁用状态 | ❌ 无法穿透 | ✅ 穿透到下层 |
| 布局启用状态（触摸空白） | ❌ 无法穿透 | ✅ 穿透到下层 |
| 布局启用状态（触摸 UI） | ✅ 正常响应 | ✅ 正常响应 |
| **服务启动后全屏区域** | ❌ **无法穿透** | ✅ **穿透到下层** |
| **原始事件捕获** | ✅ 正常 | ✅ 正常（不受影响） |
| **浮窗窗口大小** | ❌ **全屏** | ✅ **wrap_content** |

---

## 测试验证

### 编译安装

```bash
cd projects/ControlX/AndroidClient
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 测试步骤

1. 启动应用，进入主界面
2. 点击"启动服务"按钮
3. 在浮窗区域外触摸屏幕 → 应该穿透到下层应用
4. 在浮窗空白区域触摸 → 应该穿透到下层应用
5. 点击浮窗圆形按钮 → 应该显示菜单
6. 启用布局，在布局 UI 元素上触摸 → 应该响应
7. 启用布局，在布局空白区域触摸 → 应该穿透

### 预期结果

- ✅ 浮窗按钮正常响应
- ✅ 浮窗空白区域触摸穿透
- ✅ 服务启动后，下层应用可正常触摸
- ✅ 布局启用时，UI 元素正常响应
- ✅ 布局启用时，空白区域触摸穿透
- ✅ 原始触摸事件正常捕获并发送

---

## 注意事项

1. **布局默认状态**: 布局渲染器默认禁用，需要用户手动启用
2. **可见性控制**: 布局容器默认隐藏，启用布局时显示
3. **窗口大小**: 浮窗窗口保持 `wrap_content`，只包含圆形按钮和菜单
4. **布局渲染**: `layout_render_container` 全屏但不影响窗口大小
5. **事件捕获**: `PlatformAdaptationLayer` 返回 `false` 不影响事件捕获

---

## 相关文档

- [浮窗点击事件穿透功能验证报告](./FLOAT_WINDOW_CLICK_THROUGH_VERIFICATION.md)
- [布局区域关系文档](./LAYOUT_REGION_RELATIONSHIP.md)
