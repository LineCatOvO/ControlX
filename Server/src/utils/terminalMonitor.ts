// 终端状态面板模块
// 使用ANSI转义序列实现动态终端监控

/**
 * 终端状态面板类
 */
export class TerminalMonitor {
    private state: any;
    private fps: number;
    private intervalId: NodeJS.Timeout | null = null;
    private startTime: number;
    private frameCount: number;
    private lastRenderTime: number;
    private clientConnected: boolean;
    private panelLines: string[]; // 当前面板行内容
    private panelHeight: number; // 面板高度（行数）

    /**
     * 构造函数
     * @param state 要监控的状态对象
     * @param fps 渲染频率，默认为20 FPS（优化后，减少闪烁）
     */
    constructor(state: any, fps: number = 20) {
        this.state = state;
        this.fps = fps;
        this.startTime = Date.now();
        this.frameCount = 0;
        this.lastRenderTime = 0;
        this.clientConnected = false;
        this.panelLines = []; // 初始化面板行内容
        this.panelHeight = 12; // 固定面板高度
    }

    /**
     * 开始监控
     */
    start(): void {
        // 隐藏光标
        process.stdout.write('\x1b[?25l');

        // 设置渲染间隔
        this.intervalId = setInterval(() => {
            this.render();
        }, 1000 / this.fps);

        // 设置进程退出清理
        process.on('exit', () => {
            this.stop();
        });

        // 设置Ctrl+C退出清理
        process.on('SIGINT', () => {
            this.stop();
            process.exit(0);
        });

        console.log('Terminal monitor started with', this.fps, 'FPS');
    }

    /**
     * 停止监控
     */
    stop(): void {
        // 清除渲染间隔
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // 显示光标
        process.stdout.write('\x1b[?25h');

        // 清空面板内容
        this.clearPanel();

        // 在面板底部生成新的prompt输入行
        process.stdout.write('\n');

        console.log('Terminal monitor stopped');
    }

    /**
     * 设置客户端连接状态
     * @param connected 连接状态
     */
    setClientConnected(connected: boolean): void {
        this.clientConnected = connected;
    }

    /**
     * 渲染状态面板
     */
    private render(): void {
        const currentTime = Date.now();
        this.frameCount++;

        // 计算FPS
        let displayFps = this.fps;
        if (currentTime - this.startTime >= 1000) {
            displayFps = Math.round((this.frameCount * 1000) / (currentTime - this.startTime));
            this.frameCount = 0;
            this.startTime = currentTime;
        }

        // 计算渲染耗时
        const renderTime = currentTime - this.lastRenderTime;
        this.lastRenderTime = currentTime;

        // 生成所有要显示的行
        const lines: string[] = [];
        
        // 添加头部
        lines.push('┌─────────────────────────────────────────────────┐');
        lines.push('│ WMMT Controller Server Input Monitor           │');
        lines.push('├─────────────────────────────────────────────────┤');
        lines.push(`│ Client:   ${this.clientConnected ? 'connected' : 'disconnected'}                        │`);
        lines.push(`│ FPS:      ${displayFps.toString().padEnd(2)} (${renderTime}ms)                               │`);
        lines.push('└─────────────────────────────────────────────────┘');
        
        // 提取状态信息
        const { keyboard, gamepad, mouse, joystick } = this.state;

        // 格式化状态信息
        const keyboardKeys = Array.from(keyboard || []).join(' ');
        const gamepadButtons = Array.from(gamepad || []).join(' ');
        const mouseInfo = `x=${mouse.x.toString().padStart(4)} y=${mouse.y.toString().padStart(4)} left=${mouse.left} right=${mouse.right}`;
        const joystickInfo = `x=${joystick.x.toFixed(2).padStart(5)} y=${joystick.y.toFixed(2).padStart(5)} deadzone=${joystick.deadzone}`;

        // 添加输入状态
        lines.push('┌─────────────────────────────────────────────────┐');
        lines.push(`│ Keyboard: ${keyboardKeys.padEnd(43)} │`);
        lines.push(`│ Gamepad:  ${gamepadButtons.padEnd(43)} │`);
        lines.push(`│ Mouse:    ${mouseInfo.padEnd(36)} │`);
        lines.push(`│ Joystick: ${joystickInfo.padEnd(36)} │`);
        lines.push('└─────────────────────────────────────────────────┘');

        // 只在面板内容变化时更新
        if (!this.areLinesEqual(lines, this.panelLines)) {
            this.updatePanel(lines);
            this.panelLines = lines;
        }
    }

    /**
     * 检查两行数组是否相等
     * @param lines1 第一行数组
     * @param lines2 第二行数组
     * @returns 是否相等
     */
    private areLinesEqual(lines1: string[], lines2: string[]): boolean {
        if (lines1.length !== lines2.length) {
            return false;
        }
        for (let i = 0; i < lines1.length; i++) {
            if (lines1[i] !== lines2[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * 更新面板内容
     * @param lines 新的面板行内容
     */
    private updatePanel(lines: string[]): void {
        // 保存当前光标位置
        process.stdout.write('\x1b[s');
        
        // 移动到终端底部
        process.stdout.write('\x1b[9999;1H');
        
        // 向上移动足够的行数，为面板腾出空间
        process.stdout.write(`\x1b[${this.panelHeight}A`);
        
        // 写入面板内容
        for (let i = 0; i < this.panelHeight; i++) {
            // 清除当前行
            process.stdout.write('\x1b[2K');
            // 写入行内容
            if (i < lines.length) {
                process.stdout.write(lines[i]);
            }
            // 移动到下一行
            process.stdout.write('\n');
        }
        
        // 恢复光标位置
        process.stdout.write('\x1b[u');
    }

    /**
     * 清空面板内容
     */
    private clearPanel(): void {
        // 保存当前光标位置
        process.stdout.write('\x1b[s');
        
        // 移动到终端底部
        process.stdout.write('\x1b[9999;1H');
        
        // 向上移动足够的行数，覆盖面板区域
        process.stdout.write(`\x1b[${this.panelHeight}A`);
        
        // 清空面板内容
        for (let i = 0; i < this.panelHeight; i++) {
            // 清除当前行
            process.stdout.write('\x1b[2K');
            // 移动到下一行
            process.stdout.write('\n');
        }
        
        // 恢复光标位置
        process.stdout.write('\x1b[u');
    }
}
