import { config } from '../config/config';

/**
 * Heartbeat manager
 * @param ws WebSocket connection
 */
export function setupHeartbeat(ws: any) {
  // Mark connection as active
  ws.isAlive = true;
  
  // Heartbeat timer
  const heartbeatTimer = setInterval(() => {
    if (ws.readyState !== 1) { // WebSocket.OPEN = 1
      clearInterval(heartbeatTimer);
      return;
    }
    
    if (!ws.isAlive) {
      // Connection timed out, close connection
      console.log('Client heartbeat timeout, closing connection');
      clearInterval(heartbeatTimer);
      ws.terminate();
      return;
    }
    
    // Send ping
    ws.isAlive = false;
    ws.ping();
  }, config.pingInterval);
  
  // Handle pong response
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Cleanup timer when connection closes
  ws.on('close', () => {
    clearInterval(heartbeatTimer);
  });
  
  // Cleanup timer when connection errors
  ws.on('error', () => {
    clearInterval(heartbeatTimer);
  });
}