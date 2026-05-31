# Task-008: 删除blessed终端UI，转为网页监控面板

**创建时间**：2026-03-17
**优先级**：高
**状态**：待处理
**任务锁**：🔓 待处理 - - -
**关联P0任务**：task-P0-1773756749.md（工作目录未提交文件，需优先处理）

## 任务描述

将ControlX Server端的基于blessed的终端UI删除，转为基于网页的监控面板。服务端启动后打印基础信息和log到控制台。

## 任务背景

### 当前架构分析

**blessed终端UI位置**：
- 文件：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/viewer/terminalViewer.ts`
- 依赖：`blessed@^0.1.81`, `@types/blessed@^0.1.27`
- 启用控制：环境变量 `TUI=1` 或 `NODE_ENV !== "test"`
- 功能：显示键盘、游戏手柄、鼠标、摇杆状态，拦截console输出

**现有HTTP服务器**：
- 文件：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/health/healthCheck.ts`
- 端点：`/health`, `/ready`, `/metrics`, `/stats`
- 已有CORS支持

**输入状态管理**：
- 文件：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/input/state.ts`
- 导出：`inputState` 对象

**指标收集**：
- 文件：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/utils/metrics.ts`
- 功能：连接统计、输入事件统计、资源监控

## 执行计划

### 阶段1：删除blessed终端UI（3个任务）

#### 任务1-1：删除terminalViewer.ts文件
**任务ID**：task-008-1-1
**操作类型**：文件删除
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/viewer/terminalViewer.ts`
**预计执行时间**：约10秒

##### 任务背景
该文件是blessed终端UI的核心实现，包含createViewer和renderStatus函数。删除此文件是移除blessed依赖的第一步。

##### 操作命令（必填）
```
操作：使用 RunShellCommand 工具
命令：rm /workspaces/AgentWorkspace/projects/ControlX/Server/src/viewer/terminalViewer.ts
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

##### 验证命令（必填）
```
验证命令：test -f /workspaces/AgentWorkspace/projects/ControlX/Server/src/viewer/terminalViewer.ts && echo "文件仍存在" || echo "文件已删除"
预期输出：文件已删除
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
从git历史恢复文件：git checkout HEAD -- Server/src/viewer/terminalViewer.ts
```

##### 依赖关系
- 前置任务：无
- 后置任务：task-008-1-2（修改app.ts移除导入）

---

#### 任务1-2：修改app.ts移除blessed相关代码
**任务ID**：task-008-1-2
**操作类型**：文件编辑
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/app.ts`
**预计执行时间**：约30秒

##### 任务背景
app.ts中导入了terminalViewer模块，并使用viewer实例拦截console输出。需要移除这些代码，恢复原始console行为。

##### 需要移除的代码段

**第8行导入语句**：
```typescript
import { createViewer, renderStatus } from "./viewer/terminalViewer";
```

**第37-72行viewer相关代码**：
```typescript
// 启动blessed终端Viewer（通过TUI环境变量控制）
const viewerEnabled =
    process.env.TUI === "1" || process.env.NODE_ENV !== "test";
let viewer: ReturnType<typeof createViewer> | null = null;
let rawConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
};

// 固定渲染帧率
const FPS = 15;

if (viewerEnabled) {
    viewer = createViewer();

    // 将viewer实例导出到全局，供其他模块使用
    (global as any).viewer = viewer;

    // 拦截console，将日志路由到viewer的日志面板
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
        viewer?.logger.info(args.join(" "));
    };

    console.warn = (...args) => {
        viewer?.logger.warn(args.join(" "));
    };

    console.error = (...args) => {
        viewer?.logger.error(args.join(" "));
    };

    // 恢复原始console的exit事件
    process.on("exit", () => {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
    });
}
```

**第105-128行渲染循环代码**：
```typescript
if (viewerEnabled) {
    // 初始化FPS计算变量
    let frameCount = 0;
    let startTime = Date.now();

    // 设置固定刷新率的渲染循环（15 FPS）
    setInterval(() => {
        if (viewer) {
            // 更新帧数和时间
            frameCount++;

            // 将动态FPS计算所需的变量传递给状态
            const stateWithFps = {
                ...inputState,
                frameCount,
                startTime,
            };

            renderStatus(viewer.statusBox, stateWithFps);
            viewer.screen.render();

            // 每秒重置一次计数器
            const now = Date.now();
            if (now - startTime >= 1000) {
                frameCount = 0;
                startTime = now;
            }
        }
    }, 1000 / FPS);
}
```

**第143-147行SIGINT处理中的console恢复代码**：
```typescript
        // 恢复原始console
        console.log = rawConsole.log;
        console.warn = rawConsole.warn;
        console.error = rawConsole.error;
