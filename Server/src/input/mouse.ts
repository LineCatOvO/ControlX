import { InputExecutor } from './interfaces';
import { InputState, InputDelta, InputEvent } from '../types/ws';
import { mouse, Button, Point } from '@nut-tree-fork/nut-js';

// LogConfig
const LOG_CONFIG = {
    enabled: true,           // WhetherEnableLog
    verbose: false,          // WhetherEnableDetailLog
    statsInterval: 100,      // 每多少次OperationOutput一次statistics
};

// MouseOperationstatistics
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
 * UpdateMousestatistics
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

    // 定期Outputstatistics
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
 * GetMousestatisticsInfo
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
 * 负责willMouseInputStateConvertFor系统MouseEvent
 * use @nut-tree/nut-js Implementation跨平台Mouse控制
 */
export class MouseExecutor implements InputExecutor {
    // recordCurrentMouseState
    private currentMouseState = {
        x: 0,
        y: 0,
        left: false,
        right: false,
        middle: false
    };

    // 屏幕尺寸（Used forCoordinateConvert）
    private screenWidth: number = 1920;
    private screenHeight: number = 1080;

    /**
     * ApplyCompleteInputState
     * @param state InputState
     */
    async applyState(state: InputState): Promise<void> {
        // 只在State发生变ize时ExecuteOperation
        if (this.hasMouseStateChanged(state.mouse)) {
            try {
                // moveMousePosition
                if (state.mouse.x !== this.currentMouseState.x ||
                    state.mouse.y !== this.currentMouseState.y) {
                    await this.moveMouse(state.mouse.x, state.mouse.y);
                }

                // HandleMouseButtonState变ize
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
                // HandleMousePosition变ize（use绝对Coordinate）
                if (delta.mouse.x !== undefined || delta.mouse.y !== undefined) {
                    const newX = delta.mouse.x !== undefined ? delta.mouse.x : this.currentMouseState.x;
                    const newY = delta.mouse.y !== undefined ? delta.mouse.y : this.currentMouseState.y;
                    await this.moveMouse(newX, newY);
                    this.currentMouseState.x = newX;
                    this.currentMouseState.y = newY;
                }

                // HandleButtonState变ize（直接use left、right、middle）
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
            // Note：InputEvent Type定义In没有 'mouse_scroll' Type
            // IfRequire滚动Function，Require先Update ws.ts InOf InputEvent Type定义

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
            // releaseAllMouseButton
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
     * moveMouse到指定Position
     * @param x X Coordinate（相对Coordinate，0-1 Range）
     * @param y Y Coordinate（相对Coordinate，0-1 Range）
     */
    private async moveMouse(x: number, y: number): Promise<void> {
        try {
            // will相对CoordinateConvertFor屏幕Coordinate
            // 假设InputCoordinate是 0-1 Of相对Value，ConvertFor实际屏幕Coordinate
            const screenX = Math.floor(x * this.screenWidth);
            const screenY = Math.floor(y * this.screenHeight);

            // ensureCoordinate在屏幕RangeInside
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
     * HandleMouseButtonState变ize
     * @param newState newOfMouseState
     */
    private async handleMouseButtonChanges(newState: any): Promise<void> {
        // Left键State变ize
        if (newState.left !== this.currentMouseState.left) {
            if (newState.left) {
                await mouse.pressButton(Button.LEFT);
                updateStats('click', 1);
            } else {
                await mouse.releaseButton(Button.LEFT);
                updateStats('release', 1);
            }
        }

        // Right键State变ize
        if (newState.right !== this.currentMouseState.right) {
            if (newState.right) {
                await mouse.pressButton(Button.RIGHT);
                updateStats('click', 1);
            } else {
                await mouse.releaseButton(Button.RIGHT);
                updateStats('release', 1);
            }
        }

        // In键State变ize
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
     * @param direction 滚动方向（'up' or 'down'）
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
     * MapButtonName到 nut.js Button Type
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
     * CheckMouseStateWhether发生变ize
     * @param newState newOfMouseState
     * @returns Whether发生变ize
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
     * @param newState newOfMouseState
     */
    private updateCurrentMouseState(newState: any): void {
        this.currentMouseState.x = newState.x;
        this.currentMouseState.y = newState.y;
        this.currentMouseState.left = newState.left;
        this.currentMouseState.right = newState.right;
        this.currentMouseState.middle = newState.middle;
    }
}