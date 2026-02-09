/**
 * 扩展WebSocket类型，添加isAlive属性用于心跳检测
 */
declare module 'ws' {
  interface WebSocket {
    isAlive?: boolean;
  }
}