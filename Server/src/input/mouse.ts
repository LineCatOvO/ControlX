import { InputExecutor } from './interfaces';
import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * 鼠标输入执行器
 * 负责将鼠标输入状态转换为系统鼠标事件
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

  /**
   * 应用完整输入状态
   * @param state 输入状态
   */
  applyState(state: InputState): void {
    // 只在状态发生变化时记录日志
    if (this.hasMouseStateChanged(state.mouse)) {
      console.log('MouseEvent: State changed', {
        x: state.mouse.x,
        y: state.mouse.y,
        buttons: {
          left: state.mouse.left,
          right: state.mouse.right,
          middle: state.mouse.middle
        }
      });
      
      // 更新当前状态
      this.updateCurrentMouseState(state.mouse);
    }
  }
  
  /**
   * 应用输入增量
   * @param delta 输入增量
   */
  applyDelta(delta: InputDelta): void {
    // 鼠标增量处理（待实现）
    if (delta.mouse) {
      console.log('MouseEvent: Applying delta', delta.mouse);
    }
  }
  
  /**
   * 应用输入事件
   * @param event 输入事件
   */
  applyEvent(event: InputEvent): void {
    // 鼠标事件处理（待实现）
    if (event.type === 'mouse_move' || event.type === 'mouse_click') {
      console.log('MouseEvent: Applying event', event.type, event.data);
    }
  }
  
  /**
   * 重置输入状态
   */
  reset(): void {
    // 只在当前状态非默认时记录重置事件
    if (this.isMouseStateNonDefault()) {
      console.log('MouseEvent: Resetting');
      this.currentMouseState = {
        x: 0,
        y: 0,
        left: false,
        right: false,
        middle: false
      };
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
   * 检查鼠标状态是否为非默认状态
   * @returns 是否为非默认状态
   */
  private isMouseStateNonDefault(): boolean {
    return this.currentMouseState.x !== 0 ||
           this.currentMouseState.y !== 0 ||
           this.currentMouseState.left ||
           this.currentMouseState.right ||
           this.currentMouseState.middle;
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