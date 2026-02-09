// blessed终端Viewer

import blessed from 'blessed';

// 定义状态接口
interface ClientState {
  lastKey?: string;
  joy?: { x: number; y: number };
  buttons?: string[];
  lastSeenMs?: number;
}

interface Stats {
  packetsPerSec: number;
  connected: number;
}

interface AppState {
  clients: Record<string, ClientState>;
  stats: Stats;
  keyboard?: Set<string>;
  gamepad?: Set<string>;
  mouse?: { x: number; y: number; left: boolean; right: boolean };
  joystick?: { x: number; y: number; deadzone: number };
}

// 定义日志记录器接口
interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

// 创建日志记录器
function createLogger(logBox: any) {
  return {
    info: (msg: string) => logBox.log(`{green-fg}[INFO]{/green-fg} ${msg}`),
    warn: (msg: string) => logBox.log(`{yellow-fg}[WARN]{/yellow-fg} ${msg}`),
    error: (msg: string) => logBox.log(`{red-fg}[ERR]{/red-fg} ${msg}`),
  };
}

// 创建Viewer
export function createViewer() {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'WMMT Controller Server',
    fullUnicode: true,
    dockBorders: true,
  });

  // 退出快捷键
  screen.key(['q', 'C-c'], () => process.exit(0));

  // 顶部：状态面板
  const statusBox = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '55%',
    border: 'line',
    label: ' Input Runtime Status ',
    tags: true,
    padding: { left: 1, right: 1 },
  });

  // 底部：日志面板（可滚动）
  const logBox = blessed.log({
    top: '55%',
    left: 0,
    width: '100%',
    height: '45%',
    border: 'line',
    label: ' Server Logs ',
    tags: true,
    padding: { left: 1, right: 1 },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      track: { bg: 'gray' },
      style: { bg: 'white' },
    },
  });

  screen.append(statusBox);
  screen.append(logBox);

  // 日志滚动快捷键
  screen.key(['pageup'], () => { logBox.scroll(-10); screen.render(); });
  screen.key(['pagedown'], () => { logBox.scroll(10); screen.render(); });

  // 处理终端resize
  screen.on('resize', () => {
    screen.render();
  });

  const logger = createLogger(logBox);

  return { screen, statusBox, logBox, logger };
}

// 渲染状态到状态面板
export function renderStatus(statusBox: any, state: any) {
  const now = Date.now();
  const lines: string[] = [];

  // 提取状态信息
  const { keyboard, gamepad, mouse, joystick } = state;

  // 获取FPS值（如果状态中包含frameCount和startTime，则动态计算）
  let fps = 0;
  if (state.frameCount !== undefined && state.startTime !== undefined) {
    const elapsed = now - state.startTime;
    if (elapsed >= 1000) {
      fps = Math.round((state.frameCount * 1000) / elapsed);
    } else {
      // 根据已有的帧数和时间估算FPS
      fps = Math.round((state.frameCount * 1000) / (elapsed || 1));
    }
  } else if ((state as any).fps) {
    fps = (state as any).fps;
  }

  // 格式化状态信息
  const keyboardKeys = Array.from(keyboard || []).join(' ');
  const gamepadButtons = Array.from(gamepad || []).join(' ');
  const mouseInfo = `x=${(mouse?.x ?? 0).toString().padStart(4)} y=${(mouse?.y ?? 0).toString().padStart(4)} left=${mouse?.left ?? false} right=${mouse?.right ?? false}`;
  const joystickInfo = `x=${(joystick?.x ?? 0).toFixed(2).padStart(5)} y=${(joystick?.y ?? 0).toFixed(2).padStart(5)} deadzone=${joystick?.deadzone ?? 0.2}`;

  // 添加状态行
  lines.push('┌─────────────────────────────────────────────────┐');
  lines.push('│ WMMT Controller Server Input Monitor           │');
  lines.push('├─────────────────────────────────────────────────┤');
  lines.push(`│ FPS:      ${fps.toString().padEnd(2)}                                                 │`);
  lines.push('└─────────────────────────────────────────────────┘');
  
  lines.push('┌─────────────────────────────────────────────────┐');
  lines.push(`│ Keyboard: ${keyboardKeys.padEnd(43)} │`);
  lines.push(`│ Gamepad:  ${gamepadButtons.padEnd(43)} │`);
  lines.push(`│ Mouse:    ${mouseInfo.padEnd(36)} │`);
  lines.push(`│ Joystick: ${joystickInfo.padEnd(36)} │`);
  lines.push('└─────────────────────────────────────────────────┘');

  statusBox.setContent(lines.join('\n'));
}

// 导出类型
export type { AppState, Logger };