```

##### 操作命令（必填）
```
操作：使用 Edit 工具
文件路径：/workspaces/AgentWorkspace/projects/ControlX/Server/src/app.ts
搜索内容（old_str）：完整代码段（见上方）
替换内容（new_str）：空或新代码
```

##### 验证命令（必填）
```
验证命令：grep -n "blessed\|terminalViewer\|createViewer\|renderStatus\|viewerEnabled" /workspaces/AgentWorkspace/projects/ControlX/Server/src/app.ts
预期输出：无匹配（空输出）
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
git checkout HEAD -- Server/src/app.ts
```

##### 依赖关系
- 前置任务：task-008-1-1（删除terminalViewer.ts）
- 后置任务：task-008-1-3（移除package.json依赖）

---

#### 任务1-3：移除package.json中的blessed依赖
**任务ID**：task-008-1-3
**操作类型**：文件编辑
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/Server/package.json`
**预计执行时间**：约20秒

##### 任务背景
package.json中包含blessed和@types/blessed依赖，需要移除这些依赖声明。

##### 需要移除的依赖

**devDependencies中**：
```json
    "@types/blessed": "^0.1.27",
```
（第25行左右）

```json
    "blessed": "^0.1.81",
```
（第30行左右）

##### 操作命令（必填）
```
操作：使用 Edit 工具（两次编辑）
文件路径：/workspaces/AgentWorkspace/projects/ControlX/Server/package.json

第一次编辑：
搜索内容（old_str）：
    "@types/blessed": "^0.1.27",
替换内容（new_str）：
（空，删除此行）

第二次编辑：
搜索内容（old_str）：
    "blessed": "^0.1.81",
替换内容（new_str）：
（空，删除此行）
```

##### 验证命令（必填）
```
验证命令：grep -n "blessed" /workspaces/AgentWorkspace/projects/ControlX/Server/package.json
预期输出：无匹配（空输出）
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
git checkout HEAD -- Server/package.json
```

##### 依赖关系
- 前置任务：task-008-1-2（修改app.ts）
- 后置任务：task-008-2-1（创建web监控模块）

---

### 阶段2：创建网页监控面板（5个任务）

#### 任务2-1：创建web监控模块目录结构
**任务ID**：task-008-2-1
**操作类型**：命令执行
**目标**：创建目录结构
**预计执行时间**：约10秒

##### 任务背景
需要创建web监控模块的目录结构，用于存放HTTP服务器扩展和静态文件。

##### 目录结构
```
Server/src/web/
├── index.ts              # Web模块入口
├── webServer.ts          # HTTP服务器扩展
└── static/               # 静态文件目录
    ├── index.html        # 监控面板HTML
    ├── style.css         # 样式文件
    └── app.js            # 前端JavaScript
```

##### 操作命令（必填）
```
操作：使用 RunShellCommand 工具
命令：mkdir -p /workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

##### 验证命令（必填）
```
验证命令：test -d /workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static && echo "目录创建成功" || echo "目录创建失败"
预期输出：目录创建成功
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
rm -rf /workspaces/AgentWorkspace/projects/ControlX/Server/src/web
```

##### 依赖关系
- 前置任务：task-008-1-3（移除package.json依赖）
- 后置任务：task-008-2-2（创建webServer.ts）

---

#### 任务2-2：创建webServer.ts - HTTP服务器扩展
**任务ID**：task-008-2-2
**操作类型**：文件创建
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/web/webServer.ts`
**预计执行时间**：约60秒

##### 任务背景
扩展现有健康检查HTTP服务器，添加静态文件服务和WebSocket状态推送功能。

