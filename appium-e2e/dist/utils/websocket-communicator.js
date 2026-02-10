"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
class WebSocketCommunicator {
    constructor() {
        this.wsClient = null;
        this.messages = [];
        this.port = null;
    }
    async connect(port) {
        return new Promise((resolve, reject) => {
            this.port = port;
            const wsUrl = `ws://localhost:${port}`;
            console.log(`🔌 Connecting to WebSocket server: ${wsUrl}`);
            this.wsClient = new ws_1.default(wsUrl);
            this.wsClient.on('open', () => {
                console.log("✅ WebSocket connected");
                resolve(this.wsClient);
            });
            this.wsClient.on('message', (data) => {
                const message = data.toString();
                this.messages.push(message);
                console.log(`[WS Received] ${message}`);
            });
            this.wsClient.on('error', (error) => {
                console.error(`[WS Error] ${error.message}`);
                reject(error);
            });
            this.wsClient.on('close', () => {
                console.log("[WS] Connection closed");
            });
            setTimeout(() => {
                if (this.wsClient && this.wsClient.readyState !== ws_1.default.OPEN) {
                    reject(new Error("WebSocket connection timeout"));
                }
            }, 5000);
        });
    }
    async sendMessage(message) {
        if (!this.wsClient || this.wsClient.readyState !== ws_1.default.OPEN) {
            throw new Error("WebSocket not connected");
        }
        const jsonMessage = JSON.stringify(message);
        this.wsClient.send(jsonMessage);
        console.log(`[WS Sent] ${jsonMessage}`);
        return true;
    }
    disconnect() {
        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = null;
            console.log("✅ WebSocket disconnected");
        }
    }
    isConnected() {
        return this.wsClient !== null && this.wsClient.readyState === ws_1.default.OPEN;
    }
    getMessages() {
        return this.messages;
    }
}
exports.default = WebSocketCommunicator;
