/**
 * Extend WebSocket type, add isAlive property for heartbeat detection
 */
declare module 'ws' {
  interface WebSocket {
    isAlive?: boolean;
  }
}