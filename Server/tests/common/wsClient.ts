// Use require syntax for ws library to avoid TypeScript issues
const WebSocket = require('ws');

interface WsClientOptions {
  url?: string;
  timeout?: number;
}

export class WsClient {
  private ws: any = null;
  private url: string;
  private timeout: number;
  private messageHandlers: ((message: any) => void)[] = [];
  private closeHandlers: (() => void)[] = [];
  private errorHandlers: ((error: Error) => void)[] = [];

  constructor(options?: WsClientOptions) {
    this.url = options?.url || 'ws://localhost:3000';
    this.timeout = options?.timeout || 5000;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, this.timeout);

      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        clearTimeout(timeoutId);
        resolve();
      });

      this.ws.on('message', (data: any) => {
        const message = JSON.parse(data.toString());
        this.messageHandlers.forEach(handler => handler(message));
      });

      this.ws.on('close', () => {
        this.closeHandlers.forEach(handler => handler());
      });

      this.ws.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        this.errorHandlers.forEach(handler => handler(error));
        reject(error);
      });
    });
  }

  send(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.ws.send(JSON.stringify(message), (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  onMessage(handler: (message: any) => void): void {
    this.messageHandlers.push(handler);
  }

  onClose(handler: () => void): void {
    this.closeHandlers.push(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  waitForMessage(type: string, timeout?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const waitTimeout = timeout || this.timeout;
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${type}`));
      }, waitTimeout);

      const handler = (message: any) => {
        if (message.type === type) {
          clearTimeout(timeoutId);
          resolve(message);
        }
      };

      this.messageHandlers.push(handler);
    });
  }
}
