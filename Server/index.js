const WebSocket = require('ws');
const dotenv = require('dotenv');
const keySender = require('node-key-sender');

// 加载环境变量
dotenv.config();

const PORT = process.env.PORT || 3000;

// 创建WebSocket服务器
const wss = new WebSocket.Server({ port: PORT });

// 配置管理
const config = {
  inputUpdateInterval: 8, // 8ms = 125Hz
  heartbeatInterval: 30000, // 30秒
  pingInterval: 10000, // 10秒
  safeStateTimeout: 5000, // 5秒无输入后回退到安全状态
  enableLogging: true // 是否启用日志
};

// 客户端连接管理
const clients = new Set();

// 输入状态管理
const inputState = {
  keyboard: new Set(), // 存储当前按下的键
  mouse: {
    x: 0,
    y: 0,
    left: false,
    right: false,
    middle: false
  },
  joystick: {
    x: 0,
    y: 0
  }
};

// 安全状态（客户端断开时回退到此状态）
const safeState = {
  keyboard: new Set(),
  mouse: {
    x: 0,
    y: 0,
    left: false,
    right: false,
    middle: false
  },
  joystick: {
    x: 0,
    y: 0
  }
};

// 心跳检测配置
const HEARTBEAT_INTERVAL = config.heartbeatInterval; // 30秒
const PING_INTERVAL = config.pingInterval; // 10秒发送一次ping

// 客户端连接处理
wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);

  // 发送欢迎消息
  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to WMMT Controller Server' }));

  // 心跳检测定时器
  const heartbeatTimer = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      clearInterval(heartbeatTimer);
      return;
    }
    ws.ping();
  }, PING_INTERVAL);

  // 心跳响应
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // 处理客户端消息
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleClientMessage(ws, message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // 客户端断开连接
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
    clearInterval(heartbeatTimer);
    // 回退到安全状态
    revertToSafeState();
  });

  // 连接错误
  ws.on('error', (error) => {
    console.error('Client error:', error);
    clients.delete(ws);
    clearInterval(heartbeatTimer);
    // 回退到安全状态
    revertToSafeState();
  });
});

// 处理客户端消息
function handleClientMessage(client, message) {
  switch (message.type) {
    case 'welcome':
      // 客户端请求欢迎消息（重连时可能需要）
      client.send(JSON.stringify({ type: 'welcome', message: 'Connected to WMMT Controller Server' }));
      break;
    case 'input':
      updateInputState(message.data);
      break;
    case 'config_get':
      // 客户端请求获取当前配置
      client.send(JSON.stringify({ type: 'config', data: config }));
      break;
    case 'config_set':
      // 客户端请求设置配置
      updateConfig(client, message.data);
      break;
    case 'ping':
      client.send(JSON.stringify({ type: 'pong' }));
      break;
    default:
      console.log('Unknown message type:', message.type);
  }
}

// 更新输入状态
function updateInputState(data) {
  if (data.keyboard) {
    // 更新键盘状态
    inputState.keyboard = new Set(data.keyboard);
  }
  if (data.mouse) {
    // 更新鼠标状态
    inputState.mouse = { ...inputState.mouse, ...data.mouse };
  }
  if (data.joystick) {
    // 更新摇杆状态
    inputState.joystick = { ...inputState.joystick, ...data.joystick };
  }
}

// 更新配置
function updateConfig(client, newConfig) {
  // 合并新配置到当前配置
  const updatedConfig = { ...config, ...newConfig };
  
  // 验证配置有效性
  if (isValidConfig(updatedConfig)) {
    // 应用新配置
    Object.assign(config, updatedConfig);
    
    // 发送确认消息
    client.send(JSON.stringify({ 
      type: 'config_ack', 
      message: 'Config updated successfully',
      data: config 
    }));
    
    console.log('Config updated:', config);
    
    // 如果更新了输入更新间隔，重新设置定时器
    if (newConfig.inputUpdateInterval && newConfig.inputUpdateInterval !== config.inputUpdateInterval) {
      // 这里需要重新设置输入执行定时器
      // 先清除旧定时器，再创建新定时器
      // 注意：在实际实现中，需要保存定时器ID以便清除
      console.log(`Input update interval changed to ${config.inputUpdateInterval}ms`);
    }
  } else {
    // 配置无效，发送错误消息
    client.send(JSON.stringify({ 
      type: 'config_error', 
      message: 'Invalid configuration' 
    }));
  }
}

// 验证配置有效性
function isValidConfig(newConfig) {
  // 验证配置值的有效性
  return (
    typeof newConfig.inputUpdateInterval === 'number' && newConfig.inputUpdateInterval > 0 &&
    typeof newConfig.heartbeatInterval === 'number' && newConfig.heartbeatInterval > 0 &&
    typeof newConfig.pingInterval === 'number' && newConfig.pingInterval > 0 &&
    typeof newConfig.safeStateTimeout === 'number' && newConfig.safeStateTimeout >= 0 &&
    typeof newConfig.enableLogging === 'boolean'
  );
}

// 回退到安全状态
function revertToSafeState() {
  console.log('Reverting to safe state');
  inputState.keyboard = new Set(safeState.keyboard);
  inputState.mouse = { ...safeState.mouse };
  inputState.joystick = { ...safeState.joystick };
}

// 输入执行循环（125Hz）
const INPUT_UPDATE_INTERVAL = 8; // 8ms = 125Hz
setInterval(() => {
  executeInput();
}, INPUT_UPDATE_INTERVAL);

// 记录上一次的按键状态，用于比较状态变化
let lastKeyboardState = new Set();

// 执行输入
function executeInput() {
  // 处理键盘输入
  handleKeyboardInput();
  
  // 处理鼠标输入（待实现）
  // handleMouseInput();
  
  // 处理摇杆输入（待实现）
  // handleJoystickInput();
}

// 处理键盘输入
function handleKeyboardInput() {
  // 找出新增的按键（需要按下）
  const keysToPress = new Set([...inputState.keyboard].filter(key => !lastKeyboardState.has(key)));
  
  // 找出移除的按键（需要释放）
  const keysToRelease = new Set([...lastKeyboardState].filter(key => !inputState.keyboard.has(key)));
  
  // 执行按键按下
  if (keysToPress.size > 0) {
    const keysArray = Array.from(keysToPress);
    console.log('Pressing keys:', keysArray);
    try {
      // node-key-sender 的 sendKey 方法支持单个键或键数组
      keySender.sendKey(keysArray);
    } catch (error) {
      console.error('Error pressing keys:', error);
    }
  }
  
  // 注意：node-key-sender 没有直接的释放键方法，
  // 它会自动释放按键。对于需要持续按住的情况，
  // 我们需要使用其他库或方法。
  
  // 更新上一次按键状态
  lastKeyboardState = new Set(inputState.keyboard);
}

// 处理鼠标输入（待实现）
function handleMouseInput() {
  // TODO: 实现鼠标移动和点击
}

// 处理摇杆输入（待实现）
function handleJoystickInput() {
  // TODO: 实现摇杆输入映射到键盘或鼠标
}

console.log(`WMMT Controller Server is running on ws://localhost:${PORT}`);