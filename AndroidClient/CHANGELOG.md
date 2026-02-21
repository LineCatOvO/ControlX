# Changelog

## [2026-02-21] refactor: 浮窗架构重构

### 新增文件
- `FloatWindowCallback.java` - UI 层回调接口
- `ConnectionManager.java` - 连接管理器

### 重构内容
- FloatWindowManager：移除 TransportController 依赖，通过回调接口通信
- OverlayController：实现协调者模式，实现 FloatWindowCallback
- 触摸事件：根据触摸位置返回 true/false，实现正确的事件穿透
- 窗口管理：移除独立的 layoutRenderContainer 窗口，合并到 floatView

### 架构改进
- 依赖方向修正：UI 层不再直接依赖业务层
- 职责分离：FloatWindowManager 仅负责 UI，ConnectionManager 负责连接
- 窗口数量：从 3 个减少到 2 个
