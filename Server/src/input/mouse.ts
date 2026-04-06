import { InputExecutor } from './interfaces';
import { InputState, InputDelta, InputEvent } from '../types/ws';
import { mouse, Button, Point } from '@nut-tree-fork/nut-js';

// LogConfig
const LOG_CONFIG = {
    enabled: true,           // 是否EnableLog
    verbose: false,          // 是否EnableDetailLog
    statsInterval: 100,      // 每多少次OperationOutput一次统计
};

// MouseOperation统计
const mouseStats = {
    totalUpdates: 0,
    totalMoves: 0,
    totalClicks: 0,
    totalScrolls: 0,
    totalReleases: 0,
    resetCount: 0,
    errorCount: 0,
    lastUpdateTs: 0,
};

/**
 * UpdateMouse统计
 */
function updateStats(type: 'move' | 'click' | 'scroll' | 'release' | 'reset' | 'error', count: number = 1) {
    mouseStats.totalUpdates++;
    mouseStats.lastUpdateTs = Date.now();

    if (type === 'move') {
        mouseStats.totalMoves += count;
    } else if (type === 'click') {
        mouseStats.totalClicks += count;
    } else if (type === 'scroll') {
        mouseStats.totalScrolls += count;
    } else if (type === 'release') {
        mouseStats.totalReleases += count;
    } else if (type === 'reset') {
        mouseStats.resetCount++;
    } else if (type === 'error') {
        mouseStats.errorCount++;
    }

    // 定期Output统计
    if (mouseStats.totalUpdates % LOG_CONFIG.statsInterval === 0) {
        console.log('🖱️ Mouse Stats:', {
            totalUpdates: mouseStats.totalUpdates,
            moves: mouseStats.totalMoves,
            clicks: mouseStats.totalClicks,
            scrolls: mouseStats.totalScrolls,
            releases: mouseStats.totalReleases,
            resets: mouseStats.resetCount,
            errors: mouseStats.errorCount,
        });
    }
}

/**
 * GetMouse统计Info
 */
export function getMouseStats() {
    return { ...mouseStats };
}

/**
 * SetLogConfig
 * @param config LogConfig
 */
export function setMouseLogConfig(config: Partial<typeof LOG_CONFIG>) {
    Object.assign(LOG_CONFIG, config);
    console.log('🖱️ Mouse log config updated:', LOG_CONFIG);
}

/**
 * MouseInputExecutor
 * 负责将MouseInputState转换For系统MouseEvent
 * 使用 @nut-tree/nut-js Implementation跨平台Mouse控制
 */
export class MouseExecutor implements InputExecutor {
    // 记录CurrentMouseState
    private currentMouseState = {
        x: 0,
        y: 0,
        left: false,
        right: false,
        middle: false
    };

    // 屏幕尺寸（用于坐标转换）
    private screenWidth: number = 1920;
    private screenHeight: number = 1080;

    /**
     * ApplyCompleteInputState
     * @param state InputState
     */
    async applyState(state: InputState): Promise<void> {
        // 只在State发生变化时ExecuteOperation
        if (this.hasMouseStateChanged(state.mouse)) {
            try {
                // 移动Mouse位置
                if (state.mouse.x !== this.currentMouseState.x ||
                    state.mouse.y !== this.currentMouseState.y) {
                    await this.moveMouse(state.mouse.x, state.mouse.y);
                }

                // 处理MouseButtonState变化
                await this.handleMouseButtonChanges(state.mouse);

                // UpdateCurrentState
                this.updateCurrentMouseState(state.mouse);

                if (LOG_CONFIG.verbose) {
                    console.log('🖱️ MouseEvent: State applied', {
                        x: state.mouse.x,
                        y: state.mouse.y,
                        buttons: {
                            left: state.mouse.left,
                            right: state.mouse.right,
                            middle: state.mouse.middle
                        }
                    });
                }
            } catch (error) {
                console.error('❌ MouseExecutor: Error applying state:', error);
                updateStats('error', 1);
            }
        }
    }

    /**
     * ApplyInput增量
     * @param delta Input增量
     */
    async applyDelta(delta: InputDelta): Promise<void> {
        if (delta.mouse) {
            try {
                // 处理Mouse位置变化（使用绝对坐标）
                if (delta.mouse.x !== undefined || delta.mouse.y !== undefined) {
                    const newX = delta.mouse.x !== undefined ? delta.mouse.x : this.currentMouseState.x;
                    const newY = delta.mouse.y !== undefined ? delta.mouse.y : this.currentMouseState.y;
                    await this.moveMouse(newX, newY);
                    this.currentMouseState.x = newX;
                    this.currentMouseState.y = newY;
                }

                // 处理ButtonState变化（直接使用 left、right、middle）
                const buttonState = {
                    left: delta.mouse.left !== undefined ? delta.mouse.left : this.currentMouseState.left,
                    right: delta.mouse.right !== undefined ? delta.mouse.right : this.currentMouseState.right,
                    middle: delta.mouse.middle !== undefined ? delta.mouse.middle : this.currentMouseState.middle
                };
                await this.handleMouseButtonChanges(buttonState);

                // UpdateButtonState
                if (delta.mouse.left !== undefined) this.currentMouseState.left = delta.mouse.left;
                if (delta.mouse.right !== undefined) this.currentMouseState.right = delta.mouse.right;
                if (delta.mouse.middle !== undefined) this.currentMouseState.middle = delta.mouse.middle;

                console.log('🖱️ MouseEvent: Delta applied', delta.mouse);
            } catch (error) {
                console.error('❌ MouseExecutor: Error applying delta:', error);
                updateStats('error', 1);
            }
        }
    }

