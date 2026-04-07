// Terminal status panel module
// Implement dynamic terminal monitoring using ANSI escape sequence

/**
 * Terminal status panel class
 */
export class Terminal monitor {
    private state: any;
    private fps: number;
    private intervalId: NodeJS.Timeout | null = null;
    private startTime: number;
    private frameCount: number;
    private lastRenderTime: number;
    private clientConnected: boolean;
    private panelLines: string[]; // Current panel line content
    private panelHeight: number; // Panel height (number of lines)

    /**
     * Constructor
     * @param state State object to monitor
     * @param fps Render frequency, default 20 FPS (optimized, reduce flicker)
     */
    constructor(state: any, fps: number = 20) {
        this.state = state;
        this.fps = fps;
        this.startTime = Date.now();
        this.frameCount = 0;
        this.lastRenderTime = 0;
        this.clientConnected = false;
        this.panelLines = []; // Initialize panel line content
        this.panelHeight = 12; // Fixed panel height
    }

    /**
     * Start monitoring
     */
    start(): void {
        // Hide cursor
        process.stdout.write('\x1b[?25l');

        // Set render interval
        this.intervalId = setInterval(() => {
            this.render();
        }, 1000 / this.fps);

        // Set process exit cleanup
        process.on('exit', () => {
            this.stop();
        });

        // Set Ctrl+C exit cleanup
        process.on('SIGINT', () => {
            this.stop();
            process.exit(0);
        });

        console.log('Terminal monitor started with', this.fps, 'FPS');
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        // Clear render interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // Show cursor
        process.stdout.write('\x1b[?25h');

        // Clear panel content
        this.clearPanel();

        // Generate new prompt input line at bottom of panel
        process.stdout.write('\n');

        console.log('Terminal monitor stopped');
    }

    /**
     * Set client connection status
     * @param connected Connection status
     */
    setClientConnected(connected: boolean): void {
        this.clientConnected = connected;
    }

    /**
     * Render status panel
     */
    private render(): void {
        const currentTime = Date.now();
        this.frameCount++;

        // Calculate FPS
        let displayFps = this.fps;
        if (currentTime - this.startTime >= 1000) {
            displayFps = Math.round((this.frameCount * 1000) / (currentTime - this.startTime));
            this.frameCount = 0;
            this.startTime = currentTime;
        }

        // Calculate render time
        const renderTime = currentTime - this.lastRenderTime;
        this.lastRenderTime = currentTime;

        // Generate all lines to display
        const lines: string[] = [];
        
        // Add header
        lines.push('┌─────────────────────────────────────────────────┐');
        lines.push('│ ControlX Server Input Monitor           │');
        lines.push('├─────────────────────────────────────────────────┤');
        lines.push(`│ Client:   ${this.clientConnected ? 'connected' : 'disconnected'}                        │`);
        lines.push(`│ FPS:      ${displayFps.toString().padEnd(2)} (${renderTime}ms)                               │`);
        lines.push('└─────────────────────────────────────────────────┘');
        
        // Extract status information
        const { keyboard, gamepad, mouse, joystick } = this.state;

        // Format status information
        const keyboardKeys = Array.from(keyboard || []).join(' ');
        const gamepadButtons = Array.from(gamepad || []).join(' ');
        const mouseInfo = `x=${mouse.x.toString().padStart(4)} y=${mouse.y.toString().padStart(4)} left=${mouse.left} right=${mouse.right}`;
        const joystickInfo = `x=${joystick.x.toFixed(2).padStart(5)} y=${joystick.y.toFixed(2).padStart(5)} deadzone=${joystick.deadzone}`;

        // Add input status
        lines.push('┌─────────────────────────────────────────────────┐');
        lines.push(`│ Keyboard: ${keyboardKeys.padEnd(43)} │`);
        lines.push(`│ Gamepad:  ${gamepadButtons.padEnd(43)} │`);
        lines.push(`│ Mouse:    ${mouseInfo.padEnd(36)} │`);
        lines.push(`│ Joystick: ${joystickInfo.padEnd(36)} │`);
        lines.push('└─────────────────────────────────────────────────┘');

        // Update only when panel content changes
        if (!this.areLinesEqual(lines, this.panelLines)) {
            this.updatePanel(lines);
            this.panelLines = lines;
        }
    }

    /**
     * Check if two line arrays are equal
     * @param lines1 First line array
     * @param lines2 Second line array
     * @returns Whether相Wait
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
     * Update panel content
     * @param lines New panel line content
     */
    private updatePanel(lines: string[]): void {
        // Save current cursor position
        process.stdout.write('\x1b[s');
        
        // Move to terminal bottom
        process.stdout.write('\x1b[9999;1H');
        
        // Move up enough lines to make space for panel
        process.stdout.write(`\x1b[${this.panelHeight}A`);
        
        // Write panel content
        for (let i = 0; i < this.panelHeight; i++) {
            // Clear current line
            process.stdout.write('\x1b[2K');
            // Write line content
            if (i < lines.length) {
                process.stdout.write(lines[i]);
            }
            // Move to next line
            process.stdout.write('\n');
        }
        
        // Restore cursor position
        process.stdout.write('\x1b[u');
    }

    /**
     * Clear panel content
     */
    private clearPanel(): void {
        // Save current cursor position
        process.stdout.write('\x1b[s');
        
        // Move to terminal bottom
        process.stdout.write('\x1b[9999;1H');
        
        // Move up enough lines to cover panel area
        process.stdout.write(`\x1b[${this.panelHeight}A`);
        
        // Clear panel content
        for (let i = 0; i < this.panelHeight; i++) {
            // Clear current line
            process.stdout.write('\x1b[2K');
            // Move to next line
            process.stdout.write('\n');
        }
        
        // Restore cursor position
        process.stdout.write('\x1b[u');
    }
}