##### 完整文件内容
```typescript
/**
 * ============================================================================
 * Web监控服务器模块 (Web Monitor Server Module)
 * ============================================================================
 *
 * 【模块职责】
 * 提供基于HTTP的网页监控面板，实时显示服务器状态和输入信息。
 *
 * 【核心功能】
 * 1. 静态文件服务：提供HTML/CSS/JS文件
 * 2. 状态API：提供实时状态查询接口
 * 3. WebSocket推送：实时推送状态更新到前端
 *
 * @module web/webServer
 * @version 1.0.0
 * @last-updated 2026-03-17
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { inputState } from '../input/state';
import { getMetricsCollector } from '../utils/metrics';
import { getResourceMonitor } from '../utils/resourceMonitor';

/**
 * Web监控配置
 */
export interface WebMonitorConfig {
    port: number;
    host?: string;
    wsPort?: number; // WebSocket端口（可选，默认与HTTP同端口）
}

// Web监控服务器实例
let httpServer: http.Server | null = null;
let wsServer: WebSocketServer | null = null;
let config: WebMonitorConfig | null = null;

// 静态文件MIME类型映射
const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

/**
 * 获取静态文件内容
 */
function serveStatic(filePath: string): { content: Buffer | string; contentType: string } | null {
    // 静态文件目录
    const staticDir = path.join(__dirname, 'static');
    const fullPath = path.join(staticDir, filePath);

    // 安全检查：防止目录遍历攻击
    if (!fullPath.startsWith(staticDir)) {
        return null;
    }

    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
        return null;
    }

    // 获取文件扩展名和MIME类型
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 读取文件内容
    const content = fs.readFileSync(fullPath);
    return { content, contentType };
}

/**
 * 获取服务器状态
 */
function getServerStatus() {
    const metricsCollector = getMetricsCollector();
    const resourceMonitor = getResourceMonitor();
    const resourceStats = resourceMonitor.getResourceStats();
    const inputStats = metricsCollector.getInputStats();

    return {
        timestamp: Date.now(),
        uptime: resourceStats.uptime,
        memory: resourceStats.memoryUsage,
        cpu: resourceStats.cpuUsage,
        input: {
            keyboard: Array.from(inputState.keyboard),
            gamepad: Array.from(inputState.gamepad || []),
            mouse: inputState.mouse,
            joystick: inputState.joystick,
        },
        stats: inputStats,
        connections: {
            active: metricsCollector.getActiveConnections().length,
        },
    };
}

/**
 * 处理HTTP请求
 */
function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url || '/';
    const method = req.method || 'GET';

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS请求
    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 路由处理
    if (url === '/' || url === '/index.html') {
        // 主页
        const file = serveStatic('index.html');
        if (file) {
            res.writeHead(200, { 'Content-Type': file.contentType });
            res.end(file.content);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('index.html not found');
        }
    } else if (url === '/style.css') {
        const file = serveStatic('style.css');
        if (file) {
            res.writeHead(200, { 'Content-Type': file.contentType });
            res.end(file.content);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('style.css not found');
        }
    } else if (url === '/app.js') {
        const file = serveStatic('app.js');
        if (file) {
            res.writeHead(200, { 'Content-Type': file.contentType });
            res.end(file.content);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('app.js not found');
        }
    } else if (url === '/api/status') {
        // 状态API
        const status = getServerStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status, null, 2));
    } else {
        // 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

/**
 * 广播状态更新到所有WebSocket客户端
 */
function broadcastStatus(): void {
    if (!wsServer) return;

    const status = getServerStatus();
    const message = JSON.stringify({ type: 'status', data: status });

    wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 状态广播定时器
let broadcastInterval: NodeJS.Timeout | null = null;

/**
 * 创建Web监控服务器
 */
export function createWebMonitorServer(serverConfig: WebMonitorConfig): {
    start: () => Promise<void>;
    stop: () => Promise<void>;
} {
    config = serverConfig;

    return {
        start: () => {
            return new Promise((resolve, reject) => {
                if (httpServer) {
                    console.warn('Web monitor server already running');
                    resolve();
                    return;
                }

                // 创建HTTP服务器
                httpServer = http.createServer(handleRequest);

                // 创建WebSocket服务器（附加到HTTP服务器）
                wsServer = new WebSocketServer({ server: httpServer });

                wsServer.on('connection', (ws) => {
                    console.log('Web monitor client connected');

                    // 发送初始状态
                    const status = getServerStatus();
                    ws.send(JSON.stringify({ type: 'status', data: status }));

                    ws.on('close', () => {
                        console.log('Web monitor client disconnected');
                    });
                });

                httpServer.on('error', (error: Error) => {
                    console.error('Web monitor server error:', error);
                    reject(error);
                });

                httpServer.listen(config.port, config.host || '0.0.0.0', () => {
                    console.log(`Web monitor server listening on http://${config.host || '0.0.0.0'}:${config.port}`);
                    console.log(`  - Monitor panel: http://localhost:${config.port}`);
                    console.log(`  - Status API: http://localhost:${config.port}/api/status`);

                    // 启动状态广播（每100ms）
                    broadcastInterval = setInterval(broadcastStatus, 100);

                    resolve();
                });
            });
        },

        stop: () => {
            return new Promise((resolve) => {
                // 停止广播
                if (broadcastInterval) {
                    clearInterval(broadcastInterval);
                    broadcastInterval = null;
                }

                // 关闭WebSocket服务器
                if (wsServer) {
                    wsServer.close();
                    wsServer = null;
                }

                // 关闭HTTP服务器
                if (httpServer) {
                    httpServer.close(() => {
                        console.log('Web monitor server stopped');
                        httpServer = null;
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        },
    };
}

/**
 * 启动Web监控服务器（便捷函数）
 */
export function startWebMonitorServer(port: number = 8081): Promise<void> {
    const server = createWebMonitorServer({ port });
    return server.start();
}

/**
 * 停止Web监控服务器
 */
export function stopWebMonitorServer(): Promise<void> {
    return new Promise((resolve) => {
        if (!httpServer) {
            resolve();
            return;
        }

        // 停止广播
        if (broadcastInterval) {
            clearInterval(broadcastInterval);
            broadcastInterval = null;
        }

        // 关闭WebSocket服务器
        if (wsServer) {
            wsServer.close();
            wsServer = null;
        }

        httpServer.close(() => {
            console.log('Web monitor server stopped');
            httpServer = null;
            resolve();
        });
    });
}
```

##### 验证命令（必填）
```
验证命令：test -f /workspaces/AgentWorkspace/projects/ControlX/Server/src/web/webServer.ts && echo "文件创建成功" || echo "文件创建失败"
预期输出：文件创建成功
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
rm /workspaces/AgentWorkspace/projects/ControlX/Server/src/web/webServer.ts
```

##### 依赖关系
- 前置任务：task-008-2-1（创建目录结构）
- 后置任务：task-008-2-3（创建index.html）

---

#### 任务2-3：创建监控面板HTML
**任务ID**：task-008-2-3
**操作类型**：文件创建
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/index.html`
**预计执行时间**：约30秒

##### 任务背景
创建网页监控面板的HTML结构，显示服务器状态和输入信息。

##### 完整文件内容
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ControlX Server Monitor</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>ControlX Server Monitor</h1>
            <div class="status-badge" id="connection-status">Connecting...</div>
        </header>

        <main>
            <!-- 服务器信息 -->
            <section class="card">
                <h2>Server Info</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="label">Uptime:</span>
                        <span class="value" id="uptime">--</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Memory:</span>
                        <span class="value" id="memory">--</span>
                    </div>
                    <div class="info-item">
                        <span class="label">CPU:</span>
                        <span class="value" id="cpu">--</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Connections:</span>
                        <span class="value" id="connections">--</span>
                    </div>
                </div>
            </section>

            <!-- 输入状态 -->
            <section class="card">
                <h2>Input State</h2>
                <div class="input-grid">
                    <!-- 键盘 -->
                    <div class="input-section">
                        <h3>Keyboard</h3>
                        <div class="key-display" id="keyboard-keys">
                            <span class="key-placeholder">No keys pressed</span>
                        </div>
                    </div>

                    <!-- 游戏手柄 -->
                    <div class="input-section">
                        <h3>Gamepad</h3>
                        <div class="key-display" id="gamepad-buttons">
                            <span class="key-placeholder">No buttons pressed</span>
                        </div>
                    </div>

                    <!-- 鼠标 -->
                    <div class="input-section">
                        <h3>Mouse</h3>
                        <div class="mouse-info">
                            <div class="mouse-coords">
                                <span>X: <span id="mouse-x">0</span></span>
                                <span>Y: <span id="mouse-y">0</span></span>
                            </div>
                            <div class="mouse-buttons">
                                <span class="mouse-btn" id="mouse-left">L</span>
                                <span class="mouse-btn" id="mouse-middle">M</span>
                                <span class="mouse-btn" id="mouse-right">R</span>
                            </div>
                        </div>
                    </div>

                    <!-- 摇杆 -->
                    <div class="input-section">
                        <h3>Joystick</h3>
                        <div class="joystick-display">
                            <div class="joystick-visual">
                                <div class="joystick-dot" id="joystick-dot"></div>
                            </div>
                            <div class="joystick-values">
                                <span>X: <span id="joystick-x">0.00</span></span>
                                <span>Y: <span id="joystick-y">0.00</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 统计信息 -->
            <section class="card">
                <h2>Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Events/sec:</span>
                        <span class="stat-value" id="events-per-sec">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Events:</span>
                        <span class="stat-value" id="total-events">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Keyboard:</span>
                        <span class="stat-value" id="keyboard-events">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Gamepad:</span>
                        <span class="stat-value" id="gamepad-events">0</span>
                    </div>
                </div>
            </section>
        </main>

        <footer>
            <p>ControlX Server Monitor v1.0.0</p>
        </footer>
    </div>

    <script src="app.js"></script>
</body>
</html>
```

##### 验证命令（必填）
```
验证命令：test -f /workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/index.html && echo "文件创建成功" || echo "文件创建失败"
预期输出：文件创建成功
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
rm /workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/index.html
```

##### 依赖关系
- 前置任务：task-008-2-2（创建webServer.ts）
- 后置任务：task-008-2-4（创建style.css）

---

#### 任务2-4：创建监控面板CSS样式
**任务ID**：task-008-2-4
**操作类型**：文件创建
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/style.css`
**预计执行时间**：约30秒

##### 任务背景
创建网页监控面板的CSS样式，提供现代化的深色主题界面。

##### 完整文件内容
```css
/* ControlX Server Monitor Styles */

:root {
    --bg-primary: #1a1a2e;
    --bg-secondary: #16213e;
    --bg-card: #0f3460;
    --text-primary: #eaeaea;
    --text-secondary: #a0a0a0;
    --accent: #e94560;
    --accent-light: #ff6b6b;
    --success: #4ade80;
    --warning: #fbbf24;
    --border: #2a2a4a;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

/* Header */
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
}

header h1 {
    font-size: 1.8rem;
    color: var(--accent);
}

.status-badge {
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
}

.status-badge.connected {
    background: rgba(74, 222, 128, 0.2);
    border-color: var(--success);
    color: var(--success);
}

.status-badge.disconnected {
    background: rgba(233, 69, 96, 0.2);
    border-color: var(--accent);
    color: var(--accent);
}

/* Cards */
.card {
    background: var(--bg-card);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    border: 1px solid var(--border);
}

.card h2 {
    font-size: 1.2rem;
    margin-bottom: 15px;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border);
    padding-bottom: 10px;
}

/* Info Grid */
.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.info-item .label {
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.info-item .value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--accent-light);
}

/* Input Grid */
.input-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.input-section h3 {
    font-size: 0.95rem;
    color: var(--text-secondary);
    margin-bottom: 10px;
}

/* Key Display */
.key-display {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 40px;
    padding: 10px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.key-display .key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    height: 32px;
    padding: 0 10px;
    background: var(--accent);
    color: white;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
}

.key-placeholder {
    color: var(--text-secondary);
    font-style: italic;
}

/* Mouse Info */
.mouse-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.mouse-coords {
    display: flex;
    gap: 20px;
    font-family: monospace;
    font-size: 1rem;
}

.mouse-buttons {
    display: flex;
    gap: 8px;
}

.mouse-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);
    border-radius: 50%;
    font-weight: 600;
    border: 2px solid var(--border);
    transition: all 0.1s ease;
}

.mouse-btn.active {
    background: var(--accent);
    border-color: var(--accent);
}

/* Joystick Display */
.joystick-display {
    display: flex;
    align-items: center;
    gap: 20px;
}

.joystick-visual {
    width: 80px;
    height: 80px;
    background: var(--bg-secondary);
    border-radius: 50%;
    position: relative;
    border: 2px solid var(--border);
}

.joystick-dot {
    width: 20px;
    height: 20px;
    background: var(--accent);
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    transition: all 0.05s ease;
}

.joystick-values {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-family: monospace;
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.stat-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--accent-light);
}

/* Footer */
footer {
    text-align: center;
    padding: 20px;
    color: var(--text-secondary);
    font-size: 0.85rem;
    border-top: 1px solid var(--border);
    margin-top: 20px;
}

/* Responsive */
@media (max-width: 768px) {
    .container {
        padding: 15px;
    }

    header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }

    header h1 {
        font-size: 1.5rem;
    }

    .input-grid {
        grid-template-columns: 1fr;
    }
}
```

##### 验证命令（必填）
```
验证命令：test -f /workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/style.css && echo "文件创建成功" || echo "文件创建失败"
预期输出：文件创建成功
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
rm /workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/style.css
```

##### 依赖关系
- 前置任务：task-008-2-3（创建index.html）
- 后置任务：task-008-2-5（创建app.js）

---

#### 任务2-5：创建监控面板JavaScript
**任务ID**：task-008-2-5
**操作类型**：文件创建
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/app.js`
**预计执行时间**：约30秒

##### 任务背景
创建网页监控面板的JavaScript代码，实现WebSocket连接和状态更新。

##### 完整文件内容
```javascript
/**
 * ControlX Server Monitor - Frontend JavaScript
 */

// WebSocket连接
let ws = null;
let reconnectTimer = null;
const RECONNECT_DELAY = 3000;

// DOM元素缓存
const elements = {
    connectionStatus: document.getElementById('connection-status'),
    uptime: document.getElementById('uptime'),
    memory: document.getElementById('memory'),
    cpu: document.getElementById('cpu'),
    connections: document.getElementById('connections'),
    keyboardKeys: document.getElementById('keyboard-keys'),
    gamepadButtons: document.getElementById('gamepad-buttons'),
    mouseX: document.getElementById('mouse-x'),
    mouseY: document.getElementById('mouse-y'),
    mouseLeft: document.getElementById('mouse-left'),
    mouseMiddle: document.getElementById('mouse-middle'),
    mouseRight: document.getElementById('mouse-right'),
    joystickDot: document.getElementById('joystick-dot'),
    joystickX: document.getElementById('joystick-x'),
    joystickY: document.getElementById('joystick-y'),
    eventsPerSec: document.getElementById('events-per-sec'),
    totalEvents: document.getElementById('total-events'),
    keyboardEvents: document.getElementById('keyboard-events'),
    gamepadEvents: document.getElementById('gamepad-events'),
};

/**
 * 格式化运行时间
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}

/**
 * 格式化内存使用
 */
function formatMemory(bytes) {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
}

/**
 * 更新连接状态显示
 */
function updateConnectionStatus(connected) {
    const badge = elements.connectionStatus;
    if (connected) {
        badge.textContent = 'Connected';
        badge.className = 'status-badge connected';
    } else {
        badge.textContent = 'Disconnected';
        badge.className = 'status-badge disconnected';
    }
}

/**
 * 更新服务器信息
 */
function updateServerInfo(data) {
    // 运行时间
    elements.uptime.textContent = formatUptime(data.uptime);

    // 内存
    const memPercent = ((data.memory.heapUsed / data.memory.heapTotal) * 100).toFixed(1);
    elements.memory.textContent = `${formatMemory(data.memory.heapUsed)} (${memPercent}%)`;

    // CPU
    elements.cpu.textContent = `${data.cpu.toFixed(1)}%`;

    // 连接数
    elements.connections.textContent = data.connections.active;
}

/**
 * 更新输入状态
 */
function updateInputState(input) {
    // 键盘
    const keyboardHtml = input.keyboard.length > 0
        ? input.keyboard.map(k => `<span class="key">${k}</span>`).join('')
        : '<span class="key-placeholder">No keys pressed</span>';
    elements.keyboardKeys.innerHTML = keyboardHtml;

    // 游戏手柄
    const gamepadHtml = input.gamepad.length > 0
        ? input.gamepad.map(b => `<span class="key">${b}</span>`).join('')
        : '<span class="key-placeholder">No buttons pressed</span>';
    elements.gamepadButtons.innerHTML = gamepadHtml;

    // 鼠标
    elements.mouseX.textContent = input.mouse.x;
    elements.mouseY.textContent = input.mouse.y;
    elements.mouseLeft.classList.toggle('active', input.mouse.left);
    elements.mouseMiddle.classList.toggle('active', input.mouse.middle);
    elements.mouseRight.classList.toggle('active', input.mouse.right);

    // 摇杆
    const jx = input.joystick.x;
    const jy = input.joystick.y;
    elements.joystickX.textContent = jx.toFixed(2);
    elements.joystickY.textContent = jy.toFixed(2);

    // 摇杆可视化位置（-1到1映射到-30到30像素）
    const dotX = jx * 30;
    const dotY = jy * 30;
    elements.joystickDot.style.transform = `translate(calc(-50% + ${dotX}px), calc(-50% + ${dotY}px))`;
}

/**
 * 更新统计信息
 */
function updateStats(stats) {
    elements.eventsPerSec.textContent = stats.eventsPerSecond.toFixed(1);
    elements.totalEvents.textContent = stats.totalEvents;
    elements.keyboardEvents.textContent = stats.keyboardEvents;
    elements.gamepadEvents.textContent = stats.gamepadEvents;
}

/**
 * 处理状态更新
 */
function handleStatusUpdate(data) {
    updateServerInfo(data);
    updateInputState(data.input);
    updateStats(data.stats);
}

/**
 * 连接WebSocket
 */
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    console.log('Connecting to WebSocket:', wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus(true);
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === 'status') {
                handleStatusUpdate(message.data);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus(false);
        ws = null;

        // 自动重连
        if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connectWebSocket();
            }, RECONNECT_DELAY);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

/**
 * 初始化
 */
function init() {
    console.log('ControlX Server Monitor initialized');
    connectWebSocket();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
```

##### 验证命令（必填）
```
验证命令：test -f /workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/app.js && echo "文件创建成功" || echo "文件创建失败"
预期输出：文件创建成功
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
rm /workspaces/AgentWorkspace/projects/ControlX/Server/src/web/static/app.js
```

##### 依赖关系
- 前置任务：task-008-2-4（创建style.css）
- 后置任务：task-008-3-1（修改app.ts集成web监控）

---

### 阶段3：集成和启动信息（2个任务）

#### 任务3-1：修改app.ts集成web监控服务器
**任务ID**：task-008-3-1
**操作类型**：文件编辑
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/app.ts`
**预计执行时间**：约30秒

##### 任务背景
在app.ts中导入并启动web监控服务器，替代原来的blessed终端UI。

##### 需要添加的代码

**在文件顶部添加导入**（约第8行后）：
```typescript
import { startWebMonitorServer, stopWebMonitorServer } from "./web/webServer";
```

**在启动WebSocket服务器后添加web监控启动**（约第50行后）：
```typescript
// 启动Web监控服务器
startWebMonitorServer(8081)
    .then(() => {
        console.log("Web monitor panel available at http://localhost:8081");
    })
    .catch((error) => {
        console.error("Failed to start web monitor server:", error);
    });
```

**在SIGINT处理中添加停止web监控**（在process.exit(0)前）：
```typescript
        stopWebMonitorServer();
```

##### 操作命令（必填）
```
操作：使用 Edit 工具（三次编辑）
文件路径：/workspaces/AgentWorkspace/projects/ControlX/Server/src/app.ts

第一次编辑（添加导入）：
搜索内容（old_str）：
import { startWsServer } from "./ws/server";
替换内容（new_str）：
import { startWsServer } from "./ws/server";
import { startWebMonitorServer, stopWebMonitorServer } from "./web/webServer";

第二次编辑（添加启动）：
搜索内容（old_str）：
// 启动WebSocket服务器
startWsServer();
替换内容（new_str）：
// 启动WebSocket服务器
startWsServer();

// 启动Web监控服务器
startWebMonitorServer(8081)
    .then(() => {
        console.log("Web monitor panel available at http://localhost:8081");
    })
    .catch((error) => {
        console.error("Failed to start web monitor server:", error);
    });

第三次编辑（添加停止）：
搜索内容（old_str）：
        applyScheduler.stop();
        heartbeatModule.stop();
        process.exit(0);
替换内容（new_str）：
        applyScheduler.stop();
        heartbeatModule.stop();
        stopWebMonitorServer();
        process.exit(0);
```

##### 验证命令（必填）
```
验证命令：grep -n "startWebMonitorServer\|stopWebMonitorServer" /workspaces/AgentWorkspace/projects/ControlX/Server/src/app.ts
预期输出：显示3行匹配（导入、启动、停止）
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
git checkout HEAD -- Server/src/app.ts
```

##### 依赖关系
- 前置任务：task-008-2-5（创建app.js）
- 后置任务：task-008-3-2（添加启动信息打印）

---

#### 任务3-2：添加启动信息打印
**任务ID**：task-008-3-2
**操作类型**：文件编辑
**目标文件**：`/workspaces/AgentWorkspace/projects/ControlX/Server/src/app.ts`
**预计执行时间**：约20秒

##### 任务背景
服务端启动后打印基础信息，包括版本、端口、功能状态等。

##### 需要添加的代码

**在启动日志部分添加详细信息打印**：
```typescript
// 打印启动信息
console.log("=".repeat(60));
console.log("  ControlX Server Started");
console.log("=".repeat(60));
console.log(`  Version: 1.0.0`);
console.log(`  Node.js: ${process.version}`);
console.log(`  Platform: ${process.platform} ${process.arch}`);
console.log(`  PID: ${process.pid}`);
console.log("-".repeat(60));
console.log("  Services:");
console.log("    - WebSocket Server: Running");
console.log("    - Web Monitor: http://localhost:8081");
console.log("    - Health Check: http://localhost:8080/health");
console.log("-".repeat(60));
console.log("  Press Ctrl+C to stop the server");
console.log("=".repeat(60));
```

##### 操作命令（必填）
```
操作：使用 Edit 工具
文件路径：/workspaces/AgentWorkspace/projects/ControlX/Server/src/app.ts

搜索内容（old_str）：
// 启动日志
if (dryRunMode) {
    console.log("🏃 ControlX Server started in DRY RUN MODE");
    console.log("📋 Dry run features:");
    console.log("   • All inputs logged for verification");
    console.log("   • No actual system events generated");
    console.log("   • Full state tracking and statistics");
    console.log("   • Safe for debugging and testing");
} else if (isTestMode) {
    console.log("🎮 ControlX Server started in TEST MODE");
    console.log("📋 Test mode features:");
    console.log("   • No actual keyboard/mouse events generated");
    console.log("   • All inputs logged for verification");
    console.log("   • Safe for automated testing");
} else {
    console.log("🎮 ControlX Server started successfully");
}

替换内容（new_str）：
// 打印启动信息
console.log("=".repeat(60));
console.log("  ControlX Server Started");
console.log("=".repeat(60));
console.log(`  Version: 1.0.0`);
console.log(`  Node.js: ${process.version}`);
console.log(`  Platform: ${process.platform} ${process.arch}`);
console.log(`  PID: ${process.pid}`);
console.log("-".repeat(60));
if (dryRunMode) {
    console.log("  Mode: DRY RUN (no actual input events)");
} else if (isTestMode) {
    console.log("  Mode: TEST (no actual input events)");
} else {
    console.log("  Mode: PRODUCTION");
}
console.log("-".repeat(60));
console.log("  Services:");
console.log("    - WebSocket Server: Running");
console.log("    - Web Monitor: http://localhost:8081");
console.log("    - Health Check: http://localhost:8080/health");
console.log("-".repeat(60));
console.log("  Press Ctrl+C to stop the server");
console.log("=".repeat(60));
```

##### 验证命令（必填）
```
验证命令：grep -n "ControlX Server Started" /workspaces/AgentWorkspace/projects/ControlX/Server/src/app.ts
预期输出：显示1行匹配
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
git checkout HEAD -- Server/src/app.ts
```

##### 依赖关系
- 前置任务：task-008-3-1（集成web监控）
- 后置任务：task-008-4-1（安装依赖并构建）

---

### 阶段4：验证和清理（2个任务）

#### 任务4-1：安装依赖并构建
**任务ID**：task-008-4-1
**操作类型**：命令执行
**目标**：安装依赖并构建项目
**预计执行时间**：约120秒

##### 任务背景
移除blessed依赖后需要重新安装依赖并构建项目，确保没有编译错误。

##### 操作命令（必填）
```
操作：使用 RunShellCommand 工具
命令：cd /workspaces/AgentWorkspace/projects/ControlX/Server && rm -rf node_modules package-lock.json && npm install && npm run build
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

##### 验证命令（必填）
```
验证命令：test -d /workspaces/AgentWorkspace/projects/ControlX/Server/dist && echo "构建成功" || echo "构建失败"
预期输出：构建成功
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
cd /workspaces/AgentWorkspace/projects/ControlX/Server && git checkout HEAD -- package.json package-lock.json && npm install
```

##### 依赖关系
- 前置任务：task-008-3-2（添加启动信息）
- 后置任务：task-008-4-2（验证服务器启动）

---

#### 任务4-2：验证服务器启动
**任务ID**：task-008-4-2
**操作类型**：命令执行
**目标**：验证服务器能正常启动
**预计执行时间**：约30秒

##### 任务背景
验证修改后的服务器能正常启动，web监控面板可访问。

##### 操作命令（必填）
```
操作：使用 RunShellCommand 工具
命令：cd /workspaces/AgentWorkspace/projects/ControlX/Server && timeout 10 node dist/app.js 2>&1 || true
工作目录：/workspaces/AgentWorkspace/projects/ControlX
```

##### 验证命令（必填）
```
验证命令：curl -s http://localhost:8081/ 2>/dev/null | head -5 || echo "服务器未运行或端口不可访问"
预期输出：显示HTML内容（包含ControlX Server Monitor）
```

##### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
检查编译错误，修复后重新构建
```

##### 依赖关系
- 前置任务：task-008-4-1（安装依赖并构建）
- 后置任务：无

---

## 验收标准

### 功能验收
- [ ] blessed终端UI已完全移除
- [ ] package.json中无blessed依赖
- [ ] web监控面板可访问（http://localhost:8081）
- [ ] 监控面板显示服务器状态
- [ ] 监控面板显示输入状态（键盘、游戏手柄、鼠标、摇杆）
- [ ] 服务端启动时打印基础信息
- [ ] 日志正常输出到控制台

### 技术验收
- [ ] TypeScript编译无错误
- [ ] 无运行时错误
- [ ] WebSocket连接正常
- [ ] HTTP服务器正常响应

### 文件验收
- [ ] terminalViewer.ts已删除
- [ ] web/目录已创建
- [ ] 静态文件已创建（index.html, style.css, app.js）
- [ ] app.ts已更新

## 风险评估

### 高风险
1. **编译错误**：移除blessed后可能有其他文件依赖
   - 缓解措施：全局搜索blessed引用，确保全部移除

### 中风险
1. **WebSocket端口冲突**：8081端口可能被占用
   - 缓解措施：添加端口检测和自动切换逻辑

2. **静态文件路径问题**：构建后路径可能不正确
   - 缓解措施：使用__dirname确保路径正确

### 低风险
1. **样式兼容性**：CSS可能在某些浏览器显示异常
   - 缓解措施：使用标准CSS属性，添加浏览器前缀

## 执行记录
| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-03-17 | 创建任务 | 用户请求删除blessed终端UI，转为网页监控面板 |

## 相关资源
- 项目路径：/workspaces/AgentWorkspace/projects/ControlX
- Server路径：/workspaces/AgentWorkspace/projects/ControlX/Server
- blessed文档：https://github.com/chjj/blessed