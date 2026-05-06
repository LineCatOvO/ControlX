// ControlX Server - Monitor Frontend
// WebSocket连接和状态更新

// 配置
const WS_RECONNECT_INTERVAL = 3000;
const UPDATE_RATE = 10; // Hz

// DOM元素
const elements = {
    connectionIndicator: document.getElementById('connection-indicator'),
    connectionText: document.getElementById('connection-text'),
    keyboardStatus: document.getElementById('keyboard-status'),
    gamepadStatus: document.getElementById('gamepad-status'),
    mousePosition: document.getElementById('mouse-position'),
    mouseLeft: document.getElementById('mouse-left'),
    mouseRight: document.getElementById('mouse-right'),
    joystickDot: document.getElementById('joystick-dot'),
    joystickX: document.getElementById('joystick-x'),
    joystickY: document.getElementById('joystick-y'),
    joystickDeadzone: document.getElementById('joystick-deadzone'),
    wsClients: document.getElementById('ws-clients'),
    updateRate: document.getElementById('update-rate'),
    lastUpdate: document.getElementById('last-update'),
    logContainer: document.getElementById('log-container'),
};

// WebSocket连接
let ws = null;
let reconnectTimeout = null;

/**
 * 初始化WebSocket连接
 */
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    addLog('Connecting to server...', 'info');

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        addLog('Connected to server', 'success');
        updateConnectionStatus(true);
    };

    ws.onclose = () => {
        addLog('Disconnected from server', 'warning');
        updateConnectionStatus(false);
        scheduleReconnect();
    };

    ws.onerror = (error) => {
        addLog('WebSocket error', 'error');
        console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleStatusUpdate(data);
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    };
}

/**
 * 安排重连
 */
function scheduleReconnect() {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
    reconnectTimeout = setTimeout(() => {
        addLog('Reconnecting...', 'info');
        initWebSocket();
    }, WS_RECONNECT_INTERVAL);
}

/**
 * 更新连接状态
 */
function updateConnectionStatus(connected) {
    if (elements.connectionIndicator) {
        elements.connectionIndicator.classList.toggle('connected', connected);
        elements.connectionIndicator.classList.toggle('disconnected', !connected);
    }
    if (elements.connectionText) {
        elements.connectionText.textContent = connected ? 'Connected' : 'Disconnected';
    }
}

/**
 * 处理状态更新
 */
function handleStatusUpdate(data) {
    const { timestamp, input, stats } = data;

    // 更新键盘状态
    updateKeyboardStatus(input.keyboard);

    // 更新游戏手柄状态
    updateGamepadStatus(input.gamepad);

    // 更新鼠标状态
    updateMouseStatus(input.mouse);

    // 更新摇杆状态
    updateJoystickStatus(input.joystick);

    // 更新统计信息
    updateStats(stats, timestamp);
}

/**
 * 更新键盘状态
 */
function updateKeyboardStatus(keys) {
    if (!elements.keyboardStatus) return;

    if (keys && keys.length > 0) {
        elements.keyboardStatus.innerHTML = keys
            .map(key => `<span class="key-badge">${escapeHtml(key)}</span>`)
            .join('');
    } else {
        elements.keyboardStatus.innerHTML = '<span class="no-input">No keys pressed</span>';
    }
}

/**
 * 更新游戏手柄状态
 */
function updateGamepadStatus(buttons) {
    if (!elements.gamepadStatus) return;

    if (buttons && buttons.length > 0) {
        elements.gamepadStatus.innerHTML = buttons
            .map(btn => `<span class="key-badge">${escapeHtml(btn)}</span>`)
            .join('');
    } else {
        elements.gamepadStatus.innerHTML = '<span class="no-input">No buttons pressed</span>';
    }
}

/**
 * 更新鼠标状态
 */
function updateMouseStatus(mouse) {
    if (!mouse) {
        if (elements.mousePosition) {
            elements.mousePosition.textContent = 'x=0, y=0';
        }
        if (elements.mouseLeft) {
            elements.mouseLeft.classList.remove('active');
        }
        if (elements.mouseRight) {
            elements.mouseRight.classList.remove('active');
        }
        return;
    }

    if (elements.mousePosition) {
        elements.mousePosition.textContent = `x=${mouse.x}, y=${mouse.y}`;
    }

    if (elements.mouseLeft) {
        elements.mouseLeft.classList.toggle('active', mouse.left);
    }

    if (elements.mouseRight) {
        elements.mouseRight.classList.toggle('active', mouse.right);
    }
}

/**
 * 更新摇杆状态
 */
function updateJoystickStatus(joystick) {
    if (!joystick) {
        if (elements.joystickDot) {
            elements.joystickDot.style.transform = 'translate(-50%, -50%)';
        }
        if (elements.joystickX) {
            elements.joystickX.textContent = '0.00';
        }
        if (elements.joystickY) {
            elements.joystickY.textContent = '0.00';
        }
        return;
    }

    // 更新摇杆位置（将-1到1映射到-40px到40px）
    const dotX = joystick.x * 40;
    const dotY = joystick.y * 40;

    if (elements.joystickDot) {
        // Y轴需要反转（屏幕坐标系Y轴向下）
        elements.joystickDot.style.transform = `translate(calc(-50% + ${dotX}px), calc(-50% - ${dotY}px))`;
    }

    if (elements.joystickX) {
        elements.joystickX.textContent = joystick.x.toFixed(2);
    }

    if (elements.joystickY) {
        elements.joystickY.textContent = joystick.y.toFixed(2);
    }

    if (elements.joystickDeadzone) {
        elements.joystickDeadzone.textContent = joystick.deadzone.toFixed(2);
    }
}

/**
 * 更新统计信息
 */
function updateStats(stats, timestamp) {
    if (elements.wsClients && stats) {
        elements.wsClients.textContent = stats.wsClients;
    }

    if (elements.updateRate) {
        elements.updateRate.textContent = `${UPDATE_RATE} Hz`;
    }

    if (elements.lastUpdate && timestamp) {
        const date = new Date(timestamp);
        elements.lastUpdate.textContent = date.toLocaleTimeString();
    }
}

/**
 * 添加日志
 */
function addLog(message, type = 'info') {
    if (!elements.logContainer) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;

    elements.logContainer.appendChild(entry);

    // 自动滚动到底部
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;

    // 限制日志数量
    while (elements.logContainer.children.length > 100) {
        elements.logContainer.removeChild(elements.logContainer.firstChild);
    }
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    addLog('Monitor initialized', 'success');
    initWebSocket();
});

// 页面卸载时关闭连接
window.addEventListener('beforeunload', () => {
    if (ws) {
        ws.close();
    }
});