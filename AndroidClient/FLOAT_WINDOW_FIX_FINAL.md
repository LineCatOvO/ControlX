# 浮窗触摸穿透修复 - 最终方案

**日期**: 2026-02-21  
**状态**: ✅ 第一阶段修复完成

---

## 问题根因

### 核心问题：`FLAG_NOT_TOUCH_MODAL` 的局限性

`FLAG_NOT_TOUCH_MODAL` 只允许**窗口区域外**的事件穿透，**窗口区域内**的事件仍由该窗口处理！

```
┌─────────────────────────────────────┐
│  浮窗窗口 (wrap_content)             │
│  ┌─────────────────┐                │
│  │  浮窗 UI 区域     │ → 浮窗处理事件  │ ← 事件被消费
│  └─────────────────┘                │
│         ↓ 区域外事件传递到下层       │
├─────────────────────────────────────┤
│  下层应用窗口                        │
└─────────────────────────────────────┘
```

即使 `onTouchEvent()` 返回 `false`，WMS 已经将事件发送给浮窗窗口，返回 `false` 只影响事件是否传递给子 View，**不影响窗口间的事件传递**。

### 为什么之前的修复无效？

1. **TouchThroughFrameLayout 返回 false** - 只影响 View 层级内的事件传递，不影响窗口间
2. **PlatformAdaptationLayer 返回 false** - 同样只影响 View 层级
3. **layout_render_container 全屏** - 导致浮窗窗口计算为全屏大小

---

## 最终解决方案

### 使用 `FLAG_NOT_TOUCHABLE` ⭐

**原理**: `FLAG_NOT_TOUCHABLE` 让窗口完全忽略触摸事件，WMS 直接将事件传递给下层窗口。

```
┌─────────────────────────────────────┐
│  浮窗窗口 (FLAG_NOT_TOUCHABLE)      │
│  ┌─────────────────┐                │
│  │  浮窗 UI 区域     │ → 事件穿透     │ ← 不接收事件
│  └─────────────────┘                │
│         ↓ 所有事件传递到下层         │
├─────────────────────────────────────┤
│  下层应用窗口                        │ ← 接收所有事件
└─────────────────────────────────────┘
```

### 动态切换 Flag

- **默认状态**: `FLAG_NOT_TOUCHABLE` - 触摸穿透
- **显示菜单时**: 移除 `FLAG_NOT_TOUCHABLE` - 接收触摸
- **隐藏菜单时**: 恢复 `FLAG_NOT_TOUCHABLE` - 触摸穿透
- **ACTION_OUTSIDE**: 检测外部点击，自动关闭菜单

---

## 修改内容

### 1. 默认窗口参数

```java
// FloatWindowManager.java:114-121
windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
        | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE      // ← 新增
        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH; // ← 新增
```

### 2. 显示菜单时移除 FLAG_NOT_TOUCHABLE

```java
// showPopupMenu(), showSettingsPanel(), showLayoutManagementPanel()
windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
        | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH;
// 注意：没有 FLAG_NOT_TOUCHABLE
```

### 3. 隐藏菜单时恢复 FLAG_NOT_TOUCHABLE

```java
// hidePopupMenu(), hideSettingsPanel(), hideLayoutManagementPanel()
windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
        | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE      // ← 恢复
        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH;
```

### 4. 添加 ACTION_OUTSIDE 处理

```java
// floatView.setOnTouchListener()
case MotionEvent.ACTION_OUTSIDE:
    Log.d(TAG, "ACTION_OUTSIDE detected, closing menus");
    if (isPopupMenuShowing) {
        hidePopupMenu();
    }
    if (isLayoutManagementPanelShowing) {
        hideLayoutManagementPanel();
    }
    break;
```

---

## 修改文件清单

1. **FloatWindowManager.java**
   - 修改默认窗口参数（添加 `FLAG_NOT_TOUCHABLE` 和 `FLAG_WATCH_OUTSIDE_TOUCH`）
   - 修改 `showPopupMenu()` - 移除 `FLAG_NOT_TOUCHABLE`
   - 修改 `hidePopupMenu()` - 恢复 `FLAG_NOT_TOUCHABLE`
   - 修改 `showSettingsPanel()` - 移除 `FLAG_NOT_TOUCHABLE`
   - 修改 `hideSettingsPanel()` - 恢复 `FLAG_NOT_TOUCHABLE`
   - 修改 `showLayoutManagementPanel()` - 移除 `FLAG_NOT_TOUCHABLE`
   - 修改 `hideLayoutManagementPanel()` - 恢复 `FLAG_NOT_TOUCHABLE`
   - 添加 `ACTION_OUTSIDE` 处理

---

## 测试验证

### 测试场景

| 场景 | 预期行为 | 验证方法 |
|------|----------|----------|
| 浮窗默认状态 | 触摸穿透到下层 | 点击浮窗区域外的应用 |
| 显示菜单时 | 菜单按钮可点击 | 点击菜单按钮 |
| 点击菜单外部 | 菜单自动关闭 | 点击菜单外区域 (ACTION_OUTSIDE) |
| 启用布局 | UI 元素响应，空白穿透 | 分别点击 UI 和空白 |
| 服务启动后 | 下层应用可正常触摸 | 操作下层应用 |

### 编译安装

```bash
cd projects/ControlX/AndroidClient
gradlew.bat assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 技术要点

### FLAG_NOT_TOUCHABLE

| 属性 | 说明 |
|------|------|
| **作用** | 使窗口不可触摸，用户无法与该窗口交互 |
| **使用场景** | 展示窗口但不希望用户进行任何交互时 |
| **事件传递** | 窗口完全忽略触摸事件，事件直接传递给下层窗口 |

### FLAG_WATCH_OUTSIDE_TOUCH

| 属性 | 说明 |
|------|------|
| **作用** | 如果窗口外部被触摸，会触发窗口的 `onTouchEvent()`，收到 `ACTION_OUTSIDE` 事件 |
| **使用场景** | 监控用户点击窗口之外的区域，实现自动关闭菜单 |

### 事件传递流程

```
用户触摸屏幕
    ↓
WMS 判断触摸位置
    ├─ 在浮窗窗口区域内
    │   ├─ 有 FLAG_NOT_TOUCHABLE → 直接传递给下层应用 ✅
    │   └─ 无 FLAG_NOT_TOUCHABLE → 发送给浮窗窗口
    │       ├─ 在圆形按钮上 → 显示菜单
    │       └─ 在菜单外部 → ACTION_OUTSIDE → 关闭菜单
    │
    └─ 在浮窗窗口区域外 → 传递给下层应用 ✅
```

---

## 注意事项

1. **Python 脚本修改**: 使用 Python 修改文件，避免 PowerShell 添加 BOM
2. **Flag 状态管理**: 确保显示/隐藏菜单时正确切换 Flag
3. **ACTION_OUTSIDE**: 需要 `FLAG_WATCH_OUTSIDE_TOUCH` 才能收到
4. **圆形按钮点击**: 显示菜单时临时移除 `FLAG_NOT_TOUCHABLE`

---

## 相关文档

- [浮窗点击事件穿透功能验证报告](./FLOAT_WINDOW_CLICK_THROUGH_VERIFICATION.md)
- [之前的修复尝试](./FLOAT_WINDOW_TOUCH_THROUGH_FIX.md)
