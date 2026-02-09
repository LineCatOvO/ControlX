// WebSocket客户端测试脚本
// 使用node环境运行：node test-client.js

const WebSocket = require('ws');

// 连接到服务器
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected to server');
  
  // 测试1：获取配置
  ws.send(JSON.stringify({ type: 'config_get' }));
  
  // 测试2：发送完整输入数据
  setTimeout(() => {
    console.log('Sending test input');
    ws.send(JSON.stringify({
      type: 'input',
      data: {
        keyboard: ['up', 'right'],
        joystick: {
          x: 0.5,
          y: -0.8
        }
      },
      metadata: {
        clientId: 'test-client-123',
        timestamp: Date.now()
      }
    }));
  }, 1000);
  
  // 测试3：发送输入增量
  setTimeout(() => {
    console.log('Sending test input delta');
    ws.send(JSON.stringify({
      type: 'input_delta',
      data: {
        keyboard: {
          pressed: ['space'],
          released: ['right']
        }
      },
      metadata: {
        clientId: 'test-client-123',
        timestamp: Date.now()
      }
    }));
  }, 2000);
  
  // 测试4：修改配置
  setTimeout(() => {
    console.log('Updating config');
    ws.send(JSON.stringify({
      type: 'config_set',
      data: {
        enableLogging: false
      }
    }));
  }, 3000);
  
  // 测试5：发送延迟测量
  setTimeout(() => {
    console.log('Sending latency probe');
    ws.send(JSON.stringify({
      type: 'latency_probe',
      timestamp: Date.now()
    }));
  }, 4000);
  
  // 测试6：释放所有按键
  setTimeout(() => {
    console.log('Releasing all keys');
    ws.send(JSON.stringify({
      type: 'input_delta',
      data: {
        keyboard: {
          released: ['up', 'space']
        }
      },
      metadata: {
        clientId: 'test-client-123',
        timestamp: Date.now()
      }
    }));
  }, 5000);
  
  // 关闭连接
  setTimeout(() => {
    console.log('Closing connection');
    ws.close();
  }, 6000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('Received:', message);
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('close', () => {
  console.log('Disconnected from server');
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});