    /**
     * ApplyInputEvent
     * @param event InputEvent
     */
    async applyEvent(event: InputEvent): Promise<void> {
        try {
            if (event.type === 'mouse_move') {
                await this.moveMouse(event.data.x, event.data.y);
            } else if (event.type === 'mouse_click') {
                const button = this.mapButtonName(event.data.button || 'left');
                await mouse.click(button);
                updateStats('click', 1);
            }
            // 注意：InputEvent Type定义In没有 'mouse_scroll' Type
            // 如果需要滚动Function，需要先Update ws.ts InOf InputEvent Type定义

            console.log('🖱️ MouseEvent: Event applied', event.type, event.data);
        } catch (error) {
            console.error('❌ MouseExecutor: Error applying event:', error);
            updateStats('error', 1);
        }
    }

    /**
     * ResetInputState
     */
    async reset(): Promise<void> {
        try {
            // 释放AllMouseButton
            if (this.currentMouseState.left) {
                await mouse.releaseButton(Button.LEFT);
                updateStats('release', 1);
            }
            if (this.currentMouseState.right) {
                await mouse.releaseButton(Button.RIGHT);
                updateStats('release', 1);
            }
            if (this.currentMouseState.middle) {
                await mouse.releaseButton(Button.MIDDLE);
                updateStats('release', 1);
            }

            // ResetState
            this.currentMouseState = {
                x: 0,
                y: 0,
                left: false,
                right: false,
                middle: false
            };

            updateStats('reset', 1);
            console.log('✅ MouseEvent: Reset complete');
        } catch (error) {
            console.error('❌ MouseExecutor: Error resetting:', error);
            updateStats('error', 1);
        }
    }

    /**
     * 移动Mouse到指定位置
     * @param x X 坐标（相对坐标，0-1 Range）
     * @param y Y 坐标（相对坐标，0-1 Range）
     */
    private async moveMouse(x: number, y: number): Promise<void> {
        try {
            // 将相对坐标转换For屏幕坐标
            // 假设Input坐标是 0-1 Of相对Value，转换For实际屏幕坐标
            const screenX = Math.floor(x * this.screenWidth);
            const screenY = Math.floor(y * this.screenHeight);

            // 确保坐标在屏幕RangeInside
            const clampedX = Math.max(0, Math.min(screenX, this.screenWidth - 1));
            const clampedY = Math.max(0, Math.min(screenY, this.screenHeight - 1));

            await mouse.setPosition(new Point(clampedX, clampedY));
            updateStats('move', 1);

            if (LOG_CONFIG.verbose) {
                console.log(`🖱️ MouseEvent: Moved to (${clampedX}, ${clampedY})`);
            }
        } catch (error) {
            console.error('❌ MouseExecutor: Error moving mouse:', error);
            updateStats('error', 1);
        }
    }

    /**
     * 处理MouseButtonState变化
     * @param newState 新OfMouseState
     */
    private async handleMouseButtonChanges(newState: any): Promise<void> {
        // Left键State变化
        if (newState.left !== this.currentMouseState.left) {
            if (newState.left) {
                await mouse.pressButton(Button.LEFT);
                updateStats('click', 1);
            } else {
                await mouse.releaseButton(Button.LEFT);
                updateStats('release', 1);
            }
        }

        // Right键State变化
        if (newState.right !== this.currentMouseState.right) {
            if (newState.right) {
                await mouse.pressButton(Button.RIGHT);
                updateStats('click', 1);
            } else {
                await mouse.releaseButton(Button.RIGHT);
                updateStats('release', 1);
            }
        }

        // In键State变化
        if (newState.middle !== this.currentMouseState.middle) {
            if (newState.middle) {
                await mouse.pressButton(Button.MIDDLE);
                updateStats('click', 1);
            } else {
                await mouse.releaseButton(Button.MIDDLE);
                updateStats('release', 1);
            }
        }
    }

    /**
     * 滚动Mouse
     * @param amount 滚动量
     * @param direction 滚动方向（'up' 或 'down'）
     */
    private async scrollMouse(amount: number, direction: string): Promise<void> {
        try {
            const scrollAmount = direction === 'up' ? -amount : amount;
            await mouse.scrollDown(scrollAmount);
            updateStats('scroll', 1);

            if (LOG_CONFIG.verbose) {
                console.log(`🖱️ MouseEvent: Scrolled ${direction} by ${amount}`);
            }
        } catch (error) {
            console.error('❌ MouseExecutor: Error scrolling mouse:', error);
            updateStats('error', 1);
        }
    }

    /**
     * 映射ButtonName到 nut.js Button Type
     * @param buttonName ButtonName（'left', 'right', 'middle'）
     * @returns Button Type
     */
    private mapButtonName(buttonName: string): Button {
        switch (buttonName.toLowerCase()) {
            case 'left':
                return Button.LEFT;
            case 'right':
                return Button.RIGHT;
            case 'middle':
                return Button.MIDDLE;
            default:
                return Button.LEFT;
        }
    }

    /**
     * 检查MouseState是否发生变化
     * @param newState 新OfMouseState
     * @returns 是否发生变化
     */
    private hasMouseStateChanged(newState: any): boolean {
        return this.currentMouseState.x !== newState.x ||
               this.currentMouseState.y !== newState.y ||
               this.currentMouseState.left !== newState.left ||
               this.currentMouseState.right !== newState.right ||
               this.currentMouseState.middle !== newState.middle;
    }

    /**
     * UpdateCurrentMouseState
     * @param newState 新OfMouseState
     */
    private updateCurrentMouseState(newState: any): void {
        this.currentMouseState.x = newState.x;
        this.currentMouseState.y = newState.y;
        this.currentMouseState.left = newState.left;
        this.currentMouseState.right = newState.right;
        this.currentMouseState.middle = newState.middle;
    }
}