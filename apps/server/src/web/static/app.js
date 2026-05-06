// ControlX Server Monitor v2.0 - Frontend
// WebSocket connection, real-time status updates & enhanced interactions

const WS_RECONNECT_INTERVAL = 3000;
const UPDATE_RATE = 10;
const MAX_LOG_ENTRIES = 100;

const elements = {
    connectionStatus: document.getElementById('connection-status'),
    connectionIndicator: document.getElementById('connection-indicator'),
    connectionText: document.getElementById('connection-text'),
    clockDisplay: document.getElementById('clock-display'),
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
    clearLogBtn: document.getElementById('clear-log-btn'),
};

let ws = null;
let reconnectTimeout = null;
let clockInterval = null;
let logCounter = 0;

function initEntranceAnimations() {
    const animatedElements = document.querySelectorAll('[data-animate]');
    animatedElements.forEach(el => el.classList.add('animated'));
}

function initClock() {
    function updateClock() {
        if (elements.clockDisplay) {
            elements.clockDisplay.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
        }
    }
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
}

function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    addLog('Connecting to server...', 'info');

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        addLog('Connected to server', 'success');
        updateConnectionStatus(true);
    };

    ws.onclose = (event) => {
        const reason = event.reason || 'No reason provided';
        addLog(`Disconnected from server (${event.code})`, 'warning');
        updateConnectionStatus(false);
        scheduleReconnect();
    };

    ws.onerror = (_error) => {
        addLog('WebSocket error', 'error');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleStatusUpdate(data);
        } catch (_error) {
            console.error('Failed to parse message');
        }
    };
}

function scheduleReconnect() {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
        addLog('Reconnecting...', 'info');
        initWebSocket();
    }, WS_RECONNECT_INTERVAL);
}

function updateConnectionStatus(connected) {
    if (!elements.connectionStatus) return;
    elements.connectionStatus.classList.toggle('connected', connected);
    elements.connectionStatus.classList.toggle('disconnected', !connected);
    if (elements.connectionText) {
        elements.connectionText.textContent = connected ? 'CONNECTED' : 'DISCONNECTED';
    }
}

function handleStatusUpdate(data) {
    const { timestamp, input, stats } = data;

    updateKeyboardStatus(input.keyboard);
    updateGamepadStatus(input.gamepad);
    updateMouseStatus(input.mouse);
    updateJoystickStatus(input.joystick);
    updateStats(stats, timestamp);
}

function updateKeyboardStatus(keys) {
    if (!elements.keyboardStatus) return;

    if (keys && keys.length > 0) {
        elements.keyboardStatus.innerHTML = keys
            .map((key, i) => `<span class="key-badge" style="animation-delay:${i * 40}ms">${escapeHtml(key)}</span>`)
            .join('');
    } else {
        elements.keyboardStatus.innerHTML = '<span class="no-input-text">No keys pressed</span>';
    }
}

function updateGamepadStatus(buttons) {
    if (!elements.gamepadStatus) return;

    if (buttons && buttons.length > 0) {
        elements.gamepadStatus.innerHTML = buttons
            .map((btn, i) => `<span class="key-badge" style="animation-delay:${i * 40}ms">${escapeHtml(btn)}</span>`)
            .join('');
    } else {
        elements.gamepadStatus.innerHTML = '<span class="no-input-text">No buttons pressed</span>';
    }
}

function updateMouseStatus(mouse) {
    if (!mouse) {
        if (elements.mousePosition) elements.mousePosition.textContent = 'x=0, y=0';
        if (elements.mouseLeft) elements.mouseLeft.classList.remove('active');
        if (elements.mouseRight) elements.mouseRight.classList.remove('active');
        return;
    }

    if (elements.mousePosition) {
        animateValue(elements.mousePosition, `x=${mouse.x}, y=${mouse.y}`);
    }

    if (elements.mouseLeft) elements.mouseLeft.classList.toggle('active', mouse.left);
    if (elements.mouseRight) elements.mouseRight.classList.toggle('active', mouse.right);
}

function updateJoystickStatus(joystick) {
    if (!elements.joystickDot) return;

    if (!joystick) {
        elements.joystickDot.style.transform = 'translate(-50%, -50%)';
        elements.joystickDot.classList.remove('active');
        if (elements.joystickX) elements.joystickX.textContent = '0.00';
        if (elements.joystickY) elements.joystickY.textContent = '0.00';
        return;
    }

    const dotX = joystick.x * 44;
    const dotY = joystick.y * 44;

    elements.joystickDot.style.transform = `translate(calc(-50% + ${dotX}px), calc(-50% - ${dotY}px))`;

    const isActive = Math.abs(joystick.x) > 0.05 || Math.abs(joystick.y) > 0.05;
    elements.joystickDot.classList.toggle('active', isActive);

    if (elements.joystickX) animateValue(elements.joystickX, joystick.x.toFixed(2));
    if (elements.joystickY) animateValue(elements.joystickY, joystick.y.toFixed(2));
    if (elements.joystickDeadzone) elements.joystickDeadzone.textContent = joystick.deadzone.toFixed(2);
}

function updateStats(stats, timestamp) {
    if (elements.wsClients && stats) {
        animateValue(elements.wsClients, String(stats.wsClients));
    }

    if (elements.updateRate) {
        elements.updateRate.textContent = `${UPDATE_RATE} Hz`;
    }

    if (elements.lastUpdate && timestamp) {
        const date = new Date(timestamp);
        elements.lastUpdate.textContent = date.toLocaleTimeString('en-US', { hour12: false });
    }
}

function animateValue(element, newValue) {
    if (!element) return;
    if (element.textContent !== newValue) {
        element.style.transition = 'opacity 0.1s ease';
        element.style.opacity = '0.4';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                element.textContent = newValue;
                element.style.opacity = '1';
            });
        });
    }
}

function addLog(message, type = 'info') {
    if (!elements.logContainer) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}-entry`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });

    const msgSpan = document.createElement('span');
    msgSpan.className = 'log-msg';
    msgSpan.textContent = message;

    entry.appendChild(timeSpan);
    entry.appendChild(msgSpan);
    entry.style.animationDelay = `${logCounter++ % 5 * 30}ms`;

    elements.logContainer.appendChild(entry);

    smoothScrollToBottom(elements.logContainer);

    while (elements.logContainer.children.length > MAX_LOG_ENTRIES) {
        elements.logContainer.removeChild(elements.logContainer.firstChild);
    }
}

function smoothScrollToBottom(container) {
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
    if (isNearBottom) {
        requestAnimationFrame(() => {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initClearLogButton() {
    if (!elements.clearLogBtn) return;
    elements.clearLogBtn.addEventListener('click', () => {
        if (elements.logContainer) {
            elements.logContainer.innerHTML = '';
            addLog('Logs cleared', 'info');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initEntranceAnimations();
    initClock();
    initClearLogButton();
    addLog('Monitor initialized', 'success');
    initWebSocket();
});

window.addEventListener('beforeunload', () => {
    if (clockInterval) clearInterval(clockInterval);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && elements.clockDisplay) {
        elements.clockDisplay.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
    }
});
