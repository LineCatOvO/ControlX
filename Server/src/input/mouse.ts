import { InputExecutor } from './interfaces';
import { InputState, InputDelta, InputEvent } from '../types/ws';
import { mouse, Button, Point } from '@nut-tree-fork/nut-js';

// 日志配置
const LOG_CONFIG = {
    enabled: true,           // 是否启用日志
    verbose: false,          // 是否启用详细日志
    statsInterval: 100,      // 每多少次操作输出一次统计
};

// 鼠标操作统计
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
 * 更新鼠标统计
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

    // 定期输出统计
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
 * 获取鼠标统计信息
 */
export function getMouseStats() {
    return { ...mouseStats };
}

/**
 * 设置日志配置
 * @param config 日志配置
 */
export function setMouseLogConfig(config: Partial<typeof LOG_CONFIG>) {
    Object.assign(LOG_CONFIG, config);
    console.log('🖱️ Mouse log config updated:', LOG_CONFIG);
}

/**
 * 鼠标输入执行器
 * 负责将鼠标输入状态转换为系统鼠标事件
 * 使用 @nut-tree/nut-js 实现跨平台鼠标控制
 */
export class MouseExecutor implements InputExecutor {
    // 记录当前鼠标状态
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
     * 应用完整输入状态
     * @param state 输入状态
     */
    async applyState(state: InputState): Promise<void> {
        // 只在状态发生变化时执行操作
        if (this.hasMouseStateChanged(state.mouse)) {
            try {
                // 移动鼠标位置
                if (state.mouse.x !== this.currentMouseState.x ||
                    state.mouse.y !== this.currentMouseState.y) {
                    await this.moveMouse(state.mouse.x, state.mouse.y);
                }

                // 处理鼠标按钮状态变化
                await this.handleMouseButtonChanges(state.mouse);

                // 更新当前状态
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
     * 应用输入增量
     * @param delta 输入增量
     */
    async applyDelta(delta: InputDelta): Promise<void> {
        if (delta.mouse) {
            try {
                // 处理鼠标位置变化（使用绝对坐标）
                if (delta.mouse.x !== undefined || delta.mouse.y !== undefined) {
                    const newX = delta.mouse.x !== undefined ? delta.mouse.x : this.currentMouseState.x;
                    const newY = delta.mouse.y !== undefined ? delta.mouse.y : this.currentMouseState.y;
                    await this.moveMouse(newX, newY);
                    this.currentMouseState.x = newX;
                    this.currentMouseState.y = newY;
                }

                // 处理按钮状态变化（直接使用 left、right、middle）
                const buttonState = {
                    left: delta.mouse.left !== undefined ? delta.mouse.left : this.currentMouseState.left,
                    right: delta.mouse.right !== undefined ? delta.mouse.right : this.currentMouseState.right,
                    middle: delta.mouse.middle !== undefined ? delta.mouse.middle : this.currentMouseState.middle
                };
                await this.handleMouseButtonChanges(buttonState);

                // 更新按钮状态
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
     * 应用输入事件
     * @param event 输入事件
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
            // 注意：InputEvent 类型定义中没有 'mouse_scroll' 类型
            // 如果需要滚动功能，需要先更新 ws.ts 中的 InputEvent 类型定义

            console.log('🖱️ MouseEvent: Event applied', event.type, event.data);
        } catch (error) {
            console.error('❌ MouseExecutor: Error applying event:', error);
            updateStats('error', 1);
        }
    }

    /**
     * 重置输入状态
     */
    async reset(): Promise<void> {
        try {
            // 释放所有鼠标按钮
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

            // 重置状态
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
     * 移动鼠标到指定位置
     * @param x X 坐标（相对坐标，0-1 范围）
     * @param y Y 坐标（相对坐标，0-1 范围）
     */
    private async moveMouse(x: number, y: number): Promise<void> {
        try {
            // 将相对坐标转换为屏幕坐标
            // 假设输入坐标是 0-1 的相对值，转换为实际屏幕坐标
            const screenX = Math.floor(x * this.screenWidth);
            const screenY = Math.floor(y * this.screenHeight);

            // 确保坐标在屏幕范围内
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
     * 处理鼠标按钮状态变化
     * @param newState 新的鼠标状态
     */
    private async handleMouseButtonChanges(newState: any): Promise<void> {
        // 左键状态变化
        if (newState.left !== this.currentMouseState.left) {
            if (newState.left) {
                await mouse.pressButton(Button.LEFT);
                updateStats('click', 1);
            } else {
                await mouse.releaseButton(Button.LEFT);
                updateStats('release', 1);
            }
        }

        // 右键状态变化
        if (newState.right !== this.currentMouseState.right) {
            if (newState.right) {
                await mouse.pressButton(Button.RIGHT);
                updateStats('click', 1);
            } else {
                await mouse.releaseButton(Button.RIGHT);
                updateStats('release', 1);
            }
        }

        // 中键状态变化
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
     * 滚动鼠标
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
     * 映射按钮名称到 nut.js Button 类型
     * @param buttonName 按钮名称（'left', 'right', 'middle'）
     * @returns Button 类型
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
     * 检查鼠标状态是否发生变化
     * @param newState 新的鼠标状态
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
     * 更新当前鼠标状态
     * @param newState 新的鼠标状态
     */
    private updateCurrentMouseState(newState: any): void {
        this.currentMouseState.x = newState.x;
        this.currentMouseState.y = newState.y;
        this.currentMouseState.left = newState.left;
        this.currentMouseState.right = newState.right;
        this.currentMouseState.middle = newState.middle;
    }
